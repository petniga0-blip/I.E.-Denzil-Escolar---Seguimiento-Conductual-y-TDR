import React, { useState, useRef } from 'react';
import {
  Sun,
  Moon,
  Cloud,
  Download,
  Upload,
  UserCheck,
  ShieldCheck,
  GraduationCap,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  FilePlus2,
  FileSpreadsheet,
} from 'lucide-react';
import { TeacherProfile } from '../types';
import denzilLogo from '../assets/denzil.png';
import { MEMBRETE_CONFIG } from '../config/membrete';
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
  const { isLandscapeMobile, showHeader } = useMobileLayout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isInstDataExpanded, setIsInstDataExpanded] = useState(false);

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
          1. DESKTOP & TABLET INSTITUTIONAL HEADER (> 640px, non-landscape-mobile)
          ========================================================================= */}
      <header className="no-print hidden sm:block w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0f1a38]/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Institutional Membrete */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 w-full md:w-auto text-center sm:text-left">
              {/* Logo Container - Escudo Oficial exacto denzil.png */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
                <img
                  src={denzilLogo}
                  alt="Logo I.E. Denzil Escolar"
                  className="w-full h-full object-contain aspect-square drop-shadow-md"
                />
              </div>

              {/* Text Container with institutional details */}
              <div className="flex flex-col min-w-0 gap-0.5 max-w-2xl">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  República de Colombia · Distrito de Riohacha · La Guajira
                </span>
                <h1 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight text-blue-900 dark:text-blue-200 uppercase leading-snug">
                  {MEMBRETE_CONFIG.titulo}
                </h1>
                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  {`${MEMBRETE_CONFIG.linea1} · ${MEMBRETE_CONFIG.linea2} · ${MEMBRETE_CONFIG.linea3}`}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {MEMBRETE_CONFIG.lemaCompleto}
                  </span>
                  <span aria-hidden="true" className="hidden sm:inline">·</span>
                  <span>{MEMBRETE_CONFIG.pieCentroLinea1}</span>
                </div>
              </div>
            </div>

            {/* Right Action Bar: Google Auth, Backup, Theme */}
            <div className="flex items-center flex-wrap justify-center gap-2 shrink-0">
              {/* Google Profile Button */}
              <button
                onClick={onOpenGoogleModal}
                title="Cuenta Docente y Google"
                data-yacita="header_profile"
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs min-h-[44px] active:scale-95"
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
                data-yacita="header_drive_sync"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors min-h-[44px] active:scale-95"
              >
                <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Google Drive</span>
              </button>

              {/* Backup JSON Button */}
              <button
                onClick={onExportBackup}
                title="Descargar respaldo (.json)"
                data-yacita="header_backup_export"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors min-h-[44px] active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Descargar respaldo (.json)</span>
              </button>

              {/* Import Backup input button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Restaurar copia (.json)"
                data-yacita="header_backup_import"
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
              >
                <Upload className="w-4 h-4" />
              </button>

              {/* Light / Dark Mode Toggle */}
              <button
                onClick={onToggleTheme}
                title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                data-yacita="header_theme_toggle"
                className="p-2 rounded-lg text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
                aria-label="Alternar tema visual"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="mt-4 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1" aria-label="Módulos de la aplicación">
            <button
              id="nav-tab-students"
              data-yacita="nav_tab_students"
              onClick={() => onSelectTab('students')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] whitespace-nowrap active:scale-95 ${
                currentTab === 'students'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>1. Estudiantes</span>
            </button>

            <button
              id="nav-tab-matrix"
              data-yacita="nav_tab_matrix"
              onClick={() => onSelectTab('matrix')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] whitespace-nowrap active:scale-95 ${
                currentTab === 'matrix'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>2. Matriz Grupal</span>
            </button>

            <button
              id="nav-tab-abc"
              data-yacita="nav_tab_abc"
              onClick={() => onSelectTab('abc')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] whitespace-nowrap active:scale-95 ${
                currentTab === 'abc'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="font-mono text-xs px-1 rounded bg-amber-500/20 text-amber-900 dark:text-amber-300">A·B·C</span>
              <span>3. Registro y TDR</span>
            </button>

            <button
              id="nav-tab-reports"
              data-yacita="nav_tab_reports"
              onClick={() => onSelectTab('reports')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all min-h-[44px] whitespace-nowrap active:scale-95 ${
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

      {/* =========================================================================
          2. MOBILE COMPACT TOP HEADER (≤ 640px vertical & landscape)
          Height: 56–64px vertical (h-14), ~44px in landscape (h-11)
          Hides on scroll down, reappears on scroll up.
          ========================================================================= */}
      <header
        className={`no-print sm:hidden fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0f1a38]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 transition-transform duration-200 ${
          isLandscapeMobile ? 'h-11' : 'h-14'
        } ${showHeader ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="h-full flex items-center justify-between gap-2">
          {/* Logo & Short Name */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={`${isLandscapeMobile ? 'w-7 h-7' : 'w-9 h-9'} shrink-0 flex items-center justify-center`}>
              <img
                src={denzilLogo}
                alt="Escudo Denzil"
                className="w-full h-full object-contain aspect-square drop-shadow-xs"
              />
            </div>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="text-xs sm:text-sm font-black text-blue-900 dark:text-blue-200 truncate tracking-tight">
                I.E. Denzil Escolar
              </span>
              {!isLandscapeMobile && (
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold truncate">
                  Seguimiento Conductual · TDR
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions: Drive Dot Status, Theme, Menu Button */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Google Drive Status Indicator */}
            <button
              onClick={onOpenSyncModal}
              title={teacher.isGoogleConnected ? 'Google Drive: Conectado' : 'Google Drive: Modo Offline (Toca para conectar)'}
              data-yacita="mobile_drive_indicator"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] justify-center transition-colors active:scale-95"
              aria-label="Estado de Google Drive"
            >
              <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span
                className={`w-2 h-2 rounded-full ${
                  teacher.isGoogleConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
            </button>

            {/* Quick Theme Toggle */}
            <button
              onClick={onToggleTheme}
              title={isDark ? 'Modo Claro' : 'Modo Oscuro'}
              data-yacita="mobile_theme_toggle"
              className="p-2 rounded-lg text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
              aria-label="Alternar tema"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Menu Drawer Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              title="Abrir menú institucional"
              data-yacita="mobile_menu_open"
              className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
              aria-label="Abrir menú de opciones"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          3. MOBILE MENU DRAWER / BOTTOM SHEET
          Houses profile, backup/restore, and collapsible institutional data
          ========================================================================= */}
      <Sheet
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        sheetId="mobile_header_menu"
        size="md"
        title="I.E. Denzil Escolar · Menú"
        subtitle="Panel institucional móvil"
        icon={<img src={denzilLogo} alt="Logo" className="w-7 h-7 object-contain" />}
        footer={
          <div className="flex items-center justify-end w-full">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 min-h-[44px] min-w-[88px] transition-colors active:scale-95"
            >
              Cerrar Menú
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Profile & Google Auth Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {teacher.isGoogleConnected && teacher.googleAvatar ? (
                <img
                  src={teacher.googleAvatar}
                  alt={teacher.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500 shrink-0"
                />
              ) : (
                <span className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                  {teacher.name.charAt(0)}
                </span>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {teacher.name}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span className="truncate">{teacher.isGoogleConnected ? 'Cuenta Google Vinculada' : 'Modo Local / Offline'}</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenGoogleModal();
              }}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 min-h-[44px] flex items-center active:scale-95 shrink-0"
            >
              Perfil
            </button>
          </div>

          {/* Action Buttons (Backup, Restore, Sync) */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Almacenamiento y Respaldos
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSyncModal();
                }}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-semibold min-h-[48px] active:scale-95"
              >
                <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Google Drive</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onExportBackup();
                }}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold min-h-[48px] active:scale-95 text-center leading-tight"
              >
                <Download className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>Descargar respaldo (.json)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                fileInputRef.current?.click();
              }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium min-h-[44px] active:scale-95"
            >
              <Upload className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Restaurar copia (.json)</span>
            </button>
          </div>

          {/* Collapsible Institutional Data Section */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
            <button
              type="button"
              onClick={() => setIsInstDataExpanded(!isInstDataExpanded)}
              className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-700 dark:text-slate-300 min-h-[44px] active:scale-95"
            >
              <span>Datos de la Institución</span>
              {isInstDataExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isInstDataExpanded && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 animate-in fade-in duration-150">
                <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  República de Colombia · Distrito de Riohacha · La Guajira
                </div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {MEMBRETE_CONFIG.titulo}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                  {MEMBRETE_CONFIG.linea1}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                  {`${MEMBRETE_CONFIG.linea2} · ${MEMBRETE_CONFIG.linea3}`}
                </div>
                <div className="pt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {MEMBRETE_CONFIG.lemaCompleto}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                  {MEMBRETE_CONFIG.pieCentroLinea1} · {MEMBRETE_CONFIG.pieCentroLinea2}
                </div>
              </div>
            )}
          </div>
        </div>
      </Sheet>

      {/* =========================================================================
          4. MOBILE VERTICAL FIXED BOTTOM NAVIGATION BAR (≤ 640px, NOT landscape-mobile)
          All 4 tabs visible simultaneously, grid-cols-4, touch targets ≥ 48px,
          active tab clearly highlighted, safe area inset bottom.
          ========================================================================= */}
      {!isLandscapeMobile && (
        <nav
          className="no-print sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0f1a38]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe shadow-lg"
          aria-label="Navegación principal móvil"
        >
          <div className="grid grid-cols-4 items-center h-14">
            {/* Tab 1: Estudiantes */}
            <button
              onClick={() => onSelectTab('students')}
              data-yacita="nav_tab_students"
              className={`flex flex-col items-center justify-center gap-0.5 h-full transition-all min-h-[48px] active:scale-95 ${
                currentTab === 'students'
                  ? 'text-blue-900 dark:text-blue-300 font-bold bg-blue-50/80 dark:bg-blue-950/60'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }`}
            >
              <UserCheck className={`w-5 h-5 ${currentTab === 'students' ? 'text-blue-700 dark:text-blue-300' : ''}`} />
              <span className="text-[11px] leading-tight">Estudiantes</span>
            </button>

            {/* Tab 2: Matriz */}
            <button
              onClick={() => onSelectTab('matrix')}
              data-yacita="nav_tab_matrix"
              className={`flex flex-col items-center justify-center gap-0.5 h-full transition-all min-h-[48px] active:scale-95 ${
                currentTab === 'matrix'
                  ? 'text-blue-900 dark:text-blue-300 font-bold bg-blue-50/80 dark:bg-blue-950/60'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }`}
            >
              <GraduationCap className={`w-5 h-5 ${currentTab === 'matrix' ? 'text-blue-700 dark:text-blue-300' : ''}`} />
              <span className="text-[11px] leading-tight">Matriz</span>
            </button>

            {/* Tab 3: Registro y TDR */}
            <button
              onClick={() => onSelectTab('abc')}
              data-yacita="nav_tab_abc"
              className={`flex flex-col items-center justify-center gap-0.5 h-full transition-all min-h-[48px] active:scale-95 ${
                currentTab === 'abc'
                  ? 'text-amber-800 dark:text-amber-300 font-bold bg-amber-50/80 dark:bg-amber-950/60'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }`}
            >
              <FilePlus2 className={`w-5 h-5 ${currentTab === 'abc' ? 'text-amber-600 dark:text-amber-400' : ''}`} />
              <span className="text-[11px] leading-tight">Registro</span>
            </button>

            {/* Tab 4: Reportes Oficiales */}
            <button
              onClick={() => onSelectTab('reports')}
              data-yacita="nav_tab_reports"
              className={`flex flex-col items-center justify-center gap-0.5 h-full transition-all min-h-[48px] active:scale-95 ${
                currentTab === 'reports'
                  ? 'text-blue-900 dark:text-blue-300 font-bold bg-blue-50/80 dark:bg-blue-950/60'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }`}
            >
              <FileSpreadsheet className={`w-5 h-5 ${currentTab === 'reports' ? 'text-blue-700 dark:text-blue-300' : ''}`} />
              <span className="text-[11px] leading-tight">Reportes</span>
            </button>
          </div>
        </nav>
      )}

      {/* =========================================================================
          5. MOBILE LANDSCAPE LEFT NAVIGATION RAIL (height ≤ 500px && landscape)
          Width: 56–64px (w-16), vertically stacked tabs with icons and short labels.
          ========================================================================= */}
      {isLandscapeMobile && (
        <aside
          className="no-print fixed top-11 bottom-0 left-0 z-40 w-16 bg-white/95 dark:bg-[#0f1a38]/95 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-around py-2 pl-safe shadow-md"
          aria-label="Navegación lateral horizontal"
        >
          <button
            onClick={() => onSelectTab('students')}
            data-yacita="nav_tab_students"
            title="Estudiantes"
            className={`w-13 py-1.5 flex flex-col items-center justify-center rounded-xl transition-all min-h-[44px] active:scale-95 ${
              currentTab === 'students'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span className="text-[10px] font-semibold mt-0.5 leading-none">Estud.</span>
          </button>

          <button
            onClick={() => onSelectTab('matrix')}
            data-yacita="nav_tab_matrix"
            title="Matriz Grupal"
            className={`w-13 py-1.5 flex flex-col items-center justify-center rounded-xl transition-all min-h-[44px] active:scale-95 ${
              currentTab === 'matrix'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span className="text-[10px] font-semibold mt-0.5 leading-none">Matriz</span>
          </button>

          <button
            onClick={() => onSelectTab('abc')}
            data-yacita="nav_tab_abc"
            title="Registro A·B·C"
            className={`w-13 py-1.5 flex flex-col items-center justify-center rounded-xl transition-all min-h-[44px] active:scale-95 ${
              currentTab === 'abc'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FilePlus2 className="w-4 h-4" />
            <span className="text-[10px] font-semibold mt-0.5 leading-none">A·B·C</span>
          </button>

          <button
            onClick={() => onSelectTab('reports')}
            data-yacita="nav_tab_reports"
            title="Reportes Oficiales"
            className={`w-13 py-1.5 flex flex-col items-center justify-center rounded-xl transition-all min-h-[44px] active:scale-95 ${
              currentTab === 'reports'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="text-[10px] font-semibold mt-0.5 leading-none">Reportes</span>
          </button>
        </aside>
      )}
    </>
  );
};
