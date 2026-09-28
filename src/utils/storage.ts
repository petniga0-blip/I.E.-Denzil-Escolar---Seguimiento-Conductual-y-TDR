import { Student, DailyCriterionScore, ABCIncident, TeacherProfile } from '../types';

const STORAGE_KEYS = {
  STUDENTS: 'denzil_students_v1',
  SCORES: 'denzil_scores_v1',
  INCIDENTS: 'denzil_incidents_v1',
  TEACHER: 'denzil_teacher_v1',
  THEME: 'denzil_theme_v1',
};

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std-001',
    fullName: 'Jhoan David Redondo Uriana',
    grade: '1-01',
    shift: 'Mañana',
    guardianName: 'Marta Uriana Epieyú',
    contactPhone: '312 458 9012',
    medicalSensoryNotes: 'Sensibilidad a ruidos fuertes repentinos. Responde positivamente a pausas activas breves.',
    createdAt: '2026-02-05T07:30:00Z',
  },
  {
    id: 'std-002',
    fullName: 'Valery Sofia Ibarra Gomez',
    grade: '1-01',
    shift: 'Mañana',
    guardianName: 'Carlos Ibarra Mendoza',
    contactPhone: '301 789 2341',
    medicalSensoryNotes: 'Ninguna novedad sensorial. Estudiante proactiva y comunicativa.',
    createdAt: '2026-02-05T07:32:00Z',
  },
  {
    id: 'std-003',
    fullName: 'Marlon Jose Pushaina Cuadrado',
    grade: '1-01',
    shift: 'Mañana',
    guardianName: 'Ana Pushaina',
    contactPhone: '315 672 8840',
    medicalSensoryNotes: 'Fatiga motriz por calor en horas del mediodía; requiere hidratación frecuente.',
    createdAt: '2026-02-05T07:35:00Z',
  },
  {
    id: 'std-004',
    fullName: 'Keyla Patricia Barros Medina',
    grade: '1-01',
    shift: 'Mañana',
    guardianName: 'Patricia Medina Ramos',
    contactPhone: '320 891 3412',
    medicalSensoryNotes: 'Uso de lentes formulados. Dificultad para lectura prolongada de tableros lejanos.',
    createdAt: '2026-02-05T07:40:00Z',
  },
  {
    id: 'std-005',
    fullName: 'Santiago Andrés Gnecco Iguarán',
    grade: '1-02',
    shift: 'Tarde',
    guardianName: 'Luz Marina Iguarán',
    contactPhone: '318 554 9901',
    medicalSensoryNotes: 'Le cuesta esperar turnos en momentos de juegos competitivos.',
    createdAt: '2026-02-05T07:42:00Z',
  },
];

export const INITIAL_TEACHER: TeacherProfile = {
  name: 'Lic. Marielis E. Cotes Benjumea',
  email: 'marielis.cotes@denzilescolar.edu.co',
  role: 'Docente de Aula / Orientadora Formativa',
  gradeAssigned: '1-01',
  shift: 'Mañana',
  sede: 'Sede Principal - Cra 7h No 57-44 Barrio La Mano De Dios',
  isGoogleConnected: true,
  googleAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
};

const getTodayString = () => new Date().toISOString().split('T')[0];

export const INITIAL_SCORES: DailyCriterionScore[] = [
  {
    studentId: 'std-001',
    date: getTodayString(),
    c1: 3,
    c2: 2,
    c3: 3,
    c4: 3,
    notes: 'Buen trabajo en lenguaje; necesitó apoyo breve para completar la guía matemática.',
  },
  {
    studentId: 'std-002',
    date: getTodayString(),
    c1: 3,
    c2: 3,
    c3: 3,
    c4: 3,
    notes: 'Comportamiento ejemplar y colaborativo en todo momento.',
  },
  {
    studentId: 'std-003',
    date: getTodayString(),
    c1: 2,
    c2: 1,
    c3: 2,
    c4: 2,
    notes: 'Manifestó inquietud motora antes del descanso. Se aplicó pausa reguladora con hidratación.',
  },
  {
    studentId: 'std-004',
    date: getTodayString(),
    c1: 3,
    c2: 3,
    c3: 3,
    c4: 2,
    notes: 'Excelente disposición al diálogo reflexivo.',
  },
];

export const INITIAL_INCIDENTS: ABCIncident[] = [
  {
    id: 'inc-001',
    studentId: 'std-003',
    studentName: 'Marlon Jose Pushaina Cuadrado',
    grade: '1-01',
    shift: 'Mañana',
    date: getTodayString(),
    time: '09:45',
    subject: 'Matemáticas / Guía Individual',
    expectedBehavior: 'Completar los tres ejercicios de la guía y permanecer en su pupitre',
    expectedBehaviorStars: 2,
    trigger: 'Tarea individual prolongada o monótona',
    triggerOther: '',
    observedBehaviors: [
      'Lanzamiento de objetos o útiles escolares',
      'Desconexión / Negativa persistente a la actividad',
    ],
    otherBehaviorDetail: 'Arrojó la cartuchera al suelo al no lograr resolver el punto dos.',
    regulatoryActions: [
      'Pausa reguladora en rincón de la calma (hidratación, respiración guiada)',
      'Actividad motora de descarga dirigida (ayudante en organización de materiales, estiramiento)',
      'Acuerdo de convivencia / Reparación del material o disculpa restaurativa',
    ],
    restorativeAgreement: 'Marlon recogió sus útiles escolares con calma, respiró 3 veces y se acordó dividir la guía en dos partes con descanso de 2 minutos.',
    teacherObservations: 'Se evidencia mejoría rápida al validar su frustración con tono sereno. Acudiente informado vía telefónica de forma preventiva.',
    teacherName: 'Lic. Marielis E. Cotes Benjumea',
    guardianSigned: true,
    studentCommitted: true,
    createdAt: '2026-02-10T10:15:00Z',
  },
];

export function getStoredStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
      return INITIAL_STUDENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading students from localStorage', e);
    return INITIAL_STUDENTS;
  }
}

export function saveStoredStudents(students: Student[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  } catch (e) {
    console.error('Error saving students', e);
  }
}

export function getStoredScores(): DailyCriterionScore[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCORES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(INITIAL_SCORES));
      return INITIAL_SCORES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading scores', e);
    return INITIAL_SCORES;
  }
}

export function saveStoredScores(scores: DailyCriterionScore[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores));
  } catch (e) {
    console.error('Error saving scores', e);
  }
}

export function getStoredIncidents(): ABCIncident[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(INITIAL_INCIDENTS));
      return INITIAL_INCIDENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading incidents', e);
    return INITIAL_INCIDENTS;
  }
}

export function saveStoredIncidents(incidents: ABCIncident[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
  } catch (e) {
    console.error('Error saving incidents', e);
  }
}

export function getStoredTeacher(): TeacherProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEACHER);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TEACHER, JSON.stringify(INITIAL_TEACHER));
      return INITIAL_TEACHER;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_TEACHER;
  }
}

export function saveStoredTeacher(profile: TeacherProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TEACHER, JSON.stringify(profile));
  } catch (e) {
    console.error('Error saving teacher profile', e);
  }
}

export function exportBackupJSON(): void {
  const data = {
    institution: 'INSTITUCIÓN EDUCATIVA DENZIL ESCOLAR',
    dane: '144001003404',
    nit: '8250006500',
    exportDate: new Date().toISOString(),
    students: getStoredStudents(),
    scores: getStoredScores(),
    incidents: getStoredIncidents(),
    teacher: getStoredTeacher(),
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `respaldo_denzil_tdr_${getTodayString()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function importBackupJSON(file: File, onSuccess: () => void, onError: (err: string) => void): void {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const content = event.target?.result as string;
      const parsed = JSON.parse(content);
      if (parsed.students && Array.isArray(parsed.students)) {
        saveStoredStudents(parsed.students);
      }
      if (parsed.scores && Array.isArray(parsed.scores)) {
        saveStoredScores(parsed.scores);
      }
      if (parsed.incidents && Array.isArray(parsed.incidents)) {
        saveStoredIncidents(parsed.incidents);
      }
      if (parsed.teacher && typeof parsed.teacher === 'object') {
        saveStoredTeacher(parsed.teacher);
      }
      onSuccess();
    } catch (e: any) {
      onError('El archivo seleccionado no tiene un formato JSON válido de la institución.');
    }
  };
  reader.onerror = () => onError('No se pudo leer el archivo seleccionado.');
  reader.readAsText(file);
}
