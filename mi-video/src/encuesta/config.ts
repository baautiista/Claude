/**
 * VÍDEO "Encuesta electoral InfoLinense" (20–25 s) para Reels, Facebook y TikTok.
 * Consulta voluntaria y anónima, no un sondeo representativo: el vídeo no muestra partidos,
 * candidatos ni porcentajes, y lo indica en pantalla.
 * Fotos reales de La Línea ya usadas en otros vídeos (costa/, plaza/). Si existe
 * public/encuesta/plaza-iglesia.jpg, se añade al montaje de identidad local.
 */
import type { EscenaGuion, Momento as MomentoGuion } from "../marca/guion";

export type EscenaId = "gancho" | "identidad" | "encuesta" | "exclusividad" | "cta";
export type Momento = MomentoGuion<EscenaId>;

export const URL_PANEL = "panel.infolinense.com";

export const ESCENAS: readonly EscenaGuion<EscenaId>[] = [
  { id: "gancho", nombre: "1. ¿A quién vas a votar?", inicio: 0, fin: 3, frases: ["¿A quién vas a votar?"] },
  { id: "identidad", nombre: "2. La Línea tiene voz", inicio: 3, fin: 7, frases: ["Queremos saber cómo votaría nuestra ciudad."] },
  { id: "encuesta", nombre: "3. La encuesta", inicio: 7, fin: 13, frases: ["Participa en la encuesta electoral de InfoLinense y cuéntanos qué votarías hoy."] },
  { id: "exclusividad", nombre: "4. Solo para vecinos", inicio: 13, fin: 18, frases: ["Solo para mayores de edad que residan en La Línea."] },
  { id: "cta", nombre: "5. Participa ahora", inicio: 18, fin: 25, frases: ["Entra en panel.infolinense.com y participa."] },
];

const m = (escena: EscenaId, frase: number, palabra?: string): Momento => ({ escena, frase, palabra });

export const MOMENTOS = {
  a: m("gancho", 0, "A"),
  quien: m("gancho", 0, "quién"),
  vas: m("gancho", 0, "vas"),
  votarG: m("gancho", 0, "votar"),
  ciudad: m("identidad", 0, "ciudad."),
  participa: m("encuesta", 0, "Participa"),
  cuentanos: m("encuesta", 0, "cuéntanos"),
  mayores: m("exclusividad", 0, "mayores"),
  residan: m("exclusividad", 0, "residan"),
  entra: m("cta", 0, "Entra"),
} satisfies Record<string, Momento>;

export const FOTOS = {
  identidad: ["costa/litoral-1-general.jpg", "plaza/actual-2.jpg", "encuesta/plaza-iglesia.jpg", "plaza/actual-3.jpg", "costa/litoral-3-poniente.jpg"],
  cta: "costa/litoral-1-general.jpg",
} as const;

export const PRONUNCIACION: Record<string, string> = {
  InfoLinense: "Info Linense",
  "panel.infolinense.com": "panel punto infolinense punto com,",
};

/** Voz habitual de InfoLinense (VOZ.vozPorDefecto y VOZ.ajustes de src/marca/voz.ts, sin cambios). */

/** Tiempos mínimos para que cada bloque se lea; el final deja la web en pantalla 3 s o más. */
export const DURACION_MINIMA_ESCENA: Record<string, number> = { gancho: 2.6, identidad: 4, encuesta: 5.8, exclusividad: 4.6 };
export const COLA_FINAL = 3.1;

export const AUDIO = {
  locucion: "encuesta/locucion.mp3",
  musica: "encuesta/musica.mp3",
  golpe: "encuesta/golpe.mp3",
  barrido: "encuesta/barrido.mp3",
  volumenMusica: 0.18,
  volumenEfectos: 0.45,
} as const;
