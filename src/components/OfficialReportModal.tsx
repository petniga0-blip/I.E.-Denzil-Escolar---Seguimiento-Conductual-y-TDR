import React, { useRef, useState } from 'react';
import {
  X,
  Download,
  Printer,
  FileText,
  Cloud,
  CheckCircle,
  Share2,
  Calendar,
  User,
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
import { useYacitaCoach } from '../coach';

interface OfficialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  incident?: ABCIncident;
  dailyScore?: DailyCriterionScore;
  teacher: TeacherProfile;
  onSyncToGoogleDrive?: (blob: Blob, filename: string) => void;
}

export const OfficialReportModal: React.FC<OfficialReportModalProps> = ({
  isOpen,
  onClose,
  student,
  incident,
  dailyScore,
  teacher,
  onSyncToGoogleDrive,
}) => {
  const { notifyModalOpen, notifyModalClose, notifyActionEvent } = useYacitaCoach();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [exportNotice, setExportNotice] = useState<string>('');
  const [parentSummary, setParentSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      notifyModalOpen('tdr_report');
    }
  }, [isOpen, notifyModalOpen]);

  const handleClose = () => {
    notifyModalClose();
    onClose();
  };

  const handleGenerateParentSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const summary = await generateParentSummaryWithYacita({
        studentName: student.fullName,
        scores: dailyScore ? { c1: dailyScore.c1, c2: dailyScore.c2, c3: dailyScore.c3, c4: dailyScore.c4 } : undefined,
        incidentDescription: incident ? `${incident.trigger}. ${incident.observedBehaviors?.join(', ')}. ${incident.otherBehaviorDetail || ''}` : undefined,
        commitments: incident?.restorativeAgreement,
      });
      setParentSummary(summary);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  if (!isOpen) return null;

  const dateStr = incident?.date || dailyScore?.date || new Date().toISOString().split('T')[0];
  const timeStr = incident?.time || '08:00 AM';
  const subjectStr = incident?.subject || 'Dirección de Aula / Actividad Formativa';

  const handlePrint = () => {
    window.print();
  };

  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      setIsExportingPDF(true);
      const pdf = await generateOfficialPDF({
        student,
        incident,
        dailyScore,
        teacher,
        parentSummary,
        reportDate: dateStr,
      });
      const filename = `TDR_DenzilEscolar_${student.fullName.replace(/\s+/g, '_')}_${dateStr}.pdf`;
      pdf.save(filename);
      setExportNotice('¡Documento PDF oficial descargado con éxito!');
      notifyActionEvent('report_generated');
      setTimeout(() => setExportNotice(''), 3500);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al generar el PDF oficial.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleDownloadDocx = async () => {
    try {
      setIsExportingWord(true);
      await downloadDocxFile({
        student,
        incident,
        dailyScore,
        teacherName: teacher.name,
        parentSummary,
      });
      setExportNotice('¡Documento Word (.docx) descargado con éxito!');
      notifyActionEvent('report_generated');
      setTimeout(() => setExportNotice(''), 3500);
    } catch (e) {
      console.error(e);
      alert('Hubo un error al generar el archivo Word.');
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleDriveSync = async () => {
    try {
      const blob = await generateOfficialDocxBlob({
        student,
        incident,
        dailyScore,
        teacherName: teacher.name,
      });
      const filename = `TDR_DenzilEscolar_${student.fullName.replace(/\s+/g, '_')}_${dateStr}.docx`;
      notifyActionEvent('drive_saved');
      if (onSyncToGoogleDrive) {
        onSyncToGoogleDrive(blob, filename);
      } else {
        // Fallback Web Intent
        const url = 'https://drive.google.com/drive/my-drive';
        window.open(url, '_blank');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const scoreDescription = (score?: number) => {
    if (score === 3) return 'Logrado (3★) - Autorregulación adecuada';
    if (score === 2) return 'En Proceso (2★) - Requiere pauta o recordatorio';
    if (score === 1) return 'Requiere Acompañamiento (1★) - Desregulación';
    return 'No Evaluado';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Control Bar (Never Printed) */}
        <div className="no-print p-4 sm:px-6 bg-slate-50 dark:bg-[#131f42] border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
              Previsualización de Tarjeta Diaria (TDR) - Tamaño Carta Oficial
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Yacita Parent Report Button */}
            <button
              onClick={handleGenerateParentSummary}
              disabled={isGeneratingSummary}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white transition-colors shadow-xs min-h-[44px]"
              title="Redactar un informe empático y propositivo para la familia con Yacita"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>{isGeneratingSummary ? 'Redactando...' : '🪄 Redactar informe para acudiente con Yacita'}</span>
            </button>

            {/* Direct Official PDF Download */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-xs min-h-[44px]"
              title="Descargar documento PDF oficial tamaño Carta con membrete institucional"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPDF ? 'Generando PDF...' : 'Descargar PDF Oficial'}</span>
            </button>

            {/* Word .docx Export */}
            <button
              onClick={handleDownloadDocx}
              disabled={isExportingWord}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition-colors shadow-xs min-h-[44px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingWord ? 'Generando...' : 'Descargar en Word (.docx)'}</span>
            </button>

            {/* PDF (Direct Print Carta Vertical) */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-800 text-white transition-colors shadow-xs min-h-[44px]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            {/* Google Drive sync */}
            <button
              onClick={handleDriveSync}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs min-h-[44px]"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Google Drive</span>
            </button>

            {/* Close */}
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {exportNotice && (
          <div className="no-print bg-emerald-100 dark:bg-emerald-950/70 border-b border-emerald-300 dark:border-emerald-800 px-4 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            {exportNotice}
          </div>
        )}

        {/* Scrollable Document Body (Letter Portrait 21.59cm x 27.94cm) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/50 dark:bg-slate-950/60 flex justify-center">
          <div
            ref={printAreaRef}
            className="print-container bg-white text-black w-full max-w-[800px] min-h-[1050px] p-8 sm:p-10 shadow-lg border border-slate-300 mx-auto"
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '12pt',
              lineHeight: '1.15',
              backgroundColor: '#ffffff',
              color: '#000000',
            }}
          >
            <MembreteReporte>
              {/* Title of Document */}
              <div className="text-center my-3 pb-2 border-b border-slate-300">
                <h2 className="text-[12pt] font-bold uppercase text-black tracking-wide font-sans">
                  REGISTRO DE SEGUIMIENTO Y TARJETA DIARIA CONDUCTUAL (TDR)
                </h2>
                <p className="text-[9.5pt] italic text-slate-700 font-serif">
                  Modelo Pedagógico Formativo A-B-C y Sistema Restaurativo Escolar
                </p>
              </div>

            {/* 1. IDENTIFICACIÓN DEL ESTUDIANTE */}
            <div className="mb-4">
              <h3 className="print-section-title text-[12pt] font-bold uppercase text-black border-b border-black pb-1 mb-2">
                1. IDENTIFICACIÓN DEL ESTUDIANTE
              </h3>
              <table className="print-table w-full border-collapse text-[10.5pt]">
                <tbody>
                  <tr>
                    <td className="border border-black p-1.5 w-1/2">
                      <strong>Nombre del Estudiante:</strong> {student.fullName}
                    </td>
                    <td className="border border-black p-1.5 w-1/2">
                      <strong>Grado / Grupo:</strong> {student.grade}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5">
                      <strong>Jornada:</strong> {student.shift}
                    </td>
                    <td className="border border-black p-1.5">
                      <strong>Fecha de Reporte:</strong> {dateStr}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5">
                      <strong>Acudiente Responsable:</strong> {student.guardianName} (Tel: {student.contactPhone || 'N/A'})
                    </td>
                    <td className="border border-black p-1.5">
                      <strong>Hora y Asignatura:</strong> {timeStr} ({subjectStr})
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5" colSpan={2}>
                      <strong>Docente Responsable:</strong> {teacher.name} ({teacher.role})
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5" colSpan={2}>
                      <strong>Observación Médica / Sensorial:</strong>{' '}
                      {student.medicalSensoryNotes || 'Sin novedades médicas o sensoriales reportadas.'}
                    </td>
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
                  {incident?.expectedBehavior || 'Permanecer en su puesto y completar la guía formativa.'}{' '}
                  {incident && (
                    <span className="font-semibold text-slate-800">
                      (Nivel de logro en la meta: {incident.expectedBehaviorStars} de 5 estrellas)
                    </span>
                  )}
                </p>
                <p>
                  <strong>Detonante Identificado:</strong>{' '}
                  {incident?.trigger || 'Transición pedagógica o tarea de aula.'}
                  {incident?.triggerOther && ` (${incident.triggerOther})`}
                </p>
                <p>
                  <strong>[B] Conducta Observada:</strong>{' '}
                  {incident?.observedBehaviors?.length
                    ? incident.observedBehaviors.join('; ')
                    : 'Actitud colaborativa acorde al pacto de aula.'}
                  {incident?.otherBehaviorDetail && ` — Detalle: ${incident.otherBehaviorDetail}`}
                </p>
                <p>
                  <strong>[C] Consecuencia / Plan Regulador Formativo:</strong>{' '}
                  {incident?.regulatoryActions?.length
                    ? incident.regulatoryActions.join('; ')
                    : 'Acompañamiento en el aula y refuerzo de logros.'}
                </p>
              </div>
            </div>

            {/* MATRIZ DE CRITERIOS DIARIOS */}
            <div className="mb-4">
              <h4 className="text-[11pt] font-bold uppercase text-slate-900 mb-1.5">
                Seguimiento de Criterios Diarios en el Aula:
              </h4>
              <table className="print-table w-full border-collapse text-[10pt]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black p-1.5 text-left w-2/3">Criterio Pedagógico</th>
                    <th className="border border-black p-1.5 text-left w-1/3">Valoración del Día</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-1.5">1. {CRITERIA_DEFINITIONS[0].title}</td>
                    <td className="border border-black p-1.5">{scoreDescription(dailyScore?.c1)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5">2. {CRITERIA_DEFINITIONS[1].title}</td>
                    <td className="border border-black p-1.5">{scoreDescription(dailyScore?.c2)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5">3. {CRITERIA_DEFINITIONS[2].title}</td>
                    <td className="border border-black p-1.5">{scoreDescription(dailyScore?.c3)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black p-1.5">4. {CRITERIA_DEFINITIONS[3].title}</td>
                    <td className="border border-black p-1.5">{scoreDescription(dailyScore?.c4)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. ESTRATEGIAS Y RESPUESTAS REGULADORAS */}
            <div className="mb-4">
              <h3 className="print-section-title text-[12pt] font-bold uppercase text-black border-b border-black pb-1 mb-2">
                3. ESTRATEGIAS Y RESPUESTAS REGULADORAS
              </h3>
              <div className="space-y-1.5 text-[11pt]">
                <p>
                  <strong>Acuerdo Restaurativo y Reparación:</strong>{' '}
                  {incident?.restorativeAgreement || 'El estudiante reafirma el compromiso de respeto y autorregulación.'}
                </p>
                <p>
                  <strong>Observaciones Pedagógicas del Docente:</strong>{' '}
                  {incident?.teacherObservations || dailyScore?.notes || 'Evolución formativa favorable en el entorno de aula.'}
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
                    Pulsa el botón superior «🪄 Redactar informe para acudiente con Yacita» para que Yacita elabore una síntesis empática, clara y propositiva equilibrando los avances con los acuerdos de convivencia para la familia.
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
                  Constancia de acuerdo solidario entre el estudiante, la familia y la Institución Educativa Denzil Escolar
                  para promover la sana convivencia y el aprendizaje integral.
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
                    <strong className="block text-[10.5pt]">{student.guardianName}</strong>
                    <span className="text-[9pt] italic text-slate-700">Firma Padre / Acudiente</span>
                  </div>

                  {/* Estudiante */}
                  <div className="flex flex-col items-center">
                    <div className="w-full border-t border-black mb-1"></div>
                    <strong className="block text-[10.5pt]">{student.fullName}</strong>
                    <span className="text-[9pt] italic text-slate-700">Compromiso del Estudiante</span>
                  </div>
                </div>
              </div>
            </MembreteReporte>
          </div>
        </div>

      </div>
    </div>
  );
};
