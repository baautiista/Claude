import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { FotoPantalla } from "../../marca/Foto";
import { Titular } from "../../marca/Titular";
import { Tramo } from "../../marca/Tramo";
import { Distintivo, Nota, ZonaPlano } from "../comun";
import { FOTOS, MOMENTOS } from "../config";
import { Camara, PlanoTramo } from "../Plano";
import { beatsDeEscena, frameEnEscena } from "../tiempos";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";

export const PLANO_COLON = {
  izquierda: "C/ Colón",
  derecha: "Urb. Doña Curra",
  final: "San Pedro de Alcántara",
  obstaculo: "Colón, 92",
  hueco: [360, 500] as const,
};

export const ColonProblema: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [, finca] = beatsDeEscena("colonProblema");
  const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);
  const esquema = f("esquemaColon");

  return (
    <Escena fondo="azul">
      {/* Foto aérea de la finca */}
      <Tramo desde={0} hasta={finca}>
        <FotoPantalla archivo={FOTOS.colon} enfoque="45% 72%" zoom={[1.0, 1.3]} />
        <Distintivo numero="2" nombre="Calle Colón" desde={3} />
      </Tramo>

      {/* La calle, cortada */}
      <Tramo desde={finca} hasta={esquema}>
        <FotoPantalla archivo={FOTOS.colonCalle} enfoque="50% 45%" zoom={[1.0, 1.2]} />
        <div
          style={{
            position: "absolute",
            top: ZONA_SEGURA.arriba + 40,
            left: ZONA_SEGURA.lados,
            backgroundColor: COLOR.rosa,
            color: COLOR.blanco,
            fontFamily: FUENTE.display,
            fontWeight: 800,
            fontSize: 72,
            padding: "8px 26px",
            borderRadius: 12,
            scale: entrada(frame, finca + 6, 12, 13),
            transformOrigin: "0% 50%",
          }}
        >
          Una única finca
        </div>
      </Tramo>

      {/* Esquema */}
      <Tramo desde={esquema} hasta={durationInFrames + 10}>
        <Titular principal="Une Colón con" destacado="Urb. Doña Curra" desde={esquema} />
        <ZonaPlano top={600}>
          <Camara
            zoom={interpolate(frame, [esquema, esquema + 1.5 * fps], [1.35, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
            x={430}
            y={400}
          >
            <PlanoTramo
              {...PLANO_COLON}
              calles={suave(frame, esquema, 0.7 * fps)}
              bloque={entrada(frame, esquema + 4, 10, 13)}
              resaltes={{
                izquierda: suave(frame, f("conectar"), 12),
                derecha: suave(frame, f("viales"), 12),
              }}
            />
          </Camara>
        </ZonaPlano>
        <Nota top={1420} desde={esquema + 16}>
          Fuente: expediente municipal · esquema orientativo
        </Nota>
      </Tramo>
    </Escena>
  );
};
