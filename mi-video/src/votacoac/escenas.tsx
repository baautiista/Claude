import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { DEMO_COMPARSAS, FUENTES, MODALIDADES, MOMENTOS, ORDEN, V } from "./config";
import { Boton, clamp, Guirnalda, MiniLabel, Particulas, Toque, Wordmark } from "./piezas";
import { frameEnEscena } from "./tiempos";

const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);

/** Línea de titular que entra con máscara, escala y desenfoque. */
const Linea: React.FC<{ readonly children: React.ReactNode; readonly desde: number; readonly tam: number; readonly color?: string; readonly alinear?: "left" | "center" }> = ({
  children,
  desde,
  tam,
  color = V.blanco,
  alinear = "left",
}) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 14, 13);
  return (
    <div style={{ overflow: "hidden", paddingBottom: tam * 0.05, textAlign: alinear }}>
      <div
        style={{
          fontFamily: FUENTES.display,
          fontWeight: 800,
          fontSize: tam,
          lineHeight: 0.95,
          letterSpacing: "-0.045em",
          color,
          translate: `0px ${(1 - p) * 105}%`,
          filter: p < 0.9 ? `blur(${(1 - p) * 10}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* ---------- 1. ¿Sabes quién va a ganar el COAC 2027? ---------- */

export const Gancho: React.FC = () => {
  const frame = useCurrentFrame();
  const ganar = f("ganar");
  const golpe = interpolate(frame, [ganar - 2, ganar + 3, ganar + 12], [1, 1.14, 1], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: V.tinta }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${V.azul}55 0%, transparent 55%)` }} />
      <Particulas />
      <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: suave(frame, 2, 10) }}>
        <Wordmark tam={54} claro giro={Math.sin(frame / 10) * 12} />
      </div>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 80, paddingRight: 80, paddingBottom: 200 }}>
        <Linea desde={0} tam={150}>¿SABES</Linea>
        <Linea desde={3} tam={150}>QUIÉN VA A</Linea>
        <div style={{ scale: golpe, transformOrigin: "0% 50%" }}>
          <Linea desde={6} tam={196} color={V.amarillo}>
            GANAR
          </Linea>
        </div>
        <Linea desde={9} tam={150}>
          EL COAC <span style={{ color: V.azul }}>2027</span>?
        </Linea>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <Guirnalda alto={18} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 2. Las cinco del público (interfaz real) ---------- */

/** Réplica de la cabecera de la sección (CompetitionIntro, color azul) de votacoac.es. */
const Cabecera: React.FC<{ readonly progreso: number }> = ({ progreso }) => (
  <div style={{ width: 960, borderRadius: 40, backgroundColor: V.azulSuave, overflow: "hidden", position: "relative", boxShadow: "0 24px 60px rgba(23,19,68,.16)" }}>
    {/* Festón de círculos azules del borde superior */}
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: -22 }}>
      {Array.from({ length: 22 }, (_, i) => (
        <div key={i} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: V.azul, flexShrink: 0 }} />
      ))}
    </div>
    <div style={{ position: "absolute", right: -60, top: 120, width: 300, height: 420, border: `30px solid #D3E0FB`, borderBottom: 0, borderRadius: "150px 150px 0 0" }} />
    <div style={{ padding: "46px 56px 60px", position: "relative" }}>
      <MiniLabel tam={26}>Tu quiniela, tu selección</MiniLabel>
      <div style={{ fontFamily: FUENTES.display, fontWeight: 800, fontSize: 118, lineHeight: 0.98, letterSpacing: "-0.05em", color: V.tinta, marginTop: 22 }}>
        Las cinco
        <br />
        del público
      </div>
      <div style={{ fontFamily: FUENTES.texto, fontWeight: 500, fontSize: 32, lineHeight: 1.45, color: V.tintaSuave, marginTop: 26, opacity: progreso }}>
        ¿Qué cinco agrupaciones de cada modalidad llegarán más lejos? Elígelas, guarda tu quiniela y comprueba tus aciertos al terminar el concurso.
      </div>
    </div>
  </div>
);

export const Funcion: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const tarjeta = entrada(frame, 2, 22);
  return (
    <AbsoluteFill style={{ backgroundColor: V.papel }}>
      {/* Barra superior de la web */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <Guirnalda alto={10} />
      </div>
      <div style={{ position: "absolute", top: 210, left: 60, right: 60, display: "flex", alignItems: "center", gap: 22, opacity: suave(frame, 0, 10) }}>
        <Wordmark tam={50} />
        <div style={{ marginLeft: "auto", backgroundColor: V.amarillo, color: V.tinta, fontFamily: FUENTES.texto, fontWeight: 800, fontSize: 26, padding: "10px 22px", borderRadius: 999 }}>✦ COAC 2027</div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 330,
          left: 60,
          transform: `perspective(2200px) rotateX(${(1 - tarjeta) * 28}deg) translateY(${(1 - tarjeta) * 300}px)`,
          scale: interpolate(frame, [0, durationInFrames], [1, 1.04]),
          transformOrigin: "50% 0%",
          opacity: tarjeta,
        }}
      >
        <Cabecera progreso={suave(frame, 18, 14)} />
      </div>
      <div style={{ position: "absolute", top: 1170, left: 80, right: 80 }}>
        <Linea desde={f("cinco") + 4} tam={74} color={V.tinta}>
          TU QUINIELA.
        </Linea>
        <Linea desde={f("cinco") + 9} tam={74} color={V.azulProfundo}>
          TU SELECCIÓN.
        </Linea>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 3. Cinco por modalidad: 20 agrupaciones ---------- */

const momentoDe: Record<(typeof ORDEN)[number], keyof typeof MOMENTOS> = { Coro: "coros", Comparsa: "comparsas", Chirigota: "chirigotas", Cuarteto: "cuartetos" };

export const Modalidades: React.FC = () => {
  const frame = useCurrentFrame();
  const momentos = ORDEN.map((mo) => f(momentoDe[mo]) - 3);
  const llegadas = momentos.filter((t) => frame >= t).length;
  const ultimo = momentos[Math.max(0, llegadas - 1)];
  const contador = Math.round(interpolate(frame, [ultimo, ultimo + 10], [Math.max(0, llegadas - 1) * 5, llegadas * 5], clamp));
  const lejos = f("lejos") - 6;
  return (
    <AbsoluteFill style={{ backgroundColor: V.papel }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <Guirnalda alto={10} />
      </div>
      <div style={{ position: "absolute", top: 220, left: 60, right: 60, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {ORDEN.map((mo, i) => {
          const d = MODALIDADES[mo];
          const p = entrada(frame, momentos[i], 16, 12);
          return (
            <div
              key={mo}
              style={{
                borderRadius: 26,
                overflow: "hidden",
                backgroundColor: V.blanco,
                boxShadow: "0 14px 34px rgba(23,19,68,.12)",
                opacity: Math.min(1, p * 1.4),
                transform: `perspective(1600px) rotateY(${(1 - p) * (i % 2 ? -40 : 40)}deg) translateY(${(1 - p) * 120}px)`,
                filter: p < 0.85 ? `blur(${(1 - p) * 12}px)` : undefined,
              }}
            >
              <div style={{ backgroundColor: d.pale, borderTop: `14px solid ${d.color}`, padding: "26px 26px 22px" }}>
                <MiniLabel tam={16}>La selección del público</MiniLabel>
                <div style={{ fontFamily: FUENTES.display, fontWeight: 800, fontSize: 64, letterSpacing: "-0.04em", color: V.tinta, marginTop: 8 }}>{d.plural}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 26px 18px" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {Array.from({ length: 5 }, (_, k) => (
                    <div key={k} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: d.color, opacity: suave(frame, momentos[i] + 6 + k * 2, 6) }} />
                  ))}
                </div>
                <div style={{ fontFamily: FUENTES.display, fontWeight: 800, fontSize: 120, lineHeight: 1, color: d.color, letterSpacing: "-0.05em" }}>5</div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Contador central como .five-total */}
      <div style={{ position: "absolute", top: 880, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "baseline", fontFamily: FUENTES.display, fontWeight: 800, color: V.tinta, letterSpacing: "-0.05em" }}>
        <span style={{ fontSize: 230, lineHeight: 1, scale: interpolate(frame, [ultimo, ultimo + 4, ultimo + 12], [1, 1.12, 1], clamp) }}>{contador}</span>
        <span style={{ fontSize: 80, color: V.textoApagado }}>/20</span>
      </div>
      <div style={{ position: "absolute", top: 1130, left: 0, right: 0 }}>
        <Linea desde={lejos} tam={66} color={V.azulProfundo} alinear="center">
          20 AGRUPACIONES.
        </Linea>
        <Linea desde={lejos + 5} tam={66} color={V.tinta} alinear="center">
          UNA QUINIELA.
        </Linea>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 4. La interfaz real: elegir y guardar ---------- */

const ELEGIDAS = [0, 1, 2, 3, 4];

export const Interfaz: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const descubre = f("descubre");
  // Toques en las tarjetas (uno cada 9 frames), después se completan el resto de modalidades y se guarda
  const toques = ELEGIDAS.map((_, i) => 10 + i * 9);
  const elegidas = toques.filter((t) => frame >= t + 3).length;
  const completo = frame >= toques[4] + 14;
  const otras = suave(frame, toques[4] + 6, 10);
  const total = Math.round(elegidas + (completo ? 15 : otras * 15));
  const guardar = toques[4] + 26;
  const guardada = frame >= guardar + 8;
  const fase = frame < guardar - 4 ? 0 : frame < descubre - 2 ? 1 : 2;
  const titulares = ["ELIGE TUS FAVORITAS", "GUARDA TU QUINIELA", "COMPRUEBA TUS ACIERTOS"];
  const panel = entrada(frame, 0, 16);
  // Posiciones de las tarjetas (2 columnas) para el toque
  const tarjeta = (i: number) => ({ x: 316 + (i % 2) * 447, y: 922 + Math.floor(i / 2) * 150 });
  const actual = toques.findIndex((t) => frame >= t - 6 && frame < t + 6);
  const posToque = actual >= 0 ? tarjeta(actual) : frame >= guardar - 8 && frame < guardar + 10 ? { x: 840, y: 1330 } : null;
  const pulsoToque = actual >= 0 ? interpolate(frame, [toques[actual] - 2, toques[actual], toques[actual] + 4], [0, 1, 0], clamp) : interpolate(frame, [guardar - 2, guardar, guardar + 4], [0, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: V.papel }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <Guirnalda alto={10} />
      </div>
      {/* Titular publicitario */}
      <div style={{ position: "absolute", top: 205, left: 0, right: 0, textAlign: "center" }} key={fase}>
        <div
          style={{
            display: "inline-block",
            fontFamily: FUENTES.display,
            fontWeight: 800,
            fontSize: 70,
            letterSpacing: "-0.04em",
            color: V.blanco,
            backgroundColor: fase === 2 ? V.rosa : fase === 1 ? V.azulProfundo : V.tinta,
            padding: "8px 28px 14px",
            borderRadius: 18,
          }}
        >
          {titulares[fase]}
        </div>
      </div>
      {/* Panel "Mis cinco por modalidad" */}
      <div
        style={{
          position: "absolute",
          top: 330,
          left: 60,
          width: 960,
          backgroundColor: V.blanco,
          borderRadius: 34,
          boxShadow: "0 24px 60px rgba(23,19,68,.16)",
          padding: "34px 40px 30px",
          boxSizing: "border-box",
          transform: `perspective(2400px) rotateX(${(1 - panel) * 20}deg) translateY(${(1 - panel) * 200}px)`,
          opacity: panel,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <MiniLabel tam={18}>Tu pronóstico personal</MiniLabel>
            <div style={{ fontFamily: FUENTES.display, fontWeight: 800, fontSize: 54, letterSpacing: "-0.04em", color: V.tinta, marginTop: 6 }}>
              Mis cinco <span style={{ color: V.azulProfundo }}>por modalidad.</span>
            </div>
          </div>
          <div style={{ fontFamily: FUENTES.display, fontWeight: 800, fontSize: 64, color: V.tinta, letterSpacing: "-0.05em" }}>
            {total}
            <span style={{ fontSize: 28, color: V.textoApagado }}>/20</span>
          </div>
        </div>
        {/* Pestañas por modalidad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 20 }}>
          {ORDEN.map((mo) => {
            const d = MODALIDADES[mo];
            const sel = mo === "Comparsa";
            const n = sel ? elegidas : Math.round(otras * 5);
            return (
              <div key={mo} style={{ borderRadius: 14, padding: "10px 12px", border: `2px solid ${sel ? d.color : "rgba(23,19,68,.09)"}`, backgroundColor: sel ? d.pale : V.blanco }}>
                <div style={{ fontFamily: FUENTES.texto, fontWeight: 800, fontSize: 22, color: V.tinta }}>{d.plural}</div>
                <div style={{ fontFamily: FUENTES.texto, fontWeight: 700, fontSize: 20, color: n === 5 ? d.ink : V.textoApagado }}>{n}/5</div>
              </div>
            );
          })}
        </div>
        {/* Huecos de "Tus cinco comparsas" */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
          {Array.from({ length: 5 }, (_, i) => {
            const lleno = i < elegidas;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, height: 46, borderRadius: 12, padding: "0 16px", backgroundColor: lleno ? MODALIDADES.Comparsa.pale : "#F7F5EF", border: lleno ? `2px solid ${V.azul}` : "2px dashed rgba(23,19,68,.12)" }}>
                <span style={{ fontFamily: FUENTES.display, fontWeight: 800, fontSize: 24, color: V.azulProfundo }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ fontFamily: FUENTES.texto, fontWeight: lleno ? 800 : 500, fontSize: 24, color: lleno ? V.tinta : V.textoApagado }}>{lleno ? DEMO_COMPARSAS[ELEGIDAS[i]].nombre : "Tu próxima elección"}</span>
              </div>
            );
          })}
        </div>
        {/* Tarjetas de elección (.choice-card) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
          {DEMO_COMPARSAS.map((g, i) => {
            const sel = ELEGIDAS.indexOf(i) >= 0 && ELEGIDAS.indexOf(i) < elegidas;
            const tap = ELEGIDAS.indexOf(i) >= 0 ? interpolate(frame, [toques[ELEGIDAS.indexOf(i)] - 1, toques[ELEGIDAS.indexOf(i)] + 2, toques[ELEGIDAS.indexOf(i)] + 8], [1, 0.95, 1], clamp) : 1;
            return (
              <div
                key={g.nombre}
                style={{
                  height: 136,
                  boxSizing: "border-box",
                  borderRadius: 18,
                  border: `2px solid ${sel ? V.azul : "rgba(23,19,68,.09)"}`,
                  borderTop: `6px solid ${V.azul}`,
                  backgroundColor: sel ? MODALIDADES.Comparsa.pale : V.blanco,
                  padding: "10px 16px",
                  display: "flex",
                  flexDirection: "column",
                  scale: tap,
                  opacity: i === 5 && elegidas === 5 ? 0.7 : 1,
                }}
              >
                <span style={{ fontFamily: FUENTES.texto, fontWeight: 800, fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase", color: MODALIDADES.Comparsa.ink }}>Comparsa</span>
                <strong style={{ fontFamily: FUENTES.display, fontWeight: 800, fontSize: 28, lineHeight: 1, letterSpacing: "-0.03em", color: V.tinta, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.nombre}</strong>
                <small style={{ fontFamily: FUENTES.texto, fontWeight: 500, fontSize: 16, color: "#68647d", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.autor}</small>
                <b style={{ marginTop: "auto", fontFamily: FUENTES.texto, fontWeight: 800, fontSize: 18, color: sel ? V.azulProfundo : V.tinta }}>{sel ? "✓ En mis cinco" : "Añadir a mis cinco"}</b>
              </div>
            );
          })}
        </div>
        {/* Barra de guardado (.five-save-bar) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, gap: 16 }}>
          <div>
            <div style={{ fontFamily: FUENTES.texto, fontWeight: 800, fontSize: 24, color: V.tinta }}>{total === 20 ? "Tus veinte están listas." : `Te quedan ${20 - total} agrupaciones por elegir.`}</div>
            <div style={{ fontFamily: FUENTES.texto, fontWeight: 500, fontSize: 18, color: V.textoApagado }}>{guardada ? "Quiniela guardada" : "Cambios sin guardar en tu cuenta"}</div>
          </div>
          <Boton tam={24} pulsado={interpolate(frame, [guardar - 2, guardar, guardar + 5], [0, 0.5, 1], clamp)}>
            Guardar mi quiniela
          </Boton>
        </div>
      </div>
      {/* Mensaje real tras guardar */}
      {guardada ? (
        <div
          style={{
            position: "absolute",
            left: 90,
            right: 90,
            top: 1060,
            backgroundColor: V.tinta,
            color: V.blanco,
            borderRadius: 20,
            padding: "22px 28px",
            fontFamily: FUENTES.texto,
            fontWeight: 700,
            fontSize: 30,
            lineHeight: 1.35,
            boxShadow: "0 24px 60px rgba(23,19,68,.3)",
            scale: entrada(frame, guardar + 8, 14),
            opacity: 1 - suave(frame, durationInFrames - 8, 8),
          }}
        >
          <span style={{ color: V.verde }}>✓ </span>Quiniela guardada. Vuelve al terminar el concurso para comprobar tus aciertos.
        </div>
      ) : null}
      {posToque ? <Toque x={posToque.x} y={posToque.y} pulso={pulsoToque} /> : null}
    </AbsoluteFill>
  );
};

/* ---------- 5. ¡Habrá premio! ---------- */

const Trofeo: React.FC<{ readonly brillo: number }> = ({ brillo }) => (
  <svg width={420} height={460} viewBox="0 0 120 130" style={{ filter: `drop-shadow(0 0 ${30 * brillo}px ${V.amarillo})` }}>
    <path d="M30 10 H90 V40 C90 62 76 76 60 78 C44 76 30 62 30 40 Z" fill={V.amarillo} />
    <path d="M30 18 H14 C14 40 22 50 34 52 M90 18 H106 C106 40 98 50 86 52" fill="none" stroke={V.amarillo} strokeWidth={7} strokeLinecap="round" />
    <rect x={52} y={78} width={16} height={22} fill={V.amarillo} />
    <rect x={36} y={100} width={48} height={10} rx={3} fill={V.amarillo} />
    <rect x={28} y={110} width={64} height={12} rx={4} fill={V.amarillo} />
    <path d="M44 22 C44 44 50 58 58 64" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={5} strokeLinecap="round" />
  </svg>
);

export const Premio: React.FC = () => {
  const frame = useCurrentFrame();
  const premio = f("premio");
  const aparece = entrada(frame, premio - 10, 18, 11);
  return (
    <AbsoluteFill style={{ backgroundColor: V.tinta, overflow: "hidden" }}>
      {/* Haces de luz giratorios */}
      <AbsoluteFill style={{ opacity: 0.35 * aparece }}>
        <div style={{ position: "absolute", left: 540 - 1100, top: 660 - 1100, width: 2200, height: 2200, rotate: `${frame * 0.4}deg`, background: `repeating-conic-gradient(${V.amarillo}55 0deg 8deg, transparent 8deg 24deg)`, maskImage: "radial-gradient(circle, black 0%, transparent 60%)" }} />
      </AbsoluteFill>
      <Particulas cantidad={30} colores={[V.amarillo, V.blanco]} />
      <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", justifyContent: "center", scale: interpolate(aparece, [0, 1], [0.3, 1]), opacity: aparece, translate: `0px ${Math.sin(frame / 14) * 8}px` }}>
        <Trofeo brillo={0.6 + 0.4 * Math.sin(frame / 8)} />
      </div>
      <div style={{ position: "absolute", top: 830, left: 0, right: 0 }}>
        <Linea desde={premio - 4} tam={150} color={V.amarillo} alinear="center">
          ¡HABRÁ PREMIO!
        </Linea>
        <Linea desde={premio + 4} tam={66} alinear="center">
          PARA EL GANADOR
        </Linea>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 24, opacity: suave(frame, f("detalles") - 30, 10) }}>
          <div style={{ fontFamily: FUENTES.texto, fontWeight: 800, fontSize: 34, letterSpacing: "0.12em", color: V.tinta, backgroundColor: V.blanco, padding: "10px 26px", borderRadius: 999 }}>PRÓXIMAMENTE, MÁS DETALLES</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 6. Llamada a la acción ---------- */

export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const quiniela = f("quiniela");
  const latido = 1 + Math.max(0, Math.sin((frame - quiniela) / 6)) * 0.05 * (frame > quiniela ? 1 : 0);
  return (
    <AbsoluteFill style={{ backgroundColor: V.azul }}>
      <Particulas cantidad={24} colores={[V.blanco, V.amarillo]} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <Guirnalda alto={18} />
      </div>
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, opacity: suave(frame, 0, 10), scale: interpolate(entrada(frame, 0, 16), [0, 1], [1.4, 1]) }}>
        <Img src={staticFile("votacoac/icono.png")} style={{ width: 170, height: 170, borderRadius: 40, boxShadow: "0 20px 50px rgba(23,19,68,.35)" }} />
        <Wordmark tam={96} claro colorCoac={V.tinta} giro={Math.sin(frame / 9) * 14} />
      </div>
      <div style={{ position: "absolute", top: 640, left: 0, right: 0 }}>
        <Linea desde={6} tam={124} alinear="center">
          ¿TE ATREVES
        </Linea>
        <Linea desde={10} tam={124} color={V.amarillo} alinear="center">
          A ACERTAR?
        </Linea>
      </div>
      <div style={{ position: "absolute", top: 960, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ scale: latido * entrada(frame, 14, 14, 11) }}>
          <Boton tam={52} fondo={V.amarillo}>
            HAZ TU QUINIELA YA
          </Boton>
        </div>
        <div style={{ fontFamily: FUENTES.display, fontWeight: 800, fontSize: 104, letterSpacing: "-0.04em", color: V.tinta, backgroundColor: V.blanco, padding: "6px 34px 14px", borderRadius: 24, opacity: suave(frame, quiniela - 30, 10), translate: `0px ${(1 - suave(frame, quiniela - 30, 12)) * 40}px` }}>
          VOTACOAC.ES
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <Guirnalda alto={18} />
      </div>
    </AbsoluteFill>
  );
};

