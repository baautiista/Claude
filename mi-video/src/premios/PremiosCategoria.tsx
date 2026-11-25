/**
 * Componente maestro de los vídeos de los Premios InfoLinense 2026.
 * Cada categoría se genera desde los datos oficiales (datos.json) y su locución (tiempos-locucion.ts):
 * apertura · categoría · candidaturas (mismo tiempo y mismo tratamiento) · cómo votar · cierre.
 */
import { Audio } from "@remotion/media";
import type { Caption } from "@remotion/captions";
import { loadFont } from "@remotion/fonts";
import { useMemo } from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { crearTiempos } from "../marca/guion";
import { existe } from "../marca/marca";
import { Movil } from "../marca/Movil";
import { categoriaDe, PATROCINIO, WEB, type Categoria, type Nominado } from "./guion";
import { GUIONES, TIEMPOS_LOCUCION } from "./tiempos-locucion";

/* ---------- Identidad oficial (docs/IDENTIDAD.md del repositorio de los premios) ---------- */

export const P = {
  electrico: "#1F5EFF",
  noche: "#061E5C",
  navy: "#081A54",
  mist: "#C3D2FF",
  lima: "#C8F031",
  blanco: "#FFFFFF",
  fondo: "linear-gradient(200deg, #154DD5 0%, #1038AC 38%, #0C2A89 70%, #081D61 100%)",
} as const;
const RALEWAY = "Raleway";
const POPPINS = "Poppins Premios";
loadFont({ family: RALEWAY, url: staticFile("premios/fonts/raleway-latin-wght.woff"), weight: "100 900" });
loadFont({ family: POPPINS, url: staticFile("premios/fonts/poppins-latin-bold.woff"), weight: "700" });

const CURVA =
  "M-60 418 C 60 392 210 400 300 470 C 390 540 425 610 368 712 C 300 832 150 935 70 1035 C -10 1135 -20 1240 20 1345 C 110 1560 420 1770 860 1795 C 1250 1815 1560 1690 1790 1545";
const LOGO = staticFile("premios/marca/logo-premios.png");
const LOGO_INFOLINENSE = staticFile("premios/marca/infolinense.png");
const SEGURA = { arriba: 210, abajo: 400, lados: 80 } as const;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const suave = (f: number, d: number, dur: number) => interpolate(f, [d, d + dur], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });

/* ---------- Tiempos de cada categoría ---------- */

const tiemposDe = (slug: string) => {
  return crearTiempos({
    escenas: GUIONES[slug],
    datos: TIEMPOS_LOCUCION[slug],
    firmaSegundos: 0,
    colaFinal: 2.2,
    maxCaracteresSubtitulo: 30,
  });
};

/** Duración en frames del vídeo de una categoría (para Root). */
export const duracionPremios = (slug: string) => tiemposDe(slug).duracionTotal();

/* ---------- Piezas ---------- */

const Fondo: React.FC<{ readonly dibujo?: number }> = ({ dibujo = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: P.fondo }}>
      <svg viewBox="0 0 1725 2156" preserveAspectRatio="xMinYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", translate: `0px ${Math.sin(frame / 90) * 10}px` }}>
        <path d={CURVA} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={92} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - dibujo} />
      </svg>
    </AbsoluteFill>
  );
};

/** Etiqueta de categoría con su color oficial (como CategoryTag de la web). */
const Etiqueta: React.FC<{ readonly c: Categoria; readonly tam?: number }> = ({ c, tam = 30 }) => (
  <div style={{ display: "inline-block", backgroundColor: c.color, color: c.tinta, fontFamily: POPPINS, fontWeight: 700, fontSize: tam, letterSpacing: tam * 0.08, textTransform: "uppercase", padding: `${tam * 0.3}px ${tam * 0.6}px ${tam * 0.24}px`, borderRadius: tam * 0.4, boxShadow: c.color === P.navy || c.color === "#081A54" ? `inset 0 0 0 2px ${P.mist}66` : undefined }}>
    {c.nombre}
  </div>
);

/** Línea de titular con máscara (Raleway ExtraBold, interletrado −0,035 em). */
const Linea: React.FC<{ readonly children: React.ReactNode; readonly desde: number; readonly tam: number; readonly color?: string }> = ({ children, desde, tam, color = P.blanco }) => {
  const frame = useCurrentFrame();
  const p = suave(frame, desde, 16);
  return (
    <div style={{ overflow: "hidden", paddingBottom: tam * 0.08 }}>
      <div style={{ fontFamily: RALEWAY, fontWeight: 800, fontSize: tam, lineHeight: 1.0, letterSpacing: "-0.035em", color, translate: `0px ${(1 - p) * 110}%` }}>{children}</div>
    </div>
  );
};

const iniciales = (nombre: string) => {
  const w = nombre
    .replace(/\(.*?\)/g, "")
    .replace(/[«»"]/g, "")
    .split(/[\s—–-]+/)
    .filter((x) => /^[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(x) && !/^(de|del|la|las|los|el|y|con)$/i.test(x));
  return (w[0]?.[0] ?? "") + (w[1]?.[0] ?? "");
};

/** Retrato 4:5: fotografía oficial sin retocar (public/premios/fotos/<slug>.jpg) o, si no hay, iniciales (como la web). */
const Retrato: React.FC<{ readonly n: Nominado; readonly c: Categoria; readonly ancho: number }> = ({ n, c, ancho }) => {
  const frame = useCurrentFrame();
  const archivo = `premios/fotos/${n.slug}.jpg`;
  const mascara = suave(frame, 2, 18);
  const alto = Math.round(ancho * 1.25);
  return (
    <div style={{ position: "relative", width: ancho, height: alto, borderRadius: 34, overflow: "hidden", clipPath: `inset(${(1 - mascara) * 100}% 0 0 0 round 34px)`, boxShadow: "0 30px 60px rgba(4,12,48,0.45)" }}>
      {existe(archivo) ? (
        <Img src={staticFile(archivo)} style={{ width: "100%", height: "100%", objectFit: "cover", scale: interpolate(frame, [0, 200], [1.06, 1.0], clamp) }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg, ${c.color}55, rgba(8,26,84,0.6) 70%)`, boxShadow: `inset 0 0 0 2px ${c.color}88`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 1725 2156" preserveAspectRatio="xMinYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <path d={CURVA} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={92} strokeLinecap="round" />
          </svg>
          <span style={{ position: "relative", fontFamily: RALEWAY, fontWeight: 800, fontSize: ancho * 0.36, letterSpacing: "-0.03em", color: "rgba(255,255,255,0.92)" }}>{iniciales(n.nombre)}</span>
        </div>
      )}
      {n.credito ? <div style={{ position: "absolute", right: 12, bottom: 10, fontFamily: RALEWAY, fontWeight: 600, fontSize: 18, color: "rgba(255,255,255,0.8)" }}>{n.credito}</div> : null}
    </div>
  );
};

/** Tamaño de letra según longitud, para que todo quepa con la misma jerarquía. */
const ajustar = (texto: string, base: number, largoMax: number, min: number) => Math.max(min, Math.min(base, Math.round((base * largoMax) / Math.max(largoMax, texto.length))));

/* ---------- Escenas ---------- */

const Apertura: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = suave(frame, 4, 24);
  const brillo = interpolate(frame, [14, 44], [-0.3, 1.3], clamp);
  return (
    <AbsoluteFill>
      <Fondo dibujo={suave(frame, 0, 40)} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 180 }}>
        <div style={{ position: "relative", opacity: logo, scale: interpolate(logo, [0, 1], [1.18, 1]), clipPath: `inset(0 ${(1 - logo) * 100}% 0 0)` }}>
          <Img src={LOGO} style={{ width: 900 }} />
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(105deg, transparent ${brillo * 100 - 14}%, rgba(255,255,255,0.55) ${brillo * 100}%, transparent ${brillo * 100 + 14}%)`, mixBlendMode: "overlay" }} />
        </div>
        <div style={{ marginTop: 40, fontFamily: POPPINS, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: P.mist, opacity: suave(frame, 26, 14) }}>I EDICIÓN · 2026</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Patrocinio: React.FC<{ readonly c: Categoria; readonly desde: number }> = ({ c, desde }) => {
  const frame = useCurrentFrame();
  const pat = PATROCINIO[c.slug];
  if (!pat) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: suave(frame, desde, 14) }}>
      <div style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 22, letterSpacing: 3, color: P.mist, textTransform: "uppercase" }}>Patrocina</div>
      <Img src={staticFile(pat.logo)} style={{ height: pat.nombre === "Carnavalinense" ? 70 : 96, borderRadius: pat.nombre === "Carnavalinense" ? 0 : 48 }} />
    </div>
  );
};

const PresentaCategoria: React.FC<{ readonly c: Categoria }> = ({ c }) => {
  const frame = useCurrentFrame();
  const titulo = c.titulo ?? c.nombre;
  const lema = c.pregunta ?? c.descripcion ?? "";
  return (
    <AbsoluteFill>
      <Fondo />
      <div style={{ position: "absolute", top: SEGURA.arriba + 190, left: SEGURA.lados, right: SEGURA.lados }}>
        <div style={{ opacity: suave(frame, 0, 10), translate: `${(1 - suave(frame, 0, 14)) * -60}px 0px` }}>
          <Etiqueta c={c} tam={34} />
        </div>
        <div style={{ marginTop: 40 }}>
          {titulo
            .split(" ")
            .reduce<string[]>((ls, w) => {
              const u = ls[ls.length - 1];
              if (u && (u + " " + w).length <= 13) ls[ls.length - 1] = u + " " + w;
              else ls.push(w);
              return ls;
            }, [])
            .map((l, i) => (
              <Linea key={l + i} desde={6 + i * 4} tam={ajustar(titulo, 150, 18, 112)}>
                {l}
              </Linea>
            ))}
        </div>
        <div style={{ marginTop: 34, width: 120, height: 10, borderRadius: 5, backgroundColor: c.color === "#081A54" ? P.lima : c.color, scale: `${suave(frame, 16, 16)} 1`, transformOrigin: "0% 50%" }} />
        <div style={{ marginTop: 30, fontFamily: RALEWAY, fontWeight: 600, fontSize: ajustar(lema, 54, 90, 42), lineHeight: 1.22, color: P.blanco, opacity: suave(frame, 20, 16), translate: `0px ${(1 - suave(frame, 20, 16)) * 30}px` }}>{lema}</div>
        <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 18, opacity: suave(frame, 30, 12) }}>
          <div style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 28, letterSpacing: 3, color: P.navy, backgroundColor: P.blanco, padding: "8px 18px 6px", borderRadius: 999 }}>{c.nominados.length} CANDIDATURAS</div>
        </div>
        <div style={{ marginTop: 40 }}>
          <Patrocinio c={c} desde={34} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Ficha de una candidatura: idéntica estructura para todas. */
const Candidatura: React.FC<{ readonly c: Categoria; readonly n: Nominado; readonly i: number }> = ({ c, n, i }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const sale = suave(frame, durationInFrames - 8, 8);
  const merito = n.meritos[0];
  const tamNombre = ajustar(n.nombre, 96, 18, 58);
  return (
    <AbsoluteFill>
      <Fondo />
      <AbsoluteFill style={{ opacity: 1 - sale, translate: `${-sale * 120}px 0px` }}>
        <div style={{ position: "absolute", top: SEGURA.arriba + 10, left: SEGURA.lados, right: SEGURA.lados, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Etiqueta c={c} tam={24} />
          <div style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 30, letterSpacing: 2, color: P.mist }}>
            <span style={{ color: P.blanco }}>{String(i + 1).padStart(2, "0")}</span> / {String(c.nominados.length).padStart(2, "0")}
          </div>
        </div>
        <div style={{ position: "absolute", top: 300, left: SEGURA.lados }}>
          <Retrato n={n} c={c} ancho={440} />
        </div>
        <div style={{ position: "absolute", top: 320, left: 560, right: SEGURA.lados, opacity: suave(frame, 10, 14), translate: `${(1 - suave(frame, 10, 16)) * 60}px 0px` }}>
          <div style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 22, letterSpacing: 3, color: P.mist, textTransform: "uppercase" }}>Candidatura</div>
          <div style={{ marginTop: 14, fontFamily: RALEWAY, fontWeight: 600, fontSize: ajustar(n.subtitulo ?? "", 38, 60, 28), lineHeight: 1.28, color: P.blanco }}>{n.subtitulo}</div>
        </div>
        <div style={{ position: "absolute", top: 890, left: SEGURA.lados, right: SEGURA.lados }}>
          <Linea desde={6} tam={tamNombre}>
            {n.nombre}
          </Linea>
          <div style={{ marginTop: 22, fontFamily: RALEWAY, fontWeight: 500, fontSize: ajustar(n.motivo, 40, 160, 30), lineHeight: 1.3, color: "rgba(255,255,255,0.92)", opacity: suave(frame, 16, 16), translate: `0px ${(1 - suave(frame, 16, 16)) * 24}px` }}>{n.motivo}</div>
          {merito ? (
            <div style={{ marginTop: 24, display: "flex", gap: 16, alignItems: "flex-start", opacity: suave(frame, 30, 14), translate: `${(1 - suave(frame, 30, 16)) * -40}px 0px` }}>
              <div style={{ flexShrink: 0, fontFamily: POPPINS, fontWeight: 700, fontSize: 24, letterSpacing: 2, color: P.navy, backgroundColor: P.lima, padding: "8px 14px 6px", borderRadius: 8, marginTop: 4 }}>MÉRITO</div>
              <div style={{ fontFamily: RALEWAY, fontWeight: 700, fontSize: ajustar(merito, 34, 110, 28), lineHeight: 1.28, color: P.blanco }}>{merito}</div>
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Procedimiento real de votación (src/app/pages/vote.tsx y «Sistema de votación»). */
const Votar: React.FC<{ readonly c: Categoria; readonly marcas: readonly number[] }> = ({ c, marcas }) => {
  const frame = useCurrentFrame();
  const paso = marcas.filter((m) => frame >= m).length - 1;
  const pasos = [`Entra en ${WEB}`, "Pulsa «Vota»", "Elige tu candidatura", "Revisa tu papeleta", "Confirma tu voto"];
  const tap = (d: number) => interpolate(frame, [d - 2, d + 2, d + 8], [1, 0.93, 1], clamp);
  /** Pantalla visible desde el paso `desde` hasta el paso `hasta` (excluido). */
  const pantalla = (desde: number, hasta?: number) => ({ position: "absolute" as const, inset: 0, opacity: suave(frame, desde === 0 ? 0 : marcas[desde], 8) * (hasta !== undefined && hasta < marcas.length ? 1 - suave(frame, marcas[hasta], 6) : 1) });
  // Neutralidad: la demostración no selecciona a ninguna candidatura concreta; el foco recorre todas por igual.
  const foco = Math.floor(Math.max(0, frame - marcas[2]) / 7) % c.nominados.length;
  return (
    <AbsoluteFill>
      <Fondo />
      <div style={{ position: "absolute", top: SEGURA.arriba + 10, left: SEGURA.lados, right: SEGURA.lados }}>
        <div style={{ fontFamily: POPPINS, fontWeight: 700, fontSize: 24, letterSpacing: 4, color: P.lima }}>CÓMO VOTAR</div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 18 }}>
          <span style={{ fontFamily: RALEWAY, fontWeight: 800, fontSize: 96, color: P.lima, letterSpacing: "-0.04em", lineHeight: 1 }}>{Math.max(1, paso + 1)}</span>
          <span key={paso} style={{ fontFamily: RALEWAY, fontWeight: 800, fontSize: 54, color: P.blanco, letterSpacing: "-0.03em", lineHeight: 1.05, opacity: suave(frame, marcas[Math.max(0, paso)], 8) }}>{pasos[Math.max(0, paso)]}</span>
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
          {pasos.map((_, k) => (
            <div key={k} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: k <= paso ? P.lima : "rgba(255,255,255,0.2)" }} />
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", top: 510, left: 540 - 225, scale: interpolate(suave(frame, 0, 16), [0, 1], [0.9, 1]), opacity: suave(frame, 0, 10) }}>
        <Movil ancho={450}>
          <div style={{ position: "absolute", inset: 0, background: P.fondo, fontFamily: RALEWAY, color: P.blanco }}>
            {/* 1-2: portada con el botón Vota */}
            <div style={pantalla(0, 2)}>
              <div style={{ margin: "54px 20px 0", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, padding: "10px 16px", fontSize: 19, fontWeight: 700 }}>{WEB}</div>
              <div style={{ margin: "40px 24px 0" }}>
                <Img src={LOGO} style={{ width: 300 }} />
              </div>
              <div style={{ margin: "40px 24px 0", fontSize: 18, color: P.mist, fontWeight: 600 }}>Votación popular · 2026</div>
              <div style={{ margin: "26px 24px 0", display: "inline-block", backgroundColor: P.lima, color: P.navy, fontFamily: POPPINS, fontWeight: 700, fontSize: 26, padding: "14px 30px 12px", borderRadius: 999, scale: tap(marcas[1] + 6) }}>Vota</div>
            </div>
            {/* 3: papeleta con la categoría */}
            <div style={pantalla(2, 3)}>
              <div style={{ margin: "54px 22px 0", fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em" }}>Tu papeleta</div>
              <div style={{ margin: "16px 22px 0" }}>
                <Etiqueta c={c} tam={15} />
              </div>
              <div style={{ margin: "14px 18px 0", display: "flex", flexDirection: "column", gap: 10 }}>
                {c.nominados.map((n, k) => {
                  const sel = k === foco;
                  return (
                    <div key={n.slug} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, backgroundColor: sel ? "rgba(200,240,49,0.18)" : "rgba(255,255,255,0.08)", boxShadow: sel ? `inset 0 0 0 2px ${P.lima}` : "inset 0 0 0 1px rgba(255,255,255,0.15)", scale: 1 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 11, border: `3px solid ${sel ? P.lima : "rgba(255,255,255,0.6)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>

                      </div>
                      <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.nombre}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* 4: revisar papeleta */}
            <div style={pantalla(3, 4)}>
              <div style={{ margin: "54px 22px 0", fontSize: 30, fontWeight: 800 }}>Revisa tu papeleta</div>
              <div style={{ margin: "20px 18px 0", padding: "14px 16px", borderRadius: 16, backgroundColor: "rgba(255,255,255,0.1)" }}>
                <Etiqueta c={c} tam={14} />
                <div style={{ marginTop: 10, fontSize: 20, fontWeight: 800 }}>Tu candidatura</div>
              </div>
              <div style={{ margin: "26px 18px 0", display: "inline-block", backgroundColor: P.blanco, color: P.navy, fontFamily: POPPINS, fontWeight: 700, fontSize: 20, padding: "12px 22px 10px", borderRadius: 999, scale: tap(marcas[3] + 10) }}>Revisar papeleta</div>
            </div>
            {/* 5: confirmar y comprobante */}
            <div style={pantalla(4)}>
              <div style={{ margin: "54px 22px 0", fontSize: 24, fontWeight: 800 }}>Antes de confirmar</div>
              <div style={{ margin: "10px 22px 0", fontSize: 16, color: P.mist, fontWeight: 600, lineHeight: 1.35 }}>Una vez confirmada, tu papeleta no se puede modificar ni repetir.</div>
              <div style={{ margin: "14px 22px 0", fontSize: 14, color: P.mist, fontWeight: 600 }}>✓ Verificación anti-bots</div>
              <div style={{ margin: "18px 22px 0", display: "inline-block", backgroundColor: P.lima, color: P.navy, fontFamily: POPPINS, fontWeight: 700, fontSize: 21, padding: "12px 22px 10px", borderRadius: 999, scale: tap(marcas[4] + 10) }}>Confirmar mi voto</div>
              <div style={{ margin: "30px 18px 0", padding: "16px", borderRadius: 16, backgroundColor: "rgba(200,240,49,0.15)", boxShadow: `inset 0 0 0 2px ${P.lima}`, opacity: suave(frame, marcas[4] + 22, 10) }}>
                <div style={{ fontSize: 22, fontWeight: 800 }}>Papeleta registrada</div>
                <div style={{ marginTop: 6, fontSize: 15, color: P.mist, fontWeight: 600 }}>Tu código de comprobante</div>
              </div>
            </div>
          </div>
        </Movil>
      </div>
    </AbsoluteFill>
  );
};

const Cierre: React.FC<{ readonly c: Categoria; readonly segunda: number }> = ({ c, segunda }) => {
  const frame = useCurrentFrame();
  const logo = suave(frame, 0, 20);
  return (
    <AbsoluteFill>
      <Fondo />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: SEGURA.arriba + 70 }}>
        <Img src={LOGO} style={{ width: 760, opacity: logo, scale: interpolate(logo, [0, 1], [0.9, 1]) }} />
        <div style={{ marginTop: 70, textAlign: "center" }}>
          <Linea desde={8} tam={76}>
            El talento es linense.
          </Linea>
          <Linea desde={14} tam={76} color={P.lima}>
            La decisión es tuya.
          </Linea>
        </div>
        <div style={{ marginTop: 40, fontFamily: RALEWAY, fontWeight: 700, fontSize: 40, color: P.blanco, opacity: suave(frame, segunda - 4, 12) }}>Vota en los Premios InfoLinense 2026</div>
        <div style={{ marginTop: 28, backgroundColor: P.lima, color: P.navy, fontFamily: POPPINS, fontWeight: 700, fontSize: 46, padding: "16px 36px 12px", borderRadius: 999, opacity: suave(frame, segunda, 12), scale: interpolate(suave(frame, segunda, 14), [0, 1], [0.85, 1]) }}>{WEB}</div>
        <div style={{ marginTop: 50, display: "flex", alignItems: "center", gap: 36, opacity: suave(frame, segunda + 10, 14) }}>
          <div style={{ backgroundColor: P.blanco, borderRadius: 16, padding: "14px 22px" }}>
            <Img src={LOGO_INFOLINENSE} style={{ height: 46 }} />
          </div>
          <Patrocinio c={c} desde={segunda + 10} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Subtítulos sincronizados: una línea, palabra activa en lima, sobre la zona segura inferior. */
const Subtitulos: React.FC<{ readonly captions: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const paginas = useMemo(() => {
    const out: Caption[][] = [];
    let a: Caption[] = [];
    for (const c of captions) {
      a.push(c);
      if (c.pageBreakAfter) {
        out.push(a);
        a = [];
      }
    }
    if (a.length) out.push(a);
    return out;
  }, [captions]);
  const pag = paginas.find((p, i) => {
    const sig = paginas[i + 1];
    const fin = sig ? Math.min(sig[0].startMs, p[p.length - 1].endMs + 300) : p[p.length - 1].endMs + 300;
    return ms >= p[0].startMs && ms < fin;
  });
  if (!pag) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: SEGURA.abajo + 20 }}>
      <div style={{ backgroundColor: "rgba(6,30,92,0.88)", borderRadius: 14, padding: "10px 22px 12px", fontFamily: RALEWAY, fontWeight: 700, fontSize: 42, color: P.blanco, maxWidth: 920, textAlign: "center" }}>
        {pag.map((p, i) => (
          <span key={i} style={{ whiteSpace: "pre", color: ms >= p.startMs && ms < p.endMs ? P.lima : P.blanco }}>
            {p.text}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Composición maestra ---------- */

export const PremiosCategoria: React.FC<{ readonly slug: string }> = ({ slug }) => {
  const { fps, durationInFrames } = useVideoConfig();
  const c = categoriaDe(slug);
  const t = useMemo(() => tiemposDe(slug), [slug]);
  const captions = useMemo(() => t.subtitulos(), [t]);
  const F = (s: number) => Math.round(s * fps);
  const escena = (id: string) => t.getEscena(id);
  const tramo = (id: string, ultima = false) => {
    const e = escena(id);
    return { from: F(e.inicio), durationInFrames: (ultima ? durationInFrames : F(e.fin)) - F(e.inicio) };
  };
  const votar = escena("votar");
  // Marcas de cada paso de la votación, ancladas a la locución
  const fv = (frase: number, palabra?: string) => F(t.segundoDe({ escena: "votar", frase, palabra }) - votar.inicio);
  const marcas = [0, fv(0, "pulsa"), fv(1, "Elige"), fv(1, "revisa"), fv(1, "confirma")];
  const cierre = escena("cierre");
  const segunda = F(t.segundoDe({ escena: "cierre", frase: 1 }) - cierre.inicio);
  const locucion = `premios/${slug}/locucion.mp3`;
  const musica = "premios/musica.mp3";
  const duracionMusica = 56;
  return (
    <AbsoluteFill style={{ background: P.fondo }}>
      <Sequence name="Apertura" {...tramo("apertura")} premountFor={fps}>
        <Apertura />
      </Sequence>
      <Sequence name="Categoría" {...tramo("categoria")} premountFor={fps}>
        <PresentaCategoria c={c} />
      </Sequence>
      {c.nominados.map((n, i) => (
        <Sequence key={n.slug} name={n.nombre} {...tramo(`n${i}`)} premountFor={fps}>
          <Candidatura c={c} n={n} i={i} />
        </Sequence>
      ))}
      <Sequence name="Cómo votar" {...tramo("votar")} premountFor={fps}>
        <Votar c={c} marcas={marcas} />
      </Sequence>
      <Sequence name="Cierre" {...tramo("cierre", true)} premountFor={fps}>
        <Cierre c={c} segunda={segunda} />
      </Sequence>
      <Sequence name="Subtítulos">
        <Subtitulos captions={captions} />
      </Sequence>
      {existe(locucion) ? <Audio name="Locución" src={staticFile(locucion)} /> : null}
      {existe(musica) ? (
        <Audio
          name="Música"
          src={staticFile(musica)}
          trimBefore={Math.max(0, F(duracionMusica) - durationInFrames)}
          volume={(f) => interpolate(f, [0, 8, durationInFrames - 6, durationInFrames], [0, 0.16, 0.2, 0.2], clamp)}
        />
      ) : null}
    </AbsoluteFill>
  );
};
