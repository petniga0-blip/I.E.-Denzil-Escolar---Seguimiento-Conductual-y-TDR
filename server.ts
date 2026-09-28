import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());
// Ensure static public files (denzil.png, yacita.png, favicon) are served reliably
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Google GenAI if key is present
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

const SYSTEM_PROMPT_YACITA = `
Eres "Yacita", la compañera pedagógica y Asistente de IA de la Institución Educativa Denzil Escolar en Riohacha, La Guajira (Colombia).
Tu personalidad es amable, motivadora, cercana, profesional y empática, con frases cortas y algún emoji ocasional. Usas un trato respetuoso y cálido ("profe", "colegas", "familia"), reconociendo el contexto sociocultural de La Guajira y la diversidad en el aula.

Tus dos grandes funciones son:
1. Orientar en el uso integral de la aplicación escolar:
   - "1. Estudiantes": Registro de alumnos, asignación de grado y jornada, datos del acudiente (obligatorio para actas) y notas médicas/sensoriales previas.
   - "2. Matriz Grupal": Evaluación formativa diaria en 1 clic para 4 criterios (Turnos y Escucha, Permanencia en Actividad, Instrucciones, Materiales y Aula) usando 3★ Logrado (verde), 2★ En Proceso (ámbar) y 1★ Requiere Apoyo (rojo), con el botón ágil "Marcar Todos Logrado [✓]".
   - "3. Registro y TDR": Documentación pedagógica con el modelo A-B-C (Antecedente detonante, Conducta observable y Consecuencia restaurativa no punitiva).
   - "4. Reportes Oficiales": Generación de actas institucionales con el escudo oficial de la I.E. Denzil Escolar, descargas en Word (.docx) tamaño Carta, impresión PDF, síntesis formativa para acudientes, y sincronización con Google Drive y copias de seguridad .json.

2. Apoyo pedagógico de aula y justicia restaurativa:
   - Proponer estrategias prácticas para calmar desregulaciones, rabietas o ansiedad sin culpar ni castigar arbitrariamente.
   - Brindar adaptaciones para niños con necesidad de movimiento o sobrecarga sensorial.
   - Guiar en la redacción objetiva y propositiva para observadores escolares y tarjetas de reporte familiar (TDR).

Reglas críticas:
- Nunca inventes ni muestres datos privados de estudiantes que no estén en pantalla.
- Mantén respuestas claras, breves, prácticas y orientadas a la autorregulación.
`;

// Fallback Heuristics when AI Key is missing or offline
function fallbackRewrite(field: string, text: string, context?: any): string {
  const clean = text.trim();
  if (!clean) return '';

  if (field === 'antecedent') {
    return `Durante el desarrollo de la actividad pedagógica en el aula, se presentó una situación de tensión asociada a: "${clean}". Se evidenció dificultad momentánea en la adaptación al ritmo o instrucción de la jornada, requiriendo mediación docente.`;
  }
  if (field === 'behavior') {
    return `Se observó desregulación conductual manifestada en: "${clean}". El estudiante presentó dificultad para autorregular su respuesta frente a la situación, impactando temporalmente la dinámica de aprendizaje y la convivencia en el aula.`;
  }
  if (field === 'commitments' || field === 'agreements') {
    return `El estudiante se compromete a poner en práctica estrategias de respiración y pausa reflexiva ante momentos de frustración, buscando el apoyo del docente. Como acción formativa, participará activamente en el diálogo restaurativo y el cuidado de los materiales escolares compartidos.`;
  }

  return `En el marco del seguimiento pedagógico institucional, se registra: ${clean}. Se aborda con enfoque restaurativo orientado a la reflexión, reparación del clima de aula y fortalecimiento de habilidades socioemocionales.`;
}

function fallbackRestorativePlan(behaviorCategories: string[]): string[] {
  const suggestions: string[] = ['dialogo_restaurativo'];
  const text = behaviorCategories.join(' ').toLowerCase();

  if (text.includes('agresion') || text.includes('fisica') || text.includes('verbal')) {
    suggestions.push('pausa_sensorial');
    suggestions.push('recreo_mediado');
    suggestions.push('reparacion_simbolica');
  } else if (text.includes('distraccion') || text.includes('materiales') || text.includes('desobediencia')) {
    suggestions.push('reparacion_material');
    suggestions.push('rol_liderazgo');
    suggestions.push('tiempo_reflexion');
  } else {
    suggestions.push('tiempo_reflexion');
    suggestions.push('rol_liderazgo');
  }

  return Array.from(new Set(suggestions));
}

function fallbackParentSummary(studentName: string, scores: any, incidentText?: string): string {
  const name = studentName || 'El estudiante';
  if (incidentText) {
    return `Apreciada familia: Hoy ${name} participó en las actividades de la jornada escolar. Durante el día se presentó un momento puntual de desregulación (${incidentText.slice(0, 80)}...), el cual fue acompañado pedagógicamente por su docente mediante diálogo formativo y estrategias de calma. Reconocemos su disposición para reflexionar y asumir acuerdos. Les invitamos a reforzar en casa la escucha atenta y la expresión asertiva de sus emociones para continuar su progreso integral.`;
  }
  return `Apreciada familia: Felicitamos a ${name} por su desempeño y convivencia durante la jornada de hoy en la I.E. Denzil Escolar. Cumplió satisfactoriamente con los acuerdos del aula, mostrando respeto hacia sus compañeros y dedicación en sus labores escolares. Los animamos a seguir fortaleciendo estos valiosos hábitos formativos desde el hogar.`;
}

// API Routes
app.post('/api/yacita/rewrite', async (req: Request, res: Response) => {
  const { text, field, context } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (aiClient) {
    try {
      const prompt = `
Contexto: Campo "${field || 'general'}" del seguimiento pedagógico en I.E. Denzil Escolar.
Estudiante: ${context?.studentName || 'Estudiante'} (Grado ${context?.grade || 'primaria'}).
Notas informales del docente: "${text}"

Tarea: Reescribe este texto para convertirlo en un registro pedagógico formal, objetivo, respetuoso y con enfoque formativo y restaurativo (sin culpar ni estigmatizar, describiendo hechos observables y sugerencias formativas).
Devuelve ÚNICAMENTE el texto mejorado sin comillas ni encabezados adicionales.
`;
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT_YACITA,
          temperature: 0.3,
        },
      });

      const rewritten = response.text?.trim();
      if (rewritten) {
        return res.json({ rewritten, source: 'gemini' });
      }
    } catch (err) {
      console.warn('Gemini rewrite error, falling back to heuristic:', err);
    }
  }

  // Fallback
  const rewritten = fallbackRewrite(field, text, context);
  return res.json({ rewritten, source: 'heuristic' });
});

app.post('/api/yacita/suggest-consequences', async (req: Request, res: Response) => {
  const { behaviors, description } = req.body;
  const behaviorList = Array.isArray(behaviors) ? behaviors : [];

  if (aiClient && (behaviorList.length > 0 || description)) {
    try {
      const prompt = `
Conductas observadas: ${behaviorList.join(', ')}
Descripción adicional: ${description || 'Ninguna'}

Opciones disponibles en el sistema formativo de la I.E. Denzil Escolar:
- pausa_sensorial: "Pausa Sensorial en Rincón de la Calma"
- dialogo_restaurativo: "Diálogo Restaurativo Docente-Estudiante"
- reparacion_simbolica: "Reparación Simbólica o Disculpa Guiada"
- reparacion_material: "Reparación del Material o Espacio del Aula"
- recreo_mediado: "Recreo Mediado con Actividad Estructurada"
- tiempo_reflexion: "Tiempo de Reflexión Escrita o Dibujada"
- rol_liderazgo: "Asignación de Rol de Liderazgo Formativo"

Tarea: Selecciona entre 2 y 4 códigos de las opciones anteriores que formen el mejor plan restaurativo y formativo para esta situación.
Devuelve un JSON array de strings con los códigos exactos seleccionados (ej: ["pausa_sensorial", "dialogo_restaurativo"]).
`;
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT_YACITA,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.json({ suggestions: parsed, source: 'gemini' });
        }
      }
    } catch (err) {
      console.warn('Gemini consequence suggestion error, using fallback:', err);
    }
  }

  const suggestions = fallbackRestorativePlan(behaviorList);
  return res.json({ suggestions, source: 'heuristic' });
});

app.post('/api/yacita/parent-summary', async (req: Request, res: Response) => {
  const { studentName, scores, incidentDescription, commitments } = req.body;

  if (aiClient) {
    try {
      const prompt = `
Genera la síntesis diaria formativa para los padres de familia / acudiente del estudiante:
Nombre: ${studentName || 'Estudiante'}
Puntajes de convivencia del día: ${JSON.stringify(scores || {})}
Incidencia o situación observada: ${incidentDescription || 'Jornada regular sin desregulaciones mayores'}
Acuerdos y compromisos: ${commitments || 'Seguir trabajando en equipo y respeto de turnos'}

Requisitos:
- Un solo párrafo cálido, formal, empático y propositivo (80-120 palabras).
- Equilibra los llamados de atención formativos con los logros y fortalezas del alumno.
- Invita a la familia a reforzar con amor y diálogo en el hogar.
- No uses etiquetas negativas hacia el estudiante.
Devuelve ÚNICAMENTE el texto del párrafo.
`;
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT_YACITA,
          temperature: 0.4,
        },
      });

      const summary = response.text?.trim();
      if (summary) {
        return res.json({ summary, source: 'gemini' });
      }
    } catch (err) {
      console.warn('Gemini parent summary error, using fallback:', err);
    }
  }

  const summary = fallbackParentSummary(studentName, scores, incidentDescription);
  return res.json({ summary, source: 'heuristic' });
});

app.post('/api/yacita/chat', async (req: Request, res: Response) => {
  const { message, history } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (aiClient) {
    try {
      const prompt = `
Consulta docente: "${message}"
Responde en 2 o 3 párrafos concisos con estrategias pedagógicas prácticas, aplicables de inmediato en el aula de clases con enfoque formativo de la I.E. Denzil Escolar.
`;
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT_YACITA,
          temperature: 0.5,
        },
      });

      const reply = response.text?.trim();
      if (reply) {
        return res.json({ reply, source: 'gemini' });
      }
    } catch (err) {
      console.warn('Gemini chat error, falling back:', err);
    }
  }

  // Pre-configured pedagogical knowledge base
  const lower = message.toLowerCase();
  let reply = '';
  if (lower.includes('calmar') || lower.includes('llanto') || lower.includes('rabieta')) {
    reply = `Para acompañar una rabieta o llanto en el aula:
1. **Validación y Espacio Seguro**: Acércate con voz pausada y baja a la altura de sus ojos. Valida su emoción: "Veo que estás frustrado y está bien sentirlo; estoy aquí para cuidarte".
2. **Pausa Sensorial**: Ofrécele ir al "Rincón de la Calma" para tomar agua, usar una pelota antiestrés o hacer respiraciones guiadas (técnica de oler la flor y soplar la vela).
3. **Diálogo posterior**: Nunca intentes razonar en el pico del desborde. Espera a que el ritmo cardíaco se normalice antes de dialogar sobre lo sucedido.`;
  } else if (lower.includes('hiperactividad') || lower.includes('motriz') || lower.includes('quieto') || lower.includes('moverse')) {
    reply = `Estrategias para alumnos con alta necesidad de movimiento:
1. **Pausas activas y roles de aula**: asígnale tareas dinámicas como repartir cuadernos, borrar el tablero o llevar mensajes.
2. **Apoyo propioceptivo**: Permite apoyos de movimiento sutil (cojín de balance, bandas elásticas en las patas de la silla o plastilina terapéutica).
3. **Estructura visual**: Divide las guías largas en bloques de 15 minutos con micro-descansos entre actividades.`;
  } else if (lower.includes('culpabilizar') || lower.includes('sin culpar') || lower.includes('registro')) {
    reply = `Claves para registrar incidentes con enfoque formativo y restaurativo:
1. **Describe conductas observables, no juicios**: En lugar de "es agresivo y grosero", escribe "presentó desregulación verbal e interrumpió la explicación".
2. **Identifica el detonante (A)**: Registra qué ocurrió justo antes (ej: cambio de actividad, ruido excesivo, cansancio).
3. **Enfoca la consecuencia en la reparación (C)**: Plantea acuerdos y compromisos orientados a restaurar la relación con los compañeros o el cuidado de los materiales, evitando castigos arbitrarios.`;
  } else if (lower.includes('exportar') || lower.includes('word') || lower.includes('drive') || lower.includes('descargar') || lower.includes('reporte')) {
    reply = `Para generar y exportar tus actas y reportes:
1. Dirígete a la pestaña **«4. Reportes Oficiales»** o pulsa el botón **«TDR»** en cualquier estudiante.
2. Selecciona la fecha y la incidencia o evaluación del día.
3. Puedes pulsar **«Descargar Word (.docx)»** para obtener un documento editable en tamaño Carta con membrete oficial, o **«Guardar en Google Drive»** para sincronizarlo en la nube con tu cuenta institucional.`;
  } else if (lower.includes('estudiante') || lower.includes('matricular') || lower.includes('registrar alumno')) {
    reply = `Para registrar o gestionar estudiantes:
1. Ve a la pestaña **«1. Estudiantes»** y pulsa el botón azul **«Registrar Nuevo Estudiante»**.
2. Ingresa el nombre completo, grado y jornada.
3. El nombre del **acudiente** es obligatorio para las actas formales. En **«Observación Médica / Sensorial»** consigna recomendaciones de visión, pausas motoras o sensibilidades que ayuden a acompañar al alumno con amor.`;
  } else if (lower.includes('matriz') || lower.includes('estrella') || lower.includes('calificar') || lower.includes('evaluar')) {
    reply = `Uso de la Matriz Grupal en 1 Clic:
1. En la pestaña **«2. Matriz Grupal»** evalúas los 4 criterios de convivencia diaria.
2. Usa **3★ Logrado (verde)** para autorregulación óptima, **2★ En Proceso (ámbar)** cuando requiere recordatorios, y **1★ Requiere Apoyo (rojo)** ante desregulaciones.
3. ¡Tip pro!: Pulsa **«Marcar Todos Logrado [✓]»** al iniciar para calificar al grupo y luego afinar solo los estudiantes que requirieron acompañamiento especial.`;
  } else if (lower.includes('abc') || lower.includes('tdr') || lower.includes('incidencia')) {
    reply = `Enfoque Formativo A-B-C en el aula:
1. **[A] Antecedente**: ¿Qué detonó la situación? (ruido, cambio de clase, frustración con un ejercicio).
2. **[B] Conducta**: Hechos observables y neutrales sin etiquetas estigmatizantes.
3. **[C] Consecuencia / Plan Regulador**: Pausa sensorial en el rincón de la calma, diálogo restaurativo o reparación del material. ¡Usa mi botón «✨ Mejorar redacción» para pulir el texto al instante!`;
  } else {
    reply = `Como compañera pedagógica en la I.E. Denzil Escolar, te sugiero abordar esta situación desde el modelo formativo A-B-C:
1. Identifica qué necesidad no satisfecha o estímulo ambiental está detonando la respuesta del estudiante.
2. Brinda alternativas de autorregulación inmediatas en el salón de clase.
3. Establece compromisos restaurativos con metas alcanzables a corto plazo y celebra sus pequeños logros diarios.`;
  }

  return res.json({ reply, source: 'heuristic' });
});

// TTS Endpoint (Optional premium voice powered by Gemini TTS, Kore prebuilt voice)
app.post('/api/yacita/tts', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.slice(0, 300),
                speechMetadata: {
                  style: 'Warm, clear, pedagogical Colombian female teacher voice',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audio) {
        return res.json({ audio, mimeType: 'audio/pcm;rate=24000', source: 'gemini' });
      }
    } catch (err) {
      console.warn('Gemini TTS error (will fallback to browser Web Speech API):', err);
    }
  }

  return res.status(503).json({ error: 'Server TTS unavailable' });
});

// Setup dev server with Vite middleware or static serve in prod
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
