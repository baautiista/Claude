import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { COLOR, FUENTE, MARCA, ZONA_SEGURA } from "../marca/marca";
import { Movil } from "../marca/Movil";
import { IMAGENES, MOMENTOS } from "./config";
import { beatsDeEscena, frameEnEscena } from "./tiempos";

/* ---------- Piezas comunes ---------- */
import { FondoCampana, Linea, Plano } from "../marca/Anuncio";
export { FondoCampana };


const Captura: React.FC<{ readonly archivo: string }> = ({ archivo }) => (
  <Img src={staticFile(archivo)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%" }} />
);

const Pastilla: React.FC<{ readonly children: React.ReactNode; readonly fondo: string; readonly color: string; readonly style?: React.CSSProperties }> = ({
  children,
  fondo,
  color,
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
      padding: "8px 20px",
      borderRadius: 10,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Indicador de toque (círculo blanco que se contrae). */
const Toque: React.FC<{ readonly x: number; readonly y: number; readonly en: number }> = ({ x, y, en }) => {
  const frame = useCurrentFrame();
  const t = frame - en;
  if (t < -8 || t > 16) return null;
  const llega = suave(frame, en - 8, 8);
  return (
    <div
      style={{
        position: "absolute",
        left: x - 40,
        top: y - 40,
        width: 80,
        height: 80,
        borderRadius: 40,
        border: "6px solid white",
        backgroundColor: "rgba(255,255,255,0.35)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
        opacity: llega * interpolate(t, [8, 16], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        scale: t < 0 ? 1.3 - llega * 0.3 : interpolate(t, [0, 4, 8], [1, 0.75, 1], { extrapolateRight: "clamp" }),
      }}
    />
  );
};

/* ---------- 1. Cambio de casa ---------- */

export const Cambio: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cambio = Math.min(frameEnEscena(MOMENTOS.nuevaEntra), Math.round(0.9 * fps));
  const sale = suave(frame, cambio, 14);
  const entra = entrada(frame, cambio + 4, 16);
  return (
    <Plano>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
        <Linea desde={0} tamano={140}>INFOLINENSE</Linea>
        <Linea desde={3} tamano={104} fondo={COLOR.lima} color={COLOR.negro}>
          CAMBIA DE CASA
        </Linea>
        <Linea desde={6} tamano={104}>
          EN FACEBOOK
        </Linea>
      </div>
      {/* Perfil antiguo: sale */}
      <div
        style={{
          position: "absolute",
          top: 820,
          left: 330,
          translate: `${-sale * 560}px ${sale * 60}px`,
          rotate: `${-sale * 10}deg`,
          opacity: 1 - sale * 0.6,
          filter: `grayscale(${sale})`,
        }}
      >
        <Movil ancho={420}>
          <Captura archivo={IMAGENES.perfilAntiguo} />
        </Movil>
        <Pastilla fondo={COLOR.rosa} color={COLOR.blanco} style={{ top: -30, left: 40, rotate: "-4deg" }}>
          PERFIL ANTIGUO
        </Pastilla>
      </div>
      {/* Página nueva: entra */}
      <div style={{ position: "absolute", top: 800, left: 330, translate: `${(1 - entra) * 760}px 0px`, rotate: `${(1 - entra) * 10}deg` }}>
        <Movil ancho={420}>
          <Captura archivo={IMAGENES.paginaNueva} />
        </Movil>
        <Pastilla fondo={COLOR.lima} color={COLOR.negro} style={{ top: -30, left: 50, rotate: "3deg", scale: entrada(frame, cambio + 14, 12, 12) }}>
          NUEVA PÁGINA
        </Pastilla>
      </div>
    </Plano>
  );
};

/* ---------- 2. Nueva Página ---------- */

export const NuevaPagina: React.FC = () => {
  const frame = useCurrentFrame();
  const oficial = frameEnEscena(MOMENTOS.oficial);
  const chips = [
    { t: "ÚLTIMA HORA", x: 40, y: 900 },
    { t: "AGENDA", x: 770, y: 1000 },
    { t: "OBRAS", x: 60, y: 1250 },
    { t: "LA CIUDAD", x: 730, y: 1330 },
  ];
  return (
    <Plano>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
        <Linea desde={0} tamano={78}>
          Toda la actualidad
        </Linea>
        <Linea desde={3} tamano={78}>
          de La Línea, ahora en
        </Linea>
        <Linea desde={Math.min(oficial - 4, 10)} tamano={74} color={COLOR.lima}>
          nuestra nueva Página
        </Linea>
      </div>
      <div style={{ position: "absolute", top: 640, left: 270, scale: interpolate(frame, [0, 120], [0.96, 1.04]) }}>
        <Movil ancho={540}>
          <Captura archivo={IMAGENES.paginaNueva} />
        </Movil>
        <Pastilla
          fondo={COLOR.lima}
          color={COLOR.negro}
          style={{ top: 520, left: 120, fontSize: 40, rotate: "-5deg", scale: interpolate(entrada(frame, oficial + 6, 12, 11), [0, 1], [2, 1]), opacity: suave(frame, oficial + 6, 3) }}
        >
          PÁGINA OFICIAL
        </Pastilla>
      </div>
      {chips.map((c, i) => {
        const p = entrada(frame, 10 + i * 6, 12, 13);
        return (
          <Pastilla
            key={c.t}
            fondo={COLOR.blanco}
            color={COLOR.azul}
            style={{ left: c.x, top: c.y, opacity: p, scale: p, translate: `0px ${Math.sin((frame + i * 20) / 12) * 8}px`, boxShadow: "0 10px 26px rgba(0,0,0,0.25)" }}
          >
            {c.t}
          </Pastilla>
        );
      })}
    </Plano>
  );
};

/* ---------- 3. Cómo seguirnos ---------- */

const PantallaBusqueda: React.FC<{ readonly desde: number }> = ({ desde }) => {
  const frame = useCurrentFrame();
  const texto = "InfoLinense";
  const n = Math.max(0, Math.min(texto.length, Math.floor((frame - desde - 4) / 1.6)));
  const cursor = Math.floor(frame / 8) % 2 === 0;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.blanco, padding: "110px 26px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, backgroundColor: "#EEF0F3", borderRadius: 999, padding: "18px 24px" }}>
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth={2.6} strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <span style={{ fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 38, color: COLOR.negro }}>
          {texto.slice(0, n)}
          <span style={{ opacity: cursor ? 1 : 0, color: COLOR.azul }}>|</span>
        </span>
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ height: 22, width: `${70 - i * 12}%`, backgroundColor: "#EEF0F3", borderRadius: 11, marginTop: 40 }} />
      ))}
    </AbsoluteFill>
  );
};

const Avatar: React.FC<{ readonly size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLOR.azul, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <Img src={MARCA.logo} style={{ width: size * 0.84 }} />
  </div>
);

const PantallaResultados: React.FC<{ readonly toque: number }> = ({ toque }) => {
  const frame = useCurrentFrame();
  const pulsado = frame >= toque;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.blanco, padding: "110px 26px 0" }}>
      <div style={{ backgroundColor: "#EEF0F3", borderRadius: 999, padding: "18px 24px", fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 38, color: COLOR.negro }}>InfoLinense</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginTop: 34,
          padding: 14,
          borderRadius: 18,
          backgroundColor: pulsado ? "#E3EBFF" : "transparent",
        }}
      >
        <Avatar size={96} />
        <div>
          <div style={{ fontFamily: FUENTE.texto, fontWeight: 800, fontSize: 38, color: COLOR.negro }}>InfoLinense</div>
          <div style={{ fontFamily: FUENTE.texto, fontWeight: 500, fontSize: 26, color: "#6B7280" }}>Página · Medio de comunicación</div>
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 26, padding: 14, opacity: 0.6 }}>
          <div style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "#E5E7EB" }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 22, width: "70%", backgroundColor: "#E5E7EB", borderRadius: 11 }} />
            <div style={{ height: 18, width: "45%", backgroundColor: "#EEF0F3", borderRadius: 9, marginTop: 12 }} />
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

const PantallaPagina: React.FC<{ readonly pulsa: number }> = ({ pulsa }) => {
  const frame = useCurrentFrame();
  const t = frame - pulsa;
  const siguiendo = t >= 3;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.blanco }}>
      <Img src={staticFile(IMAGENES.banner)} style={{ width: "100%", height: 300, objectFit: "cover", objectPosition: "30% 50%" }} />
      <div style={{ position: "absolute", top: 210, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ border: "8px solid white", borderRadius: 999 }}>
          <Avatar size={190} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 440, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontFamily: FUENTE.texto, fontWeight: 800, fontSize: 52, color: COLOR.negro }}>InfoLinense</div>
        <div style={{ fontFamily: FUENTE.texto, fontWeight: 500, fontSize: 26, color: "#6B7280", marginTop: 6 }}>Medio de comunicación/noticias</div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 620,
          left: 40,
          right: 40,
          height: 96,
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          backgroundColor: siguiendo ? "#E5E7EB" : COLOR.azul,
          color: siguiendo ? COLOR.negro : COLOR.blanco,
          fontFamily: FUENTE.texto,
          fontWeight: 800,
          fontSize: 42,
          scale: interpolate(t, [0, 3, 8], [1, 0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {siguiendo ? (
          <>
            <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={COLOR.negro} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5 9-10" />
            </svg>
            Siguiendo
          </>
        ) : (
          "Seguir"
        )}
      </div>
      {[0, 1].map((i) => (
        <div key={i} style={{ position: "absolute", top: 760 + i * 70, left: 40, height: 24, width: `${76 - i * 20}%`, backgroundColor: "#EEF0F3", borderRadius: 12 }} />
      ))}
    </AbsoluteFill>
  );
};

const PASOS = ["Busca «InfoLinense»", "Entra en nuestra Página", "Pulsa «Seguir»"];

export const Pasos: React.FC = () => {
  const frame = useCurrentFrame();
  const [, b1, b2, b3] = beatsDeEscena("pasos");
  const pulsa = frameEnEscena(MOMENTOS.pulsaSeguir);
  const paso = frame >= b3 - 4 ? 2 : frame >= b2 - 4 ? 1 : frame >= b1 - 4 ? 0 : -1;
  const titulo = entrada(frame, 0, 10, 12);
  const movil = entrada(frame, b1 - 8, 14);
  const toqueResultado = b2 + 10;
  return (
    <Plano>
      <div
        style={{
          position: "absolute",
          top: ZONA_SEGURA.arriba + 30,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: FUENTE.display,
          fontWeight: 800,
          fontSize: 92,
          letterSpacing: -3,
          color: COLOR.blanco,
          scale: interpolate(titulo, [0, 1], [1.4, 1]),
          opacity: titulo,
        }}
      >
        ¿CÓMO <span style={{ color: COLOR.lima }}>SEGUIRNOS?</span>
      </div>
      {/* Indicador de pasos */}
      <div style={{ position: "absolute", top: 360, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 26, opacity: suave(frame, b1 - 8, 8) }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FUENTE.display,
              fontWeight: 800,
              fontSize: 42,
              backgroundColor: i <= paso ? COLOR.lima : "rgba(255,255,255,0.2)",
              color: i <= paso ? COLOR.negro : COLOR.blanco,
              scale: i === paso ? 1.15 : 1,
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 470, left: 0, right: 0, textAlign: "center", height: 84, overflow: "hidden" }}>
        {PASOS.map((t, i) => (
          <div
            key={t}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              fontFamily: FUENTE.display,
              fontWeight: 800,
              fontSize: 64,
              color: COLOR.blanco,
              opacity: i === paso ? 1 : 0,
              translate: `0px ${i === paso ? (1 - entrada(frame, [b1, b2, b3][i] - 4, 10)) * 80 : 0}px`,
            }}
          >
            {t}
          </div>
        ))}
      </div>
      {/* Móvil con la interfaz */}
      <div style={{ position: "absolute", top: 610, left: 290, translate: `0px ${(1 - movil) * 900}px` }}>
        <Movil ancho={500}>
          {paso <= 0 ? <PantallaBusqueda desde={b1} /> : paso === 1 ? <PantallaResultados toque={toqueResultado} /> : <PantallaPagina pulsa={pulsa} />}
        </Movil>
        <Toque x={250} y={330} en={toqueResultado} />
        <Toque x={250} y={760} en={pulsa} />
      </div>
    </Plano>
  );
};

/* ---------- 4. Notificaciones ---------- */

export const Notificaciones: React.FC = () => {
  const frame = useCurrentFrame();
  const campana = frameEnEscena(MOMENTOS.campana);
  const suena = frame >= campana ? Math.sin((frame - campana) / 2.2) * 18 * Math.max(0, 1 - (frame - campana) / 40) : 0;
  const badge = Math.min(3, Math.max(0, Math.floor((frame - campana) / 8) + 1));
  return (
    <Plano>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
        <Linea desde={0} tamano={84}>
          Activa también las
        </Linea>
        <Linea desde={campana - 4} tamano={94} fondo={COLOR.lima} color={COLOR.negro}>
          NOTIFICACIONES
        </Linea>
        <Linea desde={campana + 10} tamano={64}>
          para no perderte nada
        </Linea>
      </div>
      <div style={{ position: "absolute", top: 700, left: 390, rotate: `${suena}deg`, transformOrigin: "50% 10%", scale: 0.6 + entrada(frame, 2, 12, 12) * 0.4 }}>
        <svg width={300} height={300} viewBox="0 0 24 24" fill={COLOR.blanco}>
          <path d="M12 2a6 6 0 0 0-6 6v4.5L4 16v1h16v-1l-2-3.5V8a6 6 0 0 0-6-6z" />
          <path d="M9.5 19a2.5 2.5 0 0 0 5 0z" />
        </svg>
        {badge > 0 ? (
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: COLOR.rosa,
              color: COLOR.blanco,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FUENTE.display,
              fontWeight: 800,
              fontSize: 56,
              border: "6px solid white",
              scale: entrada(frame, campana + (badge - 1) * 8, 8, 10),
            }}
          >
            {badge}
          </div>
        ) : null}
      </div>
      {["Última hora", "Obras en la ciudad", "Agenda del fin de semana"].map((t, i) => {
        const p = entrada(frame, campana + 4 + i * 8, 12, 14);
        return (
          <div
            key={t}
            style={{
              position: "absolute",
              top: 1070 + i * 150,
              left: 90,
              right: 90,
              display: "flex",
              alignItems: "center",
              gap: 20,
              backgroundColor: COLOR.blanco,
              borderRadius: 26,
              padding: "16px 22px",
              boxShadow: "0 16px 36px rgba(0,0,0,0.3)",
              opacity: p,
              translate: `0px ${(1 - p) * -120}px`,
            }}
          >
            <Avatar size={80} />
            <div>
              <div style={{ fontFamily: FUENTE.texto, fontWeight: 800, fontSize: 32, color: COLOR.negro }}>InfoLinense</div>
              <div style={{ fontFamily: FUENTE.texto, fontWeight: 500, fontSize: 28, color: "#4B5563" }}>{t}</div>
            </div>
          </div>
        );
      })}
    </Plano>
  );
};

/* ---------- 5. Cierre ---------- */

export const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const icono = entrada(frame, 14, 14, 11);
  const flecha = suave(frame, 22, 14);
  const cta = entrada(frame, 30, 12, 12);
  return (
    <Plano>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 40, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: suave(frame, 0, 8) }}>
        <Img src={MARCA.logo} style={{ width: 520 }} />
      </div>
      <div style={{ position: "absolute", top: 560, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
        <Linea desde={2} tamano={136}>
          INFOLINENSE
        </Linea>
        <Linea desde={6} tamano={104} fondo={COLOR.lima} color={COLOR.negro}>
          CONTINÚA AQUÍ
        </Linea>
        <div style={{ marginTop: 26, fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 46, lineHeight: 1.2, color: COLOR.blanco, opacity: suave(frame, 12, 8) }}>
          Síguenos en nuestra
          <br />
          nueva Página oficial
        </div>
      </div>
      {/* Flecha hacia el icono */}
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <path
          d="M140 1300 C 300 1460, 520 1450, 640 1360"
          stroke="white"
          strokeWidth={14}
          fill="none"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - flecha}
        />
        <path d="M600 1330 L650 1355 L622 1405" stroke="white" strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={flecha > 0.95 ? 1 : 0} />
      </svg>
      {/* Icono de Facebook (dibujado) */}
      <div
        style={{
          position: "absolute",
          top: 1160,
          left: 690,
          width: 260,
          height: 260,
          borderRadius: 64,
          background: `linear-gradient(160deg, #3B7BFF 0%, ${COLOR.azul} 60%, #1446D8 100%)`,
          boxShadow: "0 30px 60px rgba(0,0,0,0.4), inset 0 -10px 0 rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          overflow: "hidden",
          scale: icono,
          rotate: `${(1 - icono) * -20}deg`,
        }}
      >
        <span style={{ fontFamily: "Inter", fontWeight: 900, fontSize: 250, lineHeight: 0.86, color: COLOR.blanco, translate: "16px 6px" }}>f</span>
      </div>
      <div
        style={{
          position: "absolute",
          top: 1460,
          left: ZONA_SEGURA.lados,
          display: "flex",
          alignItems: "center",
          gap: 18,
          backgroundColor: COLOR.lima,
          color: COLOR.negro,
          fontFamily: FUENTE.display,
          fontWeight: 800,
          fontSize: 52,
          padding: "14px 34px",
          borderRadius: 999,
          scale: cta,
          transformOrigin: "0% 50%",
        }}
      >
        SÍGUENOS
        <svg width={50} height={50} viewBox="0 0 24 24" fill="none" stroke={COLOR.negro} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12h16M14 6l6 6-6 6" />
        </svg>
      </div>
    </Plano>
  );
};
