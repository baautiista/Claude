import { AbsoluteFill, Img } from "remotion";
import { COLOR, FUENTE, MARCA } from "../marca/marca";
import { URL_PANEL } from "./config";

/** Miniatura vertical: la pregunta y la web (texto en la franja central 3:4). */
export const MiniaturaEncuesta: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, ${COLOR.azul}66 0%, transparent 60%)` }} />
    <div style={{ position: "absolute", top: 330, left: 80, right: 80, fontFamily: FUENTE.display, fontWeight: 800, color: COLOR.blanco, letterSpacing: -8, lineHeight: 0.92 }}>
      <div style={{ fontFamily: FUENTE.rotulo, fontSize: 40, letterSpacing: 4, marginBottom: 30, color: COLOR.lima }}>ENCUESTA INFOLINENSE</div>
      <div style={{ fontSize: 200 }}>¿A QUIÉN</div>
      <div style={{ fontSize: 200 }}>VAS A</div>
      <div style={{ fontSize: 230, color: COLOR.azul }}>VOTAR?</div>
      <div style={{ marginTop: 60, display: "inline-block", backgroundColor: COLOR.blanco, color: COLOR.azulOscuro, fontFamily: FUENTE.texto, fontSize: 56, letterSpacing: -1, padding: "12px 28px", borderRadius: 18 }}>{URL_PANEL}</div>
    </div>
    <Img src={MARCA.isotipo} style={{ position: "absolute", right: 80, top: 1470, height: 90 }} />
  </AbsoluteFill>
);
