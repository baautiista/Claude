import { Audio } from "@remotion/media";
import { useMemo } from "react";
import {
  AbsoluteFill,
  getStaticFiles,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import { AUDIO, LINEA_DE_TIEMPO } from "./config";
import { Anio1870 } from "./escenas/Anio1870";
import { Cierre } from "./escenas/Cierre";
import { Curiosidad } from "./escenas/Curiosidad";
import { Gancho } from "./escenas/Gancho";
import { Nombre } from "./escenas/Nombre";
import { Origen } from "./escenas/Origen";
import { COLORES, ZONA_SEGURA } from "./estilo";
import { Fondo, GranoYVineta } from "./Fondo";
import { LineaDeTiempo } from "./LineaDeTiempo";
import { Subtitulos } from "./Subtitulos";
import { aFrames, getEscena, subtitulosDesdeGuion } from "./tiempos";

const existe = (archivo: string) =>
  getStaticFiles().some((f) => f.name === archivo);

const seq = (id: Parameters<typeof getEscena>[0]) => {
  const e = getEscena(id);
  return { from: aFrames(e.inicio), durationInFrames: aFrames(e.fin - e.inicio) };
};

export const OrigenNombreLaLinea: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const captions = useMemo(() => subtitulosDesdeGuion(), []);
  const hayLocucion = existe(AUDIO.locucion);
  const hayMusica = existe(AUDIO.musica);
  const volumenMusica = hayLocucion ? AUDIO.volumenMusicaConVoz : AUDIO.volumenMusicaSinVoz;
  const fundido = AUDIO.fundidoMusica * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORES.fondo }}>
      <Fondo />
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
        from={aFrames(getEscena(LINEA_DE_TIEMPO.desde).inicio)}
        durationInFrames={aFrames(
          getEscena(LINEA_DE_TIEMPO.hasta).fin - getEscena(LINEA_DE_TIEMPO.desde).inicio,
        )}
        premountFor={fps}
      >
        <LineaDeTiempo />
      </Sequence>

      <GranoYVineta />

      {/* Marca */}
      <AbsoluteFill
        style={{ alignItems: "center", paddingTop: ZONA_SEGURA.arriba + 10 }}
      >
        <Img
          name="Logo infolinense"
          src={staticFile("marca/logo.png")}
          style={{ width: 230, opacity: 0.85 }}
        />
      </AbsoluteFill>

      <Sequence name="Subtítulos">
        <Subtitulos captions={captions} />
      </Sequence>

      {hayLocucion ? (
        <Audio name="Locución" src={staticFile(AUDIO.locucion)} premountFor={fps} />
      ) : null}
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
