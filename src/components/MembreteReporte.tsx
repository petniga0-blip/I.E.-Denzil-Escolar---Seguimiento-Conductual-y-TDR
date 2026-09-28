import React from 'react';
import { ASSET_SELLO, ASSET_CAT } from '../config/assets';
import { MEMBRETE_CONFIG } from '../config/membrete';

export const MembreteCabezote: React.FC = () => {
  return (
    <header className="membrete-cabezote w-full select-none pb-2">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Sello Denzil (Izquierda, proporción original) ~28-32mm */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 shrink-0 flex items-center justify-center">
          <img
            src={ASSET_SELLO}
            alt="Sello Institución Educativa Denzil Escolar"
            className="w-full h-full object-contain aspect-square"
            loading="eager"
          />
        </div>

        {/* Bloque central de texto */}
        <div className="flex-1 text-center min-w-0 px-1">
          <h1
            style={{ color: MEMBRETE_CONFIG.colorAzulInstitucional }}
            className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight leading-tight font-sans"
          >
            {MEMBRETE_CONFIG.titulo}
          </h1>

          <div className="mt-1 space-y-0.5 font-serif font-bold text-black text-[8.5pt] sm:text-[9.5pt] leading-snug">
            <p>{MEMBRETE_CONFIG.linea1}</p>
            <p>{MEMBRETE_CONFIG.linea2}</p>
            <p>{MEMBRETE_CONFIG.linea3}</p>
          </div>
        </div>

        {/* Logo CAT (Derecha, proporción original) ~28-32mm */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 shrink-0 flex items-center justify-center">
          <img
            src={ASSET_CAT}
            alt="Logo Colegios Amigos del Turismo"
            className="w-full h-full object-contain aspect-square"
            loading="eager"
          />
        </div>
      </div>

      {/* Barra negra gruesa (~2-3 mm) con leve resplandor azul institucional */}
      <div
        style={{
          boxShadow: '0 0 6px rgba(11, 42, 107, 0.45)',
        }}
        className="w-full h-[2.5px] bg-black mt-2"
        aria-hidden="true"
      />
    </header>
  );
};

export const MembretePie: React.FC = () => {
  return (
    <footer className="membrete-pie w-full select-none pt-2">
      {/* Línea horizontal negra delgada con leve resplandor azul */}
      <div
        style={{
          boxShadow: '0 0 4px rgba(11, 42, 107, 0.35)',
        }}
        className="w-full h-[1px] bg-black mb-2"
        aria-hidden="true"
      />

      {/* Tres columnas del pie de página */}
      <div className="grid grid-cols-3 items-center gap-2 text-[8pt] sm:text-[9pt]">
        {/* Columna Izquierda: Progreso / Paz */}
        <div
          style={{ color: MEMBRETE_CONFIG.colorAzulInstitucional }}
          className="font-serif font-bold text-left leading-tight"
        >
          <p>{MEMBRETE_CONFIG.pieIzquierdo[0]}</p>
          <p>{MEMBRETE_CONFIG.pieIzquierdo[1]}</p>
        </div>

        {/* Columna Centro: Dirección, Web y Correo */}
        <div className="font-serif text-center text-black text-[7.5pt] sm:text-[8pt] leading-tight">
          <p>
            <strong className="font-bold">Riohacha – La Guajira</strong> Cra 7h No 57-44 Barrio{' '}
            <strong className="font-bold">La Mano De Dios</strong>
          </p>
          <p className="mt-0.5">
            <span>Web: </span>
            <span className="text-blue-800 underline decoration-blue-800 font-medium">
              {MEMBRETE_CONFIG.webUrl}
            </span>
            <span className="mx-1 text-slate-400">----</span>
            <span>Email: </span>
            <span className="text-blue-800 underline decoration-blue-800 font-medium">
              {MEMBRETE_CONFIG.emailRector}
            </span>
          </p>
        </div>

        {/* Columna Derecha: Sabiduría / Cultura */}
        <div
          style={{ color: MEMBRETE_CONFIG.colorAzulInstitucional }}
          className="font-serif font-bold text-right leading-tight"
        >
          <p>{MEMBRETE_CONFIG.pieDerecho[0]}</p>
          <p>{MEMBRETE_CONFIG.pieDerecho[1]}</p>
        </div>
      </div>
    </footer>
  );
};

export interface MembreteReporteProps {
  children?: React.ReactNode;
  className?: string;
  showCabezote?: boolean;
  showPie?: boolean;
}

export const MembreteReporte: React.FC<MembreteReporteProps> = ({
  children,
  className = '',
  showCabezote = true,
  showPie = true,
}) => {
  return (
    <div className={`membrete-document-wrapper w-full ${className}`}>
      {/* Table-based print pagination ensures cabezote and pie repeat on every print page */}
      <table className="w-full border-collapse">
        {showCabezote && (
          <thead className="print-header-group table-header-group">
            <tr>
              <th className="font-normal text-left p-0 border-none bg-transparent">
                <MembreteCabezote />
              </th>
            </tr>
          </thead>
        )}
        <tbody className="print-body-group table-row-group">
          <tr>
            <td className="p-0 border-none bg-transparent align-top">
              {children}
            </td>
          </tr>
        </tbody>
        {showPie && (
          <tfoot className="print-footer-group table-footer-group">
            <tr>
              <td className="font-normal text-left p-0 border-none bg-transparent align-bottom pt-4">
                <MembretePie />
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default MembreteReporte;
