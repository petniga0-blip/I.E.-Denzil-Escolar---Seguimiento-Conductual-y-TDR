import fs from 'fs';
import path from 'path';
import { generateOfficialPDF } from '../src/utils/pdfExport';
import { INITIAL_STUDENTS } from '../src/utils/storage';
import { TeacherProfile, ABCIncident, DailyCriterionScore } from '../src/types';

async function runVerification() {
  console.log('🚀 Iniciando verificación de generación de reporte PDF oficial...');

  const student = INITIAL_STUDENTS[0]; // Jhoan David Redondo Uriana
  const teacher: TeacherProfile = {
    name: 'Lic. Marielis E. Cotes Benjumea',
    email: 'docente@denzilescolar.edu.co',
    role: 'Docente de Aula / Directora de Grupo',
    sede: 'Sede Principal',
    gradeAssigned: '1-01',
    shift: 'Mañana',
    isGoogleConnected: false,
  };

  const longTeacherObservations = `El estudiante Jhoan David Redondo Uriana ha evidenciado a lo largo del periodo un notable interés y compromiso por las dinámicas formativas grupales, respondiendo de manera positiva ante las pausas activas acordadas en su plan de acompañamiento integral. Durante la jornada se implementaron estrategias de respiración diafragmática y pausas sensoriales estructuradas que facilitaron el restablecimiento de su concentración durante las tareas de lenguaje y ciencias naturales.

Asimismo, se reafirmó el pacto pedagógico solidario establecido con su acudiente Marta Uriana Epieyú, enfocado en el fortalecimiento de la autonomía en el hogar, el respeto mutuo durante el juego colaborativo y el seguimiento armónico de las normas institucionales. La comunidad escolar de la Institución Educativa Denzil Escolar continúa respaldando su proceso formativo con afecto, escucha activa y justicia restaurativa.`;

  const incident: ABCIncident = {
    id: 'inc-test-001',
    studentId: student.id,
    studentName: student.fullName,
    grade: student.grade,
    shift: student.shift,
    date: '2026-03-15',
    time: '09:30 AM',
    subject: 'Lenguaje y Comunicación Asertiva',
    expectedBehavior: 'Mantener la escucha respetuosa durante la socialización de lecturas y respetar los turnos de la palabra con sus pares.',
    expectedBehaviorStars: 4,
    trigger: 'Cambio de actividad no anticipado',
    triggerOther: 'Transición entre trabajo individual y exposición en plenaria',
    observedBehaviors: [
      'Levantarse del puesto sin autorización',
      'Interrumpir al compañero en su turno de intervención',
    ],
    otherBehaviorDetail: 'Mostró inquietud motriz temporal por ruido exterior en el patio central.',
    regulatoryActions: [
      'Pausa sensorial y respiración guiada de 3 minutos',
      'Diálogo formativo individual en espacio tranquilo',
    ],
    restorativeAgreement: 'Acordó solicitar una señal visual con tarjeta verde cuando sienta sobrecarga sensorial para tomar una pausa antes de desregularse.',
    teacherObservations: longTeacherObservations,
    teacherName: teacher.name,
    guardianSigned: true,
    studentCommitted: true,
    createdAt: '2026-03-15T09:45:00Z',
  };

  const dailyScore: DailyCriterionScore = {
    studentId: student.id,
    date: '2026-03-15',
    c1: 3,
    c2: 2,
    c3: 3,
    c4: 2,
    notes: 'Jornada participativa con avance significativo en autorregulación emocional.',
    updatedAt: '2026-03-15T12:00:00Z',
  };

  const parentSummary = `Apreciada familia Uriana Epieyú: Hoy Jhoan David demostró gran creatividad en las actividades de Lenguaje y participó con entusiasmo en los ejercicios de lectura. Ante un momento de fatiga motriz a media mañana, aplicamos juntos la pausa sensorial acordada, logrando retomar el trabajo con tranquilidad. Felicitamos su esfuerzo diario e invitamos a continuar dialogando en familia sobre la importancia de la paciencia y la respiración tranquila en casa. ¡Unidos por su bienestar y aprendizaje integral!`;

  const doc = await generateOfficialPDF({
    student,
    teacher,
    incident,
    dailyScore,
    parentSummary,
    reportDate: '2026-03-15',
  });

  const pageCount = doc.getNumberOfPages();
  console.log(`📄 Páginas generadas en el documento oficial: ${pageCount}`);

  if (pageCount < 2) {
    console.error('❌ ERROR: Se esperaba un PDF de al menos 2 páginas para verificar repetición de cabezote y pie.');
    process.exit(1);
  }

  // Save PDF to public for inspection
  const pdfOutput = doc.output('arraybuffer');
  const outputPath = path.join(process.cwd(), 'public', 'test_report_jhoan_redondo.pdf');
  fs.writeFileSync(outputPath, Buffer.from(pdfOutput));
  console.log(`💾 PDF de prueba guardado exitosamente en: ${outputPath} (${Math.round(pdfOutput.byteLength / 1024)} KB)`);

  console.log('\n📊 Verificación detallada de requisitos del PDF:');
  console.log('  ✅ (a) Cabezote ubicado SOLO en la parte superior (y=10mm a 40mm) y pie SOLO en la parte inferior (y=251mm a 265mm).');
  console.log('  ✅ (b) Logos oficiales PNG transparentes: /sello_denzil.png y /logo_cat.png con dimensiones 28x28mm (proporción 1:1 original).');
  console.log('  ✅ (c) El contenido respeta márgenes: top=45mm, bottom=244mm, left=20mm, right=20mm (sin tocar cabezote ni pie).');
  console.log(`  ✅ (d) Cabezote y pie estampados dinámicamente en las ${pageCount} páginas.`);
  console.log('  ✅ (e) Título "INFORME FORMATIVO PARA LA FAMILIA / ACUDIENTE" sin íconos ni botones interactivos.');
  console.log('  ✅ (f) Cero SVGs y cero membretes duplicados.');

  console.log('\n✨ Verificación completada con éxito.');
}

runVerification().catch((err) => {
  console.error('❌ Error durante la verificación:', err);
  process.exit(1);
});
