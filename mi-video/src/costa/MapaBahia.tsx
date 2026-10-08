import { Easing, interpolate } from "remotion";
import { COLOR, FUENTE } from "../marca/marca";

/**
 * Mapa esquemático (norte arriba, no a escala) del entorno de La Línea:
 * bahía de Algeciras al oeste, Mediterráneo al este, La Línea en el istmo,
 * Gibraltar al sur y la costa de San Roque (Campamento) al norte de la bahía.
 * Lienzo de 1600 × 2000.
 */
const TIERRA =
  "M0 0 H1600 V380 C1500 420 1340 470 1290 560 L1250 700 C1230 780 1215 830 1205 880 L1180 1000 C1170 1150 1170 1300 1150 1450 C1130 1600 1100 1700 1060 1760 C1020 1720 1000 1650 990 1550 C975 1400 965 1250 960 1100 L950 900 C945 760 935 640 905 560 C880 520 850 505 800 500 L320 480 C290 560 270 700 260 900 L250 2000 H0 Z";
const PENON = "M1010 960 C1090 980 1150 1100 1150 1300 C1140 1500 1090 1650 1060 1700 C1030 1550 1000 1300 1010 960 Z";

export const PUNTOS = {
  atunara: { x: 1278, y: 610, nombre: "Atunara" },
  eastside: { x: 1228, y: 1000, nombre: "Eastside" },
  westside: { x: 925, y: 1185, nombre: "Westside" },
  crinavis: { x: 815, y: 550, nombre: "Crinavis" },
} as const;

export type Estado = "ejecutado" | "proyectado" | "antecedente";

const Rotulo: React.FC<{ readonly x: number; readonly y: number; readonly children: string; readonly tam?: number; readonly peso?: number; readonly op?: number }> = ({
  x,
  y,
  children,
  tam = 30,
  peso = 600,
  op = 0.75,
}) => (
  <text x={x} y={y} textAnchor="middle" fontFamily={FUENTE.texto} fontWeight={peso} fontSize={tam} fill="white" opacity={op} letterSpacing={2}>
    {children}
  </text>
);

export const MapaBahia: React.FC<{
  readonly frame: number;
  /** 0→1 progreso de cada elemento del mapa. */
  readonly puntos: number;
  readonly relleno: number;
  readonly westside: number;
  readonly crinavis: number;
  readonly atunara: number;
  readonly enlaceAtunara: number;
  readonly destacado?: keyof typeof PUNTOS | null;
}> = ({ frame, puntos, relleno, westside, crinavis, atunara, enlaceAtunara, destacado = null }) => {
  const pulso = 0.5 + 0.5 * Math.sin(frame / 6);
  const e = PUNTOS.eastside;
  const a = PUNTOS.atunara;
  return (
    <svg viewBox="0 0 1600 2000" width={1600} height={2000}>
      <defs>
        <pattern id="proyectado" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="22" height="22" fill="rgba(255,255,255,0.08)" />
          <rect width="6" height="22" fill="rgba(255,255,255,0.45)" />
        </pattern>
      </defs>
      <rect width={1600} height={2000} fill={COLOR.azulOscuro} />
      <path d={TIERRA} fill="#2557E6" stroke="rgba(255,255,255,0.55)" strokeWidth={3} />
      <path d={PENON} fill="rgba(255,255,255,0.14)" />
      {/* Frontera */}
      <line x1={950} y1={880} x2={1205} y2={880} stroke="white" strokeWidth={4} strokeDasharray="14 10" opacity={0.6} />

      {/* Rótulos geográficos */}
      <Rotulo x={1085} y={740} tam={40} peso={800} op={0.9}>LA LÍNEA</Rotulo>
      <Rotulo x={1075} y={1360} tam={34} peso={800} op={0.8}>GIBRALTAR</Rotulo>
      <Rotulo x={600} y={380} tam={34} peso={800} op={0.8}>SAN ROQUE</Rotulo>
      <Rotulo x={590} y={1060}>BAHÍA DE</Rotulo>
      <Rotulo x={590} y={1100}>ALGECIRAS</Rotulo>
      <Rotulo x={1410} y={1180}>MAR</Rotulo>
      <Rotulo x={1410} y={1220}>MEDITERRÁNEO</Rotulo>
      <Rotulo x={1345} y={780} tam={26}>Levante</Rotulo>
      <Rotulo x={860} y={790} tam={26}>Poniente</Rotulo>
      <Rotulo x={690} y={455} tam={24}>Campamento</Rotulo>

      {/* Eastside: terreno ya ganado al mar (relleno ejecutado) */}
      <path
        d="M1184 945 L1272 938 L1292 1062 L1176 1072 Z"
        fill={COLOR.rosa}
        opacity={0.9}
        style={{ clipPath: `inset(0 ${100 - relleno * 100}% 0 0)` }}
      />
      {/* Westside: superficie proyectada (solo contorno) */}
      <path
        d="M962 1130 L900 1150 L888 1228 L966 1238 Z"
        fill="url(#proyectado)"
        stroke="white"
        strokeWidth={5}
        strokeDasharray="12 8"
        opacity={westside}
      />
      {/* Crinavis: rellenos portuarios históricos */}
      <path d="M770 505 L860 512 L868 590 L782 598 Z" fill="#9AA6BF" stroke="white" strokeWidth={3} opacity={crinavis} />
      {/* Atunara: puerto existente (dique) */}
      <path d="M1268 560 L1325 548 L1340 600 L1318 632" stroke="white" strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.35 + atunara * 0.65} />

      {/* Enlace Eastside → Atunara */}
      <line
        x1={e.x}
        y1={e.y}
        x2={e.x + (a.x - e.x) * enlaceAtunara}
        y2={e.y + (a.y - e.y) * enlaceAtunara}
        stroke={COLOR.lima}
        strokeWidth={6}
        strokeDasharray="16 12"
      />

      {/* Puntos */}
      {(Object.keys(PUNTOS) as (keyof typeof PUNTOS)[]).map((k, i) => {
        const p = PUNTOS[k];
        const v = interpolate(puntos * 4 - i, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
        const activo = destacado === null || destacado === k;
        return (
          <g key={k} opacity={v * (activo ? 1 : 0.35)} transform={`translate(${p.x} ${p.y}) scale(${0.5 + v * 0.5})`}>
            {destacado === k ? <circle r={34 + pulso * 26} fill={COLOR.lima} opacity={0.25 * (1 - pulso)} /> : null}
            <circle r={20} fill={COLOR.lima} stroke={COLOR.negro} strokeWidth={5} />
          </g>
        );
      })}
    </svg>
  );
};

type Toma = { readonly t: number; readonly x: number; readonly y: number; readonly s: number };

/** Interpola la cámara entre tomas (t en frames absolutos). */
export const camara = (frame: number, tomas: readonly Toma[]) => {
  const ts = tomas.map((k) => k.t);
  const op = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, easing: Easing.bezier(0.65, 0, 0.35, 1) };
  return {
    x: interpolate(frame, ts, tomas.map((k) => k.x), op),
    y: interpolate(frame, ts, tomas.map((k) => k.y), op),
    s: interpolate(frame, ts, tomas.map((k) => k.s), op),
  };
};
