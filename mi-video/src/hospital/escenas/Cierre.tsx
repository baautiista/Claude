import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { Titular } from "../../marca/Titular";
import { Tramo } from "../../marca/Tramo";
import { MOMENTOS, RENDERS } from "../config";
import { Edificio, TarjetaRender } from "../graficos";
import { beatsDeEscena, frameEnEscena } from "../tiempos";

const Pregunta: React.FC<{ readonly texto: string; readonly desde: number }> = ({ texto, desde }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 10, 12);
  return (
    <div
      style={{
        fontFamily: FUENTE.display,
        fontWeight: 800,
        fontSize: 130,
        lineHeight: 1,
        letterSpacing: -4,
        color: COLOR.blanco,
        opacity: interpolate(frame, [desde, desde + 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        translate: `${(1 - p) * 120}px 0px`,
      }}
    >
      {texto.slice(0, -1)}
      <span style={{ color: COLOR.lima }}>?</span>
    </div>
  );
};

export const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [, , cuestion, tu] = beatsDeEscena("cierre");
  const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);
  const opciones = f("opciones");
  const posiciones = [
    [60, 470], [740, 470], [40, 860], [760, 860], [400, 360], [80, 1130], [720, 1130],
  ];

  return (
    <Escena fondo="azul">
      {/* ¿Segunda vida? Opciones hay */}
      <Tramo desde={0} hasta={cuestion}>
        <Titular principal="¿Una segunda vida?" destacado={frame >= opciones ? "Opciones hay." : undefined} desde={0} tamano={84} />
        <Edificio dibujo={1} luces={suave(frame, opciones, 0.8 * fps)} style={{ position: "absolute", left: 190, top: 720, width: 700, height: 490 }} />
        {RENDERS.map((r, i) => {
          const p = entrada(frame, opciones + i * 3, 12, 13);
          const [x, y] = posiciones[i];
          return (
            <div key={r.id} style={{ position: "absolute", left: x, top: y, opacity: p, scale: interpolate(p, [0, 1], [0.3, 1]), rotate: `${(i % 2 ? 1 : -1) * 4}deg` }}>
              <TarjetaRender archivo={r.archivo} nombre={r.nombre} ancho={280} borde={4} />
            </div>
          );
        })}
      </Tramo>

      {/* ¿Quién paga? ¿Qué uso? ¿Cuándo? */}
      <Tramo desde={cuestion} hasta={tu}>
        <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 60, left: ZONA_SEGURA.lados }}>
          <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 40, color: COLOR.blanco, letterSpacing: 2, opacity: suave(frame, cuestion, 8) }}>LA CUESTIÓN ES…</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 60, marginTop: 70 }}>
            <Pregunta texto="¿Quién paga?" desde={f("quien")} />
            <Pregunta texto="¿Qué uso?" desde={f("queUso")} />
            <Pregunta texto="¿Cuándo?" desde={f("cuando")} />
          </div>
        </div>
      </Tramo>

      {/* Mosaico final */}
      <Tramo desde={tu} hasta={durationInFrames + 10}>
        <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, fontFamily: FUENTE.display, fontWeight: 800, lineHeight: 1, letterSpacing: -2 }}>
          <div style={{ fontSize: 84, color: COLOR.blanco }}>
            <span style={{ color: COLOR.lima }}>7</span> ideas. Un edificio.
          </div>
          <div style={{ fontSize: 96, color: COLOR.lima, marginTop: 10, opacity: suave(frame, tu + 0.6 * fps, 8) }}>¿Cuál elegirías?</div>
        </div>
        <div style={{ position: "absolute", top: 560, left: 50, width: 980, display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
          {RENDERS.map((r, i) => (
            <div key={r.id} style={{ position: "relative", opacity: suave(frame, tu + i * 2, 8), scale: 0.85 + suave(frame, tu + i * 2, 10) * 0.15 }}>
              <TarjetaRender archivo={r.archivo} nombre={r.nombre} ancho={i < 4 ? 230 : 300} borde={4} />
              <div style={{ position: "absolute", left: 8, top: 8, width: 44, height: 44, borderRadius: 8, backgroundColor: COLOR.lima, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FUENTE.display, fontWeight: 800, fontSize: 28, color: COLOR.negro }}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      </Tramo>
    </Escena>
  );
};
