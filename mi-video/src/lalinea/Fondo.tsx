import { AbsoluteFill } from "remotion";
import { COLORES } from "./estilo";

/** Fondo oscuro de documental con viñeta y grano. */
export const Fondo: React.FC<{ readonly tono?: "oscuro" | "calido" }> = ({
  tono = "oscuro",
}) => {
  return (
    <AbsoluteFill
      style={{
        background:
          tono === "calido"
            ? `radial-gradient(circle at 50% 35%, #3A2A1A 0%, ${COLORES.fondo} 75%)`
            : `radial-gradient(circle at 50% 30%, ${COLORES.fondoClaro} 0%, ${COLORES.fondo} 70%)`,
      }}
    />
  );
};

/** Grano de película y viñeta, para poner encima de todo. */
export const GranoYVineta: React.FC = () => {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ position: "absolute", opacity: 0.09 }}>
        <filter id="grano">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grano)" />
      </svg>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
