/** Efectos muy ligeros con WebAudio (sin archivos): toques, monedas y aciertos. */

let ctx: AudioContext | null = null;
let activo = true;
try {
  activo = localStorage.getItem("mi-linea-sonido") !== "no";
} catch {
  /* por defecto, con sonido */
}

export const sonidoActivo = () => activo;

export function alternarSonido() {
  activo = !activo;
  try {
    localStorage.setItem("mi-linea-sonido", activo ? "si" : "no");
  } catch {
    /* sin almacenamiento */
  }
  return activo;
}

const NOTAS: Record<string, [number, number][]> = {
  toque: [[660, 0.04]],
  paso: [[440, 0.05], [550, 0.05]],
  moneda: [[880, 0.06], [1320, 0.09]],
  bien: [[523, 0.08], [659, 0.08], [784, 0.14]],
  mal: [[330, 0.12], [247, 0.18]],
};

export function sonido(tipo: keyof typeof NOTAS) {
  if (!activo) return;
  try {
    ctx ??= new AudioContext();
    let t = ctx.currentTime;
    for (const [f, d] of NOTAS[tipo]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + d);
      t += d * 0.8;
    }
  } catch {
    /* sin audio */
  }
}
