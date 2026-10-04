import { useCurrentFrame, useVideoConfig } from "remotion";
import { suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { Tramo } from "../../marca/Tramo";
import { RENDERS } from "../config";
import { TarjetaRender } from "../graficos";
import { frameEnEscena } from "../tiempos";

export const Carrusel: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inicios = RENDERS.map((_, i) => frameEnEscena({ escena: "carrusel", frase: i, mas: -0.1 }));

  return (
    <Escena fondo="azul">
      {/* Aviso fijo durante todo el carrusel */}
      <div
        style={{
          position: "absolute",
          top: ZONA_SEGURA.arriba + 30,
          left: ZONA_SEGURA.lados,
          backgroundColor: COLOR.rosa,
          color: COLOR.blanco,
          fontFamily: FUENTE.rotulo,
          fontWeight: 700,
          fontSize: 32,
          letterSpacing: 2,
          padding: "8px 18px",
          borderRadius: 8,
          opacity: suave(frame, 0, 8),
          zIndex: 2,
        }}
      >
        IDEA / PROPUESTA — NO APROBADA
      </div>
      {RENDERS.map((r, i) => {
        const desde = Math.max(0, inicios[i]);
        const hasta = i + 1 < RENDERS.length ? Math.max(desde + 12, inicios[i + 1]) : durationInFrames + 10;
        return (
          <Tramo key={r.id} desde={desde} hasta={hasta}>
            <div style={{ position: "absolute", top: 330, left: 80 }}>
              <TarjetaRender archivo={r.archivo} nombre={r.nombre} ancho={920} desde={desde} />
            </div>
            <div style={{ position: "absolute", top: 1140, left: 80, right: 80, display: "flex", alignItems: "flex-start", gap: 24 }}>
              <div
                style={{
                  flexShrink: 0,
                  width: 96,
                  height: 96,
                  borderRadius: 14,
                  backgroundColor: COLOR.lima,
                  color: COLOR.negro,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FUENTE.display,
                  fontWeight: 800,
                  fontSize: 56,
                }}
              >
                {i + 1}
              </div>
              <div>
                <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 66, lineHeight: 1.0, letterSpacing: -2, color: COLOR.blanco }}>
                  {r.nombre}
                </div>
                <div style={{ marginTop: 12, fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 34, color: COLOR.lima, opacity: suave(frame, desde + 12, 10) }}>
                  {r.detalle}
                </div>
              </div>
            </div>
          </Tramo>
        );
      })}
    </Escena>
  );
};
