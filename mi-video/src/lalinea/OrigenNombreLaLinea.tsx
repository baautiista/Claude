import { Audio } from "@remotion/media";
import { useMemo } from "react";
import { AbsoluteFill, getStaticFiles, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Firma } from "../marca/Firma";
import { COLOR } from "../marca/marca";
import { Subtitulos } from "../marca/Subtitulos";
import { AUDIO, FIRMA_SEGUNDOS, LINEA_DE_TIEMPO, type EscenaId } from "./config";
import { Anio1870 } from "./escenas/Anio1870";
import { Cierre } from "./escenas/Cierre";
import { Curiosidad } from "./escenas/Curiosidad";
import { Gancho } from "./escenas/Gancho";
import { Nombre } from "./escenas/Nombre";
import { Origen } from "./escenas/Origen";
import { LineaDeTiempo } from "./LineaDeTiempo";
import { aFrames, finDeEscenas, getEscena, subtitulosDesdeGuion } from "./tiempos";

const existe = (archivo: string) => getStaticFiles().some((f) => f.name === archivo);

const seq = (id: EscenaId) => {
  const e = getEscena(id);
  return { from: aFrames(e.inicio), durationInFrames: aFrames(e.fin - e.inicio) };
};

const lineaDesde = () => getEscena(LINEA_DE_TIEMPO.desde).inicio;
const lineaHasta = () => getEscena(LINEA_DE_TIEMPO.hasta).fin;

/** Sube los subtítulos mientras la línea de tiempo está en pantalla. */
const SubtitulosDelVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const captions = useMemo(() => subtitulosDesdeGuion(), []);
  const t = frame / fps;
  const conLinea = t >= lineaDesde() && t < lineaHasta();
  return <Subtitulos captions={captions} elevacion={conLinea ? 150 : 0} />;
};

export const OrigenNombreLaLinea: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const hayLocucion = existe(AUDIO.locucion);
  const hayMusica = existe(AUDIO.musica);
  const volumenMusica = hayLocucion ? AUDIO.volumenMusicaConVoz : AUDIO.volumenMusicaSinVoz;
  const fundido = AUDIO.fundidoMusica * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.negro }}>
      <Sequence name="1. Gancho" {...seq("gancho")} premountFor={fps}>
        <Gancho />
      </Sequence>
      <Sequence name="2. Origen" {...seq("origen")} premountFor={fps}>
        <Origen />
      </Sequence>
      <Sequence name="3. 1870" {...seq("anio1870")} premountFor={fps}>
        <Anio1870 />
      </Sequence>
      <Sequence name="4. El nombre" {...seq("nombre")} premountFor={fps}>
        <Nombre />
      </Sequence>
      <Sequence name="5. Curiosidad" {...seq("curiosidad")} premountFor={fps}>
        <Curiosidad />
      </Sequence>
      <Sequence name="6. Cierre" {...seq("cierre")} premountFor={fps}>
        <Cierre />
      </Sequence>
      <Sequence
        name="Línea de tiempo"
        from={aFrames(lineaDesde())}
        durationInFrames={aFrames(lineaHasta() - lineaDesde())}
        premountFor={fps}
      >
        <LineaDeTiempo />
      </Sequence>
      <Sequence name="Subtítulos">
        <SubtitulosDelVideo />
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
