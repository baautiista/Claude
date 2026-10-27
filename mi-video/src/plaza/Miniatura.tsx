import { AbsoluteFill, Img, staticFile } from "remotion";
import { COLOR, FUENTE, MARCA } from "../marca/marca";
import { RECURSOS } from "./config";

/** Miniatura vertical: la plaza hoy frente a cómo será. Texto principal en la franja central 3:4. */
export const MiniaturaPlaza: React.FC = () => {
  const media = (archivo: string, top: number, sello: string, fondo: string, color: string) => (
    <div style={{ position: "absolute", left: 0, right: 0, top, height: 560, overflow: "hidden" }}>
      <Img src={staticFile(archivo)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", left: 70, top: 24, backgroundColor: fondo, color, fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 40, letterSpacing: 2, padding: "6px 20px", borderRadius: 10 }}>
        {sello}
      </div>
    </div>
  );
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azul }}>
      {media(RECURSOS.actual[1], 0, "HOY", COLOR.negro, COLOR.blanco)}
      {media(RECURSOS.renderFinal, 1360, "ASÍ SERÁ", COLOR.lima, COLOR.negro)}
      <div style={{ position: "absolute", top: 600, left: 70, right: 70, fontFamily: FUENTE.display, fontWeight: 800, color: COLOR.blanco, letterSpacing: -4, lineHeight: 0.95 }}>
        <div style={{ fontFamily: FUENTE.rotulo, fontSize: 40, letterSpacing: 3, fontWeight: 700, marginBottom: 20 }}>URBANISMO</div>
        <div style={{ fontSize: 108 }}>ASÍ CAMBIARÁ</div>
        <div style={{ fontSize: 88 }}>LA PLAZA DE LA</div>
        <div style={{ fontSize: 88, color: COLOR.lima }}>CONSTITUCIÓN</div>
        <div style={{ display: "flex", gap: 20, marginTop: 34 }}>
          {["4,9 M€", "12 MESES", "13 PÉRGOLAS"].map((d) => (
            <div key={d} style={{ backgroundColor: COLOR.blanco, color: COLOR.azul, fontSize: 46, letterSpacing: -1, padding: "8px 18px", borderRadius: 12 }}>
              {d}
            </div>
          ))}
        </div>
      </div>
      <Img src={MARCA.isotipo} style={{ position: "absolute", right: 70, top: 1250, height: 80 }} />
    </AbsoluteFill>
  );
};
