import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Sparkles,
  Send,
  X,
  Volume2,
  VolumeX,
  Lightbulb,
  Check,
  Copy,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { chatWithYacita } from '../utils/yacitaAI';

export interface YacitaGuideProps {
  currentSection: string;
  isDarkMode: boolean;
  hasLowScoreAlert?: boolean;
  celebrationTrigger?: number;
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

const PERIODIC_TIPS = [
  '¿Te ayudo con el seguimiento de hoy?',
  '¿Quieres que redacte un reporte restaurativo con Yacita?',
  'Recuerda: la justicia restaurativa transforma la convivencia en el aula.',
  '¿Necesitas orientación pedagógica para algún caso en particular?',
];

// Sparkle Particle Component for celebration
const SparkleParticle: React.FC<{ delay: number; x: number; y: number; color: string }> = ({
  delay,
  x,
  y,
  color,
}) => (
  <motion.span
    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
    animate={{
      opacity: [0, 1, 1, 0],
      scale: [0, 1.3, 1, 0],
      x,
      y,
      rotate: [0, 180, 360],
    }}
    transition={{ duration: 1.2, delay, ease: 'easeOut' }}
    className="absolute pointer-events-none text-xs sm:text-sm font-bold z-50 select-none"
    style={{ color }}
  >
    ✦
  </motion.span>
);

export const YacitaGuide: React.FC<YacitaGuideProps> = React.memo(
  ({ currentSection, isDarkMode, hasLowScoreAlert = false, celebrationTrigger = 0 }) => {
    const shouldReduceMotion = useReducedMotion();

    const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
    const [inputQuery, setInputQuery] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [speakingId, setSpeakingId] = useState<string | null>(null);

    // Periodic dialogue bubble state
    const [balloonText, setBalloonText] = useState<string | null>(null);
    const tipIndexRef = useRef<number>(0);

    // Celebration state
    const [isCelebrating, setIsCelebrating] = useState<boolean>(false);
    const prevCelebrationRef = useRef<number>(celebrationTrigger);

    const [messages, setMessages] = useState<ChatMessage[]>([
      {
        id: 'msg-welcome',
        sender: 'yacita',
        text: '¡Hola, colega! Soy Yacita, tu Asistente Pedagógica en la I.E. Denzil Escolar. Estoy aquí para ayudarte a redactar registros objetivos, sugerir consecuencias formativas y resolver cualquier duda de manejo de aula y convivencia escolar.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Trigger celebration when celebrationTrigger increments
    useEffect(() => {
      if (celebrationTrigger > prevCelebrationRef.current) {
        prevCelebrationRef.current = celebrationTrigger;
        setIsCelebrating(true);
        const timer = setTimeout(() => setIsCelebrating(false), 2000);
        return () => clearTimeout(timer);
      }
      prevCelebrationRef.current = celebrationTrigger;
    }, [celebrationTrigger]);

    // Periodic speech bubble every 25 seconds, visible for 5 seconds
    useEffect(() => {
      if (isChatOpen) {
        setBalloonText(null);
        return;
      }

      const interval = setInterval(() => {
        if (!isChatOpen && !isLoading) {
          const tip = PERIODIC_TIPS[tipIndexRef.current % PERIODIC_TIPS.length];
          tipIndexRef.current += 1;
          setBalloonText(tip);

          // Auto-hide after 5 seconds
          const hideTimer = setTimeout(() => {
            setBalloonText(null);
          }, 5000);

          return () => clearTimeout(hideTimer);
        }
      }, 25000);

      return () => clearInterval(interval);
    }, [isChatOpen, isLoading]);

    // Scroll chat to bottom
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

    // Calculate Yacita's main motion state
    const getFigureAnimation = () => {
      if (shouldReduceMotion) return { opacity: 1 };

      if (isCelebrating) {
        return {
          y: [0, -22, 0, -12, 0],
          scale: [1, 1.15, 1, 1.08, 1],
          rotate: [0, -6, 6, -3, 0],
          transition: { duration: 0.85, ease: 'easeOut' as const },
        };
      }

      if (isLoading) {
        return {
          y: [0, -7, 0, -7, 0],
          scale: [1, 1.04, 1, 1.04, 1],
          transition: { repeat: Infinity, duration: 0.85, ease: 'easeInOut' as const },
        };
      }

      if (hasLowScoreAlert) {
        return {
          y: [0, -4, 0],
          rotate: [0, 4, 0],
          scale: [1, 1.02, 1],
          transition: { repeat: Infinity, duration: 3.5, ease: 'easeInOut' as const },
        };
      }

      // Idle float & breathing
      return {
        y: [0, -6, 0],
        scale: [1, 1.03, 1],
        rotate: [-1.5, 1.5, -1.5],
        transition: {
          repeat: Infinity,
          duration: 3.5,
          ease: 'easeInOut' as const,
        },
      };
    };

    // Floor shadow animation matching her floating
    const getFloorShadowAnimation = () => {
      if (shouldReduceMotion) return { opacity: 0.35 };

      if (isCelebrating) {
        return {
          scaleX: [1, 0.65, 1, 0.8, 1],
          opacity: [0.35, 0.15, 0.35, 0.2, 0.35],
          transition: { duration: 0.85, ease: 'easeOut' as const },
        };
      }

      if (isLoading) {
        return {
          scaleX: [1, 0.75, 1, 0.75, 1],
          opacity: [0.35, 0.2, 0.35, 0.2, 0.35],
          transition: { repeat: Infinity, duration: 0.85, ease: 'easeInOut' as const },
        };
      }

      return {
        scaleX: [1, 0.82, 1],
        opacity: [0.4, 0.25, 0.4],
        transition: {
          repeat: Infinity,
          duration: 3.5,
          ease: 'easeInOut' as const,
        },
      };
    };

    return (
      <aside aria-label="Yacita Asistente Pedagógica" className="no-print">
        {/* FLOATING YACITA CONTAINER (BOTTOM-RIGHT) */}
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end pointer-events-auto">
          {/* 1. THINKING BUBBLE (While AI processes request) */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.9 }}
                className="mb-2 px-3 py-1.5 rounded-full shadow-lg border border-amber-300 dark:border-amber-700 bg-white/95 dark:bg-[#0d162d]/95 backdrop-blur-md flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-300"
              >
                <span className="flex gap-1">
                  <motion.span
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                    className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"
                  />
                  <motion.span
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }}
                    className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"
                  />
                  <motion.span
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }}
                    className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"
                  />
                </span>
                <span>Yacita pensando...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2. PERIODIC SPEECH BALLOON (Pop-in every ~25s, auto-dismiss 5s) */}
          <AnimatePresence>
            {balloonText && !isChatOpen && !isLoading && (
              <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 10 }}
                transition={{ type: 'spring', damping: 16, stiffness: 220 }}
                onClick={() => {
                  setBalloonText(null);
                  setIsChatOpen(true);
                }}
                className="relative mb-2.5 max-w-[240px] sm:max-w-[280px] p-3 rounded-2xl shadow-xl border cursor-pointer select-none transition-all group bg-white text-slate-800 border-blue-300 dark:bg-[#0d162d] dark:text-slate-100 dark:border-blue-700"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-300 text-[11px] font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Yacita dice:</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBalloonText(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded"
                    title="Cerrar globo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs sm:text-[13px] font-medium leading-snug mt-1 text-slate-800 dark:text-slate-200">
                  {balloonText}
                </p>
                {/* Pointer arrow to Yacita */}
                <div className="absolute -bottom-1.5 right-8 w-3 h-3 rotate-45 border-r border-b bg-white border-blue-300 dark:bg-[#0d162d] dark:border-blue-700" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. CELEBRATION CONFETTI / SPARKLES BURST */}
          {isCelebrating && (
            <div className="relative w-0 h-0 flex items-center justify-center">
              <SparkleParticle delay={0} x={-45} y={-55} color="#f59e0b" />
              <SparkleParticle delay={0.08} x={38} y={-60} color="#10b981" />
              <SparkleParticle delay={0.15} x={-55} y={-25} color="#3b82f6" />
              <SparkleParticle delay={0.2} x={50} y={-30} color="#ec4899" />
              <SparkleParticle delay={0.25} x={0} y={-70} color="#8b5cf6" />
            </div>
          )}

          {/* 4. YACITA INTERACTIVE BUTTON WITH COMPLETE TRANSPARENT AVATAR */}
          <div className="flex flex-col items-center">
            <motion.button
              type="button"
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { y: 70, opacity: 0, scale: 0.8 }
              }
              animate={getFigureAnimation()}
              whileHover={
                shouldReduceMotion
                  ? undefined
                  : { y: -8, scale: 1.08, rotate: 3 }
              }
              whileTap={
                shouldReduceMotion
                  ? undefined
                  : { scale: 0.94, scaleY: 0.88, scaleX: 1.06 }
              }
              transition={
                shouldReduceMotion
                  ? { duration: 0.2 }
                  : { type: 'spring', damping: 14, stiffness: 120 }
              }
              onClick={() => {
                setBalloonText(null);
                setIsChatOpen((prev) => !prev);
              }}
              title="Yacita - Asistente Pedagógica IA"
              aria-label="Abrir Asistente Pedagógica Yacita"
              className="relative cursor-pointer focus:outline-none select-none bg-transparent border-0 p-0 flex items-center justify-center w-[78px] h-[78px] sm:w-[98px] sm:h-[98px] group"
              style={{ willChange: 'transform' }}
            >
              {/* Soft Halo / Glow Behind (Never clipping, purely atmospheric) */}
              <div
                className={`absolute inset-0 m-auto w-3/4 h-3/4 rounded-full pointer-events-none transition-all duration-300 ${
                  hasLowScoreAlert
                    ? 'bg-amber-500/40 dark:bg-amber-400/35 blur-xl animate-pulse'
                    : isCelebrating
                    ? 'bg-emerald-400/40 dark:bg-emerald-300/30 blur-2xl scale-125'
                    : 'bg-amber-400/20 dark:bg-amber-400/15 blur-lg group-hover:bg-amber-400/40 group-hover:blur-xl group-hover:scale-110'
                }`}
              />

              {/* Yacita Official Illustration: Real /yacita.png, transparent, unclipped */}
              <img
                src="/yacita.png"
                alt="Yacita"
                className="w-full h-full object-contain pointer-events-none drop-shadow-[0_8px_14px_rgba(0,0,0,0.22)] dark:drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)] select-none"
                style={{
                  imageRendering: 'auto',
                  aspectRatio: '1/1',
                }}
                loading="eager"
              />

              {/* Subtle status indicator dot */}
              <span className="absolute bottom-1 right-2 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-xs pointer-events-none" />
            </motion.button>

            {/* Elliptical floor shadow moving synchronously */}
            <motion.div
              animate={getFloorShadowAnimation()}
              className="w-14 sm:w-16 h-2 sm:h-2.5 mx-auto rounded-[100%] bg-slate-900/25 dark:bg-black/50 blur-[2px] pointer-events-none -mt-1"
              style={{ willChange: 'transform, opacity' }}
            />
          </div>
        </div>

        {/* 5. SLIDE-OUT / POP-UP CHAT WITH YACITA (SPRING ANIMATION) */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.aside
              role="dialog"
              aria-label="Panel Asistente Pedagógica Yacita"
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.85, x: 20, y: 20 }
              }
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.85, x: 20, y: 20 }
              }
              transition={{ type: 'spring', damping: 20, stiffness: 240 }}
              className="fixed bottom-24 right-4 sm:bottom-28 sm:right-6 z-50 w-[92vw] sm:w-[420px] max-h-[78vh] flex flex-col rounded-2xl shadow-2xl border transition-colors duration-200 bg-white text-slate-900 border-slate-200 dark:bg-[#0d162d] dark:text-slate-100 dark:border-blue-900 overflow-hidden"
              style={{ transformOrigin: 'bottom right', willChange: 'transform, opacity' }}
            >
              {/* CHAT HEADER */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-blue-950 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-blue-300 overflow-hidden bg-white/90 p-0.5 shrink-0 shadow-xs">
                    <img
                      src="/yacita.png"
                      alt="Yacita"
                      className="w-full h-full object-contain"
                      style={{ imageRendering: 'auto' }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm tracking-tight text-white">Yacita</h3>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
                        IA Pedagógica Activa
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-200">
                      I.E. Denzil Escolar · Riohacha
                    </p>
                  </div>
                </div>

                <button
                  type="button"
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
                            type="button"
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
                            type="button"
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
              <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d162d] shrink-0">
                <div className="flex items-center gap-1 mb-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  <Lightbulb className="w-3 h-3 text-amber-500" />
                  <span>Preguntas frecuentes para el aula:</span>
                </div>
                <div className="flex flex-col gap-1">
                  {QUICK_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
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
                className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d162d] flex items-center gap-2 shrink-0"
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
            </motion.aside>
          )}
        </AnimatePresence>
      </aside>
    );
  }
);

YacitaGuide.displayName = 'YacitaGuide';
