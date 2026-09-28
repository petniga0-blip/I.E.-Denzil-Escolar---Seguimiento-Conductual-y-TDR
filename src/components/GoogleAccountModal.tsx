import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Cloud,
  CheckCircle,
  LogOut,
  LogIn,
  Upload,
  User,
  School,
  Mail,
  HardDrive,
} from 'lucide-react';
import { TeacherProfile } from '../types';

interface GoogleAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: TeacherProfile;
  onUpdateTeacher: (updated: TeacherProfile) => void;
  onSyncDrive: () => void;
}

export const GoogleAccountModal: React.FC<GoogleAccountModalProps> = ({
  isOpen,
  onClose,
  teacher,
  onUpdateTeacher,
  onSyncDrive,
}) => {
  const [name, setName] = useState(teacher.name);
  const [email, setEmail] = useState(teacher.email);
  const [role, setRole] = useState(teacher.role);
  const [sede, setSede] = useState(teacher.sede);
  const [gradeAssigned, setGradeAssigned] = useState(teacher.gradeAssigned);
  const [syncStatus, setSyncStatus] = useState<string>('');

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTeacher({
      ...teacher,
      name: name.trim(),
      email: email.trim(),
      role: role.trim(),
      sede: sede.trim(),
      gradeAssigned: gradeAssigned.trim(),
    });
    setSyncStatus('Perfil docente actualizado exitosamente.');
    setTimeout(() => setSyncStatus(''), 3000);
  };

  const handleToggleGoogle = () => {
    if (teacher.isGoogleConnected) {
      onUpdateTeacher({
        ...teacher,
        isGoogleConnected: false,
      });
    } else {
      onUpdateTeacher({
        ...teacher,
        isGoogleConnected: true,
        email: email || 'rector@denzilescolar.edu.co',
        googleAvatar:
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      });
      setSyncStatus('¡Sesión de Google vinculada con éxito!');
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#131f42] rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Perfil Docente & Cuenta Google
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {syncStatus && (
            <div className="p-3 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{syncStatus}</span>
            </div>
          )}

          {/* Google Connect Section */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {teacher.isGoogleConnected && teacher.googleAvatar ? (
                <img
                  src={teacher.googleAvatar}
                  alt={teacher.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-lg shrink-0">
                  G
                </div>
              )}
              <div className="text-left">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                  {teacher.isGoogleConnected ? 'Cuenta de Google Conectada' : 'Modo Local / Sin Conexión'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {teacher.isGoogleConnected
                    ? teacher.email
                    : 'Los datos se guardan de forma segura en este dispositivo (Offline).'}
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleGoogle}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 min-h-[44px] ${
                teacher.isGoogleConnected
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200'
                  : 'bg-blue-700 hover:bg-blue-800 text-white shadow-xs'
              }`}
            >
              {teacher.isGoogleConnected ? (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Desconectar</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Iniciar Sesión con Google</span>
                </>
              )}
            </button>
          </div>

          {/* Teacher Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nombre del Docente / Orientador *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Correo Institucional *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Grado Asignado
                </label>
                <input
                  type="text"
                  value={gradeAssigned}
                  onChange={(e) => setGradeAssigned(e.target.value)}
                  placeholder="Ej. 1-01"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cargo / Rol Institucional
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ej. Docente de Aula / Orientador Formativo"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sede Institucional
              </label>
              <input
                type="text"
                value={sede}
                onChange={(e) => setSede(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px]"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-bold rounded-lg bg-blue-700 hover:bg-blue-800 text-white shadow-xs min-h-[44px]"
              >
                Guardar Perfil
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
