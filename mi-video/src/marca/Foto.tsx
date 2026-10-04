import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { suave } from "./animacion";
import { COLOR, FUENTE, existe } from "./marca";
import { Placeholder } from "./Placeholder";

/**
 * Foto a pantalla completa con Ken Burns suave. Entra con un barrido del fondo azul.
 * Si el archivo no existe en public/, no muestra nada.
 */
export const FotoPantalla: React.FC<{
  readonly archivo: string;
  readonly enfoque?: string;
  readonly zoom?: [number, number];
  readonly oscurecer?: number;
}> = ({ archivo, enfoque = "50% 50%", zoom = [1.05, 1.18], oscurecer = 0.35 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if (!existe(archivo)) return null;
  const barrido = suave(frame, 0, 12);
  return (
    <AbsoluteFill style={{ clipPath: `inset(0 0 ${100 - barrido * 100}% 0)` }}>
      <Img
        src={staticFile(archivo)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: enfoque,
          scale: interpolate(frame, [0, durationInFrames], zoom),
          transformOrigin: enfoque,
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(10,10,10,${oscurecer + 0.35}) 0%, rgba(10,10,10,${oscurecer * 0.3}) 35%, rgba(10,10,10,${oscurecer * 0.3}) 60%, rgba(10,10,10,${oscurecer + 0.2}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Foto recortada en tarjeta (imagen dentro de imagen), con etiqueta opcional. */
export const TarjetaFoto: React.FC<{
  readonly archivo: string;
  readonly ancho: number;
  readonly alto: number;
  readonly desde: number;
  readonly etiqueta?: string;
  readonly enfoque?: string;
  readonly rotacion?: number;
  /** Si el archivo no existe, muestra un placeholder con este nombre (si no, nada). */
  readonly placeholder?: string;
}> = ({ archivo, ancho, alto, desde, etiqueta, enfoque = "50% 50%", rotacion = 0, placeholder }) => {
  const frame = useCurrentFrame();
  const hay = existe(archivo);
  if (!hay && !placeholder) return null;
  const p = suave(frame, desde, 14);
  return (
    <div
      style={{
        position: "relative",
        width: ancho,
        height: alto,
        borderRadius: 22,
        overflow: "hidden",
        border: `6px solid ${COLOR.blanco}`,
        boxShadow: "0 24px 50px rgba(0,0,0,0.3)",
        rotate: `${rotacion}deg`,
        opacity: p,
        scale: interpolate(p, [0, 1], [0.9, 1]),
      }}
    >
      {hay ? (
        <Img
          src={staticFile(archivo)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: enfoque,
            scale: interpolate(frame, [desde, desde + 300], [1.08, 1.0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
      ) : (
        <Placeholder nombre={placeholder ?? ""} archivo={archivo.split("/").pop()} />
      )}
      {etiqueta ? (
        <div
          style={{
            position: "absolute",
            left: 14,
            bottom: 14,
            backgroundColor: COLOR.negro,
            color: COLOR.blanco,
            fontFamily: FUENTE.rotulo,
            fontWeight: 600,
            fontSize: 24,
            padding: "4px 12px",
            borderRadius: 6,
          }}
        >
          {etiqueta}
        </div>
      ) : null}
    </div>
  );
};
