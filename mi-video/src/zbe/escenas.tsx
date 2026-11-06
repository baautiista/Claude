import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { COLOR, FUENTE, ZONA_SEGURA } from "../marca/marca";
import { LIENZO, MAR, FRONTERA, PISTA, PUNTOS, ROTULOS } from "./bahia";
import { COMENTARIOS, MOMENTOS } from "./config";
import { aparece, Entrada, Fase, FondoAzul, Icono, Impacto, Mensaje, Resaltado, Seccion, Zona } from "./piezas";
import { frameEnEscena } from "./tiempos";

const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);

/* ---------- 1. Las críticas de los vecinos ---------- */

/** Comentario anónimo: sin nombre ni foto (avatar genérico y nombre difuminado). */
const Comentario: React.FC<{ readonly texto: string; readonly desde: number; readonly giro: number }> = ({ texto, desde, giro }) => {
  const frame = useCurrentFrame();
  const { opacity, p } = aparece(frame, desde);
  return (
    <div
      style={{
        backgroundColor: COLOR.blanco,
        borderRadius: 26,
        padding: "22px 28px 24px",
        boxShadow: "0 14px 34px rgba(10,10,10,0.10)",
        opacity,
        scale: interpolate(p, [0, 1], [0.85, 1]),
        translate: `${(1 - p) * 80 * (giro > 0 ? 1 : -1)}px 0px`,
        rotate: `${giro}deg`,
        display: "flex",
        gap: 20,
      }}
    >
      <div style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: "#D9DCE3", flexShrink: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
        <svg width={48} height={48} viewBox="0 0 24 24" fill="#B4B9C4">
          <circle cx="12" cy="9" r="5" />
          <path d="M2 24c1-6 5-9 10-9s9 3 10 9z" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ width: 190, height: 18, borderRadius: 9, backgroundColor: "#E3E6EC", marginBottom: 14, marginTop: 4 }} />
        <div style={{ fontFamily: FUENTE.texto, fontWeight: 500, fontSize: 42, lineHeight: 1.22, color: COLOR.negro }}>{texto}</div>
      </div>
    </div>
  );
};

export const Criticas: React.FC = () => {
  const frame = useCurrentFrame();
  const pero = f("pero");
  const corte = pero - 4;
  const giros = [-1.5, 1.2, -0.8, 1.6, -1.2];
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.grisClaro }}>
      <Zona top={ZONA_SEGURA.arriba - 10}>
        <div style={{ fontFamily: FUENTE.rotulo, fontWeight: 700, fontSize: 30, letterSpacing: 3, color: "#6B7280", marginBottom: 26, opacity: suave(frame, 0, 10) }}>COMENTARIOS EN FACEBOOK</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {COMENTARIOS.map((c, i) => (
            <Comentario key={c} texto={c} desde={4 + i * Math.max(12, Math.floor((corte - 30) / COMENTARIOS.length))} giro={giros[i]} />
          ))}
        </div>
      </Zona>
      {/* Corte a azul corporativo con el titular */}
      {frame >= corte ? (
        <AbsoluteFill style={{ clipPath: `inset(${100 - suave(frame, corte, 10) * 100}% 0 0 0)` }}>
          <FondoAzul />
          <Mensaje lineas={["¿QUIÉN", "NOS OBLIGA", "A TENER", "*UNA ZBE?"]} desde={corte + 6} tamano={150} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

/* ---------- 2. La responsabilidad del Estado ---------- */

const Documento: React.FC<{ readonly desde: number; readonly resalta: number }> = ({ desde, resalta }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 16);
  const r1 = suave(frame, resalta, 14);
  const r2 = suave(frame, resalta + 14, 14);
  return (
    <div
      style={{
        width: 860,
        backgroundColor: COLOR.blanco,
        borderRadius: 14,
        padding: "44px 48px 52px",
        boxShadow: "0 30px 70px rgba(0,0,0,0.3)",
        rotate: `${interpolate(p, [0, 1], [6, -1.5])}deg`,
        translate: `0px ${(1 - p) * 900}px`,
        color: COLOR.negro,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `4px solid ${COLOR.negro}`, paddingBottom: 18 }}>
        <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 60, letterSpacing: -2 }}>LEY 7/2021</div>
        <div style={{ fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 24, textAlign: "right", lineHeight: 1.2, color: "#4B5563" }}>
          de 20 de mayo, de cambio
          <br />
          climático y transición energética
        </div>
      </div>
      <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 74, color: COLOR.azul, margin: "26px 0 16px", letterSpacing: -2 }}>Artículo 14.3</div>
      <div style={{ fontFamily: FUENTE.texto, fontWeight: 500, fontSize: 34, lineHeight: 1.5 }}>
        «Los <Resaltado progreso={r1}>municipios de más de 50.000 habitantes</Resaltado> y los territorios insulares adoptarán antes de 2023 planes de movilidad urbana sostenible […] incluyendo, al menos: a) El{" "}
        <Resaltado progreso={r2}>establecimiento de zonas de bajas emisiones</Resaltado> antes de 2023.»
      </div>
    </div>
  );
};

const NIVELES = [
  { quien: "UNIÓN EUROPEA", que: "Compromisos ambientales" },
  { quien: "CORTES GENERALES", que: "Ley 7/2021" },
  { quien: "GOBIERNO DE ESPAÑA", que: "Desarrollo reglamentario (RD 1052/2022)" },
  { quien: "AYUNTAMIENTO", que: "Aplicación municipal" },
];

export const Estado: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const obligacion = f("obligacion");
  const anio = f("anio");
  const impulsada = f("impulsada");
  const final = durationInFrames - 66;
  return (
    <AbsoluteFill>
      <FondoAzul />
      <Entrada>
        {/* ¿Decisión municipal? Tachado */}
        <Fase desde={0} hasta={obligacion}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 300 }}>
            <div style={{ position: "relative", padding: "10px 20px" }}>
              <Impacto lineas={["¿DECISIÓN", "MUNICIPAL?"]} desde={4} tamano={130} alinear="center" />
              <div style={{ position: "absolute", left: -10, right: -10, top: "50%", height: 22, backgroundColor: COLOR.rosa, borderRadius: 11, rotate: "-6deg", transformOrigin: "0% 50%", scale: `${suave(frame, 28, 12)} 1` }} />
            </div>
            <div style={{ marginTop: 40, fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 56, color: COLOR.lima, opacity: suave(frame, 36, 10) }}>NO: OBLIGACIÓN LEGAL</div>
          </AbsoluteFill>
        </Fase>
        {/* Documento: Ley 7/2021, art. 14.3 */}
        <Fase desde={obligacion - 6} hasta={anio + 46}>
          <Zona top={300}>
            <Documento desde={obligacion - 6} resalta={obligacion + 14} />
          </Zona>
        </Fase>
        {/* +50.000 habitantes → ZBE obligatoria */}
        <Fase desde={anio + 40} hasta={impulsada + 4}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 300, gap: 24 }}>
            <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 200, color: COLOR.blanco, letterSpacing: -8, lineHeight: 0.9, scale: entrada(frame, anio + 40, 14) }}>+50.000</div>
            <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 64, color: COLOR.blanco, letterSpacing: -1 }}>HABITANTES</div>
            <svg width={80} height={90} viewBox="0 0 80 90" style={{ opacity: suave(frame, anio + 52, 8) }}>
              <path d="M40 0v70M14 46l26 28 26-28" stroke={COLOR.lima} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ backgroundColor: COLOR.lima, color: COLOR.negro, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 80, letterSpacing: -2, padding: "8px 30px 12px", borderRadius: 14, scale: entrada(frame, anio + 58, 14) }}>
              ZBE OBLIGATORIA
            </div>
          </AbsoluteFill>
        </Fase>
        {/* Cadena de responsabilidades */}
        <Fase desde={impulsada} hasta={final}>
          <Zona top={ZONA_SEGURA.arriba + 10}>
            <Seccion desde={impulsada}>¿QUIÉN HACE QUÉ?</Seccion>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 34 }}>
              {NIVELES.map((n, i) => {
                const { opacity, p } = aparece(frame, impulsada + 6 + i * 14);
                const ayto = i === NIVELES.length - 1;
                return (
                  <div key={n.quien} style={{ opacity }}>
                    {i > 0 ? (
                      <svg width={60} height={56} viewBox="0 0 60 56" style={{ marginLeft: 40 }}>
                        <path d="M30 4v38M14 30l16 18 16-18" stroke={COLOR.blanco} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                    <div
                      style={{
                        backgroundColor: ayto ? COLOR.lima : COLOR.blanco,
                        borderRadius: 18,
                        padding: "20px 28px",
                        translate: `${(1 - p) * -120}px 0px`,
                        boxShadow: "0 14px 30px rgba(0,0,0,0.18)",
                      }}
                    >
                      <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 52, letterSpacing: -1, color: ayto ? COLOR.negro : COLOR.azul, lineHeight: 1 }}>{n.quien}</div>
                      <div style={{ fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 34, color: COLOR.negro, marginTop: 6 }}>{n.que}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Zona>
        </Fase>
        <Fase desde={final}>
          <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro }} />
          <Mensaje lineas={["LA LÍNEA", "ESTÁ OBLIGADA", "*A CUMPLIRLA."]} desde={final + 4} tamano={128} />
        </Fase>
      </Entrada>
    </AbsoluteFill>
  );
};

/* ---------- 3. La contradicción ambiental: mapa vectorial ---------- */

/** Encaje del lienzo de la bahía (1500 × 1895) en la pantalla. */
const MAPA = { escala: 0.72, dx: 0, dy: 200 } as const;
const enPantalla = (p: { x: number; y: number }) => ({ x: p.x * MAPA.escala + MAPA.dx, y: p.y * MAPA.escala + MAPA.dy });

const Instalacion: React.FC<{ readonly icono: "fabrica" | "ancla" | "avion"; readonly nombre: string; readonly x: number; readonly y: number; readonly desde: number; readonly lado?: "izq" | "der" | "abajo" }> = ({
  icono,
  nombre,
  x,
  y,
  desde,
  lado = "der",
}) => {
  const frame = useCurrentFrame();
  const { opacity, p } = aparece(frame, desde);
  const pulso = ((frame - desde) % 45) / 45;
  const posTexto: React.CSSProperties =
    lado === "der" ? { left: 50, top: -24 } : lado === "izq" ? { right: 50, top: -24 } : { left: -120, top: 52, width: 240, textAlign: "center" };
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity }}>
      {frame > desde ? <div style={{ position: "absolute", left: -40 - pulso * 30, top: -40 - pulso * 30, width: 80 + pulso * 60, height: 80 + pulso * 60, borderRadius: "50%", border: `3px solid ${COLOR.blanco}`, opacity: (1 - pulso) * 0.5 }} /> : null}
      <div style={{ position: "absolute", left: -38, top: -38, width: 76, height: 76, borderRadius: 38, backgroundColor: COLOR.blanco, display: "flex", alignItems: "center", justifyContent: "center", scale: p, boxShadow: "0 8px 20px rgba(0,0,0,0.3)" }}>
        <Icono nombre={icono} tam={44} color={COLOR.azulOscuro} grosor={2.2} />
      </div>
      <div style={{ position: "absolute", whiteSpace: "pre", fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 30, color: COLOR.blanco, lineHeight: 1.05, textShadow: "0 2px 8px rgba(6,30,92,0.8)", ...posTexto }}>
        {nombre}
      </div>
    </div>
  );
};

export const Contradiccion: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const industrias = f("industrias");
  const portuarias = f("portuarias");
  const maritimo = f("maritimo");
  const sinEmbargo = f("sinEmbargo");
  const final = durationInFrames - 60;
  const dibujo = suave(frame, 0, 24);
  const ll = enPantalla(PUNTOS.laLinea);
  const barcos = [
    { x: 760, y: 620, v: 0.5 },
    { x: 900, y: 980, v: -0.4 },
    { x: 760, y: 1300, v: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro, overflow: "hidden" }}>
      {/* Mapa esquemático de la bahía */}
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(${MAPA.dx} ${MAPA.dy}) scale(${MAPA.escala})`}>
          <rect width={LIENZO.ancho} height={LIENZO.alto} fill={COLOR.azul} opacity={dibujo} />
          <path d={MAR} fill={COLOR.azulOscuro} stroke="rgba(255,255,255,0.75)" strokeWidth={4} />
          <line {...FRONTERA} stroke="white" strokeWidth={5} strokeDasharray="14 10" opacity={0.7 * dibujo} />
          {/* Pista del aeropuerto, atravesando el istmo */}
          <rect x={PISTA.x} y={PISTA.y} width={PISTA.ancho} height={PISTA.alto} rx={4} fill="rgba(255,255,255,0.5)" opacity={suave(frame, portuarias + 10, 10)} />
          {/* Tráfico marítimo */}
          {barcos.map((b, i) => (
            <g key={i} transform={`translate(${b.x + (frame - maritimo) * b.v} ${b.y})`} opacity={suave(frame, maritimo + i * 5, 10)}>
              <path d="M-40 0 L40 0 L28 18 L-28 18 Z M-16 0 V-22 H16 V0" fill={COLOR.blanco} opacity={0.85} />
            </g>
          ))}
          {ROTULOS.map((r) => (
            <text key={r.texto} x={r.x} y={r.y} textAnchor="middle" fontFamily={FUENTE.texto} fontWeight={700} fontSize={32} fill="white" opacity={0.65 * dibujo} letterSpacing={3}>
              {r.texto}
            </text>
          ))}
        </g>
      </svg>
      {/* Bordes del mapa difuminados */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${COLOR.azulOscuro} 9%, rgba(6,30,92,0) 17%, rgba(6,30,92,0) 62%, ${COLOR.azulOscuro} 80%)` }} />
      {/* La Línea */}
      <div style={{ position: "absolute", left: ll.x, top: ll.y, opacity: suave(frame, 8, 10) }}>
        <div style={{ position: "absolute", left: -22, top: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: COLOR.lima, border: `6px solid ${COLOR.blanco}`, scale: entrada(frame, 8, 14) }} />
        <div style={{ position: "absolute", right: 36, top: -34, backgroundColor: COLOR.lima, color: COLOR.negro, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 40, padding: "2px 14px 4px", borderRadius: 8, whiteSpace: "nowrap" }}>LA LÍNEA</div>
      </div>
      <Instalacion icono="fabrica" nombre="Refinería" x={enPantalla(PUNTOS.refineria).x} y={enPantalla(PUNTOS.refineria).y} desde={industrias - 4} lado="abajo" />
      <Instalacion icono="fabrica" nombre="Acerinox" x={enPantalla(PUNTOS.acerinox).x} y={enPantalla(PUNTOS.acerinox).y} desde={industrias + 4} lado="abajo" />
      <Instalacion icono="ancla" nombre={"Puerto de\nAlgeciras"} x={enPantalla(PUNTOS.puerto).x} y={enPantalla(PUNTOS.puerto).y} desde={portuarias - 4} lado="der" />
      <Instalacion icono="avion" nombre={"Aeropuerto\nde Gibraltar"} x={enPantalla(PUNTOS.aeropuerto).x} y={enPantalla(PUNTOS.aeropuerto).y} desde={portuarias + 10} lado="izq" />
      {/* Rótulo superior */}
      <Zona top={ZONA_SEGURA.arriba - 30}>
        <Seccion desde={0}>CAMPO DE GIBRALTAR</Seccion>
      </Zona>
      {/* Sin exención */}
      <Fase desde={sinEmbargo} hasta={final}>
        <div style={{ position: "absolute", left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, top: 1130, backgroundColor: COLOR.blanco, borderRadius: 20, padding: "22px 28px", display: "flex", alignItems: "center", gap: 22, boxShadow: "0 16px 40px rgba(0,0,0,0.35)" }}>
          <div style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: COLOR.rosa, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icono nombre="equis" tam={40} color={COLOR.blanco} grosor={3} />
          </div>
          <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 46, lineHeight: 1.05, color: COLOR.azulOscuro, letterSpacing: -1 }}>
            La ley no prevé una <span style={{ color: COLOR.azul }}>exención general</span>
          </div>
        </div>
      </Fase>
      {/* Mensaje a pantalla completa */}
      <Fase desde={final}>
        <FondoAzul />
        <Mensaje lineas={["LA", "CONTAMINACIÓN", "NO ENTIENDE", "*DE TÉRMINOS", "*MUNICIPALES."]} desde={final + 4} tamano={112} />
      </Fase>
    </AbsoluteFill>
  );
};

/* ---------- 4. ¿Y Málaga y Madrid? ---------- */

const Ficha: React.FC<{
  readonly ciudad: string;
  readonly fecha: string;
  readonly estado: string;
  readonly colorEstado: string;
  readonly colorTextoEstado: string;
  readonly texto: string;
  readonly desde: number;
}> = ({ ciudad, fecha, estado, colorEstado, colorTextoEstado, texto, desde }) => {
  const frame = useCurrentFrame();
  const { opacity, p } = aparece(frame, desde);
  return (
    <div style={{ backgroundColor: COLOR.blanco, borderRadius: 26, padding: "30px 34px 34px", opacity, translate: `${(1 - p) * 160}px 0px`, boxShadow: "0 18px 40px rgba(0,0,0,0.25)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 84, letterSpacing: -3, color: COLOR.azul, lineHeight: 1 }}>{ciudad}</div>
        <div style={{ fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 30, color: COLOR.azulOscuro, border: `3px solid ${COLOR.azulOscuro}`, borderRadius: 10, padding: "4px 14px" }}>{fecha}</div>
      </div>
      <div style={{ display: "inline-block", marginTop: 16, backgroundColor: colorEstado, color: colorTextoEstado, fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 36, letterSpacing: 1, padding: "6px 18px", borderRadius: 10 }}>{estado}</div>
      <div style={{ fontFamily: FUENTE.texto, fontWeight: 500, fontSize: 33, lineHeight: 1.35, color: COLOR.negro, marginTop: 18 }}>{texto}</div>
    </div>
  );
};

export const Ciudades: React.FC = () => {
  const frame = useCurrentFrame();
  const malaga = f("malaga");
  const madrid = f("madrid");
  const pero = f("peroSentencias");
  return (
    <AbsoluteFill>
      <FondoAzul />
      <Entrada>
        <Fase desde={0} hasta={pero + 2}>
          <Zona top={ZONA_SEGURA.arriba - 10}>
            <Impacto lineas={["¿Y MÁLAGA", "*Y MADRID?"]} desde={2} tamano={96} />
            <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 30 }}>
              <Ficha
                ciudad="MÁLAGA"
                fecha="14 OCT 2026"
                estado="SANCIONES SUSPENDIDAS"
                colorEstado={COLOR.rosa}
                colorTextoEstado={COLOR.blanco}
                texto="Una sentencia del TSJA anuló la regulación municipal de su ZBE. El Ayuntamiento dejó de multar."
                desde={malaga - 4}
              />
              <Ficha
                ciudad="MADRID"
                fecha="2026"
                estado="NUEVA REGULACIÓN"
                colorEstado={COLOR.lima}
                colorTextoEstado={COLOR.negro}
                texto="La justicia anuló parte de la ordenanza anterior. Madrid aprobó una nueva (Ordenanza 2/2026) y mantiene sus ZBE."
                desde={madrid - 2}
              />
            </div>
          </Zona>
        </Fase>
        {/* Anular una ordenanza no es derogar la ley */}
        <Fase desde={pero}>
          <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro }} />
          <Zona top={ZONA_SEGURA.arriba + 30}>
            <div style={{ display: "flex", gap: 40, justifyContent: "center", marginBottom: 60 }}>
              {[
                { t: "ORDENANZA", ok: false, d: pero + 6 },
                { t: "LEY", ok: true, d: pero + 16 },
              ].map((d) => {
                const { opacity, p } = aparece(frame, d.d);
                return (
                  <div key={d.t} style={{ opacity, scale: interpolate(p, [0, 1], [0.7, 1]), display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <div style={{ position: "relative", width: 200, height: 250, backgroundColor: COLOR.blanco, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icono nombre="documento" tam={140} color={COLOR.azulOscuro} grosor={1.4} />
                      <div style={{ position: "absolute", right: -22, bottom: -22, width: 86, height: 86, borderRadius: 43, backgroundColor: d.ok ? COLOR.lima : COLOR.rosa, display: "flex", alignItems: "center", justifyContent: "center", scale: entrada(frame, d.d + 10, 12) }}>
                        <Icono nombre={d.ok ? "check" : "equis"} tam={50} color={d.ok ? COLOR.negro : COLOR.blanco} grosor={3.2} />
                      </div>
                    </div>
                    <div style={{ fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 36, color: COLOR.blanco, letterSpacing: 2 }}>{d.t}</div>
                  </div>
                );
              })}
            </div>
            <Impacto lineas={["ANULAR UNA", "ORDENANZA", "NO ES DEROGAR", "*LA LEY."]} desde={pero + 22} tamano={104} />
          </Zona>
        </Fase>
      </Entrada>
    </AbsoluteFill>
  );
};
