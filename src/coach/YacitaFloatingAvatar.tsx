import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  HelpCircle,
  Minimize2,
  EyeOff,
  MessageSquare,
  Sparkles,
  Settings2,
  Lightbulb,
  Bug,
  Play,
  Check,
  FastForward,
} from 'lucide-react';
import { useYacitaCoach } from './YacitaCoachContext';
import { chatWithYacita } from '../utils/yacitaAI';
import { CoachingLevel } from '../config/yacitaMensajes';
import { Sheet } from '../components/Sheet';

// Institutional PNG expressions for Yacita - Strict Anti-SVG rule
import yacitaIdle from '../assets/idle.png';
import yacitaSaludo from '../assets/saludo.png';
import yacitaHablando from '../assets/hablando.png';
import yacitaPensando from '../assets/pensando.png';
import yacitaCelebrando from '../assets/celebrando.png';
import yacitaEmpatica from '../assets/empatica.png';
import yacitaApuntando from '../assets/apuntando_notas.png';
import yacitaPulgar from '../assets/pulgar_arriba.png';
import yacitaSenalando from '../assets/senalando.png';

const YACITA_IMAGE_MAP: Record<string, string> = {
  idle: yacitaIdle,
  hablando: yacitaHablando,
  empatica: yacitaEmpatica,
  celebrando: yacitaCelebrando,
  senalando: yacitaSenalando,
  pulgar_arriba: yacitaPulgar,
  apuntando_notas: yacitaApuntando,
  pensando: yacitaPensando,
  saludo: yacitaSaludo,
};

interface ChatMessage {
  id: string;
  sender: 'user' | 'yacita';
  text: string;
  timestamp: string;
}

const QUICK_QUESTIONS = [
  '¿Cómo calmar una rabieta o llanto en el aula?',
  'Sugerencias para niños con hiperactividad o fatiga motriz',
  '¿Cómo registrar un incidente sin culpabilizar al alumno?',
  '¿Cómo exportar las actas y TDR a Word y Google Drive?',
];

export const YacitaFloatingAvatar: React.FC = () => {
  const {
    teacherName,
    coachingLevel,
    setCoachingLevel,
    isVoiceEnabled,
    isPeriodicEnabled,
    currentBubble,
    currentMood,
    microFeedback,
    displayedText,
    isSpeaking,
    isTyping,
    isMinimized,
    setIsMinimized,
    setIsPaused,
    dismissBubble,
    skipVoiceAndComplete,
    reopenTabHelp,
    dismissTipForever,
    isDialogueInModalPanel,
    bubblePlacement,
    onYacitaMenuOpened,
    onVoiceToggled,
    onPeriodicToggled,
    voiceSpeed,
    setVoiceSpeed,
    testVoice,
    isDebugMode,
    debugStats,
    debugEvents,
    simulateInteraction,
    simulatePeriodicTip,
  } = useYacitaCoach();

  // Mini-menu open state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Settings sheet open state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Detect whether any Sheet is open in DOM to adjust avatar size & position
  const [hasOpenSheet, setHasOpenSheet] = useState(false);
  const [hasFullScreenSheet, setHasFullScreenSheet] = useState(false);

  // Respect system prefers-reduced-motion (sin typewriter ni flotado)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  useEffect(() => {
    const checkSheets = () => {
      if (typeof document === 'undefined') return;
      const openSheet = document.querySelector('[data-sheet-open="true"]');
      setHasOpenSheet(!!openSheet);
      const fullScreenSheet = document.querySelector('[data-sheet-fullscreen="true"]');
      setHasFullScreenSheet(!!fullScreenSheet);
    };

    checkSheets();
    const observer = new MutationObserver(checkSheets);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => observer.disconnect();
  }, []);

  // Auto-close mini-menu after 4s of inactivity
  useEffect(() => {
    if (isMenuOpen) {
      if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
      menuTimerRef.current = setTimeout(() => {
        setIsMenuOpen(false);
      }, 4000);
    }
    return () => {
      if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
    };
  }, [isMenuOpen]);

  // Toast confirmation feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const handleAvatarClick = () => {
    if (currentBubble) {
      dismissBubble();
      return;
    }
    const nextMenu = !isMenuOpen;
    setIsMenuOpen(nextMenu);
    if (nextMenu) {
      onYacitaMenuOpened();
    }
  };

  const handleToggleVoiceAction = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = !isVoiceEnabled;
    onVoiceToggled(next);
    showToast(next ? 'Voz activada 🔊' : 'Voz desactivada 🔇');
  };

  const handleTogglePeriodicAction = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = !isPeriodicEnabled;
    onPeriodicToggled(next);
    showToast(next ? 'Sugerencias periódicas activadas 💡' : 'Sugerencias periódicas pausadas ⏸️');
  };

  // AI Chat modal state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'yacita',
      text: `¡Hola, profe ${teacherName}! Soy Yacita, tu compañera para el seguimiento conductual y la convivencia formativa en la I.E. Denzil Escolar. ¿En qué te puedo orientar hoy? 😊`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Debug drawer state
  const [isDebugDrawerOpen, setIsDebugDrawerOpen] = useState(false);

  useEffect(() => {
    if (isChatOpen) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const q = (textToSend || inputQuery).trim();
    if (!q || isAiLoading) return;

    const userMsg: ChatMessage = {
      id: 'u-' + Date.now(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsAiLoading(true);

    try {
      const history = chatMessages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        text: m.text,
      }));

      const reply = await chatWithYacita(q, history);

      const yacitaMsg: ChatMessage = {
        id: 'y-' + Date.now(),
        sender: 'yacita',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, yacitaMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        sender: 'yacita',
        text: 'Profe, recuerda que ante desregulaciones, la calma, la respiración profunda y el diálogo en privado son la mejor herramienta pedagógica formativa. 💛',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const activeImage = YACITA_IMAGE_MAP[currentMood] || yacitaIdle;

  // Decide if the floating bubble should be shown
  const shouldShowFloatingBubble =
    currentBubble &&
    !isChatOpen &&
    !isDialogueInModalPanel &&
    coachingLevel !== 'silencioso';

  // MINIMIZED STATE: circular compact avatar with authentic PNG image
  if (isMinimized) {
    return (
      <div
        data-yacita-ignore="true"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+14px)] sm:bottom-4 right-3 sm:right-4 z-[9990] no-print flex flex-col items-end gap-2"
      >
        {/* Floating bubble even when minimized unless coaching level is silencioso */}
        {shouldShowFloatingBubble && (
          <div
            data-yacita-bubble="true"
            onClick={skipVoiceAndComplete}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            onTouchCancel={() => setIsPaused(false)}
            onPointerEnter={() => setIsPaused(true)}
            onPointerLeave={() => setIsPaused(false)}
            className="mb-2 w-[min(calc(100vw-24px),290px)] sm:w-[290px] max-w-[290px] bg-white dark:bg-[#111c3d] text-slate-800 dark:text-slate-100 rounded-2xl p-3 border-2 border-amber-400 dark:border-amber-500 shadow-2xl animate-in zoom-in-95 duration-150 motion-reduce:animate-none cursor-pointer text-xs"
            role="region"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-1 pb-1 mb-1 border-b border-amber-100 dark:border-slate-800">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                YACITA
              </span>
              <div className="flex items-center gap-1">
                {(isSpeaking || isTyping) && (
                  <button
                    type="button"
                    data-yacita-ignore="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      skipVoiceAndComplete();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 text-amber-800 dark:text-amber-300 text-xs font-bold transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-500"
                    title="Saltar animación y ver texto completo"
                    aria-label="Saltar animación y ver texto completo"
                  >
                    <FastForward className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Saltar</span>
                  </button>
                )}
                <button
                  type="button"
                  data-yacita-ignore="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissBubble();
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Cerrar mensaje"
                  aria-label="Cerrar mensaje"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="leading-snug font-medium break-words text-xs max-h-[140px] overflow-y-auto no-scrollbar">
              {displayedText}
              {(isSpeaking || isTyping) && !prefersReducedMotion && (
                <span className="inline-block w-1.5 h-3 ml-0.5 bg-amber-500 animate-pulse align-middle" />
              )}
            </p>
          </div>
        )}

        <button
          onClick={() => setIsMinimized(false)}
          className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-[#131f42] p-1 shadow-2xl border-2 border-amber-500 ${
            prefersReducedMotion ? '' : 'hover:scale-105 active:scale-95 transition-transform'
          } motion-reduce:transform-none motion-reduce:transition-none flex items-center justify-center cursor-pointer group`}
          title="Expandir a Yacita (Acompañante Pedagógico)"
          aria-label="Expandir a Yacita"
        >
          <img
            src={yacitaIdle}
            alt="Yacita Minimizado"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain rounded-full aspect-square"
          />
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        data-yacita-ignore="true"
        className="fixed inset-0 pointer-events-none z-[9990] no-print"
      >
        {/* Toast confirmation feedback for voice / periodic switches */}
        {toastMessage && (
          <div className="pointer-events-auto fixed top-18 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-900/95 text-white text-xs font-semibold shadow-2xl border border-amber-500/60 animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none z-[10000]">
            {toastMessage}
          </div>
        )}

        {/* DIALOGUE BUBBLE: COMPACT CORNER TOAST WITH STRICT MAX WIDTH & ESCAPE/COLLISION */}
        {shouldShowFloatingBubble && !hasFullScreenSheet && (
          <div
            data-yacita-bubble="true"
            onClick={skipVoiceAndComplete}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            onTouchCancel={() => setIsPaused(false)}
            onPointerEnter={() => setIsPaused(true)}
            onPointerLeave={() => setIsPaused(false)}
            className={`pointer-events-auto fixed ${
              bubblePlacement === 'top'
                ? 'top-16 sm:top-20 right-3 sm:right-4'
                : hasOpenSheet
                ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+60px)] right-3 w-[min(calc(100vw-24px),280px)]'
                : 'bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] sm:bottom-[76px] landscape:bottom-[58px] right-3 sm:right-4'
            } w-[min(calc(100vw-24px),290px)] sm:w-[290px] max-w-[290px] bg-white dark:bg-[#111c3d] text-slate-800 dark:text-slate-100 rounded-2xl p-3 sm:p-3.5 border-2 border-amber-400 dark:border-amber-500 shadow-2xl animate-in zoom-in-95 fade-in duration-200 motion-reduce:animate-none cursor-pointer z-[9995]`}
            role="region"
            aria-live="polite"
            title="Toca para completar el texto y la voz de inmediato"
          >
            {/* Header: Clean YACITA label + equalizer + skip button + close button */}
            <div className="flex items-center justify-between gap-1 pb-1.5 mb-1.5 border-b border-amber-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  YACITA
                </span>

                {/* Equalizer sound bars while speaking */}
                {isSpeaking && (
                  <div className="flex items-end gap-0.5 h-3.5 px-1">
                    <span className={`w-1 bg-emerald-500 rounded-full ${prefersReducedMotion ? 'h-2' : 'eq-bar-1'}`} />
                    <span className={`w-1 bg-emerald-500 rounded-full ${prefersReducedMotion ? 'h-3' : 'eq-bar-2'}`} />
                    <span className={`w-1 bg-emerald-500 rounded-full ${prefersReducedMotion ? 'h-2.5' : 'eq-bar-3'}`} />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Botón explícito para saltar animación y ver texto completo */}
                {(isSpeaking || isTyping) && (
                  <button
                    type="button"
                    data-yacita-ignore="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      skipVoiceAndComplete();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 text-xs font-bold transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-500"
                    title="Saltar animación y ver texto completo"
                    aria-label="Saltar animación y ver texto completo"
                  >
                    <FastForward className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Saltar</span>
                  </button>
                )}

                <button
                  type="button"
                  data-yacita-ignore="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissBubble();
                  }}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-500"
                  title="Cerrar burbuja"
                  aria-label="Cerrar mensaje"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Text (break-words, nunca cortado con 'Aquí▌' ni line-clamp) */}
            <p className="text-[13px] sm:text-sm leading-snug font-medium text-slate-700 dark:text-slate-200 break-words max-h-[160px] overflow-y-auto no-scrollbar">
              {displayedText}
              {(isSpeaking || isTyping) && !prefersReducedMotion && (
                <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-amber-500 animate-pulse align-middle" />
              )}
            </p>

            {/* Action buttons if available */}
            {currentBubble.botones && currentBubble.botones.length > 0 && !isSpeaking && !isTyping && (
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                {currentBubble.botones.map((btn) => (
                  <button
                    key={btn.actionId}
                    data-yacita-ignore="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      btn.onClick?.();
                      dismissBubble();
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors shadow-2xs min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      btn.variant === 'secondary'
                        ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}

            {/* Do not show again button for periodic tips */}
            {currentBubble.allowDoNotShowAgain && !isSpeaking && !isTyping && (
              <div className="mt-1.5 pt-1 flex justify-end">
                <button
                  data-yacita-ignore="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissTipForever(currentBubble.id);
                  }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 dark:text-slate-300 dark:hover:text-red-400 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>No volver a mostrar</span>
                </button>
              </div>
            )}

            {/* Speech tail pointing to Yacita */}
            {bubblePlacement === 'bottom' && (
              <div
                className="absolute -bottom-2 right-6 w-3.5 h-3.5 bg-white dark:bg-[#111c3d] border-r-2 border-b-2 border-amber-400 dark:border-amber-500 transform rotate-45"
                aria-hidden="true"
              />
            )}
          </div>
        )}

        {/* MICRO-FEEDBACK BADGE */}
        {microFeedback && !currentBubble && !isChatOpen && (
          <div
            className="pointer-events-auto fixed bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] sm:bottom-[76px] landscape:bottom-[58px] right-3 sm:right-4 px-3 py-1.5 rounded-full bg-slate-900/90 text-amber-300 border border-amber-400/60 shadow-lg text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-150 motion-reduce:animate-none flex items-center gap-1.5 z-[9994]"
            role="status"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${prefersReducedMotion ? '' : 'animate-spin'}`} />
            <span>{microFeedback.text}</span>
          </div>
        )}

        {/* MINI-MENU (PARTE 4.C: 3 ACCIONES RÁPIDAS EN FILA HORIZONTAL + AJUSTES) */}
        {isMenuOpen && (
          <div
            data-yacita-ignore="true"
            className="pointer-events-auto fixed bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] sm:bottom-[76px] landscape:bottom-[58px] right-3 sm:right-4 bg-white/95 dark:bg-[#0f1938]/95 backdrop-blur-md rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 shadow-2xl animate-in zoom-in-95 fade-in duration-150 motion-reduce:animate-none z-[9994] flex items-center gap-1 max-h-[56px]"
          >
            {/* Quick 1: Voice Toggle */}
            <button
              onClick={handleToggleVoiceAction}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-colors min-h-[44px] ${
                isVoiceEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isVoiceEnabled ? 'Voz activada' : 'Voz desactivada'}
            >
              {isVoiceEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              <span>Voz</span>
            </button>

            {/* Quick 2: Periodic Tips Toggle */}
            <button
              onClick={handleTogglePeriodicAction}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-colors min-h-[44px] ${
                isPeriodicEnabled
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isPeriodicEnabled ? 'Sugerencias activadas' : 'Sugerencias pausadas'}
            >
              <Lightbulb className={`w-4 h-4 ${isPeriodicEnabled ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Sugerencias</span>
            </button>

            {/* Quick 3: Help Screen */}
            <button
              onClick={() => {
                reopenTabHelp();
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors min-h-[44px]"
              title="Ayuda de la pantalla actual"
            >
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Ayuda</span>
            </button>

            {/* Quick 4: Open Full Settings Sheet */}
            <button
              onClick={() => {
                setIsSettingsOpen(true);
                setIsMenuOpen(false);
              }}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center border-l border-slate-200 dark:border-slate-800"
              title="Ajustes de acompañamiento"
              aria-label="Abrir ajustes"
            >
              <Settings2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </button>
          </div>
        )}

        {/* YACITA AVATAR BUTTON (Compact footprint: 56px mobile portrait, 48px landscape, 60px desktop) */}
        {/* En móvil sobre bottom-nav sin tapar tarjetas; en escritorio pegado a la esquina sin cubrir columnas 4 y Acción */}
        <div
          data-yacita-avatar-area="true"
          className={`pointer-events-auto fixed ${
            hasFullScreenSheet
              ? 'hidden'
              : hasOpenSheet
              ? 'bottom-[calc(env(safe-area-inset-bottom,0px)+12px)] right-3'
              : 'bottom-[calc(env(safe-area-inset-bottom,0px)+14px)] sm:bottom-4 landscape:bottom-2.5 right-3 sm:right-4'
          } flex items-end z-[9990]`}
        >
          <button
            onClick={handleAvatarClick}
            className={`relative ${
              hasOpenSheet
                ? 'w-12 h-12'
                : 'w-14 h-14 landscape:w-12 landscape:h-12 sm:w-15 sm:h-15'
            } shrink-0 ${
              prefersReducedMotion ? '' : 'hover:scale-105 active:scale-95 transition-all duration-200'
            } cursor-pointer focus:outline-hidden group motion-reduce:transform-none motion-reduce:transition-none`}
            title="Yacita: Acompañante Pedagógico (toca para ver opciones)"
            aria-label="Yacita Acompañante Pedagógico"
          >
            {/* Subtle glow circle (sin flotado) */}
            <div className={`absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400/20 via-blue-500/10 to-emerald-400/20 ${
              prefersReducedMotion ? '' : 'blur-md group-hover:blur-lg transition-all'
            }`} />

            {/* Authentic Institutional PNG Expression - STRICTLY NO SVG */}
            <img
              src={activeImage}
              alt="Yacita Acompañante"
              className="w-full h-full object-contain aspect-square relative z-10 transition-opacity duration-300"
              loading="lazy"
              decoding="async"
            />

            {/* Speaking/Typing active indicator dot */}
            {(isSpeaking || isTyping) && (
              <span className="absolute bottom-1 right-1.5 z-20 flex h-3 w-3">
                {!prefersReducedMotion && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 motion-reduce:hidden" />
                )}
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-white dark:border-slate-900" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* FULL SETTINGS BOTTOM SHEET / MODAL (PARTE 4.C) */}
      <Sheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        sheetId="yacita_settings"
        size="sm"
        title="Ajustes de Yacita"
        subtitle="Acompañante pedagógico y voz"
        icon={<Settings2 className="w-5 h-5 text-amber-500" />}
        footer={
          <div className="flex items-center justify-end w-full">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 min-h-[44px] min-w-[88px] active:scale-95 transition-colors"
            >
              Listo
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* 1. Voice Setting */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="space-y-0.5">
              <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-emerald-600" />
                Voz de Yacita
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 block">
                {isVoiceEnabled ? 'Activada (te lee los mensajes)' : 'Desactivada (solo lectura visual)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleToggleVoiceAction()}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-colors min-h-[44px] active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                isVoiceEnabled
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {isVoiceEnabled ? 'Activada' : 'Desactivada'}
            </button>
          </div>

          {/* 2. Periodic Tips Setting */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="space-y-0.5">
              <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                Sugerencias Periódicas
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 block">
                {isPeriodicEnabled ? 'Activadas (consejos cada 45–90 s)' : 'Desactivadas (solo interactivos)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleTogglePeriodicAction()}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-colors min-h-[44px] active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-500 ${
                isPeriodicEnabled
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {isPeriodicEnabled ? 'Activadas' : 'Desactivadas'}
            </button>
          </div>

          {/* 3. Coaching Level Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Nivel de Acompañamiento:
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              {(['completo', 'moderado', 'silencioso'] as CoachingLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setCoachingLevel(lvl)}
                  className={`py-2 text-xs font-bold rounded-lg capitalize transition-colors min-h-[44px] flex items-center justify-center gap-1 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    coachingLevel === lvl
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800'
                  }`}
                >
                  {coachingLevel === lvl && <Check className="w-3 h-3" />}
                  <span>{lvl}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 px-1 leading-tight">
              {coachingLevel === 'completo' && 'Completo: orienta en cada clic, botón, filtro y campo.'}
              {coachingLevel === 'moderado' && 'Moderado: orienta solo al cambiar de pestaña o guardar.'}
              {coachingLevel === 'silencioso' && 'Silencioso: no muestra burbujas salvo que la consultes.'}
            </p>
          </div>

          {/* 4. Voice Speed Selector */}
          {isVoiceEnabled && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Velocidad de Voz:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[1.0, 1.15, 1.3].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setVoiceSpeed(spd)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-colors min-h-[44px] active:scale-95 ${
                      Math.abs(voiceSpeed - spd) < 0.05
                        ? 'bg-blue-600 text-white border-blue-700'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {spd === 1.0 ? 'Normal (1.0x)' : spd === 1.15 ? 'Ágil (1.15x)' : 'Rápida (1.3x)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Test Voice & Pedagogical Chat */}
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={testVoice}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold min-h-[44px] active:scale-95"
            >
              <Play className="w-4 h-4 text-blue-600" />
              <span>Probar Voz de Yacita</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsChatOpen(true);
                setIsSettingsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold min-h-[44px] active:scale-95"
            >
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>Consultorio Pedagógico con IA</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMinimized(true);
                setIsSettingsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 min-h-[44px] active:scale-95"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Minimizar a círculo pequeño</span>
            </button>
          </div>
        </div>
      </Sheet>

      {/* PEDAGOGICAL CHAT MODAL */}
      <Sheet
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        sheetId="yacita_pedagogical_chat"
        size="md"
        title="Consultorio con Yacita"
        subtitle="Orientación formativa y justicia restaurativa"
        icon={
          <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/60 p-0.5 flex items-center justify-center">
            <img
              src={yacitaIdle}
              alt="Yacita"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain aspect-square"
            />
          </div>
        }
        footer={
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 w-full"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Escribe tu consulta pedagógica..."
              className="flex-1 px-3.5 py-2 text-base sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 min-h-[44px]"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isAiLoading}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-colors min-h-[44px] min-w-[72px] active:scale-95"
            >
              Enviar
            </button>
          </form>
        }
      >
        <div className="flex flex-col space-y-3 min-h-[360px]">
          {/* Quick Questions */}
          <div className="p-2 bg-slate-100 dark:bg-slate-900/60 rounded-xl overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-amber-50 hover:border-amber-300 transition-colors min-h-[44px] flex items-center active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Body */}
          <div className="flex-1 space-y-3 p-1">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200 dark:border-slate-800 shadow-xs'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            ))}
            {isAiLoading && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                <span>Yacita está redactando una orientación pedagógica...</span>
              </div>
            )}
            <div ref={chatMessagesEndRef} />
          </div>
        </div>
      </Sheet>

      {/* DEBUG DRAWER (?debug=yacita) */}
      {isDebugMode && (
        <div
          data-yacita-ignore="true"
          className="fixed bottom-4 left-4 z-[9999] no-print"
        >
          {!isDebugDrawerOpen ? (
            <button
              onClick={() => setIsDebugDrawerOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900 text-amber-300 border border-amber-500 shadow-xl text-xs font-bold hover:bg-slate-800 transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Bug className="w-3.5 h-3.5 text-amber-400" />
              <span>Yacita Debug</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-900 text-xs font-bold">
                {debugEvents.length}
              </span>
            </button>
          ) : (
            <div className="w-[360px] sm:w-[420px] max-w-[calc(100vw-32px)] bg-slate-900 text-slate-100 rounded-2xl p-4 border border-amber-500/80 shadow-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-black uppercase text-amber-400">
                    Registro de Eventos y Controlador
                  </h4>
                </div>
                <button
                  onClick={() => setIsDebugDrawerOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-400"
                  aria-label="Cerrar panel de depuración"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                  <span className="block text-slate-400 text-xs">Total Interac.</span>
                  <span className="font-bold text-amber-300 text-sm">{debugStats.total}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                  <span className="block text-slate-400 text-xs">Con data-yacita</span>
                  <span className="font-bold text-emerald-400 text-sm">{debugStats.withDataYacita}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                  <span className="block text-slate-400 text-xs">Genéricos</span>
                  <span className="font-bold text-blue-400 text-sm">{debugStats.generic}</span>
                </div>
              </div>

              {/* Simulation test buttons */}
              <div className="mb-3 space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Simulación de Pruebas:
                </span>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => simulateInteraction('nav_tab_matrix')}
                    className="px-3 py-2 rounded-md bg-blue-900/60 hover:bg-blue-800 text-xs text-blue-200 border border-blue-700 min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    Tab Matriz
                  </button>
                  <button
                    onClick={() => simulateInteraction('matrix_score_3', { studentName: 'Juan' })}
                    className="px-3 py-2 rounded-md bg-emerald-900/60 hover:bg-emerald-800 text-xs text-emerald-200 border border-emerald-700 min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    3★ Logrado
                  </button>
                  <button
                    onClick={() => simulateInteraction('matrix_score_1', { studentName: 'María' })}
                    className="px-3 py-2 rounded-md bg-rose-900/60 hover:bg-rose-800 text-xs text-rose-200 border border-rose-700 min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    1★ Apoyo
                  </button>
                  <button
                    onClick={simulatePeriodicTip}
                    className="px-3 py-2 rounded-md bg-amber-900/60 hover:bg-amber-800 text-xs text-amber-200 border border-amber-700 min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    💡 Periódico
                  </button>
                </div>
              </div>

              {/* Live Events Log */}
              <div className="flex-1 overflow-y-auto space-y-1.5 text-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Historial de despachos (últimos):
                </span>
                {debugEvents.map((evt, idx) => (
                  <div
                    key={`${evt.seq}-${idx}`}
                    className={`p-2 rounded-lg border flex flex-col gap-0.5 ${
                      evt.status === 'duplicado_ignorado'
                        ? 'bg-red-950/60 border-red-700 text-red-200'
                        : 'bg-slate-800/60 border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-amber-400">
                        seq #{evt.seq} · {evt.time}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          evt.status === 'duplicado_ignorado'
                            ? 'bg-red-600 text-white'
                            : 'bg-emerald-900 text-emerald-300'
                        }`}
                      >
                        {evt.status === 'duplicado_ignorado' ? 'DUPLICADO IGNORADO' : evt.origen}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-100 truncate text-xs">
                      {evt.id}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      "{evt.textSnippet}..."
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
