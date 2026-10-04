import { Easing, interpolate, useCurrentFrame } from "remotion";

/** Número que aumenta hasta `valor` (formato español: 48.000). */
export const Contador: React.FC<{
  readonly valor: number;
  readonly desde: number;
  readonly duracion: number;
  readonly decimales?: number;
}> = ({ valor, desde, duracion, decimales = 0 }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [desde, desde + duracion], [0, valor], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {v.toLocaleString("es-ES", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}
    </span>
  );
};
