import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Phone,
  FileText,
  AlertCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Student, ShiftType } from '../types';
import { emitYacitaEvent } from '../utils/yacitaVoice';
import { useYacitaCoach } from '../coach';
import {
  StudentFormCoachPanel,
  StudentFormFieldKey,
} from './StudentFormCoachPanel';

interface StudentManagementProps {
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id' | 'createdAt'>) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onOpenTDRForStudent: (student: Student) => void;
}

function formatPhoneNumber(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onOpenTDRForStudent,
}) => {
  const {
    teacherName,
    notifyModalOpen,
    notifyModalClose,
    notifyActionEvent,
  } = useYacitaCoach();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('todos');
  const [filterShift, setFilterShift] = useState<string>('todos');

  // Modal state for Add/Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [focusedField, setFocusedField] = useState<StudentFormFieldKey>('fullName');

  // Modal state for Delete confirmation
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState('1-01');
  const [shift, setShift] = useState<ShiftType>('Mañana');
  const [guardianName, setGuardianName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [medicalSensoryNotes, setMedicalSensoryNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Extract unique grades
  const uniqueGrades = useMemo(() => {
    const gradesSet = new Set(students.map((s) => s.grade));
    return Array.from(gradesSet).sort();
  }, [students]);

  // Filtered list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.guardianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.grade.toLowerCase().includes(searchTerm.toLowerCase());
      const matchGrade = filterGrade === 'todos' || s.grade === filterGrade;
      const matchShift = filterShift === 'todos' || s.shift === filterShift;
      return matchSearch && matchGrade && matchShift;
    });
  }, [students, searchTerm, filterGrade, filterShift]);

  const openAddModal = () => {
    setEditingStudent(null);
    setFullName('');
    setGrade(uniqueGrades[0] || '1-01');
    setShift('Mañana');
    setGuardianName('');
    setContactPhone('');
    setMedicalSensoryNotes('');
    setFormError('');
    setFocusedField('fullName');
    setIsFormOpen(true);
    notifyModalOpen('add_student');
    emitYacitaEvent({
      type: 'student-modal-opened',
      message: '¡Vamos a registrar un estudiante, profe! Te acompaño paso a paso.',
    });
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFullName(student.fullName);
    setGrade(student.grade);
    setShift(student.shift);
    setGuardianName(student.guardianName);
    setContactPhone(formatPhoneNumber(student.contactPhone || ''));
    setMedicalSensoryNotes(student.medicalSensoryNotes);
    setFormError('');
    setFocusedField('fullName');
    setIsFormOpen(true);
    notifyModalOpen('edit_student');
    emitYacitaEvent({
      type: 'student-modal-opened',
      message: `Editando a ${student.fullName}. Puedes actualizar el acudiente o teléfono.`,
    });
  };

  const closeFormModal = useCallback(() => {
    setIsFormOpen(false);
    notifyModalClose();
    emitYacitaEvent({ type: 'student-modal-closed' });
  }, [notifyModalClose]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setContactPhone(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setFormError('El nombre completo del estudiante es obligatorio.');
      setFocusedField('fullName');
      return;
    }
    if (!guardianName.trim()) {
      setFormError('El nombre del acudiente o acudiente legal es obligatorio.');
      setFocusedField('guardianName');
      return;
    }

    if (editingStudent) {
      onUpdateStudent({
        ...editingStudent,
        fullName: fullName.trim(),
        grade: grade.trim(),
        shift,
        guardianName: guardianName.trim(),
        contactPhone: contactPhone.trim(),
        medicalSensoryNotes: medicalSensoryNotes.trim(),
      });
      notifyActionEvent('student_saved', { studentName: fullName.trim() });
      emitYacitaEvent({
        type: 'celebrate',
        message: `¡Cambios de ${fullName.trim()} guardados con éxito, profe! 🎉`,
      });
    } else {
      onAddStudent({
        fullName: fullName.trim(),
        grade: grade.trim(),
        shift,
        guardianName: guardianName.trim(),
        contactPhone: contactPhone.trim(),
        medicalSensoryNotes: medicalSensoryNotes.trim(),
      });
      notifyActionEvent('student_saved', { studentName: fullName.trim() });
      emitYacitaEvent({
        type: 'student-saved',
        studentName: fullName.trim(),
        message: `¡Bravo, profe! Registramos a ${fullName.trim()} con éxito. 🎉 Ya puedes evaluar su convivencia en la Matriz.`,
      });
    }

    closeFormModal();
  };

  const openDeleteModal = (student: Student) => {
    setStudentToDelete(student);
    notifyModalOpen('delete_student');
  };

  const confirmDelete = () => {
    if (studentToDelete) {
      onDeleteStudent(studentToDelete.id);
      setStudentToDelete(null);
      notifyModalClose();
    }
  };

  return (
    <div className="space-y-6 pb-36">
      {/* Top Action & Search Bar */}
      <div className="bg-white dark:bg-[#131f42] rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por estudiante o acudiente..."
                data-yacita="students_search_input"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
            </div>

            {/* Filter by Grade */}
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              data-yacita="students_filter_grade"
              className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-600 min-h-[44px]"
            >
              <option value="todos">Todos los Grados</option>
              {uniqueGrades.map((g) => (
                <option key={g} value={g}>
                  Grado {g}
                </option>
              ))}
            </select>

            {/* Filter by Shift */}
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              data-yacita="students_filter_shift"
              className="w-full sm:w-auto px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-600 min-h-[44px]"
            >
              <option value="todos">Todas las Jornadas</option>
              <option value="Mañana">Jornada Mañana</option>
              <option value="Tarde">Jornada Tarde</option>
            </select>
          </div>

          {/* Add Student Button */}
          <button
            onClick={openAddModal}
            data-yacita="students_btn_add"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm transition-colors shadow-xs shrink-0 min-h-[44px]"
            title="Registrar nuevo estudiante con acompañamiento de Yacita"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Estudiante</span>
          </button>
        </div>
      </div>

      {/* Student List Grid / Table */}
      <div className="bg-white dark:bg-[#131f42] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Directorio de Estudiantes
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
              {filteredStudents.length} matriculados
            </span>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No se encontraron estudiantes con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                data-student-id={student.id}
                data-yacita="student_row_item"
                data-student-name={student.fullName}
                data-grade={student.grade}
                data-shift={student.shift}
                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {student.fullName}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {student.grade} · {student.shift}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      <strong className="text-slate-700 dark:text-slate-300">Acudiente:</strong>{' '}
                      {student.guardianName}
                    </span>
                    {student.contactPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {student.contactPhone}
                      </span>
                    )}
                  </div>

                  {student.medicalSensoryNotes && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 italic">
                      Obs. médica/sensorial: {student.medicalSensoryNotes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTDRForStudent(student);
                    }}
                    data-yacita="student_action_tdr"
                    data-student-name={student.fullName}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[38px]"
                    title="Ver Registro de Seguimiento y TDR oficial"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Ver TDR</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(student);
                    }}
                    data-yacita="student_action_edit"
                    data-student-name={student.fullName}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center"
                    title="Editar datos del estudiante"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteModal(student);
                    }}
                    data-yacita="student_action_delete"
                    data-student-name={student.fullName}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center"
                    title="Eliminar estudiante"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Student Modal with Companion Guided Coach Panel */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#131f42] rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col lg:flex-row my-auto max-h-[92vh]">
            
            {/* Form Column */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-[#131f42]/95 backdrop-blur-xs z-10">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {editingStudent ? 'Editar Estudiante' : 'Registrar Nuevo Estudiante'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    I.E. Denzil Escolar · Registro Pedagógico Formativo
                  </p>
                </div>
                <button
                  onClick={closeFormModal}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 text-xs rounded-lg bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                    {formError}
                  </div>
                )}

                {/* Full Name */}
                <div
                  className={`p-2 rounded-xl transition-all ${
                    focusedField === 'fullName'
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-400'
                      : ''
                  }`}
                >
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre Completo del Estudiante *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onFocus={() => setFocusedField('fullName')}
                    onChange={(e) => setFullName(e.target.value)}
                    data-yacita="field_fullName"
                    placeholder="Ej. Juan Andrés Pushaina Epieyú"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
                  />
                </div>

                {/* Grade & Shift */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    className={`p-2 rounded-xl transition-all ${
                      focusedField === 'grade'
                        ? 'bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-400'
                        : ''
                    }`}
                  >
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Grado / Grupo *
                    </label>
                    <input
                      type="text"
                      required
                      value={grade}
                      onFocus={() => setFocusedField('grade')}
                      onChange={(e) => setGrade(e.target.value)}
                      data-yacita="field_grade"
                      placeholder="Ej. 1-01, 1-02, 2-01..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
                    />
                  </div>

                  <div
                    className={`p-2 rounded-xl transition-all ${
                      focusedField === 'shift'
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 ring-2 ring-indigo-400'
                        : ''
                    }`}
                  >
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Jornada Escolar *
                    </label>
                    <select
                      value={shift}
                      onFocus={() => setFocusedField('shift')}
                      onChange={(e) => setShift(e.target.value as ShiftType)}
                      data-yacita="field_shift"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
                    >
                      <option value="Mañana">Mañana</option>
                      <option value="Tarde">Tarde</option>
                    </select>
                  </div>
                </div>

                {/* Guardian Name */}
                <div
                  className={`p-2 rounded-xl transition-all ${
                    focusedField === 'guardianName'
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-400'
                      : ''
                  }`}
                >
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre del Acudiente / Familiar *
                  </label>
                  <input
                    type="text"
                    required
                    value={guardianName}
                    onFocus={() => setFocusedField('guardianName')}
                    onChange={(e) => setGuardianName(e.target.value)}
                    data-yacita="field_guardianName"
                    placeholder="Ej. María Elena Uriana"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
                  />
                </div>

                {/* Phone */}
                <div
                  className={`p-2 rounded-xl transition-all ${
                    focusedField === 'contactPhone'
                      ? 'bg-teal-50/50 dark:bg-teal-950/20 ring-2 ring-teal-400'
                      : ''
                  }`}
                >
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Teléfono de Contacto (Celular Colombia)
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onFocus={() => setFocusedField('contactPhone')}
                    onChange={handlePhoneChange}
                    data-yacita="field_contactPhone"
                    placeholder="Ej. 315 123 4567"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
                  />
                </div>

                {/* Medical & Sensory Notes */}
                <div
                  className={`p-2 rounded-xl transition-all ${
                    focusedField === 'medicalSensoryNotes'
                      ? 'bg-purple-50/50 dark:bg-purple-950/20 ring-2 ring-purple-400'
                      : ''
                  }`}
                >
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Observación Médica / Sensorial Previa
                  </label>
                  <textarea
                    rows={2}
                    value={medicalSensoryNotes}
                    onFocus={() => setFocusedField('medicalSensoryNotes')}
                    onChange={(e) => setMedicalSensoryNotes(e.target.value)}
                    data-yacita="field_medicalSensoryNotes"
                    placeholder="Ej. Sensibilidad al calor, necesidad de lentes, pausas motoras guiadas..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    data-yacita="btn_student_cancel"
                    className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    data-yacita="btn_student_save"
                    className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition-colors shadow-xs min-h-[44px]"
                  >
                    {editingStudent ? 'Guardar Cambios' : 'Guardar Estudiante'}
                  </button>
                </div>
              </form>
            </div>

            {/* Dedicated Side/Top Companion Coach Panel (Section C) */}
            <StudentFormCoachPanel
              focusedField={focusedField}
              fullName={fullName}
              grade={grade}
              shift={shift}
              guardianName={guardianName}
              contactPhone={contactPhone}
              medicalSensoryNotes={medicalSensoryNotes}
              students={students}
              currentStudentId={editingStudent?.id}
              teacherFirstName={teacherName}
              onApplyFullName={(val) => setFullName(val)}
              onApplyGrade={(val) => setGrade(val)}
              onApplyShift={(val) => setShift(val)}
              onApplyGuardianName={(val) => setGuardianName(val)}
              onApplyPhone={(val) => setContactPhone(val)}
              onApplyNotes={(val) => setMedicalSensoryNotes(val)}
            />
          </div>
        </div>
      )}

      {/* Mandatory Protected Delete Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131f42] rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mb-4 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="text-center text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
              Confirmación de Eliminación
            </h3>

            <p className="text-center text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              ¿Está seguro de eliminar al estudiante{' '}
              <strong className="text-slate-900 dark:text-slate-100 underline decoration-red-500">
                {studentToDelete.fullName}
              </strong>
              ? Esta acción no se puede deshacer.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setStudentToDelete(null);
                  notifyModalClose();
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors shadow-xs min-h-[44px]"
              >
                Eliminar Estudiante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
