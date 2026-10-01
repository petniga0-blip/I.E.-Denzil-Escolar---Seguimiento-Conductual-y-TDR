import React from 'react';
import { Student, DailyCriterionScore, ABCIncident, TeacherProfile } from '../types';
import { ASSET_SELLO } from '../config/assets';

export interface FichaCuadernoProps {
  student: Student;
  score?: DailyCriterionScore;
  incident?: ABCIncident;
  teacher: TeacherProfile;
  dateStr: string;
  parentSummary?: string;
}

const renderStars = (level?: number) => {
  const val = level ?? 3;
  if (val === 3) return '★★★ (3★)';
  if (val === 2) return '★★☆ (2★)';
  if (val === 1) return '★☆☆ (1★)';
  return '★★★ (3★)';
};

// Componente para una ficha individual
const FichaItem: React.FC<{
  student: Student;
  score?: DailyCriterionScore;
  incident?: ABCIncident;
  teacher: TeacherProfile;
  dateStr: string;
  parentSummary?: string;
  fichaIndex: number;
}> = ({ student, score, incident, teacher, dateStr, parentSummary, fichaIndex }) => {
  const observationText =
    score?.notes ||
    (incident?.observedBehaviors && incident.observedBehaviors.length > 0
      ? incident.observedBehaviors.join(', ') + (incident.otherBehaviorDetail ? ` (${incident.otherBehaviorDetail})` : '')
      : parentSummary ||
        'El estudiante mantuvo una actitud constructiva y cumplió con los acuerdos de convivencia en la jornada escolar.');

  const regulatoryText =
    incident?.regulatoryActions && incident.regulatoryActions.length > 0
      ? incident.regulatoryActions.join(', ')
      : incident?.restorativeAgreement ||
        'Diálogo formativo reflexivo, autorregulación guiada y fortalecimiento de vínculos de respeto en el aula.';

  return (
    <div
      className="print-ficha flex flex-col justify-between"
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      {/* Membrete compacto: Sello 35px + Título Arial 10 bold */}
      <div className="flex items-center gap-2.5 border-b border-slate-300 pb-1 mb-1.5">
        <img
          src={ASSET_SELLO}
          alt="Sello Denzil"
          loading="lazy"
          decoding="async"
          className="w-[35px] h-[35px] object-contain shrink-0"
          style={{ width: '35px', height: '35px' }}
        />
        <div className="min-w-0 flex-1 leading-tight">
          <h4
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            className="text-[10pt] font-bold uppercase tracking-tight text-black m-0"
          >
            INSTITUCIÓN EDUCATIVA DENZIL ESCOLAR
          </h4>
          <p
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            className="text-[8.5pt] font-semibold text-slate-800 m-0"
          >
            Tarjeta Diaria de Reporte (TDR) · Registro Formativo para el Cuaderno
          </p>
        </div>
        <div className="text-right text-[8pt] text-slate-600 shrink-0 font-mono hidden xs:block">
          <span className="block font-semibold">Copia #{fichaIndex}</span>
          <span className="text-[7pt] text-slate-500">DANE: 144001002844</span>
        </div>
      </div>

      {/* Datos del alumno: Nombre, Grado, Fecha, Jornada */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-50 border border-slate-300 rounded text-[8.5pt] leading-tight mb-1.5">
        <div className="truncate">
          <strong className="text-slate-800">Estudiante: </strong>
          <span className="font-bold text-black uppercase">{student.fullName}</span>
        </div>
        <div>
          <strong className="text-slate-800">Grado: </strong>
          <span className="font-semibold text-black">{student.grade}</span>
        </div>
        <div>
          <strong className="text-slate-800">Fecha: </strong>
          <span className="font-semibold text-black">{dateStr}</span>
        </div>
        <div>
          <strong className="text-slate-800">Jornada: </strong>
          <span className="font-semibold text-black">{student.shift}</span>
        </div>
      </div>

      {/* 4 Metas formativas con estrellas */}
      <div className="mb-1.5">
        <div className="flex items-center justify-between text-[8.5pt] font-bold text-black uppercase mb-0.5">
          <span>Metas Formativas del Día:</span>
          <span className="text-[7.5pt] font-normal text-slate-600">
            Escala: 3★ Logrado · 2★ En proceso · 1★ Apoyo
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[8pt]">
          <div className="border border-slate-300 rounded px-1.5 py-0.5 bg-white flex items-center justify-between">
            <span className="truncate pr-1">
              <strong>1.</strong> Turnos y Escucha:
            </span>
            <span className="font-bold text-black shrink-0 tracking-wider">
              {renderStars(score?.c1)}
            </span>
          </div>
          <div className="border border-slate-300 rounded px-1.5 py-0.5 bg-white flex items-center justify-between">
            <span className="truncate pr-1">
              <strong>2.</strong> Permanencia:
            </span>
            <span className="font-bold text-black shrink-0 tracking-wider">
              {renderStars(score?.c2)}
            </span>
          </div>
          <div className="border border-slate-300 rounded px-1.5 py-0.5 bg-white flex items-center justify-between">
            <span className="truncate pr-1">
              <strong>3.</strong> Instrucciones:
            </span>
            <span className="font-bold text-black shrink-0 tracking-wider">
              {renderStars(score?.c3)}
            </span>
          </div>
          <div className="border border-slate-300 rounded px-1.5 py-0.5 bg-white flex items-center justify-between">
            <span className="truncate pr-1">
              <strong>4.</strong> Materiales:
            </span>
            <span className="font-bold text-black shrink-0 tracking-wider">
              {renderStars(score?.c4)}
            </span>
          </div>
        </div>
      </div>

      {/* Observación formativa y Estrategia reguladora */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mb-1.5 text-[8pt] leading-tight">
        <div className="border border-slate-300 rounded p-1.5 bg-white">
          <strong className="block text-black uppercase text-[7.5pt]">
            Observación Formativa:
          </strong>
          <p className="text-slate-900 mt-0.5 line-clamp-2">
            {observationText}
          </p>
        </div>
        <div className="border border-slate-300 rounded p-1.5 bg-white">
          <strong className="block text-black uppercase text-[7.5pt]">
            Estrategia Reguladora / Compromiso:
          </strong>
          <p className="text-slate-900 mt-0.5 line-clamp-2">
            {regulatoryText}
          </p>
        </div>
      </div>

      {/* Dos líneas de firma: Docente/Orientador y Acudiente/Compromiso en casa */}
      <div className="grid grid-cols-2 gap-6 pt-2 mt-auto text-center text-[7.5pt] leading-tight">
        <div className="flex flex-col items-center">
          <div className="w-full border-t border-black mb-0.5"></div>
          <strong className="block text-black text-[8pt] truncate max-w-full">
            {teacher.name}
          </strong>
          <span className="text-slate-700 italic">Docente / Orientador</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-full border-t border-black mb-0.5"></div>
          <strong className="block text-black text-[8pt] truncate max-w-full">
            {student.guardianName || 'Acudiente'}
          </strong>
          <span className="text-slate-700 italic">Acudiente / Compromiso en casa</span>
        </div>
      </div>
    </div>
  );
};

export const FichaCuaderno: React.FC<FichaCuadernoProps> = ({
  student,
  score,
  incident,
  teacher,
  dateStr,
  parentSummary,
}) => {
  return (
    <div className="print-ficha-wrapper w-full">
      {/* Ficha 1: Cuaderno escolar (primera copia) */}
      <FichaItem
        student={student}
        score={score}
        incident={incident}
        teacher={teacher}
        dateStr={dateStr}
        parentSummary={parentSummary}
        fichaIndex={1}
      />

      {/* Línea punteada de corte */}
      <div className="print-cut-line">
        <span className="tracking-widest font-mono">
          ✂ - - - - - - - - - - - - Línea punteada de corte para pegar en el cuaderno - - - - - - - - - - - - ✂
        </span>
      </div>

      {/* Ficha 2: Cuaderno escolar (segunda copia idéntica) */}
      <FichaItem
        student={student}
        score={score}
        incident={incident}
        teacher={teacher}
        dateStr={dateStr}
        parentSummary={parentSummary}
        fichaIndex={2}
      />
    </div>
  );
};

export default FichaCuaderno;
