// src/coach/ConversationController.ts
// Singleton Controller for Yacita Pedagogical Coach.
// Single authority for dialogue bubbles, speech synthesis, typewriter sync, and interaction delegation.
// Strict compliance with AI_RULES.md - No SVG, no fake models, authentic PNG expressions only.

import {
  YacitaMood,
  CoachingLevel,
  YacitaActionButton,
  YacitaMessageItem,
  GuiaCampoItem,
  cleanTextForVoice,
  formatYacitaText,
  getElementMessage,
  getGuiaCampo,
  getGenericGuiaCampo,
  PERIODIC_TIPS_BY_TAB,
} from '../config/yacitaMensajes';
import {
  speakYacita,
  stopSpeaking,
  getAvailableSpanishVoices,
  pickBestSpanishFemaleVoice,
  SpanishVoiceInfo,
} from '../utils/yacitaVoiceEngine';

export type MessageOrigin = 'interaccion' | 'formulario' | 'periodico' | 'sistema';

export interface CoachMessage {
  seq: number;
  id: string;
  origen: MessageOrigin;
  prioridad: number; // 1 (repetitive/low) to 5 (user requested/modal)
  texto: string; // What is visually displayed
  textoVoz: string; // What is spoken
  estadoYacita: YacitaMood;
  botones?: YacitaActionButton[];
  allowDoNotShowAgain?: boolean;
  contieneDatosPersonales?: boolean;
  fieldGuide?: GuiaCampoItem | null;
}

export type MessagePhase = 'inactivo' | 'preparando' | 'hablando_escribiendo' | 'completo' | 'cierre';

export interface MicroFeedback {
  text: string;
  mood: YacitaMood;
  id: number;
}

export interface DebugEventRecord {
  seq: number;
  id: string;
  origen: MessageOrigin;
  time: string;
  voice: boolean;
  status: 'completado' | 'cancelado' | 'duplicado_ignorado';
  textSnippet: string;
}

export interface ConversationState {
  seq: number;
  currentMessage: CoachMessage | null;
  phase: MessagePhase;
  displayedText: string;
  currentMood: YacitaMood;
  isSpeaking: boolean;
  isTyping: boolean;
  isVoiceEnabled: boolean;
  isPeriodicEnabled: boolean;
  coachingLevel: CoachingLevel;
  isMinimized: boolean;
  isPaused: boolean;
  voiceSpeed: number;
  voiceVolume: number;
  selectedVoiceUri: string;
  activeModal: string | null;
  currentTab: string;
  teacherName: string;
  microFeedback: MicroFeedback | null;
  activeFieldGuide: GuiaCampoItem | null;
  activeConsejoIndex: number;
  availableVoices: SpanishVoiceInfo[];
  debugEvents: DebugEventRecord[];
  bubblePlacement: 'bottom' | 'top';
  // When activeModal === 'student_form', dialogue is displayed inside the form panel, so floating bubble is hidden
  isDialogueInModalPanel: boolean;
}

const STORAGE_VOICE_ENABLED_KEY = 'yacita_voice_enabled';
const STORAGE_PERIODIC_ENABLED_KEY = 'yacita_periodic_tips_enabled';
const STORAGE_COACHING_LEVEL_KEY = 'yacita_coaching_level';
const STORAGE_MINIMIZED_KEY = 'yacita_avatar_minimized';
const STORAGE_VOICE_SPEED_KEY = 'yacita_voice_speed';
const STORAGE_VOICE_VOLUME_KEY = 'yacita_voice_volume';
const STORAGE_VOICE_URI_KEY = 'yacita_voice_uri';
const STORAGE_DISMISSED_TIPS_KEY = 'yacita_dismissed_tips';

export class ConversationController {
  private currentSeq = 0;
  private currentMessage: CoachMessage | null = null;
  private phase: MessagePhase = 'inactivo';
  private displayedText = '';
  private currentMood: YacitaMood = 'idle';
  private isSpeaking = false;
  private isTyping = false;
  private isPaused = false;
  private isDialogueInModalPanel = false;
  private bubblePlacement: 'bottom' | 'top' = 'bottom';

  // Preferences
  private isVoiceEnabled = false;
  private isPeriodicEnabled = true;
  private coachingLevel: CoachingLevel = 'completo';
  private isMinimized = false;
  private voiceSpeed = 1.1;
  private voiceVolume = 1.0;
  private selectedVoiceUri = '';

  // Contextual trackers
  private activeModal: string | null = null;
  private currentTab = 'matrix';
  private teacherName = 'Colega';
  private activeFieldGuide: GuiaCampoItem | null = null;
  private activeConsejoIndex = 0;
  private microFeedback: MicroFeedback | null = null;
  private availableVoices: SpanishVoiceInfo[] = [];

  private dismissedTips: string[] = [];
  private debugEvents: DebugEventRecord[] = [];

  // Anti-duplicates tracker
  private lastDispatchedId = '';
  private lastDispatchedOrigin: MessageOrigin | '' = '';
  private lastDispatchedTime = 0;

  // Active timers
  private typewriterTimer: NodeJS.Timeout | null = null;
  private autoCloseTimer: NodeJS.Timeout | null = null;
  private periodicTimer: NodeJS.Timeout | null = null;
  private fieldDebounceTimer: NodeJS.Timeout | null = null;
  private microTimer: NodeJS.Timeout | null = null;
  private wordPacerTimer: NodeJS.Timeout | null = null;

  private lastUserInteractionTime = Date.now();
  private lastPeriodicTipId: string | null = null;
  private lastFocusedElementId: string | null = null;

  // Subscriptions
  private listeners: Set<(state: ConversationState) => void> = new Set();
  private listenersInitialized = false;

  constructor() {
    this.loadInitialPreferences();
    if (typeof window !== 'undefined') {
      this.refreshAvailableVoices();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.addEventListener('voiceschanged', () => {
          this.refreshAvailableVoices();
        });
      }
    }
  }

  private loadInitialPreferences(): void {
    if (typeof window === 'undefined') return;

    try {
      this.isVoiceEnabled = localStorage.getItem(STORAGE_VOICE_ENABLED_KEY) === 'true';
      const storedPeriodic = localStorage.getItem(STORAGE_PERIODIC_ENABLED_KEY);
      this.isPeriodicEnabled = storedPeriodic !== null ? storedPeriodic === 'true' : true;

      const storedLevel = localStorage.getItem(STORAGE_COACHING_LEVEL_KEY);
      if (storedLevel === 'moderado' || storedLevel === 'silencioso' || storedLevel === 'completo') {
        this.coachingLevel = storedLevel;
      } else {
        this.coachingLevel = 'completo';
      }

      this.isMinimized = localStorage.getItem(STORAGE_MINIMIZED_KEY) === 'true';

      const storedSpeed = localStorage.getItem(STORAGE_VOICE_SPEED_KEY);
      if (storedSpeed) this.voiceSpeed = parseFloat(storedSpeed) || 1.1;

      const storedVol = localStorage.getItem(STORAGE_VOICE_VOLUME_KEY);
      if (storedVol) this.voiceVolume = parseFloat(storedVol) || 1.0;

      this.selectedVoiceUri = localStorage.getItem(STORAGE_VOICE_URI_KEY) || '';

      const storedDismissed = localStorage.getItem(STORAGE_DISMISSED_TIPS_KEY);
      if (storedDismissed) {
        this.dismissedTips = JSON.parse(storedDismissed);
      }
    } catch {
      // Fallback to safe defaults
    }
  }

  public refreshAvailableVoices(): void {
    this.availableVoices = getAvailableSpanishVoices();
    this.notify();
  }

  public subscribe(listener: (state: ConversationState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): ConversationState {
    return {
      seq: this.currentSeq,
      currentMessage: this.currentMessage,
      phase: this.phase,
      displayedText: this.displayedText,
      currentMood: this.currentMood,
      isSpeaking: this.isSpeaking,
      isTyping: this.isTyping,
      isVoiceEnabled: this.isVoiceEnabled,
      isPeriodicEnabled: this.isPeriodicEnabled,
      coachingLevel: this.coachingLevel,
      isMinimized: this.isMinimized,
      isPaused: this.isPaused,
      voiceSpeed: this.voiceSpeed,
      voiceVolume: this.voiceVolume,
      selectedVoiceUri: this.selectedVoiceUri,
      activeModal: this.activeModal,
      currentTab: this.currentTab,
      teacherName: this.teacherName,
      microFeedback: this.microFeedback,
      activeFieldGuide: this.activeFieldGuide,
      activeConsejoIndex: this.activeConsejoIndex,
      availableVoices: this.availableVoices,
      debugEvents: this.debugEvents,
      bubblePlacement: this.bubblePlacement,
      isDialogueInModalPanel: this.isDialogueInModalPanel,
    };
  }

  public setBubblePlacement(placement: 'bottom' | 'top'): void {
    if (this.bubblePlacement !== placement) {
      this.bubblePlacement = placement;
      this.notify();
    }
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('[ConversationController] Error in listener', err);
      }
    });
  }

  public setTeacherName(name: string): void {
    if (this.teacherName !== name) {
      this.teacherName = name;
      this.notify();
    }
  }

  public setCurrentTab(tab: string): void {
    if (this.currentTab !== tab) {
      this.currentTab = tab;
      this.notify();
    }
  }

  public setActiveModal(modal: string | null): void {
    this.activeModal = modal;
    this.isDialogueInModalPanel = modal === 'student_form' || modal === 'add_student' || modal === 'edit_student';
    this.notify();
  }

  // ══════════════════════════════════════════════════════════
  // THREE INDEPENDENT PREFERENCE CONTROLS (PARTE 3)
  // ══════════════════════════════════════════════════════════

  // 1. Voice Control (affects ONLY speech)
  public setVoiceEnabled(enabled: boolean): void {
    this.isVoiceEnabled = enabled;
    localStorage.setItem(STORAGE_VOICE_ENABLED_KEY, enabled ? 'true' : 'false');

    if (!enabled) {
      // If voice turned off mid-message, cancel speech immediately but keep text smooth
      stopSpeaking();
      this.isSpeaking = false;
      if (this.currentMessage && this.phase === 'hablando_escribiendo') {
        // Complete current text immediately or continue smooth finish
        this.displayedText = this.currentMessage.texto;
        this.phase = 'completo';
        this.currentMood = this.currentMessage.estadoYacita || 'idle';
      }
    }
    this.notify();
  }

  // 2. Periodic Suggestions Control (affects ONLY 45-90s periodic tips)
  public setPeriodicTipsEnabled(enabled: boolean): void {
    this.isPeriodicEnabled = enabled;
    localStorage.setItem(STORAGE_PERIODIC_ENABLED_KEY, enabled ? 'true' : 'false');

    if (!enabled) {
      // Discard running periodic timer and queued periodic tips immediately
      if (this.periodicTimer) {
        clearTimeout(this.periodicTimer);
        this.periodicTimer = null;
      }
      if (this.currentMessage && this.currentMessage.origen === 'periodico') {
        this.dismissBubble();
      }
    } else {
      this.restartPeriodicTimer();
    }
    this.notify();
  }

  // Dedicated messages for Yacita self-controls (B: Los controles de Yacita no se comentan a sí mismos)
  public onYacitaMenuOpened(): void {
    this.dispatchMessage({
      id: 'yacita_menu_open',
      origen: 'sistema',
      prioridad: 3,
      texto: `Aquí activas mi voz o las sugerencias, ${this.teacherName}.`,
      textoVoz: `Aquí activas mi voz o las sugerencias, ${this.teacherName}.`,
      estadoYacita: 'hablando',
    });
  }

  public onVoiceToggled(enabled: boolean): void {
    this.setVoiceEnabled(enabled);
    if (enabled) {
      this.dispatchMessage({
        id: 'yacita_voice_enabled',
        origen: 'sistema',
        prioridad: 4,
        texto: '¡Listo! Ahora te hablo.',
        textoVoz: 'Listo. Ahora te hablo.',
        estadoYacita: 'celebrando',
      });
    } else {
      // Solo texto cuando se desactiva, sin hablar
      this.dispatchMessage({
        id: 'yacita_voice_disabled',
        origen: 'sistema',
        prioridad: 4,
        texto: 'Voz desactivada.',
        textoVoz: '',
        estadoYacita: 'idle',
      });
    }
  }

  public onPeriodicToggled(enabled: boolean): void {
    this.setPeriodicTipsEnabled(enabled);
    this.dispatchMessage({
      id: enabled ? 'yacita_tips_enabled' : 'yacita_tips_disabled',
      origen: 'sistema',
      prioridad: 3,
      texto: enabled ? 'Sugerencias periódicas activadas.' : 'Sugerencias periódicas desactivadas.',
      textoVoz: '',
      estadoYacita: enabled ? 'pulgar_arriba' : 'idle',
    });
  }

  // 3. Coaching Level (Completo / Moderado / Silencioso)
  public setCoachingLevel(level: CoachingLevel): void {
    this.coachingLevel = level;
    localStorage.setItem(STORAGE_COACHING_LEVEL_KEY, level);
    if (level === 'silencioso') {
      stopSpeaking();
      this.isSpeaking = false;
      this.dismissBubble();
    }
    this.notify();
  }

  public setIsMinimized(minimized: boolean): void {
    this.isMinimized = minimized;
    localStorage.setItem(STORAGE_MINIMIZED_KEY, minimized ? 'true' : 'false');
    this.notify();
  }

  public setIsPaused(paused: boolean): void {
    this.isPaused = paused;
    this.notify();
  }

  public setVoiceSpeed(speed: number): void {
    this.voiceSpeed = speed;
    localStorage.setItem(STORAGE_VOICE_SPEED_KEY, speed.toString());
    this.notify();
  }

  public setVoiceVolume(vol: number): void {
    this.voiceVolume = vol;
    localStorage.setItem(STORAGE_VOICE_VOLUME_KEY, vol.toString());
    this.notify();
  }

  public setSelectedVoiceUri(uri: string): void {
    this.selectedVoiceUri = uri;
    localStorage.setItem(STORAGE_VOICE_URI_KEY, uri);
    this.notify();
  }

  public dismissTipForever(tipId: string): void {
    if (!this.dismissedTips.includes(tipId)) {
      this.dismissedTips.push(tipId);
      localStorage.setItem(STORAGE_DISMISSED_TIPS_KEY, JSON.stringify(this.dismissedTips));
    }
    if (this.currentMessage?.id === tipId) {
      this.dismissBubble();
    }
  }

  // ══════════════════════════════════════════════════════════
  // CORE DISPATCH: UN SOLO CONTROLADOR ("GANA EL ÚLTIMO")
  // ══════════════════════════════════════════════════════════

  public dispatchMessage(params: {
    id: string;
    origen: MessageOrigin;
    prioridad: number;
    texto: string;
    textoVoz?: string;
    estadoYacita: YacitaMood;
    botones?: YacitaActionButton[];
    allowDoNotShowAgain?: boolean;
    contieneDatosPersonales?: boolean;
    fieldGuide?: GuiaCampoItem | null;
  }): boolean {
    const now = Date.now();

    // 1. Anti-duplication check: same id + same origin within 1.5s
    if (
      this.lastDispatchedId === params.id &&
      this.lastDispatchedOrigin === params.origen &&
      now - this.lastDispatchedTime < 1500
    ) {
      console.warn(
        `%c[Yacita Controller]%c Duplicado ignorado (< 1.5s): ${params.id} (${params.origen})`,
        'color: #dc2626; font-weight: bold;',
        'color: #64748b;'
      );
      this.recordDebugEvent({
        seq: this.currentSeq,
        id: params.id,
        origen: params.origen,
        time: new Date().toLocaleTimeString(),
        voice: this.isVoiceEnabled,
        status: 'duplicado_ignorado',
        textSnippet: params.texto.slice(0, 35),
      });
      return false;
    }

    // 2. Coaching Level filters
    if (this.coachingLevel === 'silencioso' && params.prioridad < 4 && !params.id.startsWith('manual_')) {
      return false;
    }
    if (this.coachingLevel === 'moderado' && params.prioridad < 3) {
      return false;
    }
    if (params.origen === 'periodico' && (!this.isPeriodicEnabled || this.dismissedTips.includes(params.id))) {
      return false;
    }

    // 3. Mark last dispatched
    this.lastDispatchedId = params.id;
    this.lastDispatchedOrigin = params.origen;
    this.lastDispatchedTime = now;
    this.lastUserInteractionTime = now;

    // 4. "Gana el último": increment sequence, cancel previous message and active speech
    this.currentSeq++;
    const msgSeq = this.currentSeq;

    this.clearAllActiveTimers();
    stopSpeaking();
    this.isSpeaking = false;
    this.isTyping = false;

    // Mark previous debug record as cancelled if not completed
    if (this.debugEvents.length > 0 && this.debugEvents[0].status === 'completado') {
      // fine
    }

    // Prepare text and voice text
    const cleanSpoken = params.textoVoz || cleanTextForVoice(params.texto);
    const message: CoachMessage = {
      seq: msgSeq,
      id: params.id,
      origen: params.origen,
      prioridad: params.prioridad,
      texto: params.texto,
      textoVoz: cleanSpoken,
      estadoYacita: params.estadoYacita,
      botones: params.botones,
      allowDoNotShowAgain: params.allowDoNotShowAgain,
      contieneDatosPersonales: params.contieneDatosPersonales,
      fieldGuide: params.fieldGuide || null,
    };

    this.currentMessage = message;
    if (params.fieldGuide) {
      this.activeFieldGuide = params.fieldGuide;
    }

    this.phase = 'preparando';
    this.displayedText = '';
    this.currentMood = 'hablando';

    this.recordDebugEvent({
      seq: msgSeq,
      id: params.id,
      origen: params.origen,
      time: new Date().toLocaleTimeString(),
      voice: this.isVoiceEnabled,
      status: 'completado',
      textSnippet: params.texto.slice(0, 35),
    });

    this.notify();

    // Coordinate delivery: Voice-led vs Typing-led
    if (this.isVoiceEnabled && this.coachingLevel !== 'silencioso') {
      this.executeVoiceLedMessage(message, msgSeq);
    } else {
      this.executeTypingLedMessage(message, msgSeq);
    }

    return true;
  }

  // ══════════════════════════════════════════════════════════
  // PARTE 2: EL TEXTO SIGUE A LA VOZ (Voice-led coordination)
  // ══════════════════════════════════════════════════════════

  private executeVoiceLedMessage(message: CoachMessage, msgSeq: number): void {
    this.phase = 'hablando_escribiendo';
    this.isSpeaking = true;
    this.currentMood = 'hablando';
    this.displayedText = '';

    const fullVisual = message.texto;
    const words = fullVisual.split(/(\s+)/);
    let revealedCharCount = 0;
    const startTime = Date.now();

    // Fallback word pacer in case boundary events are not emitted by network/OS voices
    let wordIndex = 0;
    const totalWords = words.length;
    // Estimate speech duration: ~16 characters per second scaled by speed
    const charsPerSec = 16 * this.voiceSpeed;
    const estimatedTotalMs = Math.max(1500, (fullVisual.length / charsPerSec) * 1000);
    const msPerWord = estimatedTotalMs / Math.max(1, totalWords);

    this.wordPacerTimer = setInterval(() => {
      if (this.currentSeq !== msgSeq) return;
      if (wordIndex < totalWords) {
        wordIndex += 2; // word + space
        const partial = words.slice(0, wordIndex).join('');
        if (partial.length > this.displayedText.length) {
          this.displayedText = partial;
          this.notify();
        }
      }
    }, Math.max(40, msPerWord));

    speakYacita(message.textoVoz, {
      voiceUri: this.selectedVoiceUri,
      rate: this.voiceSpeed,
      volume: this.voiceVolume,
      containsPersonalData: message.contieneDatosPersonales,
      onStart: () => {
        if (this.currentSeq !== msgSeq) return;
        this.isSpeaking = true;
        this.currentMood = 'hablando';
        this.notify();
      },
      onBoundary: (charIndex: number, charLength: number = 0) => {
        if (this.currentSeq !== msgSeq) return;
        // Map spoken boundary to visual text length
        const targetLen = Math.min(fullVisual.length, charIndex + (charLength || 4));
        if (targetLen > revealedCharCount) {
          revealedCharCount = targetLen;
          this.displayedText = fullVisual.slice(0, revealedCharCount);
          this.notify();
        }
      },
      onMouthToggle: (open) => {
        if (this.currentSeq !== msgSeq) return;
        this.currentMood = open ? 'hablando' : (message.estadoYacita || 'idle');
        this.notify();
      },
      onEnd: () => {
        if (this.currentSeq !== msgSeq) return;
        if (this.wordPacerTimer) clearInterval(this.wordPacerTimer);

        // 100% full text on finish
        this.displayedText = fullVisual;
        this.isSpeaking = false;
        this.phase = 'completo';
        this.currentMood = message.estadoYacita || 'idle';
        this.notify();

        const speechDuration = Date.now() - startTime;
        this.startAutoClose(msgSeq, speechDuration);
      },
      onError: () => {
        if (this.currentSeq !== msgSeq) return;
        if (this.wordPacerTimer) clearInterval(this.wordPacerTimer);

        this.displayedText = fullVisual;
        this.isSpeaking = false;
        this.phase = 'completo';
        this.currentMood = message.estadoYacita || 'idle';
        this.notify();
        this.startAutoClose(msgSeq, 2000);
      },
    });
  }

  // ══════════════════════════════════════════════════════════
  // PARTE 2: TYPING EFFECT WHEN VOICE IS DISABLED
  // ══════════════════════════════════════════════════════════

  private executeTypingLedMessage(message: CoachMessage, msgSeq: number): void {
    this.phase = 'hablando_escribiendo';
    this.isTyping = true;
    this.currentMood = 'hablando';
    this.displayedText = '';

    const fullVisual = message.texto;
    let charIdx = 0;
    // ~50-60 chars per second: 18ms per character
    const charInterval = 18;

    this.typewriterTimer = setInterval(() => {
      if (this.currentSeq !== msgSeq) {
        if (this.typewriterTimer) clearInterval(this.typewriterTimer);
        return;
      }

      charIdx++;
      if (charIdx <= fullVisual.length) {
        this.displayedText = fullVisual.slice(0, charIdx);
        this.notify();
      } else {
        if (this.typewriterTimer) clearInterval(this.typewriterTimer);
        this.isTyping = false;
        this.phase = 'completo';
        this.currentMood = message.estadoYacita || 'idle';
        this.notify();

        // Start auto-close after typing finishes (min 6s)
        this.startAutoClose(msgSeq, 0);
      }
    }, charInterval);
  }

  // ══════════════════════════════════════════════════════════
  // AUTO-CLOSE & INTERACTION HELPERS
  // ══════════════════════════════════════════════════════════

  private startAutoClose(msgSeq: number, voiceDurationMs: number): void {
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);

    // Auto-cierre: 5 s sin voz; con voz, duración de la voz + 2 s
    const closeDelay = voiceDurationMs > 0 ? Math.max(5000, voiceDurationMs + 2000) : 5000;

    const checkAndClose = () => {
      this.autoCloseTimer = setTimeout(() => {
        if (this.currentSeq !== msgSeq) return;
        if (this.isPaused) {
          // If hovered, recheck in 1s
          checkAndClose();
          return;
        }
        this.dismissBubble();
      }, closeDelay);
    };

    checkAndClose();
  }

  // User clicked the bubble: reveal all text instantly and skip voice
  public skipVoiceAndComplete(): void {
    if (!this.currentMessage) return;
    const msgSeq = this.currentSeq;

    stopSpeaking();
    this.isSpeaking = false;
    this.isTyping = false;
    if (this.wordPacerTimer) clearInterval(this.wordPacerTimer);
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);

    this.displayedText = this.currentMessage.texto;
    this.phase = 'completo';
    this.currentMood = this.currentMessage.estadoYacita || 'idle';
    this.notify();

    this.startAutoClose(msgSeq, 2000);
  }

  public dismissBubble(): void {
    this.clearAllActiveTimers();
    stopSpeaking();
    this.isSpeaking = false;
    this.isTyping = false;
    this.currentMessage = null;
    this.displayedText = '';
    this.phase = 'inactivo';
    this.currentMood = 'idle';
    this.notify();
  }

  public triggerMicroFeedback(text: string, mood: YacitaMood = 'celebrando'): void {
    if (this.microTimer) clearTimeout(this.microTimer);
    this.microFeedback = { text, mood, id: Date.now() };
    this.currentMood = mood;
    this.notify();

    this.microTimer = setTimeout(() => {
      this.microFeedback = null;
      this.currentMood = this.currentMessage ? this.currentMessage.estadoYacita : 'idle';
      this.notify();
    }, 2200);
  }

  private clearAllActiveTimers(): void {
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);
    if (this.wordPacerTimer) clearInterval(this.wordPacerTimer);
    if (this.autoCloseTimer) clearTimeout(this.autoCloseTimer);
    if (this.fieldDebounceTimer) clearTimeout(this.fieldDebounceTimer);
    this.typewriterTimer = null;
    this.wordPacerTimer = null;
    this.autoCloseTimer = null;
    this.fieldDebounceTimer = null;
  }

  private recordDebugEvent(event: DebugEventRecord): void {
    this.debugEvents.unshift(event);
    if (this.debugEvents.length > 50) {
      this.debugEvents.pop();
    }
  }

  // ══════════════════════════════════════════════════════════
  // GLOBAL DELEGATED LISTENER (focusin, click, change)
  // ══════════════════════════════════════════════════════════

  public initGlobalListeners(): () => void {
    if (typeof document === 'undefined' || this.listenersInitialized) {
      return () => {};
    }
    this.listenersInitialized = true;

    const handleEvent = (event: Event) => {
      if (document.hidden) return;
      if (this.coachingLevel === 'silencioso') return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Ignore elements explicitly marked to ignore or within Yacita's avatar UI
      if (target.closest('[data-yacita-ignore]') || target.closest('[data-yacita-avatar-area]')) {
        return;
      }

      // If clicking inside the active dialogue bubble, skip voice and complete text
      if (target.closest('[data-yacita-bubble]')) {
        if (event.type === 'click' && (this.isSpeaking || this.isTyping)) {
          this.skipVoiceAndComplete();
        }
        return;
      }

      // Resolve closest interactive target
      const interactiveEl = target.closest(
        'button, a, [role="tab"], [role="button"], input, select, textarea, [data-yacita], tr[data-student-id], div[data-student-id]'
      ) as HTMLElement | null;

      if (!interactiveEl) return;

      // Filter click on text inputs/textareas to prevent double firing with focusin
      const isTextInput = interactiveEl.tagName === 'INPUT' || interactiveEl.tagName === 'TEXTAREA';
      if (isTextInput && event.type === 'click') {
        return;
      }

      // Collision detection: check if tapped element overlaps with bottom-right Yacita widget area
      if (typeof window !== 'undefined') {
        const rect = interactiveEl.getBoundingClientRect();
        const isBottomRightZone = rect.bottom > window.innerHeight - 280 && rect.right > window.innerWidth - 340;
        this.bubblePlacement = isBottomRightZone ? 'top' : 'bottom';
      }

      // If a modal is open, only respond to elements inside the modal
      if (this.activeModal !== null) {
        const isInModal = interactiveEl.closest('[role="dialog"]') || interactiveEl.closest('.fixed');
        if (!isInModal) return;
      }

      const yacitaId = interactiveEl.getAttribute('data-yacita');

      // Check repetitive matrix actions for micro-feedback
      const isRepetitiveScore =
        yacitaId === 'matrix_score_3' ||
        yacitaId === 'matrix_score_2' ||
        yacitaId === 'matrix_score_1';

      if (isRepetitiveScore) {
        const stars =
          yacitaId === 'matrix_score_3'
            ? '3★ Logrado'
            : yacitaId === 'matrix_score_2'
            ? '2★ En Proceso'
            : '1★ Requiere Apoyo';
        const mood: YacitaMood =
          yacitaId === 'matrix_score_3'
            ? 'celebrando'
            : yacitaId === 'matrix_score_1'
            ? 'empatica'
            : 'apuntando_notas';
        this.triggerMicroFeedback(`¡Anotado! ${stars}`, mood);
        return;
      }

      // Extract variables
      let vars: Record<string, string> = { nombre: this.teacherName };
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

      // Resolve field guide or fallback message
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

      // Field focus debounce (~400ms) for fast Tab navigation
      if (this.fieldDebounceTimer) {
        clearTimeout(this.fieldDebounceTimer);
      }

      const elementKey = yacitaId || interactiveEl.id || interactiveEl.getAttribute('name') || guia.id;
      const isSameElement = this.lastFocusedElementId === elementKey;
      this.lastFocusedElementId = elementKey;

      this.fieldDebounceTimer = setTimeout(() => {
        if (!guia) return;

        this.activeFieldGuide = guia;

        if (isSameElement && guia.consejos.length > 1) {
          this.activeConsejoIndex = (this.activeConsejoIndex + 1) % guia.consejos.length;
        } else {
          this.activeConsejoIndex = 0;
        }

        let mood: YacitaMood = 'apuntando_notas';
        if (yacitaId?.includes('score_3') || yacitaId?.includes('save') || yacitaId?.includes('mark_all')) {
          mood = 'celebrando';
        } else if (yacitaId?.includes('score_1') || yacitaId?.includes('delete')) {
          mood = 'empatica';
        } else if (yacitaId?.includes('tdr') || yacitaId?.includes('report')) {
          mood = 'pulgar_arriba';
        }

        this.dispatchMessage({
          id: `field_${guia.id}`,
          origen: yacitaId?.startsWith('field_') ? 'formulario' : 'interaccion',
          prioridad: yacitaId?.startsWith('field_') ? 4 : 2,
          texto: guia.burbujaCorta,
          textoVoz: guia.textoVoz || cleanTextForVoice(guia.burbujaCorta),
          estadoYacita: mood,
          fieldGuide: guia,
          contieneDatosPersonales: guia.contieneDatosPersonales,
        });
      }, 400);
    };

    document.addEventListener('focusin', handleEvent, { passive: true });
    document.addEventListener('click', handleEvent, { passive: true });
    document.addEventListener('change', handleEvent, { passive: true });

    return () => {
      document.removeEventListener('focusin', handleEvent);
      document.removeEventListener('click', handleEvent);
      document.removeEventListener('change', handleEvent);
      this.listenersInitialized = false;
      if (this.fieldDebounceTimer) clearTimeout(this.fieldDebounceTimer);
    };
  }

  // ══════════════════════════════════════════════════════════
  // ROTATE CONSEJO ("Ver otro consejo")
  // ══════════════════════════════════════════════════════════

  public rotateConsejo(fieldId?: string): void {
    const targetId = fieldId || this.activeFieldGuide?.id;
    if (!targetId) return;

    const guia = getGuiaCampo(targetId, { nombre: this.teacherName });
    if (!guia || guia.consejos.length === 0) return;

    this.activeConsejoIndex = (this.activeConsejoIndex + 1) % guia.consejos.length;
    const chosenConsejo = guia.consejos[this.activeConsejoIndex];

    this.dispatchMessage({
      id: `consejo_${targetId}_${this.activeConsejoIndex}`,
      origen: 'formulario',
      prioridad: 4,
      texto: chosenConsejo,
      textoVoz: cleanTextForVoice(chosenConsejo),
      estadoYacita: 'apuntando_notas',
      fieldGuide: guia,
      contieneDatosPersonales: guia.contieneDatosPersonales,
    });
  }

  // ══════════════════════════════════════════════════════════
  // PERIODIC TIPS RUNNER (45-90s)
  // ══════════════════════════════════════════════════════════

  public restartPeriodicTimer(): void {
    if (this.periodicTimer) clearTimeout(this.periodicTimer);
    if (!this.isPeriodicEnabled || this.coachingLevel === 'silencioso') return;

    const scheduleNext = () => {
      const delay = Math.floor(Math.random() * (90000 - 45000 + 1)) + 45000;

      this.periodicTimer = setTimeout(() => {
        // ALWAYS read from this instance - NO stale closures!
        const isHidden = typeof document !== 'undefined' && document.hidden;
        const isModalOpen = this.activeModal !== null;
        const recentlyActive = Date.now() - this.lastUserInteractionTime < 4000;

        if (this.isPeriodicEnabled && !isHidden && !isModalOpen && !recentlyActive) {
          const tips = PERIODIC_TIPS_BY_TAB[this.currentTab] || [];
          const available = tips.filter(
            (t) => !this.dismissedTips.includes(t.id) && t.id !== this.lastPeriodicTipId
          );

          if (available.length > 0) {
            const chosen = available[Math.floor(Math.random() * available.length)];
            this.lastPeriodicTipId = chosen.id;
            const formatted = formatYacitaText(chosen.texto, { nombre: this.teacherName });

            this.dispatchMessage({
              id: chosen.id,
              origen: 'periodico',
              prioridad: 1,
              texto: formatted,
              textoVoz: cleanTextForVoice(formatted),
              estadoYacita: chosen.estado,
              botones: chosen.botones,
              allowDoNotShowAgain: true,
            });
          }
        }

        if (this.isPeriodicEnabled) {
          scheduleNext();
        }
      }, delay);
    };

    scheduleNext();
  }

  // Clean shutdown
  public destroy(): void {
    this.clearAllActiveTimers();
    if (this.periodicTimer) clearTimeout(this.periodicTimer);
    if (this.microTimer) clearTimeout(this.microTimer);
    stopSpeaking();
    this.listeners.clear();
  }
}

// Global Singleton Export
export const conversationController = new ConversationController();
