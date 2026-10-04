import type { Caption } from "@remotion/captions";
import { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FUENTE, ZONA_SEGURA } from "./marca";

type Pagina = { readonly inicioMs: number; readonly finMs: number; readonly palabras: Caption[] };

const paginar = (captions: Caption[]): Pagina[] => {
  const paginas: Pagina[] = [];
  let actual: Caption[] = [];
  const cerrar = () => {
    if (actual.length === 0) return;
    paginas.push({
      inicioMs: actual[0].startMs,
      finMs: actual[actual.length - 1].endMs,
      palabras: actual,
    });
    actual = [];
  };
  for (const c of captions) {
    actual.push(c);
    if (c.pageBreakAfter) cerrar();
  }
  cerrar();
  return paginas;
};

/**
 * Subtítulos InfoLinense: bloque oscuro compacto, Inter, palabra activa en lima.
 * `elevacion` sube el bloque (p. ej. cuando hay una línea de tiempo debajo).
 */
export const Subtitulos: React.FC<{ readonly captions: Caption[]; readonly elevacion?: number }> = ({
  captions,
  elevacion = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const paginas = useMemo(() => paginar(captions), [captions]);
  const ms = (frame / fps) * 1000;
  const indice = paginas.findIndex((p, i) => {
    const sig = paginas[i + 1];
    const fin = sig ? Math.min(sig.inicioMs, p.finMs + 400) : p.finMs + 400;
    return ms >= p.inicioMs && ms < fin;
  });
  if (indice === -1) return null;
  const pagina = paginas[indice];
  const desde = frame - (pagina.inicioMs / 1000) * fps;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: ZONA_SEGURA.abajo + 30 + elevacion,
        paddingLeft: ZONA_SEGURA.lados,
        paddingRight: ZONA_SEGURA.lados,
      }}
    >
      <div
        style={{
          fontFamily: FUENTE.texto,
          fontWeight: 800,
          fontSize: 54,
          lineHeight: 1.2,
          textAlign: "center",
          color: COLOR.blanco,
          backgroundColor: "rgba(10,10,10,0.82)",
          padding: "14px 26px",
          borderRadius: 14,
          maxWidth: 900,
          opacity: interpolate(desde, [0, 3], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          translate: `0px ${interpolate(desde, [0, 5], [10, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}px`,
        }}
      >
        {pagina.palabras.map((p, i) => (
          <span
            key={i}
            style={{
              whiteSpace: "pre",
              color: ms >= p.startMs && ms < p.endMs ? COLOR.lima : COLOR.blanco,
              opacity: ms >= p.startMs ? 1 : 0.55,
            }}
          >
            {p.text}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
