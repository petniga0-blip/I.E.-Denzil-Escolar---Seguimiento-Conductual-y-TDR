import React, { useState, useMemo } from 'react';
import { Download, Clock } from 'lucide-react';

export interface BackupReminderProps {
  hasStudents: boolean;
  lastBackupAt: string | null;
  onExportBackup: () => void;
}

export const BackupReminder: React.FC<BackupReminderProps> = ({
  hasStudents,
  lastBackupAt,
  onExportBackup,
}) => {
  const [isSnoozed, setIsSnoozed] = useState<boolean>(() => {
    try {
      const snoozeUntil = localStorage.getItem('denzil_backup_snooze_until');
      if (snoozeUntil) {
        const time = parseInt(snoozeUntil, 10);
        return !isNaN(time) && Date.now() < time;
      }
    } catch {
      // ignore
    }
    return false;
  });

  const daysSinceBackup = useMemo(() => {
    if (!lastBackupAt) return null;
    try {
      const backupTime = new Date(lastBackupAt).getTime();
      if (isNaN(backupTime)) return null;
      const diffMs = Date.now() - backupTime;
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    } catch {
      return null;
    }
  }, [lastBackupAt]);

  const handleSnooze = () => {
    try {
      const snoozeUntil = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('denzil_backup_snooze_until', snoozeUntil.toString());
    } catch {
      // ignore
    }
    setIsSnoozed(true);
  };

  // Condición: hay al menos 1 estudiante Y (nunca hubo respaldo O pasaron más de 7 días) Y no está pospuesto
  const shouldShow =
    hasStudents &&
    !isSnoozed &&
    (daysSinceBackup === null || daysSinceBackup > 7);

  if (!shouldShow) {
    return null;
  }

  const messageText =
    daysSinceBackup === null
      ? 'Último respaldo: nunca. Descarga una copia para no perder tus datos.'
      : `Último respaldo: hace ${daysSinceBackup} días. Descarga una copia para no perder tus datos.`;

  return (
    <aside
      className="no-print w-full bg-amber-50/95 dark:bg-[#1a1506] border-b border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 py-1.5 px-3 sm:px-6 lg:px-8 landscape:pl-20 landscape:py-1 transition-colors"
      aria-label="Aviso preventivo de copia de seguridad"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row landscape:flex-row items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 min-w-0 text-center sm:text-left">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 hidden sm:inline" />
          <span className="font-medium leading-tight">
            {messageText}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onExportBackup}
            data-yacita="backup_reminder_download"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold text-xs transition-colors shadow-xs active:scale-95 min-h-[32px] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label="Descargar copia de respaldo en formato JSON"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Descargar respaldo</span>
          </button>

          <button
            type="button"
            onClick={handleSnooze}
            data-yacita="backup_reminder_snooze"
            className="inline-flex items-center px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/70 text-amber-800 dark:text-amber-300 font-medium text-xs transition-colors active:scale-95 min-h-[32px] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label="Posponer aviso de respaldo por 24 horas"
          >
            <span>Recordar más tarde</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
