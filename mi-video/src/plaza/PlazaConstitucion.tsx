import { Audio } from "@remotion/media";
import { useMemo } from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { Firma } from "../marca/Firma";
import { COLOR, existe } from "../marca/marca";
import { Subtitulos } from "../marca/Subtitulos";
import { AUDIO, CIERRE_SEGUNDOS, CLAVES_SUBTITULOS, DURACION_TOTAL, FIRMA_SEGUNDOS, type EscenaId } from "./config";
import { Cierre, Datos, Gancho, Infantil, Infra, Pergolas, Sombra, Superficie, Vegetacion } from "./escenas";
import { aFrames, finDeEscenas, getEscena, subtitulosDesdeGuion } from "./tiempos";

const seq = (id: EscenaId) => {
  const e = getEscena(id);
  return { from: aFrames(e.inicio), durationInFrames: aFrames(e.fin) - aFrames(e.inicio) };
};

/** Así cambiará la Plaza de la Constitución (58 s). */
export const PlazaConstitucion: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const captions = useMemo(() => subtitulosDesdeGuion(), []);
  const hayLocucion = existe(AUDIO.locucion);
  const hayMusica = existe(AUDIO.musica);
  const volumenMusica = hayLocucion ? AUDIO.volumenMusicaConVoz : AUDIO.volumenMusicaSinVoz;
  const fundido = AUDIO.fundidoMusica * fps;
  const vegetacion = getEscena("vegetacion");
  const ultimaFrase = vegetacion.frases[vegetacion.frases.length - 1].fin;
  const elevarDesde = aFrames(ultimaFrase + 0.25 - vegetacion.inicio);
  const cierreDesde = aFrames(DURACION_TOTAL - CIERRE_SEGUNDOS);

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azul }}>
      <Sequence name="0. Gancho" {...seq("gancho")} premountFor={fps}>
        <Gancho />
      </Sequence>
      <Sequence name="1. Presupuesto y plazo" {...seq("datos")} premountFor={fps}>
        <Datos />
      </Sequence>
      <Sequence name="2. Fast motion POV" {...seq("superficie")} premountFor={fps}>
        <Superficie />
      </Sequence>
      <Sequence name="3. Pérgolas" {...seq("pergolas")} premountFor={fps}>
        <Pergolas />
      </Sequence>
      <Sequence name="4. Fast motion cenital" {...seq("sombra")} premountFor={fps}>
        <Sombra />
      </Sequence>
      <Sequence name="5. Drenaje y fuente" {...seq("infra")} premountFor={fps}>
        <Infra />
      </Sequence>
      <Sequence name="6. Zona infantil" {...seq("infantil")} premountFor={fps}>
        <Infantil />
      </Sequence>
      <Sequence name="7. Vegetación" {...seq("vegetacion")} premountFor={fps}>
        <Vegetacion elevarDesde={elevarDesde} />
      </Sequence>
      <Sequence name="8. Cierre" from={cierreDesde} durationInFrames={aFrames(finDeEscenas()) - cierreDesde} premountFor={fps}>
        <Cierre />
      </Sequence>
      <Sequence name="Subtítulos">
        <Subtitulos captions={captions} claves={CLAVES_SUBTITULOS} />
      </Sequence>
      <Sequence name="Firma InfoLinense" from={aFrames(finDeEscenas())} durationInFrames={aFrames(FIRMA_SEGUNDOS)} premountFor={fps}>
        <Firma />
      </Sequence>
      {hayLocucion ? <Audio name="Locución" src={staticFile(AUDIO.locucion)} premountFor={fps} /> : null}
      {hayMusica ? (
        <Audio
          name="Música de fondo"
          src={staticFile(AUDIO.musica)}
          loop
          premountFor={fps}
          volume={(fr) =>
            interpolate(fr, [0, fundido, durationInFrames - fundido, durationInFrames], [0, volumenMusica, volumenMusica, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
