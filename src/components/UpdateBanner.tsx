import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

// Capture whether there was already an active service worker controller when the page script loaded
const hadControllerAtPageLoad =
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  Boolean(navigator.serviceWorker.controller);

export const UpdateBanner: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const initialControllerRef = useRef<boolean>(
    hadControllerAtPageLoad ||
      (typeof navigator !== 'undefined' &&
        'serviceWorker' in navigator &&
        Boolean(navigator.serviceWorker.controller))
  );

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleControllerChange = () => {
      // Only show if there was already an active controller when the page loaded
      // (ignores the first-time service worker installation on fresh visitors)
      if (initialControllerRef.current) {
        setHasUpdate(true);
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  if (!hasUpdate || isDismissed) {
    return null;
  }

  const handleUpdate = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-yacita-ignore="true"
      className="no-print w-full bg-blue-900 dark:bg-[#071330] text-white border-b border-blue-700/80 dark:border-blue-800/80 py-2 px-3 sm:px-6 lg:px-8 shadow-md transition-all z-50"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm font-medium">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <RefreshCw className="w-4 h-4 text-blue-300 shrink-0" />
          <span>Hay una nueva versión de la app</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-yacita-ignore="true"
            onClick={handleUpdate}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-colors active:scale-95 min-h-[32px] flex items-center gap-1.5 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-400"
            aria-label="Actualizar la aplicación ahora"
          >
            Actualizar
          </button>

          <button
            type="button"
            data-yacita-ignore="true"
            onClick={handleDismiss}
            className="px-2.5 py-1 rounded-lg bg-blue-800/80 hover:bg-blue-700/80 text-blue-200 hover:text-white font-medium text-xs transition-colors active:scale-95 min-h-[32px] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="Ignorar actualización por ahora"
          >
            Después
          </button>
        </div>
      </div>
    </div>
  );
};
