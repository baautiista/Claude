import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { Etiqueta } from "../../marca/Etiqueta";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { MOMENTOS } from "../config";
import { beatsDeEscena, frameEnEscena } from "../tiempos";

export const Gancho: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [, mapa] = beatsDeEscena("gancho");
  const tachar = frameEnEscena(MOMENTOS.tacharLinea);

  const linea = suave(frame, mapa, 0.7 * fps);
  const aspa1 = suave(frame, tachar, 0.2 * fps);
  const aspa2 = suave(frame, tachar + 0.12 * fps, 0.2 * fps);
  const etiquetaNo = entrada(frame, tachar + 0.3 * fps, 0.5 * fps, 14);

  return (
    <Escena fondo="oscuro">
      {/* Mapa histórico real a pantalla completa */}
      <Img
        src={staticFile("lalinea/mapa.jpg")}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "grayscale(0.35) contrast(1.05)",
          scale: interpolate(frame, [0, durationInFrames], [1.06, 1.16]),
          transformOrigin: "50% 40%",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.6) 34%, rgba(10,10,10,0) 55%, rgba(10,10,10,0.35) 100%)",
        }}
      />

      <AbsoluteFill
        style={{
          paddingTop: ZONA_SEGURA.arriba + 40,
          paddingLeft: ZONA_SEGURA.lados,
          paddingRight: ZONA_SEGURA.lados,
          gap: 30,
        }}
      >
        <Etiqueta conIsotipo>HISTORIA</Etiqueta>
        <div style={{ fontFamily: FUENTE.display, fontWeight: 800, color: COLOR.blanco, lineHeight: 1.02 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              opacity: suave(frame, 0, 8),
              translate: `0px ${(1 - suave(frame, 0, 10)) * 30}px`,
            }}
          >
            ¿Por qué nos llamamos
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 112,
              letterSpacing: -2,
              opacity: suave(frame, 3, 8),
              translate: `0px ${(1 - suave(frame, 3, 12)) * 40}px`,
            }}
          >
            <span style={{ color: COLOR.lima }}>La Línea</span> de la Concepción?
          </div>
        </div>
      </AbsoluteFill>

      {/* "Una línea dibujada en un mapa"… y tachada */}
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <line
          x1={140}
          y1={1040}
          x2={140 + 800 * linea}
          y2={1040}
          stroke={COLOR.azul}
          strokeWidth={14}
          strokeLinecap="round"
        />
        <circle cx={140} cy={1040} r={16} fill={COLOR.azul} opacity={linea > 0 ? 1 : 0} />
        <circle cx={940} cy={1040} r={16} fill={COLOR.azul} opacity={linea >= 1 ? 1 : 0} />
        <line
          x1={430}
          y1={890}
          x2={430 + 220 * aspa1}
          y2={890 + 300 * aspa1}
          stroke={COLOR.rosa}
          strokeWidth={22}
          strokeLinecap="round"
        />
        <line
          x1={650}
          y1={890}
          x2={650 - 220 * aspa2}
          y2={890 + 300 * aspa2}
          stroke={COLOR.rosa}
          strokeWidth={22}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 1220,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: etiquetaNo,
          scale: interpolate(etiquetaNo, [0, 1], [0.85, 1]),
        }}
      >
        <div
          style={{
            backgroundColor: COLOR.rosa,
            color: COLOR.blanco,
            fontFamily: FUENTE.rotulo,
            fontWeight: 700,
            fontSize: 40,
            padding: "8px 22px",
            borderRadius: 8,
          }}
        >
          No viene de un mapa
        </div>
      </div>
    </Escena>
  );
};
