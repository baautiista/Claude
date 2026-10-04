import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { MOMENTOS } from "../config";
import { COLORES, FUENTES, ZONA_SEGURA } from "../estilo";
import { Capitulo, EscenaBase, entrada, suave } from "../comun";
import { Fondo } from "../Fondo";
import { frameEnEscena } from "../tiempos";

export const Curiosidad: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const impacto = frameEnEscena(MOMENTOS.impactoVictoria);

  const golpe = entrada(frame, impacto, 0.5 * fps, 11);
  const desdeImpacto = frame - impacto;
  const sacudida = desdeImpacto >= 0 && desdeImpacto < 12 ? (12 - desdeImpacto) * 2.2 : 0;
  const dx = (random(`x${frame}`) - 0.5) * 2 * sacudida;
  const dy = (random(`y${frame}`) - 0.5) * 2 * sacudida;

  return (
    <EscenaBase>
      <Fondo />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 45%, rgba(232,87,58,${0.35 * golpe}) 0%, rgba(0,0,0,0) 60%)`,
        }}
      />
      <Capitulo>¿SABÍAS QUE…?</Capitulo>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingTop: ZONA_SEGURA.arriba + 200,
          paddingBottom: 720,
          paddingLeft: ZONA_SEGURA.lados,
          paddingRight: ZONA_SEGURA.lados,
          textAlign: "center",
          fontFamily: FUENTES.titulo,
          fontWeight: 900,
          translate: `${dx}px ${dy}px`,
        }}
      >
        <div
          style={{
            fontSize: 110,
            lineHeight: 1.05,
            color: COLORES.pergamino,
            opacity: suave(frame, 0.1 * fps, 0.6 * fps),
            translate: `0px ${(1 - entrada(frame, 0.1 * fps, 0.9 * fps)) * 60}px`,
          }}
        >
          ¿Sabías que pudo llamarse
        </div>
        <div
          style={{
            marginTop: 50,
            opacity: interpolate(frame, [impacto, impacto + 3], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            scale: interpolate(golpe, [0, 1], [3, 1]),
          }}
        >
          <div style={{ fontSize: 104, lineHeight: 1, color: COLORES.pergamino }}>
            «LA LÍNEA DE LA
          </div>
          <div
            style={{
              fontSize: 150,
              lineHeight: 1.05,
              color: COLORES.victoria,
              textShadow: "0 10px 50px rgba(232,87,58,0.55)",
            }}
          >
            VICTORIA»?
          </div>
        </div>
      </AbsoluteFill>
      {/* Destello del impacto */}
      <AbsoluteFill
        style={{
          backgroundColor: "white",
          opacity: interpolate(desdeImpacto, [0, 1, 8], [0, 0.7, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
    </EscenaBase>
  );
};
