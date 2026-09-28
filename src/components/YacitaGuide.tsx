import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Send,
  X,
  Volume2,
  VolumeX,
  MessageSquare,
  Lightbulb,
  Check,
  Copy,
  ChevronRight,
  ChevronLeft,
  Minimize2,
  Maximize2,
  RotateCcw,
  Volume1,
  HelpCircle,
  Award,
  Compass,
} from 'lucide-react';
import yacitaIdle from '../assets/idle.png';
import yacitaSaludo from '../assets/saludo.png';
import yacitaHablando from '../assets/hablando.png';
import yacitaPensando from '../assets/pensando.png';
import yacitaCelebrando from '../assets/celebrando.png';
import yacitaEmpatica from '../assets/empatica.png';
import yacitaApuntando from '../assets/apuntando_notas.png';
import yacitaPulgar from '../assets/pulgar_arriba.png';
import yacitaSenalando from '../assets/senalando.png';
import yacitaParpadeo from '../assets/parpadeo.png';
import { chatWithYacita } from '../utils/yacitaAI';
import {
  getTeacherFirstName,
  getTimeGreeting,
  getWelcomeGreeting,
  YacitaEventDetail,
  YACITA_TOUR_STEPS,
} from '../utils/yacitaVoice';
import { TeacherProfile } from '../types';

export interface YacitaGuideProps {
  currentTab: 'students' | 'matrix' | 'abc' | 'reports';
  onSelectTab: (tab: 'students' | 'matrix' | 'abc' | 'reports') => void;
  teacher: TeacherProfile;
  isDarkMode: boolean;
  onOpenAddStudent?: () => void;
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
  '¿Cómo exportar las actas y TDR a Word y Google Drive?',
];

export const YacitaGuide: React.FC<YacitaGuideProps> = React.memo(({
  currentTab,
  onSelectTab,
  teacher,
  isDarkMode,
  onOpenAddStudent,
}) => {
  const teacherFirstName = useMemo(() => getTeacherFirstName(teacher.name), [teacher.name]);
  const timeGreeting = useMemo(() => getTimeGreeting(teacherFirstName), [teacherFirstName]);

  // UI States
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isBubbleVisible, setIsBubbleVisible] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('denzil_yacita_muted') === 'true';
  });
  const [isMobileMinimized, setIsMobileMinimized] = useState<boolean>(false);

  // Animation reaction states
  const [reaction, setReaction] = useState<'idle' | 'celebrate' | 'support' | 'speaking'>('idle');
  const [reactionSparkles, setReactionSparkles] = useState<boolean>(false);

  // Guided Tour State
  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const [tourStepIndex, setTourStepIndex] = useState<number>(0);

  // Bubble text & typewriter
  const [bubbleText, setBubbleText] = useState<string>(() => getWelcomeGreeting(teacher.name));
  const [displayedBubbleText, setDisplayedBubbleText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // Chat conversation
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'yacita',
      text: `¡Hola, profe ${teacherFirstName}! Soy Yacita, tu compañera para el seguimiento conductual y la justicia restaurativa en la I.E. Denzil Escolar. Estoy aquí para acompañarte en toda la jornada. ¿En qué te puedo apoyar hoy? 😊`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check tour completion status on mount
  useEffect(() => {
    const tourDone = localStorage.getItem('denzil_yacita_tour_done');
    if (!tourDone) {
      // Suggest tour in initial bubble
      setBubbleText(`¡Hola, profe ${teacherFirstName}! Soy Yacita, tu compañera para el seguimiento conductual. ¿Empezamos con un recorrido rápido? 😊`);
    } else {
      setBubbleText(`¡${timeGreeting} Soy Yacita. ¿Qué deseas realizar hoy en el aula? 😊`);
    }
  }, [teacherFirstName, timeGreeting]);

  // Typewriter effect for speech bubble
  useEffect(() => {
    if (!bubbleText) {
      setDisplayedBubbleText('');
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayedBubbleText(bubbleText);
      return;
    }

    setIsTyping(true);
    setDisplayedBubbleText('');
    let idx = 0;
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    typingTimerRef.current = setInterval(() => {
      idx++;
      setDisplayedBubbleText(bubbleText.slice(0, idx));
      if (idx >= bubbleText.length) {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        setIsTyping(false);
      }
    }, 22);

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [bubbleText]);

  // Listen to application events (celebrations, student registered, 1-star alert)
  useEffect(() => {
    const handleYacitaEvent = (e: Event) => {
      const customEvent = e as CustomEvent<YacitaEventDetail>;
      const detail = customEvent.detail;
      if (!detail) return;

      if (detail.type === 'celebrate' || detail.type === 'student-saved' || detail.type === 'matrix-logrado') {
        setReaction('celebrate');
        setReactionSparkles(true);
        if (detail.message) {
          setBubbleText(detail.message);
          setIsBubbleVisible(true);
        }
        setTimeout(() => {
          setReaction('idle');
          setReactionSparkles(false);
        }, 2500);
      } else if (detail.type === 'support' || detail.type === 'matrix-support') {
        setReaction('support');
        if (detail.message) {
          setBubbleText(detail.message);
          setIsBubbleVisible(true);
        }
        setTimeout(() => setReaction('idle'), 3500);
      } else if (detail.type === 'student-modal-opened') {
        setBubbleText(
          detail.message ||
            '¡Vamos a registrar un estudiante, profe! Recuerda que el nombre del acudiente es obligatorio y las observaciones médicas/sensoriales ayudan a orientar su acompañamiento en el aula. 📝'
        );
        setIsBubbleVisible(true);
      } else if (detail.type === 'student-modal-closed') {
        // Return to tab context
      } else if (detail.message) {
        setBubbleText(detail.message);
        setIsBubbleVisible(true);
      }
    };

    window.addEventListener('yacita-event', handleYacitaEvent);
    return () => window.removeEventListener('yacita-event', handleYacitaEvent);
  }, []);

  // Contextual help on Tab Change (when tour is not active)
  useEffect(() => {
    if (isTourActive) return;

    if (currentTab === 'students') {
      setBubbleText(`Pestaña Estudiantes: Aquí puedes matricular nuevos alumnos, editar sus datos y consultar números de acudientes para contacto rápido. 📋`);
    } else if (currentTab === 'matrix') {
      setBubbleText(`Matriz Grupal: Puedes calificar en 1 clic los 4 criterios de convivencia. Usa «Marcar Todos Logrado [✓]» para avanzar rápido y afinar detalles individuales. ⭐`);
    } else if (currentTab === 'abc') {
      setBubbleText(`Registro y TDR: Cuando ocurra una desregulación, documenta el Antecedente (A), la Conducta (B) y el Plan Restaurativo (C). ¡Usa mis botones de IA para redactar con amor y respeto! ✨`);
    } else if (currentTab === 'reports') {
      setBubbleText(`Reportes Oficiales: Genera actas con membrete institucional listas para descargar en Word (.docx) tamaño Carta o sincronizar en Google Drive. 📄`);
    }
  }, [currentTab, isTourActive]);

  // Guided tour management
  const startTour = useCallback(() => {
    setIsTourActive(true);
    setTourStepIndex(0);
    const step = YACITA_TOUR_STEPS[0];
    onSelectTab(step.tab);
    setBubbleText(`${step.title}: ${step.message}\n\n${step.tip}`);
    setIsBubbleVisible(true);
    setIsChatOpen(false);
  }, [onSelectTab]);

  const nextTourStep = useCallback(() => {
    if (tourStepIndex < YACITA_TOUR_STEPS.length - 1) {
      const nextIdx = tourStepIndex + 1;
      setTourStepIndex(nextIdx);
      const step = YACITA_TOUR_STEPS[nextIdx];
      onSelectTab(step.tab);
      setBubbleText(`${step.title}: ${step.message}\n\n${step.tip}`);
    } else {
      // Tour completed
      setIsTourActive(false);
      localStorage.setItem('denzil_yacita_tour_done', 'true');
      setReaction('celebrate');
      setReactionSparkles(true);
      setBubbleText(`¡Excelente, profe ${teacherFirstName}! Completamos el recorrido. Yo estaré siempre aquí en la esquina para acompañarte y resolver cualquier duda pedagógica. ¡Éxitos hoy! 🎉`);
      setTimeout(() => {
        setReaction('idle');
        setReactionSparkles(false);
      }, 3000);
    }
  }, [tourStepIndex, onSelectTab, teacherFirstName]);

  const prevTourStep = useCallback(() => {
    if (tourStepIndex > 0) {
      const prevIdx = tourStepIndex - 1;
      setTourStepIndex(prevIdx);
      const step = YACITA_TOUR_STEPS[prevIdx];
      onSelectTab(step.tab);
      setBubbleText(`${step.title}: ${step.message}\n\n${step.tip}`);
    }
  }, [tourStepIndex, onSelectTab]);

  const skipTour = useCallback(() => {
    setIsTourActive(false);
    localStorage.setItem('denzil_yacita_tour_done', 'true');
    setBubbleText(`Entendido, profe ${teacherFirstName}. Siempre que desees repasar puedes pulsar «Hacer un recorrido». ¡Estoy lista para ayudarte! 😊`);
  }, [teacherFirstName]);

  // Highlight active tour element
  useEffect(() => {
    if (!isTourActive) {
      document.querySelectorAll('.tour-highlight-active').forEach((el) => {
        el.classList.remove('tour-highlight-active');
      });
      return;
    }

    const currentStep = YACITA_TOUR_STEPS[tourStepIndex];
    if (currentStep) {
      document.querySelectorAll('.tour-highlight-active').forEach((el) => {
        el.classList.remove('tour-highlight-active');
      });
      const target = document.getElementById(currentStep.targetId);
      if (target) {
        target.classList.add('tour-highlight-active');
      }
    }

    return () => {
      document.querySelectorAll('.tour-highlight-active').forEach((el) => {
        el.classList.remove('tour-highlight-active');
      });
    };
  }, [isTourActive, tourStepIndex]);

  // Toggle mute
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('denzil_yacita_muted', String(next));
    if (next) {
      setIsBubbleVisible(false);
    }
  };

  // Scroll chat
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isChatOpen, messages]);

  // Handle chat submission
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
    setReaction('speaking');

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
      setReaction('idle');
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

  // Determine current animation class for Yacita avatar
  const avatarAnimationClass = useMemo(() => {
    if (reaction === 'celebrate') return 'animate-yacita-celebrate';
    if (reaction === 'support') return 'animate-yacita-support';
    if (reaction === 'speaking' || isTyping) return 'animate-yacita-speaking';
    return 'animate-yacita-idle';
  }, [reaction, isTyping]);

  // Periodic natural blinking
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 220);
    }, 4500);
    return () => clearInterval(blinkInterval);
  }, []);

  // Compute active expressive pose image
  const activeYacitaImg = useMemo(() => {
    if (isLoading) return yacitaPensando;
    if (reaction === 'celebrate') return yacitaCelebrando;
    if (reaction === 'support') return yacitaEmpatica;
    if (isTourActive) return yacitaSenalando;
    if (currentTab === 'students' && isBubbleVisible) return yacitaApuntando;
    if (reaction === 'speaking' || isTyping) return yacitaHablando;
    if (isBlinking) return yacitaParpadeo;
    return yacitaIdle;
  }, [isLoading, reaction, isTourActive, currentTab, isBubbleVisible, isTyping, isBlinking]);

  // Avoid SSR portal issues
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="region"
      aria-label="Asistente Pedagógica Yacita"
      className="no-print fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] pointer-events-none flex flex-col items-end select-none"
    >
      {/* SPARKLES CELEBRATION EFFECT */}
      {reactionSparkles && (
        <div className="absolute -top-12 -left-8 right-0 flex items-center justify-center gap-2 pointer-events-none animate-bounce text-xl">
          <span>✨</span>
          <span>⭐</span>
          <span>🎉</span>
          <span>⭐</span>
          <span>✨</span>
        </div>
      )}

      {/* SPEECH BUBBLE (FLOATS ABOVE / TO THE LEFT OF YACITA) */}
      {isBubbleVisible && !isMuted && !isChatOpen && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto mb-3 max-w-[290px] sm:max-w-[340px] rounded-2xl bg-white dark:bg-[#0f1b3b] text-slate-900 dark:text-slate-100 p-3.5 shadow-2xl border border-amber-300/80 dark:border-amber-600/50 text-xs sm:text-[13px] leading-relaxed relative animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Header of bubble */}
          <div className="flex items-center justify-between gap-2 border-b border-amber-200/60 dark:border-slate-800 pb-1.5 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span>Yacita · Tu compañera</span>
              {isTourActive && (
                <span className="text-[10px] px-1.5 py-0.2 bg-amber-500 text-white rounded-full font-bold">
                  Paso {tourStepIndex + 1}/4
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleMute}
                title="Silenciar globos automáticos"
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <VolumeX className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsBubbleVisible(false)}
                title="Cerrar mensaje"
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body message with typing cursor */}
          <div className="whitespace-pre-line text-slate-800 dark:text-slate-200 font-medium">
            {displayedBubbleText}
            {isTyping && <span className="inline-block w-1.5 h-3 ml-0.5 bg-amber-500 animate-pulse" />}
          </div>

          {/* TOUR CONTROLS OR QUICK ACTION BUTTONS */}
          {isTourActive ? (
            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={skipTour}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1 rounded"
              >
                Omitir
              </button>
              <div className="flex items-center gap-1">
                {tourStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={prevTourStep}
                    className="flex items-center gap-0.5 text-[11px] font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span>Atrás</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={nextTourStep}
                  className="flex items-center gap-0.5 text-[11px] font-bold px-2.5 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white shadow-xs"
                >
                  <span>{tourStepIndex === YACITA_TOUR_STEPS.length - 1 ? '¡Listo! 🎉' : 'Siguiente'}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={startTour}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors"
              >
                <Compass className="w-3 h-3 text-amber-600" />
                <span>Hacer un recorrido</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onSelectTab('students');
                  if (onOpenAddStudent) onOpenAddStudent();
                  else {
                    const addBtn = document.querySelector('button[title*="Registrar"]') as HTMLElement;
                    addBtn?.click();
                  }
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 hover:bg-blue-100 transition-colors"
              >
                <span>Registrar un estudiante</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('matrix')}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
              >
                <span>Evaluar hoy la Matriz</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('reports')}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 transition-colors"
              >
                <span>Ver reportes</span>
              </button>
            </div>
          )}

          {/* Speech bubble pointer notch */}
          <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white dark:bg-[#0f1b3b] border-r border-b border-amber-300/80 dark:border-amber-600/50 transform rotate-45" />
        </div>
      )}

      {/* CHAT PANEL SLIDE-OUT WITH YACITA */}
      {isChatOpen && (
        <aside
          role="dialog"
          aria-label="Panel de conversación con Yacita"
          className="pointer-events-auto mb-3 w-[92vw] sm:w-[410px] max-h-[82vh] flex flex-col rounded-2xl shadow-2xl border transition-all duration-300 animate-in fade-in zoom-in-95 bg-white text-slate-900 border-slate-200 dark:bg-[#0d162d] dark:text-slate-100 dark:border-blue-900 overflow-hidden"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-blue-950 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                <img
                  src={yacitaSaludo}
                  alt="Yacita"
                  className="w-full h-full object-contain"
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
                  Compañera Pedagógica · I.E. Denzil Escolar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={startTour}
                title="Iniciar recorrido guiado"
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Compass className="w-4 h-4" />
              </button>
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
          </div>

          {/* CHAT MESSAGES BODY */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs sm:text-[13px] bg-slate-50/70 dark:bg-[#070e20]/60 max-h-[50vh]">
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
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5 cursor-pointer"
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
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-0.5 cursor-pointer"
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
                <span>Yacita está redactando con enfoque formativo...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* QUICK SUGGESTIONS CAROUSEL */}
          <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d162d]">
            <div className="flex items-center justify-between mb-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-amber-500" />
                <span>Preguntas rápidas para el aula:</span>
              </span>
              <button
                type="button"
                onClick={startTour}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
              >
                <Compass className="w-2.5 h-2.5" />
                <span>Reiniciar recorrido</span>
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {QUICK_QUESTIONS.slice(0, 3).map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  disabled={isLoading}
                  className="text-left text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131f42]/70 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-between gap-1 group cursor-pointer"
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
              className="p-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white shadow-xs transition-colors shrink-0 cursor-pointer"
              title="Enviar consulta"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
      )}

      {/* YACITA AVATAR - ALWAYS VISIBLE, 100-120px DESKTOP / 80-90px MOBILE */}
      {/* NO CIRCLE CLIPPING, FULL CURLY HAIR, HANDS ON CHEEKS, RED SWEATER VISIBLE */}
      <div className="pointer-events-auto flex flex-col items-center group relative">
        {/* Toggle Mobile Minimize / Expand */}
        <button
          type="button"
          onClick={() => setIsMobileMinimized(!isMobileMinimized)}
          className="sm:hidden absolute -top-2 -left-2 z-10 p-1 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 shadow-md text-[10px]"
          title={isMobileMinimized ? 'Expandir Yacita' : 'Minimizar Yacita'}
        >
          {isMobileMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
        </button>

        {isMobileMinimized ? (
          /* Mobile Minimized Badge */
          <button
            type="button"
            onClick={() => {
              setIsMobileMinimized(false);
              setIsBubbleVisible(true);
            }}
            className="w-12 h-12 rounded-full border-2 border-amber-400 bg-white dark:bg-[#0f1b3b] shadow-xl overflow-hidden flex items-center justify-center transition-transform hover:scale-105"
            title="Tocar para hablar con Yacita"
          >
            <img src={yacitaIdle} alt="Yacita" className="w-full h-full object-contain" />
          </button>
        ) : (
          /* Full Avatar Representation */
          <div className="flex flex-col items-center">
            {/* Halo behind */}
            <div className="absolute inset-0 rounded-full bg-amber-400/20 dark:bg-amber-400/25 blur-xl -z-10 scale-95 animate-yacita-halo" />

            {/* Clickable Avatar Figure */}
            <button
              type="button"
              onClick={() => {
                setIsChatOpen(!isChatOpen);
                setIsBubbleVisible(false);
              }}
              onMouseEnter={() => {
                if (!isBubbleVisible && !isChatOpen && !isMuted) {
                  setIsBubbleVisible(true);
                }
              }}
              className={`relative cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-hidden ${avatarAnimationClass}`}
              title="Toca a Yacita para abrir el chat pedagógico"
              aria-label="Abrir asistente pedagógica Yacita"
            >
              <img
                src={activeYacitaImg}
                alt="Yacita"
                className="w-[84px] h-[84px] sm:w-[112px] sm:h-[112px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.22)] select-none pointer-events-none"
                draggable={false}
              />

              {/* Online indicator */}
              <span className="absolute bottom-1 right-2 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-xs animate-pulse" />
            </button>

            {/* Elliptical shadow on floor */}
            <div className="w-14 sm:w-16 h-2 bg-black/25 dark:bg-black/50 rounded-full blur-[2px] mt-[-2px] animate-yacita-shadow pointer-events-none" />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
});
