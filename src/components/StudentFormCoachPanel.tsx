import React, { useMemo } from 'react';
import { Check, Sparkles, AlertTriangle, Users, Phone, HeartHandshake } from 'lucide-react';
import { Student, ShiftType } from '../types';

// Institutional PNGs for Yacita
import yacitaApuntando from '../assets/apuntando_notas.png';
import yacitaEmpatica from '../assets/empatica.png';
import yacitaPulgar from '../assets/pulgar_arriba.png';
import yacitaHablando from '../assets/hablando.png';

export type StudentFormFieldKey =
  | 'fullName'
  | 'grade'
  | 'shift'
  | 'guardianName'
  | 'contactPhone'
  | 'medicalSensoryNotes'
  | null;

export interface StudentFormCoachPanelProps {
  focusedField: StudentFormFieldKey;
  fullName: string;
  grade: string;
  shift: ShiftType;
  guardianName: string;
  contactPhone: string;
  medicalSensoryNotes: string;
  students: Student[];
  currentStudentId?: string;
  teacherFirstName: string;
  // Setters to apply suggestions
  onApplyFullName: (val: string) => void;
  onApplyGrade: (val: string) => void;
  onApplyShift: (val: ShiftType) => void;
  onApplyGuardianName: (val: string) => void;
  onApplyPhone: (val: string) => void;
  onApplyNotes: (val: string) => void;
}

export const StudentFormCoachPanel: React.FC<StudentFormCoachPanelProps> = ({
  focusedField,
  fullName,
  grade,
  shift,
  guardianName,
  contactPhone,
  medicalSensoryNotes,
  students,
  currentStudentId,
  teacherFirstName,
  onApplyFullName,
  onApplyGrade,
  onApplyShift,
  onApplyGuardianName,
  onApplyNotes,
}) => {
  // 1. Calculate completion progress (5 key fields)
  const completedCount = useMemo(() => {
    let count = 0;
    if (fullName.trim().length >= 3) count++;
    if (grade.trim().length >= 3) count++;
    if (shift) count++;
    if (guardianName.trim().length >= 3) count++;
    // Phone or notes counted towards full profile
    const rawPhone = contactPhone.replace(/\D/g, '');
    if (rawPhone.length === 10 || medicalSensoryNotes.trim().length > 0) count++;
    return count;
  }, [fullName, grade, shift, guardianName, contactPhone, medicalSensoryNotes]);

  // Unique registered grades
  const uniqueGrades = useMemo(() => {
    const set = new Set(students.map((s) => s.grade).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);

  // Check duplicate full name
  const duplicateStudent = useMemo(() => {
    if (!fullName.trim() || fullName.trim().length < 4) return null;
    const cleanInput = fullName.trim().toLowerCase();
    return (
      students.find(
        (s) =>
          s.id !== currentStudentId &&
          (s.fullName.toLowerCase() === cleanInput ||
            (s.fullName.toLowerCase().includes(cleanInput) && cleanInput.length >= 6))
      ) || null
    );
  }, [fullName, students, currentStudentId]);

  // Check predominant shift for the chosen grade
  const predominantShift = useMemo(() => {
    if (!grade.trim()) return null;
    const sameGradeStudents = students.filter(
      (s) => s.grade.toLowerCase() === grade.trim().toLowerCase()
    );
    if (sameGradeStudents.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const s of sameGradeStudents) {
      counts[s.shift] = (counts[s.shift] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return (sorted[0]?.[0] as ShiftType) || null;
  }, [grade, students]);

  // Sibling guardian recommendation (match by surname)
  const suggestedGuardian = useMemo(() => {
    if (!fullName.trim() || fullName.trim().split(/\s+/).length < 2) return null;
    const words = fullName.trim().split(/\s+/);
    // last word or last two words
    const surnames = words.slice(1).map((w) => w.toLowerCase());
    for (const s of students) {
      if (s.id === currentStudentId) continue;
      const sWords = s.fullName.toLowerCase().split(/\s+/);
      const hasMatch = surnames.some((sur) => sur.length > 3 && sWords.includes(sur));
      if (hasMatch && s.guardianName && s.guardianName.trim() !== guardianName.trim()) {
        return {
          guardianName: s.guardianName,
          siblingName: s.fullName,
        };
      }
    }
    return null;
  }, [fullName, students, currentStudentId, guardianName]);

  // Phone validation
  const phoneValidation = useMemo(() => {
    const raw = contactPhone.replace(/\D/g, '');
    if (!raw) return null;
    if (raw.length < 10) return { valid: false, message: `Faltan ${10 - raw.length} dígitos (son 10)` };
    if (raw.length > 10) return { valid: false, message: `Sobran ${raw.length - 10} dígitos` };
    if (!raw.startsWith('3')) return { valid: false, message: 'El celular en Colombia inicia con 3' };
    return { valid: true, message: 'Número válido (10 dígitos)' };
  }, [contactPhone]);

  // Title case helper
  const handleFixNameFormat = () => {
    const formatted = fullName
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    onApplyFullName(formatted);
  };

  // Determine active Yacita image
  let activeImage = yacitaApuntando;
  if (duplicateStudent) {
    activeImage = yacitaEmpatica;
  } else if (completedCount === 5) {
    activeImage = yacitaPulgar;
  } else if (focusedField) {
    activeImage = yacitaHablando;
  }

  return (
    <aside className="w-full lg:w-80 shrink-0 bg-slate-50 dark:bg-[#0c152e] border-b lg:border-b-0 lg:border-l border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between">
      <div>
        {/* Header & Progress */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 shrink-0 rounded-full bg-amber-100 dark:bg-amber-950/40 p-1 flex items-center justify-center border border-amber-300 dark:border-amber-700/60 shadow-xs">
            <img
              src={activeImage}
              alt="Yacita Asistente de Formulario"
              className="w-full h-full object-contain aspect-square"
            />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Guía de Registro
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              Acompañamiento Yacita
            </h4>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${(completedCount / 5) * 100}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                {completedCount}/5
              </span>
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div className="mb-4 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span>Progreso obligatorio:</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            {completedCount === 5 ? '¡Listo para guardar! ⭐' : `Vas ${completedCount} de 5 campos`}
          </span>
        </div>

        {/* Dynamic Contextual Guidance based on current field */}
        <div className="space-y-3">
          {(!focusedField || focusedField === 'fullName') && (
            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-xs space-y-2">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                1. Nombre completo del estudiante:
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                Ingresa nombres y apellidos completos como figuran en el documento de identidad. Ej: Juan Andrés Pushaina Epieyú.
              </p>

              {fullName.trim().length > 2 && (
                <button
                  type="button"
                  onClick={handleFixNameFormat}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-[11px] font-medium hover:bg-amber-100/50 transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Corregir mayúsculas y formato</span>
                </button>
              )}

              {duplicateStudent && (
                <div className="p-2 rounded-lg bg-red-100/80 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-[11px] text-red-800 dark:text-red-300 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Posible duplicado:</strong> Ya existe registrado{' '}
                    <em>«{duplicateStudent.fullName}»</em> ({duplicateStudent.grade}). Verifica si es un reingreso.
                  </div>
                </div>
              )}
            </div>
          )}

          {focusedField === 'grade' && (
            <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 text-xs space-y-2">
              <p className="font-semibold text-blue-900 dark:text-blue-200">
                2. Grado / Grupo:
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                Usa el formato institucional (ej. 1-01, 1-02). Puedes seleccionar uno de los grupos ya existentes:
              </p>
              {uniqueGrades.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {uniqueGrades.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => onApplyGrade(g)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                        grade === g
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 hover:bg-blue-100/60'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {focusedField === 'shift' && (
            <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 text-xs space-y-2">
              <p className="font-semibold text-indigo-900 dark:text-indigo-200">
                3. Jornada Escolar:
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                Selecciona Mañana o Tarde según el horario regular del curso.
              </p>
              {predominantShift && predominantShift !== shift && (
                <button
                  type="button"
                  onClick={() => onApplyShift(predominantShift)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300 text-[11px] font-medium hover:bg-indigo-100/50 transition-colors shadow-2xs"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Sugerir jornada de compañeros: «{predominantShift}»</span>
                </button>
              )}
            </div>
          )}

          {focusedField === 'guardianName' && (
            <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-2">
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                4. Nombre del Acudiente / Familiar:
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                Es la persona autorizada para contactar y firmar actas o compromisos formativos.
              </p>
              {suggestedGuardian && (
                <button
                  type="button"
                  onClick={() => onApplyGuardianName(suggestedGuardian.guardianName)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium hover:bg-emerald-100/50 transition-colors shadow-2xs"
                >
                  <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sugerir acudiente de {suggestedGuardian.siblingName.split(' ')[0]}: «{suggestedGuardian.guardianName}»</span>
                </button>
              )}
            </div>
          )}

          {focusedField === 'contactPhone' && (
            <div className="p-3 rounded-xl bg-teal-50/80 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 text-xs space-y-2">
              <p className="font-semibold text-teal-900 dark:text-teal-200">
                5. Teléfono de Contacto:
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                Celular colombiano a 10 dígitos. Lo formateamos automáticamente para fácil lectura.
              </p>
              {phoneValidation && (
                <div
                  className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                    phoneValidation.valid
                      ? 'bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-amber-100/80 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300'
                  }`}
                >
                  {phoneValidation.valid ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Phone className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>{phoneValidation.message}</span>
                </div>
              )}
            </div>
          )}

          {focusedField === 'medicalSensoryNotes' && (
            <div className="p-3 rounded-xl bg-purple-50/80 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 text-xs space-y-2">
              <p className="font-semibold text-purple-900 dark:text-purple-200">
                6. Observación Médica o Sensorial:
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                Información sobre salud o necesidades sensoriales para adaptar las actividades de clase.
              </p>

              {!medicalSensoryNotes.trim() && (
                <button
                  type="button"
                  onClick={() => onApplyNotes('Sin observaciones médicas reportadas')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300 text-[11px] font-medium hover:bg-purple-100/50 transition-colors shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5 text-purple-600" />
                  <span>Usar: «Sin observaciones médicas reportadas»</span>
                </button>
              )}

              {medicalSensoryNotes.trim().length > 0 && medicalSensoryNotes.trim().length < 15 && (
                <button
                  type="button"
                  onClick={() =>
                    onApplyNotes(
                      `${medicalSensoryNotes.trim()}; requiere ubicación preferente y pausas motrices según necesidad.`
                    )
                  }
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300 text-[11px] font-medium hover:bg-purple-100/50 transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Ampliar redacción pedagógica formativa</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer reassurance */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 text-center">
        <span>I.E. Denzil Escolar · Acompañamiento empático</span>
      </div>
    </aside>
  );
};
