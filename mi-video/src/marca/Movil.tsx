import { COLOR } from "./marca";

/** Maqueta de móvil (marco negro redondeado) con su pantalla como hijo. */
export const Movil: React.FC<{
  readonly ancho: number;
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}> = ({ ancho, children, style }) => {
  const alto = Math.round(ancho * 2.06);
  const marco = Math.round(ancho * 0.035);
  return (
    <div
      style={{
        width: ancho,
        height: alto,
        borderRadius: ancho * 0.14,
        backgroundColor: COLOR.negro,
        padding: marco,
        boxSizing: "border-box",
        boxShadow: "0 40px 80px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.12)",
        position: "relative",
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: ancho * 0.11,
          overflow: "hidden",
          position: "relative",
          backgroundColor: COLOR.blanco,
        }}
      >
        {children}
      </div>
      {/* Isla superior */}
      <div
        style={{
          position: "absolute",
          top: marco + ancho * 0.03,
          left: "50%",
          width: ancho * 0.28,
          height: ancho * 0.07,
          translate: "-50% 0px",
          borderRadius: 999,
          backgroundColor: COLOR.negro,
        }}
      />
    </div>
  );
};
