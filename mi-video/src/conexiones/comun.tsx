import { useCurrentFrame } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { COLOR, FUENTE, ZONA_SEGURA } from "../marca/marca";

/** Distintivo de lugar: círculo lima con número + nombre (1 · SANTA FILOMENA). */
export const Distintivo: React.FC<{ readonly numero: string; readonly nombre: string; readonly desde: number }> = ({
  numero,
  nombre,
  desde,
}) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 14, 13);
  return (
    <div
      style={{
        position: "absolute",
        top: ZONA_SEGURA.arriba + 40,
        left: ZONA_SEGURA.lados,
        display: "flex",
        alignItems: "center",
        gap: 22,
        opacity: suave(frame, desde, 6),
        translate: `${(1 - p) * -60}px 0px`,
      }}
    >
      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: 55,
          backgroundColor: COLOR.lima,
          color: COLOR.negro,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FUENTE.display,
          fontWeight: 800,
          fontSize: 70,
          scale: p,
        }}
      >
        {numero}
      </div>
      <div
        style={{
          fontFamily: FUENTE.display,
          fontWeight: 800,
          fontSize: 76,
          color: COLOR.blanco,
          letterSpacing: -1,
          textShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}
      >
        {nombre}
      </div>
    </div>
  );
};

/** Nota pequeña de rigor bajo un gráfico ("Esquema orientativo", "Fuente: …"). */
export const Nota: React.FC<{ readonly children: string; readonly top: number; readonly desde: number }> = ({
  children,
  top,
  desde,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: ZONA_SEGURA.lados,
        fontFamily: FUENTE.texto,
        fontWeight: 600,
        fontSize: 26,
        color: "rgba(255,255,255,0.75)",
        opacity: suave(frame, desde, 10),
      }}
    >
      {children}
    </div>
  );
};

/** Contenedor del plano esquemático (1000×800) en la zona central. */
export const ZonaPlano: React.FC<{ readonly children: React.ReactNode; readonly top?: number }> = ({
  children,
  top = 560,
}) => (
  <div style={{ position: "absolute", top, left: 40, width: 1000, height: 800, overflow: "hidden", borderRadius: 24 }}>
    {children}
  </div>
);

/** Etiqueta tipo "chip" (Fin de año, Simulación…). */
export const Chip: React.FC<{
  readonly children: React.ReactNode;
  readonly desde: number;
  readonly fondo?: string;
  readonly color?: string;
  readonly tamano?: number;
}> = ({ children, desde, fondo = COLOR.lima, color = COLOR.negro, tamano = 46 }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 14, 13);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        backgroundColor: fondo,
        color,
        fontFamily: FUENTE.display,
        fontWeight: 800,
        fontSize: tamano,
        padding: "10px 24px",
        borderRadius: 999,
        opacity: suave(frame, desde, 4),
        scale: p,
      }}
    >
      {children}
    </div>
  );
};
