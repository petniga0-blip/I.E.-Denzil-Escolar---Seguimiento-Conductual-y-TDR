// src/config/yacitaMensajes.ts
// Centralized message catalog, field guide registry and voice scripts for Yacita Pedagogical Coach.
// Strictly authentic PNG expressions - Anti-SVG compliance.

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

export type CoachingLevel = 'completo' | 'moderado' | 'silencioso';

export interface YacitaActionButton {
  label: string;
  actionId: string;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

export interface YacitaMessageItem {
  id: string;
  context: string;
  texto: string; // Template placeholders: {nombre}, {studentName}, {grade}, {shift}, etc.
  estado: YacitaMood;
  priority: number; // 4: active modal/form, 3: key action/milestone, 2: interactive element, 1: periodic tip
  botones?: YacitaActionButton[];
  allowDoNotShowAgain?: boolean;
  textoVoz?: string;
  contieneDatosPersonales?: boolean;
}

export interface CampoChipAction {
  label: string;
  value: string;
  action?: 'apply' | 'append' | 'fix_caps' | 'suggest_plan';
}

export interface GuiaCampoItem {
  id: string;
  numero?: number;
  etiqueta: string;
  funcion: string; // "Para qué sirve"
  consejos: string[]; // At least 2-3 concrete tips so "Ver otro consejo" rotates
  chips?: CampoChipAction[];
  burbujaCorta: string; // Max ~120 chars
  textoVoz?: string; // Voice-ready script (no symbols, clean pronunciation)
  contieneDatosPersonales?: boolean;
}

export interface YacitaElementMessageDef {
  context: string;
  estado: YacitaMood;
  priority?: number;
  variants: string[];
  botones?: YacitaActionButton[];
  textoVozVariants?: string[];
  contieneDatosPersonales?: boolean;
}

export function formatYacitaText(
  template: string,
  variables: Record<string, string | undefined> = {}
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
  }
  return result;
}

// Clean and normalize text for clear, natural speech synthesis in Colombian Spanish
export function cleanTextForVoice(raw: string): string {
  if (!raw) return '';
  let text = raw;

  // Grade notation: "1-01" -> "uno guion cero uno"
  text = text.replace(/(\d+)-(\d+)/g, (_match, g, gr) => {
    const numWords: Record<string, string> = {
      '0': 'cero', '1': 'uno', '2': 'dos', '3': 'tres', '4': 'cuatro',
      '5': 'cinco', '6': 'seis', '7': 'siete', '8': 'ocho', '9': 'nueve',
      '01': 'cero uno', '02': 'cero dos', '03': 'cero tres', '04': 'cero cuatro', '05': 'cero cinco',
    };
    const gWord = numWords[g] || g;
    const grWord = numWords[gr] || gr;
    return `${gWord} guion ${grWord}`;
  });

  // Common acronyms and abbreviations
  text = text.replace(/\bTDR\b/gi, 'T D R');
  text = text.replace(/\bA-B-C\b/gi, 'A, B, C');
  text = text.replace(/\bA·B·C\b/gi, 'A, B, C');
  text = text.replace(/\bI\.E\.\b/gi, 'Institución Educativa');
  text = text.replace(/\bdocente\b/gi, 'docente');
  text = text.replace(/\.docx\b/gi, 'documento Word');
  text = text.replace(/\.pdf\b/gi, 'P D F');
  text = text.replace(/\.json\b/gi, 'punto jota son');

  // Stars rating
  text = text.replace(/3★/g, 'tres estrellas logrado');
  text = text.replace(/2★/g, 'dos estrellas en proceso');
  text = text.replace(/1★/g, 'una estrella requiere apoyo');
  text = text.replace(/★/g, ' estrellas ');

  // Phone numbers formatting (e.g. 315 123 4567)
  text = text.replace(/(\d{3})\s?(\d{3})\s?(\d{4})/g, '$1, $2, $3');

  // Clean symbols and brackets
  text = text.replace(/\[✓\]/g, 'logrado');
  text = text.replace(/\[~\]/g, 'en proceso');
  text = text.replace(/\[!\]/g, 'requiere apoyo');
  text = text.replace(/[«»"'{}\[\]]/g, '');
  text = text.replace(/[*_#]/g, '');
  text = text.replace(/\s+/g, ' ').trim();

  // Strip emojis
  text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

  return text.trim();
}

// 1. BIENVENIDA & SALUDOS POR HORA DEL DÍA
export const YACITA_GREETINGS = {
  manana: {
    id: 'greeting_morning',
    context: 'login',
    texto: '¡Buenos días, profe {nombre}! Lista para acompañarte hoy con el registro pedagógico. ☀️',
    textoVoz: 'Buenos días, profe {nombre}. Lista para acompañarte hoy con el registro pedagógico.',
    estado: 'saludo' as YacitaMood,
    priority: 3,
  },
  tarde: {
    id: 'greeting_afternoon',
    context: 'login',
    texto: '¡Buenas tardes, profe {nombre}! Sigamos fortaleciendo la convivencia en el aula. 🌤️',
    textoVoz: 'Buenas tardes, profe {nombre}. Sigamos fortaleciendo la convivencia en el aula.',
    estado: 'saludo' as YacitaMood,
    priority: 3,
  },
  noche: {
    id: 'greeting_evening',
    context: 'login',
    texto: '¡Buenas noches, profe {nombre}! Aquí estoy para apoyarte a cerrar tus reportes del día. 🌙',
    textoVoz: 'Buenas noches, profe {nombre}. Aquí estoy para apoyarte a cerrar tus reportes del día.',
    estado: 'saludo' as YacitaMood,
    priority: 3,
  },
};

// 2. EXPLICACIONES POR PESTAÑA
export const TAB_MESSAGES = {
  students: {
    firstTime: {
      id: 'tab_students_first',
      context: 'tab_students',
      texto: '¡Hola {nombre}! En Estudiantes gestionas matrícula, acudientes y observaciones. Siguiente paso: pulsa una fila o nuevo alumno.',
      textoVoz: 'Hola profe {nombre}. En Estudiantes gestionas matrícula y acudientes. Siguiente paso: selecciona una fila o nuevo estudiante.',
      estado: 'senalando' as YacitaMood,
      priority: 3,
    },
    short: {
      id: 'tab_students_short',
      context: 'tab_students',
      texto: 'Directorio de estudiantes. Siguiente paso: selecciona un estudiante o pulsa «Nuevo Estudiante».',
      textoVoz: 'Directorio de estudiantes. Siguiente paso: selecciona un alumno o pulsa nuevo estudiante.',
      estado: 'idle' as YacitaMood,
      priority: 3,
    },
  },
  matrix: {
    firstTime: {
      id: 'tab_matrix_first',
      context: 'tab_matrix',
      texto: '{nombre}, evalúa aquí los 4 criterios de convivencia. Siguiente paso: marca 3★ grupal o evalúa caso por caso.',
      textoVoz: 'Profe {nombre}, evalúa aquí los cuatro criterios de convivencia. Siguiente paso: califica los criterios de tu grupo.',
      estado: 'apuntando_notas' as YacitaMood,
      priority: 3,
    },
    short: {
      id: 'tab_matrix_short',
      context: 'tab_matrix',
      texto: 'Matriz diaria. Siguiente paso: califica los criterios o usa «Marcar Todos Logrado» para agilizar.',
      textoVoz: 'Matriz diaria. Siguiente paso: califica los criterios o usa Marcar Todos Logrado para agilizar.',
      estado: 'pulgar_arriba' as YacitaMood,
      priority: 3,
    },
  },
  abc: {
    firstTime: {
      id: 'tab_abc_first',
      context: 'tab_abc',
      texto: 'En Registro A-B-C documentas Antecedente, Conducta y Consecuencia. Siguiente paso: elige el alumno e inicia acuerdos.',
      textoVoz: 'En Registro A, B, C documentas antecedente, conducta y consecuencia formativa. Siguiente paso: elige el estudiante.',
      estado: 'apuntando_notas' as YacitaMood,
      priority: 3,
    },
    short: {
      id: 'tab_abc_short',
      context: 'tab_abc',
      texto: 'Registro conductual A-B-C. Siguiente paso: define el detonante y el acuerdo formativo restaurativo.',
      textoVoz: 'Registro conductual A, B, C. Siguiente paso: define el detonante y el acuerdo formativo restaurativo.',
      estado: 'empatica' as YacitaMood,
      priority: 3,
    },
  },
  reports: {
    firstTime: {
      id: 'tab_reports_first',
      context: 'tab_reports',
      texto: 'Genera actas oficiales y TDR con membrete legal. Siguiente paso: elige el estudiante y descarga en Word o PDF.',
      textoVoz: 'Genera actas oficiales y T D R con membrete legal. Siguiente paso: elige el estudiante y descarga tu reporte.',
      estado: 'pulgar_arriba' as YacitaMood,
      priority: 3,
    },
    short: {
      id: 'tab_reports_short',
      context: 'tab_reports',
      texto: 'Centro de Reportes Oficiales. Siguiente paso: exporta en Word, PDF o respalda directo en Google Drive.',
      textoVoz: 'Centro de Reportes Oficiales. Siguiente paso: exporta en Word, P D F o respalda en Google Drive.',
      estado: 'senalando' as YacitaMood,
      priority: 3,
    },
  },
};

// 3. MENSAJES DE APERTURA DE MODALES
export const MODAL_MESSAGES = {
  add_student: {
    id: 'modal_add_student',
    context: 'modal_student_form',
    texto: 'Te acompaño paso a paso, {nombre}. Empecemos ingresando el nombre completo del estudiante.',
    textoVoz: 'Te acompaño paso a paso, profe. Empecemos ingresando el nombre completo del estudiante.',
    estado: 'apuntando_notas' as YacitaMood,
    priority: 4,
  },
  edit_student: {
    id: 'modal_edit_student',
    context: 'modal_student_form',
    texto: 'Actualicemos los datos con cuidado, {nombre}. Puedes ajustar el acudiente y observaciones.',
    textoVoz: 'Actualicemos los datos con cuidado. Puedes ajustar el acudiente y observaciones.',
    estado: 'apuntando_notas' as YacitaMood,
    priority: 4,
  },
  delete_student: {
    id: 'modal_delete_student',
    context: 'modal_delete',
    texto: 'Paso delicado, {nombre}. Eliminar al estudiante borrará su matrícula e historial. ¿Deseas continuar?',
    textoVoz: 'Paso delicado. Eliminar al estudiante borrará su matrícula e historial. Esta acción no se puede deshacer.',
    estado: 'empatica' as YacitaMood,
    priority: 4,
  },
  tdr_report: {
    id: 'modal_tdr_report',
    context: 'modal_report',
    texto: 'Aquí está la vista previa oficial con cabezote y pie institucional en cada página.',
    textoVoz: 'Aquí está la vista previa oficial con cabezote y pie institucional en cada página.',
    estado: 'pulgar_arriba' as YacitaMood,
    priority: 4,
  },
  drive_sync: {
    id: 'modal_drive_sync',
    context: 'modal_drive',
    texto: '{nombre}, aquí puedes respaldar tus registros en Google Drive.',
    textoVoz: '{nombre}, aquí puedes respaldar tus registros en Google Drive.',
    estado: 'senalando' as YacitaMood,
    priority: 4,
  },
  google_account: {
    id: 'modal_google_account',
    context: 'modal_account',
    texto: 'Aquí configuras tu perfil docente y correo institucional de la I.E. Denzil Escolar.',
    textoVoz: 'Aquí configuras tu perfil docente y correo institucional de la Institución Educativa Denzil Escolar.',
    estado: 'pulgar_arriba' as YacitaMood,
    priority: 4,
  },
};

// 4. EVENTOS DE ACCIÓN Y CELEBRACIÓN
export const ACTION_EVENTS = {
  mark_all_logrado: {
    id: 'action_mark_all_logrado',
    context: 'matrix_action',
    texto: '¡Excelente, {nombre}! Registraste convivencia armónica en 3★ para todo el grupo.',
    textoVoz: 'Excelente, profe. Registraste convivencia armónica en tres estrellas para todo el grupo.',
    estado: 'celebrando' as YacitaMood,
    priority: 3,
  },
  reached_100_percent: {
    id: 'action_reached_100',
    context: 'matrix_action',
    texto: '¡100% calificado para hoy! Tu dedicación pedagógica hace la diferencia, {nombre}. ⭐',
    textoVoz: 'Cien por ciento calificado para hoy. Tu dedicación pedagógica hace la diferencia.',
    estado: 'celebrando' as YacitaMood,
    priority: 3,
  },
  need_support_alert: {
    id: 'action_need_support',
    context: 'matrix_support',
    texto: 'Registraste 1★. Te acompaño con sugerencias de diálogo formativo y justicia restaurativa.',
    textoVoz: 'Registraste una estrella. Te acompaño con sugerencias de diálogo formativo y justicia restaurativa.',
    estado: 'empatica' as YacitaMood,
    priority: 3,
  },
  report_generated: {
    id: 'action_report_generated',
    context: 'report_action',
    texto: '¡Documento oficial generado con membrete legal (Sello y CAT) y pie de página!',
    textoVoz: 'Documento oficial generado con membrete legal y pie de página en cada hoja.',
    estado: 'pulgar_arriba' as YacitaMood,
    priority: 3,
  },
  drive_saved: {
    id: 'action_drive_saved',
    context: 'drive_action',
    texto: '¡Respaldo guardado exitosamente en Google Drive! La información de tu aula está segura.',
    textoVoz: 'Respaldo guardado exitosamente en Google Drive. La información de tu aula está segura.',
    estado: 'celebrando' as YacitaMood,
    priority: 3,
  },
  student_saved: {
    id: 'action_student_saved',
    context: 'student_action',
    texto: '¡Estudiante guardado con éxito! Ya puedes evaluar su convivencia en la Matriz.',
    textoVoz: 'Estudiante guardado con éxito. Ya puedes evaluar su convivencia en la Matriz.',
    estado: 'celebrando' as YacitaMood,
    priority: 3,
  },
};

// ═════════════════════════════════════════════════════════════════════
// PARTE 1 – GUÍA DE CADA CAMPO Y CADA ÍTEM (sección guiaCampos)
// ═════════════════════════════════════════════════════════════════════
export const GUIA_CAMPOS: Record<string, GuiaCampoItem> = {
  // --- FORMULARIO REGISTRAR / EDITAR ESTUDIANTE ---
  'field_fullName': {
    id: 'field_fullName',
    numero: 1,
    etiqueta: 'Nombre completo del estudiante',
    funcion: 'Identifica al estudiante en la matriz de convivencia, los reportes oficiales y las firmas institucionales.',
    consejos: [
      'Escribe nombres y apellidos completos como figuran en el documento de identidad o registro civil.',
      'Usa mayúsculas iniciales en cada palabra para asegurar la validez de los reportes oficiales.',
      'Verifica la ortografía de nombres indígenas o compuestos propios de la región de La Guajira.',
    ],
    chips: [
      { label: 'Corregir mayúsculas y formato', value: '__fix_caps__', action: 'fix_caps' },
    ],
    burbujaCorta: 'Nombres y apellidos completos como aparecen en el documento de identidad.',
    textoVoz: 'Ingresa nombres y apellidos completos como aparecen en el documento de identidad.',
  },
  'field_grade': {
    id: 'field_grade',
    numero: 2,
    etiqueta: 'Grado / Grupo',
    funcion: 'Organiza la Matriz Grupal y permite filtrar los salones de clase.',
    consejos: [
      'Usa el formato institucional grado-guión-grupo, por ejemplo 1-01, 1-02 o 2-01.',
      'Puedes hacer clic en cualquiera de los grupos sugeridos para asignarlo de inmediato.',
      'Agrupar correctamente a los alumnos permite calcular el semáforo de cumplimiento por salón.',
    ],
    burbujaCorta: 'Formato grado-guion-grupo, por ejemplo 1-01. Elige una de las sugerencias.',
    textoVoz: 'Indica el grado y grupo con formato grado guión grupo, por ejemplo, uno guión cero uno.',
  },
  'field_shift': {
    id: 'field_shift',
    numero: 3,
    etiqueta: 'Jornada escolar',
    funcion: 'Define el horario del estudiante y cómo se filtran los grupos en el aula de clases.',
    consejos: [
      'Selecciona Mañana o Tarde según el horario regular del curso.',
      'Te sugerimos la jornada que usan la mayoría de compañeros del mismo grado.',
      'La jornada correcta garantiza que los reportes de fin de período se emitan en la planilla debida.',
    ],
    chips: [
      { label: 'Jornada Mañana', value: 'Mañana', action: 'apply' },
      { label: 'Jornada Tarde', value: 'Tarde', action: 'apply' },
    ],
    burbujaCorta: 'Elige la jornada escolar, Mañana o Tarde, según el horario del grupo.',
    textoVoz: 'Elige la jornada escolar, mañana o tarde, según el horario del grupo.',
  },
  'field_guardianName': {
    id: 'field_guardianName',
    numero: 4,
    etiqueta: 'Nombre del acudiente / familiar',
    funcion: 'Es la persona responsable que recibe el informe formativo y firma los compromisos del TDR.',
    consejos: [
      'Escribe el nombre de la madre, padre o tutor legal autorizado para firmar compromisos.',
      'Si el estudiante tiene hermanos en el plantel, puedes vincular el acudiente ya registrado.',
      'Un acudiente bien identificado agiliza las citaciones pedagógicas y los acuerdos de aula.',
    ],
    burbujaCorta: 'Es el acudiente responsable que recibe el informe formativo y firma los compromisos.',
    textoVoz: 'Es el acudiente responsable que recibe el informe formativo y firma los compromisos.',
  },
  'field_contactPhone': {
    id: 'field_contactPhone',
    numero: 5,
    etiqueta: 'Teléfono de contacto',
    funcion: 'Se usa para citaciones pedagógicas, comunicación con la familia y seguimiento de incidencias.',
    consejos: [
      'Celular colombiano de 10 dígitos que empieza en 3. Se formatea automáticamente.',
      'Verifica que el número tenga exactamente 10 dígitos para recibir mensajes y llamadas.',
      'Si el número cambia, actualízalo de inmediato en la ficha de edición del alumno.',
    ],
    burbujaCorta: 'Celular colombiano de 10 dígitos que inicia en 3. Lo formateamos solo.',
    textoVoz: 'Ingresa el celular colombiano de diez dígitos que inicia en tres.',
  },
  'field_medicalSensoryNotes': {
    id: 'field_medicalSensoryNotes',
    numero: 6,
    etiqueta: 'Observación médica / sensorial previa',
    funcion: 'Información pedagógica que ayuda a acompañar mejor al estudiante en el aula.',
    consejos: [
      'Información sensible: escribe solo lo necesario para el acompañamiento pedagógico en clase.',
      'Ejemplos: sensibilidad al ruido, uso de lentes, descansos motrices o hidratación frecuente.',
      'Puedes usar el botón «Mejorar redacción con Yacita» para un lenguaje formal y empático.',
    ],
    chips: [
      { label: 'Sin observaciones médicas reportadas', value: 'Sin observaciones médicas reportadas', action: 'apply' },
      { label: 'Uso de lentes y ubicación preferente', value: 'Usa lentes de fórmula; requiere ubicación preferente al frente del salón.', action: 'apply' },
      { label: 'Sensibilidad a ruidos fuertes', value: 'Sensibilidad a sobrecarga auditiva; acompañar con pausas de calma.', action: 'apply' },
      { label: 'Necesidad de pausas activas motrices', value: 'Requiere pausas activas motrices breves durante tareas prolongadas.', action: 'apply' },
    ],
    burbujaCorta: 'Datos para apoyar al alumno en el aula. Escribe solo lo pedagógicamente necesario.',
    textoVoz: 'Datos para apoyar al alumno en el aula. Escribe sólo lo pedagógicamente necesario.',
  },
  'btn_student_save': {
    id: 'btn_student_save',
    etiqueta: 'Guardar Estudiante',
    funcion: 'Registra los datos del estudiante en la base local institucional y lo activa en la Matriz.',
    consejos: [
      'Verifica que nombre completo, grado y acudiente estén completos antes de guardar.',
      'Al guardar con éxito, podrás evaluar su convivencia en la Matriz y emitir su Tarjeta TDR.',
    ],
    burbujaCorta: 'Guarda el estudiante. Verifica que nombre, grado y acudiente estén listos.',
    textoVoz: 'Guarda el estudiante. Verifica que nombre, grado y acudiente estén listos.',
  },
  'btn_student_cancel': {
    id: 'btn_student_cancel',
    etiqueta: 'Cancelar Formulario',
    funcion: 'Cierra el modal descartando los cambios sin modificar el registro del aula.',
    consejos: [
      'Si cierras ahora, los datos no guardados se perderán.',
      'Puedes volver a abrir este formulario cuando tengas la información a mano.',
    ],
    burbujaCorta: 'Cierra el formulario. Ten en cuenta que los datos no guardados se perderán.',
    textoVoz: 'Cierra el formulario. Ten en cuenta que los datos no guardados se perderán.',
  },

  // --- PESTAÑA 1: ESTUDIANTES ---
  'students_search_input': {
    id: 'students_search_input',
    etiqueta: 'Buscador de Estudiantes',
    funcion: 'Filtra al instante por nombres, apellidos o nombre del acudiente.',
    consejos: [
      'Escribe parte del nombre o apellido para encontrar al estudiante en tiempo real.',
      'También puedes buscar por el nombre de la mamá o papá acudiente.',
      'Limpia el campo de texto para volver a ver la lista completa del curso.',
    ],
    burbujaCorta: 'Filtra estudiantes por nombre, apellido o acudiente en tiempo real.',
    textoVoz: 'Filtra estudiantes por nombre, apellido o acudiente en tiempo real.',
  },
  'students_filter_grade': {
    id: 'students_filter_grade',
    etiqueta: 'Filtro por Grado',
    funcion: 'Muestra únicamente los estudiantes matriculados en el grado escolar seleccionado.',
    consejos: [
      'Selecciona un grado para organizar la atención de ese salón específico.',
      'Elige «Todos los Grados» para supervisar la matrícula institucional completa.',
    ],
    burbujaCorta: 'Muestra solo los alumnos del grado que elijas para ordenar tu salón.',
    textoVoz: 'Muestra solo los alumnos del grado que elijas para ordenar tu salón.',
  },
  'students_filter_shift': {
    id: 'students_filter_shift',
    etiqueta: 'Filtro por Jornada',
    funcion: 'Permite alternar entre los estudiantes de la jornada Mañana o Tarde.',
    consejos: [
      'Organiza tu lista según el horario de clases en curso.',
      'Verifica que la jornada coincida con el horario académico asignado.',
    ],
    burbujaCorta: 'Alterna entre jornada mañana o tarde según tu horario de clases.',
    textoVoz: 'Alterna entre jornada mañana o tarde según tu horario de clases.',
  },
  'students_btn_add': {
    id: 'students_btn_add',
    etiqueta: 'Registrar Estudiante',
    funcion: 'Abre el formulario para inscribir a un nuevo alumno en la I.E. Denzil Escolar.',
    consejos: [
      'Ten a mano el documento de identidad y el número del acudiente responsable.',
      'Yacita te guiará campo por campo para garantizar un registro impecable.',
    ],
    burbujaCorta: 'Inscribe un nuevo estudiante con apoyo paso a paso de Yacita.',
    textoVoz: 'Inscribe un nuevo estudiante con apoyo paso a paso de Yacita.',
  },
  'student_row_item': {
    id: 'student_row_item',
    etiqueta: 'Fila de Estudiante',
    funcion: 'Muestra el nombre, grado, jornada y acudiente del alumno seleccionado.',
    consejos: [
      'Haz clic en la fila o botones para ver su TDR, editar datos o pasar a la Matriz.',
      'Revisa que el teléfono del acudiente esté al día ante cualquier citación escolar.',
    ],
    burbujaCorta: 'Estudiante seleccionado. Puedes ver su TDR, editar datos o evaluarlo.',
    textoVoz: 'Estudiante seleccionado. Puedes ver su T D R, editar datos o evaluarlo.',
    contieneDatosPersonales: true,
  },
  'student_action_tdr': {
    id: 'student_action_tdr',
    etiqueta: 'Ver Tarjeta TDR',
    funcion: 'Genera la vista previa de la Tarjeta Diaria de Reporte con membrete legal.',
    consejos: [
      'Muestra el semáforo de criterios diarios y los acuerdos restaurativos.',
      'Lista para descargar en Word, PDF formal o sincronizar en Google Drive.',
    ],
    burbujaCorta: 'Abre la Tarjeta Diaria TDR oficial con membrete y compromisos.',
    textoVoz: 'Abre la Tarjeta Diaria T D R oficial con membrete y compromisos.',
    contieneDatosPersonales: true,
  },
  'student_action_edit': {
    id: 'student_action_edit',
    etiqueta: 'Editar Estudiante',
    funcion: 'Permite actualizar teléfono, acudiente u observaciones médicas del alumno.',
    consejos: [
      'Mantén los datos familiares al día para una oportuna comunicación institucional.',
      'Puedes usar las sugerencias automáticas de Yacita para enriquecer la ficha.',
    ],
    burbujaCorta: 'Modifica los datos del estudiante, teléfono o acudiente con cuidado.',
    textoVoz: 'Modifica los datos del estudiante, teléfono o acudiente con cuidado.',
    contieneDatosPersonales: true,
  },
  'student_action_delete': {
    id: 'student_action_delete',
    etiqueta: 'Eliminar Estudiante',
    funcion: 'Retira al estudiante del sistema y descarta su matrícula e historial conductual.',
    consejos: [
      '¡Atención! Eliminar al estudiante borrará su historial y no se puede deshacer.',
      'Exporta un respaldo .json antes si requieres conservar las actas del alumno.',
    ],
    burbujaCorta: 'Eliminar borra matrícula e historial. Esta acción no se puede deshacer.',
    textoVoz: 'Eliminar borra matrícula e historial. Esta acción no se puede deshacer.',
    contieneDatosPersonales: true,
  },

  // --- PESTAÑA 2: MATRIZ GRUPAL ---
  'matrix_date_input': {
    id: 'matrix_date_input',
    etiqueta: 'Fecha de Evaluación',
    funcion: 'Indica qué día escolar se está evaluando o consultando en la matriz.',
    consejos: [
      'Por defecto abre con la fecha escolar de hoy.',
      'Puedes seleccionar fechas anteriores para consultar o ajustar calificaciones pasadas.',
    ],
    burbujaCorta: 'Indica el día que estás evaluando. Puedes consultar fechas anteriores.',
    textoVoz: 'Indica el día que estás evaluando. Puedes consultar fechas anteriores.',
  },
  'matrix_filter_grade': {
    id: 'matrix_filter_grade',
    etiqueta: 'Filtro de Grado en Matriz',
    funcion: 'Permite calificar la convivencia de un salón específico en la cuadrícula.',
    consejos: [
      'Filtra por salón para agilizar la calificación de todos los alumnos presentes.',
      'El semáforo superior calcula el porcentaje de cumplimiento del salón activo.',
    ],
    burbujaCorta: 'Muestra la matriz para calificar a los alumnos de este salón.',
    textoVoz: 'Muestra la matriz para calificar a los alumnos de este salón.',
  },
  'matrix_filter_shift': {
    id: 'matrix_filter_shift',
    etiqueta: 'Filtro de Jornada en Matriz',
    funcion: 'Separa la evaluación para cursos de la jornada Mañana o Tarde.',
    consejos: [
      'Califica únicamente a los estudiantes presentes en el turno correspondiente.',
      'Facilita el control diario y la entrega de novedades pedagógicas.',
    ],
    burbujaCorta: 'Filtra la matriz para calificar la jornada escolar correspondiente.',
    textoVoz: 'Filtra la matriz para calificar la jornada escolar correspondiente.',
  },
  'matrix_search_input': {
    id: 'matrix_search_input',
    etiqueta: 'Buscador de Estudiantes en Matriz',
    funcion: 'Permite encontrar rápidamente a un estudiante por su nombre o apellidos.',
    consejos: [
      'Escribe parte del nombre para ver su tarjeta de evaluación de inmediato.',
      'Limpia el campo con la equis para volver a ver a todo el grupo del salón.',
    ],
    burbujaCorta: 'Busca a un alumno por su nombre para calificarlo al instante.',
    textoVoz: 'Busca a un alumno por su nombre para calificarlo al instante.',
  },
  'matrix_search_clear': {
    id: 'matrix_search_clear',
    etiqueta: 'Limpiar Búsqueda en Matriz',
    funcion: 'Borra el texto del buscador para restablecer la lista completa de estudiantes.',
    consejos: [
      'Vuelve a mostrar todos los alumnos del curso seleccionado.',
    ],
    burbujaCorta: 'Limpia el buscador para ver de nuevo todo el grupo.',
    textoVoz: 'Limpia el buscador para ver de nuevo todo el grupo.',
  },
  'matrix_filter_novelties': {
    id: 'matrix_filter_novelties',
    etiqueta: 'Filtro Solo con Novedades',
    funcion: 'Filtra la lista para mostrar únicamente a estudiantes con niveles de apoyo (1★, 2★) u observaciones.',
    consejos: [
      'Ideal para revisar casos que requieren acompañamiento o pacto restaurativo.',
      'Permite un seguimiento focalizado tras haber marcado a todo el grupo en Logrado.',
    ],
    burbujaCorta: 'Muestra solo los casos con alertas formativas o que requieren apoyo.',
    textoVoz: 'Muestra sólo los casos con alertas formativas o que requieren apoyo.',
  },
  'matrix_btn_actions_menu': {
    id: 'matrix_btn_actions_menu',
    etiqueta: 'Menú de Acciones de la Matriz',
    funcion: 'Abre opciones grupales rápidas como marcar a todos en Logrado o consultar convenciones.',
    consejos: [
      'Agrupa herramientas clave en pantallas móviles para ahorrar espacio vertical.',
      'Permite marcar a todos y luego ajustar solo las novedades individuales.',
    ],
    burbujaCorta: 'Abre las acciones colectivas de la matriz en versión móvil.',
    textoVoz: 'Abre las acciones colectivas de la matriz en versión móvil.',
  },
  'matrix_btn_mark_all_secondary': {
    id: 'matrix_btn_mark_all_secondary',
    etiqueta: 'Marcar Todos Logrado (Menú Acciones)',
    funcion: 'Asigna Logrado (3★) a todos los estudiantes visibles desde el menú móvil.',
    consejos: [
      'Abre la confirmación para indicar cuántos criterios y estudiantes se marcarán.',
      'Dispondrás de 5 segundos para deshacer la acción.',
    ],
    burbujaCorta: 'Asigna tres estrellas a todo el grupo desde el menú móvil.',
    textoVoz: 'Asigna tres estrellas a todo el grupo desde el menú móvil.',
  },
  'matrix_btn_view_conventions': {
    id: 'matrix_btn_view_conventions',
    etiqueta: 'Ver Convenciones Formativas',
    funcion: 'Abre el panel explicativo de la escala formativa de 3 niveles de la I.E. Denzil Escolar.',
    consejos: [
      'Revisa los criterios para Logrado, En Proceso y Requiere Apoyo.',
    ],
    burbujaCorta: 'Consulta el detalle de los tres niveles formativos institucionales.',
    textoVoz: 'Consulta el detalle de los tres niveles formativos institucionales.',
  },
  'matrix_btn_mark_all': {
    id: 'matrix_btn_mark_all',
    etiqueta: 'Marcar Todos Logrado',
    funcion: 'Asigna 3★ Logrado a todos los estudiantes visibles con un solo clic.',
    consejos: [
      'Ideal al inicio de la jornada escolar para agilizar el registro grupal.',
      'Luego solo ajustas a 2★ o 1★ a los casos que requirieron acompañamiento especial.',
    ],
    burbujaCorta: 'Marca 3 estrellas para todos. Agiliza y ajusta luego casos puntuales.',
    textoVoz: 'Marca tres estrellas para todos. Agiliza y ajusta luego casos puntuales.',
  },
  'matrix_confirm_mark_all': {
    id: 'matrix_confirm_mark_all',
    etiqueta: 'Confirmar Marcar Todos',
    funcion: 'Confirma la asignación de Logrado (3★) a todos los estudiantes visibles.',
    consejos: [
      'Dispondrás de 5 segundos para deshacer la acción si fue involuntaria.',
    ],
    burbujaCorta: 'Confirma la valoración grupal. Tendrás 5 segundos para deshacer.',
    textoVoz: 'Confirma la valoración grupal. Tendrás cinco segundos para deshacer.',
  },
  'matrix_confirm_cancel': {
    id: 'matrix_confirm_cancel',
    etiqueta: 'Cancelar Valoración Grupal',
    funcion: 'Cierra el cuadro de confirmación sin aplicar cambios a la matriz.',
    consejos: [
      'Mantiene la matriz exactamente como estaba.',
    ],
    burbujaCorta: 'Cancela sin realizar cambios en la matriz.',
    textoVoz: 'Cancela sin realizar cambios en la matriz.',
  },
  'matrix_undo_mark_all': {
    id: 'matrix_undo_mark_all',
    etiqueta: 'Deshacer Marcar Todos',
    funcion: 'Restaura el estado previo de los estudiantes antes de marcar todos.',
    consejos: [
      'Revierte la asignación masiva de manera inmediata.',
    ],
    burbujaCorta: 'Restaura el estado previo de la matriz.',
    textoVoz: 'Restaura el estado previo de la matriz.',
  },
  'matrix_c1': {
    id: 'matrix_c1',
    etiqueta: '1. Turnos y Escucha',
    funcion: 'Evalúa el respeto de turnos de la palabra y la escucha atenta a docentes y compañeros.',
    consejos: [
      '3★ si escucha con atención; 2★ si requiere 1 recordatorio; 1★ ante interrupción constante.',
      'Fomenta el diálogo respetuoso y la empatía en la convivencia del aula.',
    ],
    burbujaCorta: 'Criterio 1: Respeto de turnos de la palabra y escucha empática.',
    textoVoz: 'Criterio uno: Respeto de turnos de la palabra y escucha empática.',
  },
  'matrix_c2': {
    id: 'matrix_c2',
    etiqueta: '2. Permanencia en la Actividad',
    funcion: 'Evalúa la constancia del alumno completando su labor en el puesto asignado.',
    consejos: [
      '3★ si completa la guía en su puesto; 2★ si se distrae; 1★ si abandona el aula sin permiso.',
      'Observa si requiere descansos motrices programados para mantener la concentración.',
    ],
    burbujaCorta: 'Criterio 2: Permanencia y concentración en la actividad escolar.',
    textoVoz: 'Criterio dos: Permanencia y concentración en la actividad escolar.',
  },
  'matrix_c3': {
    id: 'matrix_c3',
    etiqueta: '3. Seguimiento de Instrucciones',
    funcion: 'Evalúa la disposición para atender pautas pedagógicas colectivas y de convivencia.',
    consejos: [
      '3★ atiende la instrucción con agilidad; 2★ necesita refuerzo; 1★ muestra resistencia abierta.',
      'Clave para la autorregulación formativa y la armonía comunitaria.',
    ],
    burbujaCorta: 'Criterio 3: Disposición para seguir acuerdos e instrucciones de aula.',
    textoVoz: 'Criterio tres: Disposición para seguir acuerdos e instrucciones de aula.',
  },
  'matrix_c4': {
    id: 'matrix_c4',
    etiqueta: '4. Cuidado de Materiales y Aula',
    funcion: 'Evalúa el orden y respeto por útiles propios, compartidos y el salón de clases.',
    consejos: [
      '3★ cuida sus útiles y el pupitre; 2★ descuida su espacio; 1★ daña o arroja materiales.',
      'Promueve el sentido de pertenencia en la Institución Educativa Denzil Escolar.',
    ],
    burbujaCorta: 'Criterio 4: Cuidado de útiles escolares, pupitres y espacio común.',
    textoVoz: 'Criterio cuatro: Cuidado de útiles escolares, pupitres y espacio común.',
  },
  'matrix_score_3': {
    id: 'matrix_score_3',
    etiqueta: '3★ Logrado (Verde)',
    funcion: 'Registra autorregulación adecuada y cumplimiento pleno del criterio formativo.',
    consejos: [
      'Convivencia armónica en verde. Reconoce y celebra el esfuerzo del estudiante.',
      'Refuerza positivamente su constancia ante el grupo.',
    ],
    burbujaCorta: 'Logrado 3 estrellas: autorregulación óptima y convivencia armónica.',
    textoVoz: 'Logrado tres estrellas: autorregulación óptima y convivencia armónica.',
  },
  'matrix_score_2': {
    id: 'matrix_score_2',
    etiqueta: '2★ En Proceso (Ámbar)',
    funcion: 'Registra que el estudiante necesitó 1 o 2 recordatorios para cumplir el acuerdo.',
    consejos: [
      'Enfoque formativo en ámbar: no es castigo, es refuerzo pedagógico oportuno.',
      'Dialoga en privado para recordar la meta de convivencia de la jornada.',
    ],
    burbujaCorta: 'En Proceso 2 estrellas: requirió 1 o 2 pautas de autorregulación.',
    textoVoz: 'En Proceso dos estrellas: requirió una o dos pautas de autorregulación.',
  },
  'matrix_score_1': {
    id: 'matrix_score_1',
    etiqueta: '1★ Requiere Apoyo (Rojo)',
    funcion: 'Registra desregulación o resistencia conductual que amerita acompañamiento.',
    consejos: [
      'Aborda la situación con voz calmada y empatía sin culpabilizar al alumno.',
      'Pulsa «Incidencia A-B-C» para pactar un acuerdo restaurativo de reparación.',
    ],
    burbujaCorta: 'Requiere Apoyo 1 estrella: acompaña con diálogo y calma restaurativa.',
    textoVoz: 'Requiere Apoyo una estrella: acompaña con diálogo y calma restaurativa.',
  },
  'matrix_btn_notes': {
    id: 'matrix_btn_notes',
    etiqueta: 'Bitácora / Notas del Día',
    funcion: 'Abre el campo para registrar observaciones pedagógicas específicas de la fecha.',
    consejos: [
      'Anota logros sobresalientes o acuerdos pactados con el alumno en clase.',
      'Estas notas se transfieren automáticamente al reporte formal de convivencia.',
    ],
    burbujaCorta: 'Bitácora del día: escribe notas formativas o acuerdos clave.',
    textoVoz: 'Bitácora del día: escribe notas formativas o acuerdos clave.',
  },
  'matrix_btn_open_abc': {
    id: 'matrix_btn_open_abc',
    etiqueta: 'Acción Formativa / Incidencia A-B-C',
    funcion: 'Pasa directamente al Registro A-B-C con este estudiante preseleccionado.',
    consejos: [
      'Documenta el detonante y define acuerdos restaurativos de reparación.',
      'Se vinculará de inmediato al historial y a la Tarjeta TDR del alumno.',
    ],
    burbujaCorta: 'Abre el Registro A-B-C para acordar un plan restaurativo sin culpas.',
    textoVoz: 'Abre el Registro A, B, C para acordar un plan restaurativo sin culpas.',
  },
  'matrix_legend_button': {
    id: 'matrix_legend_button',
    etiqueta: 'Convenciones Formativas',
    funcion: 'Explica el significado de los tres niveles formativos: Logrado (3★), En Proceso (2★) y Requiere Apoyo (1★).',
    consejos: [
      'Recuerda que las tres estrellas promueven la autorregulación armónica.',
      'El nivel 1 alerta para generar un pacto formativo en Registro A-B-C.',
    ],
    burbujaCorta: 'Consulta qué significa cada nivel de valoración en la escala formativa institucional.',
    textoVoz: 'Consulta qué significa cada nivel de valoración en la escala formativa institucional.',
  },

  // --- PESTAÑA 3: REGISTRO Y TDR (A-B-C) ---
  'abc_student_select': {
    id: 'abc_student_select',
    etiqueta: 'Selección de Estudiante en A-B-C',
    funcion: 'Asocia la situación conductual al expediente y tarjeta TDR del alumno.',
    consejos: [
      'Elige al estudiante involucrado para registrar el acompañamiento pedagógico.',
      'Se cargarán su grado, jornada y acudiente automáticamente.',
    ],
    burbujaCorta: 'Elige al estudiante para vincular el antecedente y plan formativo.',
    textoVoz: 'Elige al estudiante para vincular el antecedente y plan formativo.',
  },
  'abc_date_time': {
    id: 'abc_date_time',
    etiqueta: 'Fecha y Hora del Suceso',
    funcion: 'Documenta el momento preciso en que ocurrió la situación formativa.',
    consejos: [
      'La precisión de la fecha y hora da respaldo institucional formal al acta.',
      'Permite identificar en qué horarios de la rutina escolar surgen mayores tensiones.',
    ],
    burbujaCorta: 'Fecha y hora exacta del suceso para respaldo institucional.',
    textoVoz: 'Fecha y hora exacta del suceso para respaldo institucional.',
  },
  'abc_subject_input': {
    id: 'abc_subject_input',
    etiqueta: 'Asignatura / Momento',
    funcion: 'Indica la actividad formativa durante la cual ocurrió la conducta.',
    consejos: [
      'Especifica si ocurrió en clase magistral, trabajo en equipo, recreo o cambio de clase.',
      'Ayuda a comprender el entorno y la dinámica del aula al momento del evento.',
    ],
    burbujaCorta: 'Asignatura o momento de la jornada en que ocurrió la situación.',
    textoVoz: 'Asignatura o momento de la jornada en que ocurrió la situación.',
  },
  'abc_expected_behavior': {
    id: 'abc_expected_behavior',
    etiqueta: '[A] Antecedente / Meta Esperada',
    funcion: 'Define la conducta formativa que se esperaba del estudiante en la actividad.',
    consejos: [
      'Redacta en positivo lo que el alumno debía lograr en ese momento.',
      'Usa las sugerencias en chips o el botón de mejorar redacción con Yacita.',
    ],
    chips: [
      { label: 'Completar guía en pupitre', value: 'Completar la guía escolar en su pupitre', action: 'apply' },
      { label: 'Participar y escuchar pares', value: 'Participar en la ronda formativa y escuchar a sus pares', action: 'apply' },
      { label: 'Compartir materiales', value: 'Compartir materiales escolares con amabilidad', action: 'apply' },
      { label: 'Respetar turno de palabra', value: 'Respetar el turno de la palabra levantando la mano', action: 'apply' },
    ],
    burbujaCorta: 'Describe la expectativa positiva que se esperaba cumplir en la clase.',
    textoVoz: 'Describe la expectativa positiva que se esperaba cumplir en la clase.',
  },
  'abc_trigger_select': {
    id: 'abc_trigger_select',
    etiqueta: 'Detonante Identificado (Gatillo)',
    funcion: 'Identifica el estímulo ambiental o relacional que desencadenó la respuesta.',
    consejos: [
      'Comprender el detonante permite anticipar y prevenir futuras situaciones.',
      'Ejemplos: sobrecarga de ruido, frustración académica, transición de clase o disputa por útil.',
    ],
    burbujaCorta: 'Identifica qué detonó la conducta para prevenir futuras tensiones.',
    textoVoz: 'Identifica qué detonó la conducta para prevenir futuras tensiones.',
  },
  'abc_behavior_checkbox': {
    id: 'abc_behavior_checkbox',
    etiqueta: '[B] Conducta Observada',
    funcion: 'Selecciona de forma múltiple y ágil las acciones específicas manifestadas.',
    consejos: [
      'Describe hechos observables sin calificativos negativos ni juicios de valor.',
      'Puedes seleccionar varios ítems y detallar observaciones adicionales abajo.',
    ],
    burbujaCorta: 'Marca las conductas observables de forma objetiva y sin juicios.',
    textoVoz: 'Marca las conductas observables de forma objetiva y sin juicios.',
  },
  'abc_regulatory_checkbox': {
    id: 'abc_regulatory_checkbox',
    etiqueta: '[C] Plan Regulador y Estrategias',
    funcion: 'Acciones pedagógicas inmediatas aplicadas para devolver la calma y la autorregulación.',
    consejos: [
      'Selecciona apoyos como pausa sensorial, respiración guiada o diálogo en privado.',
      'El botón de Yacita te sugiere el plan más acertado según las conductas marcadas.',
    ],
    chips: [
      { label: 'Pausa sensorial en rincón de calma', value: 'Pausa sensorial en rincón de calma', action: 'apply' },
      { label: 'Diálogo en privado', value: 'Diálogo reflexivo en privado con el docente', action: 'apply' },
      { label: 'Respiración guiada', value: 'Respiración consciente y toma de agua', action: 'apply' },
    ],
    burbujaCorta: 'Estrategias aplicadas para recuperar la calma y la regulación.',
    textoVoz: 'Estrategias aplicadas para recuperar la calma y la regulación.',
  },
  'abc_btn_suggest_plan': {
    id: 'abc_btn_suggest_plan',
    etiqueta: 'Sugerir Plan con Yacita',
    funcion: 'Genera una recomendación pedagógica basada en justicia restaurativa escolar.',
    consejos: [
      'Yacita evalúa las conductas marcadas y sugiere la combinación restaurativa ideal.',
      'Ajusta el acuerdo propuesto según las necesidades formativas del niño.',
    ],
    burbujaCorta: 'Yacita analiza las conductas y te sugiere un plan restaurativo.',
    textoVoz: 'Yacita analiza las conductas y te sugiere un plan restaurativo.',
  },
  'abc_restorative_agreement': {
    id: 'abc_restorative_agreement',
    etiqueta: 'Acuerdo Restaurativo Pactado',
    funcion: 'Compromiso concertado con el estudiante para reparar el clima de aula.',
    consejos: [
      'Enfoque restaurativo: reparación del daño y reintegración comunitaria positiva.',
      'Ejemplos: organizar materiales, ofrecer una disculpa sincera o liderar una tarea.',
    ],
    chips: [
      { label: 'Reparación de material', value: 'Organiza sus útiles y ayuda a ordenar el material del aula.', action: 'apply' },
      { label: 'Disculpa y diálogo', value: 'Ofrece una disculpa respetuosa y dialoga sobre cómo expresar su molestia.', action: 'apply' },
    ],
    burbujaCorta: 'Compromiso concreto del estudiante para reparar y aprender del hecho.',
    textoVoz: 'Compromiso concreto del estudiante para reparar y aprender del hecho.',
  },
  'abc_teacher_observations': {
    id: 'abc_teacher_observations',
    etiqueta: 'Observaciones del Docente',
    funcion: 'Reflexión pedagógica del docente u orientador sobre el acompañamiento brindado.',
    consejos: [
      'Resalta la disposición del alumno para calmarse y cumplir los acuerdos pactados.',
      'Quedará registrado para el informe oficial entregado a la familia.',
    ],
    burbujaCorta: 'Anotaciones pedagógicas finales sobre la evolución del estudiante.',
    textoVoz: 'Anotaciones pedagógicas finales sobre la evolución del estudiante.',
  },
  'abc_btn_save': {
    id: 'abc_btn_save',
    etiqueta: 'Guardar Registro A-B-C',
    funcion: 'Almacena el registro formativo con sus acuerdos en el historial del aula.',
    consejos: [
      'El acta queda lista para firmar y consultar en la Tarjeta TDR oficial.',
      'Podrás exportarla a Word o PDF institucional en cualquier momento.',
    ],
    burbujaCorta: 'Guarda el registro formativo A-B-C con acuerdos y compromisos.',
    textoVoz: 'Guarda el registro formativo A, B, C con acuerdos y compromisos.',
  },

  // --- PESTAÑA 4: REPORTES OFICIALES ---
  'reports_format_carta': {
    id: 'reports_format_carta',
    etiqueta: 'Formato Acta Carta Oficial (TDR)',
    funcion: 'Muestra el documento formal tamaño Carta de página completa con membrete institucional.',
    consejos: [
      'Ideal para archivar en la carpeta de convivencia institucional o remitir a rectoría.',
      'Incluye membrete legal completo, identificación, valoración y firmas.',
    ],
    burbujaCorta: 'Acta formal de convivencia tamaño Carta con membrete oficial 2026.',
    textoVoz: 'Acta formal de convivencia tamaño Carta con membrete oficial dos mil veintiséis.',
  },
  'reports_format_cuaderno': {
    id: 'reports_format_cuaderno',
    etiqueta: 'Ficha para Cuaderno (2 por hoja)',
    funcion: 'Genera dos fichas idénticas por hoja Carta vertical con línea de corte para pegar en el cuaderno.',
    consejos: [
      'Permite cortar la hoja al medio: una copia va al cuaderno del alumno y otra al registro.',
      'Diseño compacto con membrete de 35px, 4 metas con estrellas y firmas del hogar.',
    ],
    burbujaCorta: 'Dos fichas compactas por hoja Carta para pegar en el cuaderno del estudiante.',
    textoVoz: 'Dos fichas compactas por hoja Carta para pegar en el cuaderno del estudiante.',
  },
  'reports_student_select': {
    id: 'reports_student_select',
    etiqueta: 'Seleccionar Estudiante en Reportes',
    funcion: 'Carga los datos, notas de convivencia y actas del estudiante para el documento oficial.',
    consejos: [
      'Elige el alumno para generar su reporte con membrete legal Denzil y CAT.',
      'Verifica que sus calificaciones e incidencias del día estén guardadas.',
    ],
    burbujaCorta: 'Selecciona al estudiante para generar su acta oficial con membrete.',
    textoVoz: 'Selecciona al estudiante para generar su acta oficial con membrete.',
  },
  'reports_date_select': {
    id: 'reports_date_select',
    etiqueta: 'Fecha de Evaluación / Reporte',
    funcion: 'Filtra las evaluaciones o incidencias correspondientes a la jornada reportada.',
    consejos: [
      'Asegura que la fecha coincida con la jornada que deseas certificar formalmente.',
      'Se imprime en el encabezado oficial del documento tamaño Carta.',
    ],
    burbujaCorta: 'Fecha del reporte oficial que figurará en el membrete del acta.',
    textoVoz: 'Fecha del reporte oficial que figurará en el membrete del acta.',
  },
  'reports_incident_select': {
    id: 'reports_incident_select',
    etiqueta: 'Incidencia A-B-C a Incluir',
    funcion: 'Asocia un caso conductual específico con sus compromisos en la Tarjeta TDR.',
    consejos: [
      'Puedes elegir una incidencia puntual o emitir el reporte general de convivencia.',
      'Transcribe los compromisos concertados entre docente y estudiante.',
    ],
    burbujaCorta: 'Elige el incidente A-B-C que se anexará al documento oficial.',
    textoVoz: 'Elige el incidente A, B, C que se anexará al documento oficial.',
  },
  'reports_btn_parent_summary': {
    id: 'reports_btn_parent_summary',
    etiqueta: 'Redactar Informe para Acudiente',
    funcion: 'Yacita redacta una síntesis cálida, empática y propositiva para la familia.',
    consejos: [
      'Lenguaje asertivo y constructivo que fomenta la alianza formativa en el hogar.',
      'Ideal para enviar por WhatsApp escolar o entregar impreso en la citación.',
    ],
    burbujaCorta: 'Yacita redacta un resumen formativo y cálido para la familia.',
    textoVoz: 'Yacita redacta un resumen formativo y cálido para la familia.',
  },
  'reports_btn_download_pdf': {
    id: 'reports_btn_download_pdf',
    etiqueta: 'Descargar PDF Oficial',
    funcion: 'Genera el PDF formal tamaño Carta con membrete oficial Denzil y CAT en cada página.',
    consejos: [
      'Listo para imprimir y firmar con membrete legal exacto según AI_RULES.md.',
      'Conserva Sello Denzil a la izquierda y Logo CAT a la derecha sin distorsión.',
    ],
    burbujaCorta: 'Descarga el PDF formal tamaño Carta con membrete oficial 2026.',
    textoVoz: 'Descarga el P D F formal tamaño Carta con membrete oficial dos mil veintiséis.',
  },
  'reports_btn_download_word': {
    id: 'reports_btn_download_word',
    etiqueta: 'Descargar en Word (.docx)',
    funcion: 'Exporta el acta oficial editable en formato Microsoft Word.',
    consejos: [
      'Permite personalizar texto o ajustar tablas antes de la impresión formal.',
      'Mantiene la estructura oficial del membrete institucional de Riohacha.',
    ],
    burbujaCorta: 'Descarga el acta oficial en Word con tablas y membrete editable.',
    textoVoz: 'Descarga el acta oficial en Word con tablas y membrete editable.',
  },
  'reports_btn_sync_drive': {
    id: 'reports_btn_sync_drive',
    etiqueta: 'Guardar en Google Drive',
    funcion: 'Sube una copia del reporte oficial a la carpeta institucional de Google Drive.',
    consejos: [
      'Garantiza respaldo permanente en la nube accesible desde cualquier lugar.',
      'Requiere haber conectado tu cuenta de Google en la barra superior.',
    ],
    burbujaCorta: 'Sube el reporte formal a tu carpeta de Google Drive institucional.',
    textoVoz: 'Sube el reporte formal a tu carpeta de Google Drive institucional.',
  },
  'reports_btn_print': {
    id: 'reports_btn_print',
    etiqueta: 'Imprimir Reporte Oficial',
    funcion: 'Abre el cuadro de diálogo de impresión del navegador para el acta o tarjeta TDR.',
    consejos: [
      'Garantiza orientación Carta vertical y membretes institucionales oficiales.',
      'En formato cuaderno imprime dos fichas idénticas para recortar y anexar.',
    ],
    burbujaCorta: 'Imprime el documento formal con membrete institucional.',
    textoVoz: 'Imprime el documento formal con membrete institucional.',
  },
  'abc_btn_open_report': {
    id: 'abc_btn_open_report',
    etiqueta: 'Generar Reporte Oficial TDR',
    funcion: 'Abre el acta oficial del incidente seleccionado con membrete institucional y compromisos.',
    consejos: [
      'Permite descargar en PDF formal, Word editable o imprimir la tarjeta diaria.',
    ],
    burbujaCorta: 'Genera el reporte oficial TDR para este incidente.',
    textoVoz: 'Genera el reporte oficial TDR para este incidente.',
  },

  // --- ENCABEZADO ---
  'header_profile': {
    id: 'header_profile',
    etiqueta: 'Perfil Docente y Cuenta',
    funcion: 'Configura tu nombre de docente, correo institucional y estado con Google.',
    consejos: [
      'Personaliza tu firma docente para las actas y reportes institucionales.',
      'Verifica si estás en modo conectado con Google o en almacenamiento local.',
    ],
    burbujaCorta: 'Revisa tu perfil docente y estado de sincronización institucional.',
    textoVoz: 'Revisa tu perfil docente y estado de sincronización institucional.',
  },
  'header_drive_sync': {
    id: 'header_drive_sync',
    etiqueta: 'Sincronización en Google Drive',
    funcion: 'Respalda en la nube tus estudiantes, calificaciones y actas de convivencia.',
    consejos: [
      'Evita la pérdida de datos guardando copias periódicas en tu Drive escolar.',
      'Permite trabajar entre varios dispositivos sin perder las actas.',
    ],
    burbujaCorta: 'Guarda una copia segura de tu aula en Google Drive institucional.',
    textoVoz: 'Guarda una copia segura de tu aula en Google Drive institucional.',
  },
  'header_backup_export': {
    id: 'header_backup_export',
    etiqueta: 'Exportar Respaldo (.json)',
    funcion: 'Descarga un archivo local completo con todos los datos de la institución.',
    consejos: [
      'Guarda una copia de seguridad en tu computador o memoria USB.',
      'Útil para respaldar tus registros antes de cerrar el período académico.',
    ],
    burbujaCorta: 'Descarga tu copia de seguridad local en formato punto jota son.',
    textoVoz: 'Descarga tu copia de seguridad local en archivo punto jota son.',
  },
  'header_backup_import': {
    id: 'header_backup_import',
    etiqueta: 'Restaurar Respaldo (.json)',
    funcion: 'Carga una copia de seguridad guardada previamente para restaurar los datos.',
    consejos: [
      'Restaura estudiantes, calificaciones diarias e incidentes de inmediato.',
      'Asegúrate de seleccionar un archivo .json emitido por esta aplicación.',
    ],
    burbujaCorta: 'Carga un archivo de respaldo previo para restaurar tus datos.',
    textoVoz: 'Carga un archivo de respaldo previo para restaurar tus datos.',
  },
  'header_theme_toggle': {
    id: 'header_theme_toggle',
    etiqueta: 'Alternar Tema Claro / Oscuro',
    funcion: 'Cambia el contraste visual de la interfaz según la iluminación del salón.',
    consejos: [
      'El modo oscuro descansa la vista en jornadas de tarde o noche.',
      'El modo claro ofrece alto contraste para proyectores en el aula de clases.',
    ],
    burbujaCorta: 'Cambia el tema visual entre claro y oscuro para mayor comodidad.',
    textoVoz: 'Cambia el tema visual entre claro y oscuro para mayor comodidad.',
  },
  'header_menu': {
    id: 'header_menu',
    etiqueta: 'Menú Institucional',
    funcion: 'Despliega las opciones institucionales de perfil docente y respaldos.',
    consejos: [
      'Accede a tu cuenta de Google y respaldo de datos sin ocupar espacio en pantalla.',
    ],
    burbujaCorta: 'Abre el menú con opciones de cuenta y respaldos institucionales.',
    textoVoz: 'Abre el menú con opciones de cuenta y respaldos institucionales.',
  },
  'backup_reminder_download': {
    id: 'backup_reminder_download',
    etiqueta: 'Descargar Respaldo Preventivo',
    funcion: 'Guarda una copia de seguridad en formato JSON con todos los datos locales de convivencia.',
    consejos: [
      'Mantén siempre una copia guardada en tu computador o memoria USB.',
      'Si cambias de dispositivo, podrás restaurar todos los registros con este archivo.',
    ],
    burbujaCorta: 'Descarga un archivo con las valoraciones e incidentes registrados.',
    textoVoz: 'Descarga un archivo con las valoraciones e incidentes registrados.',
  },
  'backup_reminder_snooze': {
    id: 'backup_reminder_snooze',
    etiqueta: 'Recordar Respaldo Más Tarde',
    funcion: 'Pospone el aviso de respaldo preventivo durante 24 horas.',
    consejos: [
      'El aviso volverá a recordarte mañana si aún no has descargado una copia.',
    ],
    burbujaCorta: 'Pospone el recordatorio de respaldo por veinticuatro horas.',
    textoVoz: 'Pospone el recordatorio de respaldo por veinticuatro horas.',
  },

  // --- NAVEGACIÓN ---
  'nav_tab_students': {
    id: 'nav_tab_students',
    etiqueta: '1. Pestaña Estudiantes',
    funcion: 'Directorio escolar para matricular y editar fichas de alumnos y acudientes.',
    consejos: [
      'Paso inicial del sistema: ten tu lista de matriculados completa.',
      'Siguiente paso: selecciona un estudiante o pulsa «Registrar Estudiante».',
    ],
    burbujaCorta: 'Pestaña 1: Estudiantes. Revisa matrícula y acudientes del curso.',
    textoVoz: 'Pestaña uno: Estudiantes. Revisa matrícula y acudientes del curso.',
  },
  'nav_tab_matrix': {
    id: 'nav_tab_matrix',
    etiqueta: '2. Pestaña Matriz Grupal',
    funcion: 'Cuadrícula para evaluar los 4 criterios de convivencia diaria en 1 clic.',
    consejos: [
      'Evalúa turnos, permanencia, instrucciones y materiales para todo el curso.',
      'Usa «Marcar Todos Logrado» para calificar rápido y ajustar solo excepciones.',
    ],
    burbujaCorta: 'Pestaña 2: Matriz Grupal. Evalúa los 4 criterios diarios en 1 clic.',
    textoVoz: 'Pestaña dos: Matriz Grupal. Evalúa los cuatro criterios diarios en un clic.',
  },
  'nav_tab_abc': {
    id: 'nav_tab_abc',
    etiqueta: '3. Pestaña Registro y TDR',
    funcion: 'Documentación pedagógica basada en el modelo formativo y restaurativo A-B-C.',
    consejos: [
      'Identifica el detonante y pacta acuerdos restaurativos con el alumno.',
      'Elige el estudiante para redactar el acta de acompañamiento.',
    ],
    burbujaCorta: 'Pestaña 3: Registro A-B-C. Documenta antecedentes y acuerdos restaurativos.',
    textoVoz: 'Pestaña tres: Registro A, B, C. Documenta antecedentes y acuerdos restaurativos.',
  },
  'nav_tab_reports': {
    id: 'nav_tab_reports',
    etiqueta: '4. Pestaña Reportes Oficiales',
    funcion: 'Generación y exportación de actas y Tarjetas TDR con membrete legal Denzil y CAT.',
    consejos: [
      'Descarga en Word o PDF oficial tamaño Carta con membrete institucional.',
      'Puedes generar un informe propositivo para la familia con Yacita.',
    ],
    burbujaCorta: 'Pestaña 4: Reportes Oficiales. Con membrete Denzil y CAT en cada hoja.',
    textoVoz: 'Pestaña cuatro: Reportes Oficiales. Con membrete legal en cada hoja.',
  },
};

// Resolver helper for GuiaCampo
export function getGuiaCampo(
  id: string,
  variables: Record<string, string | undefined> = {}
): GuiaCampoItem | null {
  const item = GUIA_CAMPOS[id];
  if (!item) return null;

  return {
    ...item,
    etiqueta: formatYacitaText(item.etiqueta, variables),
    funcion: formatYacitaText(item.funcion, variables),
    consejos: item.consejos.map((c) => formatYacitaText(c, variables)),
    burbujaCorta: formatYacitaText(item.burbujaCorta, variables),
    textoVoz: item.textoVoz ? cleanTextForVoice(formatYacitaText(item.textoVoz, variables)) : cleanTextForVoice(formatYacitaText(item.burbujaCorta, variables)),
  };
}

// Fallback generator for uncatalogued interactive elements
export function getGenericGuiaCampo(
  tag: string,
  label: string,
  actionType: string = 'click'
): GuiaCampoItem {
  const cleanLabel = (label || 'este elemento').trim().slice(0, 36);

  let funcion = `Permite interactuar con la opción «${cleanLabel}» en la aplicación escolar.`;
  let consejo = `Haz clic o interactúa para continuar con tu gestión pedagógica.`;

  if (actionType === 'focus' || tag === 'input' || tag === 'textarea') {
    funcion = `Campo para registrar o modificar la información de «${cleanLabel}».`;
    consejo = `Escribe los datos con claridad para asegurar reportes escolares válidos.`;
  } else if (actionType === 'change' || tag === 'select') {
    funcion = `Selector para filtrar o elegir opciones de «${cleanLabel}».`;
    consejo = `Selecciona la opción requerida; la vista en pantalla se actualizará de inmediato.`;
  }

  const shortText = `Elegiste «${cleanLabel}». Continuemos con la labor formativa.`;

  return {
    id: `gen_${cleanLabel.replace(/\s+/g, '_').toLowerCase()}`,
    etiqueta: cleanLabel,
    funcion,
    consejos: [consejo, 'Consulta a Yacita si necesitas orientación sobre este proceso.'],
    burbujaCorta: shortText,
    textoVoz: cleanTextForVoice(shortText),
  };
}

// Rotation tracking for variants
const variantIndexMap: Record<string, number> = {};

export function getElementMessage(
  key: string,
  variables: Record<string, string | undefined> = {}
): YacitaMessageItem | null {
  // Check guiaCampos first
  const guia = getGuiaCampo(key, variables);
  if (guia) {
    const currentIndex = variantIndexMap[key] || 0;
    const currentConsejo = guia.consejos[currentIndex % guia.consejos.length] || guia.burbujaCorta;

    let mood: YacitaMood = 'apuntando_notas';
    if (key.includes('score_3') || key.includes('save') || key.includes('mark_all')) {
      mood = 'celebrando';
    } else if (key.includes('score_1') || key.includes('delete')) {
      mood = 'empatica';
    } else if (key.includes('tdr') || key.includes('report') || key.includes('c1')) {
      mood = 'pulgar_arriba';
    }

    return {
      id: `elem_${key}`,
      context: 'guia_campo',
      texto: guia.burbujaCorta || currentConsejo,
      estado: mood,
      priority: key.startsWith('field_') ? 4 : 2,
      textoVoz: guia.textoVoz || cleanTextForVoice(guia.burbujaCorta),
      contieneDatosPersonales: guia.contieneDatosPersonales,
    };
  }

  return null;
}

// 7. MENSAJE GENÉRICO AUTOMÁTICO (Para elementos sin data-yacita)
export function getGenericInteractiveMessage(
  elementType: string,
  label: string,
  actionType: 'click' | 'focus' | 'change' = 'click',
  variables: Record<string, string | undefined> = {}
): YacitaMessageItem {
  const genericGuia = getGenericGuiaCampo(elementType, label, actionType);
  const formatted = formatYacitaText(genericGuia.burbujaCorta, variables);
  const safe = formatted.length > 130 ? formatted.slice(0, 127) + '...' : formatted;

  return {
    id: genericGuia.id,
    context: 'generic_interaction',
    texto: safe,
    estado: 'idle',
    priority: 2,
    textoVoz: genericGuia.textoVoz,
  };
}

// 8. CONSEJOS PERIÓDICOS
export const PERIODIC_TIPS_BY_TAB: Record<string, YacitaMessageItem[]> = {
  students: [
    {
      id: 'tip_students_guardian',
      context: 'tab_students',
      texto: 'Un acudiente bien registrado facilita el acompañamiento pedagógico en caso de incidentes.',
      textoVoz: 'Un acudiente bien registrado facilita el acompañamiento pedagógico en caso de incidentes.',
      estado: 'pulgar_arriba',
      priority: 1,
    },
    {
      id: 'tip_students_sensory',
      context: 'tab_students',
      texto: 'Registrar sensibilidades sensoriales ayuda a anticipar y prevenir desregulaciones en clase.',
      textoVoz: 'Registrar sensibilidades sensoriales ayuda a anticipar y prevenir desregulaciones en clase.',
      estado: 'apuntando_notas',
      priority: 1,
    },
    {
      id: 'tip_students_groups',
      context: 'tab_students',
      texto: 'Puedes filtrar a tus estudiantes por grupo o jornada usando los selectores superiores.',
      textoVoz: 'Puedes filtrar a tus estudiantes por grupo o jornada usando los selectores superiores.',
      estado: 'senalando',
      priority: 1,
    },
  ],
  matrix: [
    {
      id: 'tip_matrix_scale',
      context: 'tab_matrix',
      texto: 'Convenciones: 3★ Logrado (Verde), 2★ En Proceso (Ámbar) y 1★ Requiere Apoyo (Rojo).',
      textoVoz: 'Convenciones: tres estrellas verde logrado, dos estrellas ámbar en proceso y una estrella rojo requiere apoyo.',
      estado: 'pulgar_arriba',
      priority: 1,
    },
    {
      id: 'tip_matrix_quick',
      context: 'tab_matrix',
      texto: '¿Todo el grupo tuvo un buen inicio? Usa «Marcar Todos Logrado» y ajusta casos puntuales.',
      textoVoz: 'Si todo el grupo tuvo un buen inicio, usa Marcar Todos Logrado y ajusta casos puntuales.',
      estado: 'celebrando',
      priority: 1,
    },
    {
      id: 'tip_matrix_notes',
      context: 'tab_matrix',
      texto: 'Haz clic en el ícono de libreta para agregar notas formativas específicas de la fecha.',
      textoVoz: 'Haz clic en la libreta para agregar notas formativas específicas de la fecha.',
      estado: 'apuntando_notas',
      priority: 1,
    },
  ],
  abc: [
    {
      id: 'tip_abc_antecedent',
      context: 'tab_abc',
      texto: 'Identificar el detonante (A) permite diseñar entornos de aprendizaje más predecibles.',
      textoVoz: 'Identificar el detonante permite diseñar entornos de aprendizaje más predecibles.',
      estado: 'pensando',
      priority: 1,
    },
    {
      id: 'tip_abc_behavior',
      context: 'tab_abc',
      texto: 'Describe la conducta (B) de manera neutral y observable, sin calificativos negativos.',
      textoVoz: 'Describe la conducta de manera neutral y observable, sin calificativos negativos.',
      estado: 'apuntando_notas',
      priority: 1,
    },
    {
      id: 'tip_abc_restorative',
      context: 'tab_abc',
      texto: 'La consecuencia (C) debe reparar el daño y reintegrar al estudiante positivamente.',
      textoVoz: 'La consecuencia debe reparar el daño y reintegrar al estudiante positivamente.',
      estado: 'empatica',
      priority: 1,
    },
  ],
  reports: [
    {
      id: 'tip_reports_letterhead',
      context: 'tab_reports',
      texto: 'Todos los reportes oficiales llevan Sello Denzil a la izquierda y Logo CAT a la derecha.',
      textoVoz: 'Todos los reportes oficiales llevan Sello Denzil a la izquierda y Logo CAT a la derecha.',
      estado: 'pulgar_arriba',
      priority: 1,
    },
    {
      id: 'tip_reports_formats',
      context: 'tab_reports',
      texto: 'Puedes exportar en Word (.docx) o en PDF oficial tamaño Carta con membrete intacto.',
      textoVoz: 'Puedes exportar en Word o en P D F oficial tamaño Carta con membrete intacto.',
      estado: 'senalando',
      priority: 1,
    },
    {
      id: 'tip_reports_family',
      context: 'tab_reports',
      texto: 'El botón de redactar informe para acudientes genera un resumen cálido y constructivo.',
      textoVoz: 'El botón de redactar informe para acudientes genera un resumen cálido y constructivo.',
      estado: 'celebrando',
      priority: 1,
    },
  ],
};
