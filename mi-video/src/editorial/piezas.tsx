import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { COLOR, FUENTE, ZONA_SEGURA, existe } from "../marca/marca";
import { Placeholder } from "../marca/Placeholder";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Fotos reales (la primera que exista); si no hay ninguna, hueco con el nombre del archivo pendiente. */
export const FOTOS = {
  centroComercial: ["editorial/centro-comercial.jpg"],
  centro: ["editorial/centro.jpg", "plaza/actual-2.jpg"],
  comercios: ["editorial/comercios-centro.jpg", "plaza/actual-3.jpg"],
  eventos: ["editorial/eventos-centro.jpg", "plaza/actual-1.jpg"],
  arbol: ["editorial/arbol.jpg", "editorial/arbol-camaron.jpg"],
  arbolCamaron: ["editorial/arbol-camaron.jpg", "editorial/arbol.jpg"],
  drones: ["editorial/drones.jpg"],
} as const;

export type ClaveFoto = keyof typeof FOTOS;
export const fotoDe = (k: ClaveFoto) => FOTOS[k].find(existe) ?? null;

/** Foto a pantalla completa con cámara lenta; o hueco señalado si falta. */
export const Foto: React.FC<{ readonly k: ClaveFoto; readonly nombre: string; readonly zoom?: [number, number]; readonly oscurecer?: number }> = ({ k, nombre, zoom = [1.08, 1.2], oscurecer = 0.45 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const archivo = fotoDe(k);
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro }}>
      {archivo ? (
        <Img src={staticFile(archivo)} style={{ width: "100%", height: "100%", objectFit: "cover", scale: interpolate(frame, [0, durationInFrames], zoom) }} />
      ) : (
        <Placeholder nombre={nombre} archivo={FOTOS[k][0].split("/").pop()} />
      )}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(6,30,92,${oscurecer + 0.3}) 0%, rgba(6,30,92,${oscurecer * 0.4}) 38%, rgba(6,30,92,${oscurecer * 0.4}) 58%, rgba(6,30,92,${oscurecer + 0.35}) 100%)` }} />
      {archivo && k === "centroComercial" ? (
        <div style={{ position: "absolute", right: ZONA_SEGURA.lados, bottom: ZONA_SEGURA.abajo + 170, backgroundColor: "rgba(10,10,10,0.7)", color: COLOR.blanco, fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 24, padding: "4px 12px", borderRadius: 6 }}>Imagen del proyecto</div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Fondo azul (claro u oscuro) con retícula en movimiento. */
export const Azul: React.FC<{ readonly oscuro?: boolean; readonly negro?: boolean }> = ({ oscuro = false, negro = false }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: negro ? "#05070F" : oscuro ? COLOR.azulOscuro : COLOR.azul }}>
      <AbsoluteFill
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.06) 2px, transparent 2px)",
          backgroundSize: "90px 90px",
          backgroundPosition: `0px ${-frame * 0.7}px`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Titular por líneas con máscara; las que empiezan por * van en lima. */
export const Titulo: React.FC<{ readonly lineas: readonly string[]; readonly desde: number; readonly tam?: number; readonly centro?: boolean }> = ({ lineas, desde, tam = 110, centro = false }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: centro ? "center" : "flex-start" }}>
      {lineas.map((l, i) => {
        const p = entrada(frame, desde + i * 4, 13, 13);
        const lima = l.startsWith("*");
        return (
          <div key={l + i} style={{ overflow: "hidden", paddingBottom: tam * 0.06 }}>
            <div
              style={{
                fontFamily: FUENTE.display,
                fontWeight: 800,
                fontSize: tam,
                lineHeight: 0.98,
                letterSpacing: -tam * 0.035,
                color: lima ? COLOR.lima : COLOR.blanco,
                textAlign: centro ? "center" : "left",
                translate: `0px ${(1 - p) * 108}%`,
                filter: p < 0.9 ? `blur(${(1 - p) * 10}px)` : undefined,
                textShadow: "0 6px 30px rgba(0,0,0,0.35)",
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

/** Bloque en la zona útil superior. */
export const Arriba: React.FC<{ readonly children: React.ReactNode; readonly top?: number }> = ({ children, top = ZONA_SEGURA.arriba + 20 }) => (
  <div style={{ position: "absolute", top, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>{children}</div>
);

/** Muestra el contenido entre dos frames con fundido y deslizamiento. */
export const Tramo: React.FC<{ readonly desde: number; readonly hasta?: number; readonly children: React.ReactNode }> = ({ desde, hasta, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fin = hasta ?? durationInFrames + 10;
  if (frame < desde - 1 || frame > fin + 1) return null;
  const entra = suave(frame, desde, 8);
  const sale = suave(frame, fin - 6, 6);
  return <AbsoluteFill style={{ opacity: entra * (1 - sale), translate: `0px ${(1 - entra) * 40 - sale * 30}px` }}>{children}</AbsoluteFill>;
};

/**
 * Frase destacada a pantalla completa: caja blanca inclinada con texto azul oscuro, golpe de escala.
 * Para los mensajes clave del editorial.
 */
export const Destacado: React.FC<{ readonly lineas: readonly string[]; readonly desde: number; readonly tam?: number; readonly fondo?: string; readonly color?: string }> = ({
  lineas,
  desde,
  tam = 104,
  fondo = COLOR.blanco,
  color = COLOR.azulOscuro,
}) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 14, 10);
  const pulso = 1 + Math.max(0, Math.sin((frame - desde) / 8)) * 0.015;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 260 }}>
      <div style={{ rotate: "-3deg", scale: interpolate(p, [0, 1], [1.8, 1]) * pulso, opacity: Math.min(1, p * 2), display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        {lineas.map((l) => (
          <div key={l} style={{ backgroundColor: l.startsWith("*") ? COLOR.lima : fondo, color: l.startsWith("*") ? COLOR.negro : color, fontFamily: FUENTE.display, fontWeight: 800, fontSize: tam, lineHeight: 1, letterSpacing: -tam * 0.03, padding: `${tam * 0.12}px ${tam * 0.28}px ${tam * 0.18}px`, boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}>
            {l.replace("*", "")}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Tarjeta tipo "frase que se oye en la calle" (no son comentarios reales: resumen del guion). */
export const Bocadillo: React.FC<{ readonly texto: string; readonly desde: number; readonly lado: "izq" | "der" }> = ({ texto, desde, lado }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 14, 12);
  return (
    <div style={{ alignSelf: lado === "izq" ? "flex-start" : "flex-end", maxWidth: 820, backgroundColor: COLOR.blanco, color: COLOR.negro, borderRadius: 30, borderBottomLeftRadius: lado === "izq" ? 4 : 30, borderBottomRightRadius: lado === "der" ? 4 : 30, padding: "26px 34px", fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 48, lineHeight: 1.2, opacity: Math.min(1, p * 2), translate: `${(1 - p) * (lado === "izq" ? -200 : 200)}px 0px`, boxShadow: "0 18px 40px rgba(0,0,0,0.3)" }}>
      «{texto}»
    </div>
  );
};
