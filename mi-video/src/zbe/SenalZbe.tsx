import { COLOR } from "../marca/marca";

/**
 * Señal de la ZBE de La Línea redibujada en vectorial (a partir de la señal municipal):
 * marco turquesa "Zonas de Bien Estar", ZBE, coche con emisiones en círculo rojo y "EXCEPTO AUTORIZADOS".
 * Sin el escudo municipal. Lienzo 1066 × 1600.
 */
const TURQUESA = "#1BA0C2";
const ROJO = "#D3222D";

export const SenalZbe: React.FC<{ readonly alto: number; readonly progreso?: number }> = ({ alto, progreso = 1 }) => {
  const puntos = [
    [732, 694], [775, 694], [642, 742], [686, 742], [732, 742], [775, 742], [642, 792], [686, 792], [730, 790], [642, 842], [684, 838], [610, 874],
  ];
  return (
    <svg viewBox="0 0 1066 1600" height={alto} style={{ display: "block" }}>
      <rect width={1066} height={1600} rx={30} fill={TURQUESA} />
      <text x={66} y={110} fontFamily="Inter" fontWeight={800} fontStyle="italic" fontSize={46} fill="white">
        Ayuntamiento
      </text>
      <text x={66} y={160} fontFamily="Inter" fontWeight={800} fontStyle="italic" fontSize={46} fill="white">
        de La Línea
      </text>
      <text x={1010} y={128} textAnchor="end" fontFamily="Inter" fontWeight={800} fontSize={58} fill="white">
        Zonas de Bien Estar
      </text>
      <rect x={30} y={182} width={1006} height={1072} rx={18} fill={COLOR.blanco} />
      <text x={533} y={352} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={200} fill="#1A1A1A">
        ZBE
      </text>
      <circle cx={533} cy={808} r={378} fill="none" stroke={ROJO} strokeWidth={104} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - progreso} transform="rotate(-90 533 808)" />
      {/* Coche de frente */}
      <path
        d="M318 705 H520 Q532 705 538 718 L556 760 Q576 764 576 790 V858 Q576 866 566 866 H560 V912 Q560 922 550 922 H518 Q508 922 508 912 V866 H338 V912 Q338 922 328 922 H296 Q286 922 286 912 V866 H280 Q270 866 270 858 V790 Q270 764 290 760 L308 718 Q312 705 318 705 Z M324 720 L306 760 H540 L522 720 Z"
        fill="#1A1A1A"
        fillRule="evenodd"
      />
      <circle cx={312} cy={813} r={19} fill="white" />
      <circle cx={533} cy={813} r={19} fill="white" />
      {puntos.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={13} fill="#1A1A1A" />
      ))}
      <rect x={30} y={1282} width={1006} height={290} rx={18} fill={COLOR.blanco} />
      <text x={533} y={1408} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={118} fill="#1A1A1A">
        EXCEPTO
      </text>
      <text x={533} y={1530} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={118} fill="#1A1A1A">
        AUTORIZADOS
      </text>
    </svg>
  );
};
