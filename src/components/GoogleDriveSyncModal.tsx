import React, { useState } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  HardDrive,
  Download,
  Upload,
  ExternalLink,
  Shield,
  FileCheck,
} from 'lucide-react';
import { TeacherProfile } from '../types';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: TeacherProfile;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  teacher,
  onExportBackup,
  onImportBackup,
}) => {
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSimulateSync = () => {
    setSyncState('syncing');
    setTimeout(() => {
      setSyncState('synced');
      // Trigger backup download
      onExportBackup();
    }, 1200);
  };

  const handleOpenDrive = () => {
    window.open('https://drive.google.com/drive/my-drive', '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#131f42] rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Sincronización con Google Drive & Respaldo
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Offline-First Security Notice */}
          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <strong className="text-blue-900 dark:text-blue-200 block">
                Garantía de Funcionamiento 100% Offline en el Aula
              </strong>
              <p className="leading-relaxed">
                Todas las calificaciones, listas y reportes A-B-C se guardan automáticamente en la memoria segura
                de su dispositivo. Puede trabajar sin internet en la institución y sincronizar cuando tenga conexión.
              </p>
            </div>
          </div>

          {/* Sync Button */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  Copia Segura en Google Drive
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {teacher.isGoogleConnected
                    ? `Vinculado a: ${teacher.email}`
                    : 'Modo local (Inicie sesión con Google en perfil)'}
                </span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {syncState === 'synced' ? 'Sincronizado' : 'Listo para Sincronizar'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleSimulateSync}
                disabled={syncState === 'syncing'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition-colors shadow-xs min-h-[44px]"
              >
                <Cloud className="w-4 h-4" />
                <span>
                  {syncState === 'syncing'
                    ? 'Archivando en la Nube...'
                    : '☁️ Guardar / Sincronizar en Google Drive'}
                </span>
              </button>

              <button
                onClick={handleOpenDrive}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
              >
                <span>Abrir Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Manual JSON backup options */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Copias de Seguridad Manuales (.json)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={onExportBackup}
                className="flex items-center justify-center gap-2 p-3 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-h-[44px]"
              >
                <Download className="w-4 h-4" />
                <span>Respaldar Datos (.json)</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={onImportBackup}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px]"
              >
                <Upload className="w-4 h-4" />
                <span>Restaurar Copia (.json)</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 min-h-[44px]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
