import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE } from "../../marca/marca";
import { Titular } from "../../marca/Titular";
import { Tramo } from "../../marca/Tramo";
import { MOMENTOS, RENDERS } from "../config";
import { Edificio, TarjetaRender } from "../graficos";
import { beatsDeEscena, frameEnEscena } from "../tiempos";

export const Pregunta: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [, pregunta, matiz] = beatsDeEscena("pregunta");
  const ideas = frameEnEscena(MOMENTOS.columnaIdeas);
  const aprobado = frameEnEscena(MOMENTOS.columnaAprobado);
  const vacio = entrada(frame, aprobado - 4, 14, 12);

  return (
    <Escena fondo="azul">
      {/* Distintas posibilidades */}
      <Tramo desde={0} hasta={pregunta}>
        <Titular principal="Distintas posibilidades…" desde={0} tamano={80} />
        <div style={{ position: "absolute", top: 460, left: 60, width: 960, display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center" }}>
          {RENDERS.map((r, i) => (
            <div key={r.id} style={{ opacity: suave(frame, 4 + i * 3, 8), scale: 0.8 + suave(frame, 4 + i * 3, 10) * 0.2 }}>
              <TarjetaRender archivo={r.archivo} nombre={r.nombre} ancho={300} borde={4} />
            </div>
          ))}
        </div>
      </Tramo>

      {/* La pregunta */}
      <Tramo desde={pregunta} hasta={matiz}>
        <Titular principal="…para una misma pregunta" desde={pregunta} tamano={64} />
        <div style={{ position: "absolute", top: 420, left: 80, right: 80, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 104, lineHeight: 1.0, letterSpacing: -3, color: COLOR.blanco }}>
          ¿Cómo recuperamos uno de los <span style={{ color: COLOR.lima }}>mayores edificios vacíos</span> de La Línea?
        </div>
        <Edificio dibujo={1} luces={suave(frame, pregunta + 10, 2.5 * fps)} style={{ position: "absolute", left: 140, top: 1000, width: 800, height: 560 }} />
      </Tramo>

      {/* Ideas frente a aprobado */}
      <Tramo desde={matiz} hasta={durationInFrames + 10}>
        <Titular principal="No es lo mismo" desde={matiz} tamano={80} />
        {[
          { titulo: "IDEAS", x: 80 },
          { titulo: "APROBADO", x: 560 },
        ].map((c) => (
          <div key={c.titulo} style={{ position: "absolute", top: 420, left: c.x, width: 440 }}>
            <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 60, color: c.titulo === "IDEAS" ? COLOR.lima : COLOR.blanco, marginBottom: 18 }}>{c.titulo}</div>
            <div
              style={{
                height: 820,
                borderRadius: 24,
                border: `5px ${c.titulo === "IDEAS" ? "solid" : "dashed"} rgba(255,255,255,0.6)`,
                padding: 20,
                boxSizing: "border-box",
                display: "flex",
                flexWrap: "wrap",
                gap: 14,
                alignContent: "flex-start",
                position: "relative",
              }}
            >
              {c.titulo === "IDEAS"
                ? RENDERS.map((r, i) => (
                    <div key={r.id} style={{ opacity: suave(frame, ideas + i * 3, 6), translate: `0px ${(1 - suave(frame, ideas + i * 3, 8)) * -60}px` }}>
                      <TarjetaRender archivo={r.archivo} nombre={r.nombre} ancho={186} borde={3} />
                    </div>
                  ))
                : (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: vacio,
                        scale: interpolate(vacio, [0, 1], [1.3, 1]),
                      }}
                    >
                      <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 260, lineHeight: 1, color: COLOR.blanco }}>0</div>
                      <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 34, color: "rgba(255,255,255,0.8)" }}>usos aprobados</div>
                    </div>
                  )}
            </div>
          </div>
        ))}
      </Tramo>
    </Escena>
  );
};
