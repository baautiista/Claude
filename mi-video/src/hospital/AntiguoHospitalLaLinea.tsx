import { Audio } from "@remotion/media";
import { useMemo } from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { Firma } from "../marca/Firma";
import { COLOR, existe } from "../marca/marca";
import { Subtitulos } from "../marca/Subtitulos";
import { AUDIO, FIRMA_SEGUNDOS, type EscenaId } from "./config";
import { Carrusel } from "./escenas/Carrusel";
import { Cesion } from "./escenas/Cesion";
import { Cierre } from "./escenas/Cierre";
import { Cifras } from "./escenas/Cifras";
import { Gancho } from "./escenas/Gancho";
import { NoConfundir } from "./escenas/NoConfundir";
import { Pregunta } from "./escenas/Pregunta";
import { Propietario } from "./escenas/Propietario";
import { Situacion } from "./escenas/Situacion";
import { Transicion } from "./escenas/Transicion";
import { aFrames, finDeEscenas, getEscena, subtitulosDesdeGuion } from "./tiempos";

const seq = (id: EscenaId) => {
  const e = getEscena(id);
  return { from: aFrames(e.inicio), durationInFrames: aFrames(e.fin - e.inicio) };
};

export const AntiguoHospitalLaLinea: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const captions = useMemo(() => subtitulosDesdeGuion(), []);
  const hayLocucion = existe(AUDIO.locucion);
  const hayMusica = existe(AUDIO.musica);
  const volumenMusica = hayLocucion ? AUDIO.volumenMusicaConVoz : AUDIO.volumenMusicaSinVoz;
  const fundido = AUDIO.fundidoMusica * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azul }}>
      <Sequence name="1. Gancho" {...seq("gancho")} premountFor={fps}>
        <Gancho />
      </Sequence>
      <Sequence name="2. El propietario" {...seq("propietario")} premountFor={fps}>
        <Propietario />
      </Sequence>
      <Sequence name="3. Las cifras" {...seq("cifras")} premountFor={fps}>
        <Cifras />
      </Sequence>
      <Sequence name="4. La cesión y las dos vías" {...seq("cesion")} premountFor={fps}>
        <Cesion />
      </Sequence>
      <Sequence name="5. Transición" {...seq("transicion")} premountFor={fps}>
        <Transicion />
      </Sequence>
      <Sequence name="6. Carrusel de propuestas" {...seq("carrusel")} premountFor={fps}>
        <Carrusel />
      </Sequence>
      <Sequence name="7. La pregunta y el matiz" {...seq("pregunta")} premountFor={fps}>
        <Pregunta />
      </Sequence>
      <Sequence name="8. No confundir" {...seq("noConfundir")} premountFor={fps}>
        <NoConfundir />
      </Sequence>
      <Sequence name="9. Situación actual" {...seq("situacion")} premountFor={fps}>
        <Situacion />
      </Sequence>
      <Sequence name="10. Cierre" {...seq("cierre")} premountFor={fps}>
        <Cierre />
      </Sequence>
      <Sequence name="Subtítulos">
        <Subtitulos captions={captions} />
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
          volume={(f) =>
            interpolate(f, [0, fundido, durationInFrames - fundido, durationInFrames], [0, volumenMusica, volumenMusica, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
