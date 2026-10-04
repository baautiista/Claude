import type { Caption } from "@remotion/captions";
import { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORES, FUENTES, ZONA_SEGURA } from "./estilo";

type Pagina = {
  readonly inicioMs: number;
  readonly finMs: number;
  readonly palabras: Caption[];
};

const paginar = (captions: Caption[]): Pagina[] => {
  const paginas: Pagina[] = [];
  let actual: Caption[] = [];
  for (const c of captions) {
    actual.push(c);
    if (c.pageBreakAfter) {
      paginas.push({
        inicioMs: actual[0].startMs,
        finMs: actual[actual.length - 1].endMs,
        palabras: actual,
      });
      actual = [];
    }
  }
  if (actual.length > 0) {
    paginas.push({
      inicioMs: actual[0].startMs,
      finMs: actual[actual.length - 1].endMs,
      palabras: actual,
    });
  }
  return paginas;
};

/** Subtítulos palabra a palabra: la palabra que se está diciendo se resalta. */
export const Subtitulos: React.FC<{ readonly captions: Caption[] }> = ({
  captions,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const paginas = useMemo(() => paginar(captions), [captions]);
  const ms = (frame / fps) * 1000;

  const indice = paginas.findIndex((p, i) => {
    const siguiente = paginas[i + 1];
    const fin = siguiente ? Math.min(siguiente.inicioMs, p.finMs + 400) : p.finMs + 400;
    return ms >= p.inicioMs && ms < fin;
  });
  if (indice === -1) {
    return null;
  }
  const pagina = paginas[indice];
  const desdeInicio = frame - (pagina.inicioMs / 1000) * fps;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: ZONA_SEGURA.abajo + 170,
        paddingLeft: ZONA_SEGURA.lados,
        paddingRight: ZONA_SEGURA.lados,
      }}
    >
      <div
        style={{
          fontFamily: FUENTES.texto,
          fontWeight: 900,
          fontSize: 58,
          lineHeight: 1.18,
          textAlign: "center",
          color: "white",
          backgroundColor: "rgba(12, 9, 6, 0.72)",
          padding: "18px 30px",
          borderRadius: 18,
          maxWidth: 920,
          textShadow: "0 3px 10px rgba(0,0,0,0.6)",
          scale: interpolate(desdeInicio, [0, 6], [0.92, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          opacity: interpolate(desdeInicio, [0, 4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {pagina.palabras.map((p, i) => {
          const activa = ms >= p.startMs && ms < p.endMs;
          const dicha = ms >= p.startMs;
          return (
            <span
              key={i}
              style={{
                color: activa ? COLORES.oro : "white",
                opacity: dicha ? 1 : 0.6,
                whiteSpace: "pre",
              }}
            >
              {p.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
