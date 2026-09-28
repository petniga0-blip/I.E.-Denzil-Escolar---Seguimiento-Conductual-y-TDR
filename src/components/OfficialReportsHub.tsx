import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Cloud,
  CheckCircle,
  Calendar,
  User,
  Search,
  Eye,
  FileCheck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  Student,
  ABCIncident,
  DailyCriterionScore,
  CRITERIA_DEFINITIONS,
  TeacherProfile,
} from '../types';
import { downloadDocxFile, generateOfficialDocxBlob } from '../utils/docxExport';
import { generateParentSummaryWithYacita } from '../utils/yacitaAI';
import { generateOfficialPDF } from '../utils/pdfExport';
import MembreteReporte from './MembreteReporte';

interface OfficialReportsHubProps {
  students: Student[];
  incidents: ABCIncident[];
  scores: DailyCriterionScore[];
  teacher: TeacherProfile;
  onSyncDrive: () => void;
}

export const OfficialReportsHub: React.FC<OfficialReportsHubProps> = ({
  students,
  incidents,
  scores,
  teacher,
  onSyncDrive,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students.length > 0 ? students[0].id : ''
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('ninguno');
  const [isDownloadingWord, setIsDownloadingWord] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string>('');
  const [parentSummary, setParentSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);

  const handleGenerateParentSummary = async () => {
    if (!currentStudent) return;
    setIsGeneratingSummary(true);
    try {
      const summary = await generateParentSummaryWithYacita({
        studentName: currentStudent.fullName,
        scores: currentDailyScore
          ? {
              c1: currentDailyScore.c1,
              c2: currentDailyScore.c2,
              c3: currentDailyScore.c3,
              c4: currentDailyScore.c4,
            }
          : undefined,
        incidentDescription: currentIncident
          ? `${currentIncident.trigger}. ${currentIncident.observedBehaviors?.join(', ')}. ${currentIncident.otherBehaviorDetail || ''}`
          : undefined,
        commitments: currentIncident?.restorativeAgreement,
      });
      setParentSummary(summary);
      setSuccessBanner('¡Informe formativo para la familia generado por Yacita!');
      setTimeout(() => setSuccessBanner(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const currentStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);

  // Find daily score for this student and date
  const currentDailyScore = useMemo(() => {
    if (!currentStudent) return undefined;
    return scores.find(
      (sc) => sc.studentId === currentStudent.id && sc.date === selectedDate
    );
  }, [scores, currentStudent, selectedDate]);

  // Incidents for this student
  const studentIncidents = useMemo(() => {
    if (!currentStudent) return [];
    return incidents.filter((inc) => inc.studentId === currentStudent.id);
  }, [incidents, currentStudent]);

  // Currently selected incident
  const currentIncident = useMemo(() => {
    if (selectedIncidentId !== 'ninguno') {
      return incidents.find((inc) => inc.id === selectedIncidentId);
    }
    // Or if there is an incident on that date for this student
    return studentIncidents.find((inc) => inc.date === selectedDate);
  }, [incidents, selectedIncidentId, studentIncidents, selectedDate]);

  const handleDownloadWord = async () => {
    if (!currentStudent) return;
    try {
      setIsDownloadingWord(true);
      await downloadDocxFile({
        student: currentStudent,
        incident: currentIncident,
        dailyScore: currentDailyScore,
        teacherName: teacher.name,
        customDate: selectedDate,
        parentSummary,
      });
      setSuccessBanner('¡Archivo Word (.docx) descargado en tamaño Carta con membrete oficial!');
      setTimeout(() => setSuccessBanner(''), 4000);
    } catch (err) {
      console.error(err);
      alert('Error al generar el archivo Word.');
    } finally {
      setIsDownloadingWord(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!currentStudent) return;
    try {
      setIsExportingPDF(true);
      const pdf = await generateOfficialPDF({
        student: currentStudent,
        incident: currentIncident,
        dailyScore: currentDailyScore,
        teacher,
        parentSummary,
        reportDate: selectedDate,
      });
      const filename = `TDR_DenzilEscolar_${currentStudent.fullName.replace(/\s+/g, '_')}_${selectedDate}.pdf`;
      pdf.save(filename);
      setSuccessBanner('¡Documento PDF oficial descargado con éxito!');
      setTimeout(() => setSuccessBanner(''), 3500);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al generar el PDF oficial.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const scoreDescription = (score?: number) => {
    if (score === 3) return 'Logrado [✓✓✓] (3★) - Autorregulación adecuada';
    if (score === 2) return 'En Proceso [~~] (2★) - Requiere pauta o recordatorio';
    if (score === 1) return 'Requiere Acompañamiento [!] (1★) - Desregulación o resistencia';
    return 'No Evaluado en esta fecha';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Generation Controls */}
      <div className="no-print bg-white dark:bg-[#131f42] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Generación de Documentos Formales Oficiales
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
              Tarjeta Diaria de Reporte (TDR) y Seguimiento Conductual
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formato Carta Vertical (Letter Portrait: 21.59 cm x 27.94 cm) con tipografía Arial 12 y membrete institucional 2026.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Yacita AI Parent Report Generator */}
            <button
              onClick={handleGenerateParentSummary}
              disabled={isGeneratingSummary}
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white transition-colors shadow-xs min-h-[44px]"
              title="Redactar un informe empático y propositivo para la familia con Yacita"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{isGeneratingSummary ? 'Redactando...' : '🪄 Redactar informe para acudiente con Yacita'}</span>
            </button>

            {/* Direct Official PDF Download */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-xs min-h-[44px]"
              title="Descargar documento PDF oficial tamaño Carta con membrete institucional"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPDF ? 'Generando PDF...' : 'Descargar PDF Oficial'}</span>
            </button>

            <button
              onClick={handleDownloadWord}
              disabled={isDownloadingWord}
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition-colors shadow-xs min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingWord ? 'Generando...' : '📥 Descargar en Word (.docx)'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg bg-slate-700 hover:bg-slate-800 text-white transition-colors shadow-xs min-h-[44px]"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onSyncDrive}
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs min-h-[44px]"
            >
              <Cloud className="w-4 h-4" />
              <span>☁️ Guardar en Google Drive</span>
            </button>
          </div>
        </div>

        {successBanner && (
          <div className="p-3 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Seleccionar Estudiante:
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                setSelectedIncidentId('ninguno');
              }}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[44px]"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.grade} - {s.shift})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Fecha de la Evaluación / Reporte:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Incidencia A-B-C a Incluir:
            </label>
            <select
              value={selectedIncidentId}
              onChange={(e) => setSelectedIncidentId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-[44px]"
            >
              <option value="ninguno">Auto (Por fecha o informe regular sin incidente)</option>
              {studentIncidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  {inc.date} ({inc.time}) - {inc.subject}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* DOCUMENT PREVIEW CONTAINER - STRICT LETTER SIZE & TYPOGRAPHY */}
      <div className="flex justify-center w-full overflow-x-auto pb-8">
        <div
          className="print-container bg-white text-black w-full max-w-[800px] min-h-[1050px] p-8 sm:p-10 shadow-lg border border-slate-300 rounded-lg sm:rounded-none"
          style={{
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '12pt',
            lineHeight: '1.15',
            backgroundColor: '#ffffff',
            color: '#000000',
          }}
        >
          <MembreteReporte>
            {/* Título Oficial del Reporte */}
            <div className="text-center my-3 pb-2 border-b border-slate-300">
              <h2 className="text-[12pt] font-bold uppercase text-black tracking-wide font-sans">
                REGISTRO DE SEGUIMIENTO Y TARJETA DIARIA CONDUCTUAL (TDR)
              </h2>
              <p className="text-[9.5pt] italic text-slate-700 font-serif">
                Modelo Pedagógico Formativo A-B-C y Sistema de Justicia Restaurativa Escolar
              </p>
            </div>

          {/* 1. IDENTIFICACIÓN DEL ESTUDIANTE */}
          <div className="mb-4">
            <h3 className="print-section-title text-[12pt] font-bold uppercase text-black border-b border-black pb-1 mb-2">
              1. IDENTIFICACIÓN DEL ESTUDIANTE
            </h3>
            {currentStudent ? (
              <table className="print-table w-full border-collapse text-[10.5pt]">
                <tbody>
                  <tr>
                    <td className="border border-black p-1.5 w-1/2">
                      <strong>Nombre del Estudiante:</strong> {currentStudent.fullName}
                    </td>
                    <td className="border border-black p-1.5 w-1/2">
                      <strong>Grado / Grupo:</strong> {currentStudent.grade}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5">
                      <strong>Jornada:</strong> {currentStudent.shift}
                    </td>
                    <td className="border border-black p-1.5">
                      <strong>Fecha de Reporte:</strong> {selectedDate}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5">
                      <strong>Acudiente Responsable:</strong> {currentStudent.guardianName} (Tel: {currentStudent.contactPhone || 'N/A'})
                    </td>
                    <td className="border border-black p-1.5">
                      <strong>Docente Responsable:</strong> {teacher.name}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5" colSpan={2}>
                      <strong>Sede Educativa:</strong> {teacher.sede}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5" colSpan={2}>
                      <strong>Observación Médica / Sensorial:</strong>{' '}
                      {currentStudent.medicalSensoryNotes || 'Sin novedades médicas o sensoriales reportadas.'}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-500">Seleccione un estudiante.</p>
            )}
          </div>

          {/* MATRIZ DE CRITERIOS DIARIOS */}
          <div className="mb-4">
            <h4 className="text-[11pt] font-bold uppercase text-slate-900 mb-1.5">
              Seguimiento de Criterios Formativos del Día:
            </h4>
            <table className="print-table w-full border-collapse text-[10pt]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-black p-1.5 text-left w-2/3">Criterio Pedagógico Observado</th>
                  <th className="border border-black p-1.5 text-left w-1/3">Valoración del Día</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1.5">1. {CRITERIA_DEFINITIONS[0].title}</td>
                  <td className="border border-black p-1.5">{scoreDescription(currentDailyScore?.c1)}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">2. {CRITERIA_DEFINITIONS[1].title}</td>
                  <td className="border border-black p-1.5">{scoreDescription(currentDailyScore?.c2)}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">3. {CRITERIA_DEFINITIONS[2].title}</td>
                  <td className="border border-black p-1.5">{scoreDescription(currentDailyScore?.c3)}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1.5">4. {CRITERIA_DEFINITIONS[3].title}</td>
                  <td className="border border-black p-1.5">{scoreDescription(currentDailyScore?.c4)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2. REGISTRO FORMATIVO A-B-C */}
          <div className="mb-4">
            <h3 className="print-section-title text-[12pt] font-bold uppercase text-black border-b border-black pb-1 mb-2">
              2. REGISTRO FORMATIVO A-B-C
            </h3>
            
            <div className="space-y-2 text-[11pt]">
              <p>
                <strong>[A] Antecedente / Meta Esperada:</strong>{' '}
                {currentIncident?.expectedBehavior || 'Permanecer atento en clase y completar las tareas escolares.'}{' '}
                {currentIncident && (
                  <span className="font-semibold text-slate-800">
                    (Nivel de logro en la meta: {currentIncident.expectedBehaviorStars} de 5 estrellas)
                  </span>
                )}
              </p>
              <p>
                <strong>Detonante Identificado:</strong>{' '}
                {currentIncident?.trigger || 'Sin detonante adverso reportado.'}
                {currentIncident?.triggerOther && ` (${currentIncident.triggerOther})`}
              </p>
              <p>
                <strong>[B] Conducta Observada:</strong>{' '}
                {currentIncident?.observedBehaviors?.length
                  ? currentIncident.observedBehaviors.join('; ')
                  : 'Comportamiento regulado acorde al manual de convivencia.'}
                {currentIncident?.otherBehaviorDetail && ` — Detalle: ${currentIncident.otherBehaviorDetail}`}
              </p>
              <p>
                <strong>[C] Consecuencia / Plan Regulador Formativo:</strong>{' '}
                {currentIncident?.regulatoryActions?.length
                  ? currentIncident.regulatoryActions.join('; ')
                  : 'Refuerzo positivo verbal y felicitación formativa.'}
              </p>
            </div>
          </div>

          {/* 3. ESTRATEGIAS Y RESPUESTAS REGULADORAS */}
          <div className="mb-4">
            <h3 className="print-section-title text-[12pt] font-bold uppercase text-black border-b border-black pb-1 mb-2">
              3. ESTRATEGIAS Y RESPUESTAS REGULADORAS
            </h3>
            <div className="space-y-1.5 text-[11pt]">
              <p>
                <strong>Acuerdo Restaurativo y Reparación del Entorno:</strong>{' '}
                {currentIncident?.restorativeAgreement || 'El estudiante reafirma su compromiso de autorregulación y respeto hacia sus compañeros.'}
              </p>
              <p>
                <strong>Observaciones Pedagógicas del Docente:</strong>{' '}
                {currentIncident?.teacherObservations || currentDailyScore?.notes || 'Evolución formativa favorable en la jornada escolar.'}
              </p>
            </div>
          </div>

          {/* SÍNTESIS FORMATIVA PARA LA FAMILIA / ACUDIENTE (YACITA AI) */}
          <div className={`mb-5 p-3.5 bg-amber-50/80 border border-amber-300 rounded-lg ${!parentSummary ? 'no-print' : ''}`}>
            <div className="flex items-center justify-between gap-2 border-b border-amber-300 pb-1.5 mb-2">
              <h4 className="text-[11pt] font-bold uppercase text-black font-sans">
                INFORME FORMATIVO PARA LA FAMILIA / ACUDIENTE
              </h4>
              <button
                type="button"
                onClick={handleGenerateParentSummary}
                disabled={isGeneratingSummary}
                className="no-print inline-flex items-center gap-1 text-[11px] font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 px-2.5 py-1 rounded transition-colors shadow-2xs"
              >
                <Sparkles className="w-3 h-3 text-amber-700" />
                <span>{parentSummary ? 'Regenerar con Yacita' : '🪄 Redactar informe para acudiente con Yacita'}</span>
              </button>
            </div>
            <p className="text-[10.5pt] leading-relaxed text-slate-900 font-serif font-normal">
              {parentSummary ? (
                parentSummary
              ) : (
                <span className="text-slate-500 not-italic no-print block py-1 font-sans text-xs">
                  Pulsa el botón superior «🪄 Redactar informe para acudiente con Yacita» para generar una síntesis formativa empática y clara para el hogar.
                </span>
              )}
            </p>
          </div>

          {/* 4. COMPROMISOS Y FIRMAS (3 COLUMNAS FORMALES) */}
          <div className="signatures-block print-avoid-break mt-8 pt-4">
            <h3 className="print-section-title text-[12pt] font-bold uppercase text-black border-b border-black pb-1 mb-3">
              4. COMPROMISOS Y FIRMAS FORMALES
            </h3>
            <p className="text-[9.5pt] italic text-slate-700 mb-8">
              En constancia de lo registrado y como pacto solidario entre la familia y la Institución Educativa Denzil Escolar
              para garantizar el derecho a la educación en un ambiente de sana convivencia y afecto.
            </p>

            <div className="grid grid-cols-3 gap-6 text-center text-[10pt] pt-6">
              {/* Docente */}
              <div className="flex flex-col items-center">
                <div className="w-full border-t border-black mb-1"></div>
                <strong className="block text-[10.5pt]">{teacher.name}</strong>
                <span className="text-[9pt] italic text-slate-700">Firma Docente / Orientador</span>
              </div>

              {/* Acudiente */}
              <div className="flex flex-col items-center">
                <div className="w-full border-t border-black mb-1"></div>
                <strong className="block text-[10.5pt]">{currentStudent?.guardianName || 'Acudiente'}</strong>
                <span className="text-[9pt] italic text-slate-700">Firma Padre / Acudiente</span>
              </div>

              {/* Estudiante */}
              <div className="flex flex-col items-center">
                <div className="w-full border-t border-black mb-1"></div>
                <strong className="block text-[10.5pt]">{currentStudent?.fullName || 'Estudiante'}</strong>
                <span className="text-[9pt] italic text-slate-700">Compromiso del Estudiante</span>
              </div>
            </div>
          </div>
        </MembreteReporte>
      </div>
    </div>
    </div>
  );
};
