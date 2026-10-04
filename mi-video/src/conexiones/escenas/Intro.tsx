import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { Etiqueta } from "../../marca/Etiqueta";
import { TarjetaFoto } from "../../marca/Foto";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { FOTOS, MOMENTOS } from "../config";
import { PlanoGeneral } from "../Plano";
import { frameEnEscena } from "../tiempos";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const puntos = frameEnEscena(MOMENTOS.puntos);
  const fotos = frameEnEscena(MOMENTOS.fotosIntro);

  return (
    <Escena fondo="azul">
      <AbsoluteFill style={{ paddingTop: ZONA_SEGURA.arriba + 30, paddingLeft: ZONA_SEGURA.lados }}>
        <Etiqueta conIsotipo>URBANISMO</Etiqueta>
        <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 20 }}>
          <div
            style={{
              fontFamily: FUENTE.display,
              fontWeight: 800,
              fontSize: 280,
              lineHeight: 0.9,
              color: COLOR.lima,
              letterSpacing: -10,
              scale: 0.7 + suave(frame, 0, 10) * 0.3,
              opacity: suave(frame, 0, 4),
            }}
          >
            2
          </div>
          <div style={{ opacity: suave(frame, 3, 10), translate: `${(1 - suave(frame, 3, 12)) * 40}px 0px` }}>
            <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 116, lineHeight: 0.95, color: COLOR.blanco, letterSpacing: -3 }}>
              CALLES
            </div>
            <div style={{ fontFamily: FUENTE.rotulo, fontWeight: 700, fontSize: 44, lineHeight: 1.1, color: COLOR.blanco, marginTop: 8 }}>
              a punto de
              <br />
              desbloquearse
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 640, left: 140, width: 800, height: 832 }}>
        <PlanoGeneral
          lineas={suave(frame, 0.3 * fps, 1.2 * fps)}
          puntos={suave(frame, puntos, 0.5 * fps)}
          frame={frame}
        />
      </div>
      <div style={{ position: "absolute", top: 690, left: 560 }}>
        <TarjetaFoto archivo={FOTOS.santaFilomena} ancho={340} alto={300} desde={fotos} etiqueta="1" rotacion={3} />
      </div>
      <div style={{ position: "absolute", top: 960, left: 110 }}>
        <TarjetaFoto archivo={FOTOS.colon} ancho={340} alto={300} desde={fotos + 6} etiqueta="2" rotacion={-3} enfoque="50% 70%" />
      </div>
    </Escena>
  );
};
