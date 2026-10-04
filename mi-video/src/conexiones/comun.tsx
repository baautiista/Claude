import { useCurrentFrame } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { COLOR, FUENTE, ZONA_SEGURA } from "../marca/marca";

/** Titular sobre fondo azul: línea principal blanca y, opcional, una segunda en lima. */
export const Titular: React.FC<{
  readonly principal: string;
  readonly destacado?: string;
  readonly desde: number;
  readonly hasta?: number;
  readonly tamano?: number;
}> = ({ principal, destacado, desde, hasta, tamano = 84 }) => {
  const frame = useCurrentFrame();
  const p = suave(frame, desde, 12) * (hasta === undefined ? 1 : 1 - suave(frame, hasta - 6, 6));
  return (
    <div
      style={{
        position: "absolute",
        top: ZONA_SEGURA.arriba + 40,
        left: ZONA_SEGURA.lados,
        right: ZONA_SEGURA.lados,
        fontFamily: FUENTE.display,
        fontWeight: 800,
        fontSize: tamano,
        lineHeight: 1.0,
        letterSpacing: -2,
        color: COLOR.blanco,
        opacity: p,
        translate: `0px ${(1 - p) * 30}px`,
      }}
    >
      {principal}
      {destacado ? <div style={{ color: COLOR.lima }}>{destacado}</div> : null}
    </div>
  );
};

/** Distintivo de lugar: círculo lima con número + nombre (1 · SANTA FILOMENA). */
export const Distintivo: React.FC<{ readonly numero: string; readonly nombre: string; readonly desde: number }> = ({
  numero,
  nombre,
  desde,
}) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 16, 14);
  return (
    <div
      style={{
        position: "absolute",
        top: ZONA_SEGURA.arriba + 40,
        left: ZONA_SEGURA.lados,
        display: "flex",
        alignItems: "center",
        gap: 22,
        opacity: suave(frame, desde, 8),
        translate: `${(1 - p) * -40}px 0px`,
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
          textShadow: "0 4px 20px rgba(0,0,0,0.4)",
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
  <div style={{ position: "absolute", top, left: 40, width: 1000, height: 800 }}>{children}</div>
);
