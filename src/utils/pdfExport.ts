import { jsPDF } from 'jspdf';
import { ASSET_SELLO, ASSET_CAT } from '../config/assets';
import { MEMBRETE_CONFIG } from '../config/membrete';
import { Student, ABCIncident, DailyCriterionScore, TeacherProfile, CRITERIA_DEFINITIONS } from '../types';

let cachedSelloBase64: string | null = null;
let cachedCatBase64: string | null = null;

async function loadImageAsBase64(url: string): Promise<string> {
  // If in browser environment
  if (typeof window !== 'undefined') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 512;
        canvas.height = img.naturalHeight || 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error(`Failed to load image from ${url}`));
      img.src = url;
    });
  }

  // Node / test environment fallback
  try {
    const fs = await import('fs');
    const path = await import('path');
    const cleanedPath = url.replace(/^\//, '');
    const candidatePaths = [
      path.join(process.cwd(), 'public', cleanedPath),
      path.join(process.cwd(), cleanedPath),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const fileBuf = fs.readFileSync(p);
        return `data:image/png;base64,${fileBuf.toString('base64')}`;
      }
    }
  } catch {
    // continue to fetch fallback
  }

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

export async function preloadMembreteImages(): Promise<{ selloBase64: string; catBase64: string }> {
  if (!cachedSelloBase64) {
    cachedSelloBase64 = await loadImageAsBase64(ASSET_SELLO);
  }
  if (!cachedCatBase64) {
    cachedCatBase64 = await loadImageAsBase64(ASSET_CAT);
  }
  return { selloBase64: cachedSelloBase64, catBase64: cachedCatBase64 };
}

export function drawMembreteOnPDF(doc: jsPDF, selloBase64: string, catBase64: string): void {
  const pageWidth = 215.9; // Carta mm
  const pageHeight = 279.4; // Carta mm
  const marginX = 20; // 20 mm lateral margin
  const contentWidth = pageWidth - marginX * 2; // 175.9 mm

  // ================= CABEZOTE (SOLO ARRIBA) =================
  const headerTopY = 10;
  const logoSize = 28; // ~28 mm

  // 1. Sello Denzil (Izquierda)
  doc.addImage(selloBase64, 'PNG', marginX, headerTopY, logoSize, logoSize);

  // 2. Logo CAT (Derecha)
  doc.addImage(catBase64, 'PNG', marginX + contentWidth - logoSize, headerTopY, logoSize, logoSize);

  // 3. Bloque Central de Texto
  const centerX = marginX + contentWidth / 2;

  // Título: sans-serif bold, mayúsculas, color #0B2A6B
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(11, 42, 107);
  doc.text(MEMBRETE_CONFIG.titulo, centerX, headerTopY + 8, { align: 'center' });

  // 3 Líneas: serif bold, negro, tamaño menor
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(MEMBRETE_CONFIG.linea1, centerX, headerTopY + 14, { align: 'center' });
  doc.text(MEMBRETE_CONFIG.linea2, centerX, headerTopY + 18.5, { align: 'center' });
  doc.text(MEMBRETE_CONFIG.linea3, centerX, headerTopY + 23, { align: 'center' });

  // Barra negra gruesa de ancho completo con resplandor azul suave
  const barY = headerTopY + logoSize + 2; // 40 mm
  // Glow azul suave
  doc.setDrawColor(11, 42, 107);
  doc.setLineWidth(0.6);
  doc.line(marginX, barY - 0.2, marginX + contentWidth, barY - 0.2);
  doc.line(marginX, barY + 1.2, marginX + contentWidth, barY + 1.2);
  // Barra negra sólida (~2 mm)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.4);
  doc.line(marginX, barY + 0.5, marginX + contentWidth, barY + 0.5);

  // ================= PIE (SOLO ABAJO) =================
  const footerLineY = pageHeight - 28; // ~251.4 mm

  // Línea horizontal negra delgada con leve resplandor azul
  doc.setDrawColor(11, 42, 107);
  doc.setLineWidth(0.3);
  doc.line(marginX, footerLineY - 0.2, marginX + contentWidth, footerLineY - 0.2);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(marginX, footerLineY, marginX + contentWidth, footerLineY);

  // Columna Izquierda: Progreso / Paz (serif bold, azul oscuro)
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(11, 42, 107);
  doc.text(MEMBRETE_CONFIG.pieIzquierdo[0], marginX, footerLineY + 4.5, { align: 'left' });
  doc.text(MEMBRETE_CONFIG.pieIzquierdo[1], marginX, footerLineY + 8.5, { align: 'left' });

  // Columna Derecha: Sabiduría / Cultura (serif bold, azul oscuro)
  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(11, 42, 107);
  doc.text(MEMBRETE_CONFIG.pieDerecho[0], marginX + contentWidth, footerLineY + 4.5, { align: 'right' });
  doc.text(MEMBRETE_CONFIG.pieDerecho[1], marginX + contentWidth, footerLineY + 8.5, { align: 'right' });

  // Columna Centro: Dirección, Web y Correo
  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(MEMBRETE_CONFIG.pieCentroLinea1, centerX, footerLineY + 4.5, { align: 'center' });

  doc.setTextColor(11, 42, 107);
  doc.text(MEMBRETE_CONFIG.pieCentroLinea2, centerX, footerLineY + 8.5, { align: 'center' });
}

export interface GeneratePDFOptions {
  student: Student;
  incident?: ABCIncident;
  dailyScore?: DailyCriterionScore;
  teacher: TeacherProfile;
  parentSummary?: string;
  reportDate?: string;
}

export async function generateOfficialPDF(options: GeneratePDFOptions): Promise<jsPDF> {
  const { student, incident, dailyScore, teacher, parentSummary, reportDate } = options;
  const { selloBase64, catBase64 } = await preloadMembreteImages();

  // Create Carta document in portrait
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter', // 215.9 x 279.4 mm
  });

  const marginX = 20;
  const contentWidth = 175.9;
  const topContentMargin = 45; // Below cabezote
  const bottomContentLimit = 244; // Above footer

  let currentY = topContentMargin;

  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > bottomContentLimit) {
      doc.addPage();
      currentY = topContentMargin;
    }
  };

  // Helper for Section Titles
  const drawSectionTitle = (title: string) => {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text(title, marginX, currentY + 5);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(marginX, currentY + 6.5, marginX + contentWidth, currentY + 6.5);
    currentY += 10;
  };

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('REGISTRO DE SEGUIMIENTO Y TARJETA DIARIA CONDUCTUAL (TDR)', marginX + contentWidth / 2, currentY + 2, {
    align: 'center',
  });
  doc.setFont('times', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text('Modelo Pedagógico Formativo A-B-C y Sistema Restaurativo Escolar', marginX + contentWidth / 2, currentY + 6.5, {
    align: 'center',
  });
  currentY += 11;

  // 1. IDENTIFICACIÓN DEL ESTUDIANTE
  drawSectionTitle('1. IDENTIFICACIÓN DEL ESTUDIANTE');

  const dateStr = reportDate || incident?.date || dailyScore?.date || new Date().toISOString().split('T')[0];
  const idRows = [
    [
      { label: 'Estudiante', val: student.fullName },
      { label: 'Grado / Grupo', val: student.grade },
    ],
    [
      { label: 'Jornada', val: student.shift },
      { label: 'Fecha de Reporte', val: dateStr },
    ],
    [
      { label: 'Acudiente Legal', val: student.guardianName },
      { label: 'Teléfono Contacto', val: student.contactPhone || 'No registrado' },
    ],
    [
      { label: 'Docente Responsable', val: teacher.name },
      { label: 'Momento / Hora', val: incident?.time ? `${incident.subject || 'Clase'} (${incident.time})` : 'Jornada escolar' },
    ],
  ];

  for (const row of idRows) {
    ensureSpace(7);
    const colW = contentWidth / 2;

    // Col 1
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`${row[0].label}:`, marginX + 1, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(String(row[0].val), marginX + 36, currentY + 4, { maxWidth: colW - 38 });

    // Col 2
    doc.setFont('helvetica', 'bold');
    doc.text(`${row[1].label}:`, marginX + colW + 1, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(String(row[1].val), marginX + colW + 36, currentY + 4, { maxWidth: colW - 38 });

    // Table line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(marginX, currentY + 6, marginX + contentWidth, currentY + 6);
    currentY += 6.5;
  }

  // Sensory / Medical Notes row
  ensureSpace(9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Observaciones Previas / Sensoriales:', marginX + 1, currentY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(
    student.medicalSensoryNotes || 'Sin novedades médicas o sensoriales registradas.',
    marginX + 62,
    currentY + 4,
    { maxWidth: contentWidth - 64 }
  );
  doc.setDrawColor(200, 200, 200);
  doc.line(marginX, currentY + 7, marginX + contentWidth, currentY + 7);
  currentY += 10;

  // 2. VALORACIÓN FORMATIVA EN LA MATRIZ CONDUCTUAL
  drawSectionTitle('2. VALORACIÓN FORMATIVA EN LA MATRIZ CONDUCTUAL');

  const criteriaScores = [
    { id: 'c1', title: CRITERIA_DEFINITIONS[0].short, val: dailyScore?.c1 ?? 3 },
    { id: 'c2', title: CRITERIA_DEFINITIONS[1].short, val: dailyScore?.c2 ?? 3 },
    { id: 'c3', title: CRITERIA_DEFINITIONS[2].short, val: dailyScore?.c3 ?? 3 },
    { id: 'c4', title: CRITERIA_DEFINITIONS[3].short, val: dailyScore?.c4 ?? 3 },
  ];

  ensureSpace(26);
  // Criteria headers
  doc.setFillColor(245, 247, 250);
  doc.rect(marginX, currentY, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  doc.text('Criterio de Evaluación', marginX + 2, currentY + 4);
  doc.text('Nivel Obtenido', marginX + 80, currentY + 4);
  doc.text('Significado Pedagógico', marginX + 120, currentY + 4);
  currentY += 6;

  for (const c of criteriaScores) {
    ensureSpace(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(c.title, marginX + 2, currentY + 4);

    const levelText = c.val === 3 ? '[✓] Logrado (3★)' : c.val === 2 ? '[~] En Proceso (2★)' : '[!] Requiere Apoyo (1★)';
    const meaningText =
      c.val === 3
        ? 'Excelente autorregulación'
        : c.val === 2
        ? 'Requiere recordatorios'
        : 'Requiere acompañamiento directo';

    doc.setFont('helvetica', 'bold');
    if (c.val === 3) doc.setTextColor(21, 128, 61);
    else if (c.val === 2) doc.setTextColor(180, 83, 9);
    else doc.setTextColor(185, 28, 28);
    doc.text(levelText, marginX + 80, currentY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(meaningText, marginX + 120, currentY + 4);

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.15);
    doc.line(marginX, currentY + 5.5, marginX + contentWidth, currentY + 5.5);
    currentY += 5.5;
  }
  currentY += 4;

  // 3. REGISTRO DE EVENTO Y PLAN RESTAURATIVO (MODELO A-B-C)
  if (incident) {
    drawSectionTitle('3. REGISTRO FORMATIVO DE INCIDENCIA (MODELO A-B-C)');

    const abcItems = [
      {
        tag: '[A] ANTECEDENTE / DETONANTE:',
        text: `${incident.trigger || 'Cambio de actividad'} ${incident.triggerOther ? `(${incident.triggerOther})` : ''}`,
      },
      {
        tag: '[B] CONDUCTA OBSERVADA:',
        text: `${(incident.observedBehaviors || []).join(', ') || 'Desregulación conductual en aula'} ${
          incident.otherBehaviorDetail ? `\nDetalle: ${incident.otherBehaviorDetail}` : ''
        }`,
      },
      {
        tag: '[C] CONSECUENCIA FORMATIVA Y PLAN RESTAURATIVO:',
        text: `${(incident.regulatoryActions || []).join(', ') || 'Pausa sensorial guiada y diálogo restaurativo'} ${
          incident.restorativeAgreement ? `\nAcuerdo restaurativo: ${incident.restorativeAgreement}` : ''
        }`,
      },
    ];

    if (incident.teacherObservations) {
      abcItems.push({
        tag: 'OBSERVACIONES PEDAGÓGICAS:',
        text: incident.teacherObservations,
      });
    }

    for (const item of abcItems) {
      const splitLines = doc.splitTextToSize(item.text, contentWidth - 4);
      const boxHeight = 6 + splitLines.length * 4.2;
      ensureSpace(boxHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(11, 42, 107);
      doc.text(item.tag, marginX + 1, currentY + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(splitLines, marginX + 1, currentY + 7.5);

      currentY += boxHeight + 1.5;
    }
  }

  // 4. INFORME FORMATIVO PARA LA FAMILIA / ACUDIENTE (SOLO SI FUE GENERADO)
  if (parentSummary && parentSummary.trim()) {
    drawSectionTitle('4. INFORME FORMATIVO PARA LA FAMILIA / ACUDIENTE');
    const summaryLines = doc.splitTextToSize(parentSummary.trim(), contentWidth - 6);
    const boxHeight = 6 + summaryLines.length * 4.5;
    ensureSpace(boxHeight + 4);

    doc.setFillColor(250, 252, 255);
    doc.setDrawColor(180, 205, 235);
    doc.setLineWidth(0.3);
    doc.rect(marginX, currentY, contentWidth, boxHeight, 'FD');

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(summaryLines, marginX + 3, currentY + 5);

    currentY += boxHeight + 6;
  }

  // 5. FIRMAS Y COMPROMISOS INSTITUCIONALES (DO NOT BREAK ACROSS PAGES)
  ensureSpace(34);
  drawSectionTitle('5. FIRMAS Y COMPROMISOS INSTITUCIONALES');

  const sigColW = contentWidth / 3;
  const sigY = currentY + 16;

  // Signature line 1: Docente
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(marginX + 2, sigY, marginX + sigColW - 4, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(teacher.name, marginX + sigColW / 2, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Docente Responsable', marginX + sigColW / 2, sigY + 7.5, { align: 'center' });

  // Signature line 2: Acudiente
  doc.line(marginX + sigColW + 2, sigY, marginX + sigColW * 2 - 4, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(student.guardianName, marginX + sigColW * 1.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Firma Acudiente / Familia', marginX + sigColW * 1.5, sigY + 7.5, { align: 'center' });

  // Signature line 3: Estudiante o Rectoría
  doc.line(marginX + sigColW * 2 + 2, sigY, marginX + contentWidth - 2, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(student.fullName, marginX + sigColW * 2.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Compromiso Estudiante', marginX + sigColW * 2.5, sigY + 7.5, { align: 'center' });

  currentY = sigY + 14;

  // STAMP LETTERHEAD ON ALL PAGES (PASO 3 & PASO 4)
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawMembreteOnPDF(doc, selloBase64, catBase64);

    // Page indicator at very bottom
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Página ${p} de ${totalPages}`, marginX + contentWidth / 2, 279.4 - 7, { align: 'center' });
  }

  return doc;
}
