import { Video } from "@remotion/media";
import { Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { Linea, Plano } from "../marca/Anuncio";
import { Brillo, Golpe, Ondas } from "../marca/Efectos";
import { COLOR, FUENTE, MARCA, ZONA_SEGURA, existe } from "../marca/marca";
import { Movil } from "../marca/Movil";
import { Placeholder } from "../marca/Placeholder";
import { Portatil } from "../marca/Portatil";
import { CAPTURAS, MOMENTOS, SECCIONES, URL_WEB } from "./config";
import { frameEnEscena } from "./tiempos";

/** Captura larga que se desplaza hacia abajo (simula el scroll de la web). */
const Pantalla: React.FC<{ readonly archivo: string; readonly nombre: string; readonly desde?: number; readonly hasta?: number; readonly recorrido?: number }> = ({
  archivo,
  nombre,
  desde = 0,
  hasta,
  recorrido = 60,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if (!existe(archivo)) return <Placeholder nombre={nombre} archivo={archivo.split("/").pop()} compacto />;
  const p = interpolate(frame, [desde, hasta ?? durationInFrames], [0, recorrido], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => t * t * (3 - 2 * t),
  });
  return <Img src={staticFile(archivo)} style={{ width: "100%", position: "absolute", top: 0, left: 0, translate: `0px -${p}%` }} />;
};

/** Barra de direcciones con la URL escribiéndose. */
const BarraURL: React.FC<{ readonly desde: number; readonly ancho: number }> = ({ desde, ancho }) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(URL_WEB.length, Math.floor((frame - desde) / 1.4)));
  const cursor = Math.floor(frame / 8) % 2 === 0;
  const enter = desde + Math.ceil(URL_WEB.length * 1.4) + 3;
  const pulso = interpolate(frame, [enter, enter + 3, enter + 9], [1, 0.94, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        width: ancho,
        display: "flex",
        alignItems: "center",
        gap: 18,
        backgroundColor: COLOR.blanco,
        borderRadius: 999,
        padding: "22px 34px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        scale: entrada(frame, desde - 8, 12, 13) * pulso,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Brillo desde={enter} duracion={14} />
      <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <span style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 54, color: COLOR.negro, letterSpacing: -1 }}>
        {URL_WEB.slice(0, n)}
        <span style={{ color: COLOR.azul, opacity: cursor ? 1 : 0 }}>|</span>
      </span>
    </div>
  );
};

/* ---------- 1. El salto ---------- */

export const Salto: React.FC = () => {
  const frame = useCurrentFrame();
  const web = frameEnEscena(MOMENTOS.web);
  const saltoY = interpolate(frame, [14, 24, 34], [0, -70, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Plano>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, translate: `0px ${-frame * 0.5}px` }}>
        <Linea desde={0} tamano={140}>INFOLINENSE</Linea>
        <Linea desde={3} tamano={120}>
          SE PASA
        </Linea>
        <div style={{ position: "relative", display: "inline-block", overflow: "hidden" }}>
          <Linea desde={web - 6} tamano={150} fondo={COLOR.lima} color={COLOR.negro}>
            A LA WEB
          </Linea>
          <Brillo desde={web + 4} />
        </div>
      </div>
      {/* Logo que "salta" de las redes a la web */}
      <Ondas x={540} y={1180} desde={24} />
      <div style={{ position: "absolute", top: 1000, left: 0, right: 0, display: "flex", justifyContent: "center", translate: `0px ${saltoY + frame * 0.4}px` }}>
        <Golpe desde={2}>
          <div style={{ width: 360, height: 360, borderRadius: 180, backgroundColor: COLOR.azul, border: "10px solid white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 30px 60px rgba(0,0,0,0.4)", position: "relative", overflow: "hidden" }}>
            <Img src={MARCA.logo} style={{ width: 300 }} />
            <Brillo desde={16} duracion={16} />
          </div>
        </Golpe>
      </div>
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <path d="M300 1420 C 420 1560, 660 1560, 780 1420" stroke="white" strokeWidth={12} fill="none" strokeLinecap="round" strokeDasharray="1" pathLength={1} strokeDashoffset={1 - suave(frame, 8, 16)} />
      </svg>
    </Plano>
  );
};

/* ---------- 2. La dirección ---------- */

export const Direccion: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const movil = entrada(frame, 18, 16);
  const zoom = interpolate(frame, [durationInFrames - 16, durationInFrames], [1, 5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.7, 0, 0.9, 0.4),
  });
  return (
    <Plano>
      <div style={{ position: "absolute", inset: 0, scale: zoom, transformOrigin: "540px 1150px" }}>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
        <Linea desde={0} tamano={78}>
          Apunta bien:
        </Linea>
      </div>
      <div style={{ position: "absolute", top: 420, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <BarraURL desde={6} ancho={860} />
      </div>
      <Ondas x={540} y={485} desde={36} color={COLOR.blanco} />
      <div style={{ position: "absolute", top: 620, left: 300, translate: `0px ${(1 - movil) * 1100}px`, transform: `perspective(1800px) rotateX(${(1 - movil) * 28}deg)` }}>
        <Movil ancho={480}>
          <Pantalla archivo={CAPTURAS.movilPortada} nombre="Portada de infolinense.com (móvil)" desde={24} recorrido={12} />
        </Movil>
      </div>
      </div>
    </Plano>
  );
};

/* ---------- 3. Contenido ---------- */

export const Contenido: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const ordenada = frameEnEscena(MOMENTOS.ordenada);
  const hayVideo = existe(CAPTURAS.grabacion);
  return (
    <Plano>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
        <Linea desde={0} tamano={80}>
          Toda la actualidad
        </Linea>
        <Linea desde={3} tamano={80}>
          linense,
        </Linea>
        <Linea desde={ordenada - 4} tamano={80} color={COLOR.lima}>
          a un solo clic
        </Linea>
      </div>
      <div
        style={{
          position: "absolute",
          top: 640,
          left: 300,
          scale: interpolate(frame, [0, 16], [2.6, 1], { extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) }),
          transform: `perspective(2000px) rotateY(${Math.sin(frame / 28) * 6}deg)`,
        }}
      >
        <Movil ancho={480}>
          {hayVideo ? (
            <Video src={staticFile(CAPTURAS.grabacion)} muted objectFit="cover" style={{ width: "100%", height: "100%" }} />
          ) : (
            <Pantalla archivo={CAPTURAS.movilPortada} nombre="Portada de infolinense.com (móvil)" desde={0} hasta={durationInFrames} recorrido={55} />
          )}
        </Movil>
      </div>
      {SECCIONES.map((s, i) => {
        const p = entrada(frame, ordenada + i * 4, 10, 13);
        const izquierda = i % 2 === 0;
        return (
          <div
            key={s}
            style={{
              position: "absolute",
              top: 720 + i * 115,
              [izquierda ? "left" : "right"]: 50,
              backgroundColor: i === 0 ? COLOR.rosa : COLOR.blanco,
              color: i === 0 ? COLOR.blanco : COLOR.azul,
              fontFamily: FUENTE.rotulo,
              fontWeight: 700,
              fontSize: 34,
              letterSpacing: 2,
              padding: "8px 20px",
              borderRadius: 10,
              boxShadow: "0 12px 28px rgba(0,0,0,0.3)",
              opacity: p,
              filter: p < 0.95 ? `blur(${(1 - p) * 10}px)` : undefined,
              translate: `${(1 - p) * (izquierda ? -160 : 160)}px ${Math.sin((frame + i * 15) / 12) * 6}px`,
            }}
          >
            {s}
          </div>
        );
      })}
    </Plano>
  );
};

/* ---------- 4. Móvil y ordenador ---------- */

export const Dispositivos: React.FC = () => {
  const frame = useCurrentFrame();
  const ordenador = frameEnEscena(MOMENTOS.ordenador);
  const pc = entrada(frame, Math.min(ordenador - 10, 8), 16);
  const mv = entrada(frame, 0, 14);
  return (
    <Plano>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
        <Linea desde={0} tamano={96}>
          ¿En el móvil?
        </Linea>
        <Linea desde={Math.min(ordenador - 8, 10)} tamano={96} color={COLOR.lima}>
          ¿En el ordenador?
        </Linea>
      </div>
      <div
        style={{
          position: "absolute",
          top: 680,
          left: 30,
          translate: `${(1 - pc) * 1100 - frame * 0.6}px 0px`,
          transform: `perspective(2200px) rotateY(${-6 - (1 - pc) * 20 + frame * 0.06}deg)`,
        }}
      >
        <Portatil ancho={900} url={URL_WEB}>
          <Pantalla archivo={CAPTURAS.escritorio} nombre="Portada de infolinense.com (ordenador)" desde={ordenador} recorrido={30} />
          <Brillo desde={Math.min(ordenador - 10, 8) + 18} duracion={20} />
        </Portatil>
      </div>
      <div style={{ position: "absolute", top: 900, left: 680, translate: `${frame * 0.9}px ${(1 - mv) * 900 - frame * 0.8}px`, rotate: "4deg" }}>
        <Movil ancho={300}>
          <Pantalla archivo={CAPTURAS.movilNoticia} nombre="Noticia (móvil)" desde={0} recorrido={20} />
        </Movil>
      </div>
    </Plano>
  );
};

/* ---------- 5. Cierre ---------- */

export const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const cta = entrada(frame, 22, 12, 12);
  return (
    <Plano>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 40, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Golpe desde={0}>
          <Img src={MARCA.logo} style={{ width: 520 }} />
        </Golpe>
      </div>
      <Ondas x={540} y={1130} desde={26} />
      <div style={{ position: "absolute", top: 620, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
        <Linea desde={2} tamano={110}>
          ¡ENTRA YA EN
        </Linea>
      </div>
      <div style={{ position: "absolute", top: 800, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <BarraURL desde={8} ancho={860} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 1080,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            backgroundColor: COLOR.lima,
            color: COLOR.negro,
            fontFamily: FUENTE.display,
            fontWeight: 800,
            fontSize: 60,
            padding: "16px 40px",
            borderRadius: 999,
            scale: cta * (1 + Math.max(0, Math.sin((frame - 40) / 9)) * 0.04 * (frame > 40 ? 1 : 0)),
            position: "relative",
            overflow: "hidden",
            boxShadow: `0 0 ${40 + Math.sin(frame / 9) * 20}px rgba(196,233,16,0.55)`,
          }}
        >
          <Brillo desde={34} duracion={16} />
          <Brillo desde={80} duracion={16} />
          LEER AHORA
          <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke={COLOR.negro} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h16M14 6l6 6-6 6" />
          </svg>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1260, left: 0, right: 0, textAlign: "center", fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 40, color: COLOR.blanco, opacity: suave(frame, 30, 10) }}>
        ¡Donde tú quieras, cuando quieras!
      </div>
    </Plano>
  );
};
