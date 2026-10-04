import { AbsoluteFill, Img, staticFile } from "remotion";
import { COLOR, FUENTE, MARCA, existe } from "../marca/marca";
import { FOTOS_HOSPITAL, RENDERS } from "./config";
import { Edificio, TarjetaRender } from "./graficos";

/** Miniatura vertical: 4 renders alrededor del hospital actual. */
export const MiniaturaHospital: React.FC = () => {
  const foto = FOTOS_HOSPITAL.find(existe);
  const cuatro = [RENDERS[0], RENDERS[1], RENDERS[2], RENDERS[4]];
  const esquinas = [
    { left: 40, top: 720, rot: -5 },
    { left: 700, top: 700, rot: 5 },
    { left: 50, top: 1160, rot: 4 },
    { left: 690, top: 1180, rot: -4 },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azul }}>
      <div style={{ position: "absolute", top: 260, left: 70, right: 70, fontFamily: FUENTE.display, fontWeight: 800, color: COLOR.blanco, lineHeight: 0.92, letterSpacing: -4 }}>
        <div style={{ fontSize: 150 }}>
          <span style={{ color: COLOR.lima }}>7</span> IDEAS
        </div>
        <div style={{ fontSize: 82, letterSpacing: -2 }}>PARA EL ANTIGUO HOSPITAL</div>
      </div>
      {/* Hospital actual en el centro */}
      <div
        style={{
          position: "absolute",
          left: 290,
          top: 860,
          width: 500,
          height: 500,
          borderRadius: 28,
          overflow: "hidden",
          border: `8px solid ${COLOR.lima}`,
          boxSizing: "border-box",
          backgroundColor: "#1747C9",
          zIndex: 2,
          boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
        }}
      >
        {foto ? (
          <Img src={staticFile(foto)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Edificio dibujo={1} style={{ position: "absolute", left: 10, top: 110, width: 470, height: 330 }} />
        )}
        <div style={{ position: "absolute", left: 14, top: 14, backgroundColor: COLOR.negro, color: COLOR.blanco, fontFamily: FUENTE.rotulo, fontWeight: 700, fontSize: 26, padding: "4px 12px", borderRadius: 6 }}>
          HOY
        </div>
      </div>
      {cuatro.map((r, i) => (
        <div key={r.id} style={{ position: "absolute", left: esquinas[i].left, top: esquinas[i].top, rotate: `${esquinas[i].rot}deg` }}>
          <TarjetaRender archivo={r.archivo} nombre={r.nombre} ancho={340} borde={6} />
        </div>
      ))}
      <div style={{ position: "absolute", top: 1520, left: 0, right: 0, textAlign: "center", fontFamily: FUENTE.display, fontWeight: 800, fontSize: 110, color: COLOR.lima, letterSpacing: -3 }}>
        ¿CUÁL ELEGIRÍAS?
      </div>
      <Img src={MARCA.isotipo} style={{ position: "absolute", right: 70, top: 120, height: 100 }} />
    </AbsoluteFill>
  );
};
