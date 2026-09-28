import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  YacitaMood,
  YacitaActionButton,
  YacitaMessageItem,
  formatYacitaText,
  YACITA_GREETINGS,
  TAB_MESSAGES,
  MODAL_MESSAGES,
  ACTION_EVENTS,
  STUDENT_FORM_FIELD_TIPS,
  PERIODIC_TIPS_BY_TAB,
} from '../config/yacitaMensajes';
import { getTeacherFirstName } from '../utils/yacitaVoice';
import { TeacherProfile } from '../types';

export interface ActiveBubble {
  id: string;
  context: string;
  texto: string;
  estado: YacitaMood;
  priority: number;
  botones?: YacitaActionButton[];
  allowDoNotShowAgain?: boolean;
}

export interface YacitaCoachContextValue {
  teacherName: string;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  currentBubble: ActiveBubble | null;
  currentMood: YacitaMood;
  isTyping: boolean;
  displayedText: string;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isMinimized: boolean;
  setIsMinimized: (minimized: boolean) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  // Actions
  triggerMessage: (message: YacitaMessageItem, variables?: Record<string, string>, allowDoNotShowAgain?: boolean) => void;
  dismissBubble: () => void;
  reopenTabHelp: () => void;
  muteSuggestions: () => void;
  unmuteSuggestions: () => void;
  dismissTipForever: (tipId: string) => void;
  notifyTabChange: (tab: string) => void;
  notifyModalOpen: (modalId: keyof typeof MODAL_MESSAGES | string) => void;
  notifyModalClose: () => void;
  notifyActionEvent: (eventId: keyof typeof ACTION_EVENTS, variables?: Record<string, string>) => void;
  notifyFieldFocus: (fieldKey: keyof typeof STUDENT_FORM_FIELD_TIPS, variables?: Record<string, string>, customButtons?: YacitaActionButton[]) => void;
}

const YacitaCoachContext = createContext<YacitaCoachContextValue | null>(null);

const STORAGE_MUTED_KEY = 'yacita_suggestions_muted';
const STORAGE_MINIMIZED_KEY = 'yacita_avatar_minimized';
const STORAGE_DISMISSED_TIPS_KEY = 'yacita_dismissed_tips';
const STORAGE_VISITED_TABS_KEY = 'yacita_visited_tabs';

export interface YacitaCoachProviderProps {
  children: React.ReactNode;
  teacher: TeacherProfile;
  initialTab?: string;
}

export const YacitaCoachProvider: React.FC<YacitaCoachProviderProps> = ({
  children,
  teacher,
  initialTab = 'matrix',
}) => {
  const teacherFirstName = useMemo(() => getTeacherFirstName(teacher.name), [teacher.name]);

  // Current tab & active modal
  const [currentTab, setCurrentTab] = useState<string>(initialTab);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // User preferences from localStorage
  const [isMuted, setIsMutedState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_MUTED_KEY) === 'true';
  });

  const [isMinimized, setIsMinimizedState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_MINIMIZED_KEY) === 'true';
  });

  const [dismissedTips, setDismissedTips] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_DISMISSED_TIPS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [visitedTabs, setVisitedTabs] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_VISITED_TABS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Active bubble and priority queue
  const [currentBubble, setCurrentBubble] = useState<ActiveBubble | null>(null);
  const [bubbleQueue, setBubbleQueue] = useState<ActiveBubble[]>([]);
  const [currentMood, setCurrentMood] = useState<YacitaMood>('idle');
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // References for timers
  const typewriterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const periodicTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserInteractionRef = useRef<number>(Date.now());
  const lastPeriodicTipIdRef = useRef<string | null>(null);

  // Sync state helpers
  const setIsMuted = useCallback((muted: boolean) => {
    setIsMutedState(muted);
    localStorage.setItem(STORAGE_MUTED_KEY, muted ? 'true' : 'false');
  }, []);

  const setIsMinimized = useCallback((minimized: boolean) => {
    setIsMinimizedState(minimized);
    localStorage.setItem(STORAGE_MINIMIZED_KEY, minimized ? 'true' : 'false');
  }, []);

  const dismissTipForever = useCallback((tipId: string) => {
    setDismissedTips((prev) => {
      const next = Array.from(new Set([...prev, tipId]));
      localStorage.setItem(STORAGE_DISMISSED_TIPS_KEY, JSON.stringify(next));
      return next;
    });
    // Dismiss current bubble if it matches
    setCurrentBubble((curr) => (curr?.id === tipId ? null : curr));
  }, []);

  // Track user typing / interaction to prevent interrupting active writing
  useEffect(() => {
    const handleActivity = () => {
      lastUserInteractionRef.current = Date.now();
    };
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('input', handleActivity, { passive: true });
    window.addEventListener('mousedown', handleActivity, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('input', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
    };
  }, []);

  // Dismiss current bubble and check queue
  const dismissBubble = useCallback(() => {
    if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    setCurrentBubble(null);
    setDisplayedText('');
    setIsTyping(false);
    setCurrentMood('idle');
  }, []);

  // Typewriter effect & auto-dismiss (7s, paused on hover)
  useEffect(() => {
    if (!currentBubble) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    const fullText = currentBubble.texto;
    setDisplayedText('');
    setIsTyping(true);
    setCurrentMood('hablando');

    let charIndex = 0;
    const speed = 22; // ms per char

    if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);

    typewriterTimerRef.current = setInterval(() => {
      charIndex++;
      if (charIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, charIndex));
      } else {
        if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
        setIsTyping(false);
        // Switch to the target mood of the message
        setCurrentMood(currentBubble.estado || 'idle');
      }
    }, speed);

    return () => {
      if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
    };
  }, [currentBubble]);

  // 7s auto-dismiss logic (pauses when hovered)
  useEffect(() => {
    if (!currentBubble || isTyping) {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      return;
    }

    if (isPaused) {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      return;
    }

    // Auto-close after 7000ms once typing finishes
    autoCloseTimerRef.current = setTimeout(() => {
      dismissBubble();
    }, 7000);

    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, [currentBubble, isTyping, isPaused, dismissBubble]);

  // Advance queue when bubble becomes empty
  useEffect(() => {
    if (!currentBubble && bubbleQueue.length > 0) {
      // Pick next highest priority bubble
      const [nextBubble, ...remaining] = bubbleQueue;
      setBubbleQueue(remaining);
      setCurrentBubble(nextBubble);
    }
  }, [currentBubble, bubbleQueue]);

  // Enqueue / Trigger message by priority
  const triggerMessage = useCallback(
    (
      item: YacitaMessageItem,
      variables: Record<string, string> = {},
      allowDoNotShowAgain: boolean = false
    ) => {
      // If suggestions are muted and it's a priority 1 message, ignore
      if (isMuted && item.priority === 1) return;
      if (dismissedTips.includes(item.id)) return;

      const formatted = formatYacitaText(item.texto, {
        nombre: teacherFirstName,
        ...variables,
      });

      // Truncate to ~140 chars as per specification if needed
      const safeText = formatted.length > 155 ? formatted.slice(0, 152) + '...' : formatted;

      const bubble: ActiveBubble = {
        id: item.id,
        context: item.context,
        texto: safeText,
        estado: item.estado,
        priority: item.priority,
        botones: item.botones,
        allowDoNotShowAgain,
      };

      setCurrentBubble((current) => {
        if (!current) {
          return bubble;
        }

        // Higher priority preempts current message immediately
        if (bubble.priority > current.priority) {
          // Re-queue current if it wasn't a low priority tip
          if (current.priority > 1) {
            setBubbleQueue((prev) => [current, ...prev]);
          }
          return bubble;
        }

        // Same or lower priority gets enqueued by priority order
        setBubbleQueue((prev) => {
          // Do not duplicate exact same message in queue
          if (prev.some((b) => b.id === bubble.id)) return prev;
          const updated = [...prev, bubble].sort((a, b) => b.priority - a.priority);
          return updated.slice(0, 3); // keep max 3 in queue
        });
        return current;
      });
    },
    [teacherFirstName, isMuted, dismissedTips]
  );

  // Initial login / time-of-day greeting on mount
  useEffect(() => {
    const hour = new Date().getHours();
    let greetingTemplate = YACITA_GREETINGS.manana;
    if (hour >= 12 && hour < 18) {
      greetingTemplate = YACITA_GREETINGS.tarde;
    } else if (hour >= 18 || hour < 5) {
      greetingTemplate = YACITA_GREETINGS.noche;
    }

    const timer = setTimeout(() => {
      triggerMessage(greetingTemplate, { nombre: teacherFirstName });
    }, 700);

    return () => clearTimeout(timer);
  }, [teacherFirstName, triggerMessage]);

  // Periodic suggestions timer (every 45-90s, randomized, paused if user typing, document hidden, or modal open)
  useEffect(() => {
    if (isMuted) return;

    const scheduleNextPeriodicTip = () => {
      // Random delay between 45,000ms and 90,000ms
      const delay = Math.floor(Math.random() * (90000 - 45000 + 1)) + 45000;

      periodicTimerRef.current = setTimeout(() => {
        const isHidden = typeof document !== 'undefined' && document.hidden;
        const isModalOpen = activeModal !== null;
        const recentlyTyped = Date.now() - lastUserInteractionRef.current < 4000;

        if (!isHidden && !isModalOpen && !recentlyTyped) {
          const tipsForTab = PERIODIC_TIPS_BY_TAB[currentTab] || [];
          const availableTips = tipsForTab.filter(
            (t) => !dismissedTips.includes(t.id) && t.id !== lastPeriodicTipIdRef.current
          );

          if (availableTips.length > 0) {
            const chosen = availableTips[Math.floor(Math.random() * availableTips.length)];
            lastPeriodicTipIdRef.current = chosen.id;
            triggerMessage(chosen, { nombre: teacherFirstName }, true);
          }
        }

        // Schedule subsequent periodic tip
        scheduleNextPeriodicTip();
      }, delay);
    };

    scheduleNextPeriodicTip();

    return () => {
      if (periodicTimerRef.current) clearTimeout(periodicTimerRef.current);
    };
  }, [currentTab, activeModal, isMuted, dismissedTips, teacherFirstName, triggerMessage]);

  // Notify Tab Change
  const notifyTabChange = useCallback(
    (tab: string) => {
      setCurrentTab(tab);
      const isFirstTime = !visitedTabs.includes(tab);
      if (isFirstTime) {
        setVisitedTabs((prev) => {
          const updated = [...prev, tab];
          sessionStorage.setItem(STORAGE_VISITED_TABS_KEY, JSON.stringify(updated));
          return updated;
        });
      }

      const tabConfig = (TAB_MESSAGES as Record<string, any>)[tab];
      if (tabConfig) {
        const item = isFirstTime ? tabConfig.firstTime : tabConfig.short;
        triggerMessage(item, { nombre: teacherFirstName });
      }
    },
    [visitedTabs, teacherFirstName, triggerMessage]
  );

  // Notify Modal Open
  const notifyModalOpen = useCallback(
    (modalId: string) => {
      setActiveModal(modalId);
      const modalItem = (MODAL_MESSAGES as Record<string, any>)[modalId];
      if (modalItem) {
        triggerMessage(modalItem, { nombre: teacherFirstName });
      }
    },
    [teacherFirstName, triggerMessage]
  );

  // Notify Modal Close
  const notifyModalClose = useCallback(() => {
    setActiveModal(null);
    dismissBubble();
  }, [dismissBubble]);

  // Notify Action Event
  const notifyActionEvent = useCallback(
    (eventId: keyof typeof ACTION_EVENTS, variables?: Record<string, string>) => {
      const item = ACTION_EVENTS[eventId];
      if (item) {
        triggerMessage(item, variables);
      }
    },
    [triggerMessage]
  );

  // Notify Field Focus (Form guidance)
  const notifyFieldFocus = useCallback(
    (
      fieldKey: keyof typeof STUDENT_FORM_FIELD_TIPS,
      variables?: Record<string, string>,
      customButtons?: YacitaActionButton[]
    ) => {
      const item: YacitaMessageItem | undefined = STUDENT_FORM_FIELD_TIPS[fieldKey];
      if (item) {
        const withButtons: YacitaMessageItem = {
          ...item,
          botones: customButtons || item.botones,
        };
        triggerMessage(withButtons, variables);
      }
    },
    [triggerMessage]
  );

  // Reopen current tab help
  const reopenTabHelp = useCallback(() => {
    const tabConfig = (TAB_MESSAGES as Record<string, any>)[currentTab];
    if (tabConfig) {
      triggerMessage(tabConfig.firstTime || tabConfig.short, { nombre: teacherFirstName });
    }
  }, [currentTab, teacherFirstName, triggerMessage]);

  const muteSuggestions = useCallback(() => setIsMuted(true), [setIsMuted]);
  const unmuteSuggestions = useCallback(() => setIsMuted(false), [setIsMuted]);

  const value: YacitaCoachContextValue = {
    teacherName: teacherFirstName,
    currentTab,
    setCurrentTab,
    activeModal,
    setActiveModal,
    currentBubble,
    currentMood,
    isTyping,
    displayedText,
    isMuted,
    setIsMuted,
    isMinimized,
    setIsMinimized,
    isPaused,
    setIsPaused,
    triggerMessage,
    dismissBubble,
    reopenTabHelp,
    muteSuggestions,
    unmuteSuggestions,
    dismissTipForever,
    notifyTabChange,
    notifyModalOpen,
    notifyModalClose,
    notifyActionEvent,
    notifyFieldFocus,
  };

  return (
    <YacitaCoachContext.Provider value={value}>
      {children}
    </YacitaCoachContext.Provider>
  );
};

export const useYacitaCoach = (): YacitaCoachContextValue => {
  const context = useContext(YacitaCoachContext);
  if (!context) {
    throw new Error('useYacitaCoach must be used within a YacitaCoachProvider');
  }
  return context;
};
