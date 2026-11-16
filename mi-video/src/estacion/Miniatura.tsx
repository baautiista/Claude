import { AbsoluteFill, Img, staticFile } from "remotion";
import { COLOR, FUENTE, MARCA, existe } from "../marca/marca";

const mitad = (archivo: string, top: number, etiqueta: string, lima: boolean) => (
  <div style={{ position: "absolute", left: 0, right: 0, top, height: 600, overflow: "hidden", backgroundColor: COLOR.azulOscuro }}>
    {existe(archivo) ? <Img src={staticFile(archivo)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "60% 65%" }} /> : null}
    <div style={{ position: "absolute", left: 70, top: 30, backgroundColor: lima ? COLOR.lima : COLOR.rosa, color: lima ? COLOR.negro : COLOR.blanco, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 48, padding: "4px 18px 8px", borderRadius: 10 }}>{etiqueta}</div>
  </div>
);

/** Miniatura vertical: antes y después de la estación (titular en la franja central). */
export const MiniaturaEstacion: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.azul }}>
    {mitad("estacion/fachada-antigua.jpg", 0, "ANTES", false)}
    {mitad("estacion/fachada-actual.jpg", 1320, "AHORA", true)}
    <div style={{ position: "absolute", top: 640, left: 80, right: 80, fontFamily: FUENTE.display, fontWeight: 800, color: COLOR.blanco, letterSpacing: -4, lineHeight: 0.95 }}>
      <div style={{ fontFamily: FUENTE.rotulo, fontSize: 38, letterSpacing: 3, fontWeight: 700, marginBottom: 16 }}>MOVILIDAD</div>
      <div style={{ fontSize: 110 }}>LA ESTACIÓN</div>
      <div style={{ fontSize: 110 }}>DE AUTOBUSES,</div>
      <div style={{ fontSize: 110, color: COLOR.lima }}>POR FIN DIGNA</div>
    </div>
    <Img src={MARCA.isotipo} style={{ position: "absolute", right: 80, top: 650, height: 80 }} />
  </AbsoluteFill>
);
