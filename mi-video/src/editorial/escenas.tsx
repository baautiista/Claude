import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { Etiqueta } from "../marca/Etiqueta";
import { COLOR, FUENTE, ZONA_SEGURA } from "../marca/marca";
import { FRONTERA, LIENZO, MAR, PISTA, PUNTOS } from "../zbe/bahia";
import { Icono } from "../zbe/piezas";
import { Arriba, Azul, Bocadillo, clamp, Destacado, Foto, fotoDe, Titulo, Tramo } from "./piezas";
import { M } from "./tiempos";

/* ---------- 1. Gancho ---------- */

export const Gancho: React.FC = () => (
  <AbsoluteFill>
    <Foto k="centroComercial" nombre="Nuevo centro comercial (exterior)" zoom={[1.3, 1.12]} oscurecer={0.55} />
    <Arriba>
      <Etiqueta>EDITORIAL</Etiqueta>
      <div style={{ marginTop: 26 }}>
        <Titulo lineas={["¿AHORA", "TAMBIÉN", "MOLESTA QUE", "LA LÍNEA", "*AVANCE?"]} desde={0} tam={128} />
      </div>
    </Arriba>
  </AbsoluteFill>
);

/* ---------- 2. El centro comercial ---------- */

export const CentroComercial: React.FC = () => {
  const ahora = M("centroComercial", 1);
  return (
    <AbsoluteFill>
      <Foto k="centroComercial" nombre="Nuevo centro comercial" />
      <Tramo desde={0} hasta={ahora}>
        <Arriba>
          <Etiqueta>DURANTE AÑOS</Etiqueta>
          <div style={{ marginTop: 22 }}>
            <Titulo lineas={["«¿PARA CUÁNDO", "UN CENTRO", "*COMERCIAL?»"]} desde={4} tam={104} />
          </div>
        </Arriba>
      </Tramo>
      <Tramo desde={ahora}>
        <Arriba>
          <Etiqueta>AHORA QUE LO TENEMOS</Etiqueta>
          <div style={{ marginTop: 22 }}>
            <Titulo lineas={["«ES UN", "*PROBLEMA»"]} desde={ahora + 4} tam={130} />
          </div>
        </Arriba>
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 3. Las críticas ---------- */

export const Criticas: React.FC = () => {
  const perdona = M("criticas", 2);
  return (
    <AbsoluteFill>
      <Azul oscuro />
      <Tramo desde={0} hasta={perdona}>
        <AbsoluteFill style={{ justifyContent: "center", gap: 40, paddingLeft: 70, paddingRight: 70, paddingBottom: 300, display: "flex", flexDirection: "column" }}>
          <Bocadillo texto="Que si va a destruir el comercio local" desde={2} lado="izq" />
          <Bocadillo texto="Que si vendrán trabajadores de fuera…" desde={M("criticas", 1)} lado="der" />
        </AbsoluteFill>
      </Tramo>
      <Tramo desde={perdona - 2}>
        <AbsoluteFill style={{ backgroundColor: COLOR.azul }} />
        <Destacado lineas={["¿PERDONA?"]} desde={perdona} tam={170} />
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 4. El empleo ---------- */

const Personas: React.FC<{ readonly desde: number }> = ({ desde }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 18, width: 900 }}>
      {Array.from({ length: 32 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" width={90} height={90} style={{ opacity: suave(frame, desde + i, 6), scale: interpolate(suave(frame, desde + i, 8), [0, 1], [0.4, 1]) }}>
          <circle cx="12" cy="7" r="4" fill={i % 5 === 0 ? COLOR.lima : COLOR.blanco} />
          <path d="M4 22c0-5 3.6-8 8-8s8 3 8 8z" fill={i % 5 === 0 ? COLOR.lima : COLOR.blanco} />
        </svg>
      ))}
    </div>
  );
};

const MapaEmpleo: React.FC<{ readonly desde: number }> = ({ desde }) => {
  const frame = useCurrentFrame();
  const e = 0.66;
  const dx = 45;
  const dy = 520;
  const pos = (p: { x: number; y: number }) => ({ x: p.x * e + dx, y: p.y * e + dy });
  const lugares = [
    { p: PUNTOS.gibraltar, n: "GIBRALTAR", d: M("empleo", 2, "Gibraltar,") },
    { p: PUNTOS.refineria, n: "REFINERÍA", d: M("empleo", 2, "refinería") },
    { p: PUNTOS.acerinox, n: "ACERINOX", d: M("empleo", 2, "Acerinox?") },
  ];
  const ll = pos(PUNTOS.laLinea);
  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, opacity: suave(frame, desde, 12) }}>
        <g transform={`translate(${dx} ${dy}) scale(${e})`}>
          <rect width={LIENZO.ancho} height={LIENZO.alto} fill={COLOR.azul} />
          <path d={MAR} fill={COLOR.azulOscuro} stroke="rgba(255,255,255,0.7)" strokeWidth={4} />
          <line {...FRONTERA} stroke="white" strokeWidth={5} strokeDasharray="14 10" opacity={0.7} />
          <rect x={PISTA.x} y={PISTA.y} width={PISTA.ancho} height={PISTA.alto} fill="rgba(255,255,255,0.45)" />
        </g>
      </svg>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${COLOR.azulOscuro} 26%, rgba(6,30,92,0) 36%, rgba(6,30,92,0) 68%, ${COLOR.azulOscuro} 82%)` }} />
      <div style={{ position: "absolute", left: ll.x - 20, top: ll.y - 20, width: 40, height: 40, borderRadius: 20, backgroundColor: COLOR.lima, border: `6px solid ${COLOR.blanco}` }} />
      <div style={{ position: "absolute", left: ll.x - 250, top: ll.y - 30, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 36, color: COLOR.negro, backgroundColor: COLOR.lima, padding: "2px 12px", borderRadius: 8 }}>LA LÍNEA</div>
      {lugares.map(({ p, n, d }) => {
        const q = pos(p);
        const a = entrada(frame, d - 3, 12, 11);
        return (
          <div key={n} style={{ position: "absolute", left: q.x, top: q.y, opacity: Math.min(1, a * 2) }}>
            <div style={{ position: "absolute", left: -34, top: -34, width: 68, height: 68, borderRadius: 34, backgroundColor: COLOR.blanco, display: "flex", alignItems: "center", justifyContent: "center", scale: a }}>
              <Icono nombre={n === "GIBRALTAR" ? "ancla" : "fabrica"} tam={40} color={COLOR.azulOscuro} grosor={2.2} />
            </div>
            <div style={{ position: "absolute", left: -110, top: 44, width: 220, textAlign: "center", fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 30, color: COLOR.blanco, textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>{n}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Empleo: React.FC = () => {
  const bolsa = M("empleo", 1);
  const fuera = M("empleo", 2);
  return (
    <AbsoluteFill>
      <Azul oscuro />
      <Tramo desde={0} hasta={bolsa}>
        <Arriba>
          <Titulo lineas={["¿Y LAS DECENAS", "*DE LINENSES", "QUE TRABAJARÁN", "ALLÍ?"]} desde={2} tam={96} />
        </Arriba>
        <div style={{ position: "absolute", top: 820, left: 90 }}>
          <Personas desde={10} />
        </div>
      </Tramo>
      <Tramo desde={bolsa} hasta={fuera}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 300 }}>
          <div style={{ backgroundColor: COLOR.blanco, borderRadius: 30, padding: "40px 46px", width: 860, scale: entrada(useCurrentFrame(), bolsa, 14) }}>
            <Etiqueta>EMPLEO</Etiqueta>
            <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 92, lineHeight: 0.98, letterSpacing: -3, color: COLOR.azulOscuro, marginTop: 20 }}>
              BOLSA PÚBLICA
              <br />
              <span style={{ color: COLOR.azul }}>DE EMPLEO</span>
            </div>
            <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 40, color: "#4B5563", marginTop: 18 }}>¿Ya nos hemos olvidado?</div>
          </div>
        </AbsoluteFill>
      </Tramo>
      <Tramo desde={fuera}>
        <MapaEmpleo desde={fuera} />
        <Arriba>
          <Titulo lineas={["¿TAMPOCO PODEMOS", "*TRABAJAR FUERA?"]} desde={fuera + 2} tam={90} />
        </Arriba>
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 5. ¿Qué hace el Ayuntamiento? ---------- */

export const Ayuntamiento: React.FC = () => {
  const frame = useCurrentFrame();
  const recordar = M("ayuntamiento", 1);
  return (
    <AbsoluteFill>
      <Foto k="comercios" nombre="Comercios del centro" oscurecer={0.6} />
      <Tramo desde={0} hasta={recordar + 4}>
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 70, paddingRight: 70, paddingBottom: 300 }}>
          <div style={{ backgroundColor: COLOR.blanco, borderRadius: 30, padding: "40px 44px", scale: entrada(frame, 4, 14), boxShadow: "0 30px 70px rgba(0,0,0,0.4)" }}>
            <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 150, lineHeight: 0.6, color: COLOR.azul }}>“</div>
            <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 72, lineHeight: 1.04, letterSpacing: -2, color: COLOR.azulOscuro }}>¿Qué hace el Ayuntamiento por los comerciantes del centro?</div>
          </div>
        </AbsoluteFill>
      </Tramo>
      <Tramo desde={recordar}>
        <Arriba top={ZONA_SEGURA.arriba + 80}>
          <Titulo lineas={["PUES VAMOS", "A RECORDAR", "*ALGUNAS COSITAS"]} desde={recordar + 2} tam={110} />
        </Arriba>
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 6. Los eventos ---------- */

const EVENTOS = ["La Ruta de la Tapa", "El Mercado Pirata", "Los carnavales", "El Oktoberfest", "La Noche de las Velas", "Halloween", "La iluminación navideña", "Nuestra Semana Santa"];

export const Eventos: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Foto k="eventos" nombre="Eventos en el centro" oscurecer={0.7} zoom={[1.05, 1.25]} />
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba, left: 70, right: 70, display: "flex", flexDirection: "column", gap: 14 }}>
        {EVENTOS.map((e, i) => {
          const d = M("eventos", i) - 3;
          const p = entrada(frame, d, 12, 12);
          const activo = frame >= d && (i === EVENTOS.length - 1 || frame < M("eventos", i + 1) - 3);
          return (
            <div key={e} style={{ display: "flex", alignItems: "center", gap: 20, backgroundColor: activo ? COLOR.lima : COLOR.blanco, borderRadius: 18, padding: "14px 24px", opacity: Math.min(1, p * 2), translate: `${(1 - p) * 300}px 0px`, scale: activo ? 1.04 : 1, transformOrigin: "0% 50%" }}>
              <div style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: COLOR.azul, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icono nombre="check" tam={32} color={COLOR.blanco} grosor={3} />
              </div>
              <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 52, letterSpacing: -1, color: COLOR.azulOscuro, lineHeight: 1 }}>{e}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 7. El centro no está muerto ---------- */

export const Centro: React.FC = () => {
  const enElCentro = M("centro", 1);
  const muerto = M("centro", 2);
  return (
    <AbsoluteFill>
      <Foto k="centro" nombre="Centro de La Línea" oscurecer={0.5} />
      <Tramo desde={0} hasta={enElCentro}>
        <Arriba>
          <Titulo lineas={["¿TODO ESO", "DÓNDE SE", "*CELEBRA?"]} desde={2} tam={120} />
        </Arriba>
      </Tramo>
      <Tramo desde={enElCentro} hasta={muerto}>
        <Destacado lineas={["¡EN EL CENTRO", "*DE LA LÍNEA!"]} desde={enElCentro} tam={108} />
      </Tramo>
      <Tramo desde={muerto}>
        <AbsoluteFill style={{ backgroundColor: "rgba(6,30,92,0.55)" }} />
        <Destacado lineas={["EL CENTRO", "NO ESTÁ", "*MUERTO"]} desde={muerto} tam={140} />
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 8. El árbol: 16 metros ---------- */

const EscalaArbol: React.FC<{ readonly desde: number }> = ({ desde }) => {
  const frame = useCurrentFrame();
  const crece = interpolate(frame, [desde, desde + 30], [0, 1], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 });
  const metros = Math.round(crece * 16);
  const base = 1300;
  const pxPorMetro = 52;
  const alto = 16 * pxPorMetro * crece;
  return (
    <AbsoluteFill>
      {/* Regla */}
      <div style={{ position: "absolute", left: 120, top: base - 16 * pxPorMetro, height: 16 * pxPorMetro, width: 6, backgroundColor: "rgba(255,255,255,0.4)" }} />
      {Array.from({ length: 17 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: 104, top: base - i * pxPorMetro, width: i % 4 === 0 ? 40 : 20, height: 4, backgroundColor: COLOR.blanco, opacity: i <= metros ? 1 : 0.3 }} />
      ))}
      {/* Árbol esquemático */}
      <svg viewBox="0 0 200 400" preserveAspectRatio="none" style={{ position: "absolute", left: 300, top: base - alto, width: 420, height: Math.max(1, alto) }}>
        <path d="M100 0 L190 360 L10 360 Z" fill={COLOR.lima} />
        <rect x={86} y={360} width={28} height={40} fill={COLOR.blanco} />
      </svg>
      {/* Persona de referencia (1,75 m) */}
      <svg viewBox="0 0 24 48" style={{ position: "absolute", left: 770, top: base - 1.75 * pxPorMetro, width: 46, height: 1.75 * pxPorMetro }}>
        <circle cx="12" cy="6" r="5" fill={COLOR.blanco} />
        <path d="M5 48V20c0-4 3-7 7-7s7 3 7 7v28z" fill={COLOR.blanco} />
      </svg>
      <div style={{ position: "absolute", left: 740, top: base + 14, fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 26, color: COLOR.blanco, opacity: 0.85 }}>1,75 m</div>
      <div style={{ position: "absolute", left: 760, top: base - 16 * pxPorMetro - 10, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 150, lineHeight: 0.9, color: COLOR.lima, letterSpacing: -6 }}>
        {metros}
        <div style={{ fontSize: 60, color: COLOR.blanco, letterSpacing: -1 }}>METROS</div>
      </div>
    </AbsoluteFill>
  );
};

export const Arbol: React.FC = () => {
  const vamos = M("arbol", 1);
  const dieciseis = M("arbol", 2, "DIECISÉIS");
  return (
    <AbsoluteFill>
      <Foto k="arbol" nombre="Árbol de Navidad junto a Camarón" oscurecer={0.45} />
      <Tramo desde={0} hasta={vamos}>
        <Arriba>
          <Etiqueta>Y AHORA, LA ÚLTIMA</Etiqueta>
          <div style={{ marginTop: 22 }}>
            <Titulo lineas={["«EL ÁRBOL, JUNTO", "A CAMARÓN, PARA", "*FAVORECER AL", "*CENTRO COMERCIAL»"]} desde={6} tam={80} />
          </div>
        </Arriba>
      </Tramo>
      <Tramo desde={vamos} hasta={dieciseis - 4}>
        <Destacado lineas={["VAMOS A VER…"]} desde={vamos} tam={120} />
      </Tramo>
      <Tramo desde={dieciseis - 4}>
        <AbsoluteFill style={{ backgroundColor: "rgba(6,30,92,0.8)" }} />
        <EscalaArbol desde={dieciseis - 2} />
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 9. Las distancias ---------- */

export const Distancias: React.FC = () => {
  const frame = useCurrentFrame();
  const cuentan = M("distancias", 1);
  const quinientos = M("distancias", 0, "quinientos");
  const cincuenta = M("distancias", 0, "cincuenta");
  const cx = 540;
  const cy = 520;
  const r50 = 120;
  const largo = 680;
  const linea = suave(frame, quinientos - 4, 20);
  const aro = suave(frame, cincuenta - 4, 16);
  return (
    <AbsoluteFill>
      <Azul oscuro />
      <Tramo desde={0} hasta={cuentan}>
        <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy + largo * linea} stroke={COLOR.blanco} strokeWidth={8} strokeDasharray="22 14" />
          <circle cx={cx} cy={cy} r={r50 * aro} fill="rgba(196,233,16,0.18)" stroke={COLOR.lima} strokeWidth={6} />
        </svg>
        {/* Árbol y Camarón */}
        <div style={{ position: "absolute", left: cx - 50, top: cy - 50, width: 100, height: 100, borderRadius: 50, backgroundColor: COLOR.lima, display: "flex", alignItems: "center", justifyContent: "center", scale: entrada(frame, 2, 12) }}>
          <svg viewBox="0 0 24 24" width={60} height={60}>
            <path d="M12 2l7 14H5z" fill={COLOR.azulOscuro} />
            <rect x={10.5} y={16} width={3} height={5} fill={COLOR.azulOscuro} />
          </svg>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: cy - 200, textAlign: "center", fontFamily: FUENTE.display, fontWeight: 800, fontSize: 48, color: COLOR.blanco }}>ÁRBOL · CAMARÓN</div>
        {/* 4 restaurantes a menos de 50 m */}
        {[0, 1, 2, 3].map((i) => {
          const ang = -Math.PI / 4 + (i * Math.PI) / 2;
          const p = entrada(frame, cincuenta + i * 4, 12, 11);
          return (
            <div key={i} style={{ position: "absolute", left: cx + Math.cos(ang) * (r50 + 70) - 36, top: cy + Math.sin(ang) * (r50 + 70) - 36, width: 72, height: 72, borderRadius: 36, backgroundColor: COLOR.blanco, display: "flex", alignItems: "center", justifyContent: "center", scale: p }}>
              <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={COLOR.azul} strokeWidth={2.4} strokeLinecap="round">
                <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 3-3 6s1 3 3 3v9" />
              </svg>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 0, right: 0, top: cy + 230, textAlign: "center", opacity: aro }}>
          <span style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 58, color: COLOR.negro, backgroundColor: COLOR.lima, padding: "6px 18px", borderRadius: 10 }}>{"< 50 m · 4 RESTAURANTES LINENSES"}</span>
        </div>
        {/* Centro comercial a ~500 m */}
        <div style={{ position: "absolute", left: cx - 60, top: cy + largo - 10, width: 120, height: 120, borderRadius: 24, backgroundColor: COLOR.blanco, display: "flex", alignItems: "center", justifyContent: "center", opacity: linea, scale: linea }}>
          <Icono nombre="tienda" tam={70} color={COLOR.azulOscuro} grosor={2} />
        </div>
        <div style={{ position: "absolute", left: cx + 90, top: cy + largo + 10, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 46, lineHeight: 1.05, color: COLOR.blanco, opacity: linea }}>
          ~500 m
          <br />
          <span style={{ fontSize: 32 }}>CENTRO COMERCIAL</span>
        </div>
        <div style={{ position: "absolute", left: 80, top: cy + largo - 280, fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 24, color: COLOR.blanco, opacity: 0.6 }}>Esquema aproximado</div>
      </Tramo>
      <Tramo desde={cuentan}>
        <AbsoluteFill style={{ backgroundColor: COLOR.azul }} />
        <Destacado lineas={["¿ESOS NEGOCIOS", "*NO CUENTAN?"]} desde={cuentan} tam={116} />
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 10. Los drones ---------- */

/** Puntos de luz que vuelan y forman un árbol (espectáculo de drones, en gráfico). */
const Drones: React.FC<{ readonly desde: number }> = ({ desde }) => {
  const frame = useCurrentFrame();
  const forma = suave(frame, desde, 40);
  const n = 70;
  return (
    <AbsoluteFill>
      {Array.from({ length: n }, (_, i) => {
        const r = (k: number) => {
          const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
          return x - Math.floor(x);
        };
        // Destino: triángulo del árbol
        const fila = Math.floor(Math.sqrt(i * 2));
        const enFila = i - (fila * (fila + 1)) / 2;
        const tx = 540 + (enFila - fila / 2) * 52;
        const ty = 360 + fila * 70;
        const sx = r(1) * 1080;
        const sy = 200 + r(2) * 900;
        const x = sx + (tx - sx) * forma + Math.sin(frame / 12 + i) * 6 * (1 - forma);
        const y = sy + (ty - sy) * forma;
        const color = i % 7 === 0 ? COLOR.lima : i % 3 === 0 ? COLOR.azul : COLOR.blanco;
        return <div key={i} style={{ position: "absolute", left: x - 7, top: y - 7, width: 14, height: 14, borderRadius: 7, backgroundColor: color, boxShadow: `0 0 18px ${color}` }} />;
      })}
    </AbsoluteFill>
  );
};

export const DronesEscena: React.FC = () => {
  const navidad = M("drones", 1);
  return (
    <AbsoluteFill>
      <Foto k="drones" nombre="Espectáculo de drones" oscurecer={fotoDe("drones") ? 0.3 : 0.75} zoom={[1.0, 1.12]} />
      {fotoDe("drones") ? null : <Drones desde={4} />}
      <Tramo desde={0} hasta={navidad}>
        <div style={{ position: "absolute", top: 1100, left: 80, right: 80 }}>
          <Titulo lineas={["¿Y LOS DRONES", "*FAVORECEN A LAS", "*FRANQUICIAS?"]} desde={8} tam={86} />
        </div>
      </Tramo>
      <Tramo desde={navidad}>
        <div style={{ position: "absolute", top: 1060, left: 80, right: 80 }}>
          <Titulo lineas={["¿DEJAMOS DE", "CELEBRAR", "*LA NAVIDAD?"]} desde={navidad + 2} tam={100} />
        </div>
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 11. Oportunidades ---------- */

export const Oportunidad: React.FC = () => {
  const frame = useCurrentFrame();
  const soniabamos = M("oportunidad", 1);
  const perdon = M("oportunidad", 2);
  const chips = [
    { t: "VISITANTES", d: M("oportunidad", 0, "visitantes,") },
    { t: "CLIENTES", d: M("oportunidad", 0, "clientes") },
    { t: "OPORTUNIDADES", d: M("oportunidad", 0, "oportunidades") },
  ];
  return (
    <AbsoluteFill>
      <Foto k="centroComercial" nombre="Nuevo centro comercial" oscurecer={0.55} zoom={[1.2, 1.08]} />
      <Tramo desde={0} hasta={soniabamos}>
        <Arriba>
          <Titulo lineas={["¿Y SI TAMBIÉN", "ATRAE…"]} desde={2} tam={110} />
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 40 }}>
            {chips.map((c) => {
              const p = entrada(frame, c.d - 3, 12, 11);
              return (
                <div key={c.t} style={{ alignSelf: "flex-start", backgroundColor: COLOR.lima, color: COLOR.negro, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 84, letterSpacing: -2, padding: "6px 26px 12px", borderRadius: 14, opacity: Math.min(1, p * 2), translate: `${(1 - p) * -300}px 0px` }}>
                  {c.t}
                </div>
              );
            })}
          </div>
        </Arriba>
      </Tramo>
      <Tramo desde={soniabamos} hasta={perdon}>
        <Arriba top={ZONA_SEGURA.arriba + 60}>
          <Titulo lineas={["HACE UNOS AÑOS", "NI SOÑÁBAMOS", "*CON ESTO"]} desde={soniabamos + 2} tam={108} />
        </Arriba>
      </Tramo>
      <Tramo desde={perdon}>
        <Destacado lineas={["¿Y AHORA HAY QUE", "*PEDIR PERDÓN?"]} desde={perdon} tam={92} />
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 12. No son incompatibles ---------- */

export const Compatibles: React.FC = () => {
  const frame = useCurrentFrame();
  const incompatibles = M("compatibles", 1);
  const piedras = M("compatibles", 2);
  const mitad = (k: "comercios" | "centroComercial", texto: string, top: number, desde: number) => (
    <div style={{ position: "absolute", left: 0, right: 0, top, height: 760, overflow: "hidden", clipPath: `inset(0 ${(1 - suave(frame, desde, 14)) * 100}% 0 0)` }}>
      <Foto k={k} nombre={texto} oscurecer={0.35} />
      <div style={{ position: "absolute", left: 70, bottom: 40, backgroundColor: COLOR.blanco, color: COLOR.azulOscuro, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 56, padding: "6px 22px 10px", borderRadius: 12 }}>{texto}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro }}>
      <Tramo desde={0} hasta={piedras}>
        {mitad("comercios", "COMERCIO TRADICIONAL", 160, 2)}
        {mitad("centroComercial", "NUEVAS INVERSIONES", 940, M("compatibles", 0, "celebrar"))}
        <div style={{ position: "absolute", left: 540 - 70, top: 860, width: 140, height: 140, borderRadius: 70, backgroundColor: COLOR.lima, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FUENTE.display, fontWeight: 800, fontSize: 110, color: COLOR.negro, scale: entrada(frame, M("compatibles", 0, "celebrar") + 6, 12, 10) }}>+</div>
        <Tramo desde={incompatibles}>
          <Destacado lineas={["¡NO SON", "*INCOMPATIBLES!"]} desde={incompatibles} tam={110} />
        </Tramo>
      </Tramo>
      <Tramo desde={piedras}>
        <AbsoluteFill style={{ backgroundColor: COLOR.azul }} />
        <Destacado lineas={["DEJEMOS DE TIRAR", "PIEDRAS CONTRA", "NUESTRO", "*PROPIO TEJADO"]} desde={piedras} tam={92} />
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 13. Cierre ---------- */

export const Cierre: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const linea = M("cierre", 1);
  return (
    <AbsoluteFill>
      <Foto k="arbolCamaron" nombre="Árbol junto a Camarón, con el mar de fondo" zoom={[1.25, 1.05]} oscurecer={0.35} />
      <Tramo desde={0} hasta={linea}>
        <Arriba>
          <Titulo lineas={["ESTA NAVIDAD,", "HAZTE UNA FOTO", "*CON NUESTRO ÁRBOL"]} desde={4} tam={92} />
        </Arriba>
      </Tramo>
      <Tramo desde={linea} hasta={durationInFrames + 10}>
        <Arriba top={ZONA_SEGURA.arriba + 40}>
          <Titulo lineas={["PORQUE ESO", "TAMBIÉN ES", "*LA LÍNEA."]} desde={linea + 2} tam={130} />
        </Arriba>
      </Tramo>
    </AbsoluteFill>
  );
};
