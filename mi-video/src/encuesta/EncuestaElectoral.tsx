import { Audio } from "@remotion/media";
import { useMemo } from "react";
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { aFrames, crearTiempos, type DatosLocucion } from "../marca/guion";
import { entrada, suave } from "../marca/animacion";
import { CamaraEscena } from "../marca/Efectos";
import { COLOR, FUENTE, MARCA, ZONA_SEGURA, existe } from "../marca/marca";
import { Subtitulos } from "../marca/Subtitulos";
import { AUDIO, COLA_FINAL, ESCENAS, FOTOS, MOMENTOS, URL_PANEL, type EscenaId } from "./config";
import datosLocucion from "./locucion-tiempos.json";

const tiempos = crearTiempos({ escenas: ESCENAS, datos: datosLocucion as DatosLocucion, firmaSegundos: 0, colaFinal: COLA_FINAL, maxCaracteresSubtitulo: 26 });
export const duracionEncuesta = tiempos.duracionTotal;
const { getEscena, frameEnEscena } = tiempos;
const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Titular que entra con máscara y desenfoque. */
const Linea: React.FC<{ readonly children: React.ReactNode; readonly desde: number; readonly tam: number; readonly color?: string; readonly centro?: boolean }> = ({
  children,
  desde,
  tam,
  color = COLOR.blanco,
  centro = false,
}) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 12, 13);
  return (
    <div style={{ overflow: "hidden", paddingBottom: tam * 0.06, textAlign: centro ? "center" : "left" }}>
      <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: tam, lineHeight: 0.98, letterSpacing: -tam * 0.035, color, translate: `0px ${(1 - p) * 105}%`, filter: p < 0.9 ? `blur(${(1 - p) * 10}px)` : undefined }}>
        {children}
      </div>
    </div>
  );
};

/* ---------- 1. Gancho: pantalla negra y la pregunta palabra a palabra ---------- */

const Gancho: React.FC = () => {
  const frame = useCurrentFrame();
  const palabras: { t: string; k: keyof typeof MOMENTOS; tam: number; color?: string }[] = [
    { t: "¿A", k: "a", tam: 210 },
    { t: "QUIÉN", k: "quien", tam: 210 },
    { t: "VAS A", k: "vas", tam: 210 },
    { t: "VOTAR?", k: "votarG", tam: 250, color: COLOR.azul },
  ];
  const golpe = interpolate(frame, [0, 2, 10], [0.35, 0.2, 0], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", justifyContent: "center", paddingLeft: ZONA_SEGURA.lados, paddingBottom: 220 }}>
      {palabras.map((w) => {
        const d = f(w.k) - 2;
        const p = entrada(frame, d, 8, 12);
        return (
          <div key={w.t} style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: w.tam, lineHeight: 0.92, letterSpacing: -w.tam * 0.04, color: w.color ?? COLOR.blanco, opacity: Math.min(1, p * 2), scale: interpolate(p, [0, 1], [1.7, 1]), transformOrigin: "0% 50%", filter: p < 0.9 ? `blur(${(1 - p) * 14}px)` : undefined }}>
            {w.t}
          </div>
        );
      })}
      <AbsoluteFill style={{ backgroundColor: COLOR.blanco, opacity: golpe }} />
    </AbsoluteFill>
  );
};

/* ---------- 2. Identidad local: fotos reales de La Línea ---------- */

const Identidad: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fotos = FOTOS.identidad.filter(existe);
  const tramo = durationInFrames / fotos.length;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro }}>
      {fotos.map((foto, i) => {
        const desde = Math.round(i * tramo);
        if (frame < desde - 1 || frame > desde + tramo + 4) return null;
        const local = frame - desde;
        const corte = interpolate(local, [0, 5], [0, 1], clamp);
        return (
          <AbsoluteFill key={foto} style={{ clipPath: `inset(0 ${(1 - corte) * 100}% 0 0)` }}>
            <Img src={staticFile(foto)} style={{ width: "100%", height: "100%", objectFit: "cover", scale: interpolate(local, [0, tramo], [1.22, 1.08]), translate: `${interpolate(local, [0, tramo], [i % 2 ? 30 : -30, i % 2 ? -30 : 30])}px 0px` }} />
          </AbsoluteFill>
        );
      })}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,30,92,0.75) 0%, rgba(6,30,92,0.1) 35%, rgba(6,30,92,0.1) 60%, rgba(6,30,92,0.85) 100%)" }} />
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 40, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
        <Linea desde={4} tam={130}>
          LA LÍNEA
        </Linea>
        <Linea desde={8} tam={130} color={COLOR.lima}>
          TIENE VOZ.
        </Linea>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 3. La encuesta: papeleta, urna, barras sin datos e interfaz ---------- */

const Urna: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const cae = interpolate(frame, [4, 22], [-260, 40], { ...clamp, easing: (t) => t * t });
  const visible = frame < 24 ? 1 : 0;
  return (
    <svg viewBox="0 0 400 420" width={460} height={483}>
      {/* Papeleta */}
      <g transform={`translate(200 ${cae})`} opacity={visible}>
        <rect x={-70} y={-90} width={140} height={180} rx={8} fill={COLOR.blanco} />
        <rect x={-50} y={-62} width={100} height={10} rx={5} fill={COLOR.azul} />
        {[0, 1, 2].map((k) => (
          <g key={k}>
            <rect x={-50} y={-28 + k * 34} width={18} height={18} rx={3} fill="none" stroke={COLOR.azulOscuro} strokeWidth={3} />
            <rect x={-20} y={-24 + k * 34} width={70} height={9} rx={4} fill="#C9D3EA" />
          </g>
        ))}
      </g>
      {/* Urna transparente */}
      <rect x={60} y={170} width={280} height={230} rx={18} fill="rgba(255,255,255,0.12)" stroke={COLOR.blanco} strokeWidth={6} />
      <rect x={140} y={162} width={120} height={16} rx={8} fill={COLOR.azulOscuro} stroke={COLOR.blanco} strokeWidth={4} />
      <rect x={60} y={310} width={280} height={36} fill={COLOR.blanco} opacity={0.9} />
      <text x={200} y={336} textAnchor="middle" fontFamily={FUENTE.display} fontWeight={800} fontSize={24} fill={COLOR.azul}>
        ENCUESTA
      </text>
    </svg>
  );
};

/** Barras que oscilan sin cifras: representan la participación, no resultados. */
const Barras: React.FC<{ readonly frame: number }> = ({ frame }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 20, height: 260 }}>
    {[0, 1, 2, 3, 4].map((i) => {
      const alto = 70 + (Math.sin(frame / 7 + i * 1.7) * 0.5 + 0.5) * 170;
      return <div key={i} style={{ width: 60, height: alto * suave(frame, i * 2, 12), borderRadius: "12px 12px 0 0", backgroundColor: i % 2 ? "rgba(255,255,255,0.55)" : COLOR.blanco }} />;
    })}
  </div>
);

/** Interfaz genérica de votación (opciones sin nombres de partidos). */
const Interfaz: React.FC<{ readonly frame: number }> = ({ frame }) => {
  const marcada = frame > 26 ? 1 : -1;
  return (
    <div style={{ width: 620, backgroundColor: COLOR.blanco, borderRadius: 30, padding: "28px 30px", boxShadow: "0 30px 70px rgba(0,0,0,0.35)" }}>
      <div style={{ fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 24, letterSpacing: 3, color: COLOR.azul }}>ENCUESTA INFOLINENSE</div>
      <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 40, color: COLOR.azulOscuro, marginTop: 8, lineHeight: 1.05 }}>¿Qué votarías hoy?</div>
      {[0, 1, 2].map((k) => {
        const sel = k === marcada;
        return (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 16, padding: "16px 18px", borderRadius: 16, border: `3px solid ${sel ? COLOR.azul : "#E3E7F0"}`, backgroundColor: sel ? "#EAF0FF" : COLOR.blanco }}>
            <div style={{ width: 34, height: 34, borderRadius: 17, border: `4px solid ${sel ? COLOR.azul : "#B8C1D6"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {sel ? <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: COLOR.azul, scale: suave(frame, 26, 6) }} /> : null}
            </div>
            <div style={{ height: 16, width: 260 - k * 50, borderRadius: 8, backgroundColor: "#D7DEEC" }} />
          </div>
        );
      })}
    </div>
  );
};

const Encuesta: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t1 = Math.round(durationInFrames * 0.18);
  const t2 = Math.round(durationInFrames * 0.42);
  const t3 = Math.round(durationInFrames * 0.7);
  const fase = frame < t1 ? 0 : frame < t2 ? 1 : frame < t3 ? 2 : 3;
  const local = frame - [0, t1, t2, t3][fase];
  const titular = fase < 2 ? ["¿CAMBIARÍAS", "*TU VOTO?"] : ["¿VOTARÍAS IGUAL", "EN LAS", "*MUNICIPALES?"];
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 55%, ${COLOR.azul}88 0%, transparent 60%)` }} />
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.06) 2px, transparent 2px)", backgroundSize: "90px 90px", backgroundPosition: `0px ${-frame}px` }} />
      <div key={fase < 2 ? "a" : "b"} style={{ position: "absolute", top: ZONA_SEGURA.arriba + 20, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
        {titular.map((l, i) => (
          <Linea key={l} desde={(fase < 2 ? 0 : t2) + 2 + i * 3} tam={fase < 2 ? 110 : 92} color={l.startsWith("*") ? COLOR.lima : COLOR.blanco}>
            {l.replace("*", "")}
          </Linea>
        ))}
      </div>
      <div key={fase} style={{ position: "absolute", top: 760, left: 0, right: 0, display: "flex", justifyContent: "center", transformOrigin: "50% 0%", opacity: suave(local, 0, 5), scale: interpolate(entrada(local, 0, 12), [0, 1], [1.2, 1.45]) }}>
        {fase === 0 ? <Urna frame={local} /> : fase === 1 ? <Barras frame={local} /> : fase === 2 ? <Interfaz frame={local} /> : <Urna frame={local} />}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 4. Solo para vecinos de La Línea ---------- */

const Exclusividad: React.FC = () => {
  const frame = useCurrentFrame();
  const sellos = ["Mayores de 18 años", "Anónima", "Voluntaria"];
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azul }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, rgba(255,255,255,0.25) 0%, transparent 55%)` }} />
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: ZONA_SEGURA.lados, paddingRight: ZONA_SEGURA.lados, paddingBottom: 300 }}>
        <Linea desde={2} tam={128}>
          SOLO PARA
        </Linea>
        <Linea desde={5} tam={128}>
          VECINOS DE
        </Linea>
        <Linea desde={8} tam={128} color={COLOR.lima}>
          LA LÍNEA
        </Linea>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 40 }}>
          {sellos.map((s, i) => {
            const p = entrada(frame, f(i === 0 ? "mayores" : "residan") + i * 4 - 4, 12, 12);
            return (
              <div key={s} style={{ backgroundColor: COLOR.blanco, color: COLOR.azulOscuro, fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 40, padding: "10px 24px", borderRadius: 999, opacity: Math.min(1, p * 2), scale: interpolate(p, [0, 1], [0.6, 1]) }}>
                {s}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- 5. Llamada a la acción (la web queda en pantalla más de 3 s) ---------- */

const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const tarjeta = entrada(frame, 4, 16, 12);
  const latido = 1 + Math.max(0, Math.sin(frame / 7)) * 0.025;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro }}>
      <Img src={staticFile(FOTOS.cta)} style={{ width: "100%", height: "100%", objectFit: "cover", scale: interpolate(frame, [0, 200], [1.25, 1.1], clamp), filter: "blur(2px)" }} />
      <AbsoluteFill style={{ backgroundColor: "rgba(6,30,92,0.62)" }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 260 }}>
        <div style={{ width: 920, backgroundColor: COLOR.blanco, borderRadius: 36, padding: "48px 50px 44px", boxShadow: "0 40px 90px rgba(0,0,0,0.45)", scale: interpolate(tarjeta, [0, 1], [0.7, 1]) * latido, opacity: Math.min(1, tarjeta * 2) }}>
          <div style={{ display: "inline-block", backgroundColor: COLOR.azul, color: COLOR.blanco, fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 30, letterSpacing: 3, padding: "8px 18px", borderRadius: 8 }}>ENCUESTA ELECTORAL</div>
          <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 112, lineHeight: 0.95, letterSpacing: -4, color: COLOR.azulOscuro, marginTop: 22 }}>PARTICIPA AHORA</div>
          <div style={{ marginTop: 28, backgroundColor: COLOR.azulOscuro, color: COLOR.blanco, borderRadius: 20, padding: "22px 26px", fontFamily: FUENTE.texto, fontWeight: 800, fontSize: 64, letterSpacing: -1, textAlign: "center" }}>{URL_PANEL}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 28 }}>
            <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 58, color: COLOR.azul, letterSpacing: -1 }}>TU OPINIÓN CUENTA.</div>
            <div style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: COLOR.azul, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Img src={MARCA.isotipo} style={{ height: 56 }} />
            </div>
          </div>
          <div style={{ marginTop: 22, fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 26, color: "#5B6475", lineHeight: 1.35 }}>
            Consulta voluntaria y anónima entre los participantes. No es un sondeo representativo ni predice el resultado electoral.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- Composición ---------- */

const PIEZAS: { readonly id: EscenaId; readonly C: React.FC; readonly dir: 1 | -1 }[] = [
  { id: "gancho", C: Gancho, dir: 1 },
  { id: "identidad", C: Identidad, dir: -1 },
  { id: "encuesta", C: Encuesta, dir: 1 },
  { id: "exclusividad", C: Exclusividad, dir: -1 },
  { id: "cta", C: Cta, dir: 1 },
];

/** Encuesta electoral InfoLinense: llamada a participar (20–25 s). */
export const EncuestaElectoral: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const captions = useMemo(() => tiempos.subtitulos(), []);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {PIEZAS.map(({ id, C, dir }) => {
        const e = getEscena(id);
        const desde = aFrames(e.inicio);
        const ultima = id === "cta";
        return (
          <Sequence key={id} name={id} from={desde} durationInFrames={ultima ? durationInFrames - desde : aFrames(e.fin) - desde} premountFor={fps}>
            {id === "gancho" ? (
              <C />
            ) : (
              <CamaraEscena direccion={dir} empuje={0.04} salida={!ultima}>
                <C />
              </CamaraEscena>
            )}
          </Sequence>
        );
      })}
      <Sequence name="Subtítulos">
        <Subtitulos captions={captions} />
      </Sequence>
      {existe(AUDIO.locucion) ? <Audio name="Locución" src={staticFile(AUDIO.locucion)} /> : null}
      {existe(AUDIO.musica) ? (
        <Audio name="Música" src={staticFile(AUDIO.musica)} volume={(fr) => interpolate(fr, [0, 6, durationInFrames - 20, durationInFrames], [0, AUDIO.volumenMusica, AUDIO.volumenMusica, 0], clamp)} />
      ) : null}
      <Audio name="Golpe inicial" src={staticFile(AUDIO.golpe)} volume={AUDIO.volumenEfectos * 1.3} />
      {PIEZAS.slice(1).map(({ id }) => (
        <Sequence key={`b-${id}`} name={`Barrido ${id}`} from={Math.max(0, aFrames(getEscena(id).inicio) - 4)} durationInFrames={20}>
          <Audio src={staticFile(id === "cta" ? AUDIO.golpe : AUDIO.barrido)} volume={AUDIO.volumenEfectos * (id === "cta" ? 0.9 : 0.7)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
