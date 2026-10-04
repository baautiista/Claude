import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { suave } from "./animacion";
import { COLOR, FUENTE, MARCA } from "./marca";

/** Firma final: fondo azul, isotipo y "InfoLinense". Duración recomendada 0,5–1 s. */
export const Firma: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const barrido = suave(frame, 0, 0.25 * fps);
  const contenido = suave(frame, 0.1 * fps, 0.3 * fps);
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundColor: COLOR.azul,
          clipPath: `inset(${100 - barrido * 100}% 0 0 0)`,
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          gap: 26,
          flexDirection: "row",
          opacity: contenido,
          translate: `0px ${(1 - contenido) * 30}px`,
        }}
      >
        <Img src={MARCA.isotipo} style={{ height: 150 }} />
        <div
          style={{
            fontFamily: FUENTE.rotulo,
            fontWeight: 700,
            fontSize: 84,
            color: COLOR.blanco,
            letterSpacing: -1,
          }}
        >
          InfoLinense
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
