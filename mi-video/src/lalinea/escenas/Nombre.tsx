import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { MOMENTOS } from "../config";
import { beatsDeEscena, frameEnEscena } from "../tiempos";

const Palabra: React.FC<{
  readonly children: string;
  readonly progreso: number;
  readonly color?: string;
}> = ({ children, progreso, color = COLOR.negro }) => (
  <span style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: 8 }}>
    <span
      style={{
        display: "inline-block",
        color,
        translate: `0px ${(1 - progreso) * 110}%`,
      }}
    >
      {children}
    </span>
  </span>
);

export const Nombre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [, , devocion] = beatsDeEscena("nombre");
  const escritura = frameEnEscena(MOMENTOS.escrituraNombre);
  const sello = frameEnEscena(MOMENTOS.selloAprobado);

  const palabra = (i: number) => suave(frame, escritura + i * 0.22 * fps, 0.45 * fps);
  const aprobado = entrada(frame, sello, 0.5 * fps, 13);
  const resaltar = suave(frame, devocion, 0.5 * fps);
  const subrayado = suave(frame, devocion + 0.2 * fps, 0.6 * fps);
  const explicacion = suave(frame, devocion + 0.5 * fps, 0.5 * fps);

  return (
    <Escena fondo="claro">
      <AbsoluteFill
        style={{
          paddingTop: ZONA_SEGURA.arriba + 40,
          paddingLeft: ZONA_SEGURA.lados,
          paddingRight: ZONA_SEGURA.lados,
        }}
      >
        <div
          style={{
            fontFamily: FUENTE.rotulo,
            fontWeight: 600,
            fontSize: 34,
            letterSpacing: 3,
            color: COLOR.grisOscuro,
            opacity: suave(frame, 0, 10),
          }}
        >
          PLENO · 30 DE JULIO DE 1870
        </div>
        <div style={{ marginTop: 18, height: 4, width: 120, backgroundColor: COLOR.azul, scale: `${suave(frame, 4, 14)} 1`, transformOrigin: "0 50%" }} />

        <div
          style={{
            marginTop: 70,
            fontFamily: FUENTE.display,
            fontWeight: 800,
            fontSize: 132,
            lineHeight: 1.0,
            letterSpacing: -4,
          }}
        >
          <div>
            <Palabra progreso={palabra(0)}>La</Palabra> <Palabra progreso={palabra(1)}>Línea</Palabra>
          </div>
          <div>
            <Palabra progreso={palabra(2)}>de</Palabra> <Palabra progreso={palabra(3)}>la</Palabra>
          </div>
          <div style={{ position: "relative", display: "inline-block" }}>
            <Palabra
              progreso={palabra(4)}
              color={resaltar > 0.5 ? COLOR.azul : COLOR.negro}
            >
              Concepción
            </Palabra>
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: -6,
                height: 16,
                borderRadius: 8,
                width: `${subrayado * 100}%`,
                backgroundColor: COLOR.lima,
              }}
            />
          </div>
        </div>

        {/* Aprobado por unanimidad */}
        <div
          style={{
            marginTop: 56,
            display: "inline-flex",
            alignSelf: "flex-start",
            alignItems: "center",
            gap: 18,
            backgroundColor: COLOR.azul,
            color: COLOR.blanco,
            padding: "14px 28px 14px 18px",
            borderRadius: 12,
            opacity: interpolate(frame, [sello, sello + 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            scale: interpolate(aprobado, [0, 1], [1.25, 1]),
            transformOrigin: "0% 50%",
            fontFamily: FUENTE.display,
            fontWeight: 700,
            fontSize: 46,
          }}
        >
          <svg width={52} height={52} viewBox="0 0 52 52">
            <circle cx={26} cy={26} r={26} fill={COLOR.lima} />
            <path d="M15 27 L23 35 L38 18" stroke={COLOR.negro} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Aprobado por unanimidad
        </div>

        {/* Concepción = Inmaculada */}
        <div
          style={{
            marginTop: 40,
            opacity: explicacion,
            translate: `0px ${(1 - explicacion) * 24}px`,
          }}
        >
          <div style={{ fontFamily: FUENTE.display, fontWeight: 700, fontSize: 52, color: COLOR.negro }}>
            <span style={{ color: COLOR.azul }}>→</span> por la Inmaculada Concepción
          </div>
          <div style={{ fontFamily: FUENTE.texto, fontWeight: 500, fontSize: 38, color: COLOR.grisOscuro, marginTop: 8 }}>
            una devoción muy ligada al lugar
          </div>
        </div>
      </AbsoluteFill>
    </Escena>
  );
};
