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
  SlidersHorizontal,
  Lightbulb,
  Bug,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useYacitaCoach } from './YacitaCoachContext';
import { chatWithYacita } from '../utils/yacitaAI';
import { CoachingLevel } from '../config/yacitaMensajes';

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
    setIsVoiceEnabled,
    isPeriodicEnabled,
    setIsPeriodicEnabled,
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
    isDebugMode,
    debugStats,
    debugEvents,
    simulateInteraction,
    simulatePeriodicTip,
  } = useYacitaCoach();

  // Menu popup state when clicking Yacita
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Quick confirmation toast when toggling voice or periodic suggestions
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const handleToggleVoice = () => {
    const next = !isVoiceEnabled;
    setIsVoiceEnabled(next);
    showToast(next ? 'Voz activada 🔊' : 'Voz desactivada 🔇');
  };

  const handleTogglePeriodic = () => {
    const next = !isPeriodicEnabled;
    setIsPeriodicEnabled(next);
    showToast(next ? 'Sugerencias periódicas activadas 💡' : 'Sugerencias periódicas desactivadas ⏸️');
  };

  // Chat modal state
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

  // MINIMIZED STATE: compact button, interaction bubbles still shown unless level is silencioso
  const shouldShowFloatingBubble =
    currentBubble &&
    !isChatOpen &&
    !isDialogueInModalPanel &&
    coachingLevel !== 'silencioso';

  if (isMinimized) {
    return (
      <div
        data-yacita-ignore="true"
        className="fixed bottom-4 right-4 z-[9999] no-print flex flex-col items-end gap-2"
      >
        {/* Floating bubble even when minimized unless coaching level is silencioso */}
        {shouldShowFloatingBubble && (
          <div
            data-yacita-bubble="true"
            onClick={skipVoiceAndComplete}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="mb-2 w-[280px] sm:w-[310px] bg-white dark:bg-[#111c3d] text-slate-800 dark:text-slate-100 rounded-2xl p-3 border-2 border-amber-400 dark:border-amber-500/80 shadow-2xl animate-in zoom-in-95 duration-150 cursor-pointer"
            role="region"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-1 pb-1 mb-1 border-b border-amber-100 dark:border-slate-800/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Yacita · Coach
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissBubble();
                }}
                className="p-0.5 rounded-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs leading-relaxed font-medium">
              {displayedText}
              {(isSpeaking || isTyping) && (
                <span className="inline-block w-1.5 h-3 ml-0.5 bg-amber-500 animate-pulse align-middle" />
              )}
            </p>
          </div>
        )}

        <button
          onClick={() => setIsMinimized(false)}
          className="relative w-14 h-14 rounded-full bg-white dark:bg-[#131f42] p-1 shadow-2xl border-2 border-amber-500 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-pointer group"
          title="Expandir a Yacita (Acompañante Pedagógico)"
          aria-label="Expandir a Yacita"
        >
          <img
            src={activeImage}
            alt="Yacita Minimizado"
            className="w-full h-full object-contain rounded-full aspect-square"
          />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        data-yacita-ignore="true"
        className="fixed bottom-4 right-4 z-[9999] no-print flex flex-col items-end select-none pointer-events-none"
        style={{ filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.22))' }}
      >
        {/* Toast confirmation for voice / periodic settings */}
        {toastMessage && (
          <div className="pointer-events-auto mb-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150">
            {toastMessage}
          </div>
        )}

        {/* MICRO-FEEDBACK BADGE (Rapid repetitive interactions) */}
        {microFeedback && !currentBubble && !isChatOpen && (
          <div
            className="pointer-events-auto mb-2 px-3 py-1.5 rounded-full bg-slate-900/90 text-amber-300 border border-amber-400/60 shadow-lg text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-150 flex items-center gap-1.5"
            role="status"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>{microFeedback.text}</span>
          </div>
        )}

        {/* SPEECH BUBBLE ANCHORED ABOVE YACITA (Hidden if dialogue is inside modal panel) */}
        {shouldShowFloatingBubble && (
          <div
            data-yacita-bubble="true"
            onClick={skipVoiceAndComplete}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="pointer-events-auto relative mb-3 w-[300px] sm:w-[325px] max-w-[calc(100vw-32px)] bg-white dark:bg-[#111c3d] text-slate-800 dark:text-slate-100 rounded-2xl p-3.5 border-2 border-amber-400 dark:border-amber-500/80 shadow-2xl animate-in zoom-in-95 fade-in duration-200 cursor-pointer"
            role="region"
            aria-live="polite"
            title="Haz clic en la burbuja para completar el texto de inmediato"
          >
            {/* Header of the bubble */}
            <div className="flex items-center justify-between gap-1 pb-1.5 mb-1.5 border-b border-amber-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Yacita · Coach
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-medium">
                  {coachingLevel === 'completo' ? 'Completo' : coachingLevel === 'moderado' ? 'Moderado' : 'Silencioso'}
                </span>
                {isSpeaking && (
                  <span className="text-[9px] px-1 rounded-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    🔊 Hablando
                  </span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissBubble();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Cerrar burbuja"
                aria-label="Cerrar mensaje"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Text synchronized with voice */}
            <p className="text-xs sm:text-[13px] leading-relaxed font-medium text-slate-700 dark:text-slate-200 min-h-[38px]">
              {displayedText}
              {(isSpeaking || isTyping) && (
                <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-amber-500 animate-pulse align-middle" />
              )}
            </p>

            {/* Action buttons if available */}
            {currentBubble.botones && currentBubble.botones.length > 0 && !isSpeaking && !isTyping && (
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                {currentBubble.botones.map((btn) => (
                  <button
                    key={btn.actionId}
                    onClick={(e) => {
                      e.stopPropagation();
                      btn.onClick?.();
                      dismissBubble();
                    }}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors shadow-2xs ${
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
              <div className="mt-2 pt-1 flex justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissTipForever(currentBubble.id);
                  }}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="No volver a mostrar esta sugerencia"
                >
                  <EyeOff className="w-3 h-3" />
                  <span>No volver a mostrar</span>
                </button>
              </div>
            )}

            {/* Speech bubble tail pointing towards Yacita */}
            <div
              className="absolute -bottom-2 right-12 w-4 h-4 bg-white dark:bg-[#111c3d] border-r-2 border-b-2 border-amber-400 dark:border-amber-500/80 transform rotate-45"
              aria-hidden="true"
            />
          </div>
        )}

        {/* QUICK MENU WHEN CLICKING ON YACITA */}
        {isMenuOpen && (
          <div
            data-yacita-ignore="true"
            className="pointer-events-auto mb-3 w-[280px] bg-white dark:bg-[#0f1938] rounded-2xl p-3 border border-slate-200 dark:border-slate-700 shadow-2xl animate-in zoom-in-95 fade-in duration-150"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
                Acompañamiento de Yacita
              </span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Coaching Level Selector (Completo / Moderado / Silencioso) */}
            <div className="mb-3">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Nivel de interacción:
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                {(['completo', 'moderado', 'silencioso'] as CoachingLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setCoachingLevel(lvl)}
                    className={`py-1 text-[10px] font-semibold rounded-lg capitalize transition-colors ${
                      coachingLevel === lvl
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                {coachingLevel === 'completo' && 'Reacciona a clics, botones y campos.'}
                {coachingLevel === 'moderado' && 'Solo pestañas, modales y acciones clave.'}
                {coachingLevel === 'silencioso' && 'Solo responde cuando tú la consultas.'}
              </p>
            </div>

            {/* Screen Help & Consultation Buttons */}
            <div className="space-y-1">
              <button
                onClick={() => {
                  reopenTabHelp();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors text-left"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                <span>¿Qué hacer en esta pantalla?</span>
              </button>

              <button
                onClick={() => {
                  setIsChatOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors text-left"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                <span>Consultorio Pedagógico AI</span>
              </button>

              <button
                onClick={() => {
                  setIsMinimized(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Minimizar avatar</span>
              </button>
            </div>
          </div>
        )}

        {/* YACITA AVATAR & CONTROLS ROW */}
        <div data-yacita-avatar-area="true" className="pointer-events-auto flex items-end gap-2">
          {/* Floating Quick Controls Toolbar with 3 Independent Controls (Parte 3) */}
          <div className="flex flex-col gap-1.5 mb-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800">
            {/* Control 1: VOICE TOGGLE (Dedicated, clear icon + tooltip + state) */}
            <button
              onClick={handleToggleVoice}
              aria-pressed={isVoiceEnabled}
              className={`p-1.5 rounded-lg transition-colors relative group ${
                isVoiceEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={isVoiceEnabled ? 'Voz: Activada (haz clic para desactivar)' : 'Voz: Desactivada (haz clic para activar)'}
              aria-label={isVoiceEnabled ? 'Desactivar voz de Yacita' : 'Activar voz de Yacita'}
            >
              {isVoiceEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              {isVoiceEnabled && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              )}
            </button>

            {/* Control 2: PERIODIC SUGGESTIONS TOGGLE (Independent, affects ONLY 45-90s tips) */}
            <button
              onClick={handleTogglePeriodic}
              aria-pressed={isPeriodicEnabled}
              className={`p-1.5 rounded-lg transition-colors relative group ${
                isPeriodicEnabled
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={
                isPeriodicEnabled
                  ? 'Sugerencias periódicas: Activadas (haz clic para pausar)'
                  : 'Sugerencias periódicas: Desactivadas (haz clic para reactivar)'
              }
              aria-label={
                isPeriodicEnabled
                  ? 'Desactivar sugerencias periódicas'
                  : 'Activar sugerencias periódicas'
              }
            >
              <Lightbulb
                className={`w-4 h-4 ${
                  isPeriodicEnabled
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-400'
                }`}
              />
              {isPeriodicEnabled && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full" />
              )}
            </button>

            {/* Screen Help */}
            <button
              onClick={reopenTabHelp}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
              title="¿Qué puedo hacer en esta pantalla?"
              aria-label="Ayuda de la pantalla actual"
            >
              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>

            {/* AI Consultation Chat */}
            <button
              onClick={() => setIsChatOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors"
              title="Preguntar a Yacita (Consultorio Pedagógico)"
              aria-label="Consultar a Yacita"
            >
              <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </button>

            {/* Control 3: Settings Menu for Coaching Level */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Nivel de acompañamiento y opciones"
              aria-label="Opciones de Yacita"
            >
              <Settings2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>

            {/* Minimize Avatar */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Minimizar a Yacita"
              aria-label="Minimizar avatar"
            >
              <Minimize2 className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Main Yacita Avatar Button (Authentic PNG with crossfade without jumps) */}
          <button
            onClick={() => {
              if (currentBubble) {
                dismissBubble();
              } else {
                setIsMenuOpen((prev) => !prev);
              }
            }}
            className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer focus:outline-hidden group"
            title="Yacita: Acompañante Pedagógico (haz clic para menú de opciones)"
            aria-label="Yacita"
          >
            {/* Subtle glow circle */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400/20 via-blue-500/10 to-emerald-400/20 blur-md group-hover:blur-lg transition-all" />

            {/* Authentic Institutional PNG Expression - STRICTLY NO SVG */}
            <img
              src={activeImage}
              alt="Yacita Acompañante"
              className="w-full h-full object-contain aspect-square relative z-10 transition-opacity duration-300"
              loading="eager"
            />

            {/* Speaking/Typing indicator dot */}
            {(isSpeaking || isTyping) && (
              <span className="absolute bottom-1 right-2 z-20 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-white dark:border-slate-900" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* PEDAGOGICAL CHAT MODAL */}
      {isChatOpen && (
        <div
          data-yacita-ignore="true"
          className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-white dark:bg-[#111c3d] rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[580px] max-h-[92vh] animate-in zoom-in-95 fade-in duration-200">
            {/* Chat Header */}
            <div className="p-4 bg-gradient-to-r from-amber-500 via-amber-600 to-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 p-1 flex items-center justify-center">
                  <img src={yacitaIdle} alt="Yacita" className="w-full h-full object-contain aspect-square" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">Consultorio con Yacita</h3>
                  <p className="text-[11px] text-amber-100">Orientación formativa y justicia restaurativa</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-[#0c152e]">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200 dark:border-slate-800 shadow-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                  <span>Yacita está redactando una orientación pedagógica...</span>
                </div>
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            {/* Quick Questions */}
            <div className="p-2.5 bg-slate-100 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 overflow-x-auto flex gap-1.5 no-scrollbar">
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Row */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-white dark:bg-[#111c3d] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Escribe tu consulta pedagógica..."
                className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isAiLoading}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold transition-colors"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DEBUG DRAWER (?debug=yacita) (Parte 5) */}
      {isDebugMode && (
        <div
          data-yacita-ignore="true"
          className="fixed bottom-4 left-4 z-[9999] no-print"
        >
          {!isDebugDrawerOpen ? (
            <button
              onClick={() => setIsDebugDrawerOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900 text-amber-300 border border-amber-500 shadow-xl text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              <Bug className="w-3.5 h-3.5 text-amber-400" />
              <span>Yacita Debug</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-900 text-[10px]">
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
                  className="p-1 rounded-md text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-center text-[10px]">
                <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                  <span className="block text-slate-400">Total Interac.</span>
                  <span className="font-bold text-amber-300 text-sm">{debugStats.total}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                  <span className="block text-slate-400">Con data-yacita</span>
                  <span className="font-bold text-emerald-400 text-sm">{debugStats.withDataYacita}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                  <span className="block text-slate-400">Genéricos</span>
                  <span className="font-bold text-blue-400 text-sm">{debugStats.generic}</span>
                </div>
              </div>

              {/* Quick simulation buttons */}
              <div className="mb-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Simulación de Pruebas:
                </span>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => simulateInteraction('nav_tab_matrix')}
                    className="px-2 py-1 rounded-md bg-blue-900/60 hover:bg-blue-800 text-[10px] text-blue-200 border border-blue-700"
                  >
                    Tab Matriz
                  </button>
                  <button
                    onClick={() => simulateInteraction('matrix_score_3', { studentName: 'Juan' })}
                    className="px-2 py-1 rounded-md bg-emerald-900/60 hover:bg-emerald-800 text-[10px] text-emerald-200 border border-emerald-700"
                  >
                    3★ Logrado
                  </button>
                  <button
                    onClick={() => simulateInteraction('matrix_score_1', { studentName: 'María' })}
                    className="px-2 py-1 rounded-md bg-rose-900/60 hover:bg-rose-800 text-[10px] text-rose-200 border border-rose-700"
                  >
                    1★ Apoyo
                  </button>
                  <button
                    onClick={simulatePeriodicTip}
                    className="px-2 py-1 rounded-md bg-amber-900/60 hover:bg-amber-800 text-[10px] text-amber-200 border border-amber-700"
                  >
                    💡 Periódico
                  </button>
                </div>
              </div>

              {/* Live Events Log with duplicate check */}
              <div className="flex-1 overflow-y-auto space-y-1.5 text-[10.5px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                      <span className="font-mono text-[9px] text-amber-400">
                        seq #{evt.seq} · {evt.time}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                          evt.status === 'duplicado_ignorado'
                            ? 'bg-red-600 text-white'
                            : 'bg-emerald-900 text-emerald-300'
                        }`}
                      >
                        {evt.status === 'duplicado_ignorado' ? 'DUPLICADO IGNORADO' : evt.origen}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-100 truncate">
                      {evt.id}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
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
