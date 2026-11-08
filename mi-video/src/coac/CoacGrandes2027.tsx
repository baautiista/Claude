import { Audio } from "@remotion/media";
import type { Caption } from "@remotion/captions";
import { useMemo } from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { existe } from "../marca/marca";
import { AUDIO, C, FOTOS, NOMBRE_MODALIDAD, SESIONES, USUARIO, type Agrupacion, type EscenaId, type Modalidad, type Sesion } from "./config";
import { aFrames, finDeEscenas, getEscena, segundoDe, subtitulosDesdeGuion } from "./tiempos";

/* Tipografía: Object Sans no está en el proyecto; se usa Poppins (cargada en marca.ts) en pesos 800–900. */
const TITULAR = "Poppins";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const F = (s: Parameters<typeof segundoDe>[0]) => aFrames(segundoDe(s));

const colorDe = (m: Modalidad | null) => (m ? C[m] : C.blanco);
const textoSobre = (m: Modalidad | null) => (m === "chirigota" || m === null ? C.noche : C.blanco);

/* ---------- Fondo: fotos del Gran Teatro Falla con cámara digital ---------- */

const FOTO_POR_ESCENA: Record<EscenaId, string> = {
  gancho: FOTOS.fachada,
  bloque1: FOTOS.interior,
  bloque2: FOTOS.fachada,
  bloque3: FOTOS.interior,
  bloque4: FOTOS.fachada,
  final: FOTOS.interior,
};

const Fondo: React.FC<{ readonly id: EscenaId }> = ({ id }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const gancho = id === "gancho";
  // Gancho: acercamiento rápido a la fachada; resto: empuje lento con desplazamiento
  const escala = gancho
    ? interpolate(frame, [0, 14, durationInFrames], [1.9, 1.25, 1.12], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) })
    : interpolate(frame, [0, durationInFrames], [1.18, 1.32]);
  const pan = interpolate(frame, [0, durationInFrames], id === "bloque2" || id === "bloque4" ? [-30, 30] : [30, -30]);
  return (
    <AbsoluteFill style={{ backgroundColor: C.noche, overflow: "hidden" }}>
      <Img
        src={staticFile(FOTO_POR_ESCENA[id])}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: gancho ? "50% 35%" : "50% 50%", scale: escala, translate: `${pan}px 0px`, filter: id === "final" ? "blur(6px)" : undefined }}
      />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.noche}E6 0%, ${C.noche}99 30%, ${C.noche}B3 65%, ${C.noche}F2 100%)` }} />
    </AbsoluteFill>
  );
};

/* ---------- Piezas ---------- */

/** Marca de agua discreta durante todo el vídeo. */
const Usuario: React.FC = () => (
  <div style={{ position: "absolute", top: 206, right: 80, fontFamily: TITULAR, fontWeight: 800, fontSize: 30, color: C.blanco, opacity: 0.85, letterSpacing: 0.5 }}>{USUARIO}</div>
);

/** Leyenda de colores por modalidad. */
const Leyenda: React.FC<{ readonly opacidad: number }> = ({ opacidad }) => (
  <div style={{ position: "absolute", top: 346, left: 80, right: 80, display: "flex", justifyContent: "space-between", opacity: opacidad }}>
    {(Object.keys(NOMBRE_MODALIDAD) as Modalidad[]).map((m) => (
      <div key={m} style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C[m] }} />
        <span style={{ fontFamily: TITULAR, fontWeight: 800, fontSize: 24, color: C.blanco, letterSpacing: 1 }}>{NOMBRE_MODALIDAD[m]}</span>
      </div>
    ))}
  </div>
);

/** Tira de progreso con todas las fechas de preliminares. */
const Tira: React.FC<{ readonly actual: number }> = ({ actual }) => (
  <div style={{ position: "absolute", top: 268, left: 70, right: 70, display: "flex", gap: 8 }}>
    {SESIONES.map((s) => {
      const hecha = s.dia <= actual;
      const es = s.dia === actual;
      return (
        <div
          key={s.dia}
          style={{
            flex: 1,
            height: 54,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: TITULAR,
            fontWeight: 900,
            fontSize: 26,
            color: es ? C.noche : C.blanco,
            backgroundColor: es ? C.chirigota : hecha ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.08)",
            border: `2px solid ${es ? C.chirigota : "rgba(255,255,255,0.25)"}`,
            scale: es ? 1.12 : 1,
          }}
        >
          {s.dia}
        </div>
      );
    })}
  </div>
);

/** Ficha de una agrupación: color de modalidad, se ilumina y crece al nombrarse. */
const Ficha: React.FC<{ readonly a: Agrupacion; readonly desde: number; readonly orden: number; readonly grande: boolean }> = ({ a, desde, orden, grande }) => {
  const frame = useCurrentFrame();
  const nombrada = F(a.momento) - desde;
  const aparece = entrada(frame, 4 + orden * 3, 14);
  const luz = suave(frame, nombrada - 3, 8);
  const pulso = interpolate(frame, [nombrada - 3, nombrada + 3, nombrada + 12], [1, 1.07, 1], clamp);
  const fondo = colorDe(a.modalidad);
  const alto = grande ? 190 : a.destacada ? 160 : 146;
  return (
    <div
      style={{
        height: alto,
        borderRadius: 22,
        backgroundColor: fondo,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 34px",
        opacity: aparece * (0.35 + 0.65 * luz),
        translate: `${(1 - aparece) * 260}px 0px`,
        scale: pulso,
        boxShadow: luz > 0.5 ? `0 0 ${40 * luz}px ${fondo}88` : "none",
        position: "relative",
      }}
    >
      {a.modalidad ? (
        <div style={{ fontFamily: TITULAR, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: textoSobre(a.modalidad), opacity: 0.85 }}>{NOMBRE_MODALIDAD[a.modalidad]}</div>
      ) : null}
      <div style={{ fontFamily: TITULAR, fontWeight: 900, fontSize: grande ? (a.destacada ? 92 : 84) : a.destacada ? 80 : 72, letterSpacing: -3, lineHeight: 1.02, color: textoSobre(a.modalidad), textTransform: "uppercase" }}>{a.nombre}</div>
    </div>
  );
};

/** Tarjeta de una fecha: día enorme, mes, día de la semana y fichas. */
const Fecha: React.FC<{ readonly s: Sesion; readonly desde: number }> = ({ s, desde }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const entra = entrada(frame, 0, 14);
  const sale = suave(frame, durationInFrames - 6, 6);
  const numero = entrada(frame, 0, 12, 12);
  return (
    <AbsoluteFill
      style={{
        opacity: 1 - sale,
        translate: `${(1 - entra) * 700 - sale * 700}px ${interpolate(frame, [0, durationInFrames], [10, -10])}px`,
        rotate: `${(1 - entra) * 6}deg`,
        filter: entra < 0.9 || sale > 0.1 ? `blur(${(1 - entra) * 14 + sale * 14}px)` : undefined,
      }}
    >
      <div style={{ position: "absolute", top: 420, left: 80, right: 80 }}>
        {s.estrella ? (
          <div style={{ display: "inline-block", backgroundColor: C.coro, color: C.blanco, fontFamily: TITULAR, fontWeight: 900, fontSize: 34, letterSpacing: 2, padding: "6px 18px", borderRadius: 10, marginBottom: 6, scale: entrada(frame, 6, 12, 10) }}>
            OJO A ESTA SESIÓN
          </div>
        ) : null}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 26 }}>
          <div style={{ fontFamily: TITULAR, fontWeight: 900, fontSize: s.agrupaciones.length >= 3 ? 320 : 390, lineHeight: 0.82, letterSpacing: -18, color: C.blanco, scale: interpolate(numero, [0, 1], [1.6, 1]), transformOrigin: "0% 100%" }}>{s.dia}</div>
          <div style={{ paddingBottom: 12 }}>
            <div style={{ fontFamily: TITULAR, fontWeight: 900, fontSize: 120, lineHeight: 0.9, color: C.blanco, letterSpacing: -4 }}>ENERO</div>
            <div style={{ fontFamily: TITULAR, fontWeight: 800, fontSize: 50, color: C.azulClaro, letterSpacing: 3, marginTop: 10 }}>{s.semana}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 50 }}>
          {s.agrupaciones.map((a, i) => (
            <Ficha key={a.nombre} a={a} desde={desde} orden={i} grande={s.agrupaciones.length < 3} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Gancho ---------- */

const Gancho: React.FC = () => {
  const frame = useCurrentFrame();
  const lineas = [
    { t: "¿CUÁNDO", c: C.blanco },
    { t: "CANTAN", c: C.blanco },
    { t: "LOS GRANDES", c: C.chirigota },
    { t: "DEL COAC", c: C.blanco },
    { t: "2027?", c: C.coro },
  ];
  const flash = interpolate(frame, [8, 10, 18], [0, 0.55, 0], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 80, paddingRight: 80, paddingBottom: 260 }}>
        {lineas.map((l, i) => {
          const p = entrada(frame, 6 + i * 3, 12, 11);
          return (
            <div key={l.t} style={{ overflow: "hidden" }}>
              <div style={{ fontFamily: TITULAR, fontWeight: 900, fontSize: 150, lineHeight: 0.95, letterSpacing: -6, color: l.c, translate: `0px ${(1 - p) * 100}%`, scale: interpolate(p, [0, 1], [1.3, 1]), transformOrigin: "0% 100%" }}>{l.t}</div>
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 10, marginTop: 30, opacity: suave(frame, 26, 10) }}>
          {(["coro", "comparsa", "chirigota", "cuarteto"] as Modalidad[]).map((m, i) => (
            <div key={m} style={{ flex: 1, height: 16, borderRadius: 8, backgroundColor: C[m], scale: `${suave(frame, 26 + i * 3, 10)} 1`, transformOrigin: "0% 50%" }} />
          ))}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: C.blanco, opacity: flash }} />
    </AbsoluteFill>
  );
};

/* ---------- Calendario completo y pregunta ---------- */

const Calendario: React.FC<{ readonly pregunta: number }> = ({ pregunta }) => {
  const frame = useCurrentFrame();
  const aleja = interpolate(frame, [0, 20], [1.25, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const atenua = suave(frame, pregunta, 12);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 360, left: 60, right: 60, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, scale: aleja, opacity: 1 - atenua * 0.75 }}>
        {SESIONES.map((s, i) => {
          const p = entrada(frame, i * 2, 12);
          return (
            <div key={s.dia} style={{ backgroundColor: "rgba(29,46,67,0.88)", border: "2px solid rgba(255,255,255,0.22)", borderRadius: 16, padding: "10px 12px 12px", opacity: p, scale: interpolate(p, [0, 1], [0.7, 1]) }}>
              <div style={{ fontFamily: TITULAR, fontWeight: 900, fontSize: 44, color: C.blanco, lineHeight: 1 }}>
                {s.dia} <span style={{ fontSize: 22, letterSpacing: 2 }}>ENE</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                {s.agrupaciones.map((a) => (
                  <div key={a.nombre} style={{ fontFamily: TITULAR, fontWeight: 800, fontSize: 19, lineHeight: 1.1, color: textoSobre(a.modalidad), backgroundColor: colorDe(a.modalidad), borderRadius: 6, padding: "3px 7px", textTransform: "uppercase" }}>
                    {a.nombre}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 200 }}>
      <div style={{ fontFamily: TITULAR, fontWeight: 900, fontSize: 70, color: C.chirigota, letterSpacing: 4, opacity: suave(frame, 0, 8) }}>COAC 2027</div>
      {["¿QUÉ SESIÓN", "ESPERAS MÁS?"].map((t, i) => {
        const p = entrada(frame, 4 + i * 4, 12, 11);
        return (
          <div key={t} style={{ overflow: "hidden" }}>
            <div style={{ fontFamily: TITULAR, fontWeight: 900, fontSize: 124, lineHeight: 1, letterSpacing: -5, color: C.blanco, textAlign: "center", translate: `0px ${(1 - p) * 100}%` }}>{t}</div>
          </div>
        );
      })}
      <div style={{ marginTop: 40, display: "flex", alignItems: "center", gap: 20, opacity: suave(frame, 14, 10) }}>
        <Img src={staticFile(FOTOS.logo)} style={{ width: 96, height: 96, borderRadius: 20 }} />
        <div style={{ fontFamily: TITULAR, fontWeight: 900, fontSize: 60, color: C.blanco }}>{USUARIO}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Subtítulos palabra por palabra ---------- */

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
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 410, paddingLeft: 80, paddingRight: 80 }}>
      <div style={{ fontFamily: TITULAR, fontWeight: 900, fontSize: 58, lineHeight: 1.15, textAlign: "center", textTransform: "uppercase", letterSpacing: -1 }}>
        {pagina.map((p, i) => {
          const activa = ms >= p.startMs && ms < p.endMs;
          return (
            <span key={i} style={{ whiteSpace: "pre", color: activa ? C.chirigota : C.blanco, opacity: ms >= p.startMs ? 1 : 0.4, textShadow: "0 4px 18px rgba(0,0,0,0.75)" }}>
              {p.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Composición ---------- */

const ESCENAS_IDS: EscenaId[] = ["gancho", "bloque1", "bloque2", "bloque3", "bloque4", "final"];

/** ¿Cuándo cantan los grandes del COAC 2027? (@carnavalinense) */
export const CoacGrandes2027: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const captions = useMemo(() => subtitulosDesdeGuion(), []);
  const fin = aFrames(finDeEscenas());
  const inicioFinal = aFrames(getEscena("final").inicio);
  // Tramo de cada fecha: desde que se nombra el día hasta la siguiente fecha (o el final del bloque 4)
  const tramos = SESIONES.map((s, i) => {
    const desde = F(s.momento) - 4;
    const hasta = i + 1 < SESIONES.length ? F(SESIONES[i + 1].momento) - 4 : inicioFinal;
    return { s, desde, hasta };
  });
  const actual = [...tramos].reverse().find((t) => frame >= t.desde)?.s.dia ?? 0;
  const enFechas = frame >= tramos[0].desde && frame < inicioFinal;
  const hayVoz = existe(AUDIO.locucion);

  return (
    <AbsoluteFill style={{ backgroundColor: C.noche }}>
      {ESCENAS_IDS.map((id) => {
        const e = getEscena(id);
        const desde = aFrames(e.inicio);
        const hasta = id === "final" ? durationInFrames : aFrames(e.fin);
        return (
          <Sequence key={id} name={`Fondo ${id}`} from={desde} durationInFrames={hasta - desde} premountFor={fps}>
            <Fondo id={id} />
          </Sequence>
        );
      })}
      <Sequence name="Gancho"  durationInFrames={tramos[0].desde + 6}>
        <Gancho />
      </Sequence>
      {tramos.map(({ s, desde, hasta }) => (
        <Sequence key={s.dia} name={`${s.dia} de enero`} from={desde} durationInFrames={hasta - desde + 6} premountFor={fps}>
          <Fecha s={s} desde={desde} />
        </Sequence>
      ))}
      {enFechas ? <Tira actual={actual} /> : null}
      {enFechas ? <Leyenda opacidad={0.9} /> : null}
      <Sequence name="Calendario completo" from={inicioFinal} durationInFrames={durationInFrames - inicioFinal} premountFor={fps}>
        <Calendario pregunta={fin - inicioFinal} />
      </Sequence>
      <Sequence name="Cierre" from={fin} premountFor={fps}>
        <Cierre />
      </Sequence>
      <Sequence name="Subtítulos">
        <Subtitulos captions={captions} />
      </Sequence>
      <Usuario />
      {/* Sonido */}
      {hayVoz ? <Audio name="Locución" src={staticFile(AUDIO.locucion)} /> : null}
      {existe(AUDIO.musica) ? (
        <Audio
          name="Música original"
          src={staticFile(AUDIO.musica)}
          volume={(f) => interpolate(f, [0, 10, durationInFrames - 30, durationInFrames], [0, AUDIO.volumenMusica, AUDIO.volumenMusica, 0], clamp)}
        />
      ) : null}
      <Sequence name="Golpe gancho" from={8} durationInFrames={30}>
        <Audio src={staticFile(AUDIO.golpe)} volume={AUDIO.volumenEfectos} />
      </Sequence>
      {tramos.map(({ s, desde }) => (
        <Sequence key={`b${s.dia}`} name={`Barrido ${s.dia}`} from={Math.max(0, desde - 3)} durationInFrames={20}>
          <Audio src={staticFile(s.estrella ? AUDIO.golpe : AUDIO.barrido)} volume={AUDIO.volumenEfectos * (s.estrella ? 1 : 0.7)} />
        </Sequence>
      ))}
      <Sequence name="Golpe calendario" from={inicioFinal} durationInFrames={30}>
        <Audio src={staticFile(AUDIO.golpe)} volume={AUDIO.volumenEfectos} />
      </Sequence>
      <Sequence name="Golpe cierre" from={fin} durationInFrames={30}>
        <Audio src={staticFile(AUDIO.golpe)} volume={AUDIO.volumenEfectos} />
      </Sequence>
    </AbsoluteFill>
  );
};

