import React, { useRef, useState } from 'react';
import {
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
  X,
} from 'lucide-react';
import {
  Student,
  ABCIncident,
  DailyCriterionScore,
  CRITERIA_DEFINITIONS,
  TeacherProfile,
} from '../types';
import { generateParentSummaryWithYacita } from '../utils/yacitaAI';
import MembreteReporte from './MembreteReporte';
import FichaCuaderno from './FichaCuaderno';
import { useYacitaCoach } from '../coach';
import { Sheet } from './Sheet';

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
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [reportFormat, setReportFormat] = useState<'carta' | 'cuaderno'>('carta');

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
      notifyActionEvent('report_generated');
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const dateStr = incident?.date || dailyScore?.date || new Date().toISOString().split('T')[0];
  const timeStr = incident?.time || '08:00 AM';
  const subjectStr = incident?.subject || 'Dirección de Aula / Actividad Formativa';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setIsExportingPDF(true);
      const { generateOfficialPDF } = await import('../utils/pdfExport');
      const pdf = await generateOfficialPDF({
        student,
        incident,
        dailyScore,
        teacher,
        parentSummary,
      });
      pdf.save(`TDR_Oficial_${student.fullName.replace(/\s+/g, '_')}_${dateStr}.pdf`);
      setExportNotice('¡Documento PDF Oficial descargado con éxito!');
      notifyActionEvent('report_generated');
      setTimeout(() => setExportNotice(''), 3500);
    } catch (e) {
      console.error(e);
      alert('Hubo un error al generar el PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleDownloadDocx = async () => {
    try {
      setIsExportingWord(true);
      const { downloadDocxFile } = await import('../utils/docxExport');
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
      const { generateOfficialDocxBlob } = await import('../utils/docxExport');
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
    <Sheet
      isOpen={isOpen}
      onClose={handleClose}
      sheetId="official_report_modal"
      size="4xl"
      title="Tarjeta Diaria (TDR) · Carta Oficial"
      subtitle={`${student.fullName} · Grado ${student.grade} (${student.shift})`}
      icon={<FileText className="w-5 h-5 text-blue-700 dark:text-blue-400" />}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              data-yacita="reports_btn_print"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-700 hover:bg-slate-800 text-white transition-colors min-h-[44px] active:scale-95 shadow-xs"
              title="Imprimir documento"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={handleDriveSync}
              data-yacita="reports_btn_sync_drive"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors min-h-[44px] active:scale-95 shadow-xs"
              title="Sincronizar en Google Drive"
            >
              <Cloud className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Google Drive</span>
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isExportingWord}
              data-yacita="reports_btn_download_word"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-blue-700 hover:bg-blue-800 text-white transition-colors min-h-[44px] active:scale-95 shadow-xs disabled:opacity-60"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{isExportingWord ? 'Word...' : 'Word (.docx)'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              data-yacita="reports_btn_download_pdf"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition-colors min-h-[44px] active:scale-95 shadow-xs disabled:opacity-60"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{isExportingPDF ? 'PDF...' : 'PDF Oficial'}</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 min-h-[44px] active:scale-95 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Top Control Bar for quick actions */}
        <div className="no-print p-3 rounded-xl bg-slate-100 dark:bg-[#131f42] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Formato:
            </span>
            <div className="inline-flex items-center p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setReportFormat('carta')}
                data-yacita="reports_format_carta"
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors min-h-[44px] flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${
                  reportFormat === 'carta'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Carta Oficial</span>
              </button>
              <button
                type="button"
                onClick={() => setReportFormat('cuaderno')}
                data-yacita="reports_format_cuaderno"
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors min-h-[44px] flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden ${
                  reportFormat === 'cuaderno'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>Ficha Cuaderno (2 por hoja)</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateParentSummary}
            disabled={isGeneratingSummary}
            data-yacita="reports_btn_parent_summary"
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white transition-colors shadow-xs min-h-[44px] active:scale-95 disabled:opacity-60"
            title="Redactar un informe empático y propositivo para la familia con Yacita"
          >
            <Sparkles className="w-4 h-4 text-amber-200 shrink-0" />
            <span>{isGeneratingSummary ? 'Redactando con Yacita...' : '🪄 Redactar informe acudiente'}</span>
          </button>
        </div>

        {exportNotice && (
          <div className="no-print bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-4 py-2.5 rounded-xl text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {/* Scrollable Document Body (Letter Portrait 21.59cm x 27.94cm) */}
        <div className="p-1 sm:p-4 bg-slate-100 dark:bg-slate-950/60 rounded-xl flex justify-center overflow-x-auto">
          <div
            ref={printAreaRef}
            className={`print-container bg-white text-black w-full max-w-[800px] ${
              reportFormat === 'cuaderno' ? 'p-3 sm:p-5' : 'min-h-[1050px] p-6 sm:p-10'
            } shadow-lg border border-slate-300 mx-auto rounded-lg`}
            style={{
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '12pt',
              lineHeight: '1.15',
              backgroundColor: '#ffffff',
              color: '#000000',
            }}
          >
            {reportFormat === 'cuaderno' ? (
              <FichaCuaderno
                student={student}
                score={dailyScore}
                incident={incident}
                teacher={teacher}
                dateStr={dateStr}
                parentSummary={parentSummary}
              />
            ) : (
              <MembreteReporte>
                {/* Title of Document */}
                <div className="text-center my-3 pb-2 border-b border-slate-300">
                  <h2 className="text-[12pt] font-bold uppercase text-black tracking-wide font-sans">
                    REGISTRO DE SEGUIMIENTO Y TARJETA DIARIA CONDUCTUAL (TDR)
                  </h2>
                  <p className="text-[10pt] text-slate-700 italic">
                    Comité Escolar de Convivencia y Enfoque Formativo Restaurativo
                  </p>
                </div>

              {/* Data Grid: Student & Date Info */}
              <div className="my-3 text-[10.5pt] leading-tight space-y-1">
                <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-1">
                  <div>
                    <strong className="text-slate-800">Estudiante: </strong>
                    <span className="font-semibold text-black uppercase">{student.fullName}</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">Fecha / Hora: </strong>
                    <span>{dateStr} · {timeStr}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-1">
                  <div>
                    <strong className="text-slate-800">Grado: </strong>
                    <span>{student.grade}</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">Jornada: </strong>
                    <span>{student.shift}</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">Sede: </strong>
                    <span>{teacher.sede}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-1">
                  <div>
                    <strong className="text-slate-800">Acudiente / Contacto: </strong>
                    <span>{student.guardianName} ({student.contactPhone || 'Sin teléfono'})</span>
                  </div>
                  <div>
                    <strong className="text-slate-800">Docente / Orientador: </strong>
                    <span>{teacher.name}</span>
                  </div>
                </div>

                <div>
                  <strong className="text-slate-800">Actividad / Espacio: </strong>
                  <span>{subjectStr}</span>
                </div>
              </div>

              {/* Section 1: Daily Matrix Criteria Scores */}
              <div className="my-4">
                <h3 className="text-[11pt] font-bold uppercase text-black bg-slate-100 p-1.5 border-l-4 border-blue-900 mb-2">
                  1. VALORACIÓN DE CONDUCTA DIARIA (TARJETA TDR)
                </h3>
                <table className="w-full text-left text-[10pt] border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800">
                      <th className="border border-slate-300 p-1.5 w-12 text-center">Criterio</th>
                      <th className="border border-slate-300 p-1.5">Dimensión Formativa Observada</th>
                      <th className="border border-slate-300 p-1.5 w-24 text-center">Nivel</th>
                      <th className="border border-slate-300 p-1.5">Descripción de la Observación</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-1.5 text-center font-bold">C1</td>
                      <td className="border border-slate-300 p-1.5 font-medium">Turnos de Conversación y Escucha</td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-black">
                        {dailyScore ? `${dailyScore.c1}★` : '3★'}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-slate-700">
                        {scoreDescription(dailyScore?.c1 ?? 3)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1.5 text-center font-bold">C2</td>
                      <td className="border border-slate-300 p-1.5 font-medium">Permanencia en la Actividad</td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-black">
                        {dailyScore ? `${dailyScore.c2}★` : '3★'}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-slate-700">
                        {scoreDescription(dailyScore?.c2 ?? 3)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1.5 text-center font-bold">C3</td>
                      <td className="border border-slate-300 p-1.5 font-medium">Seguimiento de Instrucciones Clave</td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-black">
                        {dailyScore ? `${dailyScore.c3}★` : '3★'}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-slate-700">
                        {scoreDescription(dailyScore?.c3 ?? 3)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1.5 text-center font-bold">C4</td>
                      <td className="border border-slate-300 p-1.5 font-medium">Cuidado de Materiales y Espacio</td>
                      <td className="border border-slate-300 p-1.5 text-center font-bold text-black">
                        {dailyScore ? `${dailyScore.c4}★` : '3★'}
                      </td>
                      <td className="border border-slate-300 p-1.5 text-slate-700">
                        {scoreDescription(dailyScore?.c4 ?? 3)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Section 2: ABC Pedagogical Incident Details */}
              {incident && (
                <div className="my-4">
                  <h3 className="text-[11pt] font-bold uppercase text-black bg-slate-100 p-1.5 border-l-4 border-amber-600 mb-2">
                    2. ANÁLISIS FORMATIVO SITUACIONAL (REGISTRO A-B-C)
                  </h3>
                  <div className="space-y-2 text-[10pt] leading-snug">
                    <div className="p-2 border border-slate-200 rounded">
                      <strong className="block text-slate-800 text-[10pt]">
                        A - Antecedente / Detonante Observable:
                      </strong>
                      <p className="text-black mt-0.5">{incident.trigger}</p>
                    </div>

                    <div className="p-2 border border-slate-200 rounded">
                      <strong className="block text-slate-800 text-[10pt]">
                        B - Conductas Específicas Registradas:
                      </strong>
                      <p className="text-black mt-0.5">
                        {incident.observedBehaviors?.join(', ')}
                        {incident.otherBehaviorDetail && ` (${incident.otherBehaviorDetail})`}
                      </p>
                    </div>

                    <div className="p-2 border border-slate-200 rounded">
                      <strong className="block text-slate-800 text-[10pt]">
                        C - Acciones Reguladoras y Respuesta Pedagógica:
                      </strong>
                      <p className="text-black mt-0.5">
                        {incident.regulatoryActions?.join(', ') || incident.teacherObservations || 'Acompañamiento formativo'}
                      </p>
                    </div>

                    <div className="p-2 bg-blue-50/50 border border-blue-200 rounded">
                      <strong className="block text-blue-900 text-[10pt]">
                        Pacto Formativo y Acuerdo Restaurativo:
                      </strong>
                      <p className="text-slate-900 font-medium mt-0.5">{incident.restorativeAgreement}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3: Sensory / Medical Considerations */}
              {student.medicalSensoryNotes && (
                <div className="my-3 p-2 bg-purple-50/40 border border-purple-200 rounded text-[10pt]">
                  <strong className="text-purple-900">Consideraciones Médicas o Sensoriales Previas: </strong>
                  <span className="text-slate-800">{student.medicalSensoryNotes}</span>
                </div>
              )}

              {/* Section 4: Yacita AI Parent Summary (If generated) */}
              {parentSummary && (
                <div className="my-4 p-3 bg-amber-50/60 border border-amber-200 rounded text-[10pt]">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Resumen Pedagógico Formativo Orientado al Hogar:</span>
                  </div>
                  <p className="text-slate-800 whitespace-pre-line leading-relaxed italic">
                    "{parentSummary}"
                  </p>
                </div>
              )}

              {/* Signatures Section */}
              <div className="mt-8 pt-4 border-t border-slate-300">
                <div className="grid grid-cols-3 gap-6 text-center text-[10pt]">
                  {/* Docente */}
                  <div className="flex flex-col items-center">
                    <div className="w-full border-t border-black mb-1"></div>
                    <strong className="block text-[10.5pt]">{teacher.name}</strong>
                    <span className="text-[10pt] italic text-slate-700">Firma Docente / Orientador</span>
                  </div>

                  {/* Acudiente */}
                  <div className="flex flex-col items-center">
                    <div className="w-full border-t border-black mb-1"></div>
                    <strong className="block text-[10.5pt]">{student.guardianName}</strong>
                    <span className="text-[10pt] italic text-slate-700">Firma Padre / Acudiente</span>
                  </div>

                  {/* Estudiante */}
                  <div className="flex flex-col items-center">
                    <div className="w-full border-t border-black mb-1"></div>
                    <strong className="block text-[10.5pt]">{student.fullName}</strong>
                    <span className="text-[10pt] italic text-slate-700">Compromiso del Estudiante</span>
                  </div>
                </div>
              </div>
            </MembreteReporte>
          )}
          </div>
        </div>
      </div>
    </Sheet>
  );
};

export default OfficialReportModal;
