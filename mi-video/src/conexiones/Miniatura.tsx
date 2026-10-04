import { AbsoluteFill, Img, staticFile } from "remotion";
import { BandaObra } from "../marca/BandaObra";
import { COLOR, FUENTE, MARCA, existe } from "../marca/marca";
import { FOTOS } from "./config";

/** Miniatura 1280×720: calle cortada por un bloque rojo, flecha y colores de obra. */
export const MiniaturaConexiones: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.negro }}>
      {existe(FOTOS.colon) ? (
        <Img
          src={staticFile(FOTOS.colon)}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: 560,
            height: 720,
            objectFit: "cover",
            objectPosition: "50% 62%",
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{ background: "linear-gradient(90deg, #0A0A0A 52%, rgba(10,10,10,0.55) 70%, rgba(10,10,10,0) 100%)" }}
      />
      {/* Calle cortada */}
      <svg viewBox="0 0 1280 720" style={{ position: "absolute", inset: 0 }}>
        <rect x={0} y={560} width={760} height={84} fill="#2F343C" />
        <line x1={0} y1={602} x2={760} y2={602} stroke="white" strokeWidth={5} strokeDasharray="28 22" />
        <rect x={470} y={536} width={120} height={132} rx={10} fill={COLOR.rosa} />
        <path d="M120 470 C 300 410, 520 420, 690 500" stroke={COLOR.lima} strokeWidth={14} fill="none" strokeLinecap="round" />
        <path d="M670 470 L 705 508 L 655 520" stroke={COLOR.lima} strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", left: 56, top: 50 }}>
        <div
          style={{
            display: "inline-block",
            backgroundColor: COLOR.azul,
            color: COLOR.blanco,
            fontFamily: FUENTE.rotulo,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: 3,
            padding: "6px 14px",
            borderRadius: 5,
          }}
        >
          URBANISMO
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: FUENTE.display,
            fontWeight: 800,
            color: COLOR.blanco,
            lineHeight: 0.95,
            letterSpacing: -3,
          }}
        >
          <div style={{ fontSize: 112 }}>
            <span style={{ color: COLOR.lima }}>2</span> CALLES
          </div>
          <div style={{ fontSize: 56, letterSpacing: -1 }}>DE LA LÍNEA</div>
          <div style={{ fontSize: 84, color: COLOR.lima, marginTop: 8 }}>A PUNTO DE ABRIRSE</div>
        </div>
      </div>
      <BandaObra alto={34} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }} />
      <Img src={MARCA.isotipo} style={{ position: "absolute", right: 34, top: 30, height: 70 }} />
    </AbsoluteFill>
  );
};
