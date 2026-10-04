import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { Titular } from "../../marca/Titular";
import { MOMENTOS } from "../config";
import { frameEnEscena } from "../tiempos";

const Tarjeta: React.FC<{
  readonly tipo: string;
  readonly desde: number;
  readonly estado: string;
  readonly estadoDesde: number;
  readonly estadoColor: string;
  readonly estadoTexto: string;
  readonly x: number;
}> = ({ tipo, desde, estado, estadoDesde, estadoColor, estadoTexto, x }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 14);
  const e = entrada(frame, estadoDesde, 12, 13);
  return (
    <div style={{ position: "absolute", top: 560, left: x, width: 400, opacity: p, translate: `0px ${(1 - p) * 60}px` }}>
      <div style={{ backgroundColor: COLOR.blanco, borderRadius: 26, padding: "30px 26px", boxShadow: "0 20px 44px rgba(0,0,0,0.25)" }}>
        <svg width={120} height={120} viewBox="0 0 120 120" fill="none" stroke={COLOR.azul} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 106 V40 H60 V106 M60 106 V22 H106 V106 M8 106 H112 M28 56 H46 M28 76 H46 M74 40 H92 M74 60 H92 M74 80 H92" />
          <path d="M37 18 V34 M29 26 H45" />
        </svg>
        <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 32, color: "#6B7280", marginTop: 14 }}>Antiguo Hospital</div>
        <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 56, color: COLOR.negro, lineHeight: 1 }}>{tipo}</div>
      </div>
      <div
        style={{
          marginTop: 24,
          backgroundColor: estadoColor,
          color: estadoTexto,
          borderRadius: 20,
          padding: "20px 24px",
          fontFamily: FUENTE.display,
          fontWeight: 800,
          fontSize: 46,
          lineHeight: 1.05,
          opacity: e,
          scale: interpolate(e, [0, 1], [0.7, 1]),
        }}
      >
        → {estado}
      </div>
    </div>
  );
};

export const NoConfundir: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);
  const ojo = entrada(frame, 0, 12, 12);
  const distinto = entrada(frame, f("distinto"), 12, 10);

  return (
    <Escena fondo="azul">
      <div
        style={{
          position: "absolute",
          top: ZONA_SEGURA.arriba + 40,
          left: ZONA_SEGURA.lados,
          backgroundColor: COLOR.rosa,
          color: COLOR.blanco,
          fontFamily: FUENTE.display,
          fontWeight: 800,
          fontSize: 56,
          padding: "6px 22px",
          borderRadius: 12,
          scale: ojo,
          transformOrigin: "0% 50%",
        }}
      >
        OJO
      </div>
      <Titular principal="No son el mismo" destacado="edificio" desde={0.4 * fps} top={ZONA_SEGURA.arriba + 140} tamano={84} />
      <Tarjeta tipo="COMARCAL" desde={f("comarcal")} estado="sin solución" estadoDesde={f("distinto") + 6} estadoColor={COLOR.rosa} estadoTexto={COLOR.blanco} x={70} />
      <Tarjeta tipo="MUNICIPAL" desde={f("municipal")} estado="nuevos juzgados" estadoDesde={f("juzgados")} estadoColor={COLOR.lima} estadoTexto={COLOR.negro} x={610} />
      <div
        style={{
          position: "absolute",
          top: 640,
          left: 470,
          width: 140,
          textAlign: "center",
          fontFamily: FUENTE.display,
          fontWeight: 800,
          fontSize: 170,
          color: COLOR.lima,
          opacity: distinto,
          scale: interpolate(distinto, [0, 1], [2, 1]),
        }}
      >
        ≠
      </div>
      <div
        style={{
          position: "absolute",
          top: 1180,
          left: 610,
          width: 400,
          fontFamily: FUENTE.texto,
          fontWeight: 600,
          fontSize: 30,
          color: COLOR.blanco,
          opacity: suave(frame, f("juzgados") + 0.6 * fps, 8),
        }}
      >
        Cesión a la Junta, por otra vía
      </div>
    </Escena>
  );
};
