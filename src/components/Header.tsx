import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Sun,
  Moon,
  Cloud,
  Download,
  Upload,
  UserCheck,
  ShieldCheck,
  GraduationCap,
  FilePlus2,
  FileSpreadsheet,
  Menu,
} from 'lucide-react';
import { TeacherProfile } from '../types';
import denzilLogo from '../assets/denzil.png';
import { useMobileLayout } from '../utils/useMobileLayout';
import { Sheet } from './Sheet';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const { isLandscapeMobile } = useMobileLayout();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Network online/offline status
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const driveStatus = useMemo<'en línea' | 'sin conexión' | 'pendiente'>(() => {
    if (!isOnline) return 'sin conexión';
    if (teacher.isGoogleConnected) return 'en línea';
    return 'pendiente';
  }, [isOnline, teacher.isGoogleConnected]);

  // Lateral shadow state for horizontal scroll indicator in tabs row
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  const checkTabsScroll = useCallback(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    if (!hasOverflow) {
      setShowLeftShadow(false);
      setShowRightShadow(false);
      return;
    }
    setShowLeftShadow(el.scrollLeft > 4);
    setShowRightShadow(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkTabsScroll();
    const handleResize = () => checkTabsScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkTabsScroll, currentTab]);

  return (
    <>
      {/* Hidden file input for backup restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onImportBackup}
        accept=".json"
        className="hidden"
      />

      {/* =========================================================================
          1. HEADER DE ESCRITORIO / TABLET VERTICAL (hidden sm:block)
          - Se oculta completamente cuando isLandscapeMobile es true.
          - 56px estándar (h-14).
          ========================================================================= */}
      {!isLandscapeMobile && (
        <header className="no-print hidden sm:block sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0f1a38]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-2xs h-14">
          <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
            {/* Left: Sello + Nombre corto */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 flex items-center justify-center">
                <img
                  src={denzilLogo}
                  alt="Sello I.E. Denzil Escolar"
                  decoding="async"
                  className="w-full h-full object-contain aspect-square drop-shadow-xs"
                />
              </div>
              <span className="font-black text-blue-900 dark:text-blue-200 tracking-tight truncate leading-tight text-xs sm:text-sm md:text-base">
                I.E. Denzil Escolar
              </span>
            </div>

            {/* Right Action Bar: Cuenta Google, Drive, Respaldar, Restaurar, Tema */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* 1. Cuenta Google */}
              <button
                type="button"
                onClick={onOpenGoogleModal}
                title="Cuenta Docente y Google"
                data-yacita="header_profile"
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs min-h-[44px] active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden"
                aria-label="Perfil y cuenta Google"
              >
                {teacher.isGoogleConnected && teacher.googleAvatar ? (
                  <img
                    src={teacher.googleAvatar}
                    alt={teacher.name}
                    loading="lazy"
                    decoding="async"
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover ring-1 ring-emerald-500 shrink-0"
                  />
                ) : (
                  <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {teacher.name.charAt(0)}
                  </span>
                )}
                <div className="hidden lg:flex flex-col text-left leading-tight">
                  <span className="text-xs font-semibold truncate max-w-[110px]">{teacher.name}</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    {teacher.isGoogleConnected ? 'Google Conectado' : 'Modo Offline'}
                  </span>
                </div>
              </button>

              {/* 2. Drive */}
              <button
                type="button"
                onClick={onOpenSyncModal}
                title={`Google Drive: ${driveStatus}`}
                data-yacita="header_drive_sync"
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors min-h-[44px] active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden"
                aria-label={`Sincronización con Google Drive: ${driveStatus}`}
              >
                <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="hidden sm:inline font-semibold">Drive</span>
                <span className="inline-flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      driveStatus === 'en línea'
                        ? 'bg-emerald-500 animate-pulse'
                        : driveStatus === 'pendiente'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="hidden md:inline text-xs capitalize text-slate-700 dark:text-slate-300">
                    {driveStatus}
                  </span>
                </span>
              </button>

              {/* 3. Respaldar */}
              <button
                type="button"
                onClick={onExportBackup}
                title="Descargar respaldo (.json)"
                data-yacita="header_backup_export"
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors min-h-[44px] active:scale-95"
                aria-label="Descargar respaldo de datos en formato json"
              >
                <Download className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="hidden md:inline">Respaldar</span>
              </button>

              {/* 4. Restaurar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Restaurar copia (.json)"
                data-yacita="header_backup_import"
                className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
                aria-label="Restaurar copia de seguridad en formato json"
              >
                <Upload className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              </button>

              {/* 5. Tema */}
              <button
                type="button"
                onClick={onToggleTheme}
                title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                data-yacita="header_theme_toggle"
                className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
                aria-label="Alternar tema visual"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* =========================================================================
          PESTAÑAS DE ESCRITORIO EN UNA SOLA FILA
          - Solo se renderizan cuando !isLandscapeMobile.
          - Se ocultan en móvil mediante hidden sm:block.
          ========================================================================= */}
      {!isLandscapeMobile && (
        <div className="no-print hidden sm:block sticky top-14 z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-[#0c152e]/95 backdrop-blur-md transition-colors shadow-xs">
          <div className="relative max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 flex items-center">
            <div
              className={`pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-slate-50 via-slate-50/90 dark:from-[#0c152e] dark:via-[#0c152e]/90 to-transparent z-10 transition-opacity duration-200 ${
                showLeftShadow ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden="true"
            />
            <nav
              ref={tabsContainerRef}
              onScroll={checkTabsScroll}
              className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1.5 w-full whitespace-nowrap"
              aria-label="Módulos de la aplicación"
            >
              <button
                type="button"
                id="nav-tab-students"
                data-yacita="nav_tab_students"
                onClick={() => onSelectTab('students')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] whitespace-nowrap active:scale-95 shrink-0 ${
                  currentTab === 'students'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>1. Estudiantes</span>
              </button>

              <button
                type="button"
                id="nav-tab-matrix"
                data-yacita="nav_tab_matrix"
                onClick={() => onSelectTab('matrix')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] whitespace-nowrap active:scale-95 shrink-0 ${
                  currentTab === 'matrix'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>2. Matriz Grupal</span>
              </button>

              <button
                type="button"
                id="nav-tab-abc"
                data-yacita="nav_tab_abc"
                onClick={() => onSelectTab('abc')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] whitespace-nowrap active:scale-95 shrink-0 ${
                  currentTab === 'abc'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <FilePlus2 className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
                <span>3. Registro y TDR</span>
              </button>

              <button
                type="button"
                id="nav-tab-reports"
                data-yacita="nav_tab_reports"
                onClick={() => onSelectTab('reports')}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] whitespace-nowrap active:scale-95 shrink-0 ${
                  currentTab === 'reports'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>4. Reportes Oficiales</span>
              </button>
            </nav>
            <div
              className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-slate-50 via-slate-50/90 dark:from-[#0c152e] dark:via-[#0c152e]/90 to-transparent z-10 transition-opacity duration-200 ${
                showRightShadow ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          2. HEADER COMPACTO MÓVIL (vertical: h-14, horizontal: h-11 / 44px)
          - En vertical (w <= 640px): visible mediante sm:hidden.
          - En horizontal (isLandscapeMobile): se muestra SIEMPRE (aunque w >= 640px).
          - La clase "sm:hidden" solo se aplica cuando isLandscapeMobile es false.
          - Contiene: Sello oficial, nombre corto, Drive, tema, menú hamburguesa.
          ========================================================================= */}
      <header
        className={`no-print ${
          isLandscapeMobile ? 'block' : 'sm:hidden'
        } sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0f1a38]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-2xs ${
          isLandscapeMobile ? 'h-11' : 'h-14'
        }`}
      >
        <div className="max-w-7xl mx-auto h-full px-3 flex items-center justify-between gap-2">
          {/* Left: Sello oficial PNG + Nombre corto */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <div
              className={`shrink-0 flex items-center justify-center ${
                isLandscapeMobile ? 'w-7 h-7' : 'w-8 h-8'
              }`}
            >
              <img
                src={denzilLogo}
                alt="Sello I.E. Denzil Escolar"
                decoding="async"
                className="w-full h-full object-contain aspect-square drop-shadow-xs"
              />
            </div>
            <span
              className={`font-black text-blue-900 dark:text-blue-200 tracking-tight truncate leading-tight ${
                isLandscapeMobile ? 'text-xs sm:text-sm' : 'text-xs sm:text-sm'
              }`}
            >
              I.E. Denzil Escolar
            </span>
          </div>

          {/* Right Action Bar Móvil: Drive, Tema, Menú */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Drive */}
            <button
              type="button"
              onClick={onOpenSyncModal}
              title={`Google Drive: ${driveStatus}`}
              data-yacita="header_drive_sync"
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors min-h-[44px] min-w-[44px] justify-center active:scale-95"
              aria-label={`Sincronización con Google Drive: ${driveStatus}`}
            >
              <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  driveStatus === 'en línea'
                    ? 'bg-emerald-500 animate-pulse'
                    : driveStatus === 'pendiente'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                aria-hidden="true"
              />
            </button>

            {/* Alternar Tema */}
            <button
              type="button"
              onClick={onToggleTheme}
              title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              data-yacita="header_theme_toggle"
              className="p-1.5 rounded-lg text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
              aria-label="Alternar tema visual"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Menú Drawer (Hamburguesa) */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              title="Menú institucional"
              data-yacita="header_menu"
              className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
              aria-label="Abrir menú de opciones institucionales"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          3. RIEL LATERAL (aside, isLandscapeMobile)
          - Única navegación en horizontal móvil (h <= 500 && w > h).
          - Queda debajo del header compacto (top-11, 44px) sin tapar el sello ni el título.
          ========================================================================= */}
      {isLandscapeMobile && (
        <aside
          className="no-print fixed top-11 bottom-0 left-0 z-30 w-16 bg-white/95 dark:bg-[#0f1a38]/95 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-around py-2 pl-safe shadow-md"
          aria-label="Navegación lateral horizontal"
        >
          <button
            type="button"
            onClick={() => onSelectTab('students')}
            data-yacita="nav_tab_students"
            title="Estudiantes"
            className={`w-13 py-1 flex flex-col items-center justify-center rounded-xl transition-all min-h-[44px] active:scale-95 ${
              currentTab === 'students'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span className="text-xs font-semibold mt-0.5 leading-none">Estud.</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('matrix')}
            data-yacita="nav_tab_matrix"
            title="Matriz Grupal"
            className={`w-13 py-1 flex flex-col items-center justify-center rounded-xl transition-all min-h-[44px] active:scale-95 ${
              currentTab === 'matrix'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span className="text-xs font-semibold mt-0.5 leading-none">Matriz</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('abc')}
            data-yacita="nav_tab_abc"
            title="Registro A·B·C"
            className={`w-13 py-1 flex flex-col items-center justify-center rounded-xl transition-all min-h-[44px] active:scale-95 ${
              currentTab === 'abc'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FilePlus2 className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-semibold mt-0.5 leading-none">A·B·C</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('reports')}
            data-yacita="nav_tab_reports"
            title="Reportes Oficiales"
            className={`w-13 py-1 flex flex-col items-center justify-center rounded-xl transition-all min-h-[44px] active:scale-95 ${
              currentTab === 'reports'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="text-xs font-semibold mt-0.5 leading-none">Reportes</span>
          </button>
        </aside>
      )}

      {/* =========================================================================
          4. MENÚ DRAWER (HAMBURGUESA) CON <Sheet />
          - Contiene únicamente opciones institucionales.
          - No repite las 4 pestañas en horizontal ni en vertical.
          ========================================================================= */}
      <Sheet
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        title="Opciones Institucionales"
        subtitle="I.E. Denzil Escolar · Sede Principal"
        size="sm"
        sheetId="header-menu-drawer"
      >
        <div className="flex flex-col gap-3 p-1">
          {/* Perfil Docente y Cuenta Google */}
          <button
            type="button"
            data-yacita="header_profile"
            onClick={() => {
              setIsMenuOpen(false);
              onOpenGoogleModal();
            }}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors min-h-[44px]"
          >
            {teacher.isGoogleConnected && teacher.googleAvatar ? (
              <img
                src={teacher.googleAvatar}
                alt={teacher.name}
                loading="lazy"
                decoding="async"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500 shrink-0"
              />
            ) : (
              <span className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-base shrink-0">
                {teacher.name.charAt(0)}
              </span>
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                {teacher.name}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {teacher.email || 'Docente de Aula'}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
                <ShieldCheck className="w-3 h-3" />
                {teacher.isGoogleConnected ? 'Cuenta Google vinculada' : 'Modo Almacenamiento Local'}
              </span>
            </div>
          </button>

          {/* Sincronización Google Drive */}
          <button
            type="button"
            data-yacita="header_drive_sync"
            onClick={() => {
              setIsMenuOpen(false);
              onOpenSyncModal();
            }}
            className="flex items-center justify-between p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 text-left transition-colors min-h-[44px]"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                <Cloud className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Google Drive
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  Estado: {driveStatus}
                </span>
              </div>
            </div>
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                driveStatus === 'en línea'
                  ? 'bg-emerald-500 animate-pulse'
                  : driveStatus === 'pendiente'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              aria-hidden="true"
            />
          </button>

          {/* Descargar Respaldo JSON */}
          <button
            type="button"
            data-yacita="header_backup_export"
            onClick={() => {
              setIsMenuOpen(false);
              onExportBackup();
            }}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors min-h-[44px]"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Descargar Respaldo (.json)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Copia local de seguridad completa
              </span>
            </div>
          </button>

          {/* Restaurar Respaldo JSON */}
          <button
            type="button"
            data-yacita="header_backup_import"
            onClick={() => {
              setIsMenuOpen(false);
              fileInputRef.current?.click();
            }}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors min-h-[44px]"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Restaurar Respaldo (.json)
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Cargar archivo previo de datos
              </span>
            </div>
          </button>
        </div>
      </Sheet>

      {/* =========================================================================
          5. BARRA INFERIOR MÓVIL VERTICAL (sm:hidden fixed bottom-0)
          - Solo se renderiza cuando !isLandscapeMobile.
          - Se oculta con ancho >= 640px gracias a sm:hidden.
          - Nunca aparece en móvil horizontal.
          ========================================================================= */}
      {!isLandscapeMobile && (
        <nav
          className="sm:hidden no-print fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0f1a38]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 py-1 shadow-lg pb-safe"
          aria-label="Navegación inferior móvil"
        >
          <button
            type="button"
            onClick={() => onSelectTab('students')}
            data-yacita="nav_tab_students"
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-h-[44px] min-w-[44px] active:scale-95 ${
              currentTab === 'students'
                ? 'text-blue-900 dark:text-blue-300 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <UserCheck className={`w-5 h-5 ${currentTab === 'students' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] mt-0.5 leading-none">Estudiantes</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('matrix')}
            data-yacita="nav_tab_matrix"
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-h-[44px] min-w-[44px] active:scale-95 ${
              currentTab === 'matrix'
                ? 'text-blue-900 dark:text-blue-300 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <GraduationCap className={`w-5 h-5 ${currentTab === 'matrix' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] mt-0.5 leading-none">Matriz</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('abc')}
            data-yacita="nav_tab_abc"
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-h-[44px] min-w-[44px] active:scale-95 ${
              currentTab === 'abc'
                ? 'text-blue-900 dark:text-blue-300 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <FilePlus2 className={`w-5 h-5 ${currentTab === 'abc' ? 'stroke-[2.5] text-amber-500' : 'text-amber-500/70'}`} />
            <span className="text-[11px] mt-0.5 leading-none">Registro</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('reports')}
            data-yacita="nav_tab_reports"
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-h-[44px] min-w-[44px] active:scale-95 ${
              currentTab === 'reports'
                ? 'text-blue-900 dark:text-blue-300 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <FileSpreadsheet className={`w-5 h-5 ${currentTab === 'reports' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px] mt-0.5 leading-none">Reportes</span>
          </button>
        </nav>
      )}
    </>
  );
};
