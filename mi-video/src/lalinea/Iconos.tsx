/** Iconos lineales del sistema InfoLinense (trazo grueso, puntas redondeadas). */

export const IconoFortificacion: React.FC<{ readonly color: string; readonly size: number }> = ({
  color,
  size,
}) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
    <path
      d="M14 104 V64 H24 V56 H34 V64 H40 V104 M80 104 V64 H86 V56 H96 V64 H106 V104 M40 104 V34 H48 V24 H58 V34 H62 V24 H72 V34 H80 V104 M8 104 H112 M52 104 V86 A8 8 0 0 1 68 86 V104"
      stroke={color}
      strokeWidth={6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Icono sencillo y original de la Inmaculada: corona de 12 estrellas, figura y media luna. */
export const IconoInmaculada: React.FC<{ readonly color: string; readonly size: number }> = ({
  color,
  size,
}) => {
  const estrellas = Array.from({ length: 12 }, (_, i) => {
    const a = Math.PI * (1.1 + (i / 11) * 0.8);
    return { x: 60 + Math.cos(a) * 30, y: 36 + Math.sin(a) * 30 };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {estrellas.map((e, i) => (
        <circle key={i} cx={e.x} cy={e.y} r={2.6} fill={color} />
      ))}
      <circle cx="60" cy="32" r="9" stroke={color} strokeWidth={6} />
      <path
        d="M60 44 C46 50 42 74 40 98 H80 C78 74 74 50 60 44 Z"
        stroke={color}
        strokeWidth={6}
        strokeLinejoin="round"
      />
      <path d="M30 104 Q60 118 90 104" stroke={color} strokeWidth={6} strokeLinecap="round" />
    </svg>
  );
};
