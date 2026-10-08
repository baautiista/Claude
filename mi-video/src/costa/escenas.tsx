import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { Contador } from "../marca/Contador";
import { Etiqueta } from "../marca/Etiqueta";
import { TarjetaFoto } from "../marca/Foto";
import { COLOR, FUENTE, ZONA_SEGURA } from "../marca/marca";
import { Tramo } from "../marca/Tramo";
import { FOTOS, MOMENTOS } from "./config";
import type { Estado } from "./MapaBahia";
import { beatsDeEscena, frameEnEscena } from "./tiempos";

const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);

/* ---------- Piezas comunes ---------- */

const ESTADOS: Record<Estado, { texto: string; fondo: string; color: string; borde?: string }> = {
  ejecutado: { texto: "RELLENO EN EJECUCIÓN", fondo: COLOR.rosa, color: COLOR.blanco },
  proyectado: { texto: "PROYECTADO", fondo: "transparent", color: COLOR.blanco, borde: `4px dashed ${COLOR.blanco}` },
  antecedente: { texto: "ANTECEDENTES HISTÓRICOS", fondo: "#9AA6BF", color: COLOR.negro },
};

/** Velo superior para que los rótulos se lean sobre el mapa. */
const Velo: React.FC = () => (
  <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,30,92,0.92) 0%, rgba(6,30,92,0.55) 22%, rgba(6,30,92,0) 36%, rgba(6,30,92,0) 70%, rgba(6,30,92,0.7) 100%)" }} />
);

const Cabecera: React.FC<{ readonly numero: string; readonly nombre: string; readonly lugar: string; readonly estado: Estado }> = ({
  numero,
  nombre,
  lugar,
  estado,
}) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, 0, 12);
  const e = ESTADOS[estado];
  return (
    <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, opacity: suave(frame, 0, 6) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, translate: `${(1 - p) * -80}px 0px` }}>
        <div style={{ width: 92, height: 92, borderRadius: 14, backgroundColor: COLOR.lima, color: COLOR.negro, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FUENTE.display, fontWeight: 800, fontSize: 60 }}>
          {numero}
        </div>
        <div>
          <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 86, lineHeight: 0.95, letterSpacing: -2, color: COLOR.blanco }}>{nombre}</div>
          <div style={{ fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 38, color: "rgba(255,255,255,0.85)" }}>{lugar}</div>
        </div>
      </div>
      <div
        style={{
          display: "inline-block",
          marginTop: 22,
          backgroundColor: e.fondo,
          color: e.color,
          border: e.borde,
          fontFamily: FUENTE.rotulo,
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: 2,
          padding: "6px 16px",
          borderRadius: 8,
          scale: entrada(frame, 8, 10, 13),
          transformOrigin: "0% 50%",
        }}
      >
        {e.texto}
      </div>
    </div>
  );
};

/** Dato grande animado. */
const Dato: React.FC<{
  readonly valor: number;
  readonly decimales?: number;
  readonly prefijo?: string;
  readonly unidad?: string;
  readonly etiqueta: string;
  readonly nota?: string;
  readonly desde: number;
  readonly top: number;
  readonly color?: string;
}> = ({ valor, decimales = 0, prefijo = "", unidad = "", etiqueta, nota, desde, top, color = COLOR.lima }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 12, 13);
  return (
    <div style={{ position: "absolute", top, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, opacity: suave(frame, desde, 4), translate: `0px ${(1 - p) * 60}px` }}>
      <div style={{ display: "inline-block", backgroundColor: "rgba(6,30,92,0.88)", borderRadius: 24, padding: "18px 28px 20px", boxShadow: "0 20px 44px rgba(0,0,0,0.35)" }}>
        <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 132, lineHeight: 0.95, letterSpacing: -4, color }}>
          {prefijo}
          <Contador valor={valor} desde={desde} duracion={22} decimales={decimales} />
          {unidad ? <span style={{ fontSize: 80 }}> {unidad}</span> : null}
        </div>
        <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 46, color: COLOR.blanco, letterSpacing: 1 }}>{etiqueta}</div>
        {nota ? <div style={{ fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 28, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>{nota}</div> : null}
      </div>
    </div>
  );
};

const Aviso: React.FC<{ readonly children: React.ReactNode; readonly desde: number; readonly top: number; readonly fondo?: string; readonly color?: string; readonly nota?: string }> = ({
  children,
  desde,
  top,
  fondo = COLOR.rosa,
  color = COLOR.blanco,
  nota,
}) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 12, 12);
  return (
    <div style={{ position: "absolute", top, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, opacity: suave(frame, desde, 3), scale: interpolate(p, [0, 1], [1.25, 1]), transformOrigin: "0% 50%" }}>
      <div style={{ display: "inline-block", backgroundColor: fondo, color, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 58, lineHeight: 1.02, padding: "14px 24px", borderRadius: 14, letterSpacing: -1 }}>{children}</div>
      {nota ? <div style={{ fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 30, color: COLOR.blanco, marginTop: 10 }}>{nota}</div> : null}
    </div>
  );
};

const Foto: React.FC<{ readonly archivo: string; readonly nombre: string; readonly etiqueta: string; readonly desde: number }> = ({ archivo, nombre, etiqueta, desde }) => (
  <div style={{ position: "absolute", top: 560, left: 80 }}>
    <TarjetaFoto archivo={archivo} ancho={920} alto={640} desde={desde} etiqueta={etiqueta} placeholder={nombre} />
  </div>
);

const Icono: React.FC<{ readonly d: string; readonly texto: string; readonly desde: number }> = ({ d, texto, desde }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 10, 12);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, backgroundColor: COLOR.blanco, borderRadius: 999, padding: "10px 22px 10px 14px", opacity: p, scale: p }}>
      <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={COLOR.azul} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
      <span style={{ fontFamily: FUENTE.texto, fontWeight: 800, fontSize: 32, color: COLOR.negro }}>{texto}</span>
    </div>
  );
};

/* ---------- 0. Apertura: el litoral ---------- */

export const Apertura: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const cuatro = f("cuatro");
  const tramo = durationInFrames / FOTOS.litoral.length;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro }}>
      {FOTOS.litoral.map((foto, i) => {
        const desde = Math.round(i * tramo);
        const hasta = Math.round((i + 1) * tramo);
        if (frame < desde - 1 || frame > hasta + 8) return null;
        const barrido = suave(frame, desde, 8);
        return (
          <AbsoluteFill key={foto.archivo} style={{ clipPath: i === 0 ? undefined : `inset(0 0 0 ${100 - barrido * 100}%)` }}>
            <Img
              src={staticFile(foto.archivo)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: i === 2 ? "45% 50%" : "50% 50%",
                scale: interpolate(frame, [desde, hasta + 8], [1.18, 1.04]),
                translate: `${interpolate(frame, [desde, hasta + 8], [i % 2 ? -30 : 30, 0])}px 0px`,
              }}
            />
            <div style={{ position: "absolute", left: ZONA_SEGURA.lados, bottom: ZONA_SEGURA.abajo + 210, backgroundColor: "rgba(10,10,10,0.6)", color: COLOR.blanco, fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 28, letterSpacing: 2, padding: "6px 14px", borderRadius: 6 }}>
              {foto.rotulo.toUpperCase()}
            </div>
          </AbsoluteFill>
        );
      })}
      <Velo />
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 20, left: ZONA_SEGURA.lados }}>
        <Etiqueta conIsotipo>URBANISMO</Etiqueta>
      </div>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 120, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
        <div style={{ opacity: 1 - suave(frame, cuatro - 6, 6), fontFamily: FUENTE.display, fontWeight: 800, fontSize: 96, lineHeight: 0.98, letterSpacing: -3, color: COLOR.blanco, scale: interpolate(entrada(frame, 0, 10), [0, 1], [1.2, 1]), transformOrigin: "0% 0%" }}>
          ¿QUÉ ESTÁ PASANDO CON <span style={{ color: COLOR.lima }}>NUESTRA COSTA?</span>
        </div>
      </div>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 120, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, opacity: suave(frame, cuatro, 8), translate: `0px ${(1 - suave(frame, cuatro, 10)) * 40}px` }}>
        <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 150, lineHeight: 0.9, color: COLOR.lima, letterSpacing: -6 }}>4</div>
        <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 70, lineHeight: 1.0, letterSpacing: -2, color: COLOR.blanco }}>
          proyectos están transformando el entorno marítimo de La Línea
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 1. Eastside ---------- */

export const Eastside: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const [, ecologistas] = beatsDeEscena("eastside");
  return (
    <AbsoluteFill>
      <Velo />
      <Cabecera numero="1" nombre="Eastside" lugar="Gibraltar · costa de Levante" estado="ejecutado" />
      <Tramo desde={f("depositado") - 4} hasta={f("millon") - 2}>
        <Foto archivo={FOTOS.eastside} nombre="Eastside: imagen aérea" etiqueta="Eastside" desde={f("depositado") - 4} />
      </Tramo>
      <Tramo desde={f("millon") - 4} hasta={ecologistas}>
        <Dato valor={1.5} decimales={1} prefijo="+" etiqueta="MILLONES DE TONELADAS" nota="de materiales, según los promotores" desde={f("millon") - 4} top={1000} />
        <div style={{ position: "absolute", top: 1290, left: ZONA_SEGURA.lados, display: "flex", gap: 14 }}>
          <Icono d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" texto="Viviendas" desde={f("viviendasEast")} />
          <Icono d="M3 21V7h18v14M3 11h18M8 7V3h8v4" texto="Hotel" desde={f("hotel")} />
          <Icono d="M12 3v14M5 13a7 7 0 0 0 14 0M9 6h6" texto="Puerto" desde={f("puertoEast")} />
        </div>
      </Tramo>
      <Tramo desde={ecologistas} hasta={durationInFrames + 10}>
        <Aviso desde={ecologistas + 4} top={1080} nota="Según ecologistas. Efectos posibles, no demostrados.">
          POSIBLES EFECTOS AMBIENTALES DENUNCIADOS
        </Aviso>
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 2. Westside ---------- */

export const Westside: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const [, bahia] = beatsDeEscena("westside");
  return (
    <AbsoluteFill>
      <Velo />
      <Cabecera numero="2" nombre="Westside" lugar="Gibraltar · bahía de Algeciras" estado="proyectado" />
      <Tramo desde={f("metros") - 6} hasta={bahia}>
        <Dato valor={47000} unidad="m²" etiqueta="DE RELLENOS PROYECTADOS" desde={f("metros") - 4} top={820} />
        <Dato valor={2300} etiqueta="VIVIENDAS PREVISTAS" desde={f("viviendasWest") - 4} top={1110} color={COLOR.blanco} />
      </Tramo>
      <Tramo desde={bahia} hasta={durationInFrames + 10}>
        <Foto archivo={FOTOS.westside} nombre="Westside: plano del relleno" etiqueta="Proyecto · West View" desde={bahia} />
        <Aviso desde={bahia + 10} top={1230} fondo={COLOR.lima} color={COLOR.negro}>
          ¿Y LA BAHÍA?
        </Aviso>
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 3. Crinavis ---------- */

export const Crinavis: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const [, anio] = beatsDeEscena("crinavis");
  const sello = entrada(frame, f("anio2000"), 12, 12);
  return (
    <AbsoluteFill>
      <Velo />
      <Cabecera numero="3" nombre="Crinavis" lugar="San Roque · Campamento" estado="antecedente" />
      <Tramo desde={f("portuarios") - 6} hasta={anio}>
        <Foto archivo={FOTOS.crinavis} nombre="Crinavis: vista aérea" etiqueta="Crinavis · Campamento" desde={f("portuarios") - 6} />
        <Aviso desde={f("portuarios") + 10} top={1230} fondo={COLOR.blanco} color={COLOR.negro}>
          Rellenos portuarios desde hace décadas
        </Aviso>
      </Tramo>
      <Tramo desde={anio} hasta={durationInFrames + 10}>
        <div style={{ position: "absolute", top: 560, left: 80, rotate: "-2deg" }}>
          <TarjetaFoto archivo={FOTOS.expediente} ancho={560} alto={420} desde={anio} etiqueta="Expediente ambiental" placeholder="Expediente ambiental (2000)" />
        </div>
        <div
          style={{
            position: "absolute",
            top: 600,
            left: 690,
            width: 300,
            height: 300,
            borderRadius: 150,
            border: `10px solid ${COLOR.lima}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FUENTE.display,
            fontWeight: 800,
            fontSize: 100,
            color: COLOR.lima,
            backgroundColor: "rgba(6,30,92,0.85)",
            rotate: "8deg",
            opacity: suave(frame, f("anio2000"), 3),
            scale: interpolate(sello, [0, 1], [1.6, 1]),
          }}
        >
          2000
        </div>
        <Dato valor={174} etiqueta="VECINOS PRESENTARON ALEGACIONES" desde={f("vecinos") - 4} top={1040} />
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 4. Atunara ---------- */

/** Esquema del puerto de la Atunara: dique existente y nuevos pantalanes dentro de la dársena. */
const EsquemaPuerto: React.FC<{ readonly pantalanes: number; readonly perimetro: number }> = ({ pantalanes, perimetro }) => {
  const filas = [0, 1, 2, 3, 4];
  return (
    <svg viewBox="0 0 920 640" width={920} height={640}>
      <rect width={920} height={640} rx={24} fill={COLOR.azulOscuro} />
      {/* Tierra (muelle y paseo) */}
      <path d="M0 520 H920 V640 H0 Z" fill="#2557E6" />
      {/* Dique existente */}
      <path d="M90 520 V110 H760 V200" stroke="white" strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M540 360 H840" stroke="white" strokeWidth={22} strokeLinecap="round" opacity={0.85} />
      {/* Perímetro del puerto existente */}
      <path d="M110 505 V130 H740 V505 Z" fill="none" stroke={COLOR.lima} strokeWidth={4} strokeDasharray="14 10" opacity={perimetro} />
      {/* Nuevos pantalanes flotantes */}
      {filas.map((i) => {
        const p = Math.min(1, Math.max(0, pantalanes * filas.length - i));
        const x = 170 + i * 110;
        const largo = 300 * p;
        return (
          <g key={i}>
            <line x1={x} y1={505} x2={x} y2={505 - largo} stroke={COLOR.lima} strokeWidth={10} strokeLinecap="round" />
            {Array.from({ length: 6 }, (_, j) => (
              <line key={j} x1={x - 26} y1={480 - j * 48} x2={x + 26} y2={480 - j * 48} stroke={COLOR.lima} strokeWidth={5} opacity={505 - largo < 480 - j * 48 ? 1 : 0} />
            ))}
          </g>
        );
      })}
      <text x={460} y={590} textAnchor="middle" fontFamily={FUENTE.texto} fontWeight={700} fontSize={30} fill="white">
        Esquema orientativo · no a escala
      </text>
    </svg>
  );
};

export const Atunara: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const atraques = f("atraques");
  return (
    <AbsoluteFill>
      <Velo />
      <Cabecera numero="4" nombre="Puerto de la Atunara" lugar="La Línea · costa de Levante" estado="proyectado" />
      <Tramo desde={Math.round(0.6 * fps)} hasta={atraques - 4}>
        <Foto archivo={FOTOS.atunara} nombre="Puerto de la Atunara: vista aérea" etiqueta="Puerto de la Atunara" desde={Math.round(0.6 * fps)} />
      </Tramo>
      <Tramo desde={atraques - 6} hasta={durationInFrames + 10}>
        <div style={{ position: "absolute", top: 570, left: 80, scale: 0.76 + entrada(frame, atraques - 6, 14) * 0.04, transformOrigin: "50% 0%" }}>
          <EsquemaPuerto pantalanes={suave(frame, f("pantalanes") - 6, 1.4 * fps)} perimetro={suave(frame, f("existente") - 6, 10)} />
        </div>
        <Tramo desde={atraques - 6} hasta={f("noContempla")}>
          <Dato valor={250} prefijo="hasta " etiqueta="ATRAQUES" nota="con nuevos pantalanes, dentro del puerto existente" desde={atraques - 4} top={1100} />
        </Tramo>
        <Aviso desde={f("noContempla")} top={1110} fondo={COLOR.lima} color={COLOR.negro} nota="El puerto deportivo amplía amarres, no gana terreno al mar.">
          SIN RELLENOS PARA GANAR TERRENO AL MAR
        </Aviso>
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 5. Reflexión final ---------- */

const Panel: React.FC<{ readonly titulo: string; readonly lugar: string; readonly tipo: "relleno" | "pantalanes"; readonly p: number; readonly top: number }> = ({
  titulo,
  lugar,
  tipo,
  p,
  top,
}) => (
  <div style={{ position: "absolute", top, left: 80, width: 920, height: 380, borderRadius: 24, overflow: "hidden", backgroundColor: COLOR.azulOscuro, boxShadow: "0 20px 44px rgba(0,0,0,0.3)" }}>
    <svg viewBox="0 0 920 380" width={920} height={380}>
      <rect x={0} y={0} width={240} height={380} fill="#2557E6" />
      {tipo === "relleno" ? (
        <rect x={240} y={0} width={360 * p} height={380} fill={COLOR.rosa} />
      ) : (
        [0, 1, 2].map((i) => (
          <g key={i} opacity={Math.min(1, Math.max(0, p * 3 - i))}>
            <line x1={240} y1={90 + i * 100} x2={600} y2={90 + i * 100} stroke={COLOR.lima} strokeWidth={10} strokeLinecap="round" />
            {Array.from({ length: 6 }, (_, j) => (
              <line key={j} x1={290 + j * 50} y1={70 + i * 100} x2={290 + j * 50} y2={110 + i * 100} stroke={COLOR.lima} strokeWidth={5} />
            ))}
          </g>
        ))
      )}
    </svg>
    <div style={{ position: "absolute", right: 24, top: 22, textAlign: "right" }}>
      <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 48, color: tipo === "relleno" ? COLOR.rosa : COLOR.lima, lineHeight: 1 }}>{titulo}</div>
      <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 30, color: COLOR.blanco }}>{lugar}</div>
    </div>
    <div style={{ position: "absolute", right: 24, bottom: 22, fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 28, color: "rgba(255,255,255,0.85)" }}>
      {tipo === "relleno" ? "El mar se convierte en tierra" : "El mar sigue siendo mar"}
    </div>
  </div>
);

export const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const texto = suave(frame, 0, 12);
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azul }}>
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 20, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 70, lineHeight: 1.0, letterSpacing: -2, color: COLOR.blanco, opacity: texto, translate: `0px ${(1 - texto) * 30}px` }}>
        AMPLIAR UN PUERTO <span style={{ color: COLOR.lima }}>NO ES NECESARIAMENTE</span> GANARLE TERRENO AL MAR
      </div>
      <Panel titulo="RELLENO" lugar="Gibraltar" tipo="relleno" p={suave(frame, 0.3 * fps, 1.6 * fps)} top={560} />
      <Panel titulo="PANTALANES" lugar="La Atunara" tipo="pantalanes" p={suave(frame, 0.8 * fps, 1.6 * fps)} top={970} />
    </AbsoluteFill>
  );
};
