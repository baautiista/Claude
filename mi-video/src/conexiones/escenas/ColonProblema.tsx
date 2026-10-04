import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { FotoPantalla, TarjetaFoto } from "../../marca/Foto";
import { Distintivo, Nota, Titular, ZonaPlano } from "../comun";
import { FOTOS } from "../config";
import { PlanoTramo } from "../Plano";
import { beatsDeEscena } from "../tiempos";

export const PLANO_COLON = {
  izquierda: "Vial público",
  derecha: "Vial público",
  obstaculo: "Colón, 92",
  hueco: [420, 580] as const,
};

export const ColonProblema: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [, finca] = beatsDeEscena("colonProblema");
  const plano = suave(frame, finca - 6, 10);

  return (
    <Escena fondo="azul">
      <AbsoluteFill style={{ opacity: 1 - plano }}>
        <FotoPantalla archivo={FOTOS.colon} enfoque="50% 60%" zoom={[1.15, 1.02]} />
        <Distintivo numero="2" nombre="Calle Colón" desde={4} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: plano }}>
        <Titular principal="Una sola finca" destacado="separa dos calles" desde={finca} />
        <div style={{ position: "absolute", top: 560, right: 60, zIndex: 2 }}>
          <TarjetaFoto archivo={FOTOS.colonSatelite} ancho={260} alto={300} desde={finca + 1.2 * fps} etiqueta="Vista aérea" rotacion={3} />
        </div>
        <ZonaPlano top={640}>
          <PlanoTramo
            {...PLANO_COLON}
            calles={suave(frame, finca, 1.0 * fps)}
            bloque={entrada(frame, finca + 0.9 * fps, 12, 14)}
          />
        </ZonaPlano>
        <Nota top={1400} desde={finca + 20}>
          Fuente: expediente municipal · esquema orientativo
        </Nota>
      </AbsoluteFill>
    </Escena>
  );
};
