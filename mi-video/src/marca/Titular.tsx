import { useCurrentFrame } from "remotion";
import { suave } from "./animacion";
import { COLOR, FUENTE, ZONA_SEGURA } from "./marca";

const Palabras: React.FC<{ readonly texto: string; readonly desde: number; readonly color: string }> = ({
  texto,
  desde,
  color,
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {texto.split(" ").map((p, i) => {
        const v = suave(frame, desde + i * 2, 10);
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: 6 }}>
            <span style={{ display: "inline-block", color, translate: `0px ${(1 - v) * 105}%` }}>
              {p}
              {" "}
            </span>
          </span>
        );
      })}
    </>
  );
};

/** Titular sobre fondo azul que entra palabra a palabra. Segunda línea en lima. */
export const Titular: React.FC<{
  readonly principal: string;
  readonly destacado?: string;
  readonly desde: number;
  readonly hasta?: number;
  readonly tamano?: number;
  readonly top?: number;
}> = ({ principal, destacado, desde, hasta, tamano = 84, top = ZONA_SEGURA.arriba + 40 }) => {
  const frame = useCurrentFrame();
  const sale = hasta === undefined ? 0 : suave(frame, hasta - 6, 6);
  const n = principal.split(" ").length;
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: ZONA_SEGURA.lados,
        right: ZONA_SEGURA.lados,
        fontFamily: FUENTE.display,
        fontWeight: 800,
        fontSize: tamano,
        lineHeight: 1.0,
        letterSpacing: -2,
        opacity: 1 - sale,
        translate: `0px ${-sale * 30}px`,
      }}
    >
      <Palabras texto={principal} desde={desde} color={COLOR.blanco} />
      {destacado ? (
        <div>
          <Palabras texto={destacado} desde={desde + n * 2 + 2} color={COLOR.lima} />
        </div>
      ) : null}
    </div>
  );
};
