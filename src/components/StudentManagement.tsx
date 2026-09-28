import React, { useState, useMemo } from 'react';
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

interface StudentManagementProps {
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id' | 'createdAt'>) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onOpenTDRForStudent: (student: Student) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onOpenTDRForStudent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('todos');
  const [filterShift, setFilterShift] = useState<string>('todos');

  // Modal state for Add/Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

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
    setGrade('1-01');
    setShift('Mañana');
    setGuardianName('');
    setContactPhone('');
    setMedicalSensoryNotes('');
    setFormError('');
    setIsFormOpen(true);
    emitYacitaEvent({
      type: 'student-modal-opened',
      message: '¡Vamos a registrar un estudiante, profe! Recuerda que el nombre del acudiente es obligatorio y las notas médicas/sensoriales ayudan a orientar su acompañamiento en el aula. 📝',
    });
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFullName(student.fullName);
    setGrade(student.grade);
    setShift(student.shift);
    setGuardianName(student.guardianName);
    setContactPhone(student.contactPhone);
    setMedicalSensoryNotes(student.medicalSensoryNotes);
    setFormError('');
    setIsFormOpen(true);
    emitYacitaEvent({
      type: 'student-modal-opened',
      message: `Editando a ${student.fullName}. Puedes actualizar el acudiente, teléfono u observaciones. ✏️`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setFormError('El nombre completo del estudiante es obligatorio.');
      return;
    }
    if (!guardianName.trim()) {
      setFormError('El nombre del acudiente o acudiente legal es obligatorio.');
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
      emitYacitaEvent({
        type: 'student-saved',
        studentName: fullName.trim(),
        message: `¡Bravo, profe! Registramos a ${fullName.trim()} con éxito. 🎉 Ya puedes evaluar su convivencia en la Matriz.`,
      });
    }

    setIsFormOpen(false);
    emitYacitaEvent({ type: 'student-modal-closed' });
  };

  const confirmDelete = () => {
    if (studentToDelete) {
      onDeleteStudent(studentToDelete.id);
      setStudentToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
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
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 min-h-[44px]"
              />
            </div>

            {/* Filter by Grade */}
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
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
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm transition-colors shadow-xs shrink-0 min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Estudiante</span>
          </button>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white dark:bg-[#131f42] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Directorio de Estudiantes Registrados
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total listados: {filteredStudents.length} de {students.length} estudiantes
            </p>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No se encontraron estudiantes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Intente con otro término de búsqueda o registre un nuevo alumno utilizando el botón superior.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                      {student.fullName}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                      Grado {student.grade}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      {student.shift}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 pt-1">
                    <span>
                      <strong className="text-slate-700 dark:text-slate-200">Acudiente:</strong>{' '}
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
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic pt-0.5 line-clamp-1">
                      Nota médica/sensorial: {student.medicalSensoryNotes}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => onOpenTDRForStudent(student)}
                    title="Ver o Registrar TDR para este alumno"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors min-h-[44px]"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Reporte TDR</span>
                  </button>

                  <button
                    onClick={() => openEditModal(student)}
                    title="Editar información del estudiante"
                    className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center border border-slate-200 dark:border-slate-700"
                    aria-label={`Editar ${student.fullName}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setStudentToDelete(student)}
                    title="Eliminar estudiante"
                    className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center border border-red-200 dark:border-red-900/50"
                    aria-label={`Eliminar ${student.fullName}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Student Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131f42] rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingStudent ? 'Editar Estudiante' : 'Registrar Nuevo Estudiante'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre Completo del Estudiante *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Juan Andrés Pushaina Epieyú"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Grado / Grupo *
                  </label>
                  <input
                    type="text"
                    required
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Ej. 1-01, 1-02, 2-01..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jornada Escolar *
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as ShiftType)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
                  >
                    <option value="Mañana">Mañana</option>
                    <option value="Tarde">Tarde</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del Acudiente / Familiar *
                </label>
                <input
                  type="text"
                  required
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  onFocus={() =>
                    emitYacitaEvent({
                      type: 'custom',
                      message: 'Consejo de Yacita: El nombre del acudiente es obligatorio y esencial para las actas y reportes escolares. 👥',
                    })
                  }
                  placeholder="Ej. María Elena Uriana"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Ej. 315 123 4567"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observación Médica / Sensorial Previa
                </label>
                <textarea
                  rows={2}
                  value={medicalSensoryNotes}
                  onChange={(e) => setMedicalSensoryNotes(e.target.value)}
                  onFocus={() =>
                    emitYacitaEvent({
                      type: 'custom',
                      message: 'Consejo de Yacita: En Observación Médica/Sensorial anota lo que ayude a acompañarlo mejor (visión, pausas motrices, sensibilidad auditiva). 💡',
                    })
                  }
                  placeholder="Ej. Sensibilidad al calor, necesidad de lentes, pausas motoras guiadas..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    emitYacitaEvent({ type: 'student-modal-closed' });
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition-colors shadow-xs min-h-[44px]"
                >
                  {editingStudent ? 'Guardar Cambios' : 'Guardar Estudiante'}
                </button>
              </div>
            </form>
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
                onClick={() => setStudentToDelete(null)}
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
