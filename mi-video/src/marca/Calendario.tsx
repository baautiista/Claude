import { interpolate, useCurrentFrame } from "remotion";
import { entrada, suave } from "./animacion";
import { COLOR, FUENTE } from "./marca";

const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

/** Calendario mensual con un día destacado. `mes` va de 1 a 12. */
export const Calendario: React.FC<{
  readonly anio: number;
  readonly mes: number;
  readonly dia: number;
  readonly desde: number;
  readonly ancho?: number;
}> = ({ anio, mes, dia, desde, ancho = 760 }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 18);
  const marca = entrada(frame, desde + 14, 14, 12);
  const primero = (new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay() + 6) % 7; // lunes = 0
  const totalDias = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const celda = (ancho - 60) / 7;
  const celdas = Array.from({ length: primero + totalDias }, (_, i) => (i < primero ? null : i - primero + 1));
  return (
    <div
      style={{
        width: ancho,
        boxSizing: "border-box",
        padding: 30,
        borderRadius: 28,
        backgroundColor: COLOR.blanco,
        boxShadow: "0 24px 50px rgba(0,0,0,0.2)",
        opacity: p,
        translate: `0px ${(1 - p) * 60}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: FUENTE.display,
          fontWeight: 800,
          fontSize: 54,
          color: COLOR.negro,
          marginBottom: 16,
        }}
      >
        <span>{MESES[mes - 1]}</span>
        <span style={{ color: "#9AA1AC", fontSize: 40 }}>{anio}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {DIAS.map((d) => (
          <div
            key={d}
            style={{
              width: celda,
              textAlign: "center",
              fontFamily: FUENTE.texto,
              fontWeight: 700,
              fontSize: 26,
              color: "#9AA1AC",
              paddingBottom: 8,
            }}
          >
            {d}
          </div>
        ))}
        {celdas.map((n, i) => {
          const destacado = n === dia;
          return (
            <div
              key={i}
              style={{
                width: celda,
                height: celda * 0.82,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                fontFamily: FUENTE.texto,
                fontWeight: destacado ? 900 : 600,
                fontSize: 34,
                color: destacado && marca > 0.5 ? COLOR.blanco : n && n < dia ? "#B5BBC4" : COLOR.negro,
                opacity: n === null ? 0 : suave(frame, desde + 4 + i * 0.5, 8),
              }}
            >
              {destacado ? (
                <div
                  style={{
                    position: "absolute",
                    width: celda * 0.86,
                    height: celda * 0.76,
                    borderRadius: 16,
                    backgroundColor: COLOR.azul,
                    scale: interpolate(marca, [0, 1], [0.2, 1]),
                  }}
                />
              ) : null}
              <span style={{ position: "relative" }}>{n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
