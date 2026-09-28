import React from 'react';
import {
  Sun,
  Moon,
  Cloud,
  Download,
  Upload,
  UserCheck,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';
import { TeacherProfile } from '../types';

interface HeaderProps {
  currentTab: 'students' | 'matrix' | 'abc' | 'reports';
  onSelectTab: (tab: 'students' | 'matrix' | 'abc' | 'reports') => void;
  isDark: boolean;
  onToggleTheme: () => void;
  teacher: TeacherProfile;
  onOpenGoogleModal: () => void;
  onOpenSyncModal: () => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  isDark,
  onToggleTheme,
  teacher,
  onOpenGoogleModal,
  onOpenSyncModal,
  onExportBackup,
  onImportBackup,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <header className="no-print w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0f1a38]/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
      {/* Top Banner: Institutional Letterhead & Quick Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Institutional Membrete (Zero-Overlap Rigid Box) */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-5 w-full md:w-auto text-center sm:text-left">
            {/* Logo Container - Rígido e Independiente */}
            <div className="shrink-0 flex items-center justify-center p-1.5 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
              <img
                src="denzil.png"
                alt="Escudo I.E. Denzil Escolar"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0"
              />
            </div>

            {/* Text Fluid Container with explicit spacing */}
            <div className="flex flex-col min-w-0 gap-0.5 max-w-2xl">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                República de Colombia · Distrito de Riohacha · La Guajira
              </span>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-blue-900 dark:text-blue-200 uppercase leading-snug">
                Institución Educativa Denzil Escolar
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Aprobado mediante Decreto # 248 del 2002 · Reg. DANE 144001003404 · NIT. 8250006500
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Progreso · Paz · Sabiduría · Cultura
                </span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span>Cra 7h No 57-44 B/ La Mano De Dios</span>
              </div>
            </div>
          </div>

          {/* Right Action Bar: Google Auth, Backup, Theme */}
          <div className="flex items-center flex-wrap justify-center gap-2 shrink-0">
            {/* Google Profile Button */}
            <button
              onClick={onOpenGoogleModal}
              title="Cuenta Docente y Google"
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs min-h-[44px]"
            >
              {teacher.isGoogleConnected && teacher.googleAvatar ? (
                <img
                  src={teacher.googleAvatar}
                  alt={teacher.name}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-emerald-500"
                />
              ) : (
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[11px]">
                  {teacher.name.charAt(0)}
                </span>
              )}
              <div className="hidden lg:flex flex-col text-left leading-tight">
                <span className="text-[11px] font-semibold truncate max-w-[120px]">{teacher.name}</span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  {teacher.isGoogleConnected ? 'Google Conectado' : 'Modo Offline'}
                </span>
              </div>
            </button>

            {/* Google Drive / Cloud Sync */}
            <button
              onClick={onOpenSyncModal}
              title="Guardar / Sincronizar en Google Drive"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors min-h-[44px]"
            >
              <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Google Drive</span>
            </button>

            {/* Backup JSON Button */}
            <button
              onClick={onExportBackup}
              title="Exportar respaldo de datos en archivo .json"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors min-h-[44px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Respaldar</span>
            </button>

            {/* Import Backup input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={onImportBackup}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Restaurar copia de respaldo .json"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Upload className="w-4 h-4" />
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={onToggleTheme}
              title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              className="p-2 rounded-lg text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Alternar tema visual"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Accessible, finger friendly with 44px targets */}
        <nav className="mt-4 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1" aria-label="Módulos de la aplicación">
          <button
            onClick={() => onSelectTab('students')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] whitespace-nowrap ${
              currentTab === 'students'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span>1. Estudiantes</span>
          </button>

          <button
            onClick={() => onSelectTab('matrix')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] whitespace-nowrap ${
              currentTab === 'matrix'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>2. Matriz Grupal</span>
          </button>

          <button
            onClick={() => onSelectTab('abc')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] whitespace-nowrap ${
              currentTab === 'abc'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="font-mono text-xs px-1 rounded bg-amber-500/20 text-amber-900 dark:text-amber-300">A·B·C</span>
            <span>3. Registro y TDR</span>
          </button>

          <button
            onClick={() => onSelectTab('reports')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] whitespace-nowrap ${
              currentTab === 'reports'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>4. Reportes Oficiales</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
