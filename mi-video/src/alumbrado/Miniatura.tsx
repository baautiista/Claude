import { AbsoluteFill, Img, staticFile } from "remotion";
import { existe } from "../marca/marca";
import { MEDIOS } from "./config";
import { NAV, TIPO } from "./Alumbrado";

/** Portada del Reel (1080 × 1920). Texto en la franja central 3:4. Arriba 2023; abajo 2026 (o 2025 mientras falte). */
export const MiniaturaAlumbrado: React.FC = () => {
  const reciente = existe(MEDIOS.plaza2026.archivo) ? { m: MEDIOS.plaza2026, anio: "2026" } : { m: MEDIOS.encendido2025, anio: "2025" };
  const Foto: React.FC<{ archivo: string; filtro?: string; pos?: string }> = ({ archivo, filtro, pos = "50% 50%" }) => (
    <Img src={staticFile(archivo)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, filter: filtro }} />
  );
  return (
    <AbsoluteFill style={{ backgroundColor: NAV.negro }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 960, overflow: "hidden" }}>
        <Foto archivo={MEDIOS.archivo2023.archivo} filtro="grayscale(1) sepia(0.3) contrast(1.1) brightness(0.8)" pos="40% 45%" />
      </div>
      <div style={{ position: "absolute", top: 960, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
        <Foto archivo={reciente.m.archivo} pos="45% 40%" />
      </div>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,7,13,0.15) 0%, rgba(5,7,13,0.55) 40%, rgba(5,7,13,0.55) 60%, rgba(5,7,13,0.1) 100%)" }} />
      <div style={{ position: "absolute", top: 945, left: 0, right: 0, height: 30, backgroundColor: NAV.oro }} />
      <div style={{ position: "absolute", top: 300, left: 80, fontFamily: TIPO.titular, fontWeight: 800, fontSize: 170, color: "transparent", WebkitTextStroke: `5px ${NAV.blanco}` }}>2023</div>
      <div style={{ position: "absolute", top: 1500, right: 80, fontFamily: TIPO.titular, fontWeight: 800, fontSize: 170, color: NAV.oro, textShadow: "0 6px 30px rgba(0,0,0,0.6)" }}>{reciente.anio}</div>
      <div style={{ position: "absolute", top: 560, left: 70, right: 70, fontFamily: TIPO.titular, fontWeight: 800, fontSize: 104, lineHeight: 0.98, letterSpacing: -3, color: NAV.blanco, textShadow: "0 8px 40px rgba(0,0,0,0.7)" }}>
        De «es el que
        <br />
        podemos pagar»
        <br />
        <span style={{ color: NAV.oro }}>a esto</span>
      </div>
      <div style={{ position: "absolute", top: 1040, left: 80, backgroundColor: NAV.azul, color: NAV.blanco, fontFamily: TIPO.rotulo, fontWeight: 700, fontSize: 34, letterSpacing: 4, padding: "8px 18px" }}>LA NAVIDAD DE LA LÍNEA</div>
      <Img src={staticFile("marca/isotipo.png")} style={{ position: "absolute", top: 220, right: 80, width: 90 }} />
    </AbsoluteFill>
  );
};
