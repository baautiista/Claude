import { interpolate } from "remotion";
import { COLOR, FUENTE } from "../marca/marca";

const ASFALTO = "#2A2E35";
const MANZANA = "rgba(255,255,255,0.13)";
const ANCHO_CALLE = 72;
const Y = 400;

const Calle: React.FC<{
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly progreso?: number;
  readonly discontinua?: boolean;
}> = ({ x1, y1, x2, y2, progreso = 1, discontinua = true }) => {
  const x = x1 + (x2 - x1) * progreso;
  const y = y1 + (y2 - y1) * progreso;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x} y2={y} stroke={ASFALTO} strokeWidth={ANCHO_CALLE} />
      {discontinua ? (
        <line
          x1={x1}
          y1={y1}
          x2={x}
          y2={y}
          stroke="rgba(255,255,255,0.7)"
          strokeWidth={4}
          strokeDasharray="22 18"
        />
      ) : null}
    </g>
  );
};

const NombreCalle: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly vertical?: boolean;
  readonly children: string;
  readonly opacidad: number;
}> = ({ x, y, vertical = false, children, opacidad }) => (
  <text
    x={x}
    y={y}
    textAnchor="middle"
    dominantBaseline="central"
    transform={vertical ? `rotate(-90 ${x} ${y})` : undefined}
    fontFamily={FUENTE.texto}
    fontWeight={700}
    fontSize={28}
    fill={COLOR.blanco}
    opacity={opacidad}
    stroke={ASFALTO}
    strokeWidth={8}
    paintOrder="stroke"
  >
    {children}
  </text>
);

/**
 * Esquema de un tramo de calle cortado por una parcela.
 * Calle izquierda y derecha alineadas; en medio, el obstáculo (rosa).
 * Opcionalmente, dos calles verticales que delimitan el obstáculo.
 */
export const PlanoTramo: React.FC<{
  readonly izquierda: string;
  readonly derecha: string;
  readonly verticales?: readonly [string, string];
  readonly obstaculo: string;
  /** x inicial y final del hueco ocupado por el obstáculo. */
  readonly hueco: readonly [number, number];
  /** 0→1 progresos de animación. */
  readonly calles: number;
  readonly bloque: number;
  readonly demolicion?: number;
  readonly conexion?: number;
  readonly obra?: boolean;
}> = ({ izquierda, derecha, verticales, obstaculo, hueco, calles, bloque, demolicion = 0, conexion = 0, obra = false }) => {
  const [a, b] = hueco;
  const nombres = interpolate(calles, [0.6, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const piezas = [0, 1, 2, 3, 4, 5];
  return (
    <svg viewBox="0 0 1000 800" width="100%" height="100%">
      <defs>
        <pattern id="rayas" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="14" height="28" fill={COLOR.lima} />
          <rect x="14" width="14" height="28" fill={COLOR.negro} />
        </pattern>
      </defs>
      {/* Manzanas */}
      {[
        [20, 40, a - 60, 300],
        [b + 40, 40, 980 - b - 40, 300],
        [20, 470, a - 60, 290],
        [b + 40, 470, 980 - b - 40, 290],
        [a + 40, 40, b - a - 80, 290],
        [a + 40, 480, b - a - 80, 280],
      ].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx={14} fill={MANZANA} opacity={calles} />
      ))}

      {/* Calles */}
      <Calle x1={0} y1={Y} x2={a} y2={Y} progreso={calles} />
      <Calle x1={1000} y1={Y} x2={b} y2={Y} progreso={calles} />
      {verticales ? (
        <>
          <Calle x1={a} y1={0} x2={a} y2={800} progreso={calles} discontinua={false} />
          <Calle x1={b} y1={800} x2={b} y2={0} progreso={calles} discontinua={false} />
        </>
      ) : null}

      {/* Prolongación prevista (discontinua lima) */}
      <line
        x1={a}
        y1={Y}
        x2={b}
        y2={Y}
        stroke={COLOR.lima}
        strokeWidth={6}
        strokeDasharray="14 12"
        opacity={bloque * (1 - conexion)}
      />

      {/* Obstáculo */}
      {piezas.map((i) => {
        const col = i % 3;
        const fila = Math.floor(i / 3);
        const w = (b - a - 40) / 3;
        const x = a + 20 + col * w;
        const y = Y - 70 + fila * 70;
        const caida = demolicion * (60 + i * 25);
        return (
          <rect
            key={i}
            x={x + 3}
            y={y + 3 + caida}
            width={w - 6}
            height={64}
            rx={6}
            fill={obra ? "url(#rayas)" : COLOR.rosa}
            opacity={bloque * (1 - demolicion)}
            transform={`rotate(${demolicion * (i % 2 ? 18 : -14)} ${x + w / 2} ${y + 32 + caida})`}
          />
        );
      })}

      {/* Nueva conexión */}
      <line x1={a} y1={Y} x2={a + (b - a) * conexion} y2={Y} stroke={ASFALTO} strokeWidth={ANCHO_CALLE} />
      <line
        x1={a}
        y1={Y}
        x2={a + (b - a) * conexion}
        y2={Y}
        stroke={COLOR.lima}
        strokeWidth={10}
        opacity={conexion > 0 ? 1 : 0}
      />

      {/* Nombres */}
      <NombreCalle x={a / 2} y={Y} opacidad={nombres}>
        {izquierda}
      </NombreCalle>
      <NombreCalle x={(1000 + b) / 2} y={Y} opacidad={nombres}>
        {derecha}
      </NombreCalle>
      {verticales ? (
        <>
          <NombreCalle x={a} y={640} vertical opacidad={nombres}>
            {verticales[0]}
          </NombreCalle>
          <NombreCalle x={b} y={640} vertical opacidad={nombres}>
            {verticales[1]}
          </NombreCalle>
        </>
      ) : null}
      <text
        x={(a + b) / 2}
        y={Y - 110}
        textAnchor="middle"
        fontFamily={FUENTE.rotulo}
        fontWeight={700}
        fontSize={32}
        fill={COLOR.blanco}
        opacity={bloque * (1 - demolicion)}
      >
        {obstaculo}
      </text>
    </svg>
  );
};

/** Plano general esquemático con dos puntos numerados que parpadean. */
export const PlanoGeneral: React.FC<{
  readonly lineas: number;
  readonly puntos: number;
  readonly frame: number;
}> = ({ lineas, puntos, frame }) => {
  const calles: [number, number, number, number][] = [
    [0, 180, 1000, 230], [0, 420, 1000, 400], [0, 640, 1000, 690], [0, 880, 1000, 860],
    [160, 0, 210, 1040], [420, 0, 400, 1040], [650, 0, 700, 1040], [880, 0, 860, 1040],
    [0, 1000, 1000, 760],
  ];
  const pulso = (fase: number) => 0.5 + 0.5 * Math.sin(frame / 6 + fase);
  const punto = (x: number, y: number, n: string, nombre: string, fase: number) => (
    <g opacity={puntos} transform={`translate(${x} ${y}) scale(${0.4 + puntos * 0.6})`}>
      <circle r={70 + pulso(fase) * 30} fill={COLOR.lima} opacity={0.25 * (1 - pulso(fase))} />
      <circle r={46} fill={COLOR.lima} />
      <text textAnchor="middle" dominantBaseline="central" fontFamily={FUENTE.display} fontWeight={800} fontSize={52} fill={COLOR.negro}>
        {n}
      </text>
      <text
        y={100}
        textAnchor="middle"
        fontFamily={FUENTE.rotulo}
        fontWeight={700}
        fontSize={38}
        fill={COLOR.blanco}
      >
        {nombre}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 1000 1040" width="100%" height="100%">
      {calles.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x1 + (x2 - x1) * lineas}
          y2={y1 + (y2 - y1) * lineas}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={i === 8 ? 26 : 14}
          strokeLinecap="round"
        />
      ))}
      {punto(300, 300, "1", "Santa Filomena", 0)}
      {punto(760, 760, "2", "Calle Colón", 2)}
    </svg>
  );
};
