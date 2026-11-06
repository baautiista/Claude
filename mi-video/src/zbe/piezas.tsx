import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { COLOR, FUENTE, ZONA_SEGURA } from "../marca/marca";

/* Piezas gráficas del vídeo de la ZBE: fondos, titulares, tarjetas e iconos lineales. */

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Fondo azul con una retícula muy discreta que se desplaza despacio. */
export const FondoAzul: React.FC<{ readonly oscuro?: boolean }> = ({ oscuro = false }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: oscuro ? COLOR.azulOscuro : COLOR.azul }}>
      <AbsoluteFill
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.06) 2px, transparent 2px)",
          backgroundSize: "90px 90px",
          backgroundPosition: `0px ${-frame * 0.6}px`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Entrada de escena: sube ligeramente y aparece. */
export const Entrada: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const p = suave(frame, 0, 10);
  return <AbsoluteFill style={{ opacity: p, translate: `0px ${(1 - p) * 50}px` }}>{children}</AbsoluteFill>;
};

/** Titular de impacto: líneas que entran con máscara; las marcadas con * van en lima. */
export const Impacto: React.FC<{
  readonly lineas: readonly string[];
  readonly desde: number;
  readonly tamano?: number;
  readonly color?: string;
  readonly destacado?: string;
  readonly alinear?: "left" | "center";
}> = ({ lineas, desde, tamano = 110, color = COLOR.blanco, destacado = COLOR.lima, alinear = "left" }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: alinear === "center" ? "center" : "flex-start", gap: tamano * 0.06 }}>
      {lineas.map((l, i) => {
        const p = entrada(frame, desde + i * 4, 14);
        const lima = l.startsWith("*");
        return (
          <div key={l} style={{ overflow: "hidden", paddingBottom: tamano * 0.06 }}>
            <div
              style={{
                fontFamily: FUENTE.display,
                fontWeight: 800,
                fontSize: tamano,
                lineHeight: 0.98,
                letterSpacing: -tamano * 0.035,
                color: lima ? destacado : color,
                textAlign: alinear,
                translate: `0px ${(1 - p) * 110}%`,
              }}
            >
              {lima ? l.slice(1) : l}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Bloque de contenido centrado en la zona útil (entre la zona segura superior y los subtítulos). */
export const Zona: React.FC<{ readonly children: React.ReactNode; readonly top?: number; readonly style?: React.CSSProperties }> = ({ children, top = ZONA_SEGURA.arriba + 20, style }) => (
  <div style={{ position: "absolute", top, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, ...style }}>{children}</div>
);

/** Etiqueta de sección (caja blanca sobre azul). */
export const Seccion: React.FC<{ readonly children: string; readonly desde?: number; readonly fondo?: string; readonly color?: string }> = ({
  children,
  desde = 0,
  fondo = COLOR.blanco,
  color = COLOR.azul,
}) => {
  const frame = useCurrentFrame();
  const p = suave(frame, desde, 12);
  return (
    <div
      style={{
        display: "inline-block",
        backgroundColor: fondo,
        color,
        fontFamily: FUENTE.rotulo,
        fontWeight: 800,
        fontSize: 30,
        letterSpacing: 3,
        padding: "8px 18px 6px",
        borderRadius: 6,
        clipPath: `inset(0 ${100 - p * 100}% 0 0)`,
      }}
    >
      {children}
    </div>
  );
};

/** Muestra el contenido de `desde` a `hasta` con un fundido y deslizamiento corto. */
export const Fase: React.FC<{ readonly desde: number; readonly hasta?: number; readonly children: React.ReactNode }> = ({ desde, hasta, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fin = hasta ?? durationInFrames + 10;
  if (frame < desde - 1 || frame > fin + 1) return null;
  const entra = suave(frame, desde, 9);
  const sale = suave(frame, fin - 7, 7);
  return <AbsoluteFill style={{ opacity: entra * (1 - sale), translate: `0px ${(1 - entra) * 40 - sale * 40}px` }}>{children}</AbsoluteFill>;
};

/** Pantalla de mensaje: un titular contundente centrado. */
export const Mensaje: React.FC<{ readonly lineas: readonly string[]; readonly desde: number; readonly tamano?: number }> = ({ lineas, desde, tamano = 104 }) => (
  <AbsoluteFill style={{ justifyContent: "center", paddingLeft: ZONA_SEGURA.lados, paddingRight: ZONA_SEGURA.lados, paddingBottom: 260 }}>
    <Impacto lineas={lineas} desde={desde} tamano={tamano} />
  </AbsoluteFill>
);

/** Subrayado/resaltado lima que se extiende detrás de un texto. */
export const Resaltado: React.FC<{ readonly children: React.ReactNode; readonly progreso: number; readonly color?: string }> = ({ children, progreso, color = COLOR.lima }) => (
  <span
    style={{
      backgroundImage: `linear-gradient(${color}, ${color})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${progreso * 100}% 100%`,
      padding: "0 4px",
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
    }}
  >
    {children}
  </span>
);

/** Iconos lineales (24 × 24). */
export const ICONOS = {
  casa: <path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6" />,
  llave: <path d="M14 10a4 4 0 1 0-3.5 4l-6.5 6 2 2 1.5-1.5 1.5 1.5 1.5-1.5-1.5-1.5 2.5-2.5A4 4 0 0 0 14 10zM16 8h.01" />,
  tienda: <path d="M3 9l2-5h14l2 5M4 9v11h16V9M3 9h18M9 20v-6h6v6" />,
  camion: <path d="M2 6h11v10H2zM13 10h5l3 3v3h-8M6 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01" />,
  silla: <path d="M10 4a1.5 1.5 0 1 0 0 .01M10 7v6h6l2 6M10 10h5M8 11a6 6 0 1 0 7 7" />,
  cruz: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />,
  reloj: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 3" />,
  fabrica: <path d="M3 21V10l5 3V10l5 3V6h3l1-3h2l1 3v15zM7 17h2M12 17h2" />,
  ancla: <path d="M12 6a2 2 0 1 0 0-.01M12 8v13M5 13a7 7 0 0 0 14 0M8 11h8" />,
  avion: <path d="M2 13l8-1 5-8h2l-2 8 5 1 2-2h1l-1 3 1 3h-1l-2-2-5 1 2 8h-2l-5-8-8-1z" />,
  barco: <path d="M3 17l2 4h14l2-4zM6 17V9h12v8M9 9V5h6v4" />,
  documento: <path d="M6 2h9l5 5v15H6zM15 2v5h5M9 12h8M9 16h8" />,
  check: <path d="M4 12l5 5L20 6" />,
  equis: <path d="M5 5l14 14M19 5L5 19" />,
};

export const Icono: React.FC<{ readonly nombre: keyof typeof ICONOS; readonly tam?: number; readonly color?: string; readonly grosor?: number }> = ({
  nombre,
  tam = 48,
  color = COLOR.azul,
  grosor = 2,
}) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round">
    {ICONOS[nombre]}
  </svg>
);

/** Progreso de aparición escalonada (para listas). */
export const aparece = (frame: number, desde: number) => ({
  opacity: interpolate(frame, [desde, desde + 6], [0, 1], clamp),
  p: entrada(frame, desde, 14),
});
