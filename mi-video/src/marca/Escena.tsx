import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR } from "./marca";

const FONDOS = {
  oscuro: COLOR.negro,
  claro: COLOR.grisClaro,
  azul: COLOR.azul,
} as const;

/** Contenedor de escena con fundido corto de entrada y salida. */
export const Escena: React.FC<{
  readonly fondo: keyof typeof FONDOS;
  readonly children: React.ReactNode;
}> = ({ fondo, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: FONDOS[fondo],
        opacity: interpolate(frame, [0, 6, durationInFrames - 6, durationInFrames], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
