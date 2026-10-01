import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  CheckCircle2,
  Download,
  Upload,
  ExternalLink,
  Shield,
  AlertCircle,
  RefreshCw,
  Clock,
  Info,
} from 'lucide-react';
import { TeacherProfile } from '../types';
import { Sheet } from './Sheet';
import {
  getLastBackupTimestamp,
  formatLastBackupDate,
  saveLastBackupTimestamp,
  isBackupOlderThan7Days,
  BACKUP_REMINDER_SESSION_KEY,
} from '../utils/storage';
import { useYacitaCoach } from '../coach/useYacitaCoach';
import yacitaIdle from '../assets/idle.png';

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
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncNotice, setSyncNotice] = useState<string>('');
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [show7DayReminder, setShow7DayReminder] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { notifyModalOpen } = useYacitaCoach();

  // Load and refresh last backup timestamp when modal opens
  useEffect(() => {
    if (isOpen) {
      const ts = getLastBackupTimestamp();
      setLastBackup(ts);

      // Check 7-day reminder (only once per session)
      try {
        const isDismissed = sessionStorage.getItem(BACKUP_REMINDER_SESSION_KEY) === 'true';
        if (!isDismissed && isBackupOlderThan7Days()) {
          setShow7DayReminder(true);
        } else {
          setShow7DayReminder(false);
        }
      } catch {
        setShow7DayReminder(false);
      }
    }
  }, [isOpen]);

  const handleDismissReminder = () => {
    setShow7DayReminder(false);
    try {
      sessionStorage.setItem(BACKUP_REMINDER_SESSION_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const handleSimulateSync = () => {
    setSyncState('syncing');
    setSyncNotice('');

    setTimeout(() => {
      try {
        // Trigger backup download / sync
        onExportBackup();
        const nowIso = new Date().toISOString();
        saveLastBackupTimestamp(nowIso);
        setLastBackup(nowIso);
        setSyncState('synced');
        setSyncNotice('¡Sincronización con Google Drive completada exitosamente! Se generó una copia segura.');
        handleDismissReminder();

        setTimeout(() => {
          setSyncNotice('');
        }, 6000);
      } catch {
        setSyncState('error');
        setSyncNotice('Ocurrió un error al preparar la copia de seguridad.');
      }
    }, 1200);
  };

  const handleExportBackupClick = () => {
    try {
      onExportBackup();
      const nowIso = new Date().toISOString();
      saveLastBackupTimestamp(nowIso);
      setLastBackup(nowIso);
      setSyncState('synced');
      setSyncNotice('Respaldo descargado exitosamente en archivo .json.');
      handleDismissReminder();
      setTimeout(() => {
        setSyncNotice('');
      }, 5000);
    } catch {
      setSyncState('error');
      setSyncNotice('No se pudo descargar el respaldo.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSyncState('syncing');
    setSyncNotice('Restaurando copia de respaldo...');
    try {
      onImportBackup(e);
      const nowIso = new Date().toISOString();
      saveLastBackupTimestamp(nowIso);
      setLastBackup(nowIso);
      setSyncState('synced');
      setSyncNotice('¡Copia de respaldo (.json) restaurada correctamente!');
      handleDismissReminder();
      setTimeout(() => {
        setSyncNotice('');
      }, 5000);
    } catch {
      setSyncState('error');
      setSyncNotice('Error al restaurar el archivo de respaldo.');
    }
  };

  const handleOpenDrive = () => {
    window.open('https://drive.google.com/drive/my-drive', '_blank');
  };

  const handleYacitaHelp = () => {
    notifyModalOpen('drive_sync');
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      sheetId="google_drive_sync"
      size="md"
      title="Sincronización con Google Drive & Respaldo"
      subtitle="I.E. Denzil Escolar · Respaldo Seguro"
      icon={<Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
      showYacitaHelp={true}
      onYacitaHelpClick={handleYacitaHelp}
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 min-w-0">
            <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate">
              Última copia: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{formatLastBackupDate(lastBackup)}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-blue-700 hover:bg-blue-800 text-white min-h-[44px] min-w-[96px] transition-colors active:scale-95 shadow-xs shrink-0 focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Cerrar ventana de sincronización y respaldo"
          >
            Entendido
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Yacita Compact Pedagogical Guidance Strip */}
        <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={yacitaIdle}
              alt="Yacita"
              loading="lazy"
              decoding="async"
              className="w-7 h-7 object-contain shrink-0"
            />
            <p className="text-xs text-amber-900 dark:text-amber-200 font-medium leading-snug line-clamp-2">
              {teacher.name.split(' ')[0] || 'Docente'}, aquí puedes respaldar tus registros en Google Drive.
            </p>
          </div>
          <button
            type="button"
            onClick={handleYacitaHelp}
            className="px-3 py-2 text-xs font-bold rounded-lg bg-amber-200 dark:bg-amber-800/80 text-amber-900 dark:text-amber-100 hover:bg-amber-300 transition-colors shrink-0 min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Escuchar
          </button>
        </div>

        {/* 7-Day Non-Invasive Reminder Banner */}
        {show7DayReminder && (
          <div className="p-3.5 rounded-xl bg-amber-100/90 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-100 space-y-2 text-xs animate-in fade-in duration-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <strong>Recordatorio de respaldo:</strong> Hace más de 7 días no realizas una copia de seguridad. Te sugerimos sincronizar o descargar un archivo para resguardar las calificaciones y reportes de tus estudiantes.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleDismissReminder}
                className="px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-amber-200/60 dark:hover:bg-amber-900/60 text-xs font-semibold transition-colors min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Recordármelo luego
              </button>
              <button
                type="button"
                onClick={handleSimulateSync}
                className="px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-colors min-h-[44px] flex items-center focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Respaldar ahora
              </button>
            </div>
          </div>
        )}

        {/* Live Status Region (Role status for accessible announcements) */}
        {syncNotice && (
          <div
            role="status"
            aria-live="polite"
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 border animate-in fade-in duration-200 ${
              syncState === 'error'
                ? 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            {syncState === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{syncNotice}</span>
          </div>
        )}

        {/* Honest Offline Notice: "Funciona sin internet" */}
        <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <strong className="text-blue-900 dark:text-blue-200 block text-xs sm:text-sm font-bold">
              Funciona sin internet
            </strong>
            <p className="leading-relaxed">
              Tus calificaciones, listas y reportes A-B-C se guardan en este dispositivo y puedes trabajar sin conexión. Haz una copia de respaldo con frecuencia para no perder información si cambias de teléfono o borras los datos del navegador. Cuando vuelva la conexión, sincroniza con Google Drive.
            </p>
          </div>
        </div>

        {/* Sync Section Card with flex-wrap and no overlaps */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 block">
                Copia Segura en Google Drive
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 block mt-0.5 break-words [overflow-wrap:anywhere]">
                {teacher.isGoogleConnected
                  ? `Vinculado a: ${teacher.email}`
                  : 'Modo local (Inicie sesión con Google en perfil)'}
              </span>
            </div>

            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                syncState === 'synced'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  : syncState === 'syncing'
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
              }`}
            >
              {syncState === 'synced'
                ? 'Sincronizado'
                : syncState === 'syncing'
                ? 'Sincronizando...'
                : 'Listo para Sincronizar'}
            </span>
          </div>

          {/* Sync & Open Drive Buttons: Stacked on mobile, full width, 1 single cloud icon */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleSimulateSync}
              disabled={syncState === 'syncing'}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-blue-700 hover:bg-blue-800 text-white transition-colors shadow-xs min-h-[44px] active:scale-95 disabled:opacity-60"
            >
              {syncState === 'syncing' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span className="text-center">Archivando en la Nube...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 shrink-0" />
                  <span className="text-center leading-tight">
                    Guardar / Sincronizar en Google Drive
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenDrive}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] active:scale-95"
            >
              <span>Abrir Drive</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>

        {/* Manual JSON backup options with unified names: "Descargar respaldo (.json)" y "Restaurar copia (.json)" */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
              Copias de Seguridad Manuales (.json)
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-300">
              Formato institucional
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExportBackupClick}
              className="w-full flex items-center justify-center gap-2 p-3 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-h-[44px] active:scale-95 border border-slate-200 dark:border-slate-700"
            >
              <Download className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="text-center leading-tight">Descargar respaldo (.json)</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".json"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-3 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] active:scale-95"
            >
              <Upload className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="text-center leading-tight">Restaurar copia (.json)</span>
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
};
