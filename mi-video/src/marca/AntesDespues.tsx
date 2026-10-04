import { AbsoluteFill, Img, staticFile } from "remotion";
import { COLOR, FUENTE, ZONA_SEGURA, existe } from "./marca";

/**
 * Cortinilla antes/después a pantalla completa a partir de una imagen con las
 * dos versiones lado a lado (antes a la izquierda, después a la derecha).
 * `progreso` 0 = solo antes, 1 = solo después.
 */
export const AntesDespues: React.FC<{
  readonly archivo: string;
  readonly progreso: number;
  readonly nota?: string;
}> = ({ archivo, progreso, nota }) => {
  if (!existe(archivo)) return null;
  const linea = progreso * 1080;
  const mitad = (desplazamiento: number) => (
    <Img
      src={staticFile(archivo)}
      style={{ position: "absolute", top: "50%", left: desplazamiento, width: 2160, translate: "0px -50%" }}
    />
  );
  const etiqueta = (texto: string, fondo: string, color: string, lado: "izq" | "der", opacidad: number) => (
    <div
      style={{
        position: "absolute",
        top: ZONA_SEGURA.arriba + 60,
        [lado === "izq" ? "left" : "right"]: ZONA_SEGURA.lados,
        backgroundColor: fondo,
        color,
        fontFamily: FUENTE.display,
        fontWeight: 800,
        fontSize: 56,
        padding: "6px 22px",
        borderRadius: 10,
        opacity: opacidad,
      }}
    >
      {texto}
    </div>
  );
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: COLOR.negro }}>
      {mitad(0)}
      <AbsoluteFill style={{ clipPath: `inset(0 ${100 - progreso * 100}% 0 0)` }}>{mitad(-1080)}</AbsoluteFill>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: linea - 5, width: 10, backgroundColor: COLOR.lima }} />
      {etiqueta("ANTES", COLOR.rosa, COLOR.blanco, "der", progreso < 0.85 ? 1 : 0)}
      {etiqueta("DESPUÉS", COLOR.lima, COLOR.negro, "izq", progreso > 0.15 ? 1 : 0)}
      {nota ? (
        <div
          style={{
            position: "absolute",
            top: ZONA_SEGURA.arriba + 150,
            left: ZONA_SEGURA.lados,
            backgroundColor: "rgba(10,10,10,0.75)",
            color: COLOR.blanco,
            fontFamily: FUENTE.texto,
            fontWeight: 600,
            fontSize: 28,
            padding: "4px 14px",
            borderRadius: 6,
          }}
        >
          {nota}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
