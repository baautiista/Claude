import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, Sequence, staticFile, useVideoConfig } from "remotion";
import { CamaraEscena, FondoPro, Latigo } from "../marca/Efectos";
import { COLOR, existe } from "../marca/marca";
import { AUDIO, type EscenaId } from "./config";
import { Cierre, Contenido, Direccion, Dispositivos, Salto } from "./escenas";
import { aFrames, getEscena } from "./tiempos";

const seq = (id: EscenaId, ultima = false) => {
  const e = getEscena(id);
  return { from: aFrames(e.inicio), durationInFrames: aFrames(e.fin - e.inicio) + (ultima ? 0 : 2) };
};

/** Anuncio: InfoLinense da el salto a la web (infolinense.com). */
export const AnuncioWeb: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const hayLocucion = existe(AUDIO.locucion);
  const hayMusica = existe(AUDIO.musica);
  const volumenMusica = hayLocucion ? AUDIO.volumenMusicaConVoz : AUDIO.volumenMusicaSinVoz;
  const fundido = AUDIO.fundidoMusica * fps;
  return (
    <AbsoluteFill>
      <FondoPro />
      <Sequence name="1. El salto" {...seq("salto")} premountFor={fps}>
        <CamaraEscena giro3d direccion={1}>
          <Salto />
        </CamaraEscena>
      </Sequence>
      <Sequence name="2. La dirección" {...seq("url")} premountFor={fps}>
        <CamaraEscena giro3d direccion={-1} salida={false} empuje={0.04}>
          <Direccion />
        </CamaraEscena>
      </Sequence>
      <Sequence name="3. Contenido" {...seq("contenido")} premountFor={fps}>
        <CamaraEscena giro3d direccion={1}>
          <Contenido />
        </CamaraEscena>
      </Sequence>
      <Sequence name="4. Móvil y ordenador" {...seq("dispositivos")} premountFor={fps}>
        <CamaraEscena giro3d direccion={-1}>
          <Dispositivos />
        </CamaraEscena>
      </Sequence>
      <Sequence name="5. Cierre" {...seq("cierre", true)} premountFor={fps}>
        <CamaraEscena giro3d direccion={1} empuje={0.05}>
          <Cierre />
        </CamaraEscena>
      </Sequence>
      {/* Barridos de marca en los cortes */}
      <Sequence name="Látigo 1" from={aFrames(getEscena("url").inicio) - 6} durationInFrames={12}>
        <Latigo />
      </Sequence>
      <Sequence name="Látigo 2" from={aFrames(getEscena("dispositivos").inicio) - 6} durationInFrames={12}>
        <Latigo color={COLOR.blanco} direccion={-1} />
      </Sequence>
      <Sequence name="Látigo 3" from={aFrames(getEscena("cierre").inicio) - 6} durationInFrames={12}>
        <Latigo />
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
