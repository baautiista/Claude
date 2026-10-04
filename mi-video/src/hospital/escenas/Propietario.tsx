import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE } from "../../marca/marca";
import { Titular } from "../../marca/Titular";
import { Tachado } from "../comun";
import { MOMENTOS } from "../config";
import { Edificio } from "../graficos";
import { frameEnEscena } from "../tiempos";

const Etiqueta: React.FC<{ readonly children: React.ReactNode; readonly fondo: string; readonly color: string; readonly style?: React.CSSProperties }> = ({
  children,
  fondo,
  color,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      left: 80,
      right: 80,
      top: 440,
      backgroundColor: fondo,
      color,
      fontFamily: FUENTE.display,
      fontWeight: 800,
      fontSize: 66,
      lineHeight: 1.05,
      padding: "22px 30px",
      borderRadius: 18,
      boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Propietario: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);
  const aqui = entrada(frame, f("aqui"), 14, 10);
  const ayto = entrada(frame, f("etiquetaAyto"), 12);
  const tes = entrada(frame, f("tesoreria"), 16);

  return (
    <Escena fondo="azul">
      <Titular principal="¿De quién" destacado="es el edificio?" desde={0} tamano={84} />
      <Edificio dibujo={suave(frame, 0, 0.8 * fps)} style={{ position: "absolute", left: 40, top: 760, width: 1000, height: 700 }} />
      {/* Marcador "aquí" */}
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <g opacity={aqui} transform={`translate(405 ${interpolate(aqui, [0, 1], [700, 820])})`}>
          <path d="M0 0 C-40 -50 -40 -110 0 -110 C40 -110 40 -50 0 0 Z" fill={COLOR.lima} />
          <circle cx={0} cy={-72} r={16} fill={COLOR.negro} />
        </g>
        {/* Línea de la etiqueta al edificio */}
        <line x1={540} y1={600} x2={540} y2={600 + 180 * Math.max(ayto, tes)} stroke={COLOR.blanco} strokeWidth={5} strokeDasharray="10 10" />
      </svg>
      <Etiqueta
        fondo={COLOR.blanco}
        color={COLOR.negro}
        style={{ opacity: ayto * (1 - tes), translate: `${-tes * 300}px 0px`, scale: interpolate(ayto, [0, 1], [0.8, 1]) }}
      >
        <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 30, color: "#6B7280", marginBottom: 6 }}>PROPIETARIO</div>
        <Tachado tachar={f("tacharAyto")}>Ayuntamiento</Tachado>
      </Etiqueta>
      <Etiqueta fondo={COLOR.lima} color={COLOR.negro} style={{ opacity: tes, translate: `${(1 - tes) * 300}px 0px` }}>
        <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 30, marginBottom: 6 }}>PROPIETARIO</div>
        Tesorería General de la Seguridad Social
      </Etiqueta>
    </Escena>
  );
};
