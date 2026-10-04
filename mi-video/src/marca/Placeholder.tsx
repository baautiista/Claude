import { COLOR, FUENTE } from "./marca";

/** Hueco para una imagen que aún no está en public/: rayas, icono y nombre. */
export const Placeholder: React.FC<{
  readonly nombre: string;
  readonly archivo?: string;
  readonly style?: React.CSSProperties;
  /** Versión pequeña para miniaturas y mosaicos. */
  readonly compacto?: boolean;
}> = ({ nombre, archivo, style, compacto = false }) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 18,
      backgroundColor: "#1747C9",
      backgroundImage:
        "repeating-linear-gradient(-45deg, rgba(255,255,255,0.07) 0 22px, rgba(255,255,255,0) 22px 44px)",
      color: COLOR.blanco,
      textAlign: "center",
      padding: 30,
      boxSizing: "border-box",
      ...style,
    }}
  >
    <svg width={compacto ? 40 : 90} height={compacto ? 40 : 90} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 17l-5-5-9 8" />
    </svg>
    <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: compacto ? 22 : 48, lineHeight: 1.05 }}>{nombre}</div>
    {archivo && !compacto ? (
      <div style={{ fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 24, opacity: 0.7 }}>Pendiente: {archivo}</div>
    ) : null}
  </div>
);
