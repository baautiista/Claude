import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, FOTOS, USUARIO, type Modalidad } from "./config";

/** Portada vertical: Falla, titular y colores de modalidad (texto en la franja central 3:4). */
export const PortadaCoac: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C.noche }}>
    <Img src={staticFile(FOTOS.fachada)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 35%", scale: 1.15 }} />
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.noche}CC 0%, ${C.noche}99 35%, ${C.noche}E6 75%, ${C.noche} 100%)` }} />
    <div style={{ position: "absolute", top: 420, left: 80, right: 80, fontFamily: "Poppins", fontWeight: 900, letterSpacing: -6, lineHeight: 0.95 }}>
      <div style={{ fontSize: 158, color: C.blanco }}>¿CUÁNDO</div>
      <div style={{ fontSize: 158, color: C.blanco }}>CANTAN</div>
      <div style={{ fontSize: 158, color: C.chirigota }}>LOS GRANDES</div>
      <div style={{ fontSize: 158, color: C.blanco }}>DEL COAC</div>
      <div style={{ fontSize: 158, color: C.coro }}>2027?</div>
      <div style={{ display: "flex", gap: 12, marginTop: 34 }}>
        {(["coro", "comparsa", "chirigota", "cuarteto"] as Modalidad[]).map((m) => (
          <div key={m} style={{ flex: 1, height: 18, borderRadius: 9, backgroundColor: C[m] }} />
        ))}
      </div>
    </div>
    <div style={{ position: "absolute", top: 1500, left: 80, display: "flex", alignItems: "center", gap: 18 }}>
      <Img src={staticFile(FOTOS.logo)} style={{ width: 84, height: 84, borderRadius: 18 }} />
      <div style={{ fontFamily: "Poppins", fontWeight: 900, fontSize: 52, color: C.blanco }}>{USUARIO}</div>
    </div>
  </AbsoluteFill>
);
