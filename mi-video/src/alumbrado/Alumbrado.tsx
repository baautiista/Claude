/**
 * Documental vertical: el alumbrado navideño de La Línea, 2023 → 2026.
 * Identidad InfoLinense adaptada a la Navidad: azul eléctrico, azul profundo y dorado (sin lima).
 */
import type { Caption } from "@remotion/captions";
import { loadFont } from "@remotion/fonts";
import { Audio, Video } from "@remotion/media";
import { useMemo } from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { aFrames, crearTiempos, type DatosLocucion } from "../marca/guion";
import { COLOR, FUENTE, ZONA_SEGURA, existe } from "../marca/marca";
import { ALCALDE, AUDIO, CITAS_PRENSA, ESCENAS, FIN, MEDIOS, RETARDO_VOZ, T, type EscenaId, type Medio } from "./config";
import datosLocucion from "./locucion-tiempos.json";

/* ---------- Identidad navideña ---------- */

export const NAV = {
  azul: COLOR.azul,
  profundo: COLOR.azulOscuro,
  oro: "#E4D27B",
  blanco: COLOR.blanco,
  negro: "#05070D",
} as const;

export const TIPO = {
  /** Titulares contundentes. */
  titular: "Bricolage Grotesque",
  /** Equivalente libre de Object Sans (geométrica): Poppins. */
  rotulo: FUENTE.rotulo,
  texto: FUENTE.texto,
} as const;

for (const w of ["700", "800"]) {
  loadFont({ family: TIPO.titular, url: staticFile(`votacoac/fonts/BricolageGrotesque-${w}.woff2`), weight: w });
}

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const f = (s: number) => aFrames(s);

/* ---------- Tiempos de la locución dentro del montaje ---------- */

const tiempos = crearTiempos({ escenas: ESCENAS, datos: datosLocucion as DatosLocucion, firmaSegundos: 0, colaFinal: 0, maxCaracteresSubtitulo: 26 });

const INICIO_VOZ: Record<EscenaId, number> = {
  hemeroteca: T.hemeroteca + RETARDO_VOZ,
  cambio: T.cambio + RETARDO_VOZ,
  crece: T.crece + RETARDO_VOZ,
  presente: T.presente + RETARDO_VOZ,
  cierre: T.cierre + RETARDO_VOZ,
};

/** Tramo de locucion.mp3 de cada escena. */
const tramoVoz = (id: EscenaId) => {
  const fr = tiempos.frasesTemporizadas(id);
  return { desde: fr[0].inicio, hasta: fr[fr.length - 1].fin };
};

/** Segundo del vídeo final para un segundo de locucion.mp3 dentro de una escena. */
const enVideo = (id: EscenaId, t: number) => INICIO_VOZ[id] + (t - tramoVoz(id).desde);

/** Frame absoluto en que se dice una palabra. */
const W = (escena: EscenaId, frase: number, palabra?: string, mas = 0) => f(enVideo(escena, tiempos.segundoDe({ escena, frase, palabra })) + mas);

export const duracionAlumbrado = f(FIN);

/* ---------- Piezas visuales ---------- */

/** Grano de película y viñeta (textura de archivo). */
const Grano: React.FC<{ readonly fuerza?: number }> = ({ fuerza = 0.18 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", opacity: fuerza, mixBlendMode: "overlay" }}>
        <filter id={`g${frame % 6}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 6} />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${frame % 6})`} />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.65) 100%)" }} />
    </AbsoluteFill>
  );
};

/** Hueco elegante para material pendiente. */
const Pendiente: React.FC<{ readonly m: Medio; readonly compacto?: boolean }> = ({ m, compacto }) => (
  <AbsoluteFill
    style={{
      backgroundColor: NAV.profundo,
      backgroundImage: "repeating-linear-gradient(-45deg, rgba(228,210,123,0.07) 0 20px, rgba(0,0,0,0) 20px 40px)",
      alignItems: "center",
      justifyContent: compacto ? "center" : "flex-start",
      paddingTop: compacto ? 40 : 90,
      textAlign: "center",
      paddingLeft: 40,
      paddingRight: 40,
      gap: 12,
      border: `3px dashed ${NAV.oro}`,
      boxSizing: "border-box",
    }}
  >
    <div style={{ fontFamily: TIPO.rotulo, fontWeight: 700, fontSize: compacto ? 22 : 30, color: NAV.oro, letterSpacing: 3 }}>MATERIAL PENDIENTE</div>
    <div style={{ fontFamily: TIPO.titular, fontWeight: 800, fontSize: compacto ? 40 : 64, color: NAV.blanco, lineHeight: 1 }}>{m.nombre}</div>
    <div style={{ fontFamily: TIPO.texto, fontWeight: 600, fontSize: compacto ? 20 : 26, color: "rgba(255,255,255,0.65)" }}>public/{m.archivo}</div>
  </AbsoluteFill>
);

/** Foto o vídeo de un medio, con hueco si falta. */
const Medio_: React.FC<{ readonly m: Medio; readonly style?: React.CSSProperties; readonly compacto?: boolean; readonly filtro?: string }> = ({ m, style, compacto, filtro }) => {
  if (!existe(m.archivo)) return <Pendiente m={m} compacto={compacto} />;
  const css: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", objectPosition: m.enfoque ?? "50% 50%", filter: filtro, ...style };
  return m.archivo.endsWith(".mp4") ? <Video src={staticFile(m.archivo)} muted objectFit="cover" style={css} /> : <Img src={staticFile(m.archivo)} style={css} />;
};

const Credito: React.FC<{ readonly texto?: string; readonly abajo?: number }> = ({ texto, abajo = ZONA_SEGURA.abajo + 200 }) =>
  texto ? (
    <div style={{ position: "absolute", right: ZONA_SEGURA.lados, bottom: abajo, fontFamily: TIPO.texto, fontWeight: 600, fontSize: 22, color: "rgba(255,255,255,0.85)", backgroundColor: "rgba(5,7,13,0.6)", padding: "4px 12px", borderRadius: 6 }}>{texto}</div>
  ) : null;

/**
 * Parallax: fondo desenfocado que se mueve lento y foto nítida que avanza más rápido.
 * `color` 0 = blanco y negro de archivo, 1 = color real.
 */
const Parallax: React.FC<{ readonly m: Medio; readonly dur: number; readonly color?: number | [number, number]; readonly zoom?: [number, number]; readonly deriva?: number; readonly credito?: boolean }> = ({
  m,
  dur,
  color = 1,
  zoom = [1.05, 1.2],
  deriva = 40,
  credito = true,
}) => {
  const frame = useCurrentFrame();
  const c = Array.isArray(color) ? interpolate(frame, [0, dur * 0.7], color, clamp) : color;
  const filtro = `grayscale(${1 - c}) sepia(${(1 - c) * 0.35}) contrast(${1 + (1 - c) * 0.1}) brightness(${0.92 + c * 0.08})`;
  const p = interpolate(frame, [0, dur], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: NAV.negro, overflow: "hidden" }}>
      <AbsoluteFill style={{ scale: 1.25 + p * 0.05, translate: `${-p * deriva * 0.4}px 0px`, filter: "blur(28px)", opacity: 0.8 }}>
        <Medio_ m={m} filtro={filtro} />
      </AbsoluteFill>
      <AbsoluteFill style={{ scale: interpolate(p, [0, 1], zoom), translate: `${p * deriva}px ${-p * deriva * 0.5}px` }}>
        <Medio_ m={m} filtro={filtro} />
      </AbsoluteFill>
      {credito ? <Credito texto={existe(m.archivo) ? m.credito : undefined} /> : null}
    </AbsoluteFill>
  );
};

/** Luces desenfocadas (bokeh) muy discretas. */
const Bokeh: React.FC<{ readonly n?: number; readonly opacidad?: number }> = ({ n = 12, opacidad = 0.5 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: opacidad }}>
      {Array.from({ length: n }).map((_, i) => {
        const x = random(`x${i}`) * 1080;
        const y0 = random(`y${i}`) * 1920;
        const r = 30 + random(`r${i}`) * 90;
        const y = (y0 - frame * (0.4 + random(`v${i}`) * 0.8) + 2200) % 2200 - 140;
        const lat = Math.sin(frame / 40 + i) * 20;
        return (
          <div key={i} style={{ position: "absolute", left: x + lat - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", background: `radial-gradient(circle, ${i % 3 ? NAV.oro : "#FFF6D8"}AA 0%, ${NAV.oro}00 70%)`, filter: "blur(6px)" }} />
        );
      })}
    </AbsoluteFill>
  );
};

/** Texto que entra por líneas con máscara. «*» al principio = dorado. */
const Lineas: React.FC<{ readonly lineas: readonly string[]; readonly desde: number; readonly tam?: number; readonly paso?: number; readonly style?: React.CSSProperties; readonly alinear?: "left" | "center" }> = ({
  lineas,
  desde,
  tam = 96,
  paso = 5,
  style,
  alinear = "left",
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, textAlign: alinear, ...style }}>
      {lineas.map((l, i) => {
        const p = entrada(frame, desde + i * paso, 14);
        const oro = l.startsWith("*");
        return (
          <div key={l + i} style={{ overflow: "hidden", paddingBottom: tam * 0.08 }}>
            <div style={{ fontFamily: TIPO.titular, fontWeight: 800, fontSize: tam, lineHeight: 1, letterSpacing: -tam * 0.03, color: oro ? NAV.oro : NAV.blanco, translate: `0px ${(1 - p) * 110}%`, textShadow: "0 6px 30px rgba(0,0,0,0.5)" }}>
              {oro ? l.slice(1) : l}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Etiqueta de sección InfoLinense (caja azul). */
const Etiqueta: React.FC<{ readonly texto: string; readonly desde: number; readonly top?: number; readonly oro?: boolean }> = ({ texto, desde, top = ZONA_SEGURA.arriba, oro }) => {
  const frame = useCurrentFrame();
  const p = suave(frame, desde, 12);
  return (
    <div style={{ position: "absolute", top, left: ZONA_SEGURA.lados, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`, backgroundColor: oro ? NAV.oro : NAV.azul, color: oro ? NAV.profundo : NAV.blanco, fontFamily: TIPO.rotulo, fontWeight: 700, fontSize: 30, letterSpacing: 4, padding: "8px 18px" }}>
      {texto}
    </div>
  );
};

/** Año gigante que rueda de un número al siguiente (contador cronológico). */
const Anio: React.FC<{ readonly de: number; readonly a: number; readonly desde: number; readonly tam?: number; readonly top?: number }> = ({ de, a, desde, tam = 300, top = 520 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [desde, desde + 12], [0, 1], { ...clamp, easing: Easing.bezier(0.7, 0, 0.2, 1) });
  const aparece = entrada(frame, desde - 8, 10);
  const digitos = (n: number) => String(n).split("");
  const A = digitos(de);
  const B = digitos(a);
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: aparece, scale: 0.9 + aparece * 0.1 }}>
      {B.map((d, i) => {
        const cambia = A[i] !== d;
        return (
          <div key={i} style={{ position: "relative", height: tam * 1.02, width: tam * 0.6, overflow: "hidden" }}>
            {(cambia ? [A[i], d] : [d]).map((x, k) => (
              <div key={k} style={{ position: "absolute", inset: 0, textAlign: "center", fontFamily: TIPO.titular, fontWeight: 800, fontSize: tam, lineHeight: 1, color: cambia ? NAV.oro : NAV.blanco, translate: `0px ${cambia ? (k - p) * 100 : 0}%`, textShadow: "0 10px 40px rgba(0,0,0,0.45)" }}>
                {x}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

/* ---------- Recortes de prensa ---------- */

type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/** Captura de prensa como recorte de papel con marcas doradas y cámara que busca el titular. */
const Recorte: React.FC<{
  readonly m: Medio;
  readonly natural: { w: number; h: number };
  readonly ancho: number;
  readonly marcas: readonly (Rect & { desde: number })[];
  readonly camara: readonly { frame: number; foco: Rect | null; zoom: number }[];
  readonly giro?: number;
  readonly desde: number;
  readonly lado?: 1 | -1;
}> = ({ m, natural, ancho, marcas, camara, giro = -2, desde, lado = 1 }) => {
  const frame = useCurrentFrame();
  const s = ancho / natural.w;
  const alto = natural.h * s;
  const p = entrada(frame, desde, 18);
  // Cámara: interpola zoom y centro entre fotogramas clave.
  const fr = camara.map((c) => c.frame);
  const centro = (c: (typeof camara)[number]) => (c.foco ? { x: (c.foco.x + c.foco.w / 2) * s, y: (c.foco.y + c.foco.h / 2) * s } : { x: ancho / 2, y: alto / 2 });
  const cx = camara.length > 1 ? interpolate(frame, fr, camara.map((c) => centro(c).x), { ...clamp, easing: Easing.bezier(0.45, 0, 0.2, 1) }) : centro(camara[0]).x;
  const cy = camara.length > 1 ? interpolate(frame, fr, camara.map((c) => centro(c).y), { ...clamp, easing: Easing.bezier(0.45, 0, 0.2, 1) }) : centro(camara[0]).y;
  const z = camara.length > 1 ? interpolate(frame, fr, camara.map((c) => c.zoom), { ...clamp, easing: Easing.bezier(0.45, 0, 0.2, 1) }) : camara[0].zoom;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", left: 540, top: 900, width: ancho, height: alto, translate: `${-cx}px ${-cy}px`, transformOrigin: `${cx}px ${cy}px`, scale: z, rotate: `${giro * (1 - z / 3)}deg` }}>
        <div style={{ position: "absolute", inset: 0, translate: `${(1 - p) * 1300 * lado}px ${(1 - p) * 120}px`, rotate: `${(1 - p) * 8 * lado}deg`, boxShadow: "0 40px 90px rgba(0,0,0,0.6)", backgroundColor: "#F4F1E8", padding: 0 }}>
          {existe(m.archivo) ? (
            <Img src={staticFile(m.archivo)} style={{ width: ancho, height: alto, display: "block", filter: "grayscale(0.25) sepia(0.12) contrast(1.05)" }} />
          ) : (
            <Pendiente m={m} />
          )}
          {marcas.map((r, i) => {
            const q = interpolate(frame, [r.desde, r.desde + 12], [0, 1], { ...clamp, easing: Easing.bezier(0.3, 0, 0.2, 1) });
            return <div key={i} style={{ position: "absolute", left: r.x * s, top: r.y * s, width: r.w * s * q, height: r.h * s, backgroundColor: NAV.oro, mixBlendMode: "multiply", opacity: 0.85, borderRadius: 4 }} />;
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Cita en grande, palabra a palabra; *palabra* = dorado. */
const Cita: React.FC<{ readonly texto: string; readonly fuente: string; readonly desde: number; readonly tam?: number; readonly top?: number }> = ({ texto, fuente, desde, tam = 78, top = 760 }) => {
  const frame = useCurrentFrame();
  const palabras = texto.split(" ");
  return (
    <div style={{ position: "absolute", top, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
      <div style={{ fontFamily: TIPO.titular, fontWeight: 800, fontSize: tam, lineHeight: 1.05, letterSpacing: -tam * 0.02, color: NAV.blanco, textShadow: "0 6px 30px rgba(0,0,0,0.6)" }}>
        {palabras.map((w, i) => {
          const p = entrada(frame, desde + i * 3, 8);
          const oro = w.includes("*");
          return (
            <span key={i} style={{ display: "inline-block", marginRight: tam * 0.24, opacity: p, translate: `0px ${(1 - p) * 30}px`, color: oro ? NAV.oro : NAV.blanco }}>
              {w.replace(/\*/g, "")}
            </span>
          );
        })}
      </div>
      <div style={{ marginTop: 26, fontFamily: TIPO.rotulo, fontWeight: 600, fontSize: 30, color: "rgba(255,255,255,0.8)", opacity: suave(frame, desde + palabras.length * 3 + 4, 12) }}>— Juan Franco, alcalde, en {fuente}</div>
    </div>
  );
};

/** Dato protagonista: cifra + texto. */
const Dato: React.FC<{ readonly cifra: string; readonly texto: string; readonly desde: number; readonly top: number; readonly oro?: boolean; readonly lado?: 1 | -1 }> = ({ cifra, texto, desde, top, oro = true, lado = -1 }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 14);
  return (
    <div style={{ position: "absolute", top, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, opacity: Math.min(1, p * 2), translate: `${(1 - p) * 160 * lado}px 0px` }}>
      <div style={{ fontFamily: TIPO.titular, fontWeight: 800, fontSize: 150, lineHeight: 0.95, letterSpacing: -5, color: oro ? NAV.oro : NAV.blanco, textShadow: "0 8px 40px rgba(0,0,0,0.55)" }}>{cifra}</div>
      <div style={{ fontFamily: TIPO.rotulo, fontWeight: 700, fontSize: 44, color: NAV.blanco, textTransform: "uppercase", letterSpacing: 1, textShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>{texto}</div>
    </div>
  );
};

/** Chip de concepto sobre la imagen. */
const Chip: React.FC<{ readonly texto: string; readonly desde: number; readonly top: number; readonly izquierda?: number }> = ({ texto, desde, top, izquierda = ZONA_SEGURA.lados }) => {
  const frame = useCurrentFrame();
  const p = suave(frame, desde, 14);
  return (
    <div style={{ position: "absolute", top, left: izquierda, display: "flex", alignItems: "center", gap: 14, opacity: p, translate: `${(1 - p) * -60}px 0px` }}>
      <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: NAV.oro, boxShadow: `0 0 24px ${NAV.oro}` }} />
      <div style={{ fontFamily: TIPO.rotulo, fontWeight: 700, fontSize: 46, color: NAV.blanco, backgroundColor: "rgba(6,30,92,0.78)", padding: "6px 18px", borderRadius: 8, borderLeft: `6px solid ${NAV.oro}` }}>{texto}</div>
    </div>
  );
};

/** Cortina azul que barre la imagen (transición de marca). */
const Cortina: React.FC<{ readonly en: number; readonly dur?: number }> = ({ en, dur = 14 }) => {
  const frame = useCurrentFrame();
  if (frame < en - 1 || frame > en + dur + 1) return null;
  const p = interpolate(frame, [en, en + dur], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 0, bottom: 0, width: 1400, left: interpolate(p, [0, 1], [-1450, 1130]), background: `linear-gradient(90deg, ${NAV.azul}00 0%, ${NAV.azul} 12%, ${NAV.azul} 70%, ${NAV.oro} 74%, ${NAV.azul}00 76%)` }} />
    </AbsoluteFill>
  );
};

/** Destello de luz (no flash blanco a pantalla completa): halo dorado que crece y se apaga. */
const Destello: React.FC<{ readonly en: number }> = ({ en }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [en, en + 5, en + 22], [0, 1, 0], clamp);
  if (p <= 0) return null;
  return <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, rgba(255,246,216,${p * 0.85}) 0%, rgba(228,210,123,${p * 0.45}) 35%, rgba(228,210,123,0) 70%)`, mixBlendMode: "screen", pointerEvents: "none" }} />;
};

/** Antes/después con barra que barre. */
const Comparativa: React.FC<{ readonly antes: Medio; readonly despues: Medio; readonly desde: number; readonly etiquetas: [string, string]; readonly dur?: number }> = ({ antes, despues, desde, etiquetas, dur = 34 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [desde, desde + dur], [0, 1], { ...clamp, easing: Easing.bezier(0.6, 0, 0.3, 1) });
  const corte = 1080 * (1 - p);
  const z = interpolate(frame, [desde - 20, desde + 120], [1.04, 1.14], clamp);
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: NAV.negro }}>
      <AbsoluteFill style={{ scale: z }}>
        <Medio_ m={despues} />
      </AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 ${1080 - corte}px 0 0)`, scale: z }}>
        <Medio_ m={antes} filtro="grayscale(1) sepia(0.3) contrast(1.08)" />
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: corte - 3, width: 6, backgroundColor: NAV.oro, boxShadow: `0 0 30px ${NAV.oro}`, opacity: p > 0 && p < 1 ? 1 : 0 }} />
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 110, left: ZONA_SEGURA.lados, fontFamily: TIPO.titular, fontWeight: 800, fontSize: 84, color: NAV.blanco, opacity: 1 - p, textShadow: "0 4px 24px rgba(0,0,0,0.6)" }}>{etiquetas[0]}</div>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 110, right: ZONA_SEGURA.lados, fontFamily: TIPO.titular, fontWeight: 800, fontSize: 84, color: NAV.oro, opacity: p, textShadow: "0 4px 24px rgba(0,0,0,0.6)" }}>{etiquetas[1]}</div>
    </AbsoluteFill>
  );
};

/** Degradado oscuro arriba y abajo para leer textos sobre fotos. */
const Sombra: React.FC<{ readonly fuerza?: number }> = ({ fuerza = 0.75 }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(5,7,13,${fuerza}) 0%, rgba(5,7,13,0) 38%, rgba(5,7,13,0) 58%, rgba(5,7,13,${fuerza}) 100%)` }} />
);

/* ---------- Escenas (frames relativos a su inicio) ---------- */

/** 1 · Gancho (0–4 s). */
const Gancho: React.FC = () => {
  const frame = useCurrentFrame();
  const slam = f(2.5);
  const golpe = entrada(frame, slam, 10, 14);
  const subir = suave(frame, slam - 2, 12);
  return (
    <AbsoluteFill style={{ backgroundColor: NAV.negro }}>
      <AbsoluteFill style={{ opacity: 0.55 }}>
        <Parallax m={MEDIOS.archivo2023} dur={f(4.5)} color={0} zoom={[1.15, 1.3]} credito={false} />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: `rgba(6,30,92,0.45)` }} />
      <div style={{ translate: `0px ${-subir * 360}px`, opacity: 1 - subir * 0.25 }}>
        <Lineas lineas={["Hace solo", "tres años,", "la Navidad de", "La Línea era noticia", "*por algo muy diferente"]} desde={3} paso={6} tam={88} style={{ top: 760 }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1060, textAlign: "center", fontFamily: TIPO.titular, fontWeight: 800, fontSize: 420, lineHeight: 1, letterSpacing: -14, color: "transparent", WebkitTextStroke: `6px ${NAV.oro}`, opacity: golpe, scale: 1.6 - golpe * 0.6, textShadow: `0 0 60px ${NAV.oro}55` }}>
        2023
      </div>
      <Grano fuerza={0.28} />
    </AbsoluteFill>
  );
};

/** 2 · Hemeroteca (4–18 s). */
const Hemeroteca: React.FC = () => {
  const S = f(T.hemeroteca);
  const quejas = W("hemeroteca", 1, "quejas") - S;
  const nacional = W("hemeroteca", 1, "nacional") - S;
  const limitaciones = W("hemeroteca", 1, "limitaciones") - S;
  const criticas = W("hemeroteca", 0, "críticas") - S;
  const DA = { w: 2000, h: 1522 };
  const LR = { w: 1422, h: 1762 };
  const cita = { x: 1015, y: 126, w: 945, h: 86 };
  const bmw = { x: 75, y: 300, w: 1320, h: 270 };
  const deuda = { x: 70, y: 625, w: 1290, h: 100 };
  const razonDesde = quejas - 4;
  return (
    <AbsoluteFill style={{ backgroundColor: NAV.profundo }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #0B2E80 0%, ${NAV.profundo} 55%, ${NAV.negro} 100%)` }} />
      <Etiqueta texto="HEMEROTECA · 2023" desde={2} />
      {/* Diario Área */}
      <Sequence durationInFrames={razonDesde + 24} layout="none">
        <Recorte
          m={MEDIOS.diarioArea}
          natural={DA}
          ancho={1000}
          desde={0}
          lado={-1}
          giro={-2.5}
          marcas={[{ ...cita, desde: criticas + 6 }]}
          camara={[
            { frame: 0, foco: null, zoom: 0.95 },
            { frame: 20, foco: null, zoom: 0.95 },
            { frame: criticas, foco: cita, zoom: 1.7 },
            { frame: razonDesde + 20, foco: cita, zoom: 1.85 },
          ]}
        />
      </Sequence>
      {/* La Razón */}
      <Sequence from={razonDesde} layout="none">
        <Recorte
          m={MEDIOS.laRazon}
          natural={LR}
          ancho={900}
          desde={0}
          lado={1}
          giro={2}
          marcas={[
            { x: 555, y: 302, w: 840, h: 76, desde: nacional - razonDesde + 2 },
            { x: 75, y: 396, w: 1210, h: 76, desde: nacional - razonDesde + 8 },
            { x: 75, y: 490, w: 960, h: 76, desde: nacional - razonDesde + 14 },
            { x: 680, y: 676, w: 430, h: 50, desde: limitaciones - razonDesde + 4 },
          ]}
          camara={[
            { frame: 0, foco: null, zoom: 0.9 },
            { frame: nacional - razonDesde, foco: bmw, zoom: 1.25 },
            { frame: limitaciones - razonDesde - 4, foco: bmw, zoom: 1.3 },
            { frame: limitaciones - razonDesde + 14, foco: deuda, zoom: 1.6 },
          ]}
        />
      </Sequence>
      <Sequence from={nacional - 4} layout="none">
        <Etiqueta texto="PRENSA NACIONAL" desde={0} top={ZONA_SEGURA.arriba + 60} oro />
      </Sequence>
      <Sequence from={limitaciones + 18} layout="none">
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,7,13,0) 30%, rgba(5,7,13,0.92) 55%)" }} />
        <Dato cifra="127 M€" texto="de deuda, según el alcalde" desde={0} top={1060} />
      </Sequence>
      <Sequence  durationInFrames={razonDesde + 20} layout="none">
        <div style={{ position: "absolute", bottom: ZONA_SEGURA.abajo + 210, left: ZONA_SEGURA.lados, fontFamily: TIPO.texto, fontWeight: 600, fontSize: 24, color: "rgba(255,255,255,0.7)" }}>{MEDIOS.diarioArea.credito}</div>
      </Sequence>
      <Sequence from={razonDesde + 20} layout="none">
        <div style={{ position: "absolute", bottom: ZONA_SEGURA.abajo + 210, left: ZONA_SEGURA.lados, fontFamily: TIPO.texto, fontWeight: 600, fontSize: 24, color: "rgba(255,255,255,0.7)" }}>{MEDIOS.laRazon.credito}</div>
      </Sequence>
      <Grano fuerza={0.2} />
    </AbsoluteFill>
  );
};

/** Subtítulos del clip del alcalde (palabra a palabra, *clave* en dorado). */
const SubtitulosClip: React.FC<{ readonly tramos: readonly { desde: number; hasta: number; texto: string }[] }> = ({ tramos }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const tramo = tramos.find((x) => t >= x.desde && t < x.hasta);
  if (!tramo) return null;
  const palabras = tramo.texto.split(" ");
  const k = Math.floor(((t - tramo.desde) / (tramo.hasta - tramo.desde)) * palabras.length);
  return (
    <div style={{ position: "absolute", left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, bottom: ZONA_SEGURA.abajo + 40, textAlign: "center", fontFamily: TIPO.texto, fontWeight: 800, fontSize: 52, lineHeight: 1.25, color: NAV.blanco }}>
      <span style={{ backgroundColor: "rgba(5,7,13,0.8)", padding: "8px 18px", borderRadius: 12, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>
        {palabras.map((w, i) => (
          <span key={i} style={{ color: w.includes("*") ? NAV.oro : NAV.blanco, opacity: i <= k ? 1 : 0.5 }}>
            {w.replace(/\*/g, "")}{" "}
          </span>
        ))}
      </span>
    </div>
  );
};

/** 3 · Las palabras del alcalde (18–26 s). */
const Alcalde: React.FC = () => {
  const hayVideo = existe(ALCALDE.archivo);
  if (hayVideo) {
    return (
      <AbsoluteFill style={{ backgroundColor: NAV.negro }}>
        <AbsoluteFill style={{ filter: "blur(30px)", opacity: 0.7, scale: 1.3 }}>
          <Video src={staticFile(ALCALDE.archivo)} trimBefore={f(ALCALDE.recorteInicio)} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
        </AbsoluteFill>
        <AbsoluteFill style={{ justifyContent: "center" }}>
          <Video src={staticFile(ALCALDE.archivo)} trimBefore={f(ALCALDE.recorteInicio)} objectFit="contain" style={{ width: "100%", height: "100%" }} />
        </AbsoluteFill>
        <Etiqueta texto="4 DIC. 2023 · VÍDEO DEL ALCALDE" desde={4} />
        <SubtitulosClip tramos={ALCALDE.subtitulos} />
        <Grano fuerza={0.15} />
      </AbsoluteFill>
    );
  }
  const segunda = f(3.4);
  return (
    <AbsoluteFill style={{ backgroundColor: NAV.negro }}>
      <AbsoluteFill style={{ opacity: 0.6 }}>
        <Parallax m={MEDIOS.fotogramaAlcalde} dur={f(8)} color={0.15} zoom={[1.1, 1.28]} deriva={-30} credito={false} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,7,13,0.2) 0%, rgba(5,7,13,0.75) 45%, rgba(5,7,13,0.9) 100%)" }} />
      <Etiqueta texto="LAS PALABRAS DEL ALCALDE" desde={4} />
      <Sequence durationInFrames={segunda} layout="none">
        <Cita texto={CITAS_PRENSA[0].texto} fuente={CITAS_PRENSA[0].fuente} desde={6} tam={120} top={820} />
      </Sequence>
      <Sequence from={segunda} layout="none">
        <Cita texto={CITAS_PRENSA[1].texto} fuente={CITAS_PRENSA[1].fuente} desde={2} tam={86} top={720} />
      </Sequence>
      <Credito texto={MEDIOS.fotogramaAlcalde.credito} abajo={ZONA_SEGURA.abajo + 60} />
      <Grano fuerza={0.25} />
    </AbsoluteFill>
  );
};

/** 4 · 2024: comienza el cambio (26–31 s). */
const Cambio: React.FC = () => {
  const frame = useCurrentFrame();
  const S = f(T.cambio);
  const cambios = W("cambio", 0, "cambios") - S;
  const fotos = 26;
  const p = suave(frame, fotos, 20);
  return (
    <AbsoluteFill style={{ backgroundColor: NAV.profundo }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, #123C9E 0%, ${NAV.profundo} 60%, ${NAV.negro} 100%)` }} />
      <Anio de={2023} a={2024} desde={6} top={ZONA_SEGURA.arriba + 40} tam={250} />
      <Lineas lineas={["Comienza", "*el cambio"]} desde={14} tam={104} style={{ top: 500 }} />
      {[MEDIOS.encendido2024a, MEDIOS.encendido2024b].map((m, i) => {
        const q = entrada(frame, fotos + i * 8, 18);
        return (
          <div key={m.archivo} style={{ position: "absolute", top: 780 + i * 300, left: i ? 300 : 80, width: 700, height: 470, borderRadius: 18, overflow: "hidden", border: `5px solid ${i ? NAV.oro : NAV.blanco}`, boxShadow: "0 30px 70px rgba(0,0,0,0.55)", opacity: q, translate: `${(1 - q) * (i ? 500 : -500)}px 0px`, rotate: `${i ? 2 : -2}deg` }}>
            <AbsoluteFill style={{ scale: 1.05 + p * 0.08 }}>
              {/* El color vuelve poco a poco. */}
              <Medio_ m={m} compacto filtro={`grayscale(${1 - p * 0.9})`} />
            </AbsoluteFill>
          </div>
        );
      })}
      <Sequence from={cambios} layout="none">
        <Chip texto="Primeros cambios" desde={0} top={1440} />
      </Sequence>
      <Grano fuerza={0.12} />
    </AbsoluteFill>
  );
};

/** 5 · 2025: una Navidad que sigue creciendo (31–38,5 s). */
const Crece: React.FC = () => {
  const frame = useCurrentFrame();
  const S = f(T.crece);
  const espacios = W("crece", 0, "espacios") - S;
  const elementos = W("crece", 0, "elementos") - S;
  const espectaculos = W("crece", 0, "espectáculos") - S;
  const corteDrones = espectaculos - 6;
  const dur = f(T.presente - T.crece);
  return (
    <AbsoluteFill style={{ backgroundColor: NAV.negro }}>
      <Sequence durationInFrames={corteDrones + 8} layout="none">
        <Comparativa antes={MEDIOS.archivo2023} despues={MEDIOS.encendido2025} desde={4} etiquetas={["2023", "2025"]} dur={30} />
        <AbsoluteFill style={{ opacity: suave(frame, 40, 20) }}>
          <Parallax m={MEDIOS.encendido2025} dur={corteDrones} zoom={[1.14, 1.32]} deriva={-50} />
        </AbsoluteFill>
        <Sombra />
        <Bokeh opacidad={0.35} n={8} />
        <Chip texto="Nuevos espacios" desde={espacios} top={1060} />
        <Chip texto="Nuevos elementos decorativos" desde={elementos} top={1150} />
      </Sequence>
      <Sequence from={corteDrones} layout="none">
        <AbsoluteFill style={{ clipPath: `circle(${suave(frame, corteDrones, 16) * 130}% at 50% 40%)` }}>
          <Sequence durationInFrames={28} layout="none">
            <Parallax m={MEDIOS.drones2025a} dur={40} zoom={[1.5, 1.7]} deriva={20} />
          </Sequence>
          <Sequence from={28} layout="none">
            <Parallax m={MEDIOS.drones2025b} dur={dur - corteDrones - 28} zoom={[1.45, 1.6]} deriva={-20} />
          </Sequence>
        </AbsoluteFill>
        <Sombra fuerza={0.6} />
        <Chip texto="Espectáculo de drones" desde={0} top={1150} />
      </Sequence>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba, left: 0, right: 0, opacity: entrada(frame, 40, 14) }}>
        <Anio de={2024} a={2025} desde={46} top={0} tam={210} />
      </div>
      <Lineas lineas={["Una Navidad", "*que sigue creciendo"]} desde={54} tam={84} style={{ top: ZONA_SEGURA.arriba + 230 }} />
      <Grano fuerza={0.08} />
    </AbsoluteFill>
  );
};

/** Árbol de 16 m: línea de cota que se dibuja junto a la foto. */
const Cota: React.FC<{ readonly desde: number }> = ({ desde }) => {
  const frame = useCurrentFrame();
  const p = suave(frame, desde, 26);
  const alto = 900;
  const n = Math.round(interpolate(frame, [desde, desde + 26], [0, 16], clamp));
  return (
    <div style={{ position: "absolute", left: ZONA_SEGURA.lados + 20, top: 560, height: alto, width: 400 }}>
      <div style={{ position: "absolute", left: 0, bottom: 0, width: 6, height: alto * p, backgroundColor: NAV.oro, boxShadow: `0 0 20px ${NAV.oro}` }} />
      {[0, 1].map((k) => (
        <div key={k} style={{ position: "absolute", left: -18, width: 42, height: 6, backgroundColor: NAV.oro, bottom: k ? alto * p - 3 : -3 }} />
      ))}
      <div style={{ position: "absolute", left: 40, bottom: alto * p - 130, textAlign: "left", fontFamily: TIPO.titular, fontWeight: 800, fontSize: 150, lineHeight: 0.9, color: NAV.oro, textShadow: "0 6px 30px rgba(0,0,0,0.6)" }}>
        {n}
        <span style={{ fontSize: 70 }}> m</span>
      </div>
    </div>
  );
};

/** Tres pases diarios: tres relojes que se encienden. */
const Pases: React.FC<{ readonly desde: number }> = ({ desde }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: 900, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
      <div style={{ display: "flex", gap: 26 }}>
        {[0, 1, 2].map((i) => {
          const p = entrada(frame, desde + i * 6, 12, 12);
          return (
            <svg key={i} width={120} height={120} viewBox="0 0 24 24" style={{ opacity: p, scale: 0.6 + p * 0.4, filter: `drop-shadow(0 0 ${12 * p}px ${NAV.oro})` }} fill="none" stroke={NAV.oro} strokeWidth={1.8} strokeLinecap="round">
              <circle cx="12" cy="12" r="9.5" />
              <path d="M12 7v5l3.5 2" />
            </svg>
          );
        })}
      </div>
      <div style={{ marginTop: 18, fontFamily: TIPO.titular, fontWeight: 800, fontSize: 92, color: NAV.blanco, lineHeight: 1, opacity: suave(frame, desde + 14, 12), textShadow: "0 6px 30px rgba(0,0,0,0.6)" }}>
        3 pases <span style={{ color: NAV.oro }}>diarios</span>
      </div>
      <div style={{ marginTop: 8, fontFamily: TIPO.rotulo, fontWeight: 700, fontSize: 40, color: NAV.blanco, opacity: suave(frame, desde + 20, 12) }}>Espectáculo de luz y sonido · Plaza de la Iglesia</div>
    </div>
  );
};

/** 6 · 2026: tres años después (38,5–54 s). El clímax. */
const Presente: React.FC = () => {
  const frame = useCurrentFrame();
  const S = f(T.presente);
  const calles = W("presente", 1, "calles") - S;
  const arbol = W("presente", 1, "árbol") - S;
  const espectaculo = W("presente", 1, "espectáculo") - S;
  const finVoz = f(enVideo("presente", tramoVoz("presente").hasta)) - S;
  const comparar = finVoz + 6;
  const dur = f(T.cierre - T.presente);
  return (
    <AbsoluteFill style={{ backgroundColor: NAV.negro }}>
      {/* Apertura: año que rueda sobre la plaza */}
      <Sequence durationInFrames={calles} layout="none">
        <Parallax m={MEDIOS.plaza2026} dur={calles} zoom={[1.25, 1.05]} deriva={30} />
        <Sombra fuerza={0.8} />
        <Anio de={2025} a={2026} desde={8} top={ZONA_SEGURA.arriba + 160} tam={300} />
        <Lineas lineas={["Tres años", "*después"]} desde={20} tam={120} alinear="center" style={{ top: 860 }} />
      </Sequence>
      {/* Más calles iluminadas */}
      <Sequence from={calles} durationInFrames={arbol - calles + 4} layout="none">
        <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${(1 - suave(frame, calles, 10)) * 100}%)` }}>
          <Parallax m={MEDIOS.calles2026} dur={arbol - calles + 4} zoom={[1.1, 1.3]} deriva={-60} />
          <Sombra />
          <Chip texto="Más calles iluminadas" desde={4} top={1150} />
        </AbsoluteFill>
      </Sequence>
      {/* Árbol de 16 metros */}
      <Sequence from={arbol} durationInFrames={espectaculo - arbol + 4} layout="none">
        <AbsoluteFill style={{ clipPath: `inset(${(1 - suave(frame, arbol, 10)) * 100}% 0 0 0)` }}>
          <Parallax m={MEDIOS.arbol2026} dur={espectaculo - arbol + 4} zoom={[1.3, 1.08]} deriva={0} />
          <Sombra />
          <Cota desde={4} />
          <Lineas lineas={["Árbol de", "*Navidad"]} desde={2} tam={90} alinear="center" style={{ top: ZONA_SEGURA.arriba + 40 }} />
        </AbsoluteFill>
      </Sequence>
      {/* Espectáculo de luz y sonido */}
      <Sequence from={espectaculo} durationInFrames={comparar - espectaculo + 6} layout="none">
        <AbsoluteFill style={{ clipPath: `circle(${suave(frame, espectaculo, 14) * 130}% at 50% 50%)` }}>
          <Parallax m={MEDIOS.espectaculo2026} dur={comparar - espectaculo} zoom={[1.05, 1.2]} deriva={20} />
          <Sombra fuerza={0.85} />
          <Bokeh opacidad={0.4} n={10} />
          <Pases desde={6} />
        </AbsoluteFill>
      </Sequence>
      {/* Antes / después en el mismo lugar */}
      <Sequence from={comparar} layout="none">
        <Comparativa antes={MEDIOS.archivo2023} despues={MEDIOS.mismoLugar2026} desde={6} etiquetas={["2023", "2026"]} dur={36} />
        <Sombra fuerza={0.5} />
        <Chip texto="Nuevos espacios decorados" desde={40} top={1150} />
      </Sequence>
      <Destello en={0} />
      <Destello en={calles} />
      <Destello en={arbol} />
      <Destello en={espectaculo} />
      <Destello en={comparar + 40} />
      <Grano fuerza={0.06} />
      <AbsoluteFill style={{ opacity: interpolate(frame, [dur - 10, dur], [0, 0.6], clamp), backgroundColor: NAV.negro }} />
    </AbsoluteFill>
  );
};

/** 7 · Cierre (54–61 s). */
const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const S = f(T.cierre);
  const frases = tiempos.frasesTemporizadas("cierre").map((fr) => f(enVideo("cierre", fr.inicio)) - S);
  const logo = f(enVideo("cierre", tramoVoz("cierre").hasta) + 0.25) - S;
  const pl = entrada(frame, logo, 18);
  return (
    <AbsoluteFill style={{ backgroundColor: NAV.negro }}>
      <AbsoluteFill style={{ opacity: 1 - suave(frame, logo, 16) * 0.75 }}>
        <Parallax m={MEDIOS.cierre2026} dur={f(FIN - T.cierre)} zoom={[1.05, 1.22]} deriva={-25} credito={false} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(5,7,13,0.45)" }} />
      <Bokeh opacidad={0.45} n={14} />
      <div style={{ translate: `0px ${-suave(frame, logo - 4, 16) * 260}px` }}>
        <Lineas lineas={["La misma ciudad."]} desde={frases[0] - 2} tam={96} alinear="center" style={{ top: 640 }} />
        <Lineas lineas={["Tres años después."]} desde={frases[1] - 2} tam={96} alinear="center" style={{ top: 760 }} />
        <Lineas lineas={["*Una Navidad diferente."]} desde={frases[2] - 2} tam={96} alinear="center" style={{ top: 880 }} />
      </div>
      <div style={{ position: "absolute", top: 1010, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, opacity: pl, translate: `0px ${(1 - pl) * 40}px` }}>
        <Img src={staticFile("marca/logo.png")} style={{ width: 520 }} />
        <div style={{ fontFamily: TIPO.rotulo, fontWeight: 700, fontSize: 40, letterSpacing: 8, color: NAV.oro }}>INFOLINENSE.COM</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Subtítulos ---------- */

const CLAVES = /^(2023|2024|2025|2026|críticas|prensa|nacional|limitaciones|económicas|cambios|espacios|espectáculos|árbol|16|metros|luz|sonido|diferente)$/i;

const capturas = (): Caption[] => {
  const out: Caption[] = [];
  for (const e of ESCENAS) {
    for (const fr of tiempos.frasesTemporizadas(e.id)) {
      let car = 0;
      fr.palabras.forEach((p, k) => {
        car += p.texto.length + 1;
        const sig = fr.palabras[k + 1];
        const corte = sig === undefined || car + (sig?.texto.length ?? 0) > 26 || (/[,.:;]$/.test(p.texto) && car > 12);
        if (corte) car = 0;
        out.push({ text: (k ? " " : "") + p.texto, startMs: Math.round(enVideo(e.id, p.inicio) * 1000), endMs: Math.round(enVideo(e.id, p.fin) * 1000), timestampMs: null, confidence: null, pageBreakAfter: corte });
      });
    }
  }
  return out;
};

const SubtitulosNavidad: React.FC<{ readonly captions: Caption[]; readonly ocultarEntre: [number, number][] }> = ({ captions, ocultarEntre }) => {
  const frame = useCurrentFrame();
  const ms = (frame / 30) * 1000;
  const paginas = useMemo(() => {
    const ps: Caption[][] = [];
    let act: Caption[] = [];
    for (const c of captions) {
      act.push(c);
      if (c.pageBreakAfter) {
        ps.push(act);
        act = [];
      }
    }
    if (act.length) ps.push(act);
    return ps;
  }, [captions]);
  if (ocultarEntre.some(([a, b]) => frame >= a && frame < b)) return null;
  const i = paginas.findIndex((p, k) => {
    const sig = paginas[k + 1];
    const fin = Math.min(sig ? sig[0].startMs : Infinity, p[p.length - 1].endMs + 350);
    return ms >= p[0].startMs && ms < fin;
  });
  if (i < 0) return null;
  const pag = paginas[i];
  const d = frame - (pag[0].startMs / 1000) * 30;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: ZONA_SEGURA.abajo + 20, paddingLeft: ZONA_SEGURA.lados, paddingRight: ZONA_SEGURA.lados }}>
      <div style={{ fontFamily: TIPO.texto, fontWeight: 800, fontSize: 52, lineHeight: 1.2, textAlign: "center", color: NAV.blanco, backgroundColor: "rgba(6,30,92,0.86)", borderBottom: `4px solid ${NAV.oro}`, padding: "12px 24px", borderRadius: 12, maxWidth: 920, opacity: interpolate(d, [0, 3], [0, 1], clamp), translate: `0px ${interpolate(d, [0, 5], [10, 0], clamp)}px` }}>
        {pag.map((c, k) => {
          const w = c.text.trimStart();
          const clave = CLAVES.test(w.replace(/[,.:;…?!«»"]/g, ""));
          return (
            <span key={k} style={{ whiteSpace: "pre", opacity: ms >= c.startMs ? 1 : 0.5, color: clave ? NAV.oro : NAV.blanco }}>
              {c.text.startsWith(" ") ? " " : ""}
              {w}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Composición ---------- */

const PIEZAS: { readonly nombre: string; readonly desde: number; readonly hasta: number; readonly C: React.FC; readonly cortina?: boolean }[] = [
  { nombre: "1 · Gancho", desde: T.gancho, hasta: T.hemeroteca, C: Gancho },
  { nombre: "2 · Hemeroteca 2023", desde: T.hemeroteca, hasta: T.alcalde, C: Hemeroteca },
  { nombre: "3 · Palabras del alcalde", desde: T.alcalde, hasta: T.cambio, C: Alcalde, cortina: true },
  { nombre: "4 · 2024", desde: T.cambio, hasta: T.crece, C: Cambio, cortina: true },
  { nombre: "5 · 2025", desde: T.crece, hasta: T.presente, C: Crece, cortina: true },
  { nombre: "6 · 2026", desde: T.presente, hasta: T.cierre, C: Presente },
  { nombre: "7 · Cierre", desde: T.cierre, hasta: FIN, C: Cierre },
];

/** Efecto de sonido en un segundo del vídeo. */
const Sfx: React.FC<{ readonly src: string; readonly en: number; readonly vol?: number; readonly dur?: number }> = ({ src, en, vol = 0.4, dur = 3 }) => (
  <Sequence name={`SFX ${src.split("/").pop()}`} from={Math.max(0, f(en))} durationInFrames={f(dur)}>
    <Audio src={staticFile(src)} volume={vol} />
  </Sequence>
);

/** Documental: el alumbrado navideño de La Línea, 2023 → 2026. */
export const AlumbradoNavidad: React.FC = () => {
  const { fps } = useVideoConfig();
  const captions = useMemo(capturas, []);
  const hayClip = existe(ALCALDE.archivo);
  const s = (frame: number) => frame / fps;
  // Música: arranca nostálgica, cede ante la voz y sube en el clímax.
  const volMusica = (fr: number) => {
    const t = s(fr) + 1.2;
    return interpolate(
      t,
      [1.2, 2.5, T.hemeroteca, T.alcalde - 0.3, T.alcalde + 0.4, T.cambio - 0.4, T.cambio + 0.2, 49.6, 50.6, T.cierre, FIN - 1.5, FIN],
      [0, 0.75, 0.42, 0.42, hayClip ? 0.18 : 0.8, hayClip ? 0.18 : 0.8, 0.45, 0.5, 1, 0.55, 0.6, 0],
      clamp,
    );
  };
  return (
    <AbsoluteFill style={{ backgroundColor: NAV.negro }}>
      {PIEZAS.map(({ nombre, desde, hasta, C }) => (
        <Sequence key={nombre} name={nombre} from={f(desde)} durationInFrames={f(hasta) - f(desde)} premountFor={fps}>
          <C />
        </Sequence>
      ))}
      {PIEZAS.filter((p) => p.cortina).map((p) => (
        <Sequence key={`c${p.nombre}`} name="Cortina" from={f(p.desde) - 8} durationInFrames={22}>
          <Cortina en={0} />
        </Sequence>
      ))}
      <Sequence name="Subtítulos">
        <SubtitulosNavidad captions={captions} ocultarEntre={[[f(T.cierre), f(FIN)]]} />
      </Sequence>

      {/* Locución: cada escena coloca su tramo. */}
      {ESCENAS.map((e) => {
        const { desde, hasta } = tramoVoz(e.id);
        return (
          <Sequence key={`voz-${e.id}`} name={`Locución ${e.id}`} from={f(INICIO_VOZ[e.id])} durationInFrames={f(hasta - desde + 0.35)}>
            <Audio src={staticFile(AUDIO.locucion)} trimBefore={f(Math.max(0, desde - 0.05))} />
          </Sequence>
        );
      })}
      <Sequence name="Música" from={f(1.2)}>
        <Audio src={staticFile(AUDIO.musica)} volume={volMusica} />
      </Sequence>

      {/* Ambiente y efectos */}
      <Sequence name="Ambiente 2023" durationInFrames={f(4.6)}>
        <Audio src={staticFile(AUDIO.ambiente)} volume={(fr) => interpolate(fr, [0, 10, f(3.6), f(4.6)], [0, 0.35, 0.35, 0], clamp)} />
      </Sequence>
      <Sequence name="Ambiente 2026" from={f(T.presente + 9)} durationInFrames={f(9)}>
        <Audio src={staticFile(AUDIO.ambiente)} volume={(fr) => interpolate(fr, [0, 20, f(7), f(9)], [0, 0.22, 0.22, 0], clamp)} />
      </Sequence>
      <Sfx src={AUDIO.proyector} en={0} vol={0.35} />
      <Sfx src={AUDIO.golpe} en={2.5} vol={0.5} />
      <Sfx src={AUDIO.papel} en={T.hemeroteca} vol={0.45} />
      <Sfx src={AUDIO.subrayado} en={s(W("hemeroteca", 0, "críticas") + 6)} vol={0.35} />
      <Sfx src={AUDIO.papel} en={s(W("hemeroteca", 1, "quejas") - 4)} vol={0.45} />
      <Sfx src={AUDIO.subrayado} en={s(W("hemeroteca", 1, "nacional") + 2)} vol={0.35} />
      <Sfx src={AUDIO.subrayado} en={s(W("hemeroteca", 1, "limitaciones") + 4)} vol={0.3} />
      {[T.alcalde, T.cambio, T.crece].map((t) => (
        <Sfx key={t} src={AUDIO.barrido} en={t - 0.25} vol={0.3} />
      ))}
      <Sfx src={AUDIO.tic} en={T.cambio + 0.2} vol={0.45} />
      <Sfx src={AUDIO.tic} en={T.crece + 1.55} vol={0.45} />
      <Sfx src={AUDIO.tic} en={T.presente + 0.27} vol={0.45} />
      <Sfx src={AUDIO.destello} en={T.presente - 0.4} vol={0.5} />
      <Sfx src={AUDIO.golpe} en={T.presente} vol={0.5} />
      <Sfx src={AUDIO.destello} en={s(W("presente", 1, "árbol")) - 0.3} vol={0.3} />
      <Sfx src={AUDIO.destello} en={s(W("presente", 1, "espectáculo")) - 0.3} vol={0.3} />
      <Sfx src={AUDIO.destello} en={enVideo("cierre", tramoVoz("cierre").hasta)} vol={0.35} />
    </AbsoluteFill>
  );
};
