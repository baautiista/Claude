import { useCurrentFrame } from "remotion";
import { entrada } from "./animacion";
import { Contador } from "./Contador";
import { COLOR, FUENTE } from "./marca";

/** Tarjeta con un dato protagonista animado (48.000 €, 2 MESES, 83 m²…). */
export const TarjetaDato: React.FC<{
  readonly valor: number;
  readonly unidad: string;
  readonly etiqueta: string;
  readonly desde: number;
  readonly icono?: React.ReactNode;
  readonly variante?: "blanca" | "lima";
  readonly ancho?: number;
}> = ({ valor, unidad, etiqueta, desde, icono, variante = "blanca", ancho = 440 }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 18);
  const fondo = variante === "lima" ? COLOR.lima : COLOR.blanco;
  return (
    <div
      style={{
        width: ancho,
        boxSizing: "border-box",
        padding: "28px 30px",
        borderRadius: 24,
        backgroundColor: fondo,
        color: COLOR.negro,
        opacity: p,
        translate: `0px ${(1 - p) * 60}px`,
        boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
      }}
    >
      {icono ? <div style={{ marginBottom: 12 }}>{icono}</div> : null}
      <div
        style={{
          fontFamily: FUENTE.display,
          fontWeight: 800,
          fontSize: 92,
          lineHeight: 1,
          letterSpacing: -3,
          whiteSpace: "nowrap",
        }}
      >
        <Contador valor={valor} desde={desde} duracion={36} />
        <span style={{ fontSize: 60, marginLeft: 10 }}>{unidad}</span>
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: FUENTE.texto,
          fontWeight: 700,
          fontSize: 32,
          lineHeight: 1.15,
          color: COLOR.grisOscuro,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {etiqueta}
      </div>
    </div>
  );
};
