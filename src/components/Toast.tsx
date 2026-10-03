import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'exito' | 'error' | 'info';

export interface ToastItem {
  id: string;
  mensaje: string;
  tipo: ToastType;
}

interface ToastContextType {
  showToast: (mensaje: string, tipo?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Standalone global trigger so showToast can also be invoked directly if needed
let globalShowToast: (mensaje: string, tipo?: ToastType) => void = () => {};

export const showToast = (mensaje: string, tipo: ToastType = 'info'): void => {
  if (globalShowToast) {
    globalShowToast(mensaje, tipo);
  }
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast };
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const triggerToast = useCallback(
    (mensaje: string, tipo: ToastType = 'info') => {
      if (!mensaje) return;
      const id = 'toast-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
      const newToast: ToastItem = { id, mensaje, tipo };

      setToasts((prev) => [...prev.slice(-3), newToast]);

      const timer = setTimeout(() => {
        removeToast(id);
      }, 4000);

      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  useEffect(() => {
    globalShowToast = triggerToast;
    return () => {
      globalShowToast = () => {};
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, [triggerToast]);

  return (
    <ToastContext.Provider value={{ showToast: triggerToast }}>
      {children}

      {/* Toast Notification Container */}
      <div
        data-yacita-ignore="true"
        className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+68px)] sm:bottom-6 left-1/2 -translate-x-1/2 z-[10000] no-print pointer-events-none flex flex-col items-center gap-2 max-w-[min(calc(100vw-32px),460px)] w-full px-4"
      >
        {toasts.map((toast) => {
          const isError = toast.tipo === 'error';
          const isSuccess = toast.tipo === 'exito';

          return (
            <div
              key={toast.id}
              data-yacita-ignore="true"
              role={isError ? 'alert' : 'status'}
              aria-live={isError ? 'assertive' : 'polite'}
              className={`pointer-events-auto flex items-center justify-between gap-3 w-full py-2.5 px-4 rounded-xl shadow-xl border text-sm font-medium transition-all motion-reduce:transition-none duration-200 animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none ${
                isSuccess
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 border-emerald-300 dark:border-emerald-700/80 shadow-emerald-900/10'
                  : isError
                  ? 'bg-rose-50 dark:bg-rose-950 text-rose-900 dark:text-rose-100 border-rose-300 dark:border-rose-700/80 shadow-rose-900/10'
                  : 'bg-slate-900/95 dark:bg-[#0d162e]/95 text-white border-slate-700 dark:border-blue-900/50 shadow-slate-900/20'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {isSuccess && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                )}
                {isError && (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 stroke-[2.5]" />
                )}
                {!isSuccess && !isError && (
                  <Info className="w-4 h-4 text-blue-400 shrink-0 stroke-[2.5]" />
                )}
                <span className="truncate break-words whitespace-normal leading-snug">
                  {toast.mensaje}
                </span>
              </div>

              <button
                type="button"
                data-yacita-ignore="true"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
