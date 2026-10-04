/**
 * Genera la locución con ElevenLabs y guarda los tiempos exactos de cada frase.
 *
 *   npm run locucion -- <vídeo>      (p. ej. npm run locucion -- conexiones)
 *
 * <vídeo> es la carpeta del vídeo en src/ (lalinea, conexiones…). Su config.ts
 * debe exportar ESCENAS y, opcionalmente, PRONUNCIACION.
 *
 * Necesita la variable ELEVENLABS_API_KEY (puedes ponerla en mi-video/.env).
 * Opcional: ELEVENLABS_VOICE_ID para elegir la voz.
 * Opcional: LOCUCION_CURL=1 para hacer la petición con curl en vez de fetch
 * (útil detrás de proxies que solo dejan pasar a curl).
 *
 * Escribe:
 *   public/<vídeo>/locucion.mp3
 *   src/<vídeo>/locucion-tiempos.json
 */
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { VOZ as ELEVENLABS } from "../src/marca/voz.ts";

const proyecto = process.argv[2];
if (!proyecto || !existsSync(`src/${proyecto}/config.ts`)) {
  console.error("Indica el vídeo: npm run locucion -- <carpeta en src/>  (p. ej. conexiones)");
  process.exit(1);
}
const config = (await import(`../src/${proyecto}/config.ts`)) as {
  ESCENAS: readonly { id: string; frases: readonly (string | { texto: string })[] }[];
  PRONUNCIACION?: Record<string, string>;
  /** Pausa (s) que se deja entre frases de una misma escena (p. ej. un carrusel). */
  PAUSAS_ENTRE_FRASES?: Record<string, number>;
};
const PAUSAS = config.PAUSAS_ENTRE_FRASES ?? {};
const ESCENAS = config.ESCENAS;
const PRONUNCIACION = config.PRONUNCIACION ?? {};

type Alineacion = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error(
    "Falta ELEVENLABS_API_KEY. Créala en elevenlabs.io (Profile → API keys) y ponla en mi-video/.env:\n  ELEVENLABS_API_KEY=tu_clave",
  );
  process.exit(1);
}
const voz = process.env.ELEVENLABS_VOICE_ID ?? ELEVENLABS.vozPorDefecto;

/** Sustituye solo palabras completas (p. ej. "1870" → "mil ochocientos setenta"). */
const paraLeer = (palabra: string) => {
  const m = palabra.match(/^([«"'(]*)(.*?)([»"'),.:;…?!]*)$/);
  if (!m) return palabra;
  const [, antes, nucleo, despues] = m;
  const sustituta = PRONUNCIACION[nucleo];
  return sustituta ? `${antes}${sustituta}${despues}` : palabra;
};

// Construye el texto completo y recuerda dónde empieza cada palabra de cada frase
type Rango = { desde: number; hasta: number };
const rangos: Record<string, { frase: Rango; palabras: Rango[] }[]> = {};
let texto = "";
for (const escena of ESCENAS) {
  if (texto.length > 0) texto += " ";
  rangos[escena.id] = [];
  escena.frases.forEach((f, k) => {
    if (k > 0) texto += " ";
    const original = typeof f === "string" ? f : f.texto;
    const desdeFrase = texto.length;
    const palabras: Rango[] = [];
    original
      .split(/\s+/)
      .filter(Boolean)
      .forEach((p, j) => {
        if (j > 0) texto += " ";
        const desde = texto.length;
        texto += paraLeer(p);
        palabras.push({ desde, hasta: texto.length });
      });
    rangos[escena.id].push({ frase: { desde: desdeFrase, hasta: texto.length }, palabras });
  });
}

console.log(`Generando locución (${texto.length} caracteres) con la voz ${voz}…`);

const url = `https://api.elevenlabs.io/v1/text-to-speech/${voz}/with-timestamps?output_format=mp3_44100_128`;
const cuerpo = JSON.stringify({
  text: texto,
  model_id: ELEVENLABS.modelo,
  language_code: "es",
  voice_settings: ELEVENLABS.ajustes,
});

const conCurl = () =>
  execFileSync(
      "curl",
      ["-sS", "--fail-with-body", "-X", "POST", url, "-H", `xi-api-key: ${apiKey}`, "-H", "Content-Type: application/json", "--data-binary", "@-"],
    { input: cuerpo, maxBuffer: 200 * 1024 * 1024, encoding: "utf8" },
  );

const pedir = async (): Promise<string> => {
  if (process.env.LOCUCION_CURL) return conCurl();
  const respuesta = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: cuerpo,
  });
  const textoRespuesta = await respuesta.text();
  // Algunos proxies solo dejan pasar a curl: en ese caso, reintenta con curl.
  if (respuesta.status === 403 && textoRespuesta.includes("allowlist")) return conCurl();
  if (!respuesta.ok) {
    throw new Error(`ElevenLabs respondió ${respuesta.status}: ${textoRespuesta}`);
  }
  return textoRespuesta;
};

let bruto: string;
try {
  bruto = await pedir();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
const datos = JSON.parse(bruto) as {
  audio_base64: string;
  alignment: Alineacion;
};

const { characters, character_start_times_seconds: ini, character_end_times_seconds: fin } =
  datos.alignment;
if (characters.join("") !== texto) {
  console.warn("Aviso: la alineación no coincide carácter a carácter con el texto enviado.");
}

const medir = ({ desde, hasta }: Rango) => {
  // Ignora espacios y signos al principio/fin para medir solo la voz
  let a = desde;
  let b = hasta - 1;
  while (a < b && !/[\p{L}\p{N}]/u.test(characters[a] ?? "")) a++;
  while (b > a && !/[\p{L}\p{N}]/u.test(characters[b] ?? "")) b--;
  return { inicio: ini[a] ?? 0, fin: fin[b] ?? 0 };
};

type Medida = { inicio: number; fin: number };
type FraseMedida = Medida & { palabras: Medida[] };
const tiempos: Record<string, FraseMedida[]> = {};
for (const [id, frases] of Object.entries(rangos)) {
  tiempos[id] = frases.map(({ frase, palabras }) => ({
    ...medir(frase),
    palabras: palabras.map(medir),
  }));
}

/**
 * Ajusta las pausas entre frases (con el ffmpeg que incluye Remotion):
 * - las largas se recortan a `pausaMaxima`;
 * - en las escenas de PAUSAS_ENTRE_FRASES se deja (o se añade) esa pausa.
 * Después desplaza todos los tiempos en consecuencia.
 */
type Segmento = { tipo: "audio"; inicio: number; fin: number } | { tipo: "silencio"; dur: number };
const conEscena = Object.entries(tiempos).flatMap(([id, fs]) => fs.map((f) => ({ id, f })));
const todas = conEscena.map((x) => x.f);
const segmentos: Segmento[] = [];
let cursor = 0;
for (let i = 0; i + 1 < conEscena.length; i++) {
  const a = conEscena[i];
  const b = conEscena[i + 1];
  const objetivo = a.id === b.id && PAUSAS[a.id] ? PAUSAS[a.id] : ELEVENLABS.pausaMaxima;
  const hueco = b.f.inicio - a.f.fin;
  if (hueco > objetivo) {
    segmentos.push({ tipo: "audio", inicio: cursor, fin: a.f.fin + objetivo / 2 });
    cursor = b.f.inicio - objetivo / 2;
  } else if (hueco < objetivo - 0.02) {
    const medio = (a.f.fin + b.f.inicio) / 2;
    segmentos.push({ tipo: "audio", inicio: cursor, fin: medio });
    segmentos.push({ tipo: "silencio", dur: objetivo - hueco });
    cursor = medio;
  }
}
const finAudio = todas[todas.length - 1].fin + 0.3;
segmentos.push({ tipo: "audio", inicio: cursor, fin: finAudio });

const desplazar = (t: number) => {
  let acumulado = 0;
  for (const seg of segmentos) {
    if (seg.tipo === "silencio") {
      acumulado += seg.dur;
      continue;
    }
    if (t <= seg.fin) return acumulado + Math.max(0, t - seg.inicio);
    acumulado += seg.fin - seg.inicio;
  }
  return acumulado;
};
for (const frase of todas) {
  frase.inicio = desplazar(frase.inicio);
  frase.fin = desplazar(frase.fin);
  for (const p of frase.palabras) {
    p.inicio = desplazar(p.inicio);
    p.fin = desplazar(p.fin);
  }
}

const tmp = mkdtempSync(join(tmpdir(), "locucion-"));
const original = join(tmp, "original.mp3");
writeFileSync(original, Buffer.from(datos.audio_base64, "base64"));
const filtro =
  segmentos
    .map((t, i) =>
      t.tipo === "audio"
        ? `[0:a]atrim=start=${t.inicio.toFixed(3)}:end=${t.fin.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`
        : `[1:a]atrim=duration=${t.dur.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`,
    )
    .join(";") +
  ";" +
  segmentos.map((_, i) => `[a${i}]`).join("") +
  `concat=n=${segmentos.length}:v=0:a=1[out]`;
const recortado = join(tmp, "recortado.mp3");
execFileSync(
  "npx",
  ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", original, "-f", "lavfi", "-t", "30", "-i", "anullsrc=r=44100:cl=mono", "-filter_complex", filtro, "-map", "[out]", "-b:a", "192k", recortado],
  { stdio: "inherit" },
);

mkdirSync(`public/${proyecto}`, { recursive: true });
writeFileSync(`public/${proyecto}/locucion.mp3`, readFileSync(recortado));
writeFileSync(
  `src/${proyecto}/locucion-tiempos.json`,
  JSON.stringify({ voz, frases: tiempos }, null, 2) + "\n",
);

const duracionVoz = segmentos.reduce((a, t) => a + (t.tipo === "audio" ? t.fin - t.inicio : t.dur), 0);
console.log(`Pausas ajustadas: ${segmentos.length - 1}`);
const duracion = duracionVoz + ELEVENLABS.colaFinal;
console.log(`Listo: public/${proyecto}/locucion.mp3 (${duracion.toFixed(1)} s con la cola final)`);
console.log(`Tiempos guardados en src/${proyecto}/locucion-tiempos.json`);
