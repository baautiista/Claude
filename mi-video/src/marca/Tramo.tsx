import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { suave } from "./animacion";

/**
 * Muestra su contenido entre dos frames de la escena. Entra deslizándose desde
 * la derecha y sale hacia la izquierda: transición rápida y editorial.
 */
export const Tramo: React.FC<{
  readonly desde: number;
  readonly hasta: number;
  readonly children: React.ReactNode;
}> = ({ desde, hasta, children }) => {
  const frame = useCurrentFrame();
  if (frame < desde - 1 || frame > hasta + 1) return null;
  const entra = suave(frame, desde, 9);
  const sale = suave(frame, hasta - 7, 7);
  return (
    <AbsoluteFill
      style={{
        opacity: entra * (1 - sale),
        translate: `${interpolate(entra, [0, 1], [90, 0]) - sale * 90}px 0px`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
