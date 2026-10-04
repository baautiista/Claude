/**
 * Motor de tiempos compartido por todos los vídeos de InfoLinense.
 *
 * Cada vídeo define en su config.ts sus escenas (con frases del guion) y, si
 * existe, el archivo locucion-tiempos.json generado por `npm run locucion`.
 * Este módulo calcula a partir de ahí los tiempos de escenas, frases y
 * palabras, los subtítulos y los "momentos" anclados a palabras.
 */
import type { Caption } from "@remotion/captions";

export const FPS = 30;

export type Frase = string | { readonly texto: string; readonly inicio: number };

export type EscenaGuion<Id extends string> = {
  readonly id: Id;
  readonly nombre: string;
  readonly inicio: number;
  readonly fin: number;
  readonly frases: readonly Frase[];
};

/** Un momento anclado a una palabra del guion (frase 0 = primera). */
export type Momento<Id extends string> = {
  readonly escena: Id;
  readonly frase: number;
  readonly palabra?: string;
  /** Si la palabra aparece varias veces en la frase, cuál usar (0 = primera). */
  readonly ocurrencia?: number;
  readonly mas?: number;
};

type PalabraMedida = { readonly inicio: number; readonly fin: number };
type FraseMedida = PalabraMedida & { readonly palabras: PalabraMedida[] };
export type DatosLocucion = { readonly frases: Record<string, FraseMedida[]> | null };

export type PalabraTemporizada = { readonly texto: string; readonly inicio: number; readonly fin: number };
export type FraseTemporizada = PalabraTemporizada & { readonly palabras: PalabraTemporizada[] };
export type EscenaTemporizada<Id extends string> = {
  readonly id: Id;
  readonly inicio: number;
  readonly fin: number;
  readonly frases: FraseTemporizada[];
};

export const aFrames = (segundos: number) => Math.round(segundos * FPS);

const textoDe = (f: Frase) => (typeof f === "string" ? f : f.texto);

export const normalizar = (palabra: string) =>
  palabra
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ]/g, "");

const repartirPalabras = (texto: string, inicio: number, fin: number): PalabraTemporizada[] => {
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

const estimarEscena = <Id extends string>(escena: EscenaGuion<Id>): EscenaTemporizada<Id> => {
  const textos = escena.frases.map(textoDe);
  const fijos = escena.frases.map((f) => (typeof f === "string" ? null : f.inicio));
  const inicios: number[] = [];
  let i = 0;
  while (i < textos.length) {
    const desde = fijos[i] ?? escena.inicio;
    let j = i + 1;
    while (j < textos.length && fijos[j] === null) j++;
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

const medirEscenas = <Id extends string>(
  escenas: readonly EscenaGuion<Id>[],
  datos: Record<string, FraseMedida[]>,
  colaFinal: number,
): EscenaTemporizada<Id>[] => {
  const frases = escenas.map((escena) =>
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
  const finTotal = ultima[ultima.length - 1].fin + colaFinal;
  return escenas.map((escena, i) => ({
    id: escena.id,
    inicio: inicios[i],
    fin: i + 1 < escenas.length ? inicios[i + 1] : finTotal,
    frases: frases[i],
  }));
};

export const crearTiempos = <Id extends string>(opciones: {
  readonly escenas: readonly EscenaGuion<Id>[];
  readonly datos: DatosLocucion;
  readonly firmaSegundos: number;
  readonly colaFinal: number;
  readonly maxCaracteresSubtitulo: number;
}) => {
  const { escenas, datos, firmaSegundos, colaFinal, maxCaracteresSubtitulo } = opciones;
  const temporizadas: EscenaTemporizada<Id>[] = datos.frases
    ? medirEscenas(escenas, datos.frases, colaFinal)
    : escenas.map(estimarEscena);

  const getEscena = (id: Id) => {
    const escena = temporizadas.find((e) => e.id === id);
    if (!escena) throw new Error(`Escena no encontrada: ${id}`);
    return escena;
  };

  const finDeEscenas = () => temporizadas[temporizadas.length - 1].fin;

  const segundoDe = (m: Momento<Id>): number => {
    const frase = getEscena(m.escena).frases[m.frase];
    if (!frase) throw new Error(`La escena "${m.escena}" no tiene frase ${m.frase}`);
    let t = frase.inicio;
    if (m.palabra) {
      const buscada = normalizar(m.palabra);
      const coincidencias = frase.palabras.filter((p) => normalizar(p.texto) === buscada);
      const palabra = coincidencias[m.ocurrencia ?? 0];
      if (!palabra) throw new Error(`No encuentro la palabra "${m.palabra}" en: ${frase.texto}`);
      t = palabra.inicio;
    }
    return t + (m.mas ?? 0);
  };

  /** Segundo en el que empieza una frase concreta (inicio de la escena = 0). */
  const inicioFrase = (id: Id, frase: number) => {
    const e = getEscena(id);
    return e.frases[frase].inicio - e.inicio;
  };

  const subtitulos = (): Caption[] => {
    const captions: Caption[] = [];
    for (const escena of temporizadas) {
      for (const frase of escena.frases) {
        let caracteres = 0;
        frase.palabras.forEach((p, k) => {
          caracteres += p.texto.length + 1;
          const siguiente = frase.palabras[k + 1];
          const pausa = /[,.:;…?!]$/.test(p.texto);
          const lleno =
            siguiente !== undefined && caracteres + siguiente.texto.length > maxCaracteresSubtitulo;
          const pageBreakAfter = siguiente === undefined || lleno || (pausa && caracteres > 12);
          if (pageBreakAfter) caracteres = 0;
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

  return {
    hayTiemposDeLocucion: datos.frases !== null,
    getEscena,
    finDeEscenas,
    duracionTotal: () => aFrames(finDeEscenas() + firmaSegundos),
    frasesTemporizadas: (id: Id) => getEscena(id).frases,
    /** Frame (relativo a la escena) en que empieza cada frase. */
    beatsDeEscena: (id: Id) => getEscena(id).frases.map((_, k) => aFrames(inicioFrase(id, k))),
    segundoDe,
    /** Frame (relativo al inicio de su escena) de un momento. */
    frameEnEscena: (m: Momento<Id>) => aFrames(segundoDe(m) - getEscena(m.escena).inicio),
    subtitulos,
  };
};
