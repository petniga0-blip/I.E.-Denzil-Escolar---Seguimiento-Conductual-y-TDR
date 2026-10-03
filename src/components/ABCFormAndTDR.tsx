import React, { useState, useMemo } from 'react';
import {
  FileText,
  AlertTriangle,
  HeartHandshake,
  Star,
  Clock,
  BookOpen,
  Send,
  Calendar,
  User,
  PlusCircle,
  Filter,
  Eye,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import {
  Student,
  ABCIncident,
  COMMON_TRIGGERS,
  COMMON_BEHAVIORS,
  COMMON_REGULATORY_ACTIONS,
  TeacherProfile,
} from '../types';
import { YacitaRewriteButton } from './YacitaRewriteButton';
import { suggestRestorativePlanWithYacita } from '../utils/yacitaAI';
import { fechaLocalHoy } from '../utils/dateUtils';
import { Lightbulb } from 'lucide-react';
import { useToast } from './Toast';

interface ABCFormAndTDRProps {
  students: Student[];
  incidents: ABCIncident[];
  teacher: TeacherProfile;
  preselectedStudentId?: string;
  onSaveIncident: (incident: Omit<ABCIncident, 'id' | 'createdAt'>) => void;
  onOpenReportModal: (incident: ABCIncident) => void;
}

export const ABCFormAndTDR: React.FC<ABCFormAndTDRProps> = ({
  students,
  incidents,
  teacher,
  preselectedStudentId,
  onSaveIncident,
  onOpenReportModal,
}) => {
  const { showToast } = useToast();
  const todayStr = useMemo(() => fechaLocalHoy(), []);
  const currentTimeStr = useMemo(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }, []);

  // Form State
  const [studentId, setStudentId] = useState<string>(
    preselectedStudentId || (students.length > 0 ? students[0].id : '')
  );
  const [date, setDate] = useState<string>(todayStr);
  const [time, setTime] = useState<string>(currentTimeStr);
  const [subject, setSubject] = useState<string>('Actividad de Aula / Guía Pedagógica');

  // [A] Antecedente
  const [expectedBehavior, setExpectedBehavior] = useState<string>('Completar la guía escolar y participar en silencio');
  const [expectedBehaviorStars, setExpectedBehaviorStars] = useState<number>(3);
  const [trigger, setTrigger] = useState<string>(COMMON_TRIGGERS[1]);
  const [triggerOther, setTriggerOther] = useState<string>('');

  // [B] Conducta Observada
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [otherBehaviorDetail, setOtherBehaviorDetail] = useState<string>('');

  // [C] Consecuencia / Plan Regulador
  const [selectedRegulatoryActions, setSelectedRegulatoryActions] = useState<string[]>([
    COMMON_REGULATORY_ACTIONS[2], // Pausa reguladora
  ]);
  const [restorativeAgreement, setRestorativeAgreement] = useState<string>(
    'El estudiante respira profundamente, organiza su pupitre y dialoga con el docente sobre el manejo de la frustración.'
  );
  const [teacherObservations, setTeacherObservations] = useState<string>(
    'Se interviene con tono calmado. El estudiante recupera la regulación y se reintegra a la jornada formativa.'
  );
  const [isSuggestingPlan, setIsSuggestingPlan] = useState<boolean>(false);

  // Smart suggestion for restorative consequences with Yacita
  const handleSuggestPlanWithYacita = async () => {
    setIsSuggestingPlan(true);
    try {
      const suggestions = await suggestRestorativePlanWithYacita(selectedBehaviors, otherBehaviorDetail);
      const newActions: string[] = [];
      const joined = (suggestions.join(' ') + ' ' + selectedBehaviors.join(' ') + ' ' + otherBehaviorDetail).toLowerCase();

      if (joined.includes('pausa') || joined.includes('sensorial') || joined.includes('calma')) {
        newActions.push(COMMON_REGULATORY_ACTIONS[2]);
      }
      if (joined.includes('recreo') || joined.includes('mediado') || joined.includes('agresion') || joined.includes('golpe') || joined.includes('pego')) {
        newActions.push(COMMON_REGULATORY_ACTIONS[0]);
      }
      if (joined.includes('dialogo') || joined.includes('conversacion') || joined.includes('merienda')) {
        newActions.push(COMMON_REGULATORY_ACTIONS[1]);
      }
      if (joined.includes('reparacion') || joined.includes('acuerdo') || joined.includes('simbolica') || joined.includes('disculpa')) {
        newActions.push(COMMON_REGULATORY_ACTIONS[5]);
      }
      if (joined.includes('material') || joined.includes('pupitre') || joined.includes('utiles') || joined.includes('tijera')) {
        newActions.push(COMMON_REGULATORY_ACTIONS[3]);
      }
      if (newActions.length === 0) {
        newActions.push(COMMON_REGULATORY_ACTIONS[2], COMMON_REGULATORY_ACTIONS[5]);
      }
      setSelectedRegulatoryActions(Array.from(new Set(newActions)));

      // Also suggest a customized restorative pact
      if (!restorativeAgreement || restorativeAgreement.includes('El estudiante respira')) {
        if (joined.includes('agresion') || joined.includes('golpe') || joined.includes('pego')) {
          setRestorativeAgreement('Pausa guiada en el rincón de la calma, ejercicio de respiración y diálogo restaurativo mediado para restablecer la sana convivencia.');
        } else if (joined.includes('material') || joined.includes('tijera') || joined.includes('cuaderno')) {
          setRestorativeAgreement('El estudiante organiza y repara el material escolar del aula, dialoga con el docente sobre el cuidado de los recursos y retoma la actividad escolar.');
        } else {
          setRestorativeAgreement('Acuerdo de escucha atenta con el docente, pausa de autorregulación y compromiso de pedir la palabra levantando la mano.');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggestingPlan(false);
    }
  };

  // History Filter
  const [filterStudentId, setFilterStudentId] = useState<string>('todos');
  const [formSuccessMessage, setFormSuccessMessage] = useState<string>('');

  const currentSelectedStudent = useMemo(() => {
    return students.find((s) => s.id === studentId);
  }, [students, studentId]);

  // Suggested Expected Behaviors
  const SUGGESTED_EXPECTED = [
    'Completar la guía escolar en su pupitre',
    'Participar en la ronda formativa y escuchar a sus pares',
    'Compartir materiales escolares con amabilidad',
    'Permanecer en el aula durante la explicación',
    'Respetar el turno de la palabra levantando la mano',
  ];

  const handleToggleBehavior = (item: string) => {
    if (selectedBehaviors.includes(item)) {
      setSelectedBehaviors(selectedBehaviors.filter((b) => b !== item));
    } else {
      setSelectedBehaviors([...selectedBehaviors, item]);
    }
  };

  const handleToggleRegulatory = (action: string) => {
    if (selectedRegulatoryActions.includes(action)) {
      setSelectedRegulatoryActions(selectedRegulatoryActions.filter((a) => a !== action));
    } else {
      setSelectedRegulatoryActions([...selectedRegulatoryActions, action]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedStudent) return;

    if (selectedBehaviors.length === 0 && !otherBehaviorDetail.trim()) {
      showToast('Por favor seleccione al menos una conducta observada o descríbala.', 'error');
      return;
    }

    onSaveIncident({
      studentId: currentSelectedStudent.id,
      studentName: currentSelectedStudent.fullName,
      grade: currentSelectedStudent.grade,
      shift: currentSelectedStudent.shift,
      date,
      time,
      subject,
      expectedBehavior,
      expectedBehaviorStars,
      trigger,
      triggerOther: triggerOther.trim(),
      observedBehaviors: selectedBehaviors,
      otherBehaviorDetail: otherBehaviorDetail.trim(),
      regulatoryActions: selectedRegulatoryActions,
      restorativeAgreement: restorativeAgreement.trim(),
      teacherObservations: teacherObservations.trim(),
      teacherName: teacher.name,
      guardianSigned: false,
      studentCommitted: true,
    });

    setFormSuccessMessage('¡Incidencia formativa A-B-C registrada con éxito!');
    setTimeout(() => setFormSuccessMessage(''), 4000);
  };

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      return filterStudentId === 'todos' || inc.studentId === filterStudentId;
    });
  }, [incidents, filterStudentId]);

  return (
    <div className="space-y-8 pb-36">
      {/* Introduction Banner on A-B-C & Restorative Justice */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-5 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <span className="text-xs uppercase tracking-wider font-semibold text-amber-300">
              Modelo Formativo A-B-C & Justicia Restaurativa Escolar
            </span>
            <h2 className="text-lg sm:text-xl font-black">
              Registro Rápido de Incidencias y Tarjeta Diaria de Reporte (TDR)
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Enfocado en comprender el antecedente detonante, registrar la conducta objetiva sin juicios
              y aplicar consecuencias restauradoras con mediación y reparación pedagógica.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-xs shrink-0">
            <HeartHandshake className="w-8 h-8 text-amber-300" />
            <div className="text-xs">
              <span className="font-bold block">Pacto de Aula</span>
              <span className="text-blue-200">Enfoque no punitivo</span>
            </div>
          </div>
        </div>
      </div>

      {/* FORM: REGISTRO A-B-C */}
      <div className="bg-white dark:bg-[#131f42] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
              +
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Nuevo Registro Formativo A-B-C
            </h3>
          </div>
          {formSuccessMessage && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle className="w-3.5 h-3.5" />
              {formSuccessMessage}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top Context: Student, Date, Time, Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estudiante *
              </label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                data-yacita="abc_student_select"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.grade} - {s.shift})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fecha del Suceso *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                data-yacita="abc_date_time"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Hora Aproximada *
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                data-yacita="abc_date_time"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Asignatura / Momento *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej. Matemáticas, Recreo, Transición..."
                data-yacita="abc_subject_input"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
              />
            </div>
          </div>

          {/* [A] ANTECEDENTE / META ESPERADA */}
          <div className="p-4 sm:p-5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                A
              </span>
              <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm sm:text-base">
                [A] ANTECEDENTE / META ESPERADA
              </h4>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ¿Qué conducta se esperaba del estudiante en ese momento?
              </label>
              <input
                type="text"
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
                placeholder="Describa la conducta esperada..."
                data-yacita="abc_expected_behavior"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
              />

              {/* Yacita AI Rewrite for Expected Behavior */}
              <div className="mt-1.5">
                <YacitaRewriteButton
                  currentText={expectedBehavior}
                  field="antecedent"
                  onApply={(improved) => setExpectedBehavior(improved)}
                  context={{
                    studentName: currentSelectedStudent?.fullName,
                    grade: currentSelectedStudent?.grade,
                  }}
                />
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium mr-1">
                  Sugerencias:
                </span>
                {SUGGESTED_EXPECTED.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setExpectedBehavior(sug)}
                    className="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-blue-500 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Stars Rating: Nivel de logro alcanzado en la meta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Nivel de logro alcanzado en la meta pedagógica:
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  {expectedBehaviorStars} de 5 estrellas
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setExpectedBehaviorStars(star)}
                    className="p-1 rounded hover:scale-110 transition-transform focus:outline-hidden min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={`${star} estrellas`}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= expectedBehaviorStars
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Detonante Identified */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Detonante Identificado (Gatillo ambiental o relacional):
              </label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                data-yacita="abc_trigger_select"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
              >
                {COMMON_TRIGGERS.map((trig, idx) => (
                  <option key={idx} value={trig}>
                    {trig}
                  </option>
                ))}
              </select>
              {trigger.includes('Otro') && (
                <input
                  type="text"
                  value={triggerOther}
                  onChange={(e) => setTriggerOther(e.target.value)}
                  placeholder="Especifique el detonante observado..."
                  className="mt-2 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[44px]"
                />
              )}
            </div>
          </div>

          {/* [B] CONDUCTA OBSERVADA */}
          <div className="p-4 sm:p-5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                B
              </span>
              <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm sm:text-base">
                [B] CONDUCTA OBSERVADA (Selección Múltiple Rápida)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {COMMON_BEHAVIORS.map((beh, idx) => {
                const isSelected = selectedBehaviors.includes(beh);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleBehavior(beh)}
                    data-yacita="abc_behavior_checkbox"
                    className={`flex items-center text-left gap-2.5 p-3 rounded-lg text-xs font-semibold border transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                        : 'bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    <span className="w-4 h-4 rounded border flex items-center justify-center text-xs font-bold shrink-0">
                      {isSelected ? '✓' : ''}
                    </span>
                    <span>{beh}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Otra conducta observada o detalle específico:
              </label>
              <input
                type="text"
                value={otherBehaviorDetail}
                onChange={(e) => setOtherBehaviorDetail(e.target.value)}
                placeholder="Ej. Rasgó la hoja de trabajo al no poder borrar..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[44px]"
              />

              {/* Yacita AI Rewrite for Behavior Description */}
              <div className="mt-1.5">
                <YacitaRewriteButton
                  currentText={otherBehaviorDetail || selectedBehaviors.join('; ')}
                  field="behavior"
                  onApply={(improved) => setOtherBehaviorDetail(improved)}
                  context={{
                    studentName: currentSelectedStudent?.fullName,
                    grade: currentSelectedStudent?.grade,
                  }}
                />
              </div>
            </div>
          </div>

          {/* [C] CONSECUENCIA / PLAN REGULADOR */}
          <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 dark:border-emerald-900/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  C
                </span>
                <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm sm:text-base">
                  [C] CONSECUENCIA / PLAN REGULADOR (Enfoque Formativo y Restaurativo)
                </h4>
              </div>

              {/* Yacita AI Smart Suggestion Button */}
              <button
                type="button"
                onClick={handleSuggestPlanWithYacita}
                disabled={isSuggestingPlan}
                data-yacita="abc_btn_suggest_plan"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
                title="Yacita evaluará las conductas marcadas y sugerirá la mejor combinación restaurativa"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>{isSuggestingPlan ? 'Yacita evaluando...' : '💡 Yacita: Sugerir plan restaurativo'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Seleccione las estrategias pedagógicas y restaurativas aplicadas para guiar la calma y la reparación:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COMMON_REGULATORY_ACTIONS.map((action, idx) => {
                const isSelected = selectedRegulatoryActions.includes(action);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleToggleRegulatory(action)}
                    data-yacita="abc_regulatory_checkbox"
                    className={`flex items-center text-left gap-2.5 p-3 rounded-lg text-xs font-semibold border transition-all min-h-[44px] focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                        : 'bg-white dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    <span className="w-4 h-4 rounded border flex items-center justify-center text-xs font-bold shrink-0">
                      {isSelected ? '✓' : ''}
                    </span>
                    <span>{action}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Acuerdo de Convivencia y Reparación Restaurativa Pactada:
              </label>
              <textarea
                rows={2}
                value={restorativeAgreement}
                onChange={(e) => setRestorativeAgreement(e.target.value)}
                placeholder="Pacto concertado con el estudiante (reparación del material, respiración guiada, disculpa)..."
                data-yacita="abc_restorative_agreement"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-none"
              />

              <div className="mt-1.5">
                <YacitaRewriteButton
                  currentText={restorativeAgreement}
                  field="commitments"
                  onApply={(improved) => setRestorativeAgreement(improved)}
                  context={{
                    studentName: currentSelectedStudent?.fullName,
                    grade: currentSelectedStudent?.grade,
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Observaciones del Docente / Orientador:
              </label>
              <textarea
                rows={2}
                value={teacherObservations}
                onChange={(e) => setTeacherObservations(e.target.value)}
                placeholder="Observaciones finales del docente..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-none"
              />

              <div className="mt-1.5">
                <YacitaRewriteButton
                  currentText={teacherObservations}
                  field="general"
                  onApply={(improved) => setTeacherObservations(improved)}
                  context={{
                    studentName: currentSelectedStudent?.fullName,
                    grade: currentSelectedStudent?.grade,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              data-yacita="abc_btn_save"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm transition-colors shadow-xs min-h-[44px]"
            >
              <Send className="w-4 h-4" />
              <span>Guardar Registro A-B-C</span>
            </button>
          </div>
        </form>
      </div>

      {/* HISTORIAL DE INCIDENCIAS FORMATIVAS REGISTRADAS */}
      <div className="bg-white dark:bg-[#131f42] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Historial de Incidencias y Tarjetas Diarias (TDR)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {filteredIncidents.length} registros guardados
            </p>
          </div>

          {/* Filter by Student */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={filterStudentId}
              onChange={(e) => setFilterStudentId(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[44px]"
            >
              <option value="todos">Todos los Estudiantes</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center text-slate-600 dark:text-slate-300 text-sm">
            No hay incidencias formativas registradas para el filtro seleccionado.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredIncidents.map((inc) => (
              <div
                key={inc.id}
                className="p-4 sm:p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                      {inc.studentName}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                      Grado {inc.grade}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {inc.date} a las {inc.time} ({inc.subject})
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <strong>Detonante:</strong> {inc.trigger}
                    </span>
                    <span>
                      <strong>Logro Meta:</strong> {inc.expectedBehaviorStars}/5 ★
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <strong>Conducta observada:</strong> {inc.observedBehaviors.join(', ')}
                    {inc.otherBehaviorDetail && ` (${inc.otherBehaviorDetail})`}
                  </div>

                  <p className="text-xs text-emerald-700 dark:text-emerald-400 italic">
                    Acuerdo: {inc.restorativeAgreement}
                  </p>
                </div>

                {/* Direct Action Button to view / print / download official TDR */}
                <div className="shrink-0 self-end md:self-center">
                  <button
                    onClick={() => onOpenReportModal(inc)}
                    data-yacita="abc_btn_open_report"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition-colors shadow-xs min-h-[44px]"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Generar Reporte Oficial TDR</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
