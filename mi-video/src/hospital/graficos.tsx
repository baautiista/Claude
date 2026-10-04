import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { suave } from "../marca/animacion";
import { COLOR, FUENTE, ZONA_SEGURA, existe } from "../marca/marca";
import { Placeholder } from "../marca/Placeholder";
import { FOTOS_HOSPITAL } from "./config";

/**
 * Silueta del edificio (torre de ladrillo + bloque de plantas + ala baja),
 * dibujada a partir de su volumen. viewBox 1000×700.
 */
export const Edificio: React.FC<{
  /** 0→1: el edificio aparece de abajo arriba. */
  readonly dibujo?: number;
  /** 0→1: las ventanas se van iluminando en lima. */
  readonly luces?: number;
  /** Muestra "?" en algunas ventanas (con su progreso 0→1). */
  readonly interrogantes?: number;
  readonly style?: React.CSSProperties;
}> = ({ dibujo = 1, luces = 0, interrogantes = 0, style }) => {
  const ventanas: [number, number][] = [];
  for (let fila = 0; fila < 5; fila++) {
    for (let col = 0; col < 6; col++) ventanas.push([500 + col * 80, 210 + fila * 64]);
  }
  for (let fila = 0; fila < 6; fila++) ventanas.push([300, 110 + fila * 70], [380, 110 + fila * 70]);
  const conPregunta = [3, 8, 14, 21, 26, 31, 35];
  return (
    <svg viewBox="0 0 1000 700" style={style}>
      <defs>
        <clipPath id="crecer">
          <rect x={0} y={700 - 700 * dibujo} width={1000} height={700 * dibujo} />
        </clipPath>
      </defs>
      <g clipPath="url(#crecer)">
        {/* Bloque de plantas */}
        <rect x={470} y={170} width={530} height={460} fill="rgba(255,255,255,0.16)" />
        {/* Torre */}
        <rect x={260} y={60} width={210} height={570} fill="rgba(255,255,255,0.26)" />
        {/* Ala baja */}
        <rect x={0} y={440} width={720} height={190} fill="rgba(255,255,255,0.20)" />
        <rect x={0} y={440} width={720} height={22} fill="rgba(255,255,255,0.35)" />
        {/* Ventanas */}
        {ventanas.map(([x, y], i) => {
          const encendida = luces > 0 && i / ventanas.length < luces;
          return <rect key={i} x={x} y={y} width={40} height={36} rx={4} fill={encendida ? COLOR.lima : "rgba(10,10,10,0.35)"} />;
        })}
        {/* Entrada y suelo */}
        <rect x={80} y={520} width={180} height={110} fill="rgba(10,10,10,0.35)" />
        <rect x={0} y={630} width={1000} height={10} fill="rgba(255,255,255,0.4)" />
        {conPregunta.map((idx, k) => {
          const [x, y] = ventanas[idx];
          const p = Math.min(1, Math.max(0, interrogantes * conPregunta.length - k));
          return (
            <text
              key={idx}
              x={x + 20}
              y={y + 30}
              textAnchor="middle"
              fontFamily={FUENTE.display}
              fontWeight={800}
              fontSize={34 + p * 10}
              fill={COLOR.lima}
              opacity={p}
            >
              ?
            </text>
          );
        })}
      </g>
    </svg>
  );
};

/** Fondo del hospital: fotos reales con Ken Burns si existen; si no, la silueta. */
export const FondoHospital: React.FC<{ readonly indice?: number }> = ({ indice = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const disponibles = FOTOS_HOSPITAL.filter(existe);
  if (disponibles.length > 0) {
    const foto = disponibles[indice % disponibles.length];
    return (
      <AbsoluteFill>
        <Img
          src={staticFile(foto)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            scale: interpolate(frame, [0, durationInFrames], [1.04, 1.14]),
          }}
        />
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.25) 40%, rgba(10,10,10,0.55) 100%)" }} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <Edificio
        dibujo={suave(frame, 0, 24)}
        style={{ position: "absolute", left: 40, top: 560, width: 1000, height: 700, scale: interpolate(frame, [0, durationInFrames], [1, 1.06]) }}
      />
      <div
        style={{
          position: "absolute",
          top: 1250,
          left: ZONA_SEGURA.lados,
          fontFamily: FUENTE.texto,
          fontWeight: 600,
          fontSize: 24,
          color: "rgba(255,255,255,0.6)",
        }}
      >
        Foto pendiente: hospital-1.jpg
      </div>
    </AbsoluteFill>
  );
};

/** Render de una propuesta, recortado para no mostrar su rótulo inferior. */
export const TarjetaRender: React.FC<{
  readonly archivo: string;
  readonly nombre: string;
  readonly ancho: number;
  readonly desde?: number;
  readonly borde?: number;
}> = ({ archivo, nombre, ancho, desde = 0, borde = 6 }) => {
  const frame = useCurrentFrame();
  const alto = Math.round(ancho * 0.84);
  return (
    <div
      style={{
        width: ancho,
        height: alto,
        borderRadius: Math.max(10, ancho * 0.025),
        overflow: "hidden",
        border: `${borde}px solid ${COLOR.blanco}`,
        boxSizing: "border-box",
        boxShadow: "0 20px 44px rgba(0,0,0,0.3)",
        backgroundColor: COLOR.azul,
      }}
    >
      {existe(archivo) ? (
        <Img
          src={staticFile(archivo)}
          style={{
            width: "100%",
            height: ancho * 1.25,
            objectFit: "cover",
            objectPosition: "50% 0%",
            scale: interpolate(frame, [desde, desde + 90], [1.08, 1.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transformOrigin: "50% 40%",
          }}
        />
      ) : (
        <Placeholder nombre={nombre} archivo={archivo.split("/").pop()} compacto={ancho < 400} style={ancho < 400 ? { padding: 8, gap: 6 } : undefined} />
      )}
    </div>
  );
};

const trazo = { stroke: COLOR.blanco, strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

export const IconoAyuntamiento: React.FC<{ readonly size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 120 120">
    <path d="M14 48 L60 18 L106 48 Z M20 102 H100 M26 56 V96 M46 56 V96 M74 56 V96 M94 56 V96 M18 48 H102" {...trazo} />
  </svg>
);

export const IconoJunta: React.FC<{ readonly size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 120 120">
    <path d="M22 104 V44 H98 V104 M14 104 H106 M40 60 V88 M60 60 V88 M80 60 V88 M60 44 V10 M60 12 H86 L80 20 L86 28 H60" {...trazo} />
  </svg>
);

export const IconoSeguridadSocial: React.FC<{ readonly size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 120 120">
    <path d="M60 12 L100 26 V58 C100 82 82 100 60 108 C38 100 20 82 20 58 V26 Z M60 40 V80 M40 60 H80" {...trazo} />
  </svg>
);

/** Candado: `apertura` 0 = cerrado, 1 = abierto. */
export const Candado: React.FC<{ readonly size: number; readonly apertura: number; readonly color?: string }> = ({
  size,
  apertura,
  color = COLOR.lima,
}) => (
  <svg width={size} height={size} viewBox="0 0 120 140">
    <path
      d={`M34 ${64 - apertura * 24} V${40 - apertura * 24} A26 26 0 0 1 86 ${40 - apertura * 24} V${64 - apertura * 24}`}
      stroke={color}
      strokeWidth={12}
      fill="none"
      strokeLinecap="round"
      transform={`rotate(${apertura * -12} 86 ${64 - apertura * 24})`}
    />
    <rect x={18} y={62} width={84} height={68} rx={14} fill={color} />
    <circle cx={60} cy={92} r={9} fill={COLOR.negro} />
    <rect x={56} y={92} width={8} height={20} rx={4} fill={COLOR.negro} />
  </svg>
);
