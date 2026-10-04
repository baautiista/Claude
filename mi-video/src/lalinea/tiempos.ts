import type { Caption } from "@remotion/captions";
import {
  ELEVENLABS,
  ESCENAS,
  FIRMA_SEGUNDOS,
  FPS,
  SUBTITULOS,
  type EscenaId,
  type Momento,
} from "./config";
import datosLocucion from "./locucion-tiempos.json";

/** Tiempos exactos de la locución generada con ElevenLabs (si existe). */
type PalabraMedida = { readonly inicio: number; readonly fin: number };
type FraseMedida = PalabraMedida & { readonly palabras: PalabraMedida[] };
type DatosLocucion = {
  readonly frases: Record<string, FraseMedida[]> | null;
};
const medidos = (datosLocucion as DatosLocucion).frases;

export type PalabraTemporizada = {
  readonly texto: string;
  readonly inicio: number;
  readonly fin: number;
};

export type FraseTemporizada = {
  readonly texto: string;
  readonly inicio: number;
  readonly fin: number;
  readonly palabras: PalabraTemporizada[];
};

type EscenaTemporizada = {
  readonly id: EscenaId;
  readonly inicio: number;
  readonly fin: number;
  readonly frases: FraseTemporizada[];
};

export const aFrames = (segundos: number) => Math.round(segundos * FPS);

const textoDe = (f: (typeof ESCENAS)[number]["frases"][number]) =>
  typeof f === "string" ? f : f.texto;

const normalizar = (palabra: string) =>
  palabra
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]/g, "");

/** Reparte el tiempo de una frase entre sus palabras según su longitud. */
const repartirPalabras = (texto: string, inicio: number, fin: number) => {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const pesos = palabras.map((p) => p.length + 1);
  const total = pesos.reduce((a, b) => a + b, 0);
  const duracion = (fin - inicio) * 0.94;
  let t = inicio;
  return palabras.map((p, k) => {
    const dur = (duracion * pesos[k]) / total;
    const palabra = { texto: p, inicio: t, fin: t + dur };
    t += dur;
    return palabra;
  });
};

/** Tiempos estimados a partir de config.ts (cuando no hay locución generada). */
const estimarEscena = (escena: (typeof ESCENAS)[number]): EscenaTemporizada => {
  const textos = escena.frases.map(textoDe);
  const fijos = escena.frases.map((f) => (typeof f === "string" ? null : f.inicio));
  const inicios: number[] = [];
  let i = 0;
  while (i < textos.length) {
    const desde = fijos[i] ?? escena.inicio;
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
  return {
    id: escena.id,
    inicio: escena.inicio,
    fin: escena.fin,
    frases: textos.map((texto, k) => {
      const inicio = inicios[k];
      const fin = k + 1 < textos.length ? inicios[k + 1] : escena.fin;
      return { texto, inicio, fin, palabras: repartirPalabras(texto, inicio, fin) };
    }),
  };
};

/** Tiempos exactos a partir de la locución generada. */
const escenasMedidas = (datos: Record<string, FraseMedida[]>): EscenaTemporizada[] => {
  const frases = ESCENAS.map((escena) =>
    escena.frases.map((f, k): FraseTemporizada => {
      const texto = textoDe(f);
      const medida = datos[escena.id]?.[k];
      if (!medida) {
        throw new Error(
          `Falta la frase ${k} de "${escena.id}" en locucion-tiempos.json. Vuelve a ejecutar npm run locucion.`,
        );
      }
      const visibles = texto.split(/\s+/).filter(Boolean);
      const palabras =
        medida.palabras.length === visibles.length
          ? visibles.map((p, j) => ({ texto: p, ...medida.palabras[j] }))
          : repartirPalabras(texto, medida.inicio, medida.fin);
      return { texto, inicio: medida.inicio, fin: medida.fin, palabras };
    }),
  );
  const inicios = frases.map((f, i) => (i === 0 ? 0 : Math.max(0, f[0].inicio - 0.15)));
  const ultima = frases[frases.length - 1];
  const finTotal = ultima[ultima.length - 1].fin + ELEVENLABS.colaFinal;
  return ESCENAS.map((escena, i) => ({
    id: escena.id,
    inicio: inicios[i],
    fin: i + 1 < ESCENAS.length ? inicios[i + 1] : finTotal,
    frases: frases[i],
  }));
};

const ESCENAS_TEMPORIZADAS: EscenaTemporizada[] = medidos
  ? escenasMedidas(medidos)
  : ESCENAS.map(estimarEscena);

export const hayTiemposDeLocucion = medidos !== null;

export const getEscena = (id: EscenaId) => {
  const escena = ESCENAS_TEMPORIZADAS.find((e) => e.id === id);
  if (!escena) {
    throw new Error(`Escena no encontrada: ${id}`);
  }
  return escena;
};

/** Fin de la última escena (segundos), antes de la firma. */
export const finDeEscenas = () => ESCENAS_TEMPORIZADAS[ESCENAS_TEMPORIZADAS.length - 1].fin;

export const duracionTotal = () => aFrames(finDeEscenas() + FIRMA_SEGUNDOS);

export const frasesTemporizadas = (id: EscenaId) => getEscena(id).frases;

/** Momento (en frames, relativo al inicio de la escena) en que empieza cada frase. */
export const beatsDeEscena = (id: EscenaId): number[] => {
  const escena = getEscena(id);
  return escena.frases.map((f) => aFrames(f.inicio - escena.inicio));
};

/** Segundo absoluto de un momento anclado a una palabra del guion. */
export const segundoDe = (m: Momento): number => {
  const frase = getEscena(m.escena).frases[m.frase];
  if (!frase) {
    throw new Error(`La escena "${m.escena}" no tiene frase ${m.frase}`);
  }
  let t = frase.inicio;
  if (m.palabra) {
    const buscada = normalizar(m.palabra);
    const palabra = frase.palabras.find((p) => normalizar(p.texto) === buscada);
    if (!palabra) {
      throw new Error(`No encuentro la palabra "${m.palabra}" en: ${frase.texto}`);
    }
    t = palabra.inicio;
  }
  return t + (m.mas ?? 0);
};

/** Frame (relativo al inicio de su escena) de un momento. */
export const frameEnEscena = (m: Momento) =>
  aFrames(segundoDe(m) - getEscena(m.escena).inicio);

/** Subtítulos palabra a palabra, divididos en bloques cortos. */
export const subtitulosDesdeGuion = (): Caption[] => {
  const captions: Caption[] = [];
  for (const escena of ESCENAS_TEMPORIZADAS) {
    for (const frase of escena.frases) {
      let caracteresEnBloque = 0;
      frase.palabras.forEach((p, k) => {
        caracteresEnBloque += p.texto.length + 1;
        const siguiente = frase.palabras[k + 1];
        const finDeFrase = siguiente === undefined;
        const terminaEnPausa = /[,.:;…?!]$/.test(p.texto);
        const bloqueLleno =
          siguiente !== undefined &&
          caracteresEnBloque + siguiente.texto.length > SUBTITULOS.maxCaracteres;
        const pageBreakAfter =
          finDeFrase || bloqueLleno || (terminaEnPausa && caracteresEnBloque > 12);
        if (pageBreakAfter) {
          caracteresEnBloque = 0;
        }
        captions.push({
          text: (k === 0 ? "" : " ") + p.texto,
          startMs: Math.round(p.inicio * 1000),
          endMs: Math.round(p.fin * 1000),
          timestampMs: Math.round(((p.inicio + p.fin) / 2) * 1000),
          confidence: null,
          pageBreakAfter,
        });
      });
    }
  }
  return captions;
};
