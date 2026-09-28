import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Check,
  AlertTriangle,
  Flame,
  CheckCircle2,
  FileSpreadsheet,
  FilePlus2,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import {
  Student,
  DailyCriterionScore,
  ScoreLevel,
  ShiftType,
  CRITERIA_DEFINITIONS,
} from '../types';
import { emitYacitaEvent } from '../utils/yacitaVoice';
import { useYacitaCoach } from '../coach';
import { Sheet } from './Sheet';

interface BehaviorMatrixProps {
  students: Student[];
  scores: DailyCriterionScore[];
  onUpdateScore: (studentId: string, date: string, criterionKey: 'c1' | 'c2' | 'c3' | 'c4', level: ScoreLevel) => void;
  onUpdateNotes: (studentId: string, date: string, notes: string) => void;
  onSetAllStudentsScore: (date: string, studentIds: string[], level: ScoreLevel) => void;
  onOpenABCForStudent: (student: Student) => void;
}

export const BehaviorMatrix: React.FC<BehaviorMatrixProps> = ({
  students,
  scores,
  onUpdateScore,
  onUpdateNotes,
  onSetAllStudentsScore,
  onOpenABCForStudent,
}) => {
  const { notifyActionEvent } = useYacitaCoach();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedGrade, setSelectedGrade] = useState<string>('todos');
  const [selectedShift, setSelectedShift] = useState<string>('todos');
  const [isConventionsOpen, setIsConventionsOpen] = useState(false);

  // Grades available
  const availableGrades = useMemo(() => {
    const set = new Set(students.map((s) => s.grade));
    return Array.from(set).sort();
  }, [students]);

  // Students in current view
  const visibleStudents = useMemo(() => {
    return students.filter((s) => {
      const matchGrade = selectedGrade === 'todos' || s.grade === selectedGrade;
      const matchShift = selectedShift === 'todos' || s.shift === selectedShift;
      return matchGrade && matchShift;
    });
  }, [students, selectedGrade, selectedShift]);

  // Map of scores for easy lookup
  const scoresMap = useMemo(() => {
    const map = new Map<string, DailyCriterionScore>();
    for (const sc of scores) {
      if (sc.date === selectedDate) {
        map.set(sc.studentId, sc);
      }
    }
    return map;
  }, [scores, selectedDate]);

  // Compute Group Compliance Percentage & Semaphore
  const groupStats = useMemo(() => {
    if (visibleStudents.length === 0) return { percentage: 0, achieved: 0, inProcess: 0, needsSupport: 0, totalSlots: 0 };
    let totalScore = 0;
    let maxPossible = 0;
    let achieved = 0;
    let inProcess = 0;
    let needsSupport = 0;

    for (const s of visibleStudents) {
      const current = scoresMap.get(s.id);
      const c1 = current?.c1 ?? 3;
      const c2 = current?.c2 ?? 3;
      const c3 = current?.c3 ?? 3;
      const c4 = current?.c4 ?? 3;

      const studentSum = c1 + c2 + c3 + c4;
      totalScore += studentSum;
      maxPossible += 12; // 4 * 3

      [c1, c2, c3, c4].forEach((lvl) => {
        if (lvl === 3) achieved++;
        else if (lvl === 2) inProcess++;
        else needsSupport++;
      });
    }

    const percentage = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
    return { percentage, achieved, inProcess, needsSupport, totalSlots: maxPossible / 3 };
  }, [visibleStudents, scoresMap]);

  const handleMarkAllAchieved = () => {
    const studentIds = visibleStudents.map((s) => s.id);
    onSetAllStudentsScore(selectedDate, studentIds, 3);
    notifyActionEvent('mark_all_logrado');
    emitYacitaEvent({
      type: 'matrix-logrado',
      message: '¡Excelente trabajo con el grupo hoy, profe! Marcaste a todos los estudiantes en Logrado (3★). ¡Qué gran armonía en el salón! ⭐🎉',
    });
  };

  const handleScoreChange = (student: Student, criterionKey: 'c1' | 'c2' | 'c3' | 'c4', val: ScoreLevel) => {
    onUpdateScore(student.id, selectedDate, criterionKey, val);
    if (val === 1 || val === 2) {
      notifyActionEvent('need_support_alert');
    }
    if (val === 1) {
      const criterionDef = CRITERIA_DEFINITIONS.find((c) => c.id === criterionKey);
      const criterionTitle = criterionDef?.short || criterionKey;
      emitYacitaEvent({
        type: 'matrix-support',
        studentName: student.fullName,
        criterion: criterionTitle,
        message: `Profe, ${student.fullName} requiere acompañamiento en ${criterionTitle}. Te sugiero registrar la situación en A·B·C para acordar un pacto formativo. 💛`,
      });
    }
  };

  return (
    <div className="space-y-6 pb-36">
      {/* Filters & Date Bar */}
      <div className="bg-white dark:bg-[#131f42] rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Date Picker */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 min-h-[44px]">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <label htmlFor="matrix-date" className="sr-only">Fecha de evaluación</label>
              <input
                id="matrix-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                data-yacita="matrix_date_input"
                data-date={selectedDate}
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden"
              />
            </div>

            {/* Grade Selector */}
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              data-yacita="matrix_filter_grade"
              className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 focus:outline-hidden min-h-[44px]"
            >
              <option value="todos">Todos los Grados</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>
                  Grado {g}
                </option>
              ))}
            </select>

            {/* Shift Selector */}
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              data-yacita="matrix_filter_shift"
              className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 focus:outline-hidden min-h-[44px]"
            >
              <option value="todos">Todas las Jornadas</option>
              <option value="Mañana">Jornada Mañana</option>
              <option value="Tarde">Jornada Tarde</option>
            </select>
          </div>

          {/* Quick Batch Button */}
          <button
            onClick={handleMarkAllAchieved}
            data-yacita="matrix_btn_mark_all"
            title="Asignar 'Logrado (3★)' a todos los estudiantes de la vista para luego afinar individualmente"
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs min-h-[44px]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Marcar Todos Logrado [✓]</span>
          </button>
        </div>
      </div>

      {/* Group Metric & Semaphore Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Compliance percentage */}
        <div className="bg-white dark:bg-[#131f42] rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Cumplimiento Formativo Grupal
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {groupStats.percentage}%
            </div>
          </div>
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white shadow-xs ${
              groupStats.percentage >= 80
                ? 'bg-emerald-600'
                : groupStats.percentage >= 60
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
          >
            {groupStats.percentage >= 80 ? '✓' : groupStats.percentage >= 60 ? '~' : '!'}
          </div>
        </div>

        {/* Achieved Count */}
        <div className="bg-white dark:bg-[#131f42] rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
            ✓
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {groupStats.achieved}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Criterios en Logrado (3★)
            </span>
          </div>
        </div>

        {/* In Process Count */}
        <div className="bg-white dark:bg-[#131f42] rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
            ~
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {groupStats.inProcess}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              En Proceso Formativo (2★)
            </span>
          </div>
        </div>

        {/* Needs Support Count */}
        <div className="bg-white dark:bg-[#131f42] rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 flex items-center justify-center font-bold">
            !
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {groupStats.needsSupport}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Requiere Acompañamiento (1★)
            </span>
          </div>
        </div>
      </div>

      {/* Criteria Legend: Collapsed in button that opens Sheet bottom sheet */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
        <button
          type="button"
          onClick={() => setIsConventionsOpen(true)}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-200 hover:underline min-h-[44px] active:scale-95"
        >
          <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>¿Qué significa cada valoración? (Ver convenciones 3★, 2★, 1★)</span>
        </button>
      </div>

      <Sheet
        isOpen={isConventionsOpen}
        onClose={() => setIsConventionsOpen(false)}
        sheetId="matrix_conventions_sheet"
        size="md"
        title="Convenciones de Valoración Formativa"
        subtitle="I.E. Denzil Escolar · Escala de 3 Niveles"
        icon={<HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
        footer={
          <div className="flex items-center justify-end w-full">
            <button
              type="button"
              onClick={() => setIsConventionsOpen(false)}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-blue-700 hover:bg-blue-800 text-white min-h-[44px] min-w-[88px] active:scale-95 transition-colors"
            >
              Entendido
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs">[✓] Logrado (3★)</span>
              <strong className="text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm">Autorregulación Adecuada</strong>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              El estudiante demuestra participación armónica, escucha activa y respeto continuo de las pautas formativas sin necesidad de recordatorios docentes.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-xs">[~] En Proceso (2★)</span>
              <strong className="text-amber-900 dark:text-amber-200 text-xs sm:text-sm">Requiere Recordatorio</strong>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              El estudiante responde favorablemente a 1 o 2 indicaciones verbales o gestuales del docente para retomar la actividad o autorregularse.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-red-500 text-white font-bold text-xs">[!] Requiere Apoyo (1★)</span>
              <strong className="text-red-900 dark:text-red-200 text-xs sm:text-sm">Desregulación o Resistencia</strong>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              El estudiante presenta dificultad persistente para mantener la convivencia o continuar la actividad. Se recomienda registrar la situación en la pestaña <strong>Registro y TDR (A-B-C)</strong> para pactar un acuerdo restaurativo.
            </p>
          </div>
        </div>
      </Sheet>

      {/* MATRIX VIEW */}
      {visibleStudents.length === 0 ? (
        <div className="bg-white dark:bg-[#131f42] rounded-xl p-8 border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No hay estudiantes registrados con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP / TABLET TABLE VIEW (Hidden on Mobile < 640px) */}
          <div className="hidden sm:block bg-white dark:bg-[#131f42] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-64">Estudiante</th>
                    <th className="py-3 px-2 text-center" title={CRITERIA_DEFINITIONS[0].desc}>
                      1. Turnos y Escucha
                    </th>
                    <th className="py-3 px-2 text-center" title={CRITERIA_DEFINITIONS[1].desc}>
                      2. Permanencia Actividad
                    </th>
                    <th className="py-3 px-2 text-center" title={CRITERIA_DEFINITIONS[2].desc}>
                      3. Instrucciones
                    </th>
                    <th className="py-3 px-2 text-center" title={CRITERIA_DEFINITIONS[3].desc}>
                      4. Materiales y Aula
                    </th>
                    <th className="py-3 px-4 text-center w-36">Acción Formativa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleStudents.map((student) => {
                    const currentScore = scoresMap.get(student.id);
                    const c1 = currentScore?.c1 ?? 3;
                    const c2 = currentScore?.c2 ?? 3;
                    const c3 = currentScore?.c3 ?? 3;
                    const c4 = currentScore?.c4 ?? 3;

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {student.fullName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <span>Grado {student.grade}</span>
                            <span>·</span>
                            <span>{student.shift}</span>
                          </div>
                        </td>

                        {/* C1: Escucha */}
                        <td className="py-3 px-2 text-center">
                          <ScoreToggleGroup
                            current={c1}
                            studentName={student.fullName}
                            onChange={(val) => handleScoreChange(student, 'c1', val)}
                          />
                        </td>

                        {/* C2: Permanencia */}
                        <td className="py-3 px-2 text-center">
                          <ScoreToggleGroup
                            current={c2}
                            studentName={student.fullName}
                            onChange={(val) => handleScoreChange(student, 'c2', val)}
                          />
                        </td>

                        {/* C3: Instrucciones */}
                        <td className="py-3 px-2 text-center">
                          <ScoreToggleGroup
                            current={c3}
                            studentName={student.fullName}
                            onChange={(val) => handleScoreChange(student, 'c3', val)}
                          />
                        </td>

                        {/* C4: Materiales */}
                        <td className="py-3 px-2 text-center">
                          <ScoreToggleGroup
                            current={c4}
                            studentName={student.fullName}
                            onChange={(val) => handleScoreChange(student, 'c4', val)}
                          />
                        </td>

                        {/* Action Column */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => onOpenABCForStudent(student)}
                            data-yacita="matrix_btn_open_abc"
                            data-student-name={student.fullName}
                            title="Registrar incidencia A-B-C para este estudiante"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition-colors min-h-[44px]"
                          >
                            <FilePlus2 className="w-3.5 h-3.5" />
                            <span>Incidencia A-B-C</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE INDIVIDUAL TACTILE CARDS (< 640px) */}
          <div className="block sm:hidden space-y-3">
            {visibleStudents.map((student) => {
              const currentScore = scoresMap.get(student.id);
              const c1 = currentScore?.c1 ?? 3;
              const c2 = currentScore?.c2 ?? 3;
              const c3 = currentScore?.c3 ?? 3;
              const c4 = currentScore?.c4 ?? 3;

              return (
                <div
                  key={student.id}
                  className="bg-white dark:bg-[#131f42] rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {student.fullName}
                      </h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Grado {student.grade} · {student.shift}
                      </span>
                    </div>
                    <button
                      onClick={() => onOpenABCForStudent(student)}
                      data-yacita="matrix_btn_open_abc"
                      data-student-name={student.fullName}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800 min-h-[44px] flex items-center gap-1 font-semibold"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      <span>ABC</span>
                    </button>
                  </div>

                  {/* 4 Touch Friendly Criteria Selectors */}
                  <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        1. Escucha y Turnos:
                      </span>
                      <ScoreToggleGroup
                        current={c1}
                        studentName={student.fullName}
                        onChange={(val) => handleScoreChange(student, 'c1', val)}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        2. Permanencia en Guía:
                      </span>
                      <ScoreToggleGroup
                        current={c2}
                        studentName={student.fullName}
                        onChange={(val) => handleScoreChange(student, 'c2', val)}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        3. Instrucciones:
                      </span>
                      <ScoreToggleGroup
                        current={c3}
                        studentName={student.fullName}
                        onChange={(val) => handleScoreChange(student, 'c3', val)}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        4. Cuidado de Materiales:
                      </span>
                      <ScoreToggleGroup
                        current={c4}
                        studentName={student.fullName}
                        onChange={(val) => handleScoreChange(student, 'c4', val)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// Subcomponent: 1-Click Score Toggle Group (Logrado, En Proceso, Requiere Apoyo)
interface ScoreToggleGroupProps {
  current: ScoreLevel;
  studentName?: string;
  onChange: (level: ScoreLevel) => void;
}

const ScoreToggleGroup: React.FC<ScoreToggleGroupProps> = ({ current, studentName, onChange }) => {
  return (
    <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 gap-1">
      {/* 3: Logrado (Verde esmeralda / 3★) */}
      <button
        type="button"
        onClick={() => onChange(3)}
        data-yacita="matrix_score_3"
        data-student-name={studentName}
        title="Logrado (3 estrellas) - Cumple el criterio formativo"
        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all min-h-[44px] min-w-[42px] sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center gap-0.5 active:scale-95 ${
          current === 3
            ? 'bg-emerald-600 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300'
        }`}
      >
        <span className="text-sm">✓</span>
        <span className="hidden sm:inline text-[10px]">3★</span>
      </button>

      {/* 2: En Proceso (Ámbar suave / 2★) */}
      <button
        type="button"
        onClick={() => onChange(2)}
        data-yacita="matrix_score_2"
        data-student-name={studentName}
        title="En Proceso (2 estrellas) - Requiere pauta o recordatorio"
        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all min-h-[44px] min-w-[42px] sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center gap-0.5 active:scale-95 ${
          current === 2
            ? 'bg-amber-500 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300'
        }`}
      >
        <span className="text-sm">~</span>
        <span className="hidden sm:inline text-[10px]">2★</span>
      </button>

      {/* 1: Requiere Acompañamiento (Rojo suave / 1★) */}
      <button
        type="button"
        onClick={() => onChange(1)}
        data-yacita="matrix_score_1"
        data-student-name={studentName}
        title="Requiere Acompañamiento (1 estrella) - Necesita regulación"
        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all min-h-[44px] min-w-[42px] sm:min-h-[34px] sm:min-w-[34px] flex items-center justify-center gap-0.5 active:scale-95 ${
          current === 1
            ? 'bg-red-500 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-300'
        }`}
      >
        <span className="text-sm">!</span>
        <span className="hidden sm:inline text-[10px]">1★</span>
      </button>
    </div>
  );
};
