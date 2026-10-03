import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
  RotateCcw,
  X,
  Search,
  SlidersHorizontal,
  GraduationCap,
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
import { fechaLocalHoy } from '../utils/dateUtils';

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
  const todayStr = useMemo(() => fechaLocalHoy(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedGrade, setSelectedGrade] = useState<string>('todos');
  const [selectedShift, setSelectedShift] = useState<string>('todos');
  const [isConventionsOpen, setIsConventionsOpen] = useState(false);

  // Buscador por nombre y filtro "Solo con novedades"
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyNovelties, setOnlyNovelties] = useState(false);

  // Menú "Acciones" para versión móvil (< 640px)
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // Modal de confirmación para Marcar Todos Logrado y Toast Deshacer
  const [isConfirmMarkAllOpen, setIsConfirmMarkAllOpen] = useState(false);
  const [locallyClearedScoreKeys, setLocallyClearedScoreKeys] = useState<Set<string>>(new Set());
  const [undoBatchState, setUndoBatchState] = useState<{
    date: string;
    studentIds: string[];
    previousScores: Map<string, DailyCriterionScore | null>;
  } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpieza de timer de deshacer al desmontar
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  // Grades available
  const availableGrades = useMemo(() => {
    const set = new Set(students.map((s) => s.grade));
    return Array.from(set).sort();
  }, [students]);

  // Map of scores for easy lookup (excluyendo claves deshechas localmente)
  const scoresMap = useMemo(() => {
    const map = new Map<string, DailyCriterionScore>();
    for (const sc of scores) {
      if (sc.date === selectedDate && !locallyClearedScoreKeys.has(`${sc.studentId}_${sc.date}`)) {
        map.set(sc.studentId, sc);
      }
    }
    return map;
  }, [scores, selectedDate, locallyClearedScoreKeys]);

  // Detección de novedad conductual (1★ o 2★ en cualquier criterio, o notas pedagógicas registradas)
  const hasStudentNovelty = useCallback(
    (studentId: string) => {
      const sc = scoresMap.get(studentId);
      if (!sc) return false;
      return (
        sc.c1 === 1 ||
        sc.c1 === 2 ||
        sc.c2 === 1 ||
        sc.c2 === 2 ||
        sc.c3 === 1 ||
        sc.c3 === 2 ||
        sc.c4 === 1 ||
        sc.c4 === 2 ||
        Boolean(sc.notes && sc.notes.trim().length > 0)
      );
    },
    [scoresMap]
  );

  // Conteo de estudiantes con novedades en el grado/jornada actual
  const noveltiesCount = useMemo(() => {
    return students.filter((s) => {
      const matchGrade = selectedGrade === 'todos' || s.grade === selectedGrade;
      const matchShift = selectedShift === 'todos' || s.shift === selectedShift;
      return matchGrade && matchShift && hasStudentNovelty(s.id);
    }).length;
  }, [students, selectedGrade, selectedShift, hasStudentNovelty]);

  // Students in current view (filtrados por grado, jornada, buscador y filtro de novedades)
  const visibleStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      const matchGrade = selectedGrade === 'todos' || s.grade === selectedGrade;
      const matchShift = selectedShift === 'todos' || s.shift === selectedShift;
      const matchName = !query || s.fullName.toLowerCase().includes(query);
      const matchNovelty = !onlyNovelties || hasStudentNovelty(s.id);
      return matchGrade && matchShift && matchName && matchNovelty;
    });
  }, [students, selectedGrade, selectedShift, searchQuery, onlyNovelties, hasStudentNovelty]);

  // Table horizontal scroll shadow detection
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollTableRight, setCanScrollTableRight] = useState(false);

  const checkTableScroll = useCallback(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    if (!hasOverflow) {
      setCanScrollTableRight(false);
      return;
    }
    setCanScrollTableRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkTableScroll();
    const handleResize = () => checkTableScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkTableScroll, visibleStudents]);

  // Compute Group Compliance Percentage & Semaphore (muestra Pendiente de evaluar si no hay registros evaluados)
  const groupStats = useMemo(() => {
    const totalVisible = visibleStudents.length;
    if (totalVisible === 0) {
      return {
        percentage: 0,
        achieved: 0,
        inProcess: 0,
        needsSupport: 0,
        totalSlots: 0,
        hasEvaluatedRecords: false,
        evaluatedCount: 0,
      };
    }

    let totalScore = 0;
    let maxPossible = 0;
    let achieved = 0;
    let inProcess = 0;
    let needsSupport = 0;
    let evaluatedCount = 0;

    for (const s of visibleStudents) {
      const current = scoresMap.get(s.id);
      if (!current) continue; // Si no tiene registro del día, no suma como 100% ficticio

      evaluatedCount++;
      const { c1, c2, c3, c4 } = current;
      const studentSum = c1 + c2 + c3 + c4;
      totalScore += studentSum;
      maxPossible += 12; // 4 * 3

      [c1, c2, c3, c4].forEach((lvl) => {
        if (lvl === 3) achieved++;
        else if (lvl === 2) inProcess++;
        else needsSupport++;
      });
    }

    const hasEvaluatedRecords = evaluatedCount > 0;
    const percentage = hasEvaluatedRecords && maxPossible > 0
      ? Math.round((totalScore / maxPossible) * 100)
      : 0;

    return {
      percentage,
      achieved,
      inProcess,
      needsSupport,
      totalSlots: maxPossible / 3,
      hasEvaluatedRecords,
      evaluatedCount,
    };
  }, [visibleStudents, scoresMap]);

  // Abrir diálogo de confirmación para "Marcar Todos Logrado"
  const handleOpenMarkAllDialog = () => {
    if (visibleStudents.length === 0) return;
    setIsConfirmMarkAllOpen(true);
  };

  // Confirmar acción masiva con respaldo para Deshacer
  const handleConfirmMarkAllAchieved = () => {
    const studentIds = visibleStudents.map((s) => s.id);
    if (studentIds.length === 0) {
      setIsConfirmMarkAllOpen(false);
      return;
    }

    // Guardar snapshot del estado previo de cada estudiante para Deshacer
    const prevScoresMap = new Map<string, DailyCriterionScore | null>();
    for (const s of visibleStudents) {
      const existing = scoresMap.get(s.id);
      prevScoresMap.set(s.id, existing ? { ...existing } : null);
    }

    // Quitar del registro local de claves revertidas si las hubiera
    setLocallyClearedScoreKeys((prev) => {
      const next = new Set(prev);
      visibleStudents.forEach((s) => next.delete(`${s.id}_${selectedDate}`));
      return next;
    });

    // Ejecutar asignación masiva usando la función existente de la matriz
    onSetAllStudentsScore(selectedDate, studentIds, 3);
    notifyActionEvent('mark_all_logrado');
    emitYacitaEvent({
      type: 'matrix-logrado',
      message: '¡Excelente trabajo con el grupo hoy, profe! Marcaste a todos los estudiantes en Logrado (3★). ¡Qué gran armonía en el salón! ⭐🎉',
    });

    setIsConfirmMarkAllOpen(false);

    // Activar toast con "Deshacer" por 5 segundos
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoBatchState({
      date: selectedDate,
      studentIds,
      previousScores: prevScoresMap,
    });

    undoTimerRef.current = setTimeout(() => {
      setUndoBatchState(null);
    }, 5000);
  };

  // Función Deshacer durante 5 segundos
  const handleUndoMarkAll = () => {
    if (!undoBatchState) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    const { date, studentIds, previousScores } = undoBatchState;
    const newlyCleared = new Set<string>();

    for (const id of studentIds) {
      const prev = previousScores.get(id);
      if (prev) {
        onUpdateScore(id, date, 'c1', prev.c1);
        onUpdateScore(id, date, 'c2', prev.c2);
        onUpdateScore(id, date, 'c3', prev.c3);
        onUpdateScore(id, date, 'c4', prev.c4);
        if (prev.notes !== undefined) {
          onUpdateNotes(id, date, prev.notes);
        }
      } else {
        // Previamente estaba sin evaluar: restaurar a estado neutro en la vista
        newlyCleared.add(`${id}_${date}`);
      }
    }

    if (newlyCleared.size > 0) {
      setLocallyClearedScoreKeys((prev) => {
        const next = new Set(prev);
        newlyCleared.forEach((k) => next.add(k));
        return next;
      });
    }

    setUndoBatchState(null);
  };

  const handleScoreChange = (student: Student, criterionKey: 'c1' | 'c2' | 'c3' | 'c4', val: ScoreLevel) => {
    // Si estaba marcado como localmente limpio, remover para que se muestre su nuevo valor
    setLocallyClearedScoreKeys((prev) => {
      if (!prev.has(`${student.id}_${selectedDate}`)) return prev;
      const next = new Set(prev);
      next.delete(`${student.id}_${selectedDate}`);
      return next;
    });

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
    <div className="space-y-3 sm:space-y-5 pb-36">
      {/* Filters & Actions Bar */}
      <div className="bg-white dark:bg-[#131f42] rounded-xl p-2.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
        {/* ROW 1: Chips Row on Mobile / Standard Filter Bar on Desktop */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Mobile Chips Row (< 640px) */}
          <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {/* Fecha Chip */}
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0 min-h-[38px]">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <label htmlFor="matrix-date-mobile" className="sr-only">Fecha de evaluación</label>
              <input
                id="matrix-date-mobile"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                data-yacita="matrix_date_input"
                data-date={selectedDate}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              />
            </div>

            {/* Grado Chip */}
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0 min-h-[38px]">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <label htmlFor="matrix-grade-mobile" className="sr-only">Filtrar por grado</label>
              <select
                id="matrix-grade-mobile"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                data-yacita="matrix_filter_grade"
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer pr-1"
              >
                <option value="todos">Grado: Todos</option>
                {availableGrades.map((g) => (
                  <option key={g} value={g}>
                    Grado {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Jornada Chip */}
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0 min-h-[38px]">
              <label htmlFor="matrix-shift-mobile" className="sr-only">Filtrar por jornada</label>
              <select
                id="matrix-shift-mobile"
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                data-yacita="matrix_filter_shift"
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer pr-1"
              >
                <option value="todos">Jornada: Todas</option>
                <option value="Mañana">Mañana</option>
                <option value="Tarde">Tarde</option>
              </select>
            </div>

            {/* Menú "Acciones" en móvil con "Marcar Todos Logrado" secundario */}
            <button
              type="button"
              onClick={() => setIsActionsMenuOpen(true)}
              data-yacita="matrix_btn_actions_menu"
              title="Abrir menú de acciones grupales"
              aria-label="Abrir menú de acciones grupales de la matriz"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 text-xs font-bold shrink-0 min-h-[44px] active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Acciones</span>
            </button>
          </div>

          {/* Desktop Filter Controls (>= 640px / sm) */}
          <div className="hidden sm:flex flex-wrap items-center gap-3">
            {/* Date Picker */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 min-h-[44px]">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <label htmlFor="matrix-date-desktop" className="sr-only">Fecha de evaluación</label>
              <input
                id="matrix-date-desktop"
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

          {/* Quick Batch Button (Desktop only >= 640px) */}
          <button
            onClick={handleOpenMarkAllDialog}
            data-yacita="matrix_btn_mark_all"
            title="Asignar 'Logrado (3★)' a todos los estudiantes de la vista para luego afinar individualmente"
            className="hidden sm:flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs min-h-[44px]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Marcar Todos Logrado [✓]</span>
          </button>
        </div>

        {/* ROW 2: Buscador por Nombre y Filtro "Solo con Novedades" */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Buscador de estudiante por nombre */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar estudiante por nombre..."
              data-yacita="matrix_search_input"
              className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                data-yacita="matrix_search_clear"
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro "Solo con novedades" */}
          <button
            type="button"
            onClick={() => setOnlyNovelties((prev) => !prev)}
            data-yacita="matrix_filter_novelties"
            aria-pressed={onlyNovelties}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all min-h-[44px] shrink-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${
              onlyNovelties
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${onlyNovelties ? 'text-white' : 'text-amber-500'}`} />
            <span>Solo con novedades</span>
            {noveltiesCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  onlyNovelties
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                }`}
              >
                {noveltiesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Group Metric & Semaphore: Compact 2x2 grid on mobile (< 640px), 4 cols on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Compliance percentage */}
        <div className="bg-white dark:bg-[#131f42] rounded-xl p-2.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between min-h-[50px] sm:min-h-auto">
          <div className="min-w-0 pr-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 block truncate">
              Cumplimiento Grupal
            </span>
            <div className={`mt-0.5 font-black ${
              groupStats.hasEvaluatedRecords
                ? 'text-base sm:text-2xl text-slate-900 dark:text-slate-100'
                : 'text-xs sm:text-base text-slate-600 dark:text-slate-300 font-bold'
            }`}>
              {groupStats.hasEvaluatedRecords ? `${groupStats.percentage}%` : 'Pendiente'}
            </div>
            {!groupStats.hasEvaluatedRecords && (
              <span className="text-xs text-slate-500 dark:text-slate-300 block truncate">
                0 de {visibleStudents.length} eval.
              </span>
            )}
          </div>
          <div
            className={`w-7 h-7 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-white text-xs sm:text-base shadow-xs shrink-0 ${
              !groupStats.hasEvaluatedRecords
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                : groupStats.percentage >= 80
                ? 'bg-emerald-600'
                : groupStats.percentage >= 60
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            title={
              !groupStats.hasEvaluatedRecords
                ? 'Pendiente de evaluar'
                : `Cumplimiento: ${groupStats.percentage}%`
            }
          >
            {!groupStats.hasEvaluatedRecords
              ? '—'
              : groupStats.percentage >= 80
              ? '✓'
              : groupStats.percentage >= 60
              ? '~'
              : '!'}
          </div>
        </div>

        {/* Achieved Count */}
        <div className="bg-white dark:bg-[#131f42] rounded-xl p-2.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2 sm:gap-3 min-h-[50px]">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
            ✓
          </div>
          <div className="min-w-0">
            <div className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {groupStats.achieved}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-300 block truncate">
              Logrado (3★)
            </span>
          </div>
        </div>

        {/* In Process Count */}
        <div className="bg-white dark:bg-[#131f42] rounded-xl p-2.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2 sm:gap-3 min-h-[50px]">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
            ~
          </div>
          <div className="min-w-0">
            <div className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {groupStats.inProcess}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-300 block truncate">
              En Proceso (2★)
            </span>
          </div>
        </div>

        {/* Needs Support Count */}
        <div className="bg-white dark:bg-[#131f42] rounded-xl p-2.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-2 sm:gap-3 min-h-[50px]">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
            !
          </div>
          <div className="min-w-0">
            <div className="text-sm sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {groupStats.needsSupport}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-300 block truncate">
              Requiere Apoyo (1★)
            </span>
          </div>
        </div>
      </div>

      {/* Criteria Legend: Compact 1-line bar on mobile (< 640px), Full convention bar on desktop */}
      {/* Mobile compact convention strip */}
      <div className="flex sm:hidden items-center justify-between px-3 py-1.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs text-slate-800 dark:text-slate-200">
        <span className="truncate">Escala: [✓] 3★ · [~] 2★ · [!] 1★</span>
        <button
          type="button"
          onClick={() => setIsConventionsOpen(true)}
          data-yacita="matrix_legend_button"
          className="font-bold text-blue-700 dark:text-blue-300 hover:underline shrink-0 pl-1 focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          Ver detalle
        </button>
      </div>

      {/* Desktop/Tablet convention banner */}
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <span className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-xs shrink-0">
            Convenciones:
          </span>
          {/* 1ª Convención */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-medium">
            <span className="font-bold text-emerald-700 dark:text-emerald-400">[✓]</span>
            <span>Logrado (3★)</span>
          </div>
          {/* 2ª Convención */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-medium">
            <span className="font-bold text-amber-700 dark:text-amber-400">[~]</span>
            <span>En Proceso (2★)</span>
          </div>
          {/* 3ª Convención - protegida con flex-wrap para que nunca se pierda ni se corte */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 font-medium">
            <span className="font-bold text-red-700 dark:text-red-400">[!]</span>
            <span>Requiere Apoyo (1★)</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsConventionsOpen(true)}
          data-yacita="matrix_legend_button"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200 hover:text-blue-700 dark:hover:text-blue-300 hover:underline min-h-[44px] active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg px-2"
        >
          <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Ver detalle formativo</span>
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
        <div className="bg-white dark:bg-[#131f42] rounded-xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {searchQuery || onlyNovelties
              ? 'No hay estudiantes que coincidan con la búsqueda o filtro de novedades.'
              : 'No hay estudiantes registrados con los filtros seleccionados.'}
          </p>
          {(searchQuery || onlyNovelties) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setOnlyNovelties(false);
              }}
              data-yacita="matrix_search_clear"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 min-h-[44px]"
            >
              Restablecer búsqueda y filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {/* DESKTOP / TABLET TABLE VIEW (Hidden on Mobile/Tablet Vertical < 768px) */}
          <div className="hidden md:block bg-white dark:bg-[#131f42] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden relative">
            {/* Sombra lateral derecha indicando que hay más columnas al hacer scroll */}
            <div
              className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-slate-900/15 dark:from-black/40 to-transparent z-30 transition-opacity duration-200 ${
                canScrollTableRight ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden="true"
            />

            <div
              ref={tableContainerRef}
              onScroll={checkTableScroll}
              className="overflow-x-auto"
            >
              <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                  <tr className="text-xs text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                    {/* Columna Estudiante sticky left-0 con fondo sólido */}
                    <th className="sticky left-0 z-30 bg-slate-50 dark:bg-[#0f1a38] py-3 px-3 sm:px-4 w-48 sm:w-56 lg:w-64 min-w-[180px] sm:min-w-[200px] border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                      Estudiante
                    </th>
                    <th className="py-3 px-2 text-center min-w-[110px]" title={CRITERIA_DEFINITIONS[0].desc}>
                      1. Turnos y Escucha
                    </th>
                    <th className="py-3 px-2 text-center min-w-[110px]" title={CRITERIA_DEFINITIONS[1].desc}>
                      2. Permanencia Actividad
                    </th>
                    <th className="py-3 px-2 text-center min-w-[110px]" title={CRITERIA_DEFINITIONS[2].desc}>
                      3. Instrucciones
                    </th>
                    <th className="py-3 px-2 text-center min-w-[110px]" title={CRITERIA_DEFINITIONS[3].desc}>
                      4. Materiales y Aula
                    </th>
                    <th className="py-3 px-2 sm:px-4 text-center w-16 lg:w-36">
                      Acción Formativa
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 px-4 text-center">
                        <div className="max-w-md mx-auto space-y-2">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            No hay estudiantes para mostrar en la matriz
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            Verifica los filtros seleccionados o añade nuevos alumnos en el directorio escolar.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visibleStudents.map((student) => {
                      const currentScore = scoresMap.get(student.id);
                    const isEvaluated = currentScore !== undefined;
                    const c1 = currentScore ? currentScore.c1 : null;
                    const c2 = currentScore ? currentScore.c2 : null;
                    const c3 = currentScore ? currentScore.c3 : null;
                    const c4 = currentScore ? currentScore.c4 : null;

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Columna Estudiante sticky left-0 con fondo sólido */}
                        <td className="sticky left-0 z-10 bg-white dark:bg-[#131f42] py-3 px-3 sm:px-4 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {student.fullName}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 flex-wrap">
                            <span>Grado {student.grade}</span>
                            <span>·</span>
                            <span>{student.shift}</span>
                            {!isEvaluated ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                                <span>Sin evaluar</span>
                              </span>
                            ) : hasStudentNovelty(student.id) ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Novedad</span>
                              </span>
                            ) : null}
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

                        {/* Action Column: Entre 640px y 1024px solo icono + aria-label + title */}
                        <td className="py-3 px-2 sm:px-4 text-center">
                          <button
                            type="button"
                            onClick={() => onOpenABCForStudent(student)}
                            data-yacita="matrix_btn_open_abc"
                            data-student-name={student.fullName}
                            aria-label={`Registrar incidencia A-B-C para ${student.fullName}`}
                            title={`Registrar incidencia A-B-C para ${student.fullName}`}
                            className="inline-flex items-center justify-center gap-1.5 p-2 lg:px-2.5 lg:py-1.5 text-xs font-semibold rounded-lg text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition-colors min-h-[44px] min-w-[44px] active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden"
                          >
                            <FilePlus2 className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span className="hidden lg:inline whitespace-nowrap">Incidencia A-B-C</span>
                          </button>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE & TABLET VERTICAL TACTILE CARDS (< 768px / md) */}
          <div className="block md:hidden space-y-2.5">
            {visibleStudents.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#131f42] rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No hay estudiantes para mostrar
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Verifica los filtros seleccionados o añade nuevos alumnos en el directorio escolar.
                </p>
              </div>
            ) : (
              visibleStudents.map((student) => {
                const currentScore = scoresMap.get(student.id);
              const isEvaluated = currentScore !== undefined;
              const c1 = currentScore ? currentScore.c1 : null;
              const c2 = currentScore ? currentScore.c2 : null;
              const c3 = currentScore ? currentScore.c3 : null;
              const c4 = currentScore ? currentScore.c4 : null;

              return (
                <div
                  key={student.id}
                  className="bg-white dark:bg-[#131f42] rounded-xl p-2.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
                >
                  {/* Student Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                          {student.fullName}
                        </h4>
                        {!isEvaluated ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                            <span>Sin evaluar</span>
                          </span>
                        ) : hasStudentNovelty(student.id) ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Novedad</span>
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        Grado {student.grade} · {student.shift}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenABCForStudent(student)}
                      data-yacita="matrix_btn_open_abc"
                      data-student-name={student.fullName}
                      aria-label={`Registrar incidencia A-B-C para ${student.fullName}`}
                      title={`Registrar incidencia A-B-C para ${student.fullName}`}
                      className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 min-h-[44px] min-w-[44px] flex items-center justify-center gap-1 font-semibold shrink-0 active:scale-95 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden"
                    >
                      <FilePlus2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-bold">ABC</span>
                    </button>
                  </div>

                  {/* 4 Touch Friendly Criteria Selectors: 2x2 grid on mobile with >= 44px area and legible 3★/2★/1★ */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    {/* C1: Escucha */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate" title="1. Turnos y Escucha">
                        1. Turnos y Escucha
                      </span>
                      <ScoreToggleGroup
                        current={c1}
                        studentName={student.fullName}
                        onChange={(val) => handleScoreChange(student, 'c1', val)}
                        fullWidth
                      />
                    </div>

                    {/* C2: Permanencia */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate" title="2. Permanencia en Guía">
                        2. Permanencia
                      </span>
                      <ScoreToggleGroup
                        current={c2}
                        studentName={student.fullName}
                        onChange={(val) => handleScoreChange(student, 'c2', val)}
                        fullWidth
                      />
                    </div>

                    {/* C3: Instrucciones */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate" title="3. Instrucciones">
                        3. Instrucciones
                      </span>
                      <ScoreToggleGroup
                        current={c3}
                        studentName={student.fullName}
                        onChange={(val) => handleScoreChange(student, 'c3', val)}
                        fullWidth
                      />
                    </div>

                    {/* C4: Materiales */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate" title="4. Cuidado de Materiales">
                        4. Materiales
                      </span>
                      <ScoreToggleGroup
                        current={c4}
                        studentName={student.fullName}
                        onChange={(val) => handleScoreChange(student, 'c4', val)}
                        fullWidth
                      />
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        </>
      )}

      {/* Acciones Menu Sheet for Mobile (< 640px) */}
      <Sheet
        isOpen={isActionsMenuOpen}
        onClose={() => setIsActionsMenuOpen(false)}
        sheetId="matrix_actions_menu_sheet"
        size="sm"
        title="Acciones de la Matriz"
        subtitle="Opciones y acciones grupales"
        icon={<SlidersHorizontal className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
        footer={
          <div className="flex items-center justify-end w-full">
            <button
              type="button"
              onClick={() => setIsActionsMenuOpen(false)}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 min-h-[44px]"
            >
              Cerrar
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Botón secundario: Marcar Todos Logrado */}
          <button
            type="button"
            onClick={() => {
              setIsActionsMenuOpen(false);
              handleOpenMarkAllDialog();
            }}
            data-yacita="matrix_btn_mark_all_secondary"
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 font-semibold text-xs sm:text-sm transition-colors min-h-[48px] active:scale-98 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                ✓
              </div>
              <div className="text-left">
                <div className="font-bold">Marcar Todos Logrado [✓]</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-300 font-normal">
                  Asigna 3★ a los {visibleStudents.length} estudiantes visibles
                </div>
              </div>
            </div>
            <span className="text-xs px-2 py-1 rounded-md bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200 font-bold shrink-0">
              3★
            </span>
          </button>

          {/* Ver convenciones */}
          <button
            type="button"
            onClick={() => {
              setIsActionsMenuOpen(false);
              setIsConventionsOpen(true);
            }}
            data-yacita="matrix_btn_view_conventions"
            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-colors min-h-[48px] active:scale-98 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="text-left">
                <div className="font-bold">Convenciones Formativas</div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-normal">
                  Escala institucional de 3 niveles formativos
                </div>
              </div>
            </div>
          </button>

          {/* Restablecer filtros si están activos */}
          {(searchQuery || onlyNovelties || selectedGrade !== 'todos' || selectedShift !== 'todos') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setOnlyNovelties(false);
                setSelectedGrade('todos');
                setSelectedShift('todos');
                setIsActionsMenuOpen(false);
              }}
              data-yacita="matrix_search_clear"
              className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>Restablecer todos los filtros</span>
            </button>
          )}
        </div>
      </Sheet>

      {/* Confirmation Sheet for "Marcar Todos Logrado" */}
      <Sheet
        isOpen={isConfirmMarkAllOpen}
        onClose={() => setIsConfirmMarkAllOpen(false)}
        sheetId="confirm_mark_all_logrado"
        size="sm"
        title="Marcar Todos en Logrado (3★)"
        subtitle="Acción colectiva de valoración formativa"
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsConfirmMarkAllOpen(false)}
              data-yacita="matrix_confirm_cancel"
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 min-h-[44px] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmMarkAllAchieved}
              data-yacita="matrix_confirm_mark_all"
              className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] min-w-[140px] active:scale-95 transition-colors shadow-xs"
            >
              Confirmar y Marcar
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="font-bold text-emerald-950 dark:text-emerald-200 text-sm sm:text-base">
              Se marcarán {visibleStudents.length * 4} criterios de {visibleStudents.length} estudiantes con Logrado (3★).
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Fecha de evaluación: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedDate}</span>.
              {selectedGrade !== 'todos' && <span> · Grado {selectedGrade}</span>}
              {selectedShift !== 'todos' && <span> · Jornada {selectedShift}</span>}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Garantía de control formativo:</span>
            </div>
            <p>
              Dispondrás de un aviso flotante con <strong>Deshacer durante 5 segundos</strong> para revertir la acción si fue involuntaria. Luego podrás ajustar individualmente a quienes requirieron apoyo.
            </p>
          </div>
        </div>
      </Sheet>

      {/* Floating Undo Toast (5 seconds) */}
      {undoBatchState && (
        <div
          className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-slate-900/95 dark:bg-slate-950/95 text-white rounded-2xl shadow-2xl border border-slate-700 max-w-[min(92vw,460px)] animate-in fade-in slide-in-from-bottom-3 duration-200"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">
              Se marcaron {undoBatchState.studentIds.length * 4} criterios ({undoBatchState.studentIds.length} est.).
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleUndoMarkAll}
              data-yacita="matrix_undo_mark_all"
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors active:scale-95 shadow-xs min-h-[44px] flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Deshacer (5s)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                setUndoBatchState(null);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Cerrar aviso"
              aria-label="Cerrar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent: 1-Click Score Toggle Group (Logrado, En Proceso, Requiere Apoyo, o Sin Evaluar)
interface ScoreToggleGroupProps {
  current?: ScoreLevel | null;
  studentName?: string;
  onChange: (level: ScoreLevel) => void;
  fullWidth?: boolean;
}

const ScoreToggleGroup: React.FC<ScoreToggleGroupProps> = ({ current, studentName, onChange, fullWidth }) => {
  const isEvaluated = current === 1 || current === 2 || current === 3;

  return (
    <div
      role="radiogroup"
      aria-label={`Evaluación formativa para ${studentName || 'estudiante'}`}
      className={`${
        fullWidth
          ? 'grid grid-cols-3 gap-1 w-full p-1 rounded-lg border'
          : 'inline-flex items-center p-1 rounded-lg border gap-1'
      } transition-colors ${
        isEvaluated
          ? 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700'
          : 'bg-slate-50/80 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-700/80'
      }`}
      title={isEvaluated ? undefined : 'Sin evaluar — Selecciona una opción formativa'}
    >
      {/* 3: Logrado (Verde esmeralda / 3★) */}
      <button
        type="button"
        role="radio"
        aria-checked={current === 3}
        onClick={() => onChange(3)}
        data-yacita="matrix_score_3"
        data-student-name={studentName}
        title={
          current === 3
            ? 'Logrado (3★) asignado'
            : `Asignar Logrado (3★) a ${studentName || 'estudiante'}`
        }
        aria-label={`Logrado 3 estrellas para ${studentName || 'estudiante'}${current === 3 ? ', seleccionado' : ''}`}
        className={`px-1.5 py-1 text-xs font-bold rounded-md transition-all min-h-[44px] min-w-[44px] ${
          fullWidth ? 'w-full' : 'md:min-h-[34px] md:min-w-[34px]'
        } flex items-center justify-center gap-1 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${
          current === 3
            ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-500 dark:ring-emerald-400'
            : isEvaluated
            ? 'text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
        }`}
      >
        <span className="text-xs font-black">✓</span>
        <span className="text-xs font-bold">3★</span>
      </button>

      {/* 2: En Proceso (Ámbar suave / 2★) */}
      <button
        type="button"
        role="radio"
        aria-checked={current === 2}
        onClick={() => onChange(2)}
        data-yacita="matrix_score_2"
        data-student-name={studentName}
        title={
          current === 2
            ? 'En Proceso (2★) asignado'
            : `Asignar En Proceso (2★) a ${studentName || 'estudiante'}`
        }
        aria-label={`En Proceso 2 estrellas para ${studentName || 'estudiante'}${current === 2 ? ', seleccionado' : ''}`}
        className={`px-1.5 py-1 text-xs font-bold rounded-md transition-all min-h-[44px] min-w-[44px] ${
          fullWidth ? 'w-full' : 'md:min-h-[34px] md:min-w-[34px]'
        } flex items-center justify-center gap-1 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${
          current === 2
            ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400 dark:ring-amber-300'
            : isEvaluated
            ? 'text-slate-800 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            : 'text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
        }`}
      >
        <span className="text-xs font-black">~</span>
        <span className="text-xs font-bold">2★</span>
      </button>

      {/* 1: Requiere Acompañamiento (Rojo suave / 1★) */}
      <button
        type="button"
        role="radio"
        aria-checked={current === 1}
        onClick={() => onChange(1)}
        data-yacita="matrix_score_1"
        data-student-name={studentName}
        title={
          current === 1
            ? 'Requiere Apoyo (1★) asignado'
            : `Asignar Requiere Apoyo (1★) a ${studentName || 'estudiante'}`
        }
        aria-label={`Requiere Apoyo 1 estrella para ${studentName || 'estudiante'}${current === 1 ? ', seleccionado' : ''}`}
        className={`px-1.5 py-1 text-xs font-bold rounded-md transition-all min-h-[44px] min-w-[44px] ${
          fullWidth ? 'w-full' : 'md:min-h-[34px] md:min-w-[34px]'
        } flex items-center justify-center gap-1 active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${
          current === 1
            ? 'bg-red-600 text-white shadow-xs ring-2 ring-red-400 dark:ring-red-300'
            : isEvaluated
            ? 'text-slate-800 dark:text-slate-200 hover:text-red-700 dark:hover:text-red-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            : 'text-slate-600 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
        }`}
      >
        <span className="text-xs font-black">!</span>
        <span className="text-xs font-bold">1★</span>
      </button>
    </div>
  );
};
