// src/utils/yacitaVoiceEngine.ts
// Voice synthesis engine for Yacita Pedagogical Coach.
// Web Speech API (Local Spanish Female) + Gemini TTS (fallback) with strict privacy rules.

import { cleanTextForVoice } from '../config/yacitaMensajes';

export interface SpanishVoiceInfo {
  name: string;
  lang: string;
  voiceURI: string;
  isFemale: boolean;
  isPreferred: boolean;
}

// Memory cache for pre-synthesized fixed phrases
const audioCache = new Map<string, ArrayBuffer>();

// Current active playback state
let activeAudioSource: AudioBufferSourceNode | null = null;
let activeAudioContext: AudioContext | null = null;
let mouthAnimationInterval: NodeJS.Timeout | null = null;
let isCurrentlySpeaking = false;

// Positive female indicators
const FEMALE_VOICE_INDICATORS = [
  'salome', 'dalia', 'paulina', 'sabina', 'elvira', 'helena', 'paloma',
  'mónica', 'monica', 'sofia', 'lucia', 'laura', 'carmen', 'female',
  'mujer', 'femenina', 'natural', 'online', 'google',
];

// Negative male indicators to strictly avoid
const MALE_VOICE_INDICATORS = [
  'jorge', 'pablo', 'diego', 'raul', 'carlos', 'álvaro', 'alvaro',
  'david', 'enrique', 'manuel', 'mateo', 'male', 'hombre', 'masculino',
];

export function isFemaleSpanishVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  // If explicitly male, exclude
  if (MALE_VOICE_INDICATORS.some((m) => name.includes(m))) {
    return false;
  }
  // If explicitly female or standard Spanish
  if (FEMALE_VOICE_INDICATORS.some((f) => name.includes(f))) {
    return true;
  }
  // Default to true if not male, but give lower priority
  return true;
}

export function getAvailableSpanishVoices(): SpanishVoiceInfo[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  const voices = window.speechSynthesis.getVoices();
  const spanishVoices = voices.filter(
    (v) => v.lang.startsWith('es') || v.lang.includes('Spanish') || v.lang.includes('ES')
  );

  return spanishVoices.map((v) => {
    const isFemale = isFemaleSpanishVoice(v);
    const nameLower = v.name.toLowerCase();
    const isPreferred =
      (v.lang === 'es-CO' || v.lang === 'es-US' || v.lang === 'es-419') &&
      FEMALE_VOICE_INDICATORS.some((f) => nameLower.includes(f));

    return {
      name: v.name,
      lang: v.lang,
      voiceURI: v.voiceURI,
      isFemale,
      isPreferred,
    };
  });
}

export function pickBestSpanishFemaleVoice(
  preferredUri?: string
): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  const spanish = voices.filter(
    (v) => v.lang.startsWith('es') || v.lang.includes('Spanish')
  );

  if (spanish.length === 0) return null;

  // 1. If user selected a specific URI, check if it matches
  if (preferredUri) {
    const matched = spanish.find((v) => v.voiceURI === preferredUri);
    if (matched) return matched;
  }

  // 2. Filter candidate female voices (excluding known male names)
  const femaleCandidates = spanish.filter((v) => isFemaleSpanishVoice(v));
  const pool = femaleCandidates.length > 0 ? femaleCandidates : spanish;

  // 3. Priority by dialect: es-CO > es-US > es-MX > es-419 > es-ES
  const dialects = ['es-CO', 'es-US', 'es-MX', 'es-419', 'es-ES'];

  for (const dialect of dialects) {
    const dialectMatches = pool.filter(
      (v) => v.lang.toLowerCase() === dialect.toLowerCase()
    );
    if (dialectMatches.length > 0) {
      // Prefer neural / natural voices
      const preferred = dialectMatches.find((v) =>
        FEMALE_VOICE_INDICATORS.some((f) => v.name.toLowerCase().includes(f))
      );
      if (preferred) return preferred;
      return dialectMatches[0];
    }
  }

  // Fallback to first available Spanish voice
  return pool[0] || spanish[0];
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  if (activeAudioSource) {
    try {
      activeAudioSource.stop();
    } catch {
      // ignore
    }
    activeAudioSource = null;
  }

  if (mouthAnimationInterval) {
    clearInterval(mouthAnimationInterval);
    mouthAnimationInterval = null;
  }

  isCurrentlySpeaking = false;
}

export interface SpeakOptions {
  voiceUri?: string;
  rate?: number; // default 1.1
  pitch?: number; // default 1.05
  volume?: number; // default 1.0
  containsPersonalData?: boolean;
  onMouthToggle?: (isSpeakingMouth: boolean) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

// Convert base64 PCM 24kHz to AudioBuffer
async function decodePcm24k(
  base64Audio: string,
  audioCtx: AudioContext
): Promise<AudioBuffer> {
  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 16-bit PCM mono @ 24000Hz
  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768;
  }

  const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
  audioBuffer.copyToChannel(float32Array, 0);
  return audioBuffer;
}

export async function speakYacita(
  text: string,
  options: SpeakOptions = {}
): Promise<void> {
  stopSpeaking();

  const cleanText = cleanTextForVoice(text);
  if (!cleanText) return;

  const {
    voiceUri,
    rate = 1.1,
    pitch = 1.05,
    volume = 1.0,
    containsPersonalData = false,
    onMouthToggle,
    onStart,
    onEnd,
    onError,
  } = options;

  isCurrentlySpeaking = true;

  // Setup mouth animation (alternates mouth every 220ms, respects prefers-reduced-motion)
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let mouthOpen = true;
  const startMouth = () => {
    onStart?.();
    if (!prefersReducedMotion && onMouthToggle) {
      onMouthToggle(true);
      mouthAnimationInterval = setInterval(() => {
        mouthOpen = !mouthOpen;
        onMouthToggle(mouthOpen);
      }, 220);
    } else if (onMouthToggle) {
      onMouthToggle(true);
    }
  };

  const endMouth = () => {
    stopSpeaking();
    onMouthToggle?.(false);
    onEnd?.();
  };

  // PRIVACY RULE: If text contains student personal data, NEVER send to server.
  const canUseServerTts = !containsPersonalData && cleanText.length < 250;

  if (canUseServerTts && typeof window !== 'undefined' && 'fetch' in window) {
    try {
      // 2-second timeout race against local speech
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch('/api/yacita/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.audio) {
          if (!activeAudioContext) {
            activeAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
              sampleRate: 24000,
            });
          }
          if (activeAudioContext.state === 'suspended') {
            await activeAudioContext.resume();
          }

          const buffer = await decodePcm24k(data.audio, activeAudioContext);
          const source = activeAudioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(activeAudioContext.destination);

          source.onended = () => {
            endMouth();
          };

          activeAudioSource = source;
          startMouth();
          source.start(0);
          return;
        }
      }
    } catch {
      // Fallback silently to browser SpeechSynthesis
    }
  }

  // Browser SpeechSynthesis (reliable local engine)
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }

  try {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const chosenVoice = pickBestSpanishFemaleVoice(voiceUri);

    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    } else {
      utterance.lang = 'es-CO';
    }

    utterance.rate = Math.max(0.8, Math.min(1.5, rate));
    utterance.pitch = Math.max(0.8, Math.min(1.4, pitch));
    utterance.volume = Math.max(0, Math.min(1, volume));

    utterance.onstart = () => {
      startMouth();
    };

    utterance.onend = () => {
      endMouth();
    };

    utterance.onerror = (e) => {
      stopSpeaking();
      onMouthToggle?.(false);
      onError?.(e);
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    stopSpeaking();
    onMouthToggle?.(false);
    onError?.(err);
    onEnd?.();
  }
}
