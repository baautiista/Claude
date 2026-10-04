import { interpolate, useCurrentFrame } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { COLOR, FUENTE } from "../marca/marca";

/** Frase que entra "con golpe": escala desde grande y se asienta. */
export const Golpe: React.FC<{
  readonly children: React.ReactNode;
  readonly desde: number;
  readonly tamano?: number;
  readonly atenuar?: number;
}> = ({ children, desde, tamano = 92, atenuar = 0 }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 10, 12);
  return (
    <div
      style={{
        fontFamily: FUENTE.display,
        fontWeight: 800,
        fontSize: tamano,
        lineHeight: 1.0,
        letterSpacing: -2,
        color: COLOR.blanco,
        opacity: interpolate(frame, [desde, desde + 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (1 - atenuar * 0.55),
        scale: interpolate(p, [0, 1], [1.5, 1]),
        transformOrigin: "0% 50%",
      }}
    >
      {children}
    </div>
  );
};

/** Palabra tachada en rosa cuando llega `tachar`. */
export const Tachado: React.FC<{ readonly children: React.ReactNode; readonly tachar: number }> = ({ children, tachar }) => {
  const frame = useCurrentFrame();
  const t = suave(frame, tachar, 8);
  return (
    <span style={{ position: "relative", display: "inline-block", opacity: 1 - t * 0.45 }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: -6,
          top: "52%",
          height: 12,
          borderRadius: 6,
          width: `calc(${t * 100}% + 12px)`,
          backgroundColor: COLOR.rosa,
          rotate: "-4deg",
        }}
      />
    </span>
  );
};
