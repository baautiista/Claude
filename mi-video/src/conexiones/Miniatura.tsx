import { AbsoluteFill, Img, staticFile } from "remotion";
import { BandaObra } from "../marca/BandaObra";
import { COLOR, FUENTE, MARCA, existe } from "../marca/marca";
import { FOTOS } from "./config";

/**
 * Miniatura vertical 1080×1920. El texto queda en la franja central (3:4),
 * que es la que muestran las cuadrículas de perfil de TikTok e Instagram.
 */
export const MiniaturaConexiones: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.negro }}>
      {existe(FOTOS.santaFilomena) ? (
        <Img
          src={staticFile(FOTOS.santaFilomena)}
          style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 1150, objectFit: "cover", objectPosition: "50% 55%" }}
        />
      ) : null}
      <AbsoluteFill
        style={{ background: "linear-gradient(180deg, rgba(10,10,10,0.15) 0%, rgba(10,10,10,0.2) 35%, #0A0A0A 60%)" }}
      />
      <BandaObra alto={40} style={{ position: "absolute", left: 0, right: 0, top: 0 }} />

      <div style={{ position: "absolute", top: 300, left: 70 }}>
        <div
          style={{
            display: "inline-block",
            backgroundColor: COLOR.azul,
            color: COLOR.blanco,
            fontFamily: FUENTE.rotulo,
            fontWeight: 700,
            fontSize: 40,
            letterSpacing: 4,
            padding: "8px 20px",
            borderRadius: 8,
          }}
        >
          URBANISMO
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 820,
          left: 70,
          right: 70,
          fontFamily: FUENTE.display,
          fontWeight: 800,
          color: COLOR.blanco,
          lineHeight: 0.92,
          letterSpacing: -5,
        }}
      >
        <div style={{ fontSize: 210 }}>
          <span style={{ color: COLOR.lima }}>2</span> CALLES
        </div>
        <div style={{ fontSize: 96, letterSpacing: -2 }}>DE LA LÍNEA</div>
        <div style={{ fontSize: 124, color: COLOR.lima, marginTop: 14 }}>
          A PUNTO DE
          <br />
          ABRIRSE
        </div>
      </div>

      {/* Calle cortada por un bloque rojo, con flecha */}
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <rect x={0} y={1500} width={1080} height={110} fill="#2F343C" />
        <line x1={0} y1={1555} x2={1080} y2={1555} stroke="white" strokeWidth={6} strokeDasharray="36 28" />
        <rect x={600} y={1470} width={160} height={170} rx={12} fill={COLOR.rosa} />
        <path d="M120 1420 C 330 1330, 600 1330, 820 1440" stroke={COLOR.lima} strokeWidth={18} fill="none" strokeLinecap="round" />
        <path d="M790 1395 L 832 1446 L 768 1462" stroke={COLOR.lima} strokeWidth={18} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <Img src={MARCA.isotipo} style={{ position: "absolute", right: 70, top: 290, height: 110 }} />
      <BandaObra alto={40} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }} />
    </AbsoluteFill>
  );
};
