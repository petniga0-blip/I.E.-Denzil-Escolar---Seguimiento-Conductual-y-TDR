import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Volume2,
  VolumeX,
  MessageSquare,
  Bot,
  Lightbulb,
  Check,
  Copy,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { chatWithYacita } from '../utils/yacitaAI';

export interface YacitaGuideProps {
  currentSection: string;
  isDarkMode: boolean;
}

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
];

export const YacitaGuide: React.FC<YacitaGuideProps> = ({ currentSection, isDarkMode }) => {
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'yacita',
      text: '¡Hola, colega! Soy Yacita, tu Asistente Pedagógica en la I.E. Denzil Escolar. Estoy aquí para ayudarte a redactar registros objetivos, sugerir consecuencias formativas y resolver cualquier duda de manejo de aula y justicia restaurativa.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isChatOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        text: m.text,
      }));

      const reply = await chatWithYacita(query, history);

      const yacitaMsg: ChatMessage = {
        id: 'yac-' + Date.now(),
        sender: 'yacita',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, yacitaMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleSpeech = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Tu navegador no soporta síntesis de voz.');
      return;
    }

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-CO';
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);

      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <>
      {/* FLOATING CIRCULAR AVATAR BUTTON (BOTTOM-RIGHT) */}
      <div className="no-print fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="relative group w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-blue-400 bg-gradient-to-tr from-blue-900 to-blue-700 shadow-2xl overflow-hidden flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus:outline-none"
          title="Abrir Asistente Pedagógica Yacita"
          aria-label="Abrir Asistente Pedagógica Yacita"
        >
          <img
            src="yacita.png"
            alt="Yacita Asistente IA"
            className="w-full h-full object-cover object-top"
          />
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></span>
        </button>
      </div>

      {/* CHAT WITH YACITA SLIDE-OUT PANEL */}
      {isChatOpen && (
        <aside
          role="dialog"
          aria-label="Panel Asistente Pedagógica Yacita"
          className="no-print fixed bottom-22 right-5 sm:bottom-24 sm:right-6 z-50 w-[92vw] sm:w-[420px] max-h-[80vh] flex flex-col rounded-2xl shadow-2xl border transition-all duration-300 animate-in fade-in zoom-in-95 bg-white text-slate-900 border-slate-200 dark:bg-[#0d162d] dark:text-slate-100 dark:border-blue-900 overflow-hidden"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-blue-950 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-blue-300 overflow-hidden bg-white shrink-0">
                <img
                  src="yacita.png"
                  alt="Yacita"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight text-white">Yacita</h3>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    IA Activa
                  </span>
                </div>
                <p className="text-[11px] text-blue-200">
                  Asistente Pedagógica · I.E. Denzil Escolar
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                setIsChatOpen(false);
              }}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CHAT MESSAGES BODY */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs sm:text-[13px] bg-slate-50/70 dark:bg-[#070e20]/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-xs whitespace-pre-wrap leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-700 text-white rounded-tr-none'
                      : 'bg-white dark:bg-[#131f42] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Footer of message */}
                <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400 dark:text-slate-500">
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'yacita' && (
                    <>
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        title="Copiar texto"
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>

                      <button
                        onClick={() => handleToggleSpeech(msg.id, msg.text)}
                        title="Escuchar"
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5"
                      >
                        {speakingId === msg.id ? (
                          <VolumeX className="w-3 h-3 text-red-500 animate-pulse" />
                        ) : (
                          <Volume2 className="w-3 h-3" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 p-2 font-medium bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin text-amber-500" />
                <span>Yacita está redactando la orientación pedagógica...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* QUICK SUGGESTIONS CAROUSEL */}
          <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d162d]">
            <div className="flex items-center gap-1 mb-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <span>Preguntas frecuentes para el aula:</span>
            </div>
            <div className="flex flex-col gap-1">
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  disabled={isLoading}
                  className="text-left text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131f42]/70 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-between gap-1 group"
                >
                  <span className="truncate">{q}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* INPUT BAR */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d162d] flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Hazle una consulta pedagógica a Yacita..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#131f42] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="p-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white shadow-xs transition-colors shrink-0"
              title="Enviar consulta"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
      )}
    </>
  );
};
