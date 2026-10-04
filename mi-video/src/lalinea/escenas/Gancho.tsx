import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { MOMENTOS } from "../config";
import { COLORES, FUENTES, ZONA_SEGURA } from "../estilo";
import { EscenaBase, entrada, suave } from "../comun";
import { aFrames, getEscena } from "../tiempos";

const LINEA_MAPA = "M120 980 C260 930 360 1060 500 1000 C640 940 760 1060 960 990";

export const Gancho: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const tachar = aFrames(MOMENTOS.tacharLinea - getEscena("gancho").inicio);

  const dibujo = suave(frame, 0.8 * fps, 1.4 * fps);
  const aspa1 = suave(frame, tachar, 0.3 * fps);
  const aspa2 = suave(frame, tachar + 0.2 * fps, 0.3 * fps);

  return (
    <EscenaBase>
      {/* Mapa histórico de fondo */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          name="Mapa histórico"
          src={staticFile("lalinea/mapa.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "sepia(0.5) contrast(1.05) brightness(0.62)",
            scale: interpolate(frame, [0, durationInFrames], [1.08, 1.2]),
            transformOrigin: "50% 30%",
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(18,14,10,0.92) 0%, rgba(18,14,10,0.55) 38%, rgba(18,14,10,0.15) 60%, rgba(18,14,10,0.7) 100%)",
        }}
      />

      {/* Título */}
      <AbsoluteFill
        style={{
          paddingTop: ZONA_SEGURA.arriba + 130,
          paddingLeft: ZONA_SEGURA.lados,
          paddingRight: ZONA_SEGURA.lados,
          alignItems: "center",
          fontFamily: FUENTES.titulo,
          fontWeight: 900,
          textAlign: "center",
          lineHeight: 1.04,
        }}
      >
        <div
          style={{
            fontSize: 84,
            color: COLORES.pergamino,
            opacity: suave(frame, 0, 0.6 * fps),
            translate: `0px ${(1 - entrada(frame, 0, 0.8 * fps)) * 60}px`,
          }}
        >
          ¿POR QUÉ NOS LLAMAMOS
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 98,
            color: COLORES.oro,
            opacity: suave(frame, 0.3 * fps, 0.6 * fps),
            translate: `0px ${(1 - entrada(frame, 0.3 * fps, 0.8 * fps)) * 60}px`,
            textShadow: "0 6px 30px rgba(0,0,0,0.6)",
          }}
        >
          LA LÍNEA DE LA CONCEPCIÓN?
        </div>
      </AbsoluteFill>

      {/* Línea que se dibuja sobre el mapa y luego se tacha */}
      <svg
        width={1080}
        height={1920}
        viewBox="0 0 1080 1920"
        style={{ position: "absolute", inset: 0 }}
      >
        <path
          d={LINEA_MAPA}
          fill="none"
          stroke={COLORES.rojo}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - dibujo)}
          pathLength={1000}
          opacity={1 - aspa2 * 0.5}
          style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}
        />
        <circle cx={120} cy={980} r={16} fill={COLORES.rojo} opacity={dibujo > 0 ? 1 : 0} />
        <circle cx={960} cy={990} r={16} fill={COLORES.rojo} opacity={dibujo >= 1 ? 1 : 0} />
        {/* Aspa */}
        <path
          d="M400 840 L680 1140"
          stroke={COLORES.pergamino}
          strokeWidth={28}
          strokeLinecap="round"
          pathLength={1000}
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - aspa1)}
          style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.7))" }}
        />
        <path
          d="M680 840 L400 1140"
          stroke={COLORES.pergamino}
          strokeWidth={28}
          strokeLinecap="round"
          pathLength={1000}
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - aspa2)}
          style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.7))" }}
        />
      </svg>
    </EscenaBase>
  );
};
