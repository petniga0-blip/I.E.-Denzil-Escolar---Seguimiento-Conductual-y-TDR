import React, { useState, useEffect } from 'react';
import {
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
import denzilLogo from '../assets/denzil.png';
import { Sheet } from './Sheet';

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

  // Keep internal states in sync with props when opening
  useEffect(() => {
    if (isOpen) {
      setName(teacher.name);
      setEmail(teacher.email);
      setRole(teacher.role);
      setSede(teacher.sede);
      setGradeAssigned(teacher.gradeAssigned);
      setSyncStatus('');
    }
  }, [isOpen, teacher]);

  const hasChanges =
    name !== teacher.name ||
    email !== teacher.email ||
    role !== teacher.role ||
    sede !== teacher.sede ||
    gradeAssigned !== teacher.gradeAssigned;

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateTeacher({
      ...teacher,
      name: name.trim(),
      email: email.trim(),
      role: role.trim(),
      sede: sede.trim(),
      gradeAssigned: gradeAssigned.trim(),
    });
    setSyncStatus('Perfil docente actualizado exitosamente.');
    setTimeout(() => {
      setSyncStatus('');
      onClose();
    }, 1200);
  };

  const handleToggleGoogle = () => {
    if (teacher.isGoogleConnected) {
      onUpdateTeacher({
        ...teacher,
        isGoogleConnected: false,
      });
      setSyncStatus('Sesión de Google desvinculada.');
    } else {
      onUpdateTeacher({
        ...teacher,
        isGoogleConnected: true,
        email: email || 'docente@denzilescolar.edu.co',
        googleAvatar:
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      });
      setSyncStatus('¡Sesión de Google vinculada con éxito!');
    }
    setTimeout(() => setSyncStatus(''), 3000);
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      sheetId="google_account_profile"
      size="md"
      title="Perfil Docente & Cuenta Institucional"
      subtitle="I.E. Denzil Escolar · Sede Central"
      icon={
        <div className="w-8 h-8 shrink-0 flex items-center justify-center">
          <img
            src={denzilLogo}
            alt="Logo I.E. Denzil Escolar"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain drop-shadow-xs"
          />
        </div>
      }
      hasUnsavedChanges={hasChanges}
      unsavedChangesMessage="Ha realizado cambios en su perfil docente que no se han guardado. ¿Desea salir sin guardar?"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleSaveProfile()}
            className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-blue-700 hover:bg-blue-800 text-white transition-colors shadow-xs min-h-[44px] min-w-[120px] active:scale-95"
          >
            Guardar Perfil
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {syncStatus && (
          <div className="p-3.5 text-xs font-semibold rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* Google Connect Section */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {teacher.isGoogleConnected && teacher.googleAvatar ? (
              <img
                src={teacher.googleAvatar}
                alt={teacher.name}
                loading="lazy"
                decoding="async"
                className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-lg shrink-0">
                G
              </div>
            )}
            <div className="text-left min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                {teacher.isGoogleConnected ? 'Cuenta de Google Conectada' : 'Modo Local / Sin Conexión'}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 block mt-0.5 break-words break-all">
                {teacher.isGoogleConnected
                  ? teacher.email
                  : 'Los datos se guardan de forma segura en este dispositivo (Offline).'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleGoogle}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors shrink-0 min-h-[44px] active:scale-95 ${
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
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
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
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
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
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
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
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
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
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 focus:outline-hidden min-h-[44px]"
            />
          </div>
        </form>
      </div>
    </Sheet>
  );
};
