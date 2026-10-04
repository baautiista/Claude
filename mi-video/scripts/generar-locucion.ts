/**
 * Genera la locución con ElevenLabs y guarda los tiempos exactos de cada frase.
 *
 *   npm run locucion
 *
 * Necesita la variable ELEVENLABS_API_KEY (puedes ponerla en mi-video/.env).
 * Opcional: ELEVENLABS_VOICE_ID para elegir la voz.
 * Opcional: LOCUCION_CURL=1 para hacer la petición con curl en vez de fetch
 * (útil detrás de proxies que solo dejan pasar a curl).
 *
 * Escribe:
 *   public/locucion.mp3
 *   src/lalinea/locucion-tiempos.json
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { ELEVENLABS, ESCENAS } from "../src/lalinea/config.ts";

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
  const sustituta = ELEVENLABS.pronunciacion[nucleo];
  return sustituta ? `${antes}${sustituta}${despues}` : palabra;
};

// Construye el texto completo y recuerda dónde empieza cada palabra de cada frase
type Rango = { desde: number; hasta: number };
const rangos: Record<string, { frase: Rango; palabras: Rango[] }[]> = {};
let texto = "";
for (const escena of ESCENAS) {
  if (texto.length > 0) texto += "\n\n";
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

const pedir = async (): Promise<string> => {
  if (process.env.LOCUCION_CURL) {
    return execFileSync(
      "curl",
      ["-sS", "--fail-with-body", "-X", "POST", url, "-H", `xi-api-key: ${apiKey}`, "-H", "Content-Type: application/json", "--data-binary", "@-"],
      { input: cuerpo, maxBuffer: 200 * 1024 * 1024, encoding: "utf8" },
    );
  }
  const respuesta = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: cuerpo,
  });
  const textoRespuesta = await respuesta.text();
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

const tiempos: Record<string, unknown[]> = {};
for (const [id, frases] of Object.entries(rangos)) {
  tiempos[id] = frases.map(({ frase, palabras }) => ({
    ...medir(frase),
    palabras: palabras.map(medir),
  }));
}

writeFileSync("public/locucion.mp3", Buffer.from(datos.audio_base64, "base64"));
writeFileSync(
  "src/lalinea/locucion-tiempos.json",
  JSON.stringify({ voz, frases: tiempos }, null, 2) + "\n",
);

const duracion = fin[fin.length - 1] + ELEVENLABS.colaFinal;
console.log(`Listo: public/locucion.mp3 (${duracion.toFixed(1)} s con la cola final)`);
console.log("Tiempos guardados en src/lalinea/locucion-tiempos.json");
