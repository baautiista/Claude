import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { beatsDeEscena } from "../tiempos";

const Fecha: React.FC<{
  readonly dia: string;
  readonly texto: string;
  readonly visible: number;
  readonly activa: boolean;
}> = ({ dia, texto, visible, activa }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 36,
      opacity: visible,
      translate: `${(1 - visible) * 60}px 0px`,
    }}
  >
    <div
      style={{
        width: 230,
        textAlign: "right",
        fontFamily: FUENTE.display,
        fontWeight: 800,
        fontSize: 190,
        lineHeight: 0.9,
        letterSpacing: -6,
        color: activa ? COLOR.azul : COLOR.negro,
      }}
    >
      {dia}
    </div>
    <div>
      <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 64, color: COLOR.negro, lineHeight: 1 }}>
        JULIO
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: FUENTE.texto,
          fontWeight: 600,
          fontSize: 38,
          lineHeight: 1.2,
          color: COLOR.grisOscuro,
          width: 520,
        }}
      >
        {texto}
      </div>
    </div>
  </div>
);

export const Anio1870: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [, constitucion, diezDias] = beatsDeEscena("anio1870");

  const anio = Math.round(
    interpolate(frame, [0, 1.1 * fps], [1830, 1870], {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const salida = suave(frame, constitucion - 0.3 * fps, 0.4 * fps);
  const fecha1 = suave(frame, constitucion, 0.5 * fps);
  const conector = suave(frame, diezDias, 0.6 * fps);
  const fecha2 = suave(frame, diezDias + 0.5 * fps, 0.5 * fps);
  const chip = entrada(frame, diezDias + 0.3 * fps, 0.5 * fps, 14);

  return (
    <Escena fondo="claro">
      {/* 1870: dato protagonista */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 520,
          opacity: 1 - salida,
          translate: `0px ${salida * -80}px`,
        }}
      >
        <div
          style={{
            fontFamily: FUENTE.display,
            fontWeight: 800,
            fontSize: 300,
            lineHeight: 1,
            letterSpacing: -10,
            color: COLOR.azul,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {anio}
        </div>
        <div
          style={{
            marginTop: 20,
            display: "flex",
            gap: 22,
            alignItems: "center",
            fontFamily: FUENTE.display,
            fontWeight: 700,
            fontSize: 58,
            opacity: suave(frame, 0.9 * fps, 0.4 * fps),
            translate: `0px ${(1 - suave(frame, 0.9 * fps, 0.5 * fps)) * 30}px`,
          }}
        >
          <span style={{ color: "#8A929E", position: "relative" }}>
            San Roque
            <span
              style={{
                position: "absolute",
                left: 0,
                top: "52%",
                height: 6,
                borderRadius: 3,
                backgroundColor: COLOR.rosa,
                width: `${suave(frame, 1.3 * fps, 0.4 * fps) * 100}%`,
              }}
            />
          </span>
          <span style={{ color: COLOR.azul }}>→</span>
          <span style={{ color: COLOR.negro }}>La Línea</span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: FUENTE.texto,
            fontWeight: 500,
            fontSize: 42,
            color: COLOR.grisOscuro,
            opacity: suave(frame, 1.5 * fps, 0.4 * fps),
          }}
        >
          Segregación oficial
        </div>
      </AbsoluteFill>

      {/* 20 → 30 de julio */}
      <AbsoluteFill style={{ paddingTop: ZONA_SEGURA.arriba + 210, paddingLeft: 40 }}>
        <Fecha dia="20" texto="Se constituye el Ayuntamiento" visible={fecha1} activa={false} />
        <div style={{ position: "relative", height: 210, marginLeft: 175 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 20,
              width: 8,
              borderRadius: 4,
              height: 170 * conector,
              backgroundColor: COLOR.azul,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 60,
              top: 66,
              backgroundColor: COLOR.lima,
              color: COLOR.negro,
              fontFamily: FUENTE.display,
              fontWeight: 800,
              fontSize: 52,
              padding: "6px 22px",
              borderRadius: 999,
              scale: chip,
            }}
          >
            +10 días
          </div>
        </div>
        <Fecha dia="30" texto="Se decide el nombre del municipio" visible={fecha2} activa />
      </AbsoluteFill>
    </Escena>
  );
};
