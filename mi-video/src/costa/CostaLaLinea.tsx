import { Audio } from "@remotion/media";
import { useMemo } from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { suave } from "../marca/animacion";
import { Firma } from "../marca/Firma";
import { COLOR, existe } from "../marca/marca";
import { Subtitulos } from "../marca/Subtitulos";
import { AUDIO, FIRMA_SEGUNDOS, MOMENTOS, type EscenaId } from "./config";
import { Apertura, Atunara, Cierre, Crinavis, Eastside, Westside } from "./escenas";
import { camara, MapaBahia, PUNTOS } from "./MapaBahia";
import { aFrames, finDeEscenas, getEscena, segundoDe, subtitulosDesdeGuion } from "./tiempos";

const seq = (id: EscenaId) => {
  const e = getEscena(id);
  return { from: aFrames(e.inicio), durationInFrames: aFrames(e.fin - e.inicio) };
};
const F = (k: keyof typeof MOMENTOS) => aFrames(segundoDe(MOMENTOS[k]));
const inicio = (id: EscenaId) => aFrames(getEscena(id).inicio);

/** Mapa de la bahía con cámara que recorre los cuatro proyectos (tiempos absolutos). */
const CapaMapa: React.FC = () => {
  const local = useCurrentFrame();
  const { fps } = useVideoConfig();
  const desde = inicio("eastside");
  const frame = local + desde;
  const E = inicio("eastside");
  const W = inicio("westside");
  const C = inicio("crinavis");
  const A = inicio("atunara");
  const s = (x: number) => Math.round(x * fps);
  const cam = camara(frame, [
    { t: E, x: 1060, y: 1050, s: 0.6 },
    { t: E + s(1.4), x: 1060, y: 1050, s: 0.62 },
    { t: E + s(2.6), x: PUNTOS.eastside.x, y: PUNTOS.eastside.y, s: 1.7 },
    { t: F("ecologistas"), x: PUNTOS.eastside.x, y: PUNTOS.eastside.y, s: 1.75 },
    { t: F("ecologistas") + s(1.2), x: 1250, y: 820, s: 1.2 },
    { t: W + s(0.4), x: 1100, y: 1000, s: 0.85 },
    { t: W + s(1.6), x: PUNTOS.westside.x, y: PUNTOS.westside.y, s: 1.8 },
    { t: C + s(0.4), x: 900, y: 860, s: 0.9 },
    { t: C + s(1.6), x: 860, y: 620, s: 1.7 },
    { t: A + s(0.4), x: 1080, y: 640, s: 1.0 },
    { t: A + s(1.6), x: PUNTOS.atunara.x, y: PUNTOS.atunara.y, s: 2.0 },
  ]);
  const destacado = frame < E + s(2) ? null : frame < W ? "eastside" : frame < C ? "westside" : frame < A ? "crinavis" : "atunara";
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", translate: `${540 - cam.x * cam.s}px ${960 - cam.y * cam.s}px`, scale: cam.s }}>
        <MapaBahia
          frame={frame}
          puntos={suave(frame, E + 4, s(1.2))}
          relleno={suave(frame, F("millon"), s(1.2))}
          westside={suave(frame, F("proyecta"), s(0.6))}
          crinavis={suave(frame, C + s(1.2), s(0.6))}
          atunara={suave(frame, A + s(1), s(0.6))}
          enlaceAtunara={suave(frame, F("atunaraEast") - s(0.6), s(0.9)) * (1 - suave(frame, W, 8))}
          destacado={destacado}
        />
      </div>
    </AbsoluteFill>
  );
};

export const CostaLaLinea: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const captions = useMemo(() => subtitulosDesdeGuion(), []);
  const hayLocucion = existe(AUDIO.locucion);
  const hayMusica = existe(AUDIO.musica);
  const volumenMusica = hayLocucion ? AUDIO.volumenMusicaConVoz : AUDIO.volumenMusicaSinVoz;
  const fundido = AUDIO.fundidoMusica * fps;
  const mapaDesde = inicio("eastside");
  const mapaHasta = aFrames(getEscena("atunara").fin);

  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro }}>
      <Sequence name="Mapa de la bahía" from={mapaDesde} durationInFrames={mapaHasta - mapaDesde} premountFor={fps}>
        <CapaMapa />
      </Sequence>
      <Sequence name="0. Apertura: litoral" {...seq("apertura")} premountFor={fps}>
        <Apertura />
      </Sequence>
      <Sequence name="1. Eastside" {...seq("eastside")} premountFor={fps}>
        <Eastside />
      </Sequence>
      <Sequence name="2. Westside" {...seq("westside")} premountFor={fps}>
        <Westside />
      </Sequence>
      <Sequence name="3. Crinavis" {...seq("crinavis")} premountFor={fps}>
        <Crinavis />
      </Sequence>
      <Sequence name="4. Atunara" {...seq("atunara")} premountFor={fps}>
        <Atunara />
      </Sequence>
      <Sequence name="5. Reflexión final" {...seq("cierre")} premountFor={fps}>
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
