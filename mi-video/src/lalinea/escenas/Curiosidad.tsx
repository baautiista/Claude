import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { MOMENTOS } from "../config";
import { beatsDeEscena, frameEnEscena } from "../tiempos";

export const Curiosidad: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const impacto = frameEnEscena(MOMENTOS.impactoVictoria);
  const [, propuestas] = beatsDeEscena("curiosidad");
  const hueco = suave(frame, propuestas, 0.5 * fps);
  const pulso = 0.55 + 0.45 * Math.abs(Math.sin(frame / 7));
  const antes = frame < impacto;

  const azul = suave(frame, impacto - 3, 6);
  const golpe = entrada(frame, impacto, 0.4 * fps);
  const etiqueta = entrada(frame, impacto + 0.6 * fps, 0.4 * fps, 14);

  return (
    <Escena fondo="oscuro">
      {/* Capa azul de marca en el momento clave */}
      <AbsoluteFill
        style={{ backgroundColor: COLOR.azul, clipPath: `inset(${100 - azul * 100}% 0 0 0)` }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          paddingLeft: ZONA_SEGURA.lados,
          paddingRight: ZONA_SEGURA.lados,
          paddingTop: ZONA_SEGURA.arriba,
          paddingBottom: 640,
        }}
      >
        <div
          style={{
            fontFamily: FUENTE.rotulo,
            fontWeight: 700,
            fontSize: 34,
            letterSpacing: 4,
            color: azul > 0.5 ? COLOR.blanco : COLOR.lima,
            opacity: suave(frame, 0, 10),
          }}
        >
          ¿SABÍAS QUE…?
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: FUENTE.display,
            fontWeight: 700,
            fontSize: 92,
            lineHeight: 1.02,
            letterSpacing: -2,
            color: COLOR.blanco,
            opacity: suave(frame, 3, 10),
            translate: `0px ${(1 - suave(frame, 3, 14)) * 30}px`,
          }}
        >
          …pudo llamarse
        </div>
        <div
          style={{
            marginTop: 20,
            fontFamily: FUENTE.display,
            fontWeight: 800,
            color: COLOR.blanco,
            lineHeight: 0.98,
            letterSpacing: -3,
          }}
        >
          <div
            style={{
              fontSize: 104,
              opacity: hueco,
              translate: `0px ${(1 - hueco) * 30}px`,
            }}
          >
            La Línea de la
          </div>
          {antes ? (
            <div
              style={{
                marginTop: 18,
                width: 640,
                height: 170,
                borderRadius: 18,
                border: `6px dashed ${COLOR.lima}`,
                opacity: hueco * pulso,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 120,
                color: COLOR.lima,
              }}
            >
              ?
            </div>
          ) : (
            <div
              style={{
                fontSize: 200,
                color: COLOR.lima,
                scale: interpolate(golpe, [0, 1], [1.25, 1]),
                transformOrigin: "0% 50%",
              }}
            >
              Victoria
            </div>
          )}
        </div>
        <div
          style={{
            marginTop: 30,
            alignSelf: "flex-start",
            backgroundColor: COLOR.blanco,
            color: COLOR.rosa,
            fontFamily: FUENTE.rotulo,
            fontWeight: 700,
            fontSize: 38,
            padding: "8px 20px",
            borderRadius: 8,
            opacity: etiqueta,
            translate: `${(1 - etiqueta) * -40}px 0px`,
          }}
        >
          Propuesta que no prosperó
        </div>
      </AbsoluteFill>
    </Escena>
  );
};
