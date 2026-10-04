import { COLOR, FUENTE } from "../marca/marca";

/**
 * Mapa esquemático del istmo (norte arriba): La Línea al norte, Gibraltar al sur,
 * bahía al oeste y Mediterráneo al este. Monocromo, con el protagonista en azul.
 */
const TIERRA =
  "M0 0 L1080 0 L1080 470 C1010 540 920 600 880 690 L850 900 C830 1050 800 1300 740 1560 C720 1640 690 1700 660 1720 C630 1700 600 1600 580 1450 C565 1300 540 1100 500 960 C460 820 400 690 320 600 C230 520 120 470 0 450 Z";
const PENON =
  "M640 990 C700 1010 760 1150 760 1300 C750 1450 700 1560 670 1600 C640 1450 610 1220 640 990 Z";

/** Posiciones de la línea de fortificaciones (y = 800 en el istmo). */
const LINEA_Y = 800;
const OESTE = 452;
const ESTE = 866;

const CASAS = [
  [600, 690], [640, 700], [690, 686], [735, 702], [620, 735], [670, 740], [720, 738], [770, 728],
  [585, 650], [650, 655], [705, 648], [760, 662], [800, 690], [560, 700],
];

export const MapaIstmo: React.FC<{
  /** 0→1: la línea de fortificaciones se dibuja. */
  readonly linea: number;
  /** 0→1: aparecen los fuertes y sus nombres. */
  readonly fuertes: number;
  /** 0→1: crece el núcleo de población. */
  readonly nucleo: number;
  /** Opacidad de los rótulos geográficos (se ocultan al hacer zoom). */
  readonly rotulos?: number;
}> = ({ linea, fuertes, nucleo, rotulos = 1 }) => {
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <clipPath id="tierra">
          <path d={TIERRA} />
        </clipPath>
      </defs>
      <rect width={1080} height={1920} fill="#D3DAE3" />
      <path d={TIERRA} fill={COLOR.blanco} stroke="#C5CBD4" strokeWidth={3} />
      <path d={PENON} fill="#E9ECF1" stroke="#C5CBD4" strokeWidth={2} strokeDasharray="6 6" />

      {/* Rótulos geográficos discretos */}
      <g fontFamily={FUENTE.texto} fill="#7D8592" fontSize={30} fontWeight={500} opacity={rotulos}>
        <text x={190} y={1020} textAnchor="middle">
          Bahía de
        </text>
        <text x={190} y={1058} textAnchor="middle">
          Algeciras
        </text>
        <text x={975} y={1140} textAnchor="middle">
          Mar
        </text>
        <text x={975} y={1176} textAnchor="middle">
          Mediterráneo
        </text>
      </g>
      <text
        x={690}
        y={1250}
        textAnchor="middle"
        fontFamily={FUENTE.rotulo}
        fontWeight={700}
        fontSize={38}
        letterSpacing={4}
        fill={COLOR.grisOscuro}
        opacity={rotulos}
      >
        GIBRALTAR
      </text>

      {/* Núcleo de población */}
      {CASAS.map(([x, y], i) => {
        const p = Math.min(1, Math.max(0, nucleo * CASAS.length - i));
        return (
          <rect
            key={i}
            x={x - 13 * p}
            y={y - 13 * p}
            width={26 * p}
            height={26 * p}
            rx={5}
            fill={COLOR.grisOscuro}
            opacity={0.85}
          />
        );
      })}

      {/* Línea de fortificaciones */}
      <g clipPath="url(#tierra)">
        <line
          x1={OESTE - 40}
          y1={LINEA_Y}
          x2={OESTE - 40 + (ESTE - OESTE + 80) * linea}
          y2={LINEA_Y}
          stroke={COLOR.azul}
          strokeWidth={14}
          strokeLinecap="round"
        />
      </g>
      {[OESTE, ESTE].map((x) => (
        <g key={x} opacity={fuertes} transform={`translate(${x} ${LINEA_Y}) scale(${0.6 + fuertes * 0.4})`}>
          <rect x={-22} y={-22} width={44} height={44} rx={6} fill={COLOR.azul} transform="rotate(45)" />
          <rect x={-9} y={-9} width={18} height={18} rx={3} fill={COLOR.blanco} transform="rotate(45)" />
        </g>
      ))}
      <g
        fontFamily={FUENTE.texto}
        fontWeight={700}
        fontSize={28}
        fill={COLOR.negro}
        opacity={fuertes}
      >
        <text x={OESTE - 30} y={LINEA_Y + 70} textAnchor="middle">
          Fuerte de
        </text>
        <text x={OESTE - 30} y={LINEA_Y + 104} textAnchor="middle">
          San Felipe
        </text>
        <text x={ESTE - 10} y={LINEA_Y + 70} textAnchor="middle">
          Fuerte de
        </text>
        <text x={ESTE - 10} y={LINEA_Y + 104} textAnchor="middle">
          Santa Bárbara
        </text>
      </g>
    </svg>
  );
};

export const MAPA = { LINEA_Y, OESTE, ESTE } as const;
