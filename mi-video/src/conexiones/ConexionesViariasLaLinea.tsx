import { Audio } from "@remotion/media";
import { useMemo } from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { Firma } from "../marca/Firma";
import { COLOR, existe } from "../marca/marca";
import { Subtitulos } from "../marca/Subtitulos";
import { AUDIO, FIRMA_SEGUNDOS, type EscenaId } from "./config";
import { ColonExpropiacion } from "./escenas/ColonExpropiacion";
import { ColonProblema } from "./escenas/ColonProblema";
import { Conclusion } from "./escenas/Conclusion";
import { FilomenaDemolicion } from "./escenas/FilomenaDemolicion";
import { FilomenaProblema } from "./escenas/FilomenaProblema";
import { Intro } from "./escenas/Intro";
import { aFrames, finDeEscenas, getEscena, subtitulosDesdeGuion } from "./tiempos";

const seq = (id: EscenaId) => {
  const e = getEscena(id);
  return { from: aFrames(e.inicio), durationInFrames: aFrames(e.fin - e.inicio) };
};

export const ConexionesViariasLaLinea: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const captions = useMemo(() => subtitulosDesdeGuion(), []);
  const hayLocucion = existe(AUDIO.locucion);
  const hayMusica = existe(AUDIO.musica);
  const volumenMusica = hayLocucion ? AUDIO.volumenMusicaConVoz : AUDIO.volumenMusicaSinVoz;
  const fundido = AUDIO.fundidoMusica * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azul }}>
      <Sequence name="1. Intro" {...seq("intro")} premountFor={fps}>
        <Intro />
      </Sequence>
      <Sequence name="2. Santa Filomena: el problema" {...seq("filomenaProblema")} premountFor={fps}>
        <FilomenaProblema />
      </Sequence>
      <Sequence name="3. Santa Filomena: la demolición" {...seq("filomenaDemolicion")} premountFor={fps}>
        <FilomenaDemolicion />
      </Sequence>
      <Sequence name="4. Calle Colón: el problema" {...seq("colonProblema")} premountFor={fps}>
        <ColonProblema />
      </Sequence>
      <Sequence name="5. Calle Colón: la expropiación" {...seq("colonExpropiacion")} premountFor={fps}>
        <ColonExpropiacion />
      </Sequence>
      <Sequence name="6. Conclusión" {...seq("conclusion")} premountFor={fps}>
        <Conclusion />
      </Sequence>
      <Sequence name="Subtítulos">
        <Subtitulos captions={captions} />
      </Sequence>
      <Sequence
        name="Firma InfoLinense"
        from={aFrames(finDeEscenas())}
        durationInFrames={aFrames(FIRMA_SEGUNDOS)}
        premountFor={fps}
      >
        <Firma />
      </Sequence>
      {hayLocucion ? <Audio name="Locución" src={staticFile(AUDIO.locucion)} premountFor={fps} /> : null}
      {hayMusica ? (
        <Audio
          name="Música de fondo"
          src={staticFile(AUDIO.musica)}
          loop
          premountFor={fps}
          volume={(f) =>
            interpolate(
              f,
              [0, fundido, durationInFrames - fundido, durationInFrames],
              [0, volumenMusica, volumenMusica, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
