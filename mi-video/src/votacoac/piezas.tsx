import { loadFont } from "@remotion/fonts";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FUENTES, V } from "./config";

/* Tipografías reales de votacoac.es (copias locales de @fontsource). */
for (const w of ["700", "800"]) {
  loadFont({ family: FUENTES.display, url: staticFile(`votacoac/fonts/BricolageGrotesque-${w}.woff2`), weight: w });
}
for (const w of ["500", "700", "800"]) {
  loadFont({ family: FUENTES.texto, url: staticFile(`votacoac/fonts/DMSans-${w}.woff2`), weight: w });
}

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Wordmark de la web: "vota" + "COAC" + ✦ (como .wordmark en globals.css). */
export const Wordmark: React.FC<{ readonly tam: number; readonly claro?: boolean; readonly giro?: number; readonly colorCoac?: string }> = ({ tam, claro = false, giro = 0, colorCoac }) => (
  <div style={{ display: "inline-flex", alignItems: "baseline", fontFamily: FUENTES.display, fontWeight: 800, fontSize: tam, lineHeight: 1, letterSpacing: "-0.05em", color: claro ? V.blanco : V.tinta, whiteSpace: "nowrap" }}>
    vota<span style={{ color: colorCoac ?? (claro ? V.azul : V.azulProfundo) }}>COAC</span>
    <i style={{ color: V.amarillo, fontStyle: "normal", alignSelf: "flex-start", marginLeft: tam * 0.12, fontSize: tam * 0.64, display: "inline-block", rotate: `${giro}deg` }}>✦</i>
  </div>
);

/** Guirnalda de la web: tira de cuatro colores (.festoon). */
export const Guirnalda: React.FC<{ readonly alto?: number }> = ({ alto = 14 }) => (
  <div style={{ height: alto, background: `linear-gradient(90deg, ${V.azul} 0 25%, ${V.amarillo} 25% 50%, ${V.rosa} 50% 75%, ${V.verde} 75%)` }} />
);

/** Etiqueta pequeña con ✦ (como .mini-label). */
export const MiniLabel: React.FC<{ readonly children: string; readonly tam?: number; readonly color?: string; readonly estrella?: string }> = ({
  children,
  tam = 26,
  color = V.tintaSuave,
  estrella = V.rosa,
}) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: tam * 0.6, fontFamily: FUENTES.texto, fontWeight: 800, fontSize: tam, letterSpacing: "0.14em", textTransform: "uppercase", color }}>
    <span style={{ color: estrella, letterSpacing: 0 }}>✦</span>
    {children}
  </div>
);

/** Partículas de colores de marca que flotan (fondo del gancho y del premio). */
export const Particulas: React.FC<{ readonly cantidad?: number; readonly colores?: readonly string[] }> = ({ cantidad = 46, colores = [V.azul, V.amarillo, V.rosa, V.verde, V.blanco] }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {Array.from({ length: cantidad }, (_, i) => {
        const r = (n: number) => {
          const x = Math.sin((i + 1) * 9301 + n * 49297) * 233280;
          return x - Math.floor(x);
        };
        const tam = 6 + r(1) * 16;
        const y = ((r(2) * 2100 - frame * (0.6 + r(3) * 1.8)) % 2100 + 2100) % 2100 - 90;
        const x = r(4) * 1080 + Math.sin(frame / 30 + i) * 14;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: tam, height: tam, borderRadius: tam / 2, backgroundColor: colores[i % colores.length], opacity: 0.25 + r(5) * 0.5, filter: r(6) > 0.7 ? "blur(3px)" : undefined }} />;
      })}
    </AbsoluteFill>
  );
};

/** Botón como .action-button (azul o amarillo) con pulsación opcional. */
export const Boton: React.FC<{ readonly children: React.ReactNode; readonly tam?: number; readonly fondo?: string; readonly color?: string; readonly pulsado?: number }> = ({
  children,
  tam = 34,
  fondo = V.azul,
  color = V.tinta,
  pulsado = 0,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      backgroundColor: fondo,
      color,
      fontFamily: FUENTES.texto,
      fontWeight: 800,
      fontSize: tam,
      padding: `${tam * 0.5}px ${tam * 0.9}px`,
      borderRadius: 999,
      boxShadow: "0 10px 26px -10px rgba(59,132,250,.55)",
      scale: interpolate(pulsado, [0, 0.5, 1], [1, 0.92, 1]),
    }}
  >
    {children}
    <svg width={tam * 0.8} height={tam * 0.8} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  </div>
);

/** Cursor de dedo/toque para las selecciones simuladas. */
export const Toque: React.FC<{ readonly x: number; readonly y: number; readonly pulso: number }> = ({ x, y, pulso }) => (
  <div style={{ position: "absolute", left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(23,19,68,0.18)", border: `4px solid ${V.tinta}`, scale: 1 - pulso * 0.25, boxShadow: `0 0 0 ${pulso * 26}px rgba(59,132,250,${0.35 * pulso})` }} />
);
