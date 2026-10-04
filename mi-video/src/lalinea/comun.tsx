import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORES, FUENTES, ZONA_SEGURA } from "./estilo";

/** Envuelve una escena con fundido de entrada y salida. */
export const EscenaBase: React.FC<{
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}> = ({ children, style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(
          frame,
          [0, 10, durationInFrames - 10, durationInFrames],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        ),
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Etiqueta de capítulo en la parte superior de la zona segura. */
export const Capitulo: React.FC<{ readonly children: string }> = ({ children }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: ZONA_SEGURA.arriba + 110,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 24,
        fontFamily: FUENTES.texto,
        fontWeight: 700,
        fontSize: 34,
        letterSpacing: 8,
        color: COLORES.oro,
        opacity: interpolate(frame, [4, 18], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: interpolate(frame, [4, 22], ["0px -20px", "0px 0px"], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <div style={{ width: 60, height: 2, backgroundColor: COLORES.oro }} />
      {children}
      <div style={{ width: 60, height: 2, backgroundColor: COLORES.oro }} />
    </div>
  );
};

/** Progreso 0→1 con spring entre dos frames. */
export const entrada = (
  frame: number,
  desde: number,
  duracion: number,
  damping = 200,
) =>
  interpolate(frame, [desde, desde + duracion], [0, 1], {
    easing: Easing.spring({ damping }),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const suave = (frame: number, desde: number, duracion: number) =>
  interpolate(frame, [desde, desde + duracion], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
