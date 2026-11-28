/**
 * Analiza el vídeo del espectáculo para sincronizar la edición con la música y con las luces reales.
 *
 *   node --experimental-strip-types scripts/analizar-video.ts navidad2026
 *
 * Lee public/<carpeta>/espectaculo.mp4 y escribe src/<carpeta>/analisis.json con:
 *  - fps, duración y tamaño del original,
 *  - envolvente: intensidad de la música (0–1) por fotograma,
 *  - golpes: fotogramas con subidas bruscas de intensidad (entradas, acentos),
 *  - luces: puntos luminosos reales cada medio segundo, en coordenadas del vertical 1080 × 1920.
 * Solo depende de ffmpeg/ffprobe.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const carpeta = process.argv[2] ?? "navidad2026";
const video = `public/${carpeta}/espectaculo.mp4`;
const salida = `src/${carpeta}/analisis.json`;

const sonda = JSON.parse(
  execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate:stream_side_data=rotation:format=duration", "-of", "json", video]).toString(),
);
const st = sonda.streams[0];
const [n, d] = String(st.r_frame_rate).split("/").map(Number);
const fps = Math.round((n / (d || 1)) * 1000) / 1000;
const duracion = Number(sonda.format.duration);
const rot = Math.abs(Number(st.side_data_list?.[0]?.rotation ?? 0));
const ancho = rot === 90 || rot === 270 ? st.height : st.width;
const alto = rot === 90 || rot === 270 ? st.width : st.height;
const fotogramas = Math.floor(duracion * fps);

/* ---------- Música: envolvente y golpes ---------- */

const SR = 16000;
const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", video, "-vn", "-ac", "1", "-ar", String(SR), "-f", "s16le", "-"], { maxBuffer: 1 << 30 });
const muestras = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 2));
const porFrame = SR / fps;
const rms: number[] = [];
for (let i = 0; i < fotogramas; i++) {
  let s = 0;
  const a = Math.floor(i * porFrame);
  const b = Math.min(muestras.length, Math.floor((i + 1) * porFrame));
  for (let k = a; k < b; k++) s += (muestras[k] / 32768) ** 2;
  rms.push(Math.sqrt(s / Math.max(1, b - a)));
}
// Suavizado (≈0,25 s) y normalización por percentiles para que 1 = momentos más intensos.
const ventana = Math.max(1, Math.round(fps * 0.25));
const suave = rms.map((_, i) => {
  let s = 0;
  let c = 0;
  for (let k = i - ventana; k <= i + ventana; k++) if (k >= 0 && k < rms.length) {
      s += rms[k];
      c++;
    }
  return s / c;
});
const orden = [...suave].sort((x, y) => x - y);
const p5 = orden[Math.floor(orden.length * 0.05)] ?? 0;
const p98 = orden[Math.floor(orden.length * 0.98)] ?? 1;
const envolvente = suave.map((v) => Math.round(Math.min(1, Math.max(0, (v - p5) / (p98 - p5 || 1))) * 1000) / 1000);

// Golpes: subida de la envolvente rápida frente a la media de los 1,5 s anteriores.
const golpes: number[] = [];
const atras = Math.round(fps * 1.5);
for (let i = atras; i < rms.length; i++) {
  let m = 0;
  for (let k = i - atras; k < i; k++) m += rms[k];
  m /= atras;
  const subida = rms[i] / (m || 1e-6);
  if (subida > 1.8 && rms[i] > p5 * 2 && (golpes.length === 0 || i - golpes[golpes.length - 1] > fps * 1.2)) golpes.push(i);
}

/* ---------- Luces reales: puntos brillantes cada 0,5 s ---------- */

const W = 135;
const H = 240; // 1/8 del vertical
const escala = Math.max(1080 / ancho, 1920 / alto);
// Recorte equivalente a objectFit "cover" centrado.
const filtro = `fps=2,scale=${Math.round(ancho * escala)}:${Math.round(alto * escala)},crop=1080:1920,scale=${W}:${H},format=gray`;
const gris = execFileSync("ffmpeg", ["-v", "error", "-i", video, "-vf", filtro, "-f", "rawvideo", "-"], { maxBuffer: 1 << 30 });
const porImagen = W * H;
const luces: { t: number; puntos: { x: number; y: number; b: number }[] }[] = [];
for (let j = 0; j * porImagen < gris.length; j++) {
  const img = gris.subarray(j * porImagen, (j + 1) * porImagen);
  const candidatos: { x: number; y: number; b: number }[] = [];
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      const v = img[y * W + x];
      if (v < 225) continue;
      let max = true;
      for (let dy = -2; dy <= 2 && max; dy++) for (let dx = -2; dx <= 2; dx++) if ((dx || dy) && img[(y + dy) * W + x + dx] > v) max = false;
      if (max) candidatos.push({ x: (x + 0.5) * 8, y: (y + 0.5) * 8, b: v / 255 });
    }
  }
  // Los más brillantes y separados entre sí (máximo 10).
  candidatos.sort((a, b) => b.b - a.b);
  const elegidos: typeof candidatos = [];
  for (const c of candidatos) {
    if (elegidos.every((e) => Math.hypot(e.x - c.x, e.y - c.y) > 140)) elegidos.push(c);
    if (elegidos.length >= 10) break;
  }
  luces.push({ t: j * 0.5, puntos: elegidos });
}

writeFileSync(salida, JSON.stringify({ fps, duracion, ancho, alto, fotogramas, envolvente, golpes, luces }));
console.log(`Listo: ${salida} · ${ancho}×${alto} · ${fps} fps · ${duracion.toFixed(2)} s · ${golpes.length} golpes · golpes en s: ${golpes.map((g) => (g / fps).toFixed(1)).join(", ")}`);
