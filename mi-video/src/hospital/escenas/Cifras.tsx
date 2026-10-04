import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Contador } from "../../marca/Contador";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE } from "../../marca/marca";
import { Titular } from "../../marca/Titular";
import { DATOS, MOMENTOS } from "../config";
import { frameEnEscena } from "../tiempos";

const UNIDAD = 36; // px por millón en la barra

const Cifra: React.FC<{
  readonly valor: number;
  readonly prefijo?: string;
  readonly etiqueta: string;
  readonly desde: number;
  readonly etiquetaDesde: number;
  readonly color: string;
  readonly juntar: number;
}> = ({ valor, prefijo = "", etiqueta, desde, etiquetaDesde, color, juntar }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 12, 13);
  return (
    <div style={{ opacity: p * (1 - juntar), translate: `${(1 - p) * -60}px 0px`, scale: interpolate(juntar, [0, 1], [1, 0.7]) }}>
      <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 190, lineHeight: 0.95, letterSpacing: -6, color }}>
        {prefijo}
        <Contador valor={valor} desde={desde} duracion={20} />
        <span style={{ fontSize: 110 }}> M€</span>
      </div>
      <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 40, color: COLOR.blanco, opacity: suave(frame, etiquetaDesde, 8), textTransform: "uppercase", letterSpacing: 2 }}>
        {etiqueta}
      </div>
    </div>
  );
};

export const Cifras: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);
  const barra6 = suave(frame, f("seis"), 0.6 * fps);
  const barra12 = suave(frame, f("doce"), 0.8 * fps);
  const juntar = suave(frame, f("suma"), 0.5 * fps);
  const total = entrada(frame, f("suma") + 6, 14, 12);
  const huecos = suave(frame, 6, 10) * (1 - suave(frame, f("seis") - 4, 6));

  return (
    <Escena fondo="azul">
      <Titular principal="Dos cifras" destacado="explican el bloqueo" desde={0} />
      {/* Dos huecos que se van a llenar */}
      <div style={{ position: "absolute", top: 560, left: 80, display: "flex", flexDirection: "column", gap: 50, opacity: huecos }}>
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              width: 600,
              height: 230,
              borderRadius: 24,
              border: "6px dashed rgba(255,255,255,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FUENTE.display,
              fontWeight: 800,
              fontSize: 150,
              color: COLOR.lima,
              scale: 0.8 + suave(frame, 6 + i * 6, 10) * 0.2,
            }}
          >
            ?
          </div>
        ))}
      </div>
      {/* Cifras */}
      <div style={{ position: "absolute", top: 560, left: 80, display: "flex", flexDirection: "column", gap: 50 }}>
        <Cifra valor={DATOS.valoracionMillones} etiqueta="Valoración del inmueble" desde={f("seis")} etiquetaDesde={f("valoracion")} color={COLOR.lima} juntar={juntar} />
        <Cifra valor={DATOS.rehabilitacionMillones} prefijo="+" etiqueta="Rehabilitación (aprox.)" desde={f("doce")} etiquetaDesde={f("rehabilitar")} color={COLOR.blanco} juntar={juntar} />
      </div>
      {/* Barra apilada */}
      <div style={{ position: "absolute", left: 800, top: 560, width: 180, height: UNIDAD * 18 + 20, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <div style={{ height: UNIDAD * 12 * barra12, backgroundColor: COLOR.blanco, borderRadius: "16px 16px 0 0" }} />
        <div style={{ height: UNIDAD * 6 * barra6, backgroundColor: COLOR.lima, borderRadius: barra12 > 0 ? 0 : "16px 16px 0 0" }} />
        <div style={{ height: 6, backgroundColor: "rgba(255,255,255,0.5)" }} />
      </div>
      {/* Total */}
      <div
        style={{
          position: "absolute",
          top: 640,
          left: 70,
          width: 700,
          opacity: total,
          scale: interpolate(total, [0, 1], [1.3, 1]),
          transformOrigin: "0% 50%",
        }}
      >
        <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 44, color: COLOR.blanco, letterSpacing: 2 }}>COMPRAR + REHABILITAR</div>
        <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 250, lineHeight: 0.95, letterSpacing: -10, color: COLOR.lima }}>
          ≈{DATOS.totalMillones}
        </div>
        <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 130, lineHeight: 0.9, color: COLOR.lima }}>M€</div>
      </div>
    </Escena>
  );
};
