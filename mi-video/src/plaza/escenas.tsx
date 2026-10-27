import { Video } from "@remotion/media";
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { Contador } from "../marca/Contador";
import { Etiqueta } from "../marca/Etiqueta";
import { COLOR, FUENTE, ZONA_SEGURA, existe } from "../marca/marca";
import { Placeholder } from "../marca/Placeholder";
import { Tramo } from "../marca/Tramo";
import { AUDIO, DOCUMENTO_ZONAS, DURACION_FAST_MOTION, MOMENTOS, RECURSOS } from "./config";
import { DESPLAZAMIENTO, Diametros, MapaPlaza, PERGOLAS } from "./MapaPlaza";
import { frameEnEscena } from "./tiempos";

const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* ---------- Piezas comunes ---------- */

/** Imagen a pantalla completa con movimiento suave (o hueco si falta). */
const Imagen: React.FC<{
  readonly archivo: string;
  readonly nombre: string;
  readonly zoom?: [number, number];
  readonly enfoque?: string;
  readonly desde?: number;
  readonly hasta?: number;
}> = ({ archivo, nombre, zoom = [1.04, 1.14], enfoque = "50% 50%", desde = 0, hasta }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if (!existe(archivo)) return <Placeholder nombre={nombre} archivo={archivo.split("/").pop()} />;
  return (
    <Img
      src={staticFile(archivo)}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: enfoque,
        transformOrigin: enfoque,
        scale: interpolate(frame, [desde, hasta ?? durationInFrames], zoom, clamp),
      }}
    />
  );
};

/** Degradado oscuro arriba y abajo para leer rótulos y subtítulos sobre imagen. */
const Velo: React.FC<{ readonly fuerza?: number }> = ({ fuerza = 1 }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(180deg, rgba(10,10,10,${0.6 * fuerza}) 0%, rgba(10,10,10,0) 30%, rgba(10,10,10,0) 68%, rgba(10,10,10,${0.55 * fuerza}) 100%)`,
    }}
  />
);

/** Rótulo de pantalla: caja azul con texto blanco (o lima). */
const Rotulo: React.FC<{
  readonly lineas: readonly string[];
  readonly desde: number;
  readonly tamano?: number;
  readonly destacarUltima?: boolean;
}> = ({ lineas, desde, tamano = 86, destacarUltima = false }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
      {lineas.map((l, i) => {
        const p = entrada(frame, desde + i * 4, 12);
        const ultima = destacarUltima && i === lineas.length - 1;
        return (
          <div key={l} style={{ overflow: "hidden", padding: "2px 0" }}>
            <div
              style={{
                fontFamily: FUENTE.display,
                fontWeight: 800,
                fontSize: tamano,
                lineHeight: 1.02,
                letterSpacing: -tamano * 0.025,
                color: ultima ? COLOR.negro : COLOR.blanco,
                backgroundColor: ultima ? COLOR.lima : COLOR.azul,
                padding: "6px 22px 10px",
                borderRadius: 10,
                translate: `${(1 - p) * -105}% 0px`,
              }}
            >
              {l}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Etiqueta pequeña sobre una imagen (HOY, ASÍ SERÁ…). */
const Sello: React.FC<{ readonly texto: string; readonly fondo?: string; readonly color?: string; readonly style?: React.CSSProperties }> = ({
  texto,
  fondo = COLOR.negro,
  color = COLOR.blanco,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      backgroundColor: fondo,
      color,
      fontFamily: FUENTE.rotulo,
      fontWeight: 700,
      fontSize: 34,
      letterSpacing: 2,
      padding: "6px 18px",
      borderRadius: 8,
      ...style,
    }}
  >
    {texto}
  </div>
);

/** Tarjeta con imagen recortada (o hueco), borde blanco. */
const Tarjeta: React.FC<{
  readonly archivo: string;
  readonly nombre: string;
  readonly ancho: number;
  readonly alto: number;
  readonly enfoque?: string;
  readonly zoom?: number;
  readonly origen?: string;
  readonly children?: React.ReactNode;
}> = ({ archivo, nombre, ancho, alto, enfoque = "50% 50%", zoom = 1, origen = "50% 50%", children }) => (
  <div
    style={{
      position: "relative",
      width: ancho,
      height: alto,
      borderRadius: 24,
      overflow: "hidden",
      border: `6px solid ${COLOR.blanco}`,
      boxShadow: "0 24px 50px rgba(0,0,0,0.35)",
      backgroundColor: "#1747C9",
    }}
  >
    {existe(archivo) ? (
      <Img src={staticFile(archivo)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: enfoque, scale: zoom, transformOrigin: origen }} />
    ) : (
      <Placeholder nombre={nombre} archivo={archivo.split("/").pop()} compacto={alto < 500} />
    )}
    {children}
  </div>
);

/**
 * Fast motion aportado, entero y sin retocar. Si la escena dura más de 8 s, el
 * primer fotograma (extraído tal cual) espera al principio y el vídeo termina justo con la escena.
 */
const FastMotion: React.FC<{ readonly archivo: string; readonly primerFotograma: string; readonly nombre: string }> = ({
  archivo,
  primerFotograma,
  nombre,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const duracionVideo = Math.round(DURACION_FAST_MOTION * fps);
  const espera = Math.max(0, durationInFrames - duracionVideo);
  if (!existe(archivo)) return <Placeholder nombre={nombre} archivo={archivo.split("/").pop()} />;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.negro }}>
      {espera > 0 && existe(primerFotograma) ? (
        <Img src={staticFile(primerFotograma)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}
      <Sequence from={espera} durationInFrames={duracionVideo} premountFor={fps}>
        <Video src={staticFile(archivo)} objectFit="cover" volume={AUDIO.volumenAmbienteObra} style={{ width: "100%", height: "100%" }} />
      </Sequence>
    </AbsoluteFill>
  );
};

/** Barrido de fondo azul que cubre la pantalla al final de una escena (de abajo arriba). */
const BarridoSalida: React.FC<{ readonly frames?: number }> = ({ frames = 9 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = suave(frame, durationInFrames - frames, frames);
  if (p <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: COLOR.azul, clipPath: `inset(${100 - p * 100}% 0 0 0)` }} />;
};

/** Barrido azul que destapa la escena al principio (de abajo arriba). */
const BarridoEntrada: React.FC<{ readonly frames?: number }> = ({ frames = 10 }) => {
  const frame = useCurrentFrame();
  const p = suave(frame, 0, frames);
  if (p >= 1) return null;
  return <AbsoluteFill style={{ backgroundColor: COLOR.azul, clipPath: `inset(0 0 ${p * 100}% 0)` }} />;
};

/* ---------- 0. Gancho ---------- */

export const Gancho: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const flash = frame >= 22 && frame < 37;
  const linea = suave(frame, 40, durationInFrames - 46);
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.negro }}>
      <Imagen archivo={RECURSOS.actual[1]} nombre="Plaza hoy" zoom={[1.12, 1.02]} enfoque="50% 60%" />
      {flash ? <Imagen archivo={RECURSOS.renderFinal} nombre="Render" zoom={[1.1, 1.14]} enfoque="45% 50%" desde={22} hasta={37} /> : null}
      <Velo />
      <Sello texto={flash ? "ASÍ SERÁ" : "HOY"} fondo={flash ? COLOR.lima : COLOR.negro} color={flash ? COLOR.negro : COLOR.blanco} style={{ right: ZONA_SEGURA.lados, top: 560 }} />
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 20, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, display: "flex", flexDirection: "column", gap: 22 }}>
        <Etiqueta desde={0}>URBANISMO</Etiqueta>
        <Rotulo lineas={["MAÑANA COMIENZAN", "LAS OBRAS"]} desde={3} tamano={84} destacarUltima />
      </div>
      {/* Línea azul que recorre el suelo y lleva al documento */}
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <path d="M-40 1820 C 260 1640, 640 1640, 820 1420 S 1000 1000, 1120 900" fill="none" stroke={COLOR.azul} strokeWidth={22} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - linea} />
      </svg>
      <BarridoSalida frames={7} />
    </AbsoluteFill>
  );
};

/* ---------- 1. Presupuesto y plazo ---------- */

const Subrayado: React.FC<{ readonly zona: { x: number; y: number; ancho: number }; readonly progreso: number }> = ({ zona, progreso }) => (
  <div
    style={{
      position: "absolute",
      left: `${zona.x}%`,
      top: `${zona.y}%`,
      width: `${zona.ancho * progreso}%`,
      height: 10,
      backgroundColor: COLOR.azul,
      borderRadius: 5,
    }}
  />
);

export const Datos: React.FC = () => {
  const frame = useCurrentFrame();
  const millones = f("millones");
  const meses = f("meses");
  const hayDoc = existe(RECURSOS.documento);
  // Zoom del documento: hacia el presupuesto y después hacia el plazo
  const zoom = interpolate(frame, [0, millones - 4, meses], [1, 1.5, 1.6], clamp);
  const foco = interpolate(frame, [millones - 4, meses], [DOCUMENTO_ZONAS.presupuesto.y, DOCUMENTO_ZONAS.plazo.y], clamp);
  const barra = suave(frame, meses, 26);
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azul }}>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 10, left: ZONA_SEGURA.lados }}>
        <Etiqueta>EL PROYECTO</Etiqueta>
      </div>
      {/* Documento original */}
      <div
        style={{
          position: "absolute",
          top: 290,
          left: 130,
          width: 820,
          height: 540,
          borderRadius: 18,
          overflow: "hidden",
          backgroundColor: COLOR.blanco,
          boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
          rotate: "-2deg",
          scale: entrada(frame, 0, 14),
        }}
      >
        {hayDoc ? (
          <div style={{ position: "absolute", inset: 0, scale: zoom, transformOrigin: `30% ${foco}%` }}>
            <Img src={staticFile(RECURSOS.documento)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%" }} />
            <Subrayado zona={DOCUMENTO_ZONAS.presupuesto} progreso={suave(frame, millones - 2, 10)} />
            <Subrayado zona={DOCUMENTO_ZONAS.plazo} progreso={suave(frame, meses - 2, 10)} />
          </div>
        ) : (
          <Placeholder nombre="Documento del proyecto (presupuesto y plazo)" archivo="documento-presupuesto.jpg" />
        )}
      </div>
      {/* 4,9 millones */}
      <div style={{ position: "absolute", top: 880, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, opacity: suave(frame, millones - 3, 6) }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 22, fontFamily: FUENTE.display, fontWeight: 800, color: COLOR.lima, letterSpacing: -6 }}>
          <span style={{ fontSize: 210, lineHeight: 0.9 }}>
            <Contador valor={4.9} decimales={1} desde={millones - 3} duracion={18} />
          </span>
          <span style={{ fontSize: 76, color: COLOR.blanco, letterSpacing: -2, lineHeight: 1 }}>
            MILLONES €
          </span>
        </div>
      </div>
      {/* 12 meses: barra de 12 tramos */}
      <div style={{ position: "absolute", top: 1130, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, opacity: suave(frame, meses - 3, 6) }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 22, fontFamily: FUENTE.display, fontWeight: 800, color: COLOR.blanco, letterSpacing: -4 }}>
          <span style={{ fontSize: 150, lineHeight: 0.9, color: COLOR.lima }}>
            <Contador valor={12} desde={meses - 3} duracion={16} />
          </span>
          <span style={{ fontSize: 76, letterSpacing: -2 }}>MESES</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{ flex: 1, height: 26, borderRadius: 6, backgroundColor: barra * 12 > i ? COLOR.lima : "rgba(255,255,255,0.22)" }} />
          ))}
        </div>
      </div>
      <BarridoEntrada frames={8} />
    </AbsoluteFill>
  );
};

/* ---------- 2. Fast motion POV: 18.200 m² ---------- */

export const Superficie: React.FC = () => {
  const metros = f("metros");
  const peatonal = f("peatonal");
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <FastMotion archivo={RECURSOS.fastMotionPov} primerFotograma={RECURSOS.povInicio} nombre="Fast motion POV" />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,10,10,0.45) 0%, rgba(10,10,10,0) 26%)" }} />
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 20, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            backgroundColor: COLOR.azul,
            color: COLOR.blanco,
            fontFamily: FUENTE.display,
            fontWeight: 800,
            fontSize: 120,
            letterSpacing: -4,
            lineHeight: 1,
            padding: "10px 28px 16px",
            borderRadius: 14,
            opacity: suave(frame, metros - 3, 5),
            scale: entrada(frame, metros - 3, 12),
            transformOrigin: "0% 50%",
          }}
        >
          <Contador valor={18200} desde={metros - 3} duracion={20} /> m²
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            backgroundColor: COLOR.lima,
            color: COLOR.negro,
            fontFamily: FUENTE.rotulo,
            fontWeight: 800,
            fontSize: 48,
            letterSpacing: 1,
            padding: "8px 22px",
            borderRadius: 10,
            opacity: suave(frame, peatonal - 6, 6),
            translate: `${(1 - entrada(frame, peatonal - 6, 12)) * -120}px 0px`,
          }}
        >
          <svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke={COLOR.negro} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="13" cy="4" r="2" />
            <path d="M9 22l2-7 3 3v6M7 12l3-4 4 1 2 4M11 15l-1-5" />
          </svg>
          PRIORIDAD PEATONAL
        </div>
      </div>
      <BarridoEntrada frames={8} />
    </AbsoluteFill>
  );
};

/* ---------- 3. Las pérgolas ---------- */

const DESTACADA = 4; // P05, copa de 16 m

export const Pergolas: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const trece = f("trece");
  const copas = f("copas");
  const diametro = f("diametro");
  const foto = Math.min(diametro + 4, durationInFrames - 50);
  const p = PERGOLAS[DESTACADA];
  const px = p.x + DESPLAZAMIENTO.x;
  const py = p.y + DESPLAZAMIENTO.y;
  // Cámara: acercamiento a una pérgola para mostrar los diámetros
  const acerca = suave(frame, copas - 4, 18) * (1 - suave(frame, foto, 10));
  const escala = 1 + acerca * 1.6;
  const tx = (540 - px) * acerca;
  const ty = (900 - py) * acerca;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azul, overflow: "hidden" }}>
      {existe(RECURSOS.planoPavimentos) ? (
        <Img
          src={staticFile(RECURSOS.planoPavimentos)}
          style={{ position: "absolute", left: -20, top: 400, width: 1120, opacity: 0.25 * (1 - suave(frame, 10, 10)) + 0.0 }}
        />
      ) : null}
      <AbsoluteFill style={{ translate: `${tx}px ${ty}px`, scale: escala, transformOrigin: `${px}px ${py}px` }}>
        <MapaPlaza frame={frame} contorno={suave(frame, 0, 18)} pergolasDesde={trece} destacada={{ indice: DESTACADA, progreso: acerca }} />
      </AbsoluteFill>
      {acerca > 0.05 ? (
        <Diametros x={540} y={900} escala={escala} progreso12={suave(frame, copas + 2, 12)} progreso16={suave(frame, copas + 12, 12)} />
      ) : null}
      {/* 13 */}
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 10, left: ZONA_SEGURA.lados, display: "flex", alignItems: "baseline", gap: 20, opacity: suave(frame, trece - 3, 5) }}>
        <span style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 220, lineHeight: 0.85, color: COLOR.lima, letterSpacing: -8, display: "inline-block", scale: entrada(frame, trece - 3, 12) }}>
          13
        </span>
        <span style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 80, color: COLOR.blanco, letterSpacing: -2 }}>PÉRGOLAS</span>
      </div>
      {/* Escala con personas */}
      <Tramo desde={foto} hasta={durationInFrames + 10}>
        <div style={{ position: "absolute", left: 60, right: 60, top: 560 }}>
          <Tarjeta archivo={RECURSOS.pergolas} nombre="Pérgolas con personas" ancho={960} alto={560}>
            <Sello texto="Imagen de referencia" fondo="rgba(10,10,10,0.75)" style={{ left: 16, bottom: 16, fontSize: 24, fontWeight: 600, letterSpacing: 0 }} />
          </Tarjeta>
        </div>
        <div style={{ position: "absolute", top: 1150, left: ZONA_SEGURA.lados, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 70, color: COLOR.blanco, letterSpacing: -2 }}>
          Ø <span style={{ color: COLOR.lima }}>12</span> Y <span style={{ color: COLOR.lima }}>16</span> METROS
        </div>
      </Tramo>
      <BarridoEntrada frames={8} />
    </AbsoluteFill>
  );
};

/* ---------- 4. Fast motion cenital: sombra ---------- */

export const Sombra: React.FC = () => {
  const frame = useCurrentFrame();
  const mallas = f("mallas");
  const sombra = f("sombraPalabra");
  return (
    <AbsoluteFill>
      <FastMotion archivo={RECURSOS.fastMotionCenital} primerFotograma={RECURSOS.cenitalInicio} nombre="Fast motion cenital" />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,10,10,0.45) 0%, rgba(10,10,10,0) 26%)" }} />
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 20, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            backgroundColor: COLOR.negro,
            color: COLOR.blanco,
            fontFamily: FUENTE.rotulo,
            fontWeight: 700,
            fontSize: 36,
            letterSpacing: 2,
            padding: "6px 18px",
            borderRadius: 8,
            opacity: suave(frame, mallas - 4, 6) * (1 - suave(frame, sombra - 6, 6)),
          }}
        >
          MALLAS PARA TREPADORAS
        </div>
        <Rotulo lineas={["NUEVAS ZONAS", "DE SOMBRA"]} desde={sombra - 6} tamano={92} destacarUltima />
      </div>
      <BarridoSalida frames={8} />
    </AbsoluteFill>
  );
};

/* ---------- 5. Drenaje y fuente ---------- */

/** Sección esquemática: pavimento, impermeabilización y aparcamiento debajo. */
const Seccion: React.FC<{ readonly frame: number; readonly drenaje: number }> = ({ frame, drenaje }) => {
  const capas = suave(frame, 0, 16);
  const agua = (i: number) => ((frame * 6 + i * 70) % 280) / 280;
  const coches = [180, 400, 620, 840];
  return (
    <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
      {/* Plaza */}
      <rect x={60} y={720} width={960 * capas} height={46} rx={6} fill={COLOR.blanco} />
      <text x={80} y={700} fill={COLOR.blanco} fontFamily={FUENTE.rotulo} fontWeight={700} fontSize={32} opacity={capas}>
        PLAZA
      </text>
      {/* Impermeabilización */}
      <rect x={60} y={772} width={960 * suave(frame, 6, 16)} height={18} rx={4} fill={COLOR.lima} />
      <text x={1020} y={826} textAnchor="end" fill={COLOR.lima} fontFamily={FUENTE.rotulo} fontWeight={700} fontSize={30} opacity={suave(frame, 12, 8)}>
        IMPERMEABILIZACIÓN
      </text>
      {/* Forjado y aparcamiento */}
      <rect x={60} y={796} width={960 * capas} height={34} fill="rgba(255,255,255,0.35)" />
      <rect x={60} y={840} width={960} height={300} fill="rgba(6,30,92,0.55)" opacity={capas} />
      <text x={540} y={1110} textAnchor="middle" fill={COLOR.blanco} fontFamily={FUENTE.rotulo} fontWeight={700} fontSize={34} opacity={capas}>
        APARCAMIENTO SUBTERRÁNEO
      </text>
      {coches.map((x, i) => (
        <g key={x} opacity={suave(frame, 10 + i * 3, 8)} transform={`translate(${x} 960)`}>
          <rect x={-70} y={0} width={140} height={56} rx={16} fill="none" stroke={COLOR.blanco} strokeWidth={5} />
          <path d="M-46 0 L-30 -34 L30 -34 L46 0" fill="none" stroke={COLOR.blanco} strokeWidth={5} />
          <circle cx={-40} cy={58} r={14} fill={COLOR.blanco} />
          <circle cx={40} cy={58} r={14} fill={COLOR.blanco} />
        </g>
      ))}
      {/* Lluvia y drenaje */}
      {drenaje > 0
        ? [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const t = agua(i);
            const x = 120 + i * 120;
            return <circle key={i} cx={x} cy={440 + t * 270} r={9} fill={COLOR.blanco} opacity={drenaje * (1 - t * 0.3)} />;
          })
        : null}
      {[300, 780].map((x) => (
        <g key={x} opacity={drenaje}>
          <rect x={x - 26} y={712} width={52} height={14} fill={COLOR.azulOscuro} stroke={COLOR.lima} strokeWidth={4} />
          <path d={`M${x} 726 L${x} 790 L${x === 300 ? 60 : 1020} 790`} fill="none" stroke={COLOR.lima} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - drenaje} />
        </g>
      ))}
    </svg>
  );
};

export const Infra: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drenaje = f("drenaje");
  const fuente = f("fuente");
  const revestimiento = f("revestimiento");
  const hayPlano = existe(RECURSOS.planoDrenaje);
  const desdeSeccion = hayPlano ? 30 : 0;
  // Fuente: render si existe; si no, foto actual; si no, la vista final del fast motion (la fuente queda a la izquierda)
  const fuenteArchivo = [RECURSOS.renderFuente, RECURSOS.fuenteActual].find(existe) ?? RECURSOS.cenitalFinal;
  const desdeCenital = fuenteArchivo === RECURSOS.cenitalFinal;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azul }}>
      {hayPlano ? (
        <Tramo desde={0} hasta={desdeSeccion + 6}>
          <div style={{ position: "absolute", left: 70, top: 380, rotate: "-2deg" }}>
            <Tarjeta archivo={RECURSOS.planoDrenaje} nombre="Plano de drenaje" ancho={940} alto={700} zoom={interpolate(frame, [0, 36], [1, 1.3], clamp)} />
          </div>
        </Tramo>
      ) : null}
      <Tramo desde={desdeSeccion} hasta={fuente + 6}>
        <Sequence from={desdeSeccion} layout="none">
          <Seccion frame={frame - desdeSeccion} drenaje={suave(frame, drenaje - 4, 14)} />
        </Sequence>
        <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 20, left: ZONA_SEGURA.lados }}>
          <Rotulo lineas={["NUEVO DRENAJE"]} desde={desdeSeccion + 6} tamano={92} destacarUltima />
        </div>
      </Tramo>
      {/* Corte hacia el agua de la fuente */}
      <Tramo desde={fuente - 2} hasta={durationInFrames + 10}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <Img
            src={staticFile(fuenteArchivo)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transformOrigin: desdeCenital ? "0% 61.5%" : "50% 55%",
              scale: interpolate(frame, [fuente - 2, durationInFrames], desdeCenital ? [2.8, 2.5] : [1.25, 1.08], clamp),
            }}
          />
          <Velo />
          {/* Nuevo revestimiento: anillo que se dibuja */}
          <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
            <ellipse cx={desdeCenital ? 150 : 540} cy={desdeCenital ? 1181 : 1060} rx={desdeCenital ? 175 : 360} ry={desdeCenital ? 175 : 120} fill="none" stroke={COLOR.lima} strokeWidth={12} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - suave(frame, revestimiento - 6, 16)} />
          </svg>
          <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 20, left: ZONA_SEGURA.lados }}>
            <Rotulo lineas={["FUENTE", "CONSERVADA"]} desde={fuente} tamano={92} destacarUltima />
          </div>
          {desdeCenital ? <Sello texto="Recreación del proyecto" fondo="rgba(10,10,10,0.75)" style={{ right: ZONA_SEGURA.lados, top: 520, fontSize: 24, fontWeight: 600, letterSpacing: 0 }} /> : null}
        </div>
      </Tramo>
      <BarridoEntrada frames={8} />
    </AbsoluteFill>
  );
};

/* ---------- 6. Zona infantil ---------- */

const ICONOS_INFANTIL: { readonly clave: keyof typeof MOMENTOS; readonly texto: string; readonly icono: React.ReactNode }[] = [
  {
    clave: "pavimento",
    texto: "Pavimento de seguridad",
    icono: <path d="M3 17h18M5 17v3M19 17v3M4 13c2-2 4-2 6 0s4 2 6 0 3-2 4-1" />,
  },
  { clave: "juegos", texto: "Juegos", icono: <path d="M4 20V8l4-4 4 4v12M8 4v4M12 12l8 8M4 12h8" /> },
  { clave: "bancos", texto: "Bancos de madera", icono: <path d="M3 10h18M3 14h18M5 14v5M19 14v5M5 10V6M19 10V6" /> },
  { clave: "iluminacion", texto: "Nueva iluminación", icono: <path d="M12 3v2M5 7l1.5 1.5M19 7l-1.5 1.5M8 14a4 4 0 1 1 8 0c0 2-2 3-2 5h-4c0-2-2-3-2-5zM10 21h4" /> },
];

export const Infantil: React.FC = () => {
  const frame = useCurrentFrame();
  const hayPlano = existe(RECURSOS.planoInfantil);
  const desdeRender = hayPlano ? 30 : 0;
  const renderArchivo = [RECURSOS.renderInfantil, RECURSOS.infantilActual].find(existe) ?? RECURSOS.cenitalFinal;
  const desdeCenital = renderArchivo === RECURSOS.cenitalFinal;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azul }}>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 10, left: ZONA_SEGURA.lados }}>
        <Rotulo lineas={["NUEVA ZONA", "INFANTIL"]} desde={2} tamano={92} destacarUltima />
      </div>
      {hayPlano ? (
        <Tramo desde={0} hasta={desdeRender + 6}>
          <div style={{ position: "absolute", left: 60, top: 470 }}>
            <Tarjeta archivo={RECURSOS.planoInfantil} nombre="Plano de juegos" ancho={960} alto={600} />
          </div>
        </Tramo>
      ) : null}
      <Tramo desde={desdeRender} hasta={10000}>
        <div style={{ position: "absolute", left: 60, top: 470 }}>
          <Tarjeta
            archivo={renderArchivo}
            nombre="Zona infantil"
            ancho={960}
            alto={600}
            zoom={desdeCenital ? interpolate(frame, [0, 160], [2.5, 2.3], clamp) : interpolate(frame, [0, 160], [1.12, 1.0], clamp)}
            origen={desdeCenital ? "0% 60%" : "50% 50%"}
          >
            {desdeCenital ? <Sello texto="Recreación del proyecto" fondo="rgba(10,10,10,0.75)" style={{ left: 16, bottom: 16, fontSize: 24, fontWeight: 600, letterSpacing: 0 }} /> : null}
          </Tarjeta>
        </div>
      </Tramo>
      {/* Iconos que aparecen al nombrarse */}
      <div style={{ position: "absolute", top: 1110, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {ICONOS_INFANTIL.map((ic) => {
          const p = entrada(frame, f(ic.clave) - 3, 12);
          return (
            <div key={ic.texto} style={{ display: "flex", alignItems: "center", gap: 14, opacity: p, scale: interpolate(p, [0, 1], [0.8, 1]) }}>
              <div style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: COLOR.blanco, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width={42} height={42} viewBox="0 0 24 24" fill="none" stroke={COLOR.azul} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  {ic.icono}
                </svg>
              </div>
              <span style={{ fontFamily: FUENTE.rotulo, fontWeight: 700, fontSize: 32, color: COLOR.blanco, lineHeight: 1.1 }}>{ic.texto}</span>
            </div>
          );
        })}
      </div>
      <BarridoEntrada frames={8} />
    </AbsoluteFill>
  );
};

/* ---------- 7. Más vegetación ---------- */

const Arbol: React.FC<{ readonly p: number }> = ({ p }) => (
  <svg width={40} height={52} viewBox="0 0 20 26" style={{ opacity: p, scale: interpolate(p, [0, 1], [0.3, 1]), transformOrigin: "50% 100%" }}>
    <circle cx={10} cy={9} r={8} fill={COLOR.lima} />
    <rect x={8.6} y={15} width={2.8} height={10} rx={1} fill={COLOR.blanco} />
  </svg>
);

export const Vegetacion: React.FC<{ readonly elevarDesde: number }> = ({ elevarDesde }) => {
  const frame = useCurrentFrame();
  const arboles = f("arboles");
  const objetivo = f("objetivo");
  const usos: { clave: keyof typeof MOMENTOS; texto: string }[] = [
    { clave: "descansar", texto: "DESCANSAR" },
    { clave: "jugar", texto: "JUGAR" },
    { clave: "encontrarnos", texto: "ENCONTRARNOS" },
  ];
  // Recorrido por el render: de la pérgola de la izquierda hacia el Peñón
  const pan = interpolate(frame, [0, elevarDesde], [18, 52], clamp);
  const elevar = suave(frame, elevarDesde, 24);
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.negro }}>
      <Img
        src={staticFile(RECURSOS.renderFinal)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: `${pan}% 50%`, scale: interpolate(frame, [0, elevarDesde], [1.18, 1.05], clamp) }}
      />
      {/* La cámara se eleva: vista general terminada */}
      {elevar > 0 ? (
        <AbsoluteFill style={{ opacity: elevar }}>
          <Img
            src={staticFile(RECURSOS.cenitalFinal)}
            style={{ width: "100%", height: "100%", objectFit: "cover", scale: interpolate(frame, [elevarDesde, elevarDesde + 90], [1.25, 1.0], clamp) }}
          />
        </AbsoluteFill>
      ) : null}
      <Velo fuerza={1 - elevar * 0.4} />
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 10, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, opacity: 1 - suave(frame, objetivo - 6, 8) }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, opacity: suave(frame, arboles - 3, 5) }}>
          <span style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 190, lineHeight: 0.85, color: COLOR.lima, letterSpacing: -6 }}>
            <Contador valor={20} desde={arboles - 3} duracion={20} />
          </span>
          <span style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 64, lineHeight: 1, color: COLOR.blanco, letterSpacing: -2 }}>
            ÁRBOLES
            <br />
            NUEVOS
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 18, width: 470 }}>
          {Array.from({ length: 20 }, (_, i) => (
            <Arbol key={i} p={suave(frame, arboles + i, 6)} />
          ))}
        </div>
        <div style={{ marginTop: 16, display: "inline-block", backgroundColor: COLOR.azul, color: COLOR.blanco, fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 44, padding: "6px 20px", borderRadius: 10, opacity: suave(frame, arboles + 24, 8) }}>
          MÁS VEGETACIÓN
        </div>
      </div>
      {/* Para qué: descansar, jugar, encontrarnos */}
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 20, left: ZONA_SEGURA.lados, display: "flex", flexDirection: "column", gap: 14, opacity: 1 - suave(frame, elevarDesde, 8) }}>
        {usos.map((u) => {
          const p = entrada(frame, f(u.clave) - 3, 12);
          return (
            <div
              key={u.texto}
              style={{
                alignSelf: "flex-start",
                fontFamily: FUENTE.display,
                fontWeight: 800,
                fontSize: 78,
                letterSpacing: -2,
                lineHeight: 1,
                color: COLOR.blanco,
                backgroundColor: COLOR.azul,
                padding: "8px 24px 12px",
                borderRadius: 12,
                opacity: p,
                translate: `${(1 - p) * -140}px 0px`,
              }}
            >
              {u.texto}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Cierre (sin narración) ---------- */

export const Cierre: React.FC = () => {
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 20, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
        <Rotulo lineas={["UN NUEVO ESPACIO", "EN EL CENTRO"]} desde={0} tamano={86} destacarUltima />
      </div>
    </AbsoluteFill>
  );
};
