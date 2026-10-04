import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { IconoFortificacion, IconoInmaculada } from "../Iconos";
import { beatsDeEscena } from "../tiempos";

const Bloque: React.FC<{
  readonly titulo: string;
  readonly detalle: string;
  readonly icono: React.ReactNode;
  readonly separacion: number;
  readonly aparicion: number;
}> = ({ titulo, detalle, icono, separacion, aparicion }) => (
  <div
    style={{
      position: "relative",
      width: 920,
      padding: "36px 40px",
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      gap: 34,
      borderRadius: 24,
      backgroundColor: `rgba(255,255,255,${separacion})`,
      boxShadow: `0 10px 30px rgba(10,10,10,${0.06 * separacion})`,
    }}
  >
    <div style={{ width: 150 * aparicion, flexShrink: 0, overflow: "hidden", opacity: aparicion }}>{icono}</div>
    <div>
      <div
        style={{
          fontFamily: FUENTE.display,
          fontWeight: 800,
          fontSize: 92,
          lineHeight: 1,
          letterSpacing: -3,
          color: COLOR.negro,
        }}
      >
        {titulo}
      </div>
      <div
        style={{
          marginTop: 12,
          fontFamily: FUENTE.texto,
          fontWeight: 600,
          fontSize: 38,
          lineHeight: 1.2,
          color: COLOR.grisOscuro,
          opacity: aparicion,
          height: 46 * 2 * aparicion,
        }}
      >
        {detalle}
      </div>
    </div>
  </div>
);

export const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [, laLinea, concepcion] = beatsDeEscena("cierre");
  const separacion = suave(frame, laLinea - 0.2 * fps, 0.5 * fps);

  return (
    <Escena fondo="claro">
      <AbsoluteFill
        style={{
          paddingTop: ZONA_SEGURA.arriba + 60,
          alignItems: "center",
          gap: interpolate(separacion, [0, 1], [0, 36]),
        }}
      >
        <div
          style={{
            alignSelf: "flex-start",
            marginLeft: ZONA_SEGURA.lados,
            marginBottom: 20,
            fontFamily: FUENTE.rotulo,
            fontWeight: 600,
            fontSize: 34,
            letterSpacing: 3,
            color: COLOR.grisOscuro,
            opacity: suave(frame, 0, 10),
          }}
        >
          UN NOMBRE, DOS HISTORIAS
        </div>
        <Bloque
          titulo="La Línea"
          detalle="por la línea defensiva frente a Gibraltar"
          separacion={separacion}
          aparicion={entrada(frame, laLinea, 0.5 * fps)}
          icono={<IconoFortificacion color={COLOR.azul} size={150} />}
        />
        <Bloque
          titulo="de la Concepción"
          detalle="por la Inmaculada"
          separacion={separacion}
          aparicion={entrada(frame, concepcion, 0.5 * fps)}
          icono={<IconoInmaculada color={COLOR.azul} size={150} />}
        />
      </AbsoluteFill>
    </Escena>
  );
};
