import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COSTA, LIENZO } from "./bahia";
import { entrada, suave } from "../marca/animacion";
import { Contador } from "../marca/Contador";
import { COLOR, FUENTE, MARCA, ZONA_SEGURA } from "../marca/marca";
import { MOMENTOS, URL_AUTORIZACIONES } from "./config";
import { SenalZbe } from "./SenalZbe";
import { aparece, clamp, Entrada, Fase, FondoAzul, Icono, ICONOS, Impacto, Mensaje, Seccion, Zona } from "./piezas";
import { frameEnEscena } from "./tiempos";

const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);

/* ---------- 5. ¿Qué ha hecho el Ayuntamiento? ---------- */

const CATEGORIAS: { readonly texto: string; readonly icono: keyof typeof ICONOS; readonly momento: keyof typeof MOMENTOS }[] = [
  { texto: "RESIDENTES", icono: "casa", momento: "residentes" },
  { texto: "PROPIETARIOS Y GARAJES", icono: "llave", momento: "propietarios" },
  { texto: "COMERCIOS Y PROVEEDORES", icono: "tienda", momento: "negocios" },
  { texto: "PERSONAS CON MOVILIDAD REDUCIDA", icono: "silla", momento: "movilidad" },
  { texto: "SERVICIOS ESENCIALES", icono: "cruz", momento: "servicios" },
  { texto: "ACCESOS TEMPORALES", icono: "reloj", momento: "situaciones" },
];

export const Ayuntamiento: React.FC = () => {
  const frame = useCurrentFrame();
  const lista = Math.max(40, f("residentes") - 8);
  return (
    <AbsoluteFill>
      <FondoAzul />
      <Entrada>
        {/* La señal de la ZBE de La Línea: "excepto autorizados" */}
        <Fase desde={0} hasta={lista}>
          <AbsoluteFill style={{ alignItems: "center", paddingTop: ZONA_SEGURA.arriba }}>
            <div style={{ rotate: `${interpolate(entrada(frame, 0, 18), [0, 1], [-8, -2])}deg`, scale: entrada(frame, 0, 18), filter: "drop-shadow(0 30px 50px rgba(0,0,0,0.35))" }}>
              <SenalZbe alto={1000} progreso={suave(frame, 6, 22)} />
            </div>
          </AbsoluteFill>
        </Fase>
        <Fase desde={lista}>
        <Zona top={ZONA_SEGURA.arriba - 10}>
          <Seccion>¿QUÉ HA HECHO EL AYUNTAMIENTO?</Seccion>
          <div style={{ marginTop: 24 }}>
            <Impacto lineas={["UNA OBLIGACIÓN,", "*PERO CON", "*EXCEPCIONES."]} desde={lista + 4} tamano={92} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 34 }}>
            {CATEGORIAS.map((c, i) => {
              const desde = Math.max(lista + 10 + i * 4, f(c.momento) - 4);
              const { opacity, p } = aparece(frame, desde);
              return (
                <div
                  key={c.texto}
                  style={{
                    backgroundColor: COLOR.blanco,
                    borderRadius: 22,
                    padding: "22px 22px 24px",
                    height: 190,
                    boxSizing: "border-box",
                    opacity,
                    scale: interpolate(p, [0, 1], [0.8, 1]),
                    boxShadow: "0 12px 28px rgba(0,0,0,0.2)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ width: 74, height: 74, borderRadius: 37, backgroundColor: COLOR.azul, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icono nombre={c.icono} tam={44} color={COLOR.blanco} grosor={2} />
                  </div>
                  <div style={{ fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 30, lineHeight: 1.1, color: COLOR.azulOscuro }}>{c.texto}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 24, fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 28, lineHeight: 1.35, color: COLOR.blanco, opacity: 0.9 * suave(frame, f("situaciones") + 10, 12) }}>
            Las autorizaciones están sujetas a condiciones y a la normativa de cada zona. El diseño de la ZBE y sus excepciones los fija el Ayuntamiento.
          </div>
        </Zona>
        </Fase>
      </Entrada>
    </AbsoluteFill>
  );
};

/* ---------- 6. Las excepciones, explicadas ---------- */

const BLOQUES: { readonly titulo: string; readonly texto: string; readonly momento: keyof typeof MOMENTOS }[] = [
  {
    titulo: "HASTA DOS VEHÍCULOS",
    texto: "Residentes empadronados, propietarios de inmuebles o garajes y titulares de negocios, cuando cumplan los requisitos.",
    momento: "permisos",
  },
  {
    titulo: "MOVILIDAD Y SERVICIOS",
    texto: "Personas con movilidad reducida, transporte de dependientes y servicios públicos o esenciales.",
    momento: "excepcionesMov",
  },
  {
    titulo: "ACTIVIDAD ECONÓMICA",
    texto: "Proveedores, repartos, mudanzas, talleres, construcción y otras actividades profesionales contempladas.",
    momento: "accesos",
  },
  {
    titulo: "ACCESOS TEMPORALES",
    texto: "Citas médicas, clínicas veterinarias, obras, recogidas, alojamientos y aparcamientos conectados al sistema, según sus condiciones.",
    momento: "medicos",
  },
];

export const Excepciones: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const url = Math.min(f("medicos") + 30, durationInFrames - 70);
  return (
    <AbsoluteFill>
      <FondoAzul oscuro />
      <Entrada>
        <Zona top={ZONA_SEGURA.arriba - 20}>
          <Impacto lineas={["LAS EXCEPCIONES,", "*EXPLICADAS"]} desde={2} tamano={78} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24 }}>
            {BLOQUES.map((b, i) => {
              const { opacity, p } = aparece(frame, f(b.momento) - 4);
              return (
                <div key={b.titulo} style={{ display: "flex", gap: 20, alignItems: "stretch", opacity, translate: `${(1 - p) * 140}px 0px` }}>
                  <div style={{ width: 82, flexShrink: 0, borderRadius: 16, backgroundColor: COLOR.lima, color: COLOR.negro, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FUENTE.display, fontWeight: 800, fontSize: 60 }}>{i + 1}</div>
                  <div style={{ flex: 1, backgroundColor: COLOR.blanco, borderRadius: 16, padding: "16px 22px 18px" }}>
                    <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 40, color: COLOR.azul, letterSpacing: -1, lineHeight: 1 }}>{b.titulo}</div>
                    <div style={{ fontFamily: FUENTE.texto, fontWeight: 500, fontSize: 28, lineHeight: 1.3, color: COLOR.negro, marginTop: 8 }}>{b.texto}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 22, opacity: suave(frame, url, 10), translate: `0px ${(1 - suave(frame, url, 10)) * 30}px` }}>
            <div style={{ backgroundColor: COLOR.azul, color: COLOR.blanco, fontFamily: FUENTE.texto, fontWeight: 800, fontSize: 40, padding: "10px 24px", borderRadius: 999, border: `3px solid ${COLOR.blanco}` }}>{URL_AUTORIZACIONES}</div>
          </div>
          <div style={{ marginTop: 14, fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 26, color: COLOR.blanco, opacity: 0.85 * suave(frame, url + 8, 10) }}>
            Algunos permisos requieren inscripción, documentación o resolución municipal.
          </div>
        </Zona>
      </Entrada>
    </AbsoluteFill>
  );
};

/* ---------- 7. La Línea no es la única ---------- */

/** Población aproximada (INE, padrón reciente), solo para la altura relativa de las barras; no se muestran cifras. */
const MUNICIPIOS = [
  { nombre: "LA LÍNEA", pob: 63000, obligado: true, texto: "Más de 50.000 habitantes.\nObligación estatal.", momento: null },
  { nombre: "ALGECIRAS", pob: 123000, obligado: true, texto: "Más de 50.000 habitantes.\nObligación estatal.", momento: "algeciras" as const },
  { nombre: "SAN ROQUE", pob: 33000, obligado: false, texto: "Menos de 50.000.\nNo obligado por ese umbral.", momento: "sanRoque" as const },
];

export const Comarca: React.FC = () => {
  const frame = useCurrentFrame();
  const base = 1010;
  const escala = 440 / 123000;
  const umbral = base - 50000 * escala;
  return (
    <AbsoluteFill>
      <FondoAzul />
      <Entrada>
        <Zona top={ZONA_SEGURA.arriba - 10}>
          <Impacto lineas={["LA LÍNEA", "*NO ES LA ÚNICA"]} desde={2} tamano={96} />
        </Zona>
        {/* Umbral de 50.000 habitantes */}
        <div style={{ position: "absolute", left: 60, right: 60, top: umbral, height: 0, borderTop: `5px dashed ${COLOR.blanco}`, opacity: suave(frame, 10, 10) }}>
          <div style={{ position: "absolute", right: 0, top: -54, fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 32, color: COLOR.blanco }}>50.000 HAB.</div>
        </div>
        {MUNICIPIOS.map((mu, i) => {
          const desde = mu.momento ? f(mu.momento) - 4 : 14;
          const crece = suave(frame, desde, 20);
          const alto = mu.pob * escala * crece;
          const x = 80 + i * 320;
          return (
            <div key={mu.nombre} style={{ position: "absolute", left: x, width: 280, top: 0, opacity: suave(frame, desde, 6) }}>
              <div style={{ position: "absolute", top: base - alto, width: 280, height: alto, borderRadius: "16px 16px 0 0", backgroundColor: mu.obligado ? COLOR.lima : "rgba(255,255,255,0.45)" }} />
              <div style={{ position: "absolute", top: base + 18, width: 280 }}>
                <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 44, color: COLOR.blanco, letterSpacing: -1 }}>{mu.nombre}</div>
                <div style={{ fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 25, lineHeight: 1.3, color: COLOR.blanco, opacity: 0.92, whiteSpace: "pre-line", marginTop: 6 }}>{mu.texto}</div>
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, top: 1215, fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 25, lineHeight: 1.35, color: COLOR.blanco, opacity: 0.85 * suave(frame, f("supuestos") - 4, 10), borderLeft: `5px solid ${COLOR.lima}`, paddingLeft: 16 }}>
          Los municipios de más de 20.000 habitantes también pueden estar obligados si superan los valores límite de calidad del aire.
        </div>
      </Entrada>
    </AbsoluteFill>
  );
};

/* ---------- 8. Reflexión final ---------- */

export const Reflexion: React.FC = () => {
  const frame = useCurrentFrame();
  const obliga = f("obliga");
  const realidad = f("realidad");
  const pregunta = f("pregunta");
  const existe = f("existe");
  // El mapa de la bahía se convierte en el número 50.000
  const dibujo = suave(frame, 0, 26);
  const transforma = suave(frame, 34, 26);
  return (
    <AbsoluteFill>
      <FondoAzul oscuro />
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0, opacity: 1 - transforma }}>
        <g transform={`translate(540 700) scale(${0.62 * (1 - transforma * 0.7)}) translate(${-LIENZO.ancho / 2} ${-LIENZO.alto / 2 + 150})`}>
          <path d={COSTA} fill="none" stroke={COLOR.blanco} strokeWidth={8} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - dibujo} />
        </g>
      </svg>
      <Fase desde={40} hasta={obliga + 2}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 300 }}>
          <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 220, color: COLOR.lima, letterSpacing: -8, lineHeight: 0.9, scale: interpolate(transforma, [0, 1], [0.4, 1]) }}>
            <Contador valor={50000} desde={40} duracion={26} />
          </div>
          <div style={{ fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 44, color: COLOR.blanco, letterSpacing: 2, marginTop: 16, opacity: suave(frame, 60, 10) }}>HABITANTES: EL UMBRAL DE LA LEY</div>
        </AbsoluteFill>
      </Fase>
      <Fase desde={obliga} hasta={realidad}>
        <Mensaje lineas={["LA LEY", "*ES ESTATAL."]} desde={obliga + 2} tamano={140} />
      </Fase>
      <Fase desde={realidad} hasta={pregunta}>
        <Mensaje lineas={["EL AYUNTAMIENTO", "*DEBE CUMPLIRLA."]} desde={realidad + 2} tamano={104} />
      </Fase>
      <Fase desde={pregunta} hasta={existe}>
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: ZONA_SEGURA.lados, paddingRight: ZONA_SEGURA.lados, paddingBottom: 280 }}>
          <div style={{ backgroundColor: COLOR.blanco, borderRadius: 26, padding: "36px 40px", boxShadow: "0 20px 50px rgba(0,0,0,0.35)", scale: entrada(frame, pregunta, 14) }}>
            <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 64, lineHeight: 1.05, color: COLOR.azulOscuro, letterSpacing: -2 }}>
              ¿Se han tenido en cuenta las circunstancias de <span style={{ color: COLOR.azul }}>La Línea</span>?
            </div>
            <div style={{ fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 32, color: "#4B5563", marginTop: 18 }}>Una ciudad vecina de grandes instalaciones industriales y portuarias.</div>
          </div>
        </AbsoluteFill>
      </Fase>
      <Fase desde={existe}>
        <Mensaje lineas={["LA REALIDAD", "DE LA LÍNEA", "MERECE SER", "*ESCUCHADA."]} desde={existe + 2} tamano={124} />
      </Fase>
    </AbsoluteFill>
  );
};

/* ---------- 9. Cierre de marca ---------- */

/** Curva azul inspirada en el perfil del Peñón. */
const PERFIL_PENON = "M0 1920 L0 1640 C180 1630 330 1600 470 1520 C600 1450 690 1330 760 1240 C800 1190 840 1180 870 1230 C930 1330 990 1450 1080 1500 L1080 1920 Z";

export const CierreMarca: React.FC = () => {
  const frame = useCurrentFrame();
  const curva = suave(frame, 0, 22);
  const texto = suave(frame, 10, 14);
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.blanco }}>
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <path d={PERFIL_PENON} fill={COLOR.azul} style={{ translate: `0px ${(1 - curva) * 700}px` }} />
      </svg>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 430, opacity: texto, translate: `0px ${(1 - texto) * 40}px` }}>
        {/* Isotipo (archivo blanco) teñido de azul mediante máscara */}
        <div
          style={{
            width: 180,
            height: 180,
            backgroundColor: COLOR.azul,
            WebkitMaskImage: `url(${MARCA.isotipo})`,
            maskImage: `url(${MARCA.isotipo})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
        <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 120, color: COLOR.azul, letterSpacing: -4, marginTop: 24 }}>INFOLINENSE</div>
        <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 44, color: COLOR.azulOscuro, textAlign: "center", lineHeight: 1.3, marginTop: 16, opacity: suave(frame, 22, 12) }}>
          La obligación existe.
          <br />
          La reflexión también.
        </div>
        <div style={{ marginTop: 40, backgroundColor: COLOR.lima, color: COLOR.negro, fontFamily: FUENTE.texto, fontWeight: 800, fontSize: 46, padding: "10px 30px", borderRadius: 999, opacity: suave(frame, 34, 12), scale: interpolate(suave(frame, 34, 12), [0, 1], [0.9, 1], clamp) }}>
          infolinense.com
        </div>
      </AbsoluteFill>
      {/* Necesario para que Img precargue el isotipo usado como máscara */}
      <Img src={MARCA.isotipo} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
    </AbsoluteFill>
  );
};

