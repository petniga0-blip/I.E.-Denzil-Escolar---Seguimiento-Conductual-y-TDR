import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  HelpCircle,
  Minimize2,
  Maximize2,
  EyeOff,
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  Copy,
  Check,
} from 'lucide-react';
import { useYacitaCoach } from './YacitaCoachContext';
import { chatWithYacita } from '../utils/yacitaAI';

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
    currentTab,
    currentBubble,
    currentMood,
    displayedText,
    isTyping,
    isMuted,
    setIsMuted,
    isMinimized,
    setIsMinimized,
    setIsPaused,
    dismissBubble,
    reopenTabHelp,
    dismissTipForever,
  } = useYacitaCoach();

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeImage = YACITA_IMAGE_MAP[currentMood] || yacitaIdle;

  // MINIMIZED STATE: Small circular avatar button with Yacita's real image (anti-SVG)
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999] no-print flex items-center gap-2">
        <button
          onClick={() => setIsMinimized(false)}
          className="relative w-13 h-13 rounded-full bg-white dark:bg-[#131f42] p-1 shadow-2xl border-2 border-amber-500 hover:scale-105 transition-transform flex items-center justify-center cursor-pointer group"
          title="Abrir a Yacita (Acompañante Pedagógico)"
          aria-label="Expandir a Yacita"
        >
          <img
            src={yacitaIdle}
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
        className="fixed bottom-4 right-4 z-[9999] no-print flex flex-col items-end select-none pointer-events-none"
        style={{ filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.22))' }}
      >
        {/* SPEECH BUBBLE ANCHORED ABOVE YACITA */}
        {currentBubble && !isChatOpen && (
          <div
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="pointer-events-auto relative mb-3 w-[300px] sm:w-[320px] max-w-[calc(100vw-32px)] bg-white dark:bg-[#111c3d] text-slate-800 dark:text-slate-100 rounded-2xl p-3.5 border-2 border-amber-400 dark:border-amber-500/80 shadow-2xl animate-in zoom-in-95 fade-in duration-200"
            role="region"
            aria-live="polite"
          >
            {/* Header of the bubble */}
            <div className="flex items-center justify-between gap-1 pb-1.5 mb-1.5 border-b border-amber-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Yacita · Coach
                </span>
              </div>
              <button
                onClick={dismissBubble}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Cerrar burbuja"
                aria-label="Cerrar mensaje"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Text with typewriter effect */}
            <p className="text-xs sm:text-[13px] leading-relaxed font-medium text-slate-700 dark:text-slate-200 min-h-[38px]">
              {displayedText}
              {isTyping && (
                <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-amber-500 animate-pulse align-middle" />
              )}
            </p>

            {/* Action buttons if available */}
            {currentBubble.botones && currentBubble.botones.length > 0 && !isTyping && (
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                {currentBubble.botones.map((btn) => (
                  <button
                    key={btn.actionId}
                    onClick={() => {
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
            {currentBubble.allowDoNotShowAgain && !isTyping && (
              <div className="mt-2 pt-1 flex justify-end">
                <button
                  onClick={() => dismissTipForever(currentBubble.id)}
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

        {/* YACITA AVATAR & CONTROLS ROW */}
        <div className="pointer-events-auto flex items-end gap-2">
          {/* Floating Quick Controls Toolbar */}
          <div className="flex flex-col gap-1.5 mb-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800">
            {/* Reopen Current Screen Help */}
            <button
              onClick={reopenTabHelp}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
              title="¿Qué puedo hacer en esta pantalla?"
              aria-label="Ayuda de la pantalla actual"
            >
              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>

            {/* Pedagogical AI Chat Button */}
            <button
              onClick={() => setIsChatOpen(true)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors"
              title="Preguntar a Yacita (Consultorio Pedagógico)"
              aria-label="Consultar a Yacita"
            >
              <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </button>

            {/* Mute / Unmute Suggestions (Stored in localStorage) */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isMuted ? 'Activar sugerencias periódicas' : 'Silenciar sugerencias periódicas'}
              aria-label="Silenciar sugerencias"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-red-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
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

          {/* Main Yacita Avatar Button (Authentic PNG with expressive reaction) */}
          <button
            onClick={() => {
              if (currentBubble) {
                dismissBubble();
              } else {
                reopenTabHelp();
              }
            }}
            className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer focus:outline-hidden group"
            title="Yacita: Acompañante Pedagógico (haz clic para guía)"
            aria-label="Yacita"
          >
            {/* Subtle glow circle behind Yacita */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400/20 via-blue-500/10 to-emerald-400/20 blur-md group-hover:blur-lg transition-all" />

            {/* Authentic Institutional PNG */}
            <img
              src={activeImage}
              alt="Yacita Acompañante"
              className="w-full h-full object-contain aspect-square relative z-10 transition-transform duration-200"
              loading="eager"
            />

            {/* Speaking indicator dot */}
            {isTyping && (
              <span className="absolute bottom-1 right-2 z-20 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-white dark:border-slate-900" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* INTERACTIVE PEDAGOGICAL CHAT MODAL */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
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
                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-bl-xs shadow-xs'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                      <span>{msg.timestamp}</span>
                      {msg.sender === 'yacita' && (
                        <button
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          className="hover:text-blue-500 transition-colors"
                          title="Copiar texto"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 italic p-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>Yacita está redactando una orientación pedagógica...</span>
                </div>
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            {/* Quick Questions Chips */}
            <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex gap-1.5 overflow-x-auto">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-300 transition-colors shrink-0 whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Bar */}
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
                placeholder="Escribe tu consulta pedagógica para Yacita..."
                className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isAiLoading}
                className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition-colors"
                title="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
