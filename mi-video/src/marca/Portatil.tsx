import { COLOR } from "./marca";

/** Maqueta de portátil: pantalla (hijo) con barra de navegador y base. */
export const Portatil: React.FC<{
  readonly ancho: number;
  readonly url?: string;
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}> = ({ ancho, url, children, style }) => {
  const alto = Math.round(ancho * 0.64);
  const borde = Math.round(ancho * 0.025);
  return (
    <div style={{ width: ancho * 1.12, display: "flex", flexDirection: "column", alignItems: "center", ...style }}>
      <div
        style={{
          width: ancho,
          height: alto,
          backgroundColor: COLOR.negro,
          borderRadius: ancho * 0.03,
          padding: borde,
          boxSizing: "border-box",
          boxShadow: "0 40px 80px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: ancho * 0.01, overflow: "hidden", backgroundColor: COLOR.blanco, display: "flex", flexDirection: "column" }}>
          <div style={{ height: ancho * 0.05, backgroundColor: "#EEF0F3", display: "flex", alignItems: "center", gap: ancho * 0.008, padding: `0 ${ancho * 0.015}px`, flexShrink: 0 }}>
            {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
              <div key={c} style={{ width: ancho * 0.012, height: ancho * 0.012, borderRadius: 999, backgroundColor: c }} />
            ))}
            <div style={{ flex: 1, marginLeft: ancho * 0.02, height: ancho * 0.03, borderRadius: 999, backgroundColor: COLOR.blanco, fontFamily: "Inter", fontWeight: 600, fontSize: ancho * 0.018, color: "#4B5563", display: "flex", alignItems: "center", paddingLeft: ancho * 0.015 }}>
              {url}
            </div>
          </div>
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{children}</div>
        </div>
      </div>
      <div style={{ width: ancho * 1.12, height: ancho * 0.035, background: "linear-gradient(180deg, #D1D5DB, #9CA3AF)", borderRadius: `0 0 ${ancho * 0.03}px ${ancho * 0.03}px` }} />
    </div>
  );
};
