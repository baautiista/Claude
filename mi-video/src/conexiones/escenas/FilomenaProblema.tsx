import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { BandaObra } from "../../marca/BandaObra";
import { Escena } from "../../marca/Escena";
import { FotoPantalla, TarjetaFoto } from "../../marca/Foto";
import { COLOR, FUENTE } from "../../marca/marca";
import { Titular } from "../../marca/Titular";
import { Distintivo, Nota, ZonaPlano } from "../comun";
import { FOTOS, MOMENTOS } from "../config";
import { Camara, PlanoTramo } from "../Plano";
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
  const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);
  const rotulo = f("rotuloObstaculo");
  const plano = suave(frame, esquema - 6, 8);
  const r = entrada(frame, rotulo, 14, 12);
  const acercar = suave(frame, decisiva, 1.2 * fps);

  return (
    <Escena fondo="azul">
      {/* Foto aérea con zoom hacia las viviendas */}
      <AbsoluteFill style={{ opacity: 1 - plano }}>
        <FotoPantalla archivo={FOTOS.santaFilomena} enfoque="50% 62%" zoom={[1.0, 1.35]} />
        <Distintivo numero="1" nombre="Santa Filomena" desde={3} />
      </AbsoluteFill>

      {/* Esquema: cada calle se ilumina cuando se nombra */}
      <AbsoluteFill style={{ opacity: plano }}>
        <Titular principal="Las últimas viviendas" destacado="cortan la calle" desde={esquema} hasta={decisiva} />
        <ZonaPlano>
          <Camara zoom={interpolate(acercar, [0, 1], [1, 1.5])} x={510} y={400}>
            <PlanoTramo
              {...PLANO_FILOMENA}
              calles={suave(frame, esquema, 0.8 * fps)}
              bloque={entrada(frame, f("viviendas"), 10, 13)}
              obra={frame >= rotulo}
              resaltes={{
                v0: suave(frame, f("calleSantaFilomena"), 12) * (1 - suave(frame, f("giralda") + 10, 10)),
                v1: suave(frame, f("giralda"), 12) * (1 - suave(frame, f("viviendas") + 6, 10)),
                izquierda: suave(frame, f("puntoRibot"), 14) * (1 - suave(frame, decisiva, 10)),
                derecha: suave(frame, f("calderon"), 14) * (1 - suave(frame, decisiva, 10)),
              }}
            />
          </Camara>
        </ZonaPlano>
        <div style={{ position: "absolute", top: 1060, right: 70, opacity: 1 - acercar }}>
          <TarjetaFoto archivo={FOTOS.santaFilomenaSatelite} ancho={280} alto={300} desde={f("puntoRibot")} etiqueta="Vista aérea" rotacion={-3} />
        </div>
        <Nota top={1380} desde={esquema + 20}>
          Esquema orientativo · no a escala
        </Nota>
        <div
          style={{
            position: "absolute",
            top: 250,
            left: 0,
            right: 0,
            opacity: r,
            translate: `${(1 - r) * 200}px 0px`,
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
