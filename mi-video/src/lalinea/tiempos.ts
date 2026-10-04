import type { Caption } from "@remotion/captions";
import { ESCENAS, FPS, SUBTITULOS, type EscenaId } from "./config";

export type FraseTemporizada = {
  readonly texto: string;
  readonly inicio: number;
  readonly fin: number;
};

export const getEscena = (id: EscenaId) => {
  const escena = ESCENAS.find((e) => e.id === id);
  if (!escena) {
    throw new Error(`Escena no encontrada: ${id}`);
  }
  return escena;
};

export const duracionTotal = () =>
  Math.round(ESCENAS[ESCENAS.length - 1].fin * FPS);

export const aFrames = (segundos: number) => Math.round(segundos * FPS);

/** Calcula inicio/fin (segundos absolutos) de cada frase de una escena. */
export const frasesTemporizadas = (id: EscenaId): FraseTemporizada[] => {
  const escena = getEscena(id);
  const textos = escena.frases.map((f) => (typeof f === "string" ? f : f.texto));
  const fijos = escena.frases.map((f) =>
    typeof f === "string" ? null : f.inicio,
  );

  const inicios: number[] = [];
  let i = 0;
  while (i < textos.length) {
    const desde = fijos[i] ?? (i === 0 ? escena.inicio : inicios[i - 1]);
    // Busca el siguiente ancla (inicio fijo o fin de escena)
    let j = i + 1;
    while (j < textos.length && fijos[j] === null) {
      j++;
    }
    const hasta = j < textos.length ? (fijos[j] as number) : escena.fin;
    const grupo = textos.slice(i, j);
    const total = grupo.reduce((acc, t) => acc + t.length, 0);
    let t = desde;
    for (let k = 0; k < grupo.length; k++) {
      inicios[i + k] = t;
      t += ((hasta - desde) * grupo[k].length) / total;
    }
    i = j;
  }

  return textos.map((texto, k) => ({
    texto,
    inicio: inicios[k],
    fin: k + 1 < textos.length ? inicios[k + 1] : escena.fin,
  }));
};

/** Momento (en frames, relativo al inicio de la escena) en que empieza cada frase. */
export const beatsDeEscena = (id: EscenaId): number[] => {
  const escena = getEscena(id);
  return frasesTemporizadas(id).map((f) => aFrames(f.inicio - escena.inicio));
};

/**
 * Genera subtítulos palabra a palabra a partir del guion.
 * Cada palabra recibe un tiempo proporcional a su longitud dentro de su frase.
 * Las frases se dividen en bloques cortos (`pageBreakAfter`).
 */
export const subtitulosDesdeGuion = (): Caption[] => {
  const captions: Caption[] = [];
  for (const escena of ESCENAS) {
    for (const frase of frasesTemporizadas(escena.id)) {
      const palabras = frase.texto.split(/\s+/).filter(Boolean);
      const pesos = palabras.map((p) => p.length + 1);
      const total = pesos.reduce((a, b) => a + b, 0);
      // Deja un pequeño respiro al final de cada frase
      const duracion = (frase.fin - frase.inicio) * 0.94;
      let t = frase.inicio;
      let caracteresEnBloque = 0;
      palabras.forEach((palabra, k) => {
        const dur = (duracion * pesos[k]) / total;
        caracteresEnBloque += palabra.length + 1;
        const siguiente = palabras[k + 1];
        const finDeFrase = k === palabras.length - 1;
        const terminaEnPausa = /[,.:;…?!]$/.test(palabra);
        const bloqueLleno =
          siguiente !== undefined &&
          caracteresEnBloque + siguiente.length > SUBTITULOS.maxCaracteres;
        const pageBreakAfter =
          finDeFrase ||
          bloqueLleno ||
          (terminaEnPausa && caracteresEnBloque > 12);
        if (pageBreakAfter) {
          caracteresEnBloque = 0;
        }
        captions.push({
          text: (k === 0 ? "" : " ") + palabra,
          startMs: Math.round(t * 1000),
          endMs: Math.round((t + dur) * 1000),
          timestampMs: Math.round((t + dur / 2) * 1000),
          confidence: null,
          pageBreakAfter,
        });
        t += dur;
      });
    }
  }
  return captions;
};
