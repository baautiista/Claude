import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
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
  const zoom = suave(frame, frameEnEscena(MOMENTOS.zoomIntro), 1.4 * fps);

  return (
    <Escena fondo="azul">
      {/* Plano general: al final, la cámara se acerca al punto 1 */}
      <AbsoluteFill style={{ scale: interpolate(zoom, [0, 1], [1, 2.6]), transformOrigin: "380px 880px" }}>
        <div style={{ position: "absolute", top: 640, left: 140, width: 800, height: 832 }}>
          <PlanoGeneral lineas={suave(frame, 0.2 * fps, 1.0 * fps)} puntos={suave(frame, puntos, 0.4 * fps)} frame={frame} />
        </div>
        <div style={{ position: "absolute", top: 690, left: 560, opacity: 1 - zoom }}>
          <TarjetaFoto archivo={FOTOS.santaFilomena} ancho={340} alto={300} desde={fotos} etiqueta="1" rotacion={3} enfoque="50% 55%" />
        </div>
        <div style={{ position: "absolute", top: 960, left: 110, opacity: 1 - zoom }}>
          <TarjetaFoto archivo={FOTOS.colon} ancho={340} alto={300} desde={fotos + 5} etiqueta="2" rotacion={-3} enfoque="45% 70%" />
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          paddingTop: ZONA_SEGURA.arriba + 30,
          paddingLeft: ZONA_SEGURA.lados,
          opacity: 1 - zoom,
          translate: `0px ${-zoom * 80}px`,
        }}
      >
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
              scale: 0.6 + suave(frame, 0, 8) * 0.4,
              opacity: suave(frame, 0, 3),
            }}
          >
            2
          </div>
          <div style={{ opacity: suave(frame, 3, 8), translate: `${(1 - suave(frame, 3, 10)) * 60}px 0px` }}>
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
    </Escena>
  );
};
