import { AbsoluteFill, Img } from "remotion";
import { COLOR, FUENTE, MARCA } from "../marca/marca";
import { Foto } from "./piezas";

/** Miniatura vertical del editorial (titular en la franja central 3:4). */
export const MiniaturaEditorial: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro }}>
    <Foto k="arbolCamaron" nombre="Árbol junto a Camarón" zoom={[1.1, 1.1]} oscurecer={0.55} />
    <div style={{ position: "absolute", top: 380, left: 80, right: 80, fontFamily: FUENTE.display, fontWeight: 800, color: COLOR.blanco, letterSpacing: -5, lineHeight: 0.95 }}>
      <div style={{ display: "inline-block", backgroundColor: COLOR.azul, fontFamily: FUENTE.rotulo, fontSize: 40, letterSpacing: 4, padding: "6px 18px", marginBottom: 30 }}>EDITORIAL</div>
      <div style={{ fontSize: 142 }}>¿AHORA</div>
      <div style={{ fontSize: 142 }}>TAMBIÉN</div>
      <div style={{ fontSize: 142 }}>MOLESTA QUE</div>
      <div style={{ fontSize: 142 }}>LA LÍNEA</div>
      <div style={{ fontSize: 170, color: COLOR.lima }}>AVANCE?</div>
    </div>
    <Img src={MARCA.isotipo} style={{ position: "absolute", right: 80, top: 1480, height: 90 }} />
  </AbsoluteFill>
);
