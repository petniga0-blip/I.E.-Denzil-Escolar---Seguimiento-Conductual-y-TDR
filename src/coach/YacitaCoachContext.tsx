import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  YacitaMood,
  CoachingLevel,
  YacitaActionButton,
  YacitaMessageItem,
  GuiaCampoItem,
  formatYacitaText,
  cleanTextForVoice,
  getElementMessage,
  getGuiaCampo,
  getGenericGuiaCampo,
  getGenericInteractiveMessage,
  YACITA_GREETINGS,
  TAB_MESSAGES,
  MODAL_MESSAGES,
  ACTION_EVENTS,
  PERIODIC_TIPS_BY_TAB,
} from '../config/yacitaMensajes';
import { getTeacherFirstName } from '../utils/yacitaVoice';
import {
  speakYacita,
  stopSpeaking,
  getAvailableSpanishVoices,
  pickBestSpanishFemaleVoice,
  SpanishVoiceInfo,
} from '../utils/yacitaVoiceEngine';
import { TeacherProfile } from '../types';

export interface ActiveBubble {
  id: string;
  context: string;
  texto: string;
  estado: YacitaMood;
  priority: number;
  botones?: YacitaActionButton[];
  allowDoNotShowAgain?: boolean;
  textoVoz?: string;
  contieneDatosPersonales?: boolean;
}

export interface MicroFeedback {
  text: string;
  mood: YacitaMood;
  id: number;
}

export interface GenericElementDebug {
  tag: string;
  label: string;
  sampleHtml: string;
}

export interface YacitaCoachContextValue {
  teacherName: string;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  coachingLevel: CoachingLevel;
  setCoachingLevel: (level: CoachingLevel) => void;
  currentBubble: ActiveBubble | null;
  currentMood: YacitaMood;
  microFeedback: MicroFeedback | null;
  isTyping: boolean;
  displayedText: string;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  isMinimized: boolean;
  setIsMinimized: (minimized: boolean) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;

  // Active Field Guide (Parte 1)
  activeFieldGuide: GuiaCampoItem | null;
  activeConsejoIndex: number;
  rotateConsejo: (fieldId?: string) => void;

  // Voice controls (Parte 2)
  isVoiceEnabled: boolean;
  setIsVoiceEnabled: (enabled: boolean) => void;
  voiceSpeed: number; // 1.0, 1.15, 1.3
  setVoiceSpeed: (speed: number) => void;
  voiceVolume: number;
  setVoiceVolume: (vol: number) => void;
  selectedVoiceUri: string;
  setSelectedVoiceUri: (uri: string) => void;
  availableVoices: SpanishVoiceInfo[];
  currentVoiceName: string;
  isSpeaking: boolean;
  testVoice: () => void;

  // Actions
  triggerMessage: (message: YacitaMessageItem, variables?: Record<string, string>, allowDoNotShowAgain?: boolean) => void;
  triggerMicroFeedback: (text: string, mood?: YacitaMood) => void;
  dismissBubble: () => void;
  reopenTabHelp: () => void;
  muteSuggestions: () => void;
  unmuteSuggestions: () => void;
  dismissTipForever: (tipId: string) => void;
  notifyTabChange: (tab: string) => void;
  notifyModalOpen: (modalId: string) => void;
  notifyModalClose: () => void;
  notifyActionEvent: (eventId: keyof typeof ACTION_EVENTS, variables?: Record<string, string>) => void;
  notifyFieldFocus: (fieldId: string, variables?: Record<string, string>) => void;

  // Debug mode (?debug=yacita)
  isDebugMode: boolean;
  debugStats: {
    total: number;
    withDataYacita: number;
    generic: number;
    genericElements: GenericElementDebug[];
  };
  simulateInteraction: (elementId: string, vars?: Record<string, string>) => void;
}

const YacitaCoachContext = createContext<YacitaCoachContextValue | null>(null);

const STORAGE_MUTED_KEY = 'yacita_suggestions_muted';
const STORAGE_MINIMIZED_KEY = 'yacita_avatar_minimized';
const STORAGE_DISMISSED_TIPS_KEY = 'yacita_dismissed_tips';
const STORAGE_VISITED_TABS_KEY = 'yacita_visited_tabs';
const STORAGE_COACHING_LEVEL_KEY = 'yacita_coaching_level';
const STORAGE_VOICE_ENABLED_KEY = 'yacita_voice_enabled';
const STORAGE_VOICE_SPEED_KEY = 'yacita_voice_speed';
const STORAGE_VOICE_VOLUME_KEY = 'yacita_voice_volume';
const STORAGE_VOICE_URI_KEY = 'yacita_voice_uri';
const STORAGE_VOICE_PROMPTED_KEY = 'yacita_voice_prompted';

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
  const [coachingLevel, setCoachingLevelState] = useState<CoachingLevel>(() => {
    const stored = localStorage.getItem(STORAGE_COACHING_LEVEL_KEY);
    if (stored === 'moderado' || stored === 'silencioso' || stored === 'completo') {
      return stored;
    }
    return 'completo';
  });

  const [isMuted, setIsMutedState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_MUTED_KEY) === 'true';
  });

  const [isMinimized, setIsMinimizedState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_MINIMIZED_KEY) === 'true';
  });

  // VOICE CONFIGURATION (Parte 2: Default false, asks on first login)
  const [isVoiceEnabled, setIsVoiceEnabledState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_VOICE_ENABLED_KEY) === 'true';
  });

  const [voiceSpeed, setVoiceSpeedState] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_VOICE_SPEED_KEY);
    return stored ? parseFloat(stored) : 1.1; // default agile 1.1
  });

  const [voiceVolume, setVoiceVolumeState] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_VOICE_VOLUME_KEY);
    return stored ? parseFloat(stored) : 1.0;
  });

  const [selectedVoiceUri, setSelectedVoiceUriState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_VOICE_URI_KEY) || '';
  });

  const [availableVoices, setAvailableVoices] = useState<SpanishVoiceInfo[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Active Field Guide state (Parte 1)
  const [activeFieldGuide, setActiveFieldGuide] = useState<GuiaCampoItem | null>(null);
  const [activeConsejoIndex, setActiveConsejoIndex] = useState<number>(0);

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
  const [microFeedback, setMicroFeedback] = useState<MicroFeedback | null>(null);

  // References for anti-saturation, cooldown and debounce (~400ms for fast Tab navigation)
  const typewriterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const periodicTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fieldDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const microTimerRef = useRef<NodeJS.Timeout | null>(null);

  const lastUserInteractionRef = useRef<number>(Date.now());
  const lastPeriodicTipIdRef = useRef<string | null>(null);
  const lastFocusedElementRef = useRef<string | null>(null);

  // 20-second cooldown per element / id
  const elementCooldownMap = useRef<Map<string, number>>(new Map());

  // Check ?debug=yacita in URL
  const isDebugMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === 'yacita';
  }, []);

  const [debugStats, setDebugStats] = useState<{
    total: number;
    withDataYacita: number;
    generic: number;
    genericElements: GenericElementDebug[];
  }>({ total: 0, withDataYacita: 0, generic: 0, genericElements: [] });

  // Load available Spanish voices
  const refreshVoices = useCallback(() => {
    const list = getAvailableSpanishVoices();
    setAvailableVoices(list);
  }, []);

  useEffect(() => {
    refreshVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices);
      };
    }
  }, [refreshVoices]);

  // Current voice name
  const currentVoiceName = useMemo(() => {
    const v = pickBestSpanishFemaleVoice(selectedVoiceUri);
    return v ? `${v.name} (${v.lang})` : 'Voz predeterminada en español';
  }, [selectedVoiceUri, availableVoices]);

  // Voice setters with localStorage persistence
  const setIsVoiceEnabled = useCallback((enabled: boolean) => {
    setIsVoiceEnabledState(enabled);
    localStorage.setItem(STORAGE_VOICE_ENABLED_KEY, enabled ? 'true' : 'false');
    if (!enabled) {
      stopSpeaking();
      setIsSpeaking(false);
    }
  }, []);

  const setVoiceSpeed = useCallback((speed: number) => {
    setVoiceSpeedState(speed);
    localStorage.setItem(STORAGE_VOICE_SPEED_KEY, speed.toString());
  }, []);

  const setVoiceVolume = useCallback((vol: number) => {
    setVoiceVolumeState(vol);
    localStorage.setItem(STORAGE_VOICE_VOLUME_KEY, vol.toString());
  }, []);

  const setSelectedVoiceUri = useCallback((uri: string) => {
    setSelectedVoiceUriState(uri);
    localStorage.setItem(STORAGE_VOICE_URI_KEY, uri);
  }, []);

  const setCoachingLevel = useCallback((level: CoachingLevel) => {
    setCoachingLevelState(level);
    localStorage.setItem(STORAGE_COACHING_LEVEL_KEY, level);
    if (level === 'silencioso') {
      stopSpeaking();
    }
  }, []);

  const setIsMuted = useCallback((muted: boolean) => {
    setIsMutedState(muted);
    localStorage.setItem(STORAGE_MUTED_KEY, muted ? 'true' : 'false');
    if (muted) {
      stopSpeaking();
    }
  }, []);

  const setIsMinimized = useCallback((minimized: boolean) => {
    setIsMinimizedState(minimized);
    localStorage.setItem(STORAGE_MINIMIZED_KEY, minimized ? 'true' : 'false');
    if (minimized) {
      stopSpeaking();
    }
  }, []);

  const dismissTipForever = useCallback((tipId: string) => {
    setDismissedTips((prev) => {
      const next = Array.from(new Set([...prev, tipId]));
      localStorage.setItem(STORAGE_DISMISSED_TIPS_KEY, JSON.stringify(next));
      return next;
    });
    setCurrentBubble((curr) => (curr?.id === tipId ? null : curr));
  }, []);

  // Micro feedback trigger for rapid repetitive actions
  const triggerMicroFeedback = useCallback((text: string, mood: YacitaMood = 'celebrando') => {
    if (microTimerRef.current) clearTimeout(microTimerRef.current);
    setMicroFeedback({ text, mood, id: Date.now() });
    setCurrentMood(mood);

    microTimerRef.current = setTimeout(() => {
      setMicroFeedback(null);
      setCurrentMood((prev) => (currentBubble ? currentBubble.estado : 'idle'));
    }, 2200);
  }, [currentBubble]);

  // Dismiss current bubble
  const dismissBubble = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    setCurrentBubble(null);
    setDisplayedText('');
    setIsTyping(false);
    setCurrentMood('idle');
  }, []);

  // Stop speaking and pause coach when tab visibility changes or window blurs
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopSpeaking();
        setIsSpeaking(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleVisibility);
    };
  }, []);

  // Typewriter effect & auto-dismiss (6.5s, pauses on hover)
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
    const speed = 20; // ms per char

    if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);

    typewriterTimerRef.current = setInterval(() => {
      charIndex++;
      if (charIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, charIndex));
      } else {
        if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
        setIsTyping(false);
        // Switch to the target mood of the message if not actively speaking
        if (!isSpeaking) {
          setCurrentMood(currentBubble.estado || 'idle');
        }
      }
    }, speed);

    return () => {
      if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
    };
  }, [currentBubble, isSpeaking]);

  // 6.5s auto-dismiss logic (pauses when hovered)
  useEffect(() => {
    if (!currentBubble || isTyping || isSpeaking) {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      return;
    }

    if (isPaused) {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      return;
    }

    autoCloseTimerRef.current = setTimeout(() => {
      dismissBubble();
    }, 6500);

    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, [currentBubble, isTyping, isPaused, isSpeaking, dismissBubble]);

  // Advance queue when bubble becomes empty
  useEffect(() => {
    if (!currentBubble && bubbleQueue.length > 0) {
      const [nextBubble, ...remaining] = bubbleQueue;
      setBubbleQueue(remaining);
      setCurrentBubble(nextBubble);
    }
  }, [currentBubble, bubbleQueue]);

  // Enqueue / Trigger message by priority + speech trigger
  const triggerMessage = useCallback(
    (
      item: YacitaMessageItem,
      variables: Record<string, string> = {},
      allowDoNotShowAgain: boolean = false
    ) => {
      // Coaching level checks
      if (coachingLevel === 'silencioso' && item.priority < 4 && !item.id.startsWith('manual_')) {
        return;
      }
      if (coachingLevel === 'moderado' && item.priority < 3) {
        return;
      }
      if (isMuted && item.priority <= 2) return;
      if (dismissedTips.includes(item.id)) return;

      const formatted = formatYacitaText(item.texto, {
        nombre: teacherFirstName,
        ...variables,
      });

      const safeText = formatted.length > 135 ? formatted.slice(0, 132) + '...' : formatted;

      const bubble: ActiveBubble = {
        id: item.id,
        context: item.context,
        texto: safeText,
        estado: item.estado,
        priority: item.priority,
        botones: item.botones,
        allowDoNotShowAgain,
        textoVoz: item.textoVoz || cleanTextForVoice(safeText),
        contieneDatosPersonales: item.contieneDatosPersonales,
      };

      setCurrentBubble((current) => {
        if (!current) {
          return bubble;
        }

        // Higher priority preempts current message immediately
        if (bubble.priority > current.priority) {
          if (current.priority > 1) {
            setBubbleQueue((prev) => [current, ...prev]);
          }
          return bubble;
        }

        // Same or lower priority enqueued
        setBubbleQueue((prev) => {
          if (prev.some((b) => b.id === bubble.id)) return prev;
          const updated = [...prev, bubble].sort((a, b) => b.priority - a.priority);
          return updated.slice(0, 3);
        });
        return current;
      });

      // VOICE SPEECH: Read the exact same short text if voice is enabled
      if (isVoiceEnabled && coachingLevel !== 'silencioso') {
        const textToSpeak = item.textoVoz || cleanTextForVoice(safeText);
        speakYacita(textToSpeak, {
          voiceUri: selectedVoiceUri,
          rate: voiceSpeed,
          volume: voiceVolume,
          containsPersonalData: item.contieneDatosPersonales,
          onStart: () => {
            setIsSpeaking(true);
            setCurrentMood('hablando');
          },
          onMouthToggle: (isMouthOpen) => {
            setCurrentMood(isMouthOpen ? 'hablando' : (bubble.estado || 'idle'));
          },
          onEnd: () => {
            setIsSpeaking(false);
            setCurrentMood(bubble.estado || 'idle');
          },
        });
      }
    },
    [
      teacherFirstName,
      isMuted,
      dismissedTips,
      coachingLevel,
      isVoiceEnabled,
      selectedVoiceUri,
      voiceSpeed,
      voiceVolume,
    ]
  );

  // Rotate to the next tip for the currently active field ("Ver otro consejo")
  const rotateConsejo = useCallback(
    (fieldId?: string) => {
      const targetId = fieldId || activeFieldGuide?.id;
      if (!targetId) return;

      const guia = getGuiaCampo(targetId, { nombre: teacherFirstName });
      if (!guia || guia.consejos.length === 0) return;

      const nextIndex = (activeConsejoIndex + 1) % guia.consejos.length;
      setActiveConsejoIndex(nextIndex);
      const chosenConsejo = guia.consejos[nextIndex];

      triggerMessage({
        id: `consejo_${targetId}_${nextIndex}`,
        context: 'field_advice_rotation',
        texto: chosenConsejo,
        estado: 'apuntando_notas',
        priority: 4,
        textoVoz: cleanTextForVoice(chosenConsejo),
        contieneDatosPersonales: guia.contieneDatosPersonales,
      });
    },
    [activeFieldGuide, activeConsejoIndex, teacherFirstName, triggerMessage]
  );

  // Test voice button helper
  const testVoice = useCallback(() => {
    const sample = `¡Hola, profe ${teacherFirstName}! Soy Yacita, tu compañera pedagógica en la Institución Educativa Denzil Escolar.`;
    speakYacita(sample, {
      voiceUri: selectedVoiceUri,
      rate: voiceSpeed,
      volume: voiceVolume,
      containsPersonalData: false,
      onStart: () => {
        setIsSpeaking(true);
        setCurrentMood('hablando');
      },
      onMouthToggle: (open) => {
        setCurrentMood(open ? 'hablando' : 'saludo');
      },
      onEnd: () => {
        setIsSpeaking(false);
        setCurrentMood('idle');
      },
    });
  }, [teacherFirstName, selectedVoiceUri, voiceSpeed, voiceVolume]);

  // Initial greeting and first-time voice opt-in prompt
  useEffect(() => {
    const hasPromptedVoice = localStorage.getItem(STORAGE_VOICE_PROMPTED_KEY) === 'true';

    const hour = new Date().getHours();
    let greetingTemplate = YACITA_GREETINGS.manana;
    if (hour >= 12 && hour < 18) {
      greetingTemplate = YACITA_GREETINGS.tarde;
    } else if (hour >= 18 || hour < 5) {
      greetingTemplate = YACITA_GREETINGS.noche;
    }

    const timer = setTimeout(() => {
      if (!hasPromptedVoice) {
        // First login: ask if user wants voice accompaniment
        triggerMessage({
          id: 'prompt_voice_activation',
          context: 'voice_opt_in',
          texto: '¿Quieres que te hable mientras te acompaño con tus registros? 😊',
          textoVoz: 'Quieres que te hable mientras te acompaño con tus registros?',
          estado: 'hablando',
          priority: 4,
          botones: [
            {
              label: 'Sí, activar voz 🔊',
              actionId: 'enable_voice',
              onClick: () => {
                setIsVoiceEnabled(true);
                localStorage.setItem(STORAGE_VOICE_PROMPTED_KEY, 'true');
                triggerMessage({
                  id: 'voice_confirmed',
                  context: 'voice_opt_in',
                  texto: '¡Listo, profe {nombre}! Te acompañaré con voz durante tus labores formativas.',
                  textoVoz: `Listo, profe ${teacherFirstName}. Te acompañaré con voz durante tus labores formativas.`,
                  estado: 'celebrando',
                  priority: 3,
                });
              },
            },
            {
              label: 'No, gracias',
              actionId: 'dismiss_voice',
              variant: 'secondary',
              onClick: () => {
                setIsVoiceEnabled(false);
                localStorage.setItem(STORAGE_VOICE_PROMPTED_KEY, 'true');
              },
            },
          ],
        });
      } else {
        triggerMessage(greetingTemplate, { nombre: teacherFirstName });
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [teacherFirstName, triggerMessage, setIsVoiceEnabled]);

  // Periodic suggestions timer (every 45-90s)
  useEffect(() => {
    if (isMuted || coachingLevel === 'silencioso') return;

    const scheduleNextPeriodicTip = () => {
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

        scheduleNextPeriodicTip();
      }, delay);
    };

    scheduleNextPeriodicTip();

    return () => {
      if (periodicTimerRef.current) clearTimeout(periodicTimerRef.current);
    };
  }, [currentTab, activeModal, isMuted, coachingLevel, dismissedTips, teacherFirstName, triggerMessage]);

  // PARTE 1: CENTRALIZED GLOBAL DELEGATED LISTENER WITH ~400ms DEBOUNCE
  useEffect(() => {
    const handleGlobalInteraction = (event: Event) => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (coachingLevel === 'silencioso') return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Ignore interactions inside Yacita's own bubble or floating panel
      if (target.closest('[data-yacita-ignore]') || target.closest('[data-yacita-avatar-area]')) {
        return;
      }

      // Resolve closest interactive element
      const interactiveEl = target.closest(
        'button, a, [role="tab"], [role="button"], input, select, textarea, [data-yacita], tr[data-student-id], div[data-student-id]'
      ) as HTMLElement | null;

      if (!interactiveEl) return;

      // In text inputs, only react on focusin or change, never on keydown
      const isTextInput = interactiveEl.tagName === 'INPUT' || interactiveEl.tagName === 'TEXTAREA';
      if (isTextInput && event.type === 'click') {
        return;
      }

      // If modal is open, only listen to elements inside the modal
      if (activeModal !== null) {
        const isInModal = interactiveEl.closest('[role="dialog"]') || interactiveEl.closest('.modal-content') || interactiveEl.closest('.fixed');
        if (!isInModal) return;
      }

      const yacitaId = interactiveEl.getAttribute('data-yacita');

      // Check repetitive matrix actions
      const isRepetitiveScore =
        yacitaId === 'matrix_score_3' ||
        yacitaId === 'matrix_score_2' ||
        yacitaId === 'matrix_score_1';

      if (isRepetitiveScore) {
        const stars = yacitaId === 'matrix_score_3' ? '3★ Logrado' : yacitaId === 'matrix_score_2' ? '2★ En Proceso' : '1★ Requiere Apoyo';
        const mood: YacitaMood = yacitaId === 'matrix_score_3' ? 'celebrando' : yacitaId === 'matrix_score_1' ? 'empatica' : 'apuntando_notas';
        triggerMicroFeedback(`¡Anotado! ${stars}`, mood);
        return;
      }

      // Resolve variables
      let vars: Record<string, string> = { nombre: teacherFirstName };
      const varsAttr = interactiveEl.getAttribute('data-yacita-vars');
      if (varsAttr) {
        try {
          const parsed = JSON.parse(varsAttr);
          vars = { ...vars, ...parsed };
        } catch {
          // ignore
        }
      }

      if (interactiveEl.getAttribute('data-student-name')) {
        vars.studentName = interactiveEl.getAttribute('data-student-name') || '';
      }
      if (interactiveEl.getAttribute('data-grade')) {
        vars.grade = interactiveEl.getAttribute('data-grade') || '';
      }
      if (interactiveEl.getAttribute('data-shift')) {
        vars.shift = interactiveEl.getAttribute('data-shift') || '';
      }
      if (interactiveEl.getAttribute('data-date')) {
        vars.date = interactiveEl.getAttribute('data-date') || '';
      }

      // Resolve field guide or element message
      let guia: GuiaCampoItem | null = null;
      if (yacitaId) {
        guia = getGuiaCampo(yacitaId, vars);
      }

      if (!guia) {
        const tag = interactiveEl.tagName.toLowerCase();
        const label =
          interactiveEl.getAttribute('aria-label') ||
          interactiveEl.getAttribute('title') ||
          (interactiveEl as HTMLInputElement).placeholder ||
          interactiveEl.innerText?.slice(0, 32) ||
          (interactiveEl as HTMLInputElement).name ||
          'este elemento';
        const actionType = event.type === 'focusin' ? 'focus' : event.type === 'change' ? 'change' : 'click';
        guia = getGenericGuiaCampo(tag, label, actionType);
      }

      // Fast Tab navigation debounce: ~400ms delay so quick tabs do not accumulate
      if (fieldDebounceTimerRef.current) {
        clearTimeout(fieldDebounceTimerRef.current);
      }

      const isSameElement = lastFocusedElementRef.current === (yacitaId || interactiveEl.id);
      lastFocusedElementRef.current = yacitaId || interactiveEl.id;

      fieldDebounceTimerRef.current = setTimeout(() => {
        if (!guia) return;

        setActiveFieldGuide(guia);

        // If re-focusing the exact same element, rotate advice
        if (isSameElement && guia.consejos.length > 1) {
          const nextIdx = (activeConsejoIndex + 1) % guia.consejos.length;
          setActiveConsejoIndex(nextIdx);
        } else {
          setActiveConsejoIndex(0);
        }

        let mood: YacitaMood = 'apuntando_notas';
        if (yacitaId?.includes('score_3') || yacitaId?.includes('save') || yacitaId?.includes('mark_all')) {
          mood = 'celebrando';
        } else if (yacitaId?.includes('score_1') || yacitaId?.includes('delete')) {
          mood = 'empatica';
        } else if (yacitaId?.includes('tdr') || yacitaId?.includes('report')) {
          mood = 'pulgar_arriba';
        }

        triggerMessage({
          id: `field_${guia.id}`,
          context: 'field_guide_focus',
          texto: guia.burbujaCorta,
          estado: mood,
          priority: yacitaId?.startsWith('field_') ? 4 : 2,
          textoVoz: guia.textoVoz || cleanTextForVoice(guia.burbujaCorta),
          contieneDatosPersonales: guia.contieneDatosPersonales,
        });
      }, 400);
    };

    document.addEventListener('focusin', handleGlobalInteraction, { passive: true });
    document.addEventListener('click', handleGlobalInteraction, { passive: true });
    document.addEventListener('change', handleGlobalInteraction, { passive: true });

    return () => {
      document.removeEventListener('focusin', handleGlobalInteraction);
      document.removeEventListener('click', handleGlobalInteraction);
      document.removeEventListener('change', handleGlobalInteraction);
      if (fieldDebounceTimerRef.current) clearTimeout(fieldDebounceTimerRef.current);
    };
  }, [
    coachingLevel,
    activeModal,
    teacherFirstName,
    activeConsejoIndex,
    triggerMessage,
    triggerMicroFeedback,
  ]);

  // Notify field focus directly from modal forms
  const notifyFieldFocus = useCallback(
    (fieldId: string, variables: Record<string, string> = {}) => {
      const guia = getGuiaCampo(fieldId, { nombre: teacherFirstName, ...variables });
      if (guia) {
        setActiveFieldGuide(guia);
        triggerMessage({
          id: `field_${fieldId}`,
          context: 'field_focus_direct',
          texto: guia.burbujaCorta,
          estado: 'apuntando_notas',
          priority: 4,
          textoVoz: guia.textoVoz || cleanTextForVoice(guia.burbujaCorta),
          contieneDatosPersonales: guia.contieneDatosPersonales,
        });
      }
    },
    [teacherFirstName, triggerMessage]
  );

  // F) DEBUG MODE: Scan interactive elements when ?debug=yacita is active
  useEffect(() => {
    if (!isDebugMode) return;

    const runDebugScan = () => {
      if (typeof document === 'undefined') return;
      const interactiveElements = document.querySelectorAll<HTMLElement>(
        'button, a, [role="tab"], [role="button"], input, select, textarea, tr[data-student-id]'
      );

      let withAttr = 0;
      let genericCount = 0;
      const uncatalogued: GenericElementDebug[] = [];

      interactiveElements.forEach((el) => {
        if (el.closest('[data-yacita-ignore]') || el.closest('[data-yacita-avatar-area]')) {
          return;
        }

        const yacitaId = el.getAttribute('data-yacita');
        if (yacitaId) {
          withAttr++;
        } else {
          genericCount++;
          const label =
            el.getAttribute('aria-label') ||
            el.getAttribute('title') ||
            (el as HTMLInputElement).placeholder ||
            el.innerText?.slice(0, 30) ||
            '(sin etiqueta)';
          uncatalogued.push({
            tag: el.tagName.toLowerCase(),
            label,
            sampleHtml: el.outerHTML.slice(0, 80),
          });
        }
      });

      const total = withAttr + genericCount;
      console.log(
        `%c[Yacita Debug]%c Total interactivos: ${total} | Con data-yacita: ${withAttr} | Usando genérico: ${genericCount}`,
        'background: #d97706; color: white; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
        'color: #0b2a6b; font-weight: bold;'
      );

      setDebugStats({
        total,
        withDataYacita: withAttr,
        generic: genericCount,
        genericElements: uncatalogued.slice(0, 30),
      });
    };

    const timer = setTimeout(runDebugScan, 1200);
    return () => clearTimeout(timer);
  }, [isDebugMode, currentTab]);

  // Simulation method for testing
  const simulateInteraction = useCallback(
    (elementId: string, vars: Record<string, string> = {}) => {
      const msg = getElementMessage(elementId, { nombre: teacherFirstName, ...vars });
      if (msg) {
        triggerMessage(msg, vars);
      }
    },
    [teacherFirstName, triggerMessage]
  );

  // Tab change handler
  const notifyTabChange = useCallback(
    (tab: string) => {
      stopSpeaking();
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

  // Modal open
  const notifyModalOpen = useCallback(
    (modalId: string) => {
      stopSpeaking();
      setActiveModal(modalId);
      const modalItem = (MODAL_MESSAGES as Record<string, any>)[modalId];
      if (modalItem) {
        triggerMessage(modalItem, { nombre: teacherFirstName });
      }
    },
    [teacherFirstName, triggerMessage]
  );

  // Modal close
  const notifyModalClose = useCallback(() => {
    stopSpeaking();
    setActiveModal(null);
    dismissBubble();
  }, [dismissBubble]);

  // Action event
  const notifyActionEvent = useCallback(
    (eventId: keyof typeof ACTION_EVENTS, variables?: Record<string, string>) => {
      const item = ACTION_EVENTS[eventId];
      if (item) {
        triggerMessage(item, variables);
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
    coachingLevel,
    setCoachingLevel,
    currentBubble,
    currentMood,
    microFeedback,
    isTyping,
    displayedText,
    isMuted,
    setIsMuted,
    isMinimized,
    setIsMinimized,
    isPaused,
    setIsPaused,
    activeFieldGuide,
    activeConsejoIndex,
    rotateConsejo,
    isVoiceEnabled,
    setIsVoiceEnabled,
    voiceSpeed,
    setVoiceSpeed,
    voiceVolume,
    setVoiceVolume,
    selectedVoiceUri,
    setSelectedVoiceUri,
    availableVoices,
    currentVoiceName,
    isSpeaking,
    testVoice,
    triggerMessage,
    triggerMicroFeedback,
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
    isDebugMode,
    debugStats,
    simulateInteraction,
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
