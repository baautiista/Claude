import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { BandaObra } from "../../marca/BandaObra";
import { Escena } from "../../marca/Escena";
import { FotoPantalla } from "../../marca/Foto";
import { COLOR, FUENTE } from "../../marca/marca";
import { Distintivo, Nota, Titular, ZonaPlano } from "../comun";
import { FOTOS, MOMENTOS } from "../config";
import { PlanoTramo } from "../Plano";
import { beatsDeEscena, frameEnEscena } from "../tiempos";

export const PLANO_FILOMENA = {
  izquierda: "Punto Ribot",
  derecha: "Calderón de la Barca",
  verticales: ["Santa Filomena", "Giralda"] as const,
  obstaculo: "Últimas viviendas",
  hueco: [380, 640] as const,
};

export const FilomenaProblema: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [, esquema, decisiva] = beatsDeEscena("filomenaProblema");
  const viviendas = frameEnEscena(MOMENTOS.viviendas);
  const rotulo = frameEnEscena(MOMENTOS.rotuloObstaculo);
  const plano = suave(frame, esquema - 6, 10);
  const r = entrada(frame, rotulo, 16, 13);

  return (
    <Escena fondo="azul">
      {/* Foto aérea */}
      <AbsoluteFill style={{ opacity: 1 - plano }}>
        <FotoPantalla archivo={FOTOS.santaFilomena} enfoque="45% 65%" />
        <Distintivo numero="1" nombre="Santa Filomena" desde={4} />
      </AbsoluteFill>

      {/* Esquema */}
      <AbsoluteFill style={{ opacity: plano }}>
        <Titular principal="Las últimas viviendas" destacado="cortan la calle" desde={esquema} hasta={decisiva} />
        <ZonaPlano>
          <PlanoTramo
            {...PLANO_FILOMENA}
            calles={suave(frame, esquema, 1.2 * fps)}
            bloque={entrada(frame, viviendas, 12, 14)}
            obra={frame >= rotulo}
          />
        </ZonaPlano>
        <Nota top={1330} desde={esquema + 20}>
          Esquema orientativo · no a escala
        </Nota>
        {/* Rótulo ÚLTIMO OBSTÁCULO */}
        <div
          style={{
            position: "absolute",
            top: 250,
            left: 0,
            right: 0,
            opacity: r,
            scale: interpolate(r, [0, 1], [1.2, 1]),
          }}
        >
          <BandaObra alto={30} />
          <div
            style={{
              backgroundColor: COLOR.negro,
              color: COLOR.lima,
              fontFamily: FUENTE.display,
              fontWeight: 800,
              fontSize: 104,
              letterSpacing: -2,
              textAlign: "center",
              padding: "14px 0 8px",
            }}
          >
            ÚLTIMO OBSTÁCULO
          </div>
          <BandaObra alto={30} />
        </div>
      </AbsoluteFill>
    </Escena>
  );
};
