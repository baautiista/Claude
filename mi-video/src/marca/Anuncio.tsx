import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada } from "./animacion";
import { COLOR, FUENTE } from "./marca";

/* Piezas para anuncios de marca (campañas cortas). */

/** Fondo de campaña: degradado azul oscuro → azul eléctrico con líneas en movimiento. */
export const FondoCampana: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${COLOR.azulOscuro} 0%, ${COLOR.azul} 75%)` }}>
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const y = ((i * 380 + frame * 6) % 2600) - 400;
          return <line key={i} x1={-200} y1={y + 600} x2={1300} y2={y} stroke="white" strokeOpacity={0.06} strokeWidth={60} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** Entrada/salida de escena: zoom suave y fundido rápido. */
export const Plano: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(frame, [0, 4, durationInFrames - 4, durationInFrames], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        scale: interpolate(frame, [0, 10], [1.06, 1], { extrapolateRight: "clamp" }),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Línea de texto que entra deslizando desde la izquierda. */
export const Linea: React.FC<{
  readonly children: React.ReactNode;
  readonly desde: number;
  readonly tamano: number;
  readonly color?: string;
  readonly fondo?: string;
}> = ({ children, desde, tamano, color = COLOR.blanco, fondo }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 10);
  return (
    <div style={{ overflow: "hidden", paddingBottom: 4 }}>
      <div
        style={{
          display: "inline-block",
          fontFamily: FUENTE.display,
          fontWeight: 800,
          fontSize: tamano,
          lineHeight: 1.0,
          letterSpacing: -tamano * 0.03,
          color,
          backgroundColor: fondo,
          padding: fondo ? "4px 22px 8px" : 0,
          translate: `${(1 - p) * -110}% 0px`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

