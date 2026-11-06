import { Audio } from "@remotion/media";
import { useMemo } from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { COLOR, existe } from "../marca/marca";
import { Subtitulos } from "../marca/Subtitulos";
import { AUDIO, CIERRE_SEGUNDOS, type EscenaId } from "./config";
import { Ciudades, Contradiccion, Criticas, Estado } from "./escenas";
import { Ayuntamiento, CierreMarca, Comarca, Excepciones, Reflexion } from "./escenas2";
import { aFrames, finDeEscenas, getEscena, subtitulosDesdeGuion } from "./tiempos";

const seq = (id: EscenaId) => {
  const e = getEscena(id);
  return { from: aFrames(e.inicio), durationInFrames: aFrames(e.fin) - aFrames(e.inicio) };
};

const ESCENAS: { readonly id: EscenaId; readonly nombre: string; readonly Componente: React.FC }[] = [
  { id: "criticas", nombre: "1. Las críticas", Componente: Criticas },
  { id: "estado", nombre: "2. La responsabilidad del Estado", Componente: Estado },
  { id: "contradiccion", nombre: "3. La contradicción ambiental", Componente: Contradiccion },
  { id: "ciudades", nombre: "4. Málaga y Madrid", Componente: Ciudades },
  { id: "ayuntamiento", nombre: "5. Qué ha hecho el Ayuntamiento", Componente: Ayuntamiento },
  { id: "excepciones", nombre: "6. Las excepciones", Componente: Excepciones },
  { id: "comarca", nombre: "7. La Línea no es la única", Componente: Comarca },
  { id: "reflexion", nombre: "8. Reflexión final", Componente: Reflexion },
];

/** ¿Por qué La Línea está obligada a tener una ZBE? Motion graphics (100–110 s). */
export const ZbeLaLinea: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const captions = useMemo(() => subtitulosDesdeGuion(), []);
  const hayLocucion = existe(AUDIO.locucion);
  const hayMusica = existe(AUDIO.musica);
  const volumenMusica = hayLocucion ? AUDIO.volumenMusicaConVoz : AUDIO.volumenMusicaSinVoz;
  const fundido = AUDIO.fundidoMusica * fps;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azul }}>
      {ESCENAS.map(({ id, nombre, Componente }) => (
        <Sequence key={id} name={nombre} {...seq(id)} premountFor={fps}>
          <Componente />
        </Sequence>
      ))}
      <Sequence name="Subtítulos">
        <Subtitulos captions={captions} />
      </Sequence>
      <Sequence name="9. Cierre de marca" from={aFrames(finDeEscenas())} durationInFrames={aFrames(CIERRE_SEGUNDOS)} premountFor={fps}>
        <CierreMarca />
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
