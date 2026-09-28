// src/coach/YacitaCoachContext.tsx
// React Provider & Hook subscribing to the singleton ConversationController.
// Strict compliance with AI_RULES.md - No SVG, authentic PNG expressions only.

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  conversationController,
  ConversationState,
  CoachMessage,
  MicroFeedback,
  DebugEventRecord,
} from './ConversationController';
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
  TAB_MESSAGES,
  MODAL_MESSAGES,
  ACTION_EVENTS,
  YACITA_GREETINGS,
  PERIODIC_TIPS_BY_TAB,
} from '../config/yacitaMensajes';
import { getTeacherFirstName } from '../utils/yacitaVoice';
import {
  pickBestSpanishFemaleVoice,
  SpanishVoiceInfo,
} from '../utils/yacitaVoiceEngine';
import { TeacherProfile } from '../types';

export type ActiveBubble = CoachMessage;

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

  // Three Independent Controls (Parte 3)
  isVoiceEnabled: boolean;
  setIsVoiceEnabled: (enabled: boolean) => void;
  isPeriodicEnabled: boolean;
  setIsPeriodicEnabled: (enabled: boolean) => void;
  coachingLevel: CoachingLevel;
  setCoachingLevel: (level: CoachingLevel) => void;

  // Active dialogue & state (Parte 1 & 2)
  currentMessage: CoachMessage | null;
  // Alias for backward compatibility
  currentBubble: CoachMessage | null;
  currentMood: YacitaMood;
  displayedText: string;
  isSpeaking: boolean;
  isTyping: boolean;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  isMinimized: boolean;
  setIsMinimized: (minimized: boolean) => void;
  microFeedback: MicroFeedback | null;
  isDialogueInModalPanel: boolean;

  // Field Guide (Parte 1 & 4)
  activeFieldGuide: GuiaCampoItem | null;
  activeConsejoIndex: number;
  rotateConsejo: (fieldId?: string) => void;

  // Voice details
  voiceSpeed: number;
  setVoiceSpeed: (speed: number) => void;
  voiceVolume: number;
  setVoiceVolume: (vol: number) => void;
  selectedVoiceUri: string;
  setSelectedVoiceUri: (uri: string) => void;
  availableVoices: SpanishVoiceInfo[];
  currentVoiceName: string;
  testVoice: () => void;

  // Actions
  triggerMessage: (message: YacitaMessageItem, variables?: Record<string, string>, allowDoNotShowAgain?: boolean) => void;
  triggerMicroFeedback: (text: string, mood?: YacitaMood) => void;
  dismissBubble: () => void;
  skipVoiceAndComplete: () => void;
  reopenTabHelp: () => void;
  dismissTipForever: (tipId: string) => void;
  notifyTabChange: (tab: string) => void;
  notifyModalOpen: (modalId: string) => void;
  notifyModalClose: () => void;
  notifyActionEvent: (eventId: keyof typeof ACTION_EVENTS, variables?: Record<string, string>) => void;
  notifyFieldFocus: (fieldId: string, variables?: Record<string, string>) => void;

  // Debug & verification (?debug=yacita)
  isDebugMode: boolean;
  debugStats: {
    total: number;
    withDataYacita: number;
    generic: number;
    genericElements: GenericElementDebug[];
  };
  debugEvents: DebugEventRecord[];
  simulateInteraction: (elementId: string, vars?: Record<string, string>) => void;
  simulatePeriodicTip: () => void;
}

const YacitaCoachContext = createContext<YacitaCoachContextValue | null>(null);

const STORAGE_VOICE_PROMPTED_KEY = 'yacita_voice_prompted';
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

  // Subscribe React to the singleton ConversationController
  const [controllerState, setControllerState] = useState<ConversationState>(() => {
    conversationController.setTeacherName(teacherFirstName);
    conversationController.setCurrentTab(initialTab);
    return conversationController.getState();
  });

  useEffect(() => {
    conversationController.setTeacherName(teacherFirstName);
  }, [teacherFirstName]);

  useEffect(() => {
    const unsubscribe = conversationController.subscribe((newState) => {
      setControllerState(newState);
    });
    return unsubscribe;
  }, []);

  // Initialize global delegated listener once on document (StrictMode safe)
  useEffect(() => {
    const cleanupListeners = conversationController.initGlobalListeners();
    conversationController.restartPeriodicTimer();

    return () => {
      cleanupListeners();
    };
  }, []);

  // Track visited tabs in sessionStorage
  const [visitedTabs, setVisitedTabs] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_VISITED_TABS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Check ?debug=yacita
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

  // Initial welcome and optional first-time voice opt-in prompt
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
        conversationController.dispatchMessage({
          id: 'prompt_voice_activation',
          origen: 'sistema',
          prioridad: 4,
          texto: '¿Quieres que te hable mientras te acompaño con tus registros? 😊',
          textoVoz: 'Quieres que te hable mientras te acompaño con tus registros?',
          estadoYacita: 'hablando',
          botones: [
            {
              label: 'Sí, activar voz 🔊',
              actionId: 'enable_voice',
              onClick: () => {
                conversationController.setVoiceEnabled(true);
                localStorage.setItem(STORAGE_VOICE_PROMPTED_KEY, 'true');
                conversationController.dispatchMessage({
                  id: 'voice_confirmed',
                  origen: 'sistema',
                  prioridad: 3,
                  texto: '¡Listo, profe {nombre}! Te acompañaré con voz durante tus labores formativas.',
                  textoVoz: `Listo, profe ${teacherFirstName}. Te acompañaré con voz durante tus labores formativas.`,
                  estadoYacita: 'celebrando',
                });
              },
            },
            {
              label: 'No, gracias',
              actionId: 'dismiss_voice',
              variant: 'secondary',
              onClick: () => {
                conversationController.setVoiceEnabled(false);
                localStorage.setItem(STORAGE_VOICE_PROMPTED_KEY, 'true');
              },
            },
          ],
        });
      } else {
        const formatted = formatYacitaText(greetingTemplate.texto, { nombre: teacherFirstName });
        conversationController.dispatchMessage({
          id: greetingTemplate.id,
          origen: 'sistema',
          prioridad: greetingTemplate.priority,
          texto: formatted,
          textoVoz: cleanTextForVoice(formatted),
          estadoYacita: greetingTemplate.estado,
          botones: (greetingTemplate as any).botones,
        });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [teacherFirstName]);

  // Voice name display
  const currentVoiceName = useMemo(() => {
    const v = pickBestSpanishFemaleVoice(controllerState.selectedVoiceUri);
    return v ? `${v.name} (${v.lang})` : 'Voz predeterminada en español';
  }, [controllerState.selectedVoiceUri, controllerState.availableVoices]);

  // Test voice helper
  const testVoice = useCallback(() => {
    conversationController.dispatchMessage({
      id: 'manual_voice_test',
      origen: 'sistema',
      prioridad: 5,
      texto: `¡Hola, profe ${teacherFirstName}! Soy Yacita, tu compañera pedagógica en la I.E. Denzil Escolar.`,
      textoVoz: `Hola, profe ${teacherFirstName}. Soy Yacita, tu compañera pedagógica en la Institución Educativa Denzil Escolar.`,
      estadoYacita: 'saludo',
    });
  }, [teacherFirstName]);

  // Trigger generic or customized message through controller
  const triggerMessage = useCallback(
    (
      item: YacitaMessageItem,
      variables: Record<string, string> = {},
      allowDoNotShowAgain: boolean = false
    ) => {
      const formatted = formatYacitaText(item.texto, {
        nombre: teacherFirstName,
        ...variables,
      });

      const safeText = formatted.length > 140 ? formatted.slice(0, 137) + '...' : formatted;

      conversationController.dispatchMessage({
        id: item.id,
        origen: 'interaccion',
        prioridad: item.priority || 2,
        texto: safeText,
        textoVoz: item.textoVoz || cleanTextForVoice(safeText),
        estadoYacita: item.estado,
        botones: item.botones,
        allowDoNotShowAgain,
        contieneDatosPersonales: item.contieneDatosPersonales,
      });
    },
    [teacherFirstName]
  );

  // Tab change
  const notifyTabChange = useCallback(
    (tab: string) => {
      conversationController.setCurrentTab(tab);
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
        const formatted = formatYacitaText(item.texto, { nombre: teacherFirstName });
        conversationController.dispatchMessage({
          id: `tab_${tab}_${isFirstTime ? 'first' : 'short'}`,
          origen: 'interaccion',
          prioridad: 3,
          texto: formatted,
          textoVoz: cleanTextForVoice(formatted),
          estadoYacita: item.estado,
          botones: item.botones,
        });
      }
    },
    [visitedTabs, teacherFirstName]
  );

  // Modal open
  const notifyModalOpen = useCallback(
    (modalId: string) => {
      conversationController.setActiveModal(modalId);
      const modalItem = (MODAL_MESSAGES as Record<string, any>)[modalId];
      if (modalItem) {
        const formatted = formatYacitaText(modalItem.texto, { nombre: teacherFirstName });
        conversationController.dispatchMessage({
          id: `modal_${modalId}`,
          origen: 'formulario',
          prioridad: 4,
          texto: formatted,
          textoVoz: cleanTextForVoice(formatted),
          estadoYacita: modalItem.estado,
          botones: modalItem.botones,
        });
      }
    },
    [teacherFirstName]
  );

  // Modal close
  const notifyModalClose = useCallback(() => {
    conversationController.setActiveModal(null);
    conversationController.dismissBubble();
  }, []);

  // Action event
  const notifyActionEvent = useCallback(
    (eventId: keyof typeof ACTION_EVENTS, variables?: Record<string, string>) => {
      const item = ACTION_EVENTS[eventId];
      if (item) {
        const formatted = formatYacitaText(item.texto, { nombre: teacherFirstName, ...variables });
        conversationController.dispatchMessage({
          id: `action_${eventId}`,
          origen: 'interaccion',
          prioridad: item.priority || 3,
          texto: formatted,
          textoVoz: cleanTextForVoice(formatted),
          estadoYacita: item.estado,
          botones: (item as any).botones,
        });
      }
    },
    [teacherFirstName]
  );

  // Reopen Tab Help
  const reopenTabHelp = useCallback(() => {
    const tabConfig = (TAB_MESSAGES as Record<string, any>)[controllerState.currentTab];
    if (tabConfig) {
      const item = tabConfig.firstTime || tabConfig.short;
      const formatted = formatYacitaText(item.texto, { nombre: teacherFirstName });
      conversationController.dispatchMessage({
        id: `manual_tab_help_${controllerState.currentTab}`,
        origen: 'interaccion',
        prioridad: 4,
        texto: formatted,
        textoVoz: cleanTextForVoice(formatted),
        estadoYacita: item.estado,
        botones: item.botones,
      });
    }
  }, [controllerState.currentTab, teacherFirstName]);

  // Notify field focus directly from modal forms
  const notifyFieldFocus = useCallback(
    (fieldId: string, variables: Record<string, string> = {}) => {
      const guia = getGuiaCampo(fieldId, { nombre: teacherFirstName, ...variables });
      if (guia) {
        conversationController.dispatchMessage({
          id: `field_${fieldId}`,
          origen: 'formulario',
          prioridad: 4,
          texto: guia.burbujaCorta,
          textoVoz: guia.textoVoz || cleanTextForVoice(guia.burbujaCorta),
          estadoYacita: 'apuntando_notas',
          fieldGuide: guia,
          contieneDatosPersonales: guia.contieneDatosPersonales,
        });
      }
    },
    [teacherFirstName]
  );

  // Scan debug elements if ?debug=yacita
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

      setDebugStats({
        total: withAttr + genericCount,
        withDataYacita: withAttr,
        generic: genericCount,
        genericElements: uncatalogued.slice(0, 30),
      });
    };

    const timer = setTimeout(runDebugScan, 1200);
    return () => clearTimeout(timer);
  }, [isDebugMode, controllerState.currentTab]);

  // Simulation methods
  const simulateInteraction = useCallback(
    (elementId: string, vars: Record<string, string> = {}) => {
      const msg = getElementMessage(elementId, { nombre: teacherFirstName, ...vars });
      if (msg) {
        conversationController.dispatchMessage({
          id: msg.id,
          origen: 'interaccion',
          prioridad: msg.priority || 3,
          texto: formatYacitaText(msg.texto, { nombre: teacherFirstName, ...vars }),
          textoVoz: msg.textoVoz,
          estadoYacita: msg.estado,
          botones: msg.botones,
        });
      }
    },
    [teacherFirstName]
  );

  const simulatePeriodicTip = useCallback(() => {
    conversationController.restartPeriodicTimer();
    // Force immediate tip dispatch
    const tips = (PERIODIC_TIPS_BY_TAB as any)[controllerState.currentTab] || [];
    if (tips.length > 0) {
      const chosen = tips[0];
      const formatted = formatYacitaText(chosen.texto, { nombre: teacherFirstName });
      conversationController.dispatchMessage({
        id: chosen.id,
        origen: 'periodico',
        prioridad: 2,
        texto: formatted,
        textoVoz: cleanTextForVoice(formatted),
        estadoYacita: chosen.estado,
        botones: chosen.botones,
        allowDoNotShowAgain: true,
      });
    }
  }, [controllerState.currentTab, teacherFirstName]);

  const value: YacitaCoachContextValue = {
    teacherName: teacherFirstName,
    currentTab: controllerState.currentTab,
    setCurrentTab: (tab) => conversationController.setCurrentTab(tab),
    activeModal: controllerState.activeModal,
    setActiveModal: (modal) => conversationController.setActiveModal(modal),

    // Three Independent Controls
    isVoiceEnabled: controllerState.isVoiceEnabled,
    setIsVoiceEnabled: (enabled) => conversationController.setVoiceEnabled(enabled),
    isPeriodicEnabled: controllerState.isPeriodicEnabled,
    setIsPeriodicEnabled: (enabled) => conversationController.setPeriodicTipsEnabled(enabled),
    coachingLevel: controllerState.coachingLevel,
    setCoachingLevel: (level) => conversationController.setCoachingLevel(level),

    currentMessage: controllerState.currentMessage,
    currentBubble: controllerState.currentMessage,
    currentMood: controllerState.currentMood,
    displayedText: controllerState.displayedText,
    isSpeaking: controllerState.isSpeaking,
    isTyping: controllerState.isTyping,
    isPaused: controllerState.isPaused,
    setIsPaused: (paused) => conversationController.setIsPaused(paused),
    isMinimized: controllerState.isMinimized,
    setIsMinimized: (min) => conversationController.setIsMinimized(min),
    microFeedback: controllerState.microFeedback,
    isDialogueInModalPanel: controllerState.isDialogueInModalPanel,

    activeFieldGuide: controllerState.activeFieldGuide,
    activeConsejoIndex: controllerState.activeConsejoIndex,
    rotateConsejo: (fieldId) => conversationController.rotateConsejo(fieldId),

    voiceSpeed: controllerState.voiceSpeed,
    setVoiceSpeed: (speed) => conversationController.setVoiceSpeed(speed),
    voiceVolume: controllerState.voiceVolume,
    setVoiceVolume: (vol) => conversationController.setVoiceVolume(vol),
    selectedVoiceUri: controllerState.selectedVoiceUri,
    setSelectedVoiceUri: (uri) => conversationController.setSelectedVoiceUri(uri),
    availableVoices: controllerState.availableVoices,
    currentVoiceName,
    testVoice,

    triggerMessage,
    triggerMicroFeedback: (text, mood) => conversationController.triggerMicroFeedback(text, mood),
    dismissBubble: () => conversationController.dismissBubble(),
    skipVoiceAndComplete: () => conversationController.skipVoiceAndComplete(),
    reopenTabHelp,
    dismissTipForever: (tipId) => conversationController.dismissTipForever(tipId),
    notifyTabChange,
    notifyModalOpen,
    notifyModalClose,
    notifyActionEvent,
    notifyFieldFocus,

    isDebugMode,
    debugStats,
    debugEvents: controllerState.debugEvents,
    simulateInteraction,
    simulatePeriodicTip,
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
