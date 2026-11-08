import { Audio } from "@remotion/media";
import type { Caption } from "@remotion/captions";
import { useMemo } from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CamaraEscena } from "../marca/Efectos";
import { existe } from "../marca/marca";
import { AUDIO, FUENTES, MOMENTOS, V, type EscenaId } from "./config";
import { Cta, Funcion, Gancho, Interfaz, Modalidades, Premio } from "./escenas";
import { clamp } from "./piezas";
import { aFrames, finDeEscenas, getEscena, segundoDe, subtitulosDesdeGuion } from "./tiempos";

const CLAVES = /^(ganar|coac|2027|cinco|quiniela|premio|ganador|acertar|acertado|votacoacs?)$/i;

/** Subtítulos: máximo dos líneas, palabra activa resaltada y palabras clave en amarillo. */
const Subtitulos: React.FC<{ readonly captions: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const paginas = useMemo(() => {
    const out: Caption[][] = [];
    let actual: Caption[] = [];
    for (const c of captions) {
      actual.push(c);
      if (c.pageBreakAfter) {
        out.push(actual);
        actual = [];
      }
    }
    if (actual.length) out.push(actual);
    return out;
  }, [captions]);
  const pagina = paginas.find((p, i) => {
    const sig = paginas[i + 1];
    const fin = sig ? Math.min(sig[0].startMs, p[p.length - 1].endMs + 350) : p[p.length - 1].endMs + 350;
    return ms >= p[0].startMs && ms < fin;
  });
  if (!pagina) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 400, paddingLeft: 90, paddingRight: 90 }}>
      <div style={{ backgroundColor: "rgba(23,19,68,0.9)", borderRadius: 18, padding: "12px 26px 16px", maxWidth: 900, fontFamily: FUENTES.texto, fontWeight: 800, fontSize: 52, lineHeight: 1.18, textAlign: "center", color: V.blanco }}>
        {pagina.map((p, i) => {
          const limpia = p.text.trim().replace(/[¿?¡!,.:;]/g, "");
          const clave = CLAVES.test(limpia);
          const activa = ms >= p.startMs && ms < p.endMs;
          return (
            <span key={i} style={{ whiteSpace: "pre", color: clave ? V.amarillo : V.blanco, opacity: ms >= p.startMs ? 1 : 0.45, textDecoration: activa ? `underline 6px ${V.azul}` : undefined, textUnderlineOffset: 10 }}>
              {p.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const ESCENAS: { readonly id: EscenaId; readonly C: React.FC; readonly dir: 1 | -1 }[] = [
  { id: "gancho", C: Gancho, dir: 1 },
  { id: "funcion", C: Funcion, dir: -1 },
  { id: "modalidades", C: Modalidades, dir: 1 },
  { id: "interfaz", C: Interfaz, dir: -1 },
  { id: "premio", C: Premio, dir: 1 },
];

/** VotaCOAC 2027 — "Las cinco del público" (anuncio vertical). */
export const VotaCoacCinco: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const captions = useMemo(() => subtitulosDesdeGuion(), []);
  const ctaDesde = aFrames(getEscena("cta").inicio);
  const F = (k: keyof typeof MOMENTOS) => aFrames(segundoDe(MOMENTOS[k]));
  const cortes = ESCENAS.slice(1).map((e) => aFrames(getEscena(e.id).inicio)).concat(ctaDesde);
  const interfaz = aFrames(getEscena("interfaz").inicio);
  const modal = ["coros", "comparsas", "chirigotas", "cuartetos"] as const;
  return (
    <AbsoluteFill style={{ backgroundColor: V.tinta }}>
      {ESCENAS.map(({ id, C, dir }) => {
        const e = getEscena(id);
        const desde = aFrames(e.inicio);
        return (
          <Sequence key={id} name={id} from={desde} durationInFrames={aFrames(e.fin) - desde} premountFor={fps}>
            <CamaraEscena direccion={dir} empuje={0.04}>
              <C />
            </CamaraEscena>
          </Sequence>
        );
      })}
      <Sequence name="cta" from={ctaDesde} premountFor={fps}>
        <CamaraEscena direccion={-1} empuje={0.05} salida={false}>
          <Cta />
        </CamaraEscena>
      </Sequence>
      <Sequence name="Subtítulos" durationInFrames={aFrames(finDeEscenas())}>
        <Subtitulos captions={captions} />
      </Sequence>
      {/* Sonido */}
      {existe(AUDIO.locucion) ? <Audio name="Locución" src={staticFile(AUDIO.locucion)} /> : null}
      {existe(AUDIO.musica) ? (
        <Audio name="Música original" src={staticFile(AUDIO.musica)} volume={(fr) => interpolate(fr, [0, 8, durationInFrames - 24, durationInFrames], [0, AUDIO.volumenMusica, AUDIO.volumenMusica, 0], clamp)} />
      ) : null}
      {cortes.map((c) => (
        <Sequence key={`b${c}`} name="Barrido" from={c - 4} durationInFrames={24}>
          <Audio src={staticFile(AUDIO.barrido)} volume={AUDIO.volumenEfectos * 0.8} />
        </Sequence>
      ))}
      {modal.map((k) => (
        <Sequence key={k} name={`Tic ${k}`} from={F(k) - 3} durationInFrames={15}>
          <Audio src={staticFile(AUDIO.tic)} volume={AUDIO.volumenEfectos} />
        </Sequence>
      ))}
      {[10, 19, 28, 37, 46, 72].map((t) => (
        <Sequence key={`c${t}`} name="Clic" from={interfaz + t} durationInFrames={15}>
          <Audio src={staticFile(AUDIO.clic)} volume={AUDIO.volumenEfectos} />
        </Sequence>
      ))}
      <Sequence name="Premio" from={F("premio") - 12} durationInFrames={60}>
        <Audio src={staticFile(AUDIO.premio)} volume={AUDIO.volumenEfectos * 1.2} />
      </Sequence>
    </AbsoluteFill>
  );
};
