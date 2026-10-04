import { interpolate, useCurrentFrame } from "remotion";
import { suave } from "./animacion";
import { COLOR, FUENTE } from "./marca";

/**
 * Línea de pasos vertical (Planeamiento → … → Nueva calle).
 * `actual` es el paso destacado; los anteriores quedan como hechos.
 */
export const LineaPasos: React.FC<{
  readonly pasos: readonly string[];
  readonly actual: number;
  readonly desde: number;
  readonly avance?: number;
  /** Si se indica, controla directamente el avance (0 = primer paso, 1 = segundo…). */
  readonly progreso?: number;
}> = ({ pasos, actual, desde, avance = 9, progreso: externo }) => {
  const frame = useCurrentFrame();
  const ALTO = 112;
  const progreso =
    externo ??
    interpolate(frame, [desde, desde + avance * actual + 10], [0, actual], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  return (
    <div style={{ position: "relative", paddingLeft: 10 }}>
      <div
        style={{
          position: "absolute",
          left: 34,
          top: 26,
          width: 6,
          height: ALTO * (pasos.length - 1),
          backgroundColor: "rgba(255,255,255,0.25)",
          borderRadius: 3,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 34,
          top: 26,
          width: 6,
          height: ALTO * progreso,
          backgroundColor: COLOR.lima,
          borderRadius: 3,
        }}
      />
      {pasos.map((paso, i) => {
        const visible = suave(frame, desde + i * 5, 10);
        const hecho = progreso >= i - 0.05;
        const esActual = Math.round(progreso) === i && progreso >= i - 0.05 && i <= actual;
        return (
          <div
            key={paso}
            style={{
              height: ALTO,
              display: "flex",
              alignItems: "flex-start",
              gap: 30,
              opacity: visible,
              translate: `${(1 - visible) * -30}px 0px`,
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                boxSizing: "border-box",
                border: `6px solid ${hecho ? COLOR.lima : "rgba(255,255,255,0.45)"}`,
                backgroundColor: esActual ? COLOR.lima : hecho ? COLOR.azul : COLOR.azul,
                flexShrink: 0,
                scale: esActual ? 1.15 : 1,
              }}
            />
            <div
              style={{
                fontFamily: FUENTE.display,
                fontWeight: esActual ? 800 : 600,
                fontSize: esActual ? 62 : 46,
                lineHeight: 1,
                marginTop: esActual ? -2 : 4,
                color: esActual ? COLOR.lima : hecho ? COLOR.blanco : "rgba(255,255,255,0.5)",
              }}
            >
              {paso}
            </div>
          </div>
        );
      })}
    </div>
  );
};
