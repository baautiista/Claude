/** Ajustes de voz de InfoLinense para `npm run locucion`. */
export const VOZ = {
  modelo: "eleven_multilingual_v2",
  /** Voz por defecto de InfoLinense (se puede cambiar con ELEVENLABS_VOICE_ID). */
  vozPorDefecto: "syjZiIvIUSwKREBfMpKZ",
  ajustes: { stability: 0.5, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true, speed: 1.12 },
  /** Las pausas entre frases más largas que esto (s) se recortan a este valor. */
  pausaMaxima: 0.35,
  /** Silencio (s) que se deja al final tras la última frase. */
  colaFinal: 1.2,
} as const;
