/** Icono de fortificación: torre almenada con muralla. viewBox 0 0 200 200. */
export const IconoFortificacion: React.FC<{
  readonly color: string;
  readonly size: number;
}> = ({ color, size }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      {/* Muralla */}
      <path
        d="M10 190 L10 130 L22 130 L22 118 L38 118 L38 130 L52 130 L52 118 L60 118 L60 190 Z"
        fill={color}
      />
      <path
        d="M140 190 L140 118 L148 118 L148 130 L162 130 L162 118 L178 118 L178 130 L190 130 L190 190 Z"
        fill={color}
      />
      {/* Torre */}
      <path
        d="M56 190 L56 70 L68 70 L68 50 L86 50 L86 70 L92 70 L92 50 L108 50 L108 70 L114 70 L114 50 L132 50 L132 70 L144 70 L144 190 Z"
        fill={color}
      />
      {/* Puerta */}
      <path d="M86 190 L86 150 Q100 132 114 150 L114 190 Z" fill="rgba(0,0,0,0.55)" />
      {/* Saeteras */}
      <rect x="95" y="90" width="10" height="26" rx="5" fill="rgba(0,0,0,0.55)" />
    </svg>
  );
};

/**
 * Icono sencillo y original de la Inmaculada: figura con manto,
 * corona de doce estrellas y media luna a los pies. viewBox 0 0 200 200.
 */
export const IconoInmaculada: React.FC<{
  readonly manto: string;
  readonly detalle: string;
  readonly size: number;
}> = ({ manto, detalle, size }) => {
  const estrellas = Array.from({ length: 12 }, (_, i) => {
    const angulo = Math.PI * (1.08 + (i / 11) * 0.84);
    return { x: 100 + Math.cos(angulo) * 42, y: 52 + Math.sin(angulo) * 42 };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      {estrellas.map((e, i) => (
        <circle key={i} cx={e.x} cy={e.y} r={3.6} fill={detalle} />
      ))}
      {/* Cabeza */}
      <circle cx="100" cy="46" r="14" fill={detalle} />
      {/* Manto */}
      <path d="M100 58 C74 66 66 112 62 168 L138 168 C134 112 126 66 100 58 Z" fill={manto} />
      {/* Manos juntas */}
      <path d="M100 86 L92 106 L108 106 Z" fill={detalle} />
      {/* Media luna */}
      <path d="M52 170 Q100 200 148 170 Q100 186 52 170 Z" fill={detalle} />
    </svg>
  );
};
