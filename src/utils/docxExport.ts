import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  convertMillimetersToTwip,
  Header,
  Footer,
  PageNumber,
} from 'docx';
import { ABCIncident, Student, DailyCriterionScore, CRITERIA_DEFINITIONS } from '../types';

interface ExportDocxOptions {
  student: Student;
  incident?: ABCIncident;
  dailyScore?: DailyCriterionScore;
  teacherName?: string;
  customDate?: string;
}

export async function generateOfficialDocxBlob(options: ExportDocxOptions): Promise<Blob> {
  const { student, incident, dailyScore, teacherName = 'Lic. Marielis E. Cotes Benjumea', customDate } = options;

  const dateStr = incident?.date || dailyScore?.date || customDate || new Date().toISOString().split('T')[0];
  const timeStr = incident?.time || '08:00 AM';
  const subjectStr = incident?.subject || 'Dirección de Grupo y Actividades de Aula';

  // Section Header Generator (Arial 12 Bold Uppercase)
  const createSectionHeader = (title: string) => {
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 240, after: 120, line: 276 },
      children: [
        new TextRun({
          text: title,
          font: 'Arial',
          size: 24, // 12pt = 24 half-points
          bold: true,
          color: '1E3A8A', // Institutional navy
        }),
      ],
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
          color: '1E3A8A',
        },
      },
    });
  };

  // Standard regular text paragraph (Arial 12 regular, 1.15 line spacing)
  const createBodyParagraph = (label: string, text: string) => {
    return new Paragraph({
      spacing: { before: 80, after: 80, line: 276 },
      children: [
        new TextRun({
          text: `${label}: `,
          font: 'Arial',
          size: 24,
          bold: true,
          color: '0F172A',
        }),
        new TextRun({
          text: text || 'N/A',
          font: 'Arial',
          size: 24,
          bold: false,
          color: '1E293B',
        }),
      ],
    });
  };

  // Table cell helper
  const createCell = (text: string, isHeader: boolean = false, widthPct: number = 50) => {
    return new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      margins: { top: 120, bottom: 120, left: 140, right: 140 },
      children: [
        new Paragraph({
          alignment: isHeader ? AlignmentType.LEFT : AlignmentType.LEFT,
          spacing: { line: 276 },
          children: [
            new TextRun({
              text,
              font: 'Arial',
              size: 24,
              bold: isHeader,
              color: isHeader ? '1E3A8A' : '0F172A',
            }),
          ],
        }),
      ],
    });
  };

  // 1. Identification Table
  const identificationTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell('Estudiante: ' + student.fullName, true, 60),
          createCell('Grado / Grupo: ' + student.grade, true, 40),
        ],
      }),
      new TableRow({
        children: [
          createCell('Jornada: ' + student.shift, false, 60),
          createCell('Fecha del Reporte: ' + dateStr, false, 40),
        ],
      }),
      new TableRow({
        children: [
          createCell('Acudiente: ' + student.guardianName + ' (Tel: ' + student.contactPhone + ')', false, 60),
          createCell('Asignatura / Momento: ' + subjectStr, false, 40),
        ],
      }),
      new TableRow({
        children: [
          createCell('Docente Responsable: ' + teacherName, false, 60),
          createCell('Hora de Observación: ' + timeStr, false, 40),
        ],
      }),
      new TableRow({
        children: [
          createCell('Observaciones Previas / Sensoriales: ' + (student.medicalSensoryNotes || 'Sin novedades médicas registradas'), false, 100),
        ],
      }),
    ],
  });

  // 2. Evaluated Criteria (if daily scores available)
  const getScoreLabel = (score?: number) => {
    if (score === 3) return 'Logrado [✓✓✓] (3★)';
    if (score === 2) return 'En Proceso [~~] (2★)';
    if (score === 1) return 'Requiere Acompañamiento [!] (1★)';
    return 'No Evaluado';
  };

  const criteriaRows = [
    new TableRow({
      children: [
        createCell('CRITERIO FORMATIVO OBSERVADO', true, 65),
        createCell('VALORACIÓN DEL DÍA', true, 35),
      ],
    }),
    new TableRow({
      children: [
        createCell('1. ' + CRITERIA_DEFINITIONS[0].title, false, 65),
        createCell(getScoreLabel(dailyScore?.c1), false, 35),
      ],
    }),
    new TableRow({
      children: [
        createCell('2. ' + CRITERIA_DEFINITIONS[1].title, false, 65),
        createCell(getScoreLabel(dailyScore?.c2), false, 35),
      ],
    }),
    new TableRow({
      children: [
        createCell('3. ' + CRITERIA_DEFINITIONS[2].title, false, 65),
        createCell(getScoreLabel(dailyScore?.c3), false, 35),
      ],
    }),
    new TableRow({
      children: [
        createCell('4. ' + CRITERIA_DEFINITIONS[3].title, false, 65),
        createCell(getScoreLabel(dailyScore?.c4), false, 35),
      ],
    }),
  ];

  const criteriaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: criteriaRows,
  });

  // 3. ABC Breakdown
  const expectedStarsText = incident
    ? `(${incident.expectedBehaviorStars} de 5 estrellas de logro pedagógico)`
    : '';

  const behaviorsText = incident?.observedBehaviors?.length
    ? incident.observedBehaviors.join('; ') +
      (incident.otherBehaviorDetail ? ` (Detalle adicional: ${incident.otherBehaviorDetail})` : '')
    : 'No se presentaron incidencias conductuales desreguladas en la jornada escolar.';

  const regulatoryActionsText = incident?.regulatoryActions?.length
    ? incident.regulatoryActions.join('; ')
    : 'Continuidad pedagógica en el aula y refuerzo positivo.';

  // 4. Three-column signatures table
  const signaturesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            margins: { top: 300, bottom: 80, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240 },
                children: [
                  new TextRun({
                    text: '________________________________',
                    font: 'Arial',
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, line: 240 },
                children: [
                  new TextRun({
                    text: teacherName,
                    font: 'Arial',
                    size: 22,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240 },
                children: [
                  new TextRun({
                    text: 'Docente / Orientador(a)',
                    font: 'Arial',
                    size: 20,
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            margins: { top: 300, bottom: 80, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240 },
                children: [
                  new TextRun({
                    text: '________________________________',
                    font: 'Arial',
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, line: 240 },
                children: [
                  new TextRun({
                    text: student.guardianName || 'Firma Padre / Acudiente',
                    font: 'Arial',
                    size: 22,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240 },
                children: [
                  new TextRun({
                    text: 'Padre / Acudiente Responsable',
                    font: 'Arial',
                    size: 20,
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            margins: { top: 300, bottom: 80, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240 },
                children: [
                  new TextRun({
                    text: '________________________________',
                    font: 'Arial',
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, line: 240 },
                children: [
                  new TextRun({
                    text: student.fullName,
                    font: 'Arial',
                    size: 22,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240 },
                children: [
                  new TextRun({
                    text: 'Compromiso del Estudiante',
                    font: 'Arial',
                    size: 20,
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(8.5), // Letter Width
              height: convertInchesToTwip(11), // Letter Height
            },
            margin: {
              top: convertMillimetersToTwip(15),
              bottom: convertMillimetersToTwip(15),
              left: convertMillimetersToTwip(15),
              right: convertMillimetersToTwip(15),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240, after: 40 },
                children: [
                  new TextRun({
                    text: 'INSTITUCIÓN EDUCATIVA DENZIL ESCOLAR',
                    font: 'Arial',
                    size: 24,
                    bold: true,
                    color: '1E3A8A',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 220, after: 40 },
                children: [
                  new TextRun({
                    text: 'Aprobado mediante Decreto # 248 del 2002 · Reg. DANE 144001003404 · NIT. 8250006500',
                    font: 'Arial',
                    size: 18,
                    color: '475569',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 220, after: 80 },
                children: [
                  new TextRun({
                    text: 'Riohacha – La Guajira · Cra 7h No 57-44 Barrio La Mano De Dios · Web: www.denzilescolar.edu.co',
                    font: 'Arial',
                    size: 16,
                    color: '64748B',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: 240 },
                children: [
                  new TextRun({
                    text: 'Lema Institucional: Progreso · Paz · Sabiduría · Cultura  —  Página ',
                    font: 'Arial',
                    size: 18,
                    italics: true,
                    color: '64748B',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: 'Arial',
                    size: 18,
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Institutional Subheader / Document Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 180, line: 276 },
            children: [
              new TextRun({
                text: 'TARJETA DIARIA DE REPORTE (TDR) Y SEGUIMIENTO CONDUCTUAL',
                font: 'Arial',
                size: 26,
                bold: true,
                color: '0F172A',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180, line: 240 },
            children: [
              new TextRun({
                text: 'Modelo Pedagógico Formativo A-B-C y Sistema de Justicia Restaurativa Escolar',
                font: 'Arial',
                size: 20,
                italics: true,
                color: '1E3A8A',
              }),
            ],
          }),

          // 1. IDENTIFICACIÓN
          createSectionHeader('1. IDENTIFICACIÓN DEL ESTUDIANTE'),
          identificationTable,

          // 2. MATRIZ DE CRITERIOS CONDUCTUALES
          createSectionHeader('2. MATRIZ DE SEGUIMIENTO FORMATIVO DIARIO'),
          criteriaTable,
          createBodyParagraph('Observación General del Comportamiento', dailyScore?.notes || 'Cumplimiento armónico de las normas de convivencia.'),

          // 3. REGISTRO FORMATIVO A-B-C
          createSectionHeader('3. REGISTRO FORMATIVO A-B-C (ANTECEDENTE - CONDUCTA - CONSECUENCIA)'),
          createBodyParagraph(
            '[A] ANTECEDENTE / META ESPERADA',
            (incident?.expectedBehavior || 'Permanecer atento en clase y completar las actividades asignadas') + ' ' + expectedStarsText
          ),
          createBodyParagraph(
            'Detonante Identificado',
            incident?.trigger ? (incident.trigger + (incident.triggerOther ? ` (${incident.triggerOther})` : '')) : 'Sin detonante adverso reportado'
          ),
          createBodyParagraph('[B] CONDUCTA OBSERVADA EN EL AULA', behaviorsText),
          createBodyParagraph('[C] CONSECUENCIA / PLAN REGULADOR FORMATIVO', regulatoryActionsText),

          // 4. ESTRATEGIAS Y RESPUESTAS REGULADORAS
          createSectionHeader('4. ESTRATEGIAS Y RESPUESTAS REGULADORAS RESTAURATIVAS'),
          createBodyParagraph(
            'Acuerdo Restaurativo y Reparación del Entorno',
            incident?.restorativeAgreement || 'El estudiante reafirma su compromiso de autorregulación y respeto al clima escolar.'
          ),
          createBodyParagraph(
            'Observaciones Pedagógicas y Seguimiento Docente',
            incident?.teacherObservations || 'Se acompaña al estudiante con diálogo asertivo y pautas de regulación emocional.'
          ),

          // 5. COMPROMISOS Y FIRMAS
          createSectionHeader('5. COMPROMISOS Y FIRMAS FORMALES'),
          new Paragraph({
            spacing: { before: 80, after: 180, line: 276 },
            children: [
              new TextRun({
                text: 'En constancia de lo registrado y como pacto solidario entre la familia y la Institución Educativa Denzil Escolar para garantizar el derecho a la educación en un ambiente de sana convivencia y afecto.',
                font: 'Arial',
                size: 20,
                italics: true,
                color: '334155',
              }),
            ],
          }),
          signaturesTable,
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export async function downloadDocxFile(options: ExportDocxOptions, filename?: string): Promise<void> {
  const blob = await generateOfficialDocxBlob(options);
  const studentCleanName = options.student.fullName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = options.incident?.date || options.dailyScore?.date || new Date().toISOString().split('T')[0];
  const name = filename || `TDR_DenzilEscolar_${studentCleanName}_${dateStr}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
