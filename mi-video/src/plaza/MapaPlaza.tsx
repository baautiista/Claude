import { interpolate } from "remotion";
import { COLOR, FUENTE } from "../marca/marca";

/*
 * Esquema de la plaza calcado del plano 1.1 del proyecto (Planta red viaria, CAI, dic. 2025).
 * Coordenadas del plano (2000 × 1413 px); se dibuja con un desplazamiento para encajar en 1080 × 1920.
 */
export const DESPLAZAMIENTO = { x: -320, y: 170 } as const;

/** Las 13 pérgolas del plano (P01–P13). `grande`: copa de 16 m; si no, 12 m. */
export const PERGOLAS = [
  { id: "P01", x: 863, y: 295, grande: true },
  { id: "P02", x: 907, y: 440, grande: false },
  { id: "P03", x: 960, y: 340, grande: false },
  { id: "P04", x: 732, y: 405, grande: false },
  { id: "P05", x: 667, y: 505, grande: true },
  { id: "P06", x: 780, y: 552, grande: false },
  { id: "P07", x: 585, y: 662, grande: true },
  { id: "P08", x: 795, y: 643, grande: true },
  { id: "P09", x: 703, y: 750, grande: false },
  { id: "P10", x: 495, y: 898, grande: false },
  { id: "P11", x: 651, y: 914, grande: true },
  { id: "P12", x: 611, y: 1090, grande: true },
  { id: "P13", x: 793, y: 1135, grande: true },
] as const;

const R_GRANDE = 48;
const R_PEQUENA = 36;

const CONTORNO =
  "M760,220 C850,190 1000,178 1250,215 L1245,1140 C1240,1170 1220,1180 1190,1180 L560,1180 C520,1170 495,1140 485,1100 C470,1030 470,950 482,900 C495,840 520,800 545,700 C565,640 600,600 640,500 C665,430 690,380 715,310 C730,265 740,235 760,220 Z";
const EDIFICIOS = [
  "M1000,205 L1240,218 L1240,450 L1100,440 L1000,380 Z",
  "M930,395 L1115,490 L1020,665 L860,575 Z",
  "M915,670 L1020,705 L1180,820 L1180,1100 L1105,1150 L1060,1000 L1000,860 Z",
];
const CORTEN = "M1250,470 C1100,410 960,370 900,420 C840,470 790,560 800,700 C810,840 950,880 920,960 C890,1050 820,1090 790,1140";
export const FUENTE_PLAZA = { x: 620, y: 885, r: 45 } as const;

export const MapaPlaza: React.FC<{
  readonly frame: number;
  /** 0–1: dibujo del contorno. */
  readonly contorno: number;
  /** Frame en que empiezan a aparecer las pérgolas (una cada 2 frames). */
  readonly pergolasDesde: number;
  /** Pérgola que se destaca con los diámetros (índice) y progreso 0–1. */
  readonly destacada?: { readonly indice: number; readonly progreso: number };
}> = ({ frame, contorno, pergolasDesde, destacada }) => {
  return (
    <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      <g transform={`translate(${DESPLAZAMIENTO.x} ${DESPLAZAMIENTO.y})`}>
        <path d={CONTORNO} fill="rgba(255,255,255,0.13)" fillOpacity={contorno} stroke={COLOR.blanco} strokeWidth={5} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - contorno} />
        {EDIFICIOS.map((d) => (
          <path key={d} d={d} fill={COLOR.azulOscuro} fillOpacity={0.45 * contorno} stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
        ))}
        <path d={CORTEN} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={14} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - contorno} />
        <circle cx={FUENTE_PLAZA.x} cy={FUENTE_PLAZA.y} r={FUENTE_PLAZA.r} fill="rgba(255,255,255,0.35)" opacity={contorno} />
        {PERGOLAS.map((p, i) => {
          const t = interpolate(frame, [pergolasDesde + i * 2, pergolasDesde + i * 2 + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const r = p.grande ? R_GRANDE : R_PEQUENA;
          const atenuada = destacada && destacada.indice !== i ? 1 - destacada.progreso * 0.6 : 1;
          return (
            <g key={p.id} opacity={t * atenuada}>
              <circle cx={p.x} cy={p.y} r={r * (0.4 + t * 0.6)} fill={COLOR.lima} fillOpacity={0.35} stroke={COLOR.lima} strokeWidth={4} />
              {[0, 1, 2, 3, 4, 5].map((k) => {
                const a = (k * Math.PI) / 6;
                return <line key={k} x1={p.x - Math.cos(a) * r * t} y1={p.y - Math.sin(a) * r * t} x2={p.x + Math.cos(a) * r * t} y2={p.y + Math.sin(a) * r * t} stroke={COLOR.lima} strokeWidth={2} />;
              })}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

/** Indicadores de diámetro (Ø 12 / Ø 16 m) alrededor de un punto de la pantalla. */
export const Diametros: React.FC<{ readonly x: number; readonly y: number; readonly escala: number; readonly progreso12: number; readonly progreso16: number }> = ({
  x,
  y,
  escala,
  progreso12,
  progreso16,
}) => {
  const r12 = R_PEQUENA * escala;
  const r16 = R_GRANDE * escala;
  const cota = (r: number, p: number, dy: number, texto: string) => (
    <g opacity={p > 0 ? 1 : 0}>
      <circle cx={x} cy={y} r={r} fill="none" stroke={COLOR.blanco} strokeWidth={5} strokeDasharray="1" pathLength={1} strokeDashoffset={1 - p} transform={`rotate(-90 ${x} ${y})`} />
      <line x1={x - r * p} y1={y + dy} x2={x + r * p} y2={y + dy} stroke={COLOR.blanco} strokeWidth={4} />
      <text x={x + r + 18} y={y + dy + 16} fill={COLOR.blanco} fontFamily={FUENTE.display} fontWeight={800} fontSize={46} opacity={p}>
        {texto}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      {cota(r12, progreso12, 0, "Ø 12 m")}
      {cota(r16, progreso16, -r16 * 0.55, "Ø 16 m")}
    </svg>
  );
};
