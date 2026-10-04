import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { MOMENTOS } from "../config";
import { Edificio } from "../graficos";
import { frameEnEscena } from "../tiempos";

export const Transicion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const ideas = frameEnEscena(MOMENTOS.ideas);
  const p = entrada(frame, ideas, 14, 12);
  return (
    <Escena fondo="azul">
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 60, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
        <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 110, color: COLOR.blanco, opacity: suave(frame, 0, 8) }}>Pero…</div>
        <div
          style={{
            fontFamily: FUENTE.display,
            fontWeight: 800,
            fontSize: 112,
            lineHeight: 1,
            letterSpacing: -3,
            color: COLOR.lima,
            opacity: p,
            scale: interpolate(p, [0, 1], [1.3, 1]),
            transformOrigin: "0% 50%",
          }}
        >
          ¿qué podríamos hacer aquí?
        </div>
      </div>
      <Edificio
        dibujo={suave(frame, 0, 0.6 * fps)}
        interrogantes={suave(frame, ideas, durationInFrames - ideas - 10)}
        style={{ position: "absolute", left: 40, top: 720, width: 1000, height: 700 }}
      />
    </Escena>
  );
};
