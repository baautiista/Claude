import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LINEA_DE_TIEMPO } from "./config";
import { getEscena, segundoDe } from "./tiempos";
import { COLORES, FUENTES, ZONA_SEGURA } from "./estilo";

const ANCHO = 920;
const SEPARACION = ANCHO / LINEA_DE_TIEMPO.hitos.length;

/** Línea de tiempo inferior que se va completando (escenas 2–4). */
export const LineaDeTiempo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // Segundos absolutos del vídeo (la secuencia empieza con la escena `desde`)
  const t = getEscena(LINEA_DE_TIEMPO.desde).inicio + frame / fps;
  const tiempos = LINEA_DE_TIEMPO.hitos.map(segundoDe);
  const posiciones = LINEA_DE_TIEMPO.hitos.map(
    (_, i) => SEPARACION / 2 + i * SEPARACION,
  );

  const progreso = interpolate(t, tiempos, posiciones, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.45, 0, 0.55, 1),
  });
  const visible = t >= tiempos[0] - 0.6;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: ZONA_SEGURA.abajo + 10,
        opacity: interpolate(
          frame,
          [0, 0.5 * fps, durationInFrames - 0.5 * fps, durationInFrames],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        ),
      }}
    >
      <div style={{ position: "relative", width: ANCHO, height: 140 }}>
        {/* Pista */}
        <div
          style={{
            position: "absolute",
            top: 18,
            left: posiciones[0],
            width: posiciones[posiciones.length - 1] - posiciones[0],
            height: 6,
            borderRadius: 3,
            backgroundColor: "rgba(234, 220, 190, 0.25)",
          }}
        />
        {/* Progreso */}
        <div
          style={{
            position: "absolute",
            top: 18,
            left: posiciones[0],
            width: visible ? progreso - posiciones[0] : 0,
            height: 6,
            borderRadius: 3,
            backgroundColor: COLORES.oro,
          }}
        />
        {LINEA_DE_TIEMPO.hitos.map((hito, i) => {
          const activo = interpolate(t, [tiempos[i] - 0.1, tiempos[i] + 0.4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.spring({ damping: 12 }),
          });
          return (
            <div
              key={hito.texto}
              style={{
                position: "absolute",
                left: posiciones[i] - SEPARACION / 2,
                top: 0,
                width: SEPARACION,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  border: `5px solid ${activo > 0.5 ? COLORES.oro : "rgba(234,220,190,0.45)"}`,
                  backgroundColor: activo > 0.5 ? COLORES.oro : COLORES.fondo,
                  scale: 1 + Math.sin(activo * Math.PI) * 0.35,
                }}
              />
              <div
                style={{
                  fontFamily: FUENTES.texto,
                  fontWeight: 700,
                  fontSize: 27,
                  lineHeight: 1.15,
                  textAlign: "center",
                  color: activo > 0.5 ? COLORES.pergamino : "rgba(234,220,190,0.45)",
                  padding: "0 6px",
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
