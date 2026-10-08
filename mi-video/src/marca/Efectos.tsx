import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR } from "./marca";

/* Efectos de anuncio: cámara, transiciones de látigo, brillos y fondo con profundidad. */

const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

/** Fondo "pro": degradado, brillos que se desplazan, rejilla de puntos y haces de luz. */
export const FondoPro: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(165deg, ${COLOR.azulOscuro} 0%, #0B2F9E 45%, ${COLOR.azul} 100%)`, overflow: "hidden" }}>
      {/* Brillos grandes */}
      <div style={{ position: "absolute", width: 1400, height: 1400, borderRadius: 700, left: -500 + Math.sin(t * 0.6) * 160, top: 200 + Math.cos(t * 0.5) * 140, background: "radial-gradient(circle, rgba(80,140,255,0.55) 0%, rgba(80,140,255,0) 60%)" }} />
      <div style={{ position: "absolute", width: 1100, height: 1100, borderRadius: 550, right: -420 + Math.cos(t * 0.7) * 120, top: 1000 + Math.sin(t * 0.4) * 160, background: "radial-gradient(circle, rgba(196,233,16,0.16) 0%, rgba(196,233,16,0) 60%)" }} />
      {/* Rejilla de puntos con desplazamiento lento */}
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.16) 2px, transparent 2.5px)",
          backgroundSize: "54px 54px",
          backgroundPosition: `${frame * 0.6}px ${frame * 1.2}px`,
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,0.15))",
        }}
      />
      {/* Haces diagonales */}
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        {[0, 1, 2].map((i) => {
          const y = ((i * 900 + frame * 9) % 3200) - 700;
          return <line key={i} x1={-300} y1={y + 700} x2={1400} y2={y} stroke="white" strokeOpacity={0.05} strokeWidth={140} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/**
 * Cámara de escena: acercamiento continuo, deriva y balanceo suave,
 * con entrada tipo "látigo" (desplazamiento rápido + desenfoque) y salida igual.
 */
export const CamaraEscena: React.FC<{
  readonly children: React.ReactNode;
  readonly direccion?: 1 | -1;
  readonly empuje?: number;
  /** false cuando la escena sale con su propio movimiento (p. ej. zoom a través). */
  readonly salida?: boolean;
  /** Giro en perspectiva al entrar/salir (solo anuncios fuera del sistema de marca). */
  readonly giro3d?: boolean;
}> = ({ children, direccion = 1, empuje = 0.07, salida = true, giro3d = false }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const entra = interpolate(frame, [0, 9], [1, 0], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const sale = !salida ? 0 : interpolate(frame, [durationInFrames - 7, durationInFrames], [0, 1], { ...clamp, easing: Easing.bezier(0.7, 0, 0.84, 0) });
  const desplaz = entra * 520 * direccion - sale * 520 * direccion;
  const blur = (entra + sale) * 18;
  return (
    <AbsoluteFill
      style={{
        translate: `${desplaz + Math.sin(frame / 40) * 10}px ${Math.cos(frame / 50) * 8}px`,
        scale: interpolate(frame, [0, durationInFrames], [1.04, 1.04 + empuje]),
        rotate: `${interpolate(frame, [0, durationInFrames], [-0.8 * direccion, 0.6 * direccion])}deg`,
        transform: giro3d ? `perspective(1600px) rotateY(${(entra - sale) * -35 * direccion}deg)` : undefined,
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        opacity: 1 - sale * 0.4,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Franja de marca que cruza la pantalla en un corte (colócala centrada en el corte). */
export const Latigo: React.FC<{ readonly color?: string; readonly direccion?: 1 | -1 }> = ({ color = COLOR.lima, direccion = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const x = interpolate(p, [0, 1], [-1600, 1600]) * direccion;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, top: -400, width: 520, height: 2800, backgroundColor: color, translate: `${x}px 0px`, rotate: "18deg", filter: "blur(2px)" }} />
      <div style={{ position: "absolute", left: 300, top: -400, width: 160, height: 2800, backgroundColor: COLOR.blanco, opacity: 0.7, translate: `${x * 1.15}px 0px`, rotate: "18deg" }} />
    </AbsoluteFill>
  );
};

/** Destello que barre un bloque (ponlo dentro de un contenedor con overflow hidden). */
export const Brillo: React.FC<{ readonly desde: number; readonly duracion?: number }> = ({ desde, duracion = 18 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [desde, desde + duracion], [-0.4, 1.4], clamp);
  if (p <= -0.4 || p >= 1.4) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(105deg, rgba(255,255,255,0) ${p * 100 - 18}%, rgba(255,255,255,0.75) ${p * 100}%, rgba(255,255,255,0) ${p * 100 + 18}%)`,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

/** Palabra que entra con golpe: desde grande y desenfocada a nítida. */
export const Golpe: React.FC<{ readonly children: React.ReactNode; readonly desde: number; readonly style?: React.CSSProperties }> = ({ children, desde, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [desde, desde + 10], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  return (
    <div
      style={{
        opacity: interpolate(frame, [desde, desde + 3], [0, 1], clamp),
        scale: interpolate(p, [0, 1], [1.8, 1]),
        filter: p < 0.98 ? `blur(${(1 - p) * 16}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Anillos que se expanden (clic, "salto", impacto). */
export const Ondas: React.FC<{ readonly x: number; readonly y: number; readonly desde: number; readonly color?: string }> = ({ x, y, desde, color = COLOR.lima }) => {
  const frame = useCurrentFrame();
  return (
    <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {[0, 1, 2].map((i) => {
        const t = interpolate(frame - desde - i * 5, [0, 24], [0, 1], clamp);
        if (t <= 0 || t >= 1) return null;
        return <circle key={i} cx={x} cy={y} r={40 + t * 420} fill="none" stroke={color} strokeWidth={8 * (1 - t) + 1} opacity={1 - t} />;
      })}
    </svg>
  );
};
