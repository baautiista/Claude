import { AbsoluteFill, Img, staticFile } from "remotion";
import { COLORES, FUENTES } from "./estilo";
import { GranoYVineta } from "./Fondo";

export const Miniatura: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORES.fondo }}>
      <Img
        name="Peñón"
        src={staticFile("lalinea/penon-foto.jpg")}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "20% 50%",
          filter: "sepia(0.6) contrast(1.1) brightness(0.8)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(18,14,10,0) 20%, rgba(18,14,10,0.75) 52%, rgba(18,14,10,0.95) 100%)",
        }}
      />
      <GranoYVineta />
      <AbsoluteFill
        style={{
          alignItems: "flex-end",
          justifyContent: "center",
          paddingRight: 64,
          textAlign: "right",
          fontFamily: FUENTES.titulo,
          fontWeight: 900,
          lineHeight: 1,
          textShadow: "0 6px 24px rgba(0,0,0,0.7)",
        }}
      >
        <div style={{ fontSize: 66, fontWeight: 700, color: COLORES.pergamino }}>
          ¿Pudo llamarse
        </div>
        <div style={{ fontSize: 86, color: COLORES.pergamino, marginTop: 18 }}>
          LA LÍNEA DE LA
        </div>
        <div style={{ fontSize: 150, color: COLORES.victoria, marginTop: 6 }}>
          VICTORIA?
        </div>
      </AbsoluteFill>
      <Img
        src={staticFile("marca/logo.png")}
        style={{ position: "absolute", left: 40, bottom: 34, width: 220 }}
      />
    </AbsoluteFill>
  );
};
