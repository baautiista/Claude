import { Audio } from "@remotion/media";
import { useMemo } from "react";
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { CamaraEscena } from "../marca/Efectos";
import { COLOR, MARCA, existe } from "../marca/marca";
import { Subtitulos } from "../marca/Subtitulos";
import { AUDIO, type EscenaId } from "./config";
import { Arbol, Ayuntamiento, Centro, CentroComercial, Cierre, Compatibles, Criticas, Distancias, DronesEscena, Empleo, Eventos, Gancho, Oportunidad } from "./escenas";
import { Foto } from "./piezas";
import { aFrames, finDeEscenas, getEscena, subtitulosDesdeGuion } from "./tiempos";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const CLAVES = /^(centro|muerto|dieciséis|metros|negocios|cuentan|piedras|tejado|linenses|incompatibles|navidad|línea)$/i;

const ESCENAS: { readonly id: EscenaId; readonly C: React.FC }[] = [
  { id: "gancho", C: Gancho },
  { id: "centroComercial", C: CentroComercial },
  { id: "criticas", C: Criticas },
  { id: "empleo", C: Empleo },
  { id: "ayuntamiento", C: Ayuntamiento },
  { id: "eventos", C: Eventos },
  { id: "centro", C: Centro },
  { id: "arbol", C: Arbol },
  { id: "distancias", C: Distancias },
  { id: "drones", C: DronesEscena },
  { id: "oportunidad", C: Oportunidad },
  { id: "compatibles", C: Compatibles },
  { id: "cierre", C: Cierre },
];

/** Final: logotipo de InfoLinense sobre el árbol junto a Camarón. */
const Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const p = entrada(frame, 2, 16);
  return (
    <AbsoluteFill>
      <Foto k="arbolCamaron" nombre="Árbol junto a Camarón" zoom={[1.05, 1.0]} oscurecer={0.5} />
      <AbsoluteFill style={{ backgroundColor: `rgba(31,94,255,${0.55 * suave(frame, 0, 12)})` }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 120, opacity: p, scale: interpolate(p, [0, 1], [1.2, 1]) }}>
        <Img src={MARCA.logo} style={{ width: 760 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Editorial: ¿Ahora también molesta que La Línea avance? */
export const EditorialAvance: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const captions = useMemo(() => subtitulosDesdeGuion(), []);
  const fin = aFrames(finDeEscenas());
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro }}>
      {ESCENAS.map(({ id, C }, i) => {
        const e = getEscena(id);
        const desde = aFrames(e.inicio);
        return (
          <Sequence key={id} name={e.id} from={desde} durationInFrames={aFrames(e.fin) - desde} premountFor={fps}>
            <CamaraEscena direccion={i % 2 ? -1 : 1} empuje={0.05}>
              <C />
            </CamaraEscena>
          </Sequence>
        );
      })}
      <Sequence name="Logo final" from={fin} premountFor={fps}>
        <Logo />
      </Sequence>
      <Sequence name="Subtítulos" durationInFrames={fin}>
        <Subtitulos captions={captions} claves={CLAVES} />
      </Sequence>
      {existe(AUDIO.locucion) ? <Audio name="Locución" src={staticFile(AUDIO.locucion)} /> : null}
      {existe(AUDIO.musica) ? (
        <Audio name="Música" src={staticFile(AUDIO.musica)} volume={(fr) => interpolate(fr, [0, 10, durationInFrames - 30, durationInFrames], [0, AUDIO.volumenMusica, AUDIO.volumenMusica, 0], clamp)} />
      ) : null}
      <Audio name="Golpe inicial" src={staticFile(AUDIO.golpe)} volume={AUDIO.volumenEfectos} />
      {ESCENAS.slice(1).map(({ id }) => (
        <Sequence key={`b-${id}`} name={`Barrido ${id}`} from={aFrames(getEscena(id).inicio) - 4} durationInFrames={20}>
          <Audio src={staticFile(AUDIO.barrido)} volume={AUDIO.volumenEfectos * 0.6} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
