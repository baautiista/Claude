/**
 * Silueta simplificada del Peñón de Gibraltar visto desde el norte
 * (cara norte casi vertical a la izquierda, ladera suave hacia la derecha).
 * viewBox 0 0 1000 400.
 */
export const PENON_PATH =
  "M0 400 L70 400 L92 352 L110 300 L128 236 L148 170 L170 112 L196 66 L222 40 L240 34 L262 46 L296 76 L340 100 L392 116 L440 116 L470 106 L492 112 L530 136 L590 168 L660 204 L740 244 L820 284 L900 318 L1000 344 L1000 400 Z";

export const Penon: React.FC<{
  readonly color: string;
  readonly style?: React.CSSProperties;
}> = ({ color, style }) => {
  return (
    <svg viewBox="0 0 1000 400" style={style} preserveAspectRatio="xMidYMax meet">
      <path d={PENON_PATH} fill={color} />
    </svg>
  );
};
