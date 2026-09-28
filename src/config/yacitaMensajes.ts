// src/config/yacitaMensajes.ts
// Centralized message catalog for Yacita Pedagogical Coach.
// No messages should be hardcoded in individual UI components.

export type YacitaMood =
  | 'idle'
  | 'hablando'
  | 'empatica'
  | 'celebrando'
  | 'senalando'
  | 'pulgar_arriba'
  | 'apuntando_notas'
  | 'pensando'
  | 'saludo';

export interface YacitaActionButton {
  label: string;
  actionId: string;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

export interface YacitaMessageItem {
  id: string;
  context: string;
  texto: string; // May contain template placeholders like {nombre}, {studentName}
  estado: YacitaMood;
  priority: number; // 3: user event (highest), 2: form guidance, 1: periodic tip
  botones?: YacitaActionButton[];
}

export function formatYacitaText(
  template: string,
  variables: { nombre?: string; studentName?: string; [key: string]: string | undefined }
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
  }
  return result;
}

// 1. BIENVENIDA & SALUDOS POR HORA DEL DÍA
export const YACITA_GREETINGS = {
  manana: {
    id: 'greeting_morning',
    context: 'login',
    texto: '¡Buenos días, profe {nombre}! Lista para acompañarte hoy con el registro pedagógico. ☀️',
    estado: 'saludo' as YacitaMood,
    priority: 3,
  },
  tarde: {
    id: 'greeting_afternoon',
    context: 'login',
    texto: '¡Buenas tardes, profe {nombre}! Sigamos fortaleciendo la convivencia en el aula. 🌤️',
    estado: 'saludo' as YacitaMood,
    priority: 3,
  },
  noche: {
    id: 'greeting_evening',
    context: 'login',
    texto: '¡Buenas noches, profe {nombre}! Aquí estoy para apoyarte a cerrar tus reportes del día. 🌙',
    estado: 'saludo' as YacitaMood,
    priority: 3,
  },
};

// 2. EXPLICACIONES POR PESTAÑA (Primera vez por sesión vs Aviso Corto)
export const TAB_MESSAGES = {
  students: {
    firstTime: {
      id: 'tab_students_first',
      context: 'tab_students',
      texto: '¡Hola {nombre}! En Estudiantes gestionas matrícula, acudientes y observaciones médicas del curso.',
      estado: 'senalando' as YacitaMood,
      priority: 2,
    },
    short: {
      id: 'tab_students_short',
      context: 'tab_students',
      texto: 'Directorio de estudiantes de la I.E. Denzil Escolar. ¿Registramos a alguien hoy, {nombre}?',
      estado: 'idle' as YacitaMood,
      priority: 2,
    },
  },
  matrix: {
    firstTime: {
      id: 'tab_matrix_first',
      context: 'tab_matrix',
      texto: '{nombre}, evalúa en 1 clic los 4 criterios de convivencia diaria: armónica, escucha, equipo y materiales.',
      estado: 'apuntando_notas' as YacitaMood,
      priority: 2,
    },
    short: {
      id: 'tab_matrix_short',
      context: 'tab_matrix',
      texto: 'Matriz de convivencia diaria. Puedes usar «Marcar Todos Logrado» para agilizar tu jornada.',
      estado: 'pulgar_arriba' as YacitaMood,
      priority: 2,
    },
  },
  abc: {
    firstTime: {
      id: 'tab_abc_first',
      context: 'tab_abc',
      texto: 'En Registro A-B-C documentas el Antecedente (A), la Conducta (B) y la Consecuencia formativa (C).',
      estado: 'apuntando_notas' as YacitaMood,
      priority: 2,
    },
    short: {
      id: 'tab_abc_short',
      context: 'tab_abc',
      texto: 'Registro conductual A-B-C. Enfoquémonos en acuerdos restaurativos sin culpabilizar.',
      estado: 'empatica' as YacitaMood,
      priority: 2,
    },
  },
  reports: {
    firstTime: {
      id: 'tab_reports_first',
      context: 'tab_reports',
      texto: 'Genera las actas y Tarjetas TDR oficiales en Word y PDF con el membrete de la institución.',
      estado: 'pulgar_arriba' as YacitaMood,
      priority: 2,
    },
    short: {
      id: 'tab_reports_short',
      context: 'tab_reports',
      texto: 'Reportes oficiales con membrete legal. Puedes descargar en Word, PDF o sincronizar en Drive.',
      estado: 'senalando' as YacitaMood,
      priority: 2,
    },
  },
};

// 3. MENSAJES DE APERTURA DE MODALES
export const MODAL_MESSAGES = {
  add_student: {
    id: 'modal_add_student',
    context: 'modal_student_form',
    texto: 'Te acompaño paso a paso, {nombre}. Empecemos por el nombre completo.',
    estado: 'apuntando_notas' as YacitaMood,
    priority: 3,
  },
  edit_student: {
    id: 'modal_edit_student',
    context: 'modal_student_form',
    texto: 'Actualicemos los datos con cuidado, {nombre}. Puedes ajustar acudiente y observaciones.',
    estado: 'apuntando_notas' as YacitaMood,
    priority: 3,
  },
  delete_student: {
    id: 'modal_delete_student',
    context: 'modal_delete',
    texto: 'Paso delicado, {nombre}. Recuerda que eliminar al estudiante borrará también su historial.',
    estado: 'empatica' as YacitaMood,
    priority: 3,
  },
  tdr_report: {
    id: 'modal_tdr_report',
    context: 'modal_report',
    texto: 'Aquí está la vista previa oficial con cabezote y pie institucional en cada página.',
    estado: 'pulgar_arriba' as YacitaMood,
    priority: 3,
  },
  drive_sync: {
    id: 'modal_drive_sync',
    context: 'modal_drive',
    texto: '{nombre}, puedes respaldar la información escolar en Google Drive con total seguridad.',
    estado: 'senalando' as YacitaMood,
    priority: 3,
  },
  google_account: {
    id: 'modal_google_account',
    context: 'modal_account',
    texto: 'Aquí configuras tu perfil docente y correo institucional de la I.E. Denzil Escolar.',
    estado: 'pulgar_arriba' as YacitaMood,
    priority: 3,
  },
};

// 4. EVENTOS DE ACCIÓN Y CELEBRACIÓN
export const ACTION_EVENTS = {
  mark_all_logrado: {
    id: 'action_mark_all_logrado',
    context: 'matrix_action',
    texto: '¡Excelente, {nombre}! Registraste convivencia armónica en 3★ para todo el grupo.',
    estado: 'celebrando' as YacitaMood,
    priority: 3,
  },
  reached_100_percent: {
    id: 'action_reached_100',
    context: 'matrix_action',
    texto: '¡100% de la matriz calificada para hoy! Tu dedicación pedagógica hace la diferencia, {nombre}. ⭐',
    estado: 'celebrando' as YacitaMood,
    priority: 3,
  },
  need_support_alert: {
    id: 'action_need_support',
    context: 'matrix_support',
    texto: 'Hay estudiantes en 1★ o 2★. Te acompaño con sugerencias restaurativas con diálogo formativo.',
    estado: 'empatica' as YacitaMood,
    priority: 3,
  },
  report_generated: {
    id: 'action_report_generated',
    context: 'report_action',
    texto: '¡Documento oficial listo con membrete legal (Sello y CAT) y pie de página en cada hoja!',
    estado: 'pulgar_arriba' as YacitaMood,
    priority: 3,
  },
  drive_saved: {
    id: 'action_drive_saved',
    context: 'drive_action',
    texto: '¡Respaldo guardado exitosamente en Google Drive! La información de tu aula está segura.',
    estado: 'celebrando' as YacitaMood,
    priority: 3,
  },
  student_saved: {
    id: 'action_student_saved',
    context: 'student_action',
    texto: '¡Bravo {nombre}! Registramos a {studentName} con éxito. 🎉 Ya puedes evaluar su convivencia.',
    estado: 'celebrando' as YacitaMood,
    priority: 3,
  },
};

// 5. GUÍA PASO A PASO EN FORMULARIO DE ESTUDIANTE
export const STUDENT_FORM_FIELD_TIPS = {
  fullName: {
    id: 'field_fullName',
    context: 'student_form',
    texto: 'Ingresa nombres y apellidos completos. Ej: Jhoan David Redondo Uriana.',
    estado: 'apuntando_notas' as YacitaMood,
    priority: 2,
  },
  fullName_duplicate: {
    id: 'field_fullName_duplicate',
    context: 'student_form',
    texto: 'Aviso, {nombre}: ya existe un estudiante con un nombre similar en el sistema.',
    estado: 'empatica' as YacitaMood,
    priority: 2,
  },
  grade: {
    id: 'field_grade',
    context: 'student_form',
    texto: 'Indica el grado y grupo en formato estándar (ej: 1-01, 1-02). Puedes elegir una sugerencia.',
    estado: 'senalando' as YacitaMood,
    priority: 2,
  },
  shift: {
    id: 'field_shift',
    context: 'student_form',
    texto: 'Selecciona la jornada escolar (Mañana o Tarde) según el horario habitual del grupo.',
    estado: 'idle' as YacitaMood,
    priority: 2,
  },
  guardianName: {
    id: 'field_guardianName',
    context: 'student_form',
    texto: 'Nombre del acudiente responsable. Esencial para firmas de actas y contacto familiar.',
    estado: 'apuntando_notas' as YacitaMood,
    priority: 2,
  },
  contactPhone: {
    id: 'field_contactPhone',
    context: 'student_form',
    texto: 'Número de celular (10 dígitos, inicia con 3). Se formatea automáticamente.',
    estado: 'senalando' as YacitaMood,
    priority: 2,
  },
  contactPhone_error: {
    id: 'field_contactPhone_error',
    context: 'student_form',
    texto: 'Verifica el número: debe tener exactamente 10 dígitos y comenzar por 3.',
    estado: 'empatica' as YacitaMood,
    priority: 2,
  },
  medicalSensoryNotes: {
    id: 'field_medicalSensoryNotes',
    context: 'student_form',
    texto: 'Observación médica o sensorial previa (visión, descansos motrices o sensibilidad al ruido).',
    estado: 'apuntando_notas' as YacitaMood,
    priority: 2,
  },
};

// 6. CONSEJOS PERIÓDICOS (Cada 45–90s si el usuario no escribe)
export const PERIODIC_TIPS_BY_TAB: Record<string, YacitaMessageItem[]> = {
  students: [
    {
      id: 'tip_students_guardian',
      context: 'tab_students',
      texto: 'Un acudiente bien registrado facilita el acompañamiento pedagógico en caso de incidentes.',
      estado: 'pulgar_arriba',
      priority: 1,
    },
    {
      id: 'tip_students_sensory',
      context: 'tab_students',
      texto: 'Registrar sensibilidades sensoriales ayuda a anticipar y prevenir desregulaciones en clase.',
      estado: 'apuntando_notas',
      priority: 1,
    },
    {
      id: 'tip_students_groups',
      context: 'tab_students',
      texto: 'Puedes filtrar a tus estudiantes por grupo o jornada usando los selectores superiores.',
      estado: 'senalando',
      priority: 1,
    },
  ],
  matrix: [
    {
      id: 'tip_matrix_scale',
      context: 'tab_matrix',
      texto: 'Convenciones: 3★ Logrado (Verde), 2★ En Proceso (Ámbar) y 1★ Requiere Apoyo (Rojo).',
      estado: 'pulgar_arriba',
      priority: 1,
    },
    {
      id: 'tip_matrix_quick',
      context: 'tab_matrix',
      texto: '¿Todo el grupo tuvo un buen inicio? Usa «Marcar Todos Logrado» y ajusta casos puntuales.',
      estado: 'celebrando',
      priority: 1,
    },
    {
      id: 'tip_matrix_notes',
      context: 'tab_matrix',
      texto: 'Haz clic en el ícono de libreta para agregar notas formativas específicas de la fecha.',
      estado: 'apuntando_notas',
      priority: 1,
    },
  ],
  abc: [
    {
      id: 'tip_abc_antecedent',
      context: 'tab_abc',
      texto: 'Identificar el detonante (A) permite diseñar entornos de aprendizaje más predecibles.',
      estado: 'pensando',
      priority: 1,
    },
    {
      id: 'tip_abc_behavior',
      context: 'tab_abc',
      texto: 'Describe la conducta (B) de manera neutral y observable, sin calificativos negativos.',
      estado: 'apuntando_notas',
      priority: 1,
    },
    {
      id: 'tip_abc_restorative',
      context: 'tab_abc',
      texto: 'La consecuencia (C) debe reparar el daño y reintegrar al estudiante positivamente.',
      estado: 'empatica',
      priority: 1,
    },
  ],
  reports: [
    {
      id: 'tip_reports_letterhead',
      context: 'tab_reports',
      texto: 'Todos los reportes oficiales llevan Sello Denzil a la izquierda y Logo CAT a la derecha.',
      estado: 'pulgar_arriba',
      priority: 1,
    },
    {
      id: 'tip_reports_formats',
      context: 'tab_reports',
      texto: 'Puedes exportar en Word (.docx) o en PDF oficial tamaño Carta con membrete intacto.',
      estado: 'senalando',
      priority: 1,
    },
    {
      id: 'tip_reports_family',
      context: 'tab_reports',
      texto: 'El botón de redactar informe para acudientes genera un resumen cálido y constructivo.',
      estado: 'celebrando',
      priority: 1,
    },
  ],
};
