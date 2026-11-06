import { AbsoluteFill, Img } from "remotion";
import { COLOR, FUENTE, MARCA } from "../marca/marca";

/** Miniatura vertical: la pregunta y la clave legal, en la franja central 3:4. */
export const MiniaturaZbe: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.azul }}>
    <AbsoluteFill
      style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.07) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.07) 2px, transparent 2px)",
        backgroundSize: "90px 90px",
      }}
    />
    <div style={{ position: "absolute", top: 330, left: 80, right: 80, fontFamily: FUENTE.display, fontWeight: 800, color: COLOR.blanco, letterSpacing: -5, lineHeight: 0.95 }}>
      <div style={{ fontFamily: FUENTE.rotulo, fontSize: 40, letterSpacing: 3, marginBottom: 30 }}>MOVILIDAD</div>
      <div style={{ fontSize: 132 }}>¿QUIÉN</div>
      <div style={{ fontSize: 132 }}>NOS OBLIGA</div>
      <div style={{ fontSize: 132 }}>A TENER</div>
      <div style={{ fontSize: 132, color: COLOR.lima }}>UNA ZBE?</div>
      <div style={{ marginTop: 50, display: "inline-block", backgroundColor: COLOR.blanco, color: COLOR.azul, fontSize: 64, letterSpacing: -1, padding: "10px 26px 14px", borderRadius: 16 }}>
        LEY 7/2021 · +50.000 HAB.
      </div>
    </div>
    <Img src={MARCA.isotipo} style={{ position: "absolute", right: 80, top: 1480, height: 90 }} />
  </AbsoluteFill>
);
