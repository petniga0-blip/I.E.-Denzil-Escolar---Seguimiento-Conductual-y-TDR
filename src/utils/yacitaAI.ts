/**
 * Client service to communicate with Yacita AI pedagogical endpoints.
 * Includes direct offline heuristic fallbacks so that teaching staff in
 * rural or low-connectivity zones never experience outages or blocked forms.
 */

export interface RewriteContext {
  studentName?: string;
  grade?: string;
}

export interface ParentSummaryPayload {
  studentName: string;
  scores?: {
    c1?: number;
    c2?: number;
    c3?: number;
    c4?: number;
  };
  incidentDescription?: string;
  commitments?: string;
}

export async function rewriteTextWithYacita(
  text: string,
  field: 'antecedent' | 'behavior' | 'commitments' | 'general',
  context?: RewriteContext
): Promise<string> {
  if (!text.trim()) return '';

  try {
    const res = await fetch('/api/yacita/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, field, context }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.rewritten) return data.rewritten;
    }
  } catch (err) {
    console.warn('Network error calling Yacita API, applying client-side pedagogical heuristic:', err);
  }

  // Client-side fallback if server unreachable
  const clean = text.trim();
  if (field === 'antecedent') {
    return `Durante el desarrollo de la jornada escolar, se identificó como detonante: "${clean}". Se evidenció sobrecarga o dificultad en la transición de la actividad pedagógica, requiriendo mediación oportuna.`;
  }
  if (field === 'behavior') {
    return `Se observó desregulación conductual manifestada en: "${clean}". El estudiante presentó dificultad momentánea para autorregular su respuesta frente al entorno, afectando transitoriamente la convivencia en el aula.`;
  }
  if (field === 'commitments') {
    return `El estudiante asume el compromiso formativo de emplear técnicas de respiración y pausa reflexiva ante la frustración, acudiendo a la guía del docente y participando activamente en la reparación armónica del clima escolar.`;
  }

  return `En el marco del acompañamiento pedagógico formativo: ${clean}. Se aborda con enfoque de justicia restaurativa, escucha activa y fortalecimiento socioemocional.`;
}

export async function suggestRestorativePlanWithYacita(
  behaviors: string[],
  description?: string
): Promise<string[]> {
  try {
    const res = await fetch('/api/yacita/suggest-consequences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ behaviors, description }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        return data.suggestions;
      }
    }
  } catch (err) {
    console.warn('Network error in consequence suggestion, applying heuristic:', err);
  }

  // Heuristic rule engine
  const suggestions: string[] = ['dialogo_restaurativo'];
  const joined = (behaviors.join(' ') + ' ' + (description || '')).toLowerCase();

  if (joined.includes('agresion') || joined.includes('golpe') || joined.includes('pego') || joined.includes('insulto')) {
    suggestions.push('pausa_sensorial');
    suggestions.push('recreo_mediado');
    suggestions.push('reparacion_simbolica');
  } else if (joined.includes('tarea') || joined.includes('material') || joined.includes('tijera') || joined.includes('cuaderno')) {
    suggestions.push('reparacion_material');
    suggestions.push('rol_liderazgo');
  } else {
    suggestions.push('tiempo_reflexion');
    suggestions.push('rol_liderazgo');
  }

  return Array.from(new Set(suggestions));
}

export async function generateParentSummaryWithYacita(
  payload: ParentSummaryPayload
): Promise<string> {
  try {
    const res = await fetch('/api/yacita/parent-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.summary) return data.summary;
    }
  } catch (err) {
    console.warn('Network error in parent summary, applying heuristic:', err);
  }

  const name = payload.studentName || 'El estudiante';
  if (payload.incidentDescription) {
    return `Apreciada familia: Hoy ${name} participó en la jornada escolar en la I.E. Denzil Escolar. Se presentó una situación puntual de aprendizaje conductual (${payload.incidentDescription.slice(0, 75)}...), la cual fue orientada con diálogo pedagógico y estrategias de calma. Resaltamos su disposición para reflexionar y asumir acuerdos. Los invitamos a seguir apoyando desde casa la gestión asertiva de sus emociones para su continuo bienestar y progreso.`;
  }

  return `Apreciada familia: Felicitamos a ${name} por su excelente actitud y convivencia en la jornada escolar de hoy en la I.E. Denzil Escolar. Cumplió satisfactoriamente con los acuerdos del aula, mostrando respeto y compromiso. Agradecemos su constante apoyo desde el hogar en este proceso formativo integral.`;
}

export async function chatWithYacita(
  message: string,
  history?: Array<{ role: 'user' | 'assistant'; text: string }>
): Promise<string> {
  try {
    const res = await fetch('/api/yacita/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.reply) return data.reply;
    }
  } catch (err) {
    console.warn('Network error in chat, using offline response:', err);
  }

  const lower = message.toLowerCase();
  if (lower.includes('calmar') || lower.includes('llanto') || lower.includes('rabieta')) {
    return `Para acompañar una rabieta o llanto en el aula:
1. **Validación y Espacio Seguro**: Acércate con voz pausada a la altura de sus ojos. Valida su emoción: "Veo que estás molesto y es válido; aquí estás seguro".
2. **Pausa Sensorial**: Invítalo al "Rincón de la Calma" para tomar agua, usar una pelota antiestrés o hacer respiraciones conscientes.
3. **Diálogo reflexivo posterior**: Espera a que baje la activación fisiológica antes de hablar de lo sucedido y construir acuerdos.`;
  }
  if (lower.includes('hiperactividad') || lower.includes('motriz') || lower.includes('quieto')) {
    return `Sugerencias para niños con necesidad de movimiento constante:
1. **Pausas activas funcionales**: Asígnale tareas de movimiento dentro del aula (repartir guías, limpiar el tablero).
2. **Apoyos propioceptivos**: Permite que use bandas elásticas en las patas de la silla o pequeñas pelotas antiestrés en la mano mientras escucha.
3. **Metas fragmentadas**: Divide las actividades en bloques cortos de 15 a 20 minutos con refuerzo positivo al completar cada etapa.`;
  }
  if (lower.includes('culpabilizar') || lower.includes('sin culpar') || lower.includes('registro')) {
    return `Claves para un registro restaurativo y no estigmatizante:
1. **Hechos concretos, no juicios**: En lugar de calificar al niño, describe la conducta observable ("arrojó el lápiz al piso" en vez de "es grosero").
2. **Identifica el antecedente**: Registra qué ocurrió antes (ruido, fatiga, cambio de actividad) para prevenir futuras desregulaciones.
3. **Consecuencias reparadoras**: Enfoca el cierre en reparar la relación o el material, no en castigos que generen resentimiento.`;
  }

  return `Como compañera pedagógica en la I.E. Denzil Escolar, te recomiendo analizar el detonante ambiental o emocional (A), registrar la conducta con neutralidad (B) y acompañar con una consecuencia restaurativa y formativa (C) que empodere al estudiante en su autorregulación.`;
}
