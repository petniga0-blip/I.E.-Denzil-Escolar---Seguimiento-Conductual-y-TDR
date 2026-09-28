import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, X, HelpCircle } from 'lucide-react';
import { useMobileLayout } from '../utils/useMobileLayout';
import yacitaIdle from '../assets/idle.png';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
  hasUnsavedChanges?: boolean;
  unsavedChangesMessage?: string;
  sheetId?: string;
  isFullScreen?: boolean;
  showYacitaHelp?: boolean;
  onYacitaHelpClick?: () => void;
  className?: string;
  bodyClassName?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'lg',
  hasUnsavedChanges = false,
  unsavedChangesMessage = '¿Tiene cambios sin guardar. Desea salir de todas formas?',
  sheetId = 'sheet',
  isFullScreen = false,
  showYacitaHelp = false,
  onYacitaHelpClick,
  className = '',
  bodyClassName = '',
}) => {
  const { isLandscapeMobile, isMobile, isTablet, isDesktop } = useMobileLayout();
  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const hasHistoryPushedRef = useRef(false);
  const isClosingRef = useRef(false);

  // Swipe gesture state
  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);
  const [dragTranslateY, setDragTranslateY] = useState(0);

  // Debug layout check (?debug=layout)
  const [isDebugLayoutError, setIsDebugLayoutError] = useState(false);

  // Handle safe close with unsaved changes check
  const handleRequestClose = useCallback(() => {
    if (isClosingRef.current) return;
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(unsavedChangesMessage);
      if (!confirmLeave) return;
    }

    isClosingRef.current = true;

    // Pop history if this sheet pushed it
    if (hasHistoryPushedRef.current) {
      hasHistoryPushedRef.current = false;
      window.history.back();
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, unsavedChangesMessage, onClose]);

  // Manage Browser / Phone "Back" button via History API
  useEffect(() => {
    if (!isOpen) {
      isClosingRef.current = false;
      return;
    }

    // Save previous active element for focus restoration
    if (typeof document !== 'undefined') {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    }

    // Push state into history
    const stateObj = { isSheetOpen: true, sheetId: sheetId || 'sheet_' + Date.now() };
    window.history.pushState(stateObj, '');
    hasHistoryPushedRef.current = true;

    const handlePopState = (e: PopStateEvent) => {
      // The popstate was initiated by browser/device Back button
      hasHistoryPushedRef.current = false;
      if (hasUnsavedChanges) {
        const confirmLeave = window.confirm(unsavedChangesMessage);
        if (!confirmLeave) {
          // Re-push state to keep sheet open
          window.history.pushState(stateObj, '');
          hasHistoryPushedRef.current = true;
          return;
        }
      }
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (hasHistoryPushedRef.current) {
        hasHistoryPushedRef.current = false;
        // Clean up history entry if unmounted without popstate
        try {
          window.history.back();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, sheetId, hasUnsavedChanges, unsavedChangesMessage, onClose]);

  // Escape key & background scroll lock & initial scrollTop = 0 & focus management
  useEffect(() => {
    if (!isOpen) return;

    // Reset scroll to top
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }

    // Focus panel container safely without opening virtual keyboard
    if (panelRef.current) {
      panelRef.current.focus({ preventScroll: true });
    }

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    // Keyboard listener for Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener('keydown', handleKeyDown);

      // Restore focus
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        try {
          previousActiveElementRef.current.focus();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, handleRequestClose]);

  // Layout Debugger (?debug=layout)
  useEffect(() => {
    if (!isOpen) return;
    const isDebug = typeof window !== 'undefined' && window.location.search.includes('debug=layout');
    if (!isDebug) return;

    const checkLayout = () => {
      if (!headerRef.current || !closeBtnRef.current) return;
      const hRect = headerRef.current.getBoundingClientRect();
      const bRect = closeBtnRef.current.getBoundingClientRect();
      const fRect = footerRef.current ? footerRef.current.getBoundingClientRect() : null;

      const isOffScreen =
        hRect.top < 0 ||
        hRect.bottom > window.innerHeight ||
        bRect.top < 0 ||
        bRect.bottom > window.innerHeight ||
        (fRect !== null && (fRect.top < 0 || fRect.bottom > window.innerHeight));

      setIsDebugLayoutError(isOffScreen);
    };

    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, [isOpen]);

  // Touch Swipe-Down to Close from Header
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    touchCurrentY.current = e.touches[0].clientY;
    const delta = touchCurrentY.current - touchStartY.current;
    if (delta > 0) {
      setDragTranslateY(Math.min(delta, 120));
    }
  };

  const handleTouchEnd = () => {
    if (touchStartY.current !== null && touchCurrentY.current !== null) {
      const delta = touchCurrentY.current - touchStartY.current;
      if (delta > 70) {
        handleRequestClose();
      }
    }
    touchStartY.current = null;
    touchCurrentY.current = null;
    setDragTranslateY(0);
  };

  if (!isOpen) return null;

  // Sizing configuration
  const sizeClasses: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
    '4xl': 'max-w-5xl',
    full: 'max-w-6xl',
  };

  const maxWClass = sizeClasses[size] || 'max-w-2xl';

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex ${
        isLandscapeMobile
          ? 'items-stretch justify-end p-0'
          : 'items-end lg:items-center justify-center p-0 lg:p-4'
      } overscroll-contain animate-in fade-in duration-150`}
      onClick={handleRequestClose}
      role="dialog"
      aria-modal="true"
      data-sheet-open="true"
      data-sheet-fullscreen={isFullScreen || size === 'full' ? 'true' : undefined}
    >
      {/* Main Sheet Container */}
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: dragTranslateY > 0 ? `translateY(${dragTranslateY}px)` : undefined,
          transition: dragTranslateY === 0 ? 'transform 0.15s ease-out' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          maxHeight: isLandscapeMobile ? '100dvh' : 'calc(100dvh - 24px)',
        }}
        className={`bg-white dark:bg-[#111c3d] text-slate-900 dark:text-slate-100 flex flex-col w-full outline-hidden overflow-hidden shadow-2xl transition-all
          ${
            isLandscapeMobile
              ? 'h-[100dvh] max-h-[100dvh] w-full max-w-[min(440px,75vw)] ml-auto rounded-l-2xl rounded-r-none border-l border-slate-200 dark:border-slate-800'
              : isMobile
              ? 'w-full max-h-[calc(100dvh-24px)] rounded-t-3xl border-t border-slate-200 dark:border-slate-800'
              : !isDesktop
              ? 'w-full max-w-2xl max-h-[calc(100dvh-24px)] rounded-t-3xl border-t border-slate-200 dark:border-slate-800'
              : `${maxWClass} max-h-[calc(100dvh-24px)] rounded-2xl border border-slate-200 dark:border-slate-800 my-auto`
          }
          ${
            isDebugLayoutError
              ? 'ring-4 ring-red-500 ring-offset-2 border-red-600'
              : ''
          }
          ${className}
        `}
      >
        {/* Visual Handle for mobile pull-down */}
        <div
          className="sm:hidden pt-2 pb-1 flex justify-center cursor-grab active:cursor-grabbing bg-slate-50 dark:bg-[#0c152e] border-b border-slate-100 dark:border-slate-800/60 shrink-0"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-hidden="true"
        >
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            ZONA 1: ENCABEZADO FIJO (Sticky, Always Visible, ≥44px Buttons)
            flex: 0 0 auto
            ═══════════════════════════════════════════════════════════════════ */}
        <header
          ref={headerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            flex: '0 0 auto',
            paddingTop: 'max(env(safe-area-inset-top, 0px), 0.5rem)',
            minHeight: isLandscapeMobile ? '48px' : '52px',
          }}
          className={`sticky top-0 z-20 ${
            isLandscapeMobile ? 'px-3 py-1.5' : 'px-4 sm:px-6 py-2.5 sm:py-3'
          } bg-white/95 dark:bg-[#111c3d]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 flex-none`}
        >
          {/* Left: Volver Button */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={handleRequestClose}
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors active:scale-95 shrink-0 flex-none"
              aria-label="Volver atrás"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {icon && <div className="shrink-0 hidden xs:flex items-center">{icon}</div>}

            {/* Title & Subtitle in 1-2 lines, never cut off */}
            <div className="flex flex-col min-w-0 pr-1">
              <h2 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                {title}
              </h2>
              {subtitle && (
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          {/* Right: Yacita Help (if requested) + Close Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {showYacitaHelp && (
              <button
                type="button"
                onClick={onYacitaHelpClick}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-semibold min-h-[44px] min-w-[44px] active:scale-95 transition-all"
                title="Ayuda de Yacita"
                aria-label="Ayuda de Yacita"
              >
                <img
                  src={yacitaIdle}
                  alt="Yacita"
                  className="w-5 h-5 object-contain"
                />
                <span className="hidden sm:inline">Ayuda</span>
              </button>
            )}

            <button
              ref={closeBtnRef}
              type="button"
              onClick={handleRequestClose}
              className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors active:scale-95 shrink-0 flex-none"
              aria-label="Cerrar panel"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Debug Banner if out of viewport */}
        {isDebugLayoutError && (
          <div className="bg-red-600 text-white px-3 py-1.5 text-xs font-bold text-center shrink-0">
            ⚠️ ERROR LAYOUT: Cabecera, X o botón del pie fuera del viewport
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ZONA 2: CUERPO DESPLAZABLE (Scrollable, Overscroll-contain, min-h-0)
            flex: 1 1 auto; min-height: 0; overflow-y: auto
            ═══════════════════════════════════════════════════════════════════ */}
        <div
          ref={bodyRef}
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
          className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${
            isLandscapeMobile
              ? 'p-3 space-y-3 pb-16'
              : 'p-4 sm:p-6 space-y-4 pb-24 lg:pb-8'
          } ${bodyClassName}`}
        >
          {children}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            ZONA 3: PIE FIJO (Sticky, Always Reachable, Safe-area Inset)
            flex: 0 0 auto
            ═══════════════════════════════════════════════════════════════════ */}
        {footer ? (
          <footer
            ref={footerRef}
            style={{
              flex: '0 0 auto',
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)',
              minHeight: isLandscapeMobile ? '52px' : '56px',
            }}
            className={`sticky bottom-0 z-20 ${
              isLandscapeMobile ? 'px-3 py-1.5' : 'px-4 sm:px-6 py-2.5 sm:py-3'
            } bg-white/95 dark:bg-[#111c3d]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shrink-0 flex-none`}
          >
            {footer}
          </footer>
        ) : (
          <footer
            ref={footerRef}
            style={{
              flex: '0 0 auto',
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)',
              minHeight: isLandscapeMobile ? '52px' : '56px',
            }}
            className={`sticky bottom-0 z-20 ${
              isLandscapeMobile ? 'px-3 py-1.5' : 'px-4 sm:px-6 py-2.5 sm:py-3'
            } bg-slate-50/95 dark:bg-[#0c152e]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-end shrink-0 flex-none`}
          >
            <button
              type="button"
              onClick={handleRequestClose}
              className="px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 min-h-[44px] min-w-[88px] transition-colors active:scale-95"
            >
              Cerrar
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};
