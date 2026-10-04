import { interpolate, useCurrentFrame } from "remotion";
import { entrada } from "./animacion";
import { FUENTE } from "./marca";

/** Sello administrativo que "cae" sobre la pantalla (EXPROPIACIÓN APROBADA…). */
export const Sello: React.FC<{
  readonly lineas: readonly string[];
  readonly color: string;
  readonly fondo?: string;
  readonly desde: number;
  readonly rotacion?: number;
}> = ({ lineas, color, fondo = "transparent", desde, rotacion = -6 }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 14, 14);
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "18px 34px",
        border: `8px solid ${color}`,
        borderRadius: 18,
        color,
        backgroundColor: fondo,
        fontFamily: FUENTE.display,
        fontWeight: 800,
        fontSize: 64,
        lineHeight: 1.0,
        letterSpacing: 1,
        textAlign: "center",
        rotate: `${rotacion}deg`,
        opacity: interpolate(frame, [desde, desde + 2], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        scale: interpolate(p, [0, 1], [1.6, 1]),
      }}
    >
      {lineas.map((l) => (
        <div key={l}>{l}</div>
      ))}
    </div>
  );
};
