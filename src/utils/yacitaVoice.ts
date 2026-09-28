export interface YacitaEventDetail {
  type: 'celebrate' | 'support' | 'student-saved' | 'student-modal-opened' | 'student-modal-closed' | 'matrix-logrado' | 'matrix-support' | 'custom';
  message?: string;
  studentName?: string;
  criterion?: string;
}

export function getTeacherFirstName(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') return 'Colega';
  // Strip professional prefixes (Lic., Lic, Prof., Profe, Dr., Dra., Ing., etc.)
  const cleaned = fullName
    .replace(/^(licenciado|licenciada|lic\.|lic|profesor|profesora|prof\.|prof|profe|doctor|doctora|dr\.|dra\.|ing\.|ing)\s+/i, '')
    .trim();
  const parts = cleaned.split(/\s+/);
  return parts[0] || 'Colega';
}

export function getTimeGreeting(firstName: string): string {
  const hour = new Date().getHours();
  let timeStr = 'Buenos días';
  if (hour >= 12 && hour < 18) {
    timeStr = 'Buenas tardes';
  } else if (hour >= 18 || hour < 5) {
    timeStr = 'Buenas noches';
  }
  return `¡${timeStr}, profe ${firstName}!`;
}

export function getWelcomeGreeting(fullName: string): string {
  const firstName = getTeacherFirstName(fullName);
  return `¡Hola, profe ${firstName}! Soy Yacita, tu compañera para el seguimiento conductual. ¿Empezamos? 😊`;
}

export function emitYacitaEvent(detail: YacitaEventDetail): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('yacita-event', { detail }));
  }
}

export interface TourStep {
  tab: 'students' | 'matrix' | 'abc' | 'reports';
  title: string;
  message: string;
  targetId: string;
  tip: string;
}

export const YACITA_TOUR_STEPS: TourStep[] = [
  {
    tab: 'students',
    title: '1. Estudiantes y Directorio',
    message: 'Aquí gestionas tu lista de estudiantes. Puedes matricular nuevos alumnos, registrar datos de sus acudientes y consignar observaciones médicas o sensoriales para orientar su acompañamiento en el aula.',
    targetId: 'nav-tab-students',
    tip: '💡 Consejo: El nombre del acudiente y el grado son obligatorios para generar los reportes formales.',
  },
  {
    tab: 'matrix',
    title: '2. Matriz Grupal en 1 Clic',
    message: 'En esta cuadrícula evalúas a todo el curso en segundos según 4 criterios clave: Convivencia armónica (C1), Escucha atenta (C2), Trabajo en equipo (C3) y Cuidado de materiales (C4).',
    targetId: 'nav-tab-matrix',
    tip: '⭐ Convenciones: 3★ Logrado (Verde), 2★ En Proceso (Ámbar) y 1★ Requiere Apoyo (Rojo). ¡Usa «Marcar Todos Logrado» para agilizar!',
  },
  {
    tab: 'abc',
    title: '3. Registro Conductual y TDR (A-B-C)',
    message: 'Cuando ocurra una desregulación conductual, aquí aplicas el modelo formativo A-B-C: registras el Antecedente detonante (A), describes la Conducta observable (B) y acuerdas una Consecuencia restaurativa (C).',
    targetId: 'nav-tab-abc',
    tip: '✨ Yacita IA te ayuda con los botones «✨ Mejorar redacción» y «💡 Sugerir plan restaurativo» sin estigmatizar.',
  },
  {
    tab: 'reports',
    title: '4. Reportes Oficiales y Google Drive',
    message: 'Genera las actas y Tarjetas Diarias de Reporte (TDR) con el escudo oficial de la I.E. Denzil Escolar. Puedes descargarlas en Word (.docx) tamaño Carta, imprimirlas en PDF o sincronizarlas con Google Drive.',
    targetId: 'nav-tab-reports',
    tip: '🪄 ¡Usa el botón «🪄 Redactar informe para acudiente con Yacita» para crear un resumen cálido y propositivo para la familia!',
  },
];
