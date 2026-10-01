import React, { useMemo } from 'react';
import {
  Check,
  Sparkles,
  AlertTriangle,
  Users,
  Phone,
  HeartHandshake,
  RotateCw,
  Info,
  Lightbulb,
} from 'lucide-react';
import { Student, ShiftType } from '../types';
import { useYacitaCoach } from '../coach';
import { getGuiaCampo } from '../config/yacitaMensajes';

// Institutional PNGs for Yacita - Strict Anti-SVG rule
import yacitaApuntando from '../assets/apuntando_notas.png';
import yacitaEmpatica from '../assets/empatica.png';
import yacitaPulgar from '../assets/pulgar_arriba.png';
import yacitaHablando from '../assets/hablando.png';
import yacitaCelebrando from '../assets/celebrando.png';

export type StudentFormFieldKey =
  | 'fullName'
  | 'grade'
  | 'shift'
  | 'guardianName'
  | 'contactPhone'
  | 'medicalSensoryNotes'
  | 'save'
  | 'cancel'
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
  onApplyPhone,
  onApplyNotes,
}) => {
  const {
    activeFieldGuide,
    activeConsejoIndex,
    rotateConsejo,
    isSpeaking,
    isTyping,
    displayedText,
    skipVoiceAndComplete,
  } = useYacitaCoach();

  // Strict valid completion calculation (5 mandatory fields)
  const completedCount = useMemo(() => {
    let count = 0;
    // 1. Full name: min 4 chars and at least two words
    const cleanName = fullName.trim();
    if (cleanName.length >= 4 && cleanName.split(/\s+/).length >= 2) count++;

    // 2. Grade: min 3 chars
    if (grade.trim().length >= 3) count++;

    // 3. Shift: valid school shift
    if (shift === 'Mañana' || shift === 'Tarde') count++;

    // 4. Guardian: min 3 chars
    if (guardianName.trim().length >= 3) count++;

    // 5. Phone: Colombian 10-digit mobile starting with 3
    const rawPhone = contactPhone.replace(/\D/g, '');
    if (rawPhone.length === 10 && rawPhone.startsWith('3')) count++;

    return count;
  }, [fullName, grade, shift, guardianName, contactPhone]);

  // Unique registered grades
  const uniqueGrades = useMemo(() => {
    const set = new Set(students.map((s) => s.grade).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);

  // Duplicate name detection
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

  // Predominant shift for chosen grade
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

  // Sibling guardian recommendation
  const suggestedGuardian = useMemo(() => {
    if (!fullName.trim() || fullName.trim().split(/\s+/).length < 2) return null;
    const words = fullName.trim().split(/\s+/);
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
    if (raw.length < 10) return { valid: false, message: `Faltan ${10 - raw.length} dígitos (el celular en Colombia tiene 10)` };
    if (raw.length > 10) return { valid: false, message: `Sobran ${raw.length - 10} dígitos` };
    if (!raw.startsWith('3')) return { valid: false, message: 'El celular en Colombia inicia con 3' };
    return { valid: true, message: 'Número válido (10 dígitos)' };
  }, [contactPhone]);

  // Fix casing
  const handleFixNameFormat = () => {
    const formatted = fullName
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    onApplyFullName(formatted);
  };

  // Resolve current active field key
  const effectiveFieldKey = useMemo(() => {
    if (activeFieldGuide?.id?.startsWith('field_')) {
      return activeFieldGuide.id.replace('field_', '');
    }
    if (activeFieldGuide?.id === 'btn_student_save') return 'save';
    if (activeFieldGuide?.id === 'btn_student_cancel') return 'cancel';
    return focusedField || 'fullName';
  }, [activeFieldGuide, focusedField]);

  // Resolve GuiaCampo item from catalog
  const currentGuia = useMemo(() => {
    const catalogKey =
      effectiveFieldKey === 'save'
        ? 'btn_student_save'
        : effectiveFieldKey === 'cancel'
        ? 'btn_student_cancel'
        : `field_${effectiveFieldKey}`;

    return getGuiaCampo(catalogKey, { nombre: teacherFirstName });
  }, [effectiveFieldKey, teacherFirstName]);

  // Determine active Yacita image
  const activeImage = useMemo(() => {
    if (duplicateStudent) return yacitaEmpatica;
    if (isSpeaking) return yacitaHablando;
    if (completedCount === 5) return yacitaCelebrando;
    if (effectiveFieldKey === 'fullName' || effectiveFieldKey === 'grade') return yacitaApuntando;
    return yacitaPulgar;
  }, [duplicateStudent, isSpeaking, completedCount, effectiveFieldKey]);

  // Active consejo with rotation
  const currentConsejo = useMemo(() => {
    if (!currentGuia || currentGuia.consejos.length === 0) return '';
    return currentGuia.consejos[activeConsejoIndex % currentGuia.consejos.length];
  }, [currentGuia, activeConsejoIndex]);

  return (
    <aside
      className="w-full lg:w-80 shrink-0 bg-slate-50 dark:bg-[#0c152e] border-b lg:border-b-0 lg:border-l border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col justify-between"
      aria-label="Panel de Acompañamiento y Guía de Yacita"
    >
      <div>
        {/* Header & Progress */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 shrink-0 rounded-full bg-amber-100 dark:bg-amber-950/40 p-1 flex items-center justify-center border border-amber-300 dark:border-amber-700/60 shadow-xs">
            <img
              src={activeImage}
              alt="Yacita Asistente de Formulario"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain aspect-square"
            />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
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
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {completedCount}/5
              </span>
            </div>
          </div>
        </div>

        {/* IN-PANEL YACITA DIALOGUE BUBBLE (Parte 4: Un solo lugar de diálogo a la vez, dentro del panel) */}
        {displayedText && (
          <div
            data-yacita-bubble="true"
            onClick={skipVoiceAndComplete}
            className="relative mb-3.5 p-3 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 shadow-xs cursor-pointer animate-in fade-in zoom-in-95 duration-150"
            role="region"
            aria-live="polite"
            title="Haz clic para completar la voz y el texto"
          >
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-amber-200/70 dark:border-amber-900/60">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Yacita te acompaña:
              </span>
              {isSpeaking && (
                <span className="text-xs px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                  🔊 Hablando
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed font-medium text-slate-800 dark:text-slate-100">
              {displayedText}
              {(isSpeaking || isTyping) && (
                <span className="inline-block w-1.5 h-3 ml-0.5 bg-amber-500 animate-pulse align-middle" />
              )}
            </p>
            {/* Speech tail pointing towards mini-avatar */}
            <div
              className="absolute -top-1.5 left-7 w-3 h-3 bg-amber-50/90 dark:bg-[#1a233a] border-l-2 border-t-2 border-amber-400 dark:border-amber-600 transform rotate-45"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Status Pill */}
        <div className="mb-4 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span>Campos completados:</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            {completedCount === 5 ? '¡Listo para guardar! ⭐' : `${completedCount} de 5 campos`}
          </span>
        </div>

        {/* Dynamic Contextual Guidance with aria-live="polite" */}
        <div
          aria-live="polite"
          className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-amber-300/80 dark:border-amber-600/60 shadow-xs text-xs space-y-3 animate-in fade-in duration-200"
        >
          {currentGuia && (
            <>
              {/* Field Number & Label */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  {currentGuia.numero && (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                      {currentGuia.numero}
                    </span>
                  )}
                  <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    {currentGuia.etiqueta}
                  </h5>
                </div>
                {currentGuia.consejos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => rotateConsejo(currentGuia.id)}
                    className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                    title="Rotar y ver otro consejo para este campo"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Ver otro consejo</span>
                  </button>
                )}
              </div>

              {/* "Para qué sirve" (Function) */}
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  ¿Para qué sirve?
                </span>
                <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed">
                  {currentGuia.funcion}
                </p>
              </div>

              {/* Concrete Rotating Advice */}
              <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  Consejo de Yacita:
                </span>
                <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed font-medium">
                  {currentConsejo}
                </p>
              </div>

              {/* Interactive Chips & 1-Click Actions */}
              <div className="pt-1 space-y-2">
                {/* Full name actions */}
                {effectiveFieldKey === 'fullName' && (
                  <>
                    {fullName.trim().length > 2 && (
                      <button
                        type="button"
                        onClick={handleFixNameFormat}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100/70 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-semibold transition-colors shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Corregir mayúsculas y tildes</span>
                      </button>
                    )}

                    {duplicateStudent && (
                      <div className="p-2 rounded-lg bg-red-100/90 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-xs text-red-900 dark:text-red-200 flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Aviso amable:</strong> Ya existe registrado{' '}
                          <em>«{duplicateStudent.fullName}»</em> ({duplicateStudent.grade}). Verifica si es un reingreso.
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Grade chips */}
                {effectiveFieldKey === 'grade' && uniqueGrades.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Grupos ya registrados:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {uniqueGrades.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => onApplyGrade(g)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                            grade === g
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/60'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shift suggestions */}
                {effectiveFieldKey === 'shift' && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => onApplyShift('Mañana')}
                        className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all border ${
                          shift === 'Mañana'
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Mañana
                      </button>
                      <button
                        type="button"
                        onClick={() => onApplyShift('Tarde')}
                        className={`flex-1 py-1 rounded-md text-xs font-semibold transition-all border ${
                          shift === 'Tarde'
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        Tarde
                      </button>
                    </div>

                    {predominantShift && predominantShift !== shift && (
                      <button
                        type="button"
                        onClick={() => onApplyShift(predominantShift)}
                        className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 text-xs font-medium hover:bg-indigo-100/60 transition-colors"
                      >
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Sugerir jornada de compañeros: «{predominantShift}»</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Guardian suggestions */}
                {effectiveFieldKey === 'guardianName' && suggestedGuardian && (
                  <button
                    type="button"
                    onClick={() => onApplyGuardianName(suggestedGuardian.guardianName)}
                    className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-medium hover:bg-emerald-100/60 transition-colors"
                  >
                    <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sugerir acudiente de {suggestedGuardian.siblingName.split(' ')[0]}: «{suggestedGuardian.guardianName}»</span>
                  </button>
                )}

                {/* Phone validation pill */}
                {effectiveFieldKey === 'contactPhone' && phoneValidation && (
                  <div
                    className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
                      phoneValidation.valid
                        ? 'bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300'
                        : 'bg-amber-100/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300'
                    }`}
                  >
                    {phoneValidation.valid ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    )}
                    <span>{phoneValidation.message}</span>
                  </div>
                )}

                {/* Medical sensory chips */}
                {effectiveFieldKey === 'medicalSensoryNotes' && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                      Ejemplos pedagógicos estándar:
                    </span>
                    {currentGuia.chips?.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onApplyNotes(chip.value)}
                        className="w-full text-left p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-purple-100/60 dark:hover:bg-purple-950/50 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-3 h-3 text-purple-600 shrink-0" />
                        <span className="truncate">{chip.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Save button explanation */}
                {effectiveFieldKey === 'save' && (
                  <div className="text-xs text-slate-700 dark:text-slate-200 space-y-1">
                    {completedCount === 5 ? (
                      <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        ✓ Todos los campos obligatorios están completos. Al guardar se creará la ficha del estudiante.
                      </p>
                    ) : (
                      <p className="text-amber-700 dark:text-amber-400 font-semibold">
                        Aún faltan {5 - completedCount} campos obligatorios. Complétalos para habilitar el guardado óptimo.
                      </p>
                    )}
                  </div>
                )}

                {/* Cancel button explanation */}
                {effectiveFieldKey === 'cancel' && (
                  <div className="text-xs text-slate-700 dark:text-slate-200">
                    <p className="text-slate-600 dark:text-slate-300">
                      Descarta cualquier edición realizada en esta ventana y regresa al directorio.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Reassurance */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 text-center">
        <span>I.E. Denzil Escolar · Orientación pedagógica cálida</span>
      </div>
    </aside>
  );
};
