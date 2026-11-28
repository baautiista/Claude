/**
 * «La Línea 2026. Una Navidad de película.»
 * Intro de hemeroteca (0–12 s) → resplandor dorado → vídeo original con título y magia navideña.
 * El audio original suena desde el primer fotograma y marca el ritmo (ver analisis.json).
 */
import { loadFont } from "@remotion/fonts";
import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, Easing, Img, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { existe } from "../marca/marca";
import analisis from "./analisis.json";
import { ARCHIVO, RESERVAS, ENCUADRE, INTENSIDAD_EFECTOS, LOGO_SEGUNDOS, REVELACION, TITULO, VIDEO, type Plano } from "./config";

/* ---------- Estilo ---------- */

const ORO = { champan: "#F3E2B8", claro: "#FFF4DC", medio: "#D9B76E", profundo: "#A67C3A", calido: "#FFE7B0" } as const;
const NEGRO = "#030308";

const F = { serif: "Cinzel", fecha: "Cormorant Garamond", caligrafia: "Great Vibes" } as const;
for (const w of ["400", "700", "900"]) loadFont({ family: F.serif, url: staticFile(`navidad2026/fonts/cinzel-latin-${w}-normal.woff2`), weight: w });
for (const w of ["600", "700"]) loadFont({ family: F.fecha, url: staticFile(`navidad2026/fonts/cormorant-garamond-latin-${w}-normal.woff2`), weight: w });
loadFont({ family: F.caligrafia, url: staticFile("navidad2026/fonts/great-vibes-latin-400-normal.woff2"), weight: "400" });

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const curva = Easing.bezier(0.45, 0, 0.2, 1);

type Analisis = { fps: number; fotogramas: number; envolvente: number[]; golpes: number[]; luces: { t: number; puntos: { x: number; y: number; b: number }[] }[]; provisional?: boolean };
const A = analisis as Analisis;
export const FPS_NAVIDAD = A.fps;
export const duracionNavidad = A.fotogramas;

/** Intensidad de la música (0–1) en un fotograma. */
const env = (frame: number) => A.envolvente[Math.max(0, Math.min(A.envolvente.length - 1, frame))] ?? 0.4;
/** Fotogramas desde el último golpe musical (Infinity si no hay). */
const desdeGolpe = (frame: number) => {
  let ult = -Infinity;
  for (const g of A.golpes) if (g <= frame) ult = g;
  return frame - ult;
};

const hayVideo = existe(VIDEO);

/* ---------- Texturas ---------- */

const Grano: React.FC<{ readonly fuerza: number }> = ({ fuerza }) => {
  const frame = useCurrentFrame();
  const id = `ng${frame % 5}`;
  return (
    <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, opacity: fuerza, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 5} />
      </filter>
      <rect width="1080" height="1920" filter={`url(#${id})`} />
    </svg>
  );
};

/** Papel de hemeroteca: fibras cálidas muy sutiles. */
const Papel: React.FC<{ readonly opacidad?: number }> = ({ opacidad = 0.18 }) => (
  <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: opacidad, mixBlendMode: "multiply", pointerEvents: "none" }}>
    <filter id="papel">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.6" numOctaves="3" seed={4} />
      <feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 1.4 -0.3" />
    </filter>
    <rect width="100%" height="100%" filter="url(#papel)" />
  </svg>
);

const Vineta: React.FC<{ readonly fuerza?: number }> = ({ fuerza = 0.7 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 60% at 50% 48%, rgba(0,0,0,0) 40%, rgba(0,0,0,${fuerza}) 100%)`, pointerEvents: "none" }} />
);

const HISTORICO = "grayscale(0.55) sepia(0.28) contrast(1.06) brightness(0.88)";

/* ---------- Intro: la Navidad del pasado ---------- */

const Hueco: React.FC<{ readonly archivo: string }> = ({ archivo }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, #2A2416 0%, ${NEGRO} 75%)`, alignItems: "center", justifyContent: "center", color: ORO.champan, fontFamily: F.fecha, fontWeight: 600, fontSize: 34, textAlign: "center", padding: 80 }}>
    Material pendiente
    <br />
    <span style={{ fontSize: 24, opacity: 0.7 }}>public/{archivo}</span>
  </AbsoluteFill>
);

/** Foto antigua con parallax: fondo desenfocado lento + foto que avanza. */
const FotoAntigua: React.FC<{ archivo: string; readonly dur: number; readonly enfoque?: string; readonly zoom?: [number, number]; readonly deriva?: [number, number]; readonly desenfoque?: number }> = ({
  archivo,
  dur,
  enfoque = "50% 50%",
  zoom = [1.05, 1.18],
  deriva = [0, 0],
  desenfoque = 0,
}) => {
  const frame = useCurrentFrame();
  if (!existe(archivo) && RESERVAS[archivo] && existe(RESERVAS[archivo])) archivo = RESERVAS[archivo];
  if (!existe(archivo)) return <Hueco archivo={archivo} />;
  const p = interpolate(frame, [0, dur], [0, 1], { ...clamp, easing: Easing.bezier(0.33, 0, 0.67, 1) });
  const img = (extra: React.CSSProperties) => <Img src={staticFile(archivo)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: enfoque, filter: HISTORICO, ...extra }} />;
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: NEGRO }}>
      <AbsoluteFill style={{ scale: 1.3 + p * 0.04, filter: "blur(30px)", opacity: 0.7 }}>{img({})}</AbsoluteFill>
      <AbsoluteFill style={{ scale: interpolate(p, [0, 1], zoom), translate: `${p * deriva[0]}px ${p * deriva[1]}px`, filter: desenfoque ? `blur(${desenfoque}px)` : undefined }}>{img({})}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Recorte de prensa sobre una foto antigua, con sombra, profundidad y acercamiento al titular. */
const RecortePrensa: React.FC<{ readonly p: Extract<Plano, { tipo: "recorte" }>; readonly dur: number }> = ({ p, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ancho = p.ancho ?? 960;
  const s = ancho / p.natural.w;
  const alto = p.natural.h * s;
  const entra = interpolate(frame, [0, fps * 0.7], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const cam = interpolate(frame, [fps * 0.35, dur], [0, 1], { ...clamp, easing: curva });
  // La cámara pasa de ver la página a encuadrar el titular (sin pasar del ancho legible).
  const zFoco = Math.min(2.2, 980 / (p.foco.w * s));
  const z = interpolate(cam, [0, 1], [0.92, zFoco]);
  const cx = interpolate(cam, [0, 1], [ancho / 2, (p.foco.x + p.foco.w / 2) * s]);
  const cy = interpolate(cam, [0, 1], [alto / 2, (p.foco.y + p.foco.h / 2) * s]);
  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <AbsoluteFill style={{ opacity: 0.55 }}>
        <FotoAntigua archivo={p.fondo} dur={dur} zoom={[1.15, 1.25]} desenfoque={6} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(3,3,8,0.35)" }} />
      <div style={{ position: "absolute", left: 540, top: 880, width: ancho, height: alto, translate: `${-cx}px ${-cy}px`, transformOrigin: `${cx}px ${cy}px`, scale: z * (0.96 + entra * 0.04) }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            rotate: `${(p.giro ?? 0) * (1.6 - entra * 0.6)}deg`,
            translate: `0px ${(1 - entra) * 140}px`,
            opacity: entra,
            boxShadow: "0 50px 80px rgba(0,0,0,0.7), 0 10px 20px rgba(0,0,0,0.5)",
            backgroundColor: "#F2EBDC",
          }}
        >
          {existe(p.archivo) ? <Img src={staticFile(p.archivo)} style={{ width: ancho, height: alto, display: "block", filter: "grayscale(0.35) sepia(0.22) contrast(1.04)" }} /> : <Hueco archivo={p.archivo} />}
          <Papel opacidad={0.22} />
          {(p.marcas ?? []).map((m, i) => {
            const q = interpolate(frame, [fps * (0.9 + i * 0.35), fps * (1.5 + i * 0.35)], [0, 1], { ...clamp, easing: curva });
            return <div key={i} style={{ position: "absolute", left: m.x * s, top: m.y * s, width: m.w * s * q, height: Math.max(3, m.h * s), background: `linear-gradient(90deg, ${ORO.profundo}, ${ORO.medio})`, borderRadius: 3, boxShadow: `0 0 8px ${ORO.medio}99` }} />;
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Ajusta cada corte al acento musical más cercano (±0,6 s). */
const cortes = (fps: number) =>
  ARCHIVO.map((p, i) => {
    const base = Math.round(p.inicio * fps);
    if (i === 0 || A.provisional || p.tipo === "recorte") return base;
    const cerca = A.golpes.filter((g) => Math.abs(g - base) <= fps * 0.6 && g < REVELACION * fps - fps);
    return cerca.length ? cerca.reduce((a, b) => (Math.abs(b - base) < Math.abs(a - base) ? b : a)) : base;
  });

const IntroArchivo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = cortes(fps);
  const fin = Math.round((REVELACION + 0.8) * fps);
  const fundido = Math.round(fps * 0.5);
  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      {ARCHIVO.map((p, i) => {
        const desde = c[i];
        const hasta = i + 1 < c.length ? c[i + 1] : fin;
        const dur = hasta - desde + fundido;
        // Fundido encadenado suave (no hay cortes secos en la hemeroteca).
        const o = interpolate(frame, [desde, desde + fundido], [i === 0 ? 1 : 0, 1], clamp);
        return (
          <Sequence key={i} from={desde} durationInFrames={dur} layout="none">
            <AbsoluteFill style={{ opacity: o }}>{p.tipo === "foto" ? <FotoAntigua archivo={p.archivo} dur={dur} enfoque={p.enfoque} zoom={p.zoom} deriva={p.deriva} /> : <RecortePrensa p={p} dur={dur} />}</AbsoluteFill>
          </Sequence>
        );
      })}
      <Papel opacidad={0.1} />
      <Grano fuerza={0.22} />
      <Vineta fuerza={0.75} />
      <AbsoluteFill style={{ backgroundColor: NEGRO, opacity: interpolate(frame, [0, fps * 0.8], [1, 0], clamp) }} />
    </AbsoluteFill>
  );
};

/* ---------- Revelación: resplandor dorado ---------- */

const Resplandor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const r = REVELACION * fps;
  const p = interpolate(frame, [r - fps * 1.4, r], [0, 1], { ...clamp, easing: Easing.bezier(0.5, 0, 0.75, 0) });
  const sale = interpolate(frame, [r, r + fps * 1.6], [1, 0], { ...clamp, easing: Easing.bezier(0.25, 1, 0.5, 1) });
  const v = Math.min(p, sale);
  if (v <= 0) return null;
  const radio = 10 + p * 140;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 46%, rgba(255,250,235,${v}) 0%, rgba(255,231,176,${v * 0.95}) ${radio * 0.35}%, rgba(217,183,110,${v * 0.6}) ${radio * 0.7}%, rgba(166,124,58,0) ${radio}%)` }} />
      {/* Rayos finos que nacen del centro */}
      <svg width="1080" height="1920" style={{ position: "absolute", opacity: v * 0.6 }}>
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2 + frame * 0.004;
          const l = 300 + p * 1400;
          return <line key={i} x1={540} y1={883} x2={540 + Math.cos(a) * l} y2={883 + Math.sin(a) * l} stroke={ORO.claro} strokeWidth={2 + (i % 3)} strokeOpacity={0.35} strokeLinecap="round" />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- Vídeo original con acabado cinematográfico ---------- */

const VideoOriginal: React.FC = () => {
  const frame = useCurrentFrame();
  const e = env(frame);
  if (!hayVideo) {
    return (
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #1B1830 0%, ${NEGRO} 80%)`, alignItems: "center", justifyContent: "flex-end", paddingBottom: 260 }}>
        <div style={{ fontFamily: F.fecha, fontWeight: 600, fontSize: 30, color: ORO.champan, opacity: 0.65, textAlign: "center" }}>
          Vídeo pendiente
          <br />
          public/{VIDEO}
        </div>
      </AbsoluteFill>
    );
  }
  const base: React.CSSProperties = { width: "100%", height: "100%" };
  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      {ENCUADRE === "contain" ? (
        <AbsoluteFill style={{ filter: "blur(40px) brightness(0.5)", scale: 1.2 }}>
          <Video src={staticFile(VIDEO)} muted objectFit="cover" style={base} />
        </AbsoluteFill>
      ) : null}
      {/* Etalonaje: negros profundos, contraste de cine, color original del espectáculo. */}
      <AbsoluteFill style={{ filter: "contrast(1.14) brightness(0.96) saturate(1.04)" }}>
        <Video src={staticFile(VIDEO)} muted objectFit={ENCUADRE} style={base} />
      </AbsoluteFill>
      {/* Resplandor controlado: solo las luces altas, que respira con la música. */}
      <AbsoluteFill style={{ mixBlendMode: "screen", opacity: (0.22 + e * 0.2) * INTENSIDAD_EFECTOS, filter: "brightness(0.9) contrast(2.6) blur(22px)" }}>
        <Video src={staticFile(VIDEO)} muted objectFit={ENCUADRE} style={base} />
      </AbsoluteFill>
      {/* Dorados cálidos en medios tonos, sin teñir las luces. */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(255,190,110,0.10) 0%, rgba(255,170,80,0.06) 60%, rgba(30,10,0,0.18) 100%)", mixBlendMode: "soft-light" }} />
    </AbsoluteFill>
  );
};

/* ---------- Magia navideña ---------- */

/** Punto de una curva cúbica. */
const bezier = (t: number, p: number[][]) => {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]);
};

type Estela = { inicio: number; dur: number; puntos: number[][]; profundidad: number; semilla: string };

/** Estelas de polvo dorado: salen periódicamente y en los acentos de la ópera. */
const estelas = (fps: number, total: number): Estela[] => {
  const desde = Math.round((REVELACION + 0.6) * fps);
  const momentos = new Set<number>();
  for (let f = desde; f < total - fps * 2; f += Math.round(fps * 3.2)) momentos.add(f);
  for (const g of A.golpes) if (g > desde && g < total - fps * 2) momentos.add(g);
  return [...momentos].sort((a, b) => a - b).map((m, i) => {
    const sem = `estela${i}`;
    const izq = random(sem) > 0.5;
    const y0 = 300 + random(`${sem}y0`) * 1300;
    const y1 = 300 + random(`${sem}y1`) * 1300;
    const prof = random(`${sem}p`);
    return {
      inicio: m,
      dur: Math.round(fps * (2.4 + random(`${sem}d`) * 1.8)),
      profundidad: prof,
      semilla: sem,
      puntos: [
        [izq ? -200 : 1280, y0],
        [izq ? 250 : 830, y0 - 500 + random(`${sem}c1`) * 400],
        [izq ? 800 : 280, y1 + 300 - random(`${sem}c2`) * 600],
        [izq ? 1280 : -200, y1],
      ],
    };
  });
};

const PolvoDorado: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const lista = estelas(fps, durationInFrames);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {lista.map((e) => {
        const t = (frame - e.inicio) / e.dur;
        if (t < 0 || t > 1.35) return null;
        const cerca = e.profundidad > 0.82; // pasa cerca de la cámara: grande y desenfocada
        const escala = cerca ? 2.4 : 0.6 + e.profundidad * 0.9;
        const n = cerca ? 14 : 34;
        return (
          <div key={e.semilla} style={{ position: "absolute", inset: 0, filter: cerca ? "blur(5px)" : undefined }}>
            {Array.from({ length: n }).map((_, k) => {
              const retraso = (k / n) * 0.35;
              const tt = Math.min(1, Math.max(0, t - retraso));
              if (t - retraso < 0 || t - retraso > 1) return null;
              const [x, y] = bezier(Easing.bezier(0.4, 0, 0.6, 1)(tt), e.puntos);
              const disp = (random(`${e.semilla}k${k}`) - 0.5) * 40 * escala;
              const vida = 1 - k / n;
              const tam = (1.5 + random(`${e.semilla}s${k}`) * 4) * escala * (0.4 + vida * 0.6);
              const brillo = 0.5 + 0.5 * Math.sin(frame * 0.6 + k * 1.7);
              return (
                <div
                  key={k}
                  style={{
                    position: "absolute",
                    left: x + disp - tam,
                    top: y + disp * 0.6 - tam,
                    width: tam * 2,
                    height: tam * 2,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${ORO.claro} 0%, ${ORO.medio}CC 40%, ${ORO.medio}00 72%)`,
                    opacity: vida * (0.55 + brillo * 0.45) * INTENSIDAD_EFECTOS * (cerca ? 0.5 : 1),
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** Hilos de luz finos que recorren la escena en curvas orgánicas. */
const HilosDeLuz: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const desde = (REVELACION + 1) * fps;
  if (frame < desde) return null;
  const hilos = [0, 1, 2];
  return (
    <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, mixBlendMode: "screen", pointerEvents: "none" }}>
      <defs>
        <filter id="halo" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="hilo" x1="0" x2="1">
          <stop offset="0" stopColor={ORO.medio} stopOpacity="0" />
          <stop offset="0.5" stopColor={ORO.claro} stopOpacity="1" />
          <stop offset="1" stopColor={ORO.medio} stopOpacity="0" />
        </linearGradient>
      </defs>
      {hilos.map((i) => {
        const ciclo = fps * (9 + i * 2.5);
        const local = (frame - desde + i * fps * 3.4) % ciclo;
        const t = local / (fps * 4.2);
        if (t > 1) return null;
        const y = 420 + i * 430 + Math.sin(frame / 90 + i) * 60;
        const d = `M -100 ${y} C 260 ${y - 260 + i * 80}, 700 ${y + 280 - i * 60}, 1180 ${y - 120}`;
        const largo = 1600;
        const tramo = 380;
        const off = interpolate(t, [0, 1], [largo, -tramo], { easing: Easing.bezier(0.45, 0, 0.55, 1) });
        const o = Math.sin(Math.PI * t) * (0.45 + env(frame) * 0.4) * INTENSIDAD_EFECTOS;
        return <path key={i} d={d} fill="none" stroke="url(#hilo)" strokeWidth={2.2} strokeLinecap="round" pathLength={largo} strokeDasharray={`${tramo} ${largo}`} strokeDashoffset={off} filter="url(#halo)" opacity={o} />;
      })}
    </svg>
  );
};

/** Partículas suspendidas en el aire, a tres profundidades. */
const Suspendidas: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const aparece = interpolate(frame, [REVELACION * fps, (REVELACION + 2) * fps], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: aparece * INTENSIDAD_EFECTOS }}>
      {Array.from({ length: 46 }).map((_, i) => {
        const prof = random(`sp${i}`);
        const cerca = prof > 0.93;
        const tam = cerca ? 26 + prof * 30 : 1.4 + prof * 4;
        const vel = 0.15 + prof * 0.6;
        const x = (random(`sx${i}`) * 1180 + Math.sin(frame / (60 + i) + i) * 30 * prof) % 1180 - 50;
        const y = ((random(`sy${i}`) * 2100 - frame * vel) % 2100 + 2100) % 2100 - 90;
        const tw = 0.45 + 0.55 * Math.sin(frame / (8 + (i % 7)) + i);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: tam, height: tam, borderRadius: "50%", background: `radial-gradient(circle, ${ORO.claro} 0%, ${ORO.champan}88 45%, ${ORO.champan}00 72%)`, opacity: (cerca ? 0.22 : 0.35 + tw * 0.5) * (0.7 + env(frame) * 0.3), filter: cerca ? "blur(4px)" : undefined }} />
        );
      })}
    </AbsoluteFill>
  );
};

/** Destello estrellado (cuatro puntas) sobre una luz real. */
const Estrella: React.FC<{ readonly x: number; readonly y: number; readonly tam: number; readonly o: number; readonly giro: number }> = ({ x, y, tam, o, giro }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 0, height: 0, opacity: o, rotate: `${giro}deg` }}>
    <div style={{ position: "absolute", left: -tam, top: -1.5, width: tam * 2, height: 3, background: `linear-gradient(90deg, ${ORO.claro}00, ${ORO.claro} 50%, ${ORO.claro}00)` }} />
    <div style={{ position: "absolute", left: -1.5, top: -tam, width: 3, height: tam * 2, background: `linear-gradient(180deg, ${ORO.claro}00, ${ORO.claro} 50%, ${ORO.claro}00)` }} />
    <div style={{ position: "absolute", left: -tam * 0.18, top: -tam * 0.18, width: tam * 0.36, height: tam * 0.36, borderRadius: "50%", background: `radial-gradient(circle, #FFFFFF 0%, ${ORO.calido}AA 40%, ${ORO.calido}00 75%)` }} />
  </div>
);

/** Destellos sobre los puntos luminosos reales del espectáculo, más en los momentos intensos. */
const DestellosReales: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < REVELACION * fps || A.luces.length === 0) return null;
  const t = frame / fps;
  const muestra = A.luces[Math.min(A.luces.length - 1, Math.floor(t * 2))];
  const e = env(frame);
  const g = desdeGolpe(frame);
  const extra = g < fps * 0.8 ? 1 - g / (fps * 0.8) : 0;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {muestra.puntos.slice(0, 2 + Math.round(e * 3 + extra * 3)).map((p, i) => {
        // Cada destello nace y se apaga en ~0,8 s, escalonados.
        const fase = ((frame + i * 9) % Math.round(fps * 0.9)) / (fps * 0.9);
        const o = Math.sin(Math.PI * fase) * (0.55 + extra * 0.45) * INTENSIDAD_EFECTOS;
        return <Estrella key={i} x={p.x} y={p.y} tam={(34 + p.b * 40) * (0.8 + e * 0.6 + extra * 0.5)} o={o} giro={10 + i * 7 + frame * 0.15} />;
      })}
    </AbsoluteFill>
  );
};

/** Reflejo cálido que acompaña los acentos de la ópera. */
const PulsoMusical: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < (REVELACION + 1) * fps) return null;
  const g = desdeGolpe(frame);
  const o = g < fps * 1.2 ? interpolate(g, [0, 3, fps * 1.2], [0, 0.28, 0], clamp) : 0;
  const barrido = interpolate(g, [0, fps * 1.2], [-400, 1500], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: o * INTENSIDAD_EFECTOS }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${ORO.calido} 0%, ${ORO.medio}00 60%)` }} />
      <div style={{ position: "absolute", top: -200, bottom: -200, left: barrido, width: 160, rotate: "18deg", background: `linear-gradient(90deg, ${ORO.claro}00, ${ORO.claro}AA, ${ORO.claro}00)`, filter: "blur(18px)" }} />
    </AbsoluteFill>
  );
};

/* ---------- Título de película ---------- */

const TituloPelicula: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  const t0 = f(TITULO.entra);
  const t1 = f(TITULO.sale);
  if (frame < t0 - 2 || frame > t1 + f(1.6)) return null;
  const r = frame - t0;
  const sale = interpolate(frame, [t1, t1 + f(1.5)], [0, 1], { ...clamp, easing: Easing.bezier(0.5, 0, 0.75, 0) });
  // «La Línea»: aparece desde el desenfoque con el tracking cerrándose.
  const pLinea = interpolate(r, [0, f(1.4)], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  // «2026»: las líneas se extienden.
  const p2026 = interpolate(r, [f(0.9), f(2)], [0, 1], { ...clamp, easing: curva });
  // Caligrafía: se escribe con un hilo de luz.
  const pEscritura = interpolate(r, [f(1.6), f(4.2)], [0, 1], { ...clamp, easing: Easing.bezier(0.35, 0, 0.45, 1) });
  const relleno = interpolate(r, [f(2.6), f(4.8)], [0, 1], clamp);
  // Brillo metálico que recorre las letras.
  const brillo = interpolate((r % f(3.2)) / f(3.2), [0, 1], [-0.4, 1.4]);
  const xEscritura = 60 + pEscritura * 960;
  const yCentro = 900;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: 1 - sale, scale: 1 + sale * 0.06, filter: sale ? `blur(${sale * 8}px)` : undefined }}>
      {/* Velo oscuro muy suave para leer el título sin tapar el espectáculo */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 26% at 50% ${((yCentro - 20) / 1920) * 100}%, rgba(3,3,8,${0.62 * Math.min(1, pLinea * 1.5)}) 0%, rgba(3,3,8,${0.3 * Math.min(1, pLinea * 1.5)}) 55%, rgba(3,3,8,0) 100%)` }} />
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0.25">
            <stop offset="0" stopColor={ORO.profundo} />
            <stop offset={Math.max(0, brillo - 0.12)} stopColor={ORO.medio} />
            <stop offset={Math.min(1, Math.max(0, brillo))} stopColor="#FFFBEF" />
            <stop offset={Math.min(1, brillo + 0.12)} stopColor={ORO.champan} />
            <stop offset="1" stopColor={ORO.profundo} />
          </linearGradient>
          <linearGradient id="calido" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFDF6" />
            <stop offset="1" stopColor={ORO.champan} />
          </linearGradient>
          <filter id="brilloTitulo" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="10" result="b" />
            <feColorMatrix in="b" values="1 0 0 0 0.15  0 0.9 0 0 0.1  0 0 0.6 0 0  0 0 0 0.7 0" result="g" />
            <feMerge>
              <feMergeNode in="g" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="escritura">
            <rect x="0" y="0" width={xEscritura} height="1920" />
          </clipPath>
        </defs>

        {/* LA LÍNEA */}
        <g filter="url(#brilloTitulo)" opacity={pLinea} style={{ filter: `blur(${(1 - pLinea) * 14}px)` }}>
          <text x="540" y={yCentro - 150} textAnchor="middle" fontFamily={F.serif} fontWeight={900} fontSize={148} letterSpacing={6 + (1 - pLinea) * 40} fill="url(#metal)" stroke={ORO.claro} strokeWidth={0.8} strokeOpacity={0.6}>
            La Línea
          </text>
        </g>

        {/* 2026 con filetes y estrella */}
        <g opacity={p2026} filter="url(#brilloTitulo)">
          <line x1={540 - 70 - p2026 * 230} y1={yCentro - 72} x2={540 - 120} y2={yCentro - 72} stroke={ORO.medio} strokeWidth={2} />
          <line x1={540 + 120} y1={yCentro - 72} x2={540 + 70 + p2026 * 230} y2={yCentro - 72} stroke={ORO.medio} strokeWidth={2} />
          <text x="540" y={yCentro - 50} textAnchor="middle" fontFamily={F.fecha} fontWeight={700} fontSize={64} letterSpacing={22} fill="url(#calido)">
            2026
          </text>
        </g>

        {/* Una Navidad de película: trazo de luz + relleno */}
        <g clipPath="url(#escritura)" filter="url(#brilloTitulo)">
          {[
            { t: "Una Navidad", y: yCentro + 110 },
            { t: "de película", y: yCentro + 250 },
          ].map((l) => (
            <g key={l.t}>
              <text x="540" y={l.y} textAnchor="middle" fontFamily={F.caligrafia} fontSize={168} fill="none" stroke={ORO.claro} strokeWidth={2.2} strokeDasharray="900" strokeDashoffset={900 * (1 - pEscritura)}>
                {l.t}
              </text>
              <text x="540" y={l.y} textAnchor="middle" fontFamily={F.caligrafia} fontSize={168} fill="url(#metal)" opacity={relleno}>
                {l.t}
              </text>
            </g>
          ))}
        </g>
      </svg>
      {/* Punta del hilo de luz que escribe */}
      {pEscritura > 0 && pEscritura < 1 ? (
        <>
          <Estrella x={xEscritura} y={yCentro + 60 + Math.sin(pEscritura * Math.PI * 6) * 60} tam={60} o={1} giro={frame * 2} />
          <Estrella x={xEscritura} y={yCentro + 200 + Math.cos(pEscritura * Math.PI * 5) * 50} tam={44} o={0.8} giro={-frame * 2} />
        </>
      ) : null}
      {/* Pequeños destellos que recorren los trazos */}
      {Array.from({ length: 9 }).map((_, i) => {
        const ciclo = f(1.1);
        const fase = ((r + i * 11) % ciclo) / ciclo;
        const visible = r > f(1.2) + i * 4;
        const x = 140 + random(`tx${i}-${Math.floor((r + i * 11) / ciclo)}`) * 800;
        const y = yCentro - 250 + random(`ty${i}-${Math.floor((r + i * 11) / ciclo)}`) * 520;
        return visible ? <Estrella key={i} x={x} y={y} tam={22 + (i % 3) * 10} o={Math.sin(Math.PI * fase) * 0.9} giro={i * 20} /> : null;
      })}
    </AbsoluteFill>
  );
};

/* ---------- Cierre ---------- */

const Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const desde = durationInFrames - Math.round(LOGO_SEGUNDOS * fps);
  if (frame < desde) return null;
  const p = interpolate(frame, [desde, desde + fps], [0, 1], { ...clamp, easing: curva });
  const destello = interpolate(frame, [desde + fps * 0.5, desde + fps * 1.6], [0, 1], clamp);
  const fin = interpolate(frame, [durationInFrames - fps * 0.6, durationInFrames], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: fin }}>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(3,3,8,0) 60%, rgba(3,3,8,${0.55 * p}) 100%)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 1420, display: "flex", justifyContent: "center", opacity: p, translate: `0px ${(1 - p) * 20}px` }}>
        <Img src={staticFile("marca/logo.png")} style={{ width: 380, filter: `drop-shadow(0 0 ${12 * p}px rgba(255,231,176,0.5))` }} />
      </div>
      {destello > 0 && destello < 1 ? <Estrella x={350 + destello * 380} y={1452} tam={48} o={Math.sin(Math.PI * destello)} giro={frame * 3} /> : null}
    </AbsoluteFill>
  );
};

/* ---------- Composición ---------- */

export const NavidadDePelicula: React.FC = () => {
  const { fps } = useVideoConfig();
  const r = Math.round(REVELACION * fps);
  return (
    <AbsoluteFill style={{ backgroundColor: NEGRO }}>
      <Sequence name="Vídeo original" from={r - Math.round(fps * 0.2)} premountFor={fps * 2}>
        <Sequence name="Sincronía" from={-(r - Math.round(fps * 0.2))} layout="none">
          <VideoOriginal />
        </Sequence>
      </Sequence>
      <Sequence name="Hemeroteca" durationInFrames={r + Math.round(fps * 0.2)}>
        <IntroArchivo />
      </Sequence>
      <Sequence name="Magia">
        <Suspendidas />
        <HilosDeLuz />
        <PolvoDorado />
        <DestellosReales />
        <PulsoMusical />
      </Sequence>
      <Resplandor />
      <TituloPelicula />
      <Logo />
      <Grano fuerza={0.05} />
      <Vineta fuerza={0.45} />
      {hayVideo ? <Audio name="Audio original (ópera)" src={staticFile(VIDEO)} /> : null}
    </AbsoluteFill>
  );
};
