import { Img, useCurrentFrame } from "remotion";
import { suave } from "./animacion";
import { COLOR, FUENTE, MARCA } from "./marca";

/** Etiqueta de sección: caja azul con texto en mayúsculas (HISTORIA, URBANISMO…). */
export const Etiqueta: React.FC<{
  readonly children: string;
  readonly desde?: number;
  readonly conIsotipo?: boolean;
}> = ({ children, desde = 0, conIsotipo = false }) => {
  const frame = useCurrentFrame();
  const p = suave(frame, desde, 12);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        opacity: p,
        translate: `${(1 - p) * -30}px 0px`,
      }}
    >
      {conIsotipo ? <Img src={MARCA.isotipo} style={{ height: 52 }} /> : null}
      <div
        style={{
          backgroundColor: COLOR.azul,
          color: COLOR.blanco,
          fontFamily: FUENTE.rotulo,
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: 3,
          padding: "8px 18px 6px",
          borderRadius: 6,
          clipPath: `inset(0 ${100 - p * 100}% 0 0)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
