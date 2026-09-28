export type ShiftType = 'Mañana' | 'Tarde';

export interface Student {
  id: string;
  fullName: string;
  grade: string;
  shift: ShiftType;
  guardianName: string;
  contactPhone: string;
  medicalSensoryNotes: string;
  createdAt: string;
}

export type ScoreLevel = 1 | 2 | 3; // 3: Logrado (3★), 2: En Proceso (2★), 1: Requiere Acompañamiento (1★)

export interface DailyCriterionScore {
  studentId: string;
  date: string; // YYYY-MM-DD
  c1: ScoreLevel; // Respeto de turnos y escucha atenta
  c2: ScoreLevel; // Trabajo y permanencia en la actividad escolar
  c3: ScoreLevel; // Seguimiento de instrucciones del docente
  c4: ScoreLevel; // Uso adecuado y cuidado de materiales y entorno
  notes?: string;
  updatedAt?: string;
}

export interface ABCIncident {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  shift: ShiftType;
  date: string;
  time: string;
  subject: string;
  // [A] Antecedente / Meta esperada
  expectedBehavior: string;
  expectedBehaviorStars: number; // 1 to 5
  trigger: string;
  triggerOther?: string;
  // [B] Conducta observada
  observedBehaviors: string[];
  otherBehaviorDetail?: string;
  // [C] Consecuencia / Plan Regulador
  regulatoryActions: string[];
  restorativeAgreement: string;
  teacherObservations: string;
  // Firmas y compromisos
  teacherName: string;
  guardianSigned: boolean;
  studentCommitted: boolean;
  createdAt: string;
}

export interface TeacherProfile {
  name: string;
  email: string;
  role: string;
  gradeAssigned: string;
  shift: ShiftType;
  sede: string;
  isGoogleConnected: boolean;
  googleAvatar?: string;
}

export const CRITERIA_DEFINITIONS = [
  {
    id: 'c1' as const,
    title: 'Respeto de turnos y escucha atenta',
    short: 'Escucha y Turnos',
    desc: 'Escucha con atención las explicaciones, espera su turno para participar y respeta el turno de palabra de sus compañeros.',
  },
  {
    id: 'c2' as const,
    title: 'Trabajo y permanencia en la actividad escolar',
    short: 'Permanencia y Tarea',
    desc: 'Permanece en su puesto de trabajo, enfoca su atención en la tarea asignada y completa los objetivos de la clase.',
  },
  {
    id: 'c3' as const,
    title: 'Seguimiento de instrucciones del docente',
    short: 'Instrucciones',
    desc: 'Atiende a las pautas pedagógicas a la primera indicación y acata normas de convivencia pacífica.',
  },
  {
    id: 'c4' as const,
    title: 'Uso adecuado y cuidado de materiales y entorno',
    short: 'Materiales y Entorno',
    desc: 'Mantiene en buen estado útiles escolares propios y ajenos, conserva el pupitre y cuida los recursos del aula.',
  },
];

export const COMMON_TRIGGERS = [
  'Transición entre clases o espacios',
  'Tarea individual prolongada o monótona',
  'Sobrecarga de calor / fatiga motriz',
  'Discusión o choque verbal con un par',
  'Ruido excesivo o saturación sensorial',
  'Frustración ante dificultad en la guía',
  'Hambre / Necesidad biológica no satisfecha',
  'Otro detonante específico',
];

export const COMMON_BEHAVIORS = [
  'Agresión física a un par o adulto',
  'Escape / Salida del aula sin autorización',
  'Lanzamiento de objetos o útiles escolares',
  'Desregulación verbal / Gritos o burlas',
  'Desconexión / Negativa persistente a la actividad',
  'Interrupción continua e invasión del espacio ajeno',
  'Deterioro o rayado de pupitre/cuadernos',
];

export const COMMON_REGULATORY_ACTIONS = [
  'Recreo estructurado / mediado (sustituye recreo libre para evitar fricción)',
  'Merienda acompañada con diálogo formativo y de escucha reflexiva',
  'Pausa reguladora en rincón de la calma (hidratación, respiración guiada)',
  'Actividad motora de descarga dirigida (ayudante en organización de materiales, estiramiento)',
  'Incorporación progresiva y guiada al juego con pares supervisado',
  'Acuerdo de convivencia / Reparación del material o disculpa restaurativa',
  'Lectura reflexiva guiada sobre empatía y autorregulación',
];
