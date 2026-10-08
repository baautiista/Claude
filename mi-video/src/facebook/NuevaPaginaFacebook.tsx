import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { existe } from "../marca/marca";
import { AUDIO, type EscenaId } from "./config";
import { Cambio, Cierre, FondoCampana, NuevaPagina, Notificaciones, Pasos } from "./escenas";
import { aFrames, getEscena } from "./tiempos";

const seq = (id: EscenaId, ultima = false) => {
  const e = getEscena(id);
  return { from: aFrames(e.inicio), durationInFrames: aFrames(e.fin - e.inicio) + (ultima ? 0 : 2) };
};

/** Anuncio: InfoLinense deja el perfil antiguo y pasa a su nueva Página de Facebook. */
export const NuevaPaginaFacebook: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const hayLocucion = existe(AUDIO.locucion);
  const hayMusica = existe(AUDIO.musica);
  const volumenMusica = hayLocucion ? AUDIO.volumenMusicaConVoz : AUDIO.volumenMusicaSinVoz;
  const fundido = AUDIO.fundidoMusica * fps;
  return (
    <AbsoluteFill>
      <FondoCampana />
      <Sequence name="1. Cambio de casa" {...seq("cambio")} premountFor={fps}>
        <Cambio />
      </Sequence>
      <Sequence name="2. Nueva Página" {...seq("nuevaPagina")} premountFor={fps}>
        <NuevaPagina />
      </Sequence>
      <Sequence name="3. Cómo seguirnos" {...seq("pasos")} premountFor={fps}>
        <Pasos />
      </Sequence>
      <Sequence name="4. Notificaciones" {...seq("notificaciones")} premountFor={fps}>
        <Notificaciones />
      </Sequence>
      <Sequence name="5. Cierre" {...seq("cierre", true)} premountFor={fps}>
        <Cierre />
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
