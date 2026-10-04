import { AbsoluteFill, Img, staticFile } from "remotion";
import { COLOR, FUENTE, MARCA } from "../marca/marca";

export const Miniatura: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.negro }}>
      <Img
        src={staticFile("lalinea/penon-foto.jpg")}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "20% 50%",
          filter: "grayscale(0.4) contrast(1.05)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(10,10,10,0) 25%, rgba(10,10,10,0.78) 55%, rgba(10,10,10,0.94) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: "flex-end",
          justifyContent: "center",
          paddingRight: 60,
          textAlign: "right",
          fontFamily: FUENTE.display,
          fontWeight: 800,
          lineHeight: 0.98,
          color: COLOR.blanco,
          letterSpacing: -2,
        }}
      >
        <div
          style={{
            fontFamily: FUENTE.rotulo,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: 3,
            backgroundColor: COLOR.azul,
            padding: "6px 14px",
            borderRadius: 5,
            marginBottom: 22,
          }}
        >
          HISTORIA
        </div>
        <div style={{ fontSize: 58, fontWeight: 600 }}>¿Pudo llamarse</div>
        <div style={{ fontSize: 80, marginTop: 10 }}>LA LÍNEA DE LA</div>
        <div style={{ fontSize: 138, color: COLOR.lima }}>VICTORIA?</div>
      </AbsoluteFill>
      <Img src={MARCA.isotipo} style={{ position: "absolute", left: 40, bottom: 34, height: 70 }} />
    </AbsoluteFill>
  );
};
