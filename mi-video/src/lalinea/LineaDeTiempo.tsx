import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FUENTE, ZONA_SEGURA } from "../marca/marca";
import { LINEA_DE_TIEMPO } from "./config";
import { getEscena, segundoDe } from "./tiempos";

const ANCHO = 920;
const SEPARACION = ANCHO / LINEA_DE_TIEMPO.hitos.length;

/** Línea de tiempo inferior que se va completando (escenas 2–4). */
export const LineaDeTiempo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = getEscena(LINEA_DE_TIEMPO.desde).inicio + frame / fps;
  const tiempos = LINEA_DE_TIEMPO.hitos.map(segundoDe);
  const pos = LINEA_DE_TIEMPO.hitos.map((_, i) => SEPARACION / 2 + i * SEPARACION);
  const progreso = interpolate(t, tiempos, pos, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.45, 0, 0.55, 1),
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: ZONA_SEGURA.abajo,
        opacity: interpolate(frame, [0, 8, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <div
        style={{
          position: "relative",
          width: ANCHO,
          height: 128,
          borderRadius: 18,
          backgroundColor: "rgba(255,255,255,0.95)",
          boxShadow: "0 8px 24px rgba(10,10,10,0.12)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 32,
            left: pos[0],
            width: pos[pos.length - 1] - pos[0],
            height: 4,
            backgroundColor: "#D5D9E0",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 32,
            left: pos[0],
            width: t >= tiempos[0] ? progreso - pos[0] : 0,
            height: 4,
            backgroundColor: COLOR.azul,
          }}
        />
        {LINEA_DE_TIEMPO.hitos.map((hito, i) => {
          const activo = t >= tiempos[i];
          const pop = interpolate(t, [tiempos[i], tiempos[i] + 0.3], [1.5, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={hito.texto}
              style={{
                position: "absolute",
                left: pos[i] - SEPARACION / 2,
                top: 20,
                width: SEPARACION,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  boxSizing: "border-box",
                  border: `4px solid ${activo ? COLOR.azul : "#C5CBD4"}`,
                  backgroundColor: activo ? COLOR.azul : COLOR.blanco,
                  scale: activo ? pop : 1,
                }}
              />
              <div
                style={{
                  fontFamily: FUENTE.texto,
                  fontWeight: 700,
                  fontSize: 24,
                  lineHeight: 1.15,
                  textAlign: "center",
                  padding: "0 8px",
                  color: activo ? COLOR.negro : "#9AA1AC",
                }}
              >
                {hito.texto}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
