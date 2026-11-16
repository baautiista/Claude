import { Audio } from "@remotion/media";
import { useMemo } from "react";
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../marca/animacion";
import { CamaraEscena } from "../marca/Efectos";
import { Firma } from "../marca/Firma";
import { aFrames, crearTiempos, type DatosLocucion } from "../marca/guion";
import { COLOR, FUENTE, ZONA_SEGURA, existe } from "../marca/marca";
import { Placeholder } from "../marca/Placeholder";
import { Subtitulos } from "../marca/Subtitulos";
import { AUDIO, ESCENAS, type EscenaId } from "./config";
import datosLocucion from "./locucion-tiempos.json";

const FIRMA = 1;
const tiempos = crearTiempos({ escenas: ESCENAS, datos: datosLocucion as DatosLocucion, firmaSegundos: FIRMA, colaFinal: 3, maxCaracteresSubtitulo: 28 });
export const duracionEstacion = tiempos.duracionTotal;
export const subtitulosEstacion = tiempos.subtitulos;
const { getEscena, frameEnEscena, finDeEscenas } = tiempos;
const M = (escena: EscenaId, frase: number, palabra?: string) => frameEnEscena({ escena, frase, palabra });
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* ---------- Fotos ---------- */

const FOTOS = {
  fachadaActual: { archivo: "estacion/fachada-actual.jpg", nombre: "Fachada actual", enfoque: "56% 52%" },
  fachadaAntigua: { archivo: "estacion/fachada-antigua.jpg", nombre: "Fachada antigua", enfoque: "72% 55%", archivoAntiguo: true },
  interiorAntiguo: { archivo: "estacion/interior-antiguo.jpg", nombre: "Interior antiguo", enfoque: "50% 50%", archivoAntiguo: true },
  interiorRenovado: { archivo: "estacion/interior-renovado.jpg", nombre: "Interior renovado", enfoque: "40% 50%", credito: "Foto: Fabián España" },
  andenes: { archivo: "estacion/andenes-antiguos.jpg", nombre: "Andenes antiguos", enfoque: "35% 50%", archivoAntiguo: true },
  banco: { archivo: "estacion/banco-mugre.jpg", nombre: "Banco sucio", enfoque: "55% 50%", archivoAntiguo: true },
  vigas: { archivo: "estacion/vigas-anden.jpg", nombre: "Vigas del andén corroídas", enfoque: "50% 50%", archivoAntiguo: true },
  humedades: { archivo: "estacion/humedades.jpg", nombre: "Humedades", enfoque: "50% 50%", archivoAntiguo: true },
  suciedad: { archivo: "estacion/suciedad-paredes.jpg", nombre: "Suciedad en las paredes", enfoque: "45% 50%", archivoAntiguo: true },
} as const;
type ClaveFoto = keyof typeof FOTOS;
type DatosFoto = { archivo: string; nombre: string; enfoque: string; archivoAntiguo?: boolean; credito?: string };

const Sello: React.FC<{ readonly texto: string; readonly style?: React.CSSProperties }> = ({ texto, style }) => (
  <div style={{ position: "absolute", backgroundColor: "rgba(10,10,10,0.72)", color: COLOR.blanco, fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 26, padding: "5px 14px", borderRadius: 6, ...style }}>{texto}</div>
);

/** Foto a pantalla completa con cámara lenta, sello de archivo y crédito. */
const Plano: React.FC<{ readonly k: ClaveFoto; readonly zoom?: [number, number]; readonly oscurecer?: number; readonly duracion?: number }> = ({ k, zoom = [1.06, 1.18], oscurecer = 0.4, duracion }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const f = FOTOS[k] as DatosFoto;
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro, overflow: "hidden" }}>
      {existe(f.archivo) ? (
        <Img src={staticFile(f.archivo)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: f.enfoque, transformOrigin: f.enfoque, scale: interpolate(frame, [0, duracion ?? durationInFrames], zoom, clamp) }} />
      ) : (
        <Placeholder nombre={f.nombre} archivo={f.archivo.split("/").pop()} />
      )}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(6,30,92,${oscurecer + 0.3}) 0%, rgba(6,30,92,${oscurecer * 0.3}) 34%, rgba(6,30,92,${oscurecer * 0.3}) 60%, rgba(6,30,92,${oscurecer + 0.35}) 100%)` }} />
      {f.archivoAntiguo ? <Sello texto="Archivo · antes de la reforma" style={{ left: ZONA_SEGURA.lados, bottom: ZONA_SEGURA.abajo + 190 }} /> : null}
      {f.credito ? <Sello texto={f.credito} style={{ right: ZONA_SEGURA.lados, bottom: ZONA_SEGURA.abajo + 190 }} /> : null}
    </AbsoluteFill>
  );
};

/** Tarjeta con foto completa (para comparaciones). */
const Tarjeta: React.FC<{ readonly k: ClaveFoto; readonly etiqueta: string; readonly lima?: boolean; readonly desde: number; readonly lado: 1 | -1 }> = ({ k, etiqueta, lima = false, desde, lado }) => {
  const frame = useCurrentFrame();
  const f = FOTOS[k] as DatosFoto;
  const p = entrada(frame, desde, 16);
  return (
    <div style={{ position: "relative", width: 960, height: 600, borderRadius: 24, overflow: "hidden", border: `6px solid ${lima ? COLOR.lima : COLOR.blanco}`, boxShadow: "0 24px 50px rgba(0,0,0,0.4)", opacity: Math.min(1, p * 2), translate: `${(1 - p) * 600 * lado}px 0px`, backgroundColor: COLOR.azulOscuro }}>
      {existe(f.archivo) ? (
        <Img src={staticFile(f.archivo)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: k === "fachadaAntigua" ? "62% 70%" : k === "fachadaActual" ? "55% 65%" : "50% 55%", scale: interpolate(frame, [desde, desde + 200], [1.08, 1], clamp) }} />
      ) : (
        <Placeholder nombre={f.nombre} archivo={f.archivo.split("/").pop()} compacto />
      )}
      <div style={{ position: "absolute", left: 18, top: 18, backgroundColor: lima ? COLOR.lima : COLOR.rosa, color: lima ? COLOR.negro : COLOR.blanco, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 44, padding: "4px 18px 6px", borderRadius: 10 }}>{etiqueta}</div>
      {f.archivoAntiguo ? <Sello texto="Archivo · antes de la reforma" style={{ left: 18, bottom: 18, fontSize: 22 }} /> : null}
      {f.credito ? <Sello texto={f.credito} style={{ right: 18, bottom: 18, fontSize: 22 }} /> : null}
    </div>
  );
};

/** Rótulo de titular por líneas con máscara; «*» = lima. */
const Titular: React.FC<{ readonly lineas: readonly string[]; readonly desde: number; readonly tam?: number }> = ({ lineas, desde, tam = 100 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
      {lineas.map((l, i) => {
        const p = entrada(frame, desde + i * 4, 13, 13);
        const lima = l.startsWith("*");
        return (
          <div key={l + i} style={{ overflow: "hidden", paddingBottom: tam * 0.06 }}>
            <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: tam, lineHeight: 0.98, letterSpacing: -tam * 0.035, color: lima ? COLOR.lima : COLOR.blanco, translate: `0px ${(1 - p) * 108}%`, textShadow: "0 6px 30px rgba(0,0,0,0.4)" }}>{lima ? l.slice(1) : l}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Fecha + hecho en una franja (cronología). */
const Fecha: React.FC<{ readonly anio: string; readonly texto: string; readonly desde: number; readonly top?: number; readonly lima?: boolean }> = ({ anio, texto, desde, top = ZONA_SEGURA.arriba + 30, lima = false }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 14);
  return (
    <div style={{ position: "absolute", top, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, display: "flex", alignItems: "stretch", opacity: Math.min(1, p * 2), translate: `${(1 - p) * -200}px 0px`, boxShadow: "0 18px 40px rgba(0,0,0,0.35)" }}>
      <div style={{ backgroundColor: lima ? COLOR.lima : COLOR.azul, color: lima ? COLOR.negro : COLOR.blanco, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 72, padding: "10px 22px", display: "flex", alignItems: "center", letterSpacing: -2 }}>{anio}</div>
      <div style={{ flex: 1, backgroundColor: COLOR.blanco, color: COLOR.azulOscuro, fontFamily: FUENTE.rotulo, fontWeight: 700, fontSize: 38, lineHeight: 1.15, padding: "16px 22px", display: "flex", alignItems: "center" }}>{texto}</div>
    </div>
  );
};

/** Corte entre fotos según frames (relativos a la escena). */
const Cortes: React.FC<{ readonly tramos: readonly { k: ClaveFoto; desde: number }[] }> = ({ tramos }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <>
      {tramos.map((t, i) => {
        const hasta = i + 1 < tramos.length ? tramos[i + 1].desde : durationInFrames;
        if (frame < t.desde - 1 || frame > hasta + 6) return null;
        return (
          <Sequence key={t.k + i} from={t.desde} durationInFrames={hasta - t.desde + 6} layout="none">
            <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${(1 - suave(frame - t.desde, 0, 6)) * 100}%)` }}>
              <Plano k={t.k} />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </>
  );
};

/** Muestra el contenido entre dos frames. */
const Tramo: React.FC<{ readonly desde: number; readonly hasta?: number; readonly children: React.ReactNode }> = ({ desde, hasta, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fin = hasta ?? durationInFrames + 10;
  if (frame < desde - 1 || frame > fin + 1) return null;
  const entra = suave(frame, desde, 8);
  const sale = suave(frame, fin - 6, 6);
  return <AbsoluteFill style={{ opacity: entra * (1 - sale) }}>{children}</AbsoluteFill>;
};

/* ---------- 1. Gancho ---------- */

const Gancho: React.FC = () => {
  const frame = useCurrentFrame();
  const mira = M("gancho", 4);
  const p = entrada(frame, mira + 4, 14, 11);
  return (
    <AbsoluteFill>
      <Cortes tramos={[{ k: "vigas", desde: 0 }, { k: "humedades", desde: 50 }, { k: "banco", desde: 100 }, { k: "andenes", desde: M("gancho", 2, "golpeaban") }, { k: "suciedad", desde: M("gancho", 3) }, { k: "fachadaActual", desde: mira }]} />
      <Tramo desde={M("gancho", 3, "2015.") - 4} hasta={mira}>
        <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 220, color: COLOR.blanco, letterSpacing: -8, lineHeight: 1 }}>2015</div>
      </Tramo>
      <Tramo desde={mira}>
        <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, opacity: Math.min(1, p * 2), scale: interpolate(p, [0, 1], [1.4, 1]), transformOrigin: "0% 0%" }}>
          <div style={{ display: "inline-block", backgroundColor: COLOR.blanco, color: COLOR.azulOscuro, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 84, letterSpacing: -2, padding: "6px 20px 10px", lineHeight: 1 }}>LA MISMA ESTACIÓN.</div>
          <div style={{ display: "inline-block", marginTop: 10, backgroundColor: COLOR.lima, color: COLOR.negro, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 84, letterSpacing: -2, padding: "6px 20px 10px", lineHeight: 1 }}>MIRA EL CAMBIO</div>
        </div>
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 2. El deterioro venía de lejos ---------- */

const Deterioro: React.FC = () => {
  const frame = useCurrentFrame();
  const f2014 = M("deterioro", 2);
  const reparto = M("deterioro", 3);
  const partidos = M("deterioro", 4);
  return (
    <AbsoluteFill>
      <Cortes tramos={[{ k: "fachadaAntigua", desde: 0 }, { k: "interiorAntiguo", desde: f2014 }, { k: "andenes", desde: partidos }, { k: "humedades", desde: M("deterioro", 5) }]} />
      <Tramo desde={M("deterioro", 1, "2009") - 4} hasta={f2014}>
        <Fecha anio="2009" texto="Primeras quejas localizadas" desde={M("deterioro", 1, "2009") - 4} />
      </Tramo>
      <Tramo desde={f2014} hasta={reparto}>
        <Fecha anio="2014" texto="El Ayuntamiento adjudica la gestión a Los Amarillos" desde={f2014 + 2} />
        <div style={{ position: "absolute", top: 520, left: ZONA_SEGURA.lados, display: "flex", flexWrap: "wrap", gap: 12, width: 900 }}>
          {["Baños", "Vallado", "Cancelas", "Marquesina"].map((t, i) => {
            const q = entrada(frame, M("deterioro", 2, "baños,") + i * 5, 12, 12);
            return <div key={t} style={{ backgroundColor: COLOR.rosa, color: COLOR.blanco, fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 40, padding: "8px 20px", borderRadius: 10, opacity: Math.min(1, q * 2), scale: interpolate(q, [0, 1], [0.6, 1]) }}>{t}</div>;
          })}
          <div style={{ width: "100%", fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 32, color: COLOR.blanco, opacity: suave(frame, M("deterioro", 2, "urgentes."), 8), textShadow: "0 2px 10px rgba(0,0,0,0.6)" }}>Reparaciones urgentes ya en 2014</div>
        </div>
      </Tramo>
      <Tramo desde={reparto} hasta={partidos}>
        <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro }} />
        <AbsoluteFill style={{ justifyContent: "center", paddingLeft: ZONA_SEGURA.lados, paddingRight: ZONA_SEGURA.lados, paddingBottom: 300, gap: 30, display: "flex", flexDirection: "column" }}>
          {[
            { q: "LA EMPRESA", t: "Tenía que hacer las obras", d: reparto + 2 },
            { q: "EL AYUNTAMIENTO", t: "Tenía que exigir que se cumplieran", d: M("deterioro", 3, "Ayuntamiento") },
          ].map((b) => {
            const q = entrada(frame, b.d, 14);
            return (
              <div key={b.q} style={{ backgroundColor: COLOR.blanco, borderRadius: 24, padding: "26px 32px", opacity: Math.min(1, q * 2), translate: `${(1 - q) * 300}px 0px` }}>
                <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 64, color: COLOR.azul, letterSpacing: -2 }}>{b.q}</div>
                <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 44, color: COLOR.azulOscuro, marginTop: 6 }}>{b.t}</div>
              </div>
            );
          })}
        </AbsoluteFill>
      </Tramo>
      <Tramo desde={partidos}>
        <Fecha anio="2015" texto="Enero · El PP denuncia que las reparaciones siguen pendientes" desde={partidos + 2} />
        <Fecha anio="2015" texto="Días después · UPyD denuncia el abandono" desde={M("deterioro", 5)} top={ZONA_SEGURA.arriba + 260} />
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 3. Las denuncias de 2017 ---------- */

const Denuncias: React.FC = () => {
  const frame = useCurrentFrame();
  const tarjetas = [
    { t: "BAÑOS SIN AGUA", d: 6 },
    { t: "SOCAVONES EN EL RECORRIDO DE LOS AUTOBUSES", d: M("denuncias", 0, "socavones") - 3 },
    { t: "CABLES A LA VISTA", d: M("denuncias", 3, "cables") - 3 },
  ];
  return (
    <AbsoluteFill>
      <Cortes tramos={[{ k: "andenes", desde: 0 }, { k: "vigas", desde: M("denuncias", 1) }, { k: "andenes", desde: M("denuncias", 2) }, { k: "vigas", desde: M("denuncias", 3) }]} />
      <AbsoluteFill style={{ backgroundColor: "rgba(6,30,92,0.72)" }} />
      <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 10, left: ZONA_SEGURA.lados, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 170, color: COLOR.blanco, letterSpacing: -6, lineHeight: 1, opacity: suave(frame, 0, 8) }}>2017</div>
      <div style={{ position: "absolute", top: 470, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, display: "flex", flexDirection: "column", gap: 22 }}>
        {tarjetas.map((c) => {
          const q = entrada(frame, c.d, 12, 11);
          return (
            <div key={c.t} style={{ display: "flex", alignItems: "center", gap: 22, backgroundColor: COLOR.blanco, borderRadius: 20, padding: "22px 26px", opacity: Math.min(1, q * 2), scale: interpolate(q, [0, 1], [1.3, 1]), boxShadow: "0 18px 40px rgba(0,0,0,0.35)" }}>
              <div style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLOR.rosa, color: COLOR.blanco, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FUENTE.display, fontWeight: 800, fontSize: 44, flexShrink: 0 }}>!</div>
              <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 54, lineHeight: 1.02, letterSpacing: -1.5, color: COLOR.azulOscuro }}>{c.t}</div>
            </div>
          );
        })}
        <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 34, color: COLOR.blanco, opacity: suave(frame, M("denuncias", 3, "extintores"), 8) }}>+ Falta de vigilancia · extintores con revisiones atrasadas</div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 4. La respuesta: el Ayuntamiento recupera la terminal ---------- */

const Respuesta: React.FC = () => {
  const frame = useCurrentFrame();
  const sancion = M("respuesta", 1);
  const contrato = M("respuesta", 2);
  const cifra = M("respuesta", 3);
  const recupera = M("respuesta", 4);
  const hitos = [
    { anio: "2018", t: "Primera sanción", d: M("respuesta", 1, "2018.") - 6 },
    { anio: "2021", t: "Resolución del contrato", d: contrato },
    { anio: "2023", t: "El Ayuntamiento recupera el edificio", d: M("respuesta", 4, "2023") - 6 },
  ];
  return (
    <AbsoluteFill>
      <Cortes tramos={[{ k: "vigas", desde: 0 }, { k: "suciedad", desde: sancion }, { k: "banco", desde: contrato }, { k: "humedades", desde: cifra }, { k: "fachadaAntigua", desde: recupera }]} />
      <Tramo desde={0} hasta={sancion}>
        <Fecha anio="2017" texto="El Defensor del Pueblo interviene de oficio" desde={4} />
      </Tramo>
      <Tramo desde={sancion}>
        <AbsoluteFill style={{ backgroundColor: "rgba(6,30,92,0.55)" }} />
        <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 20, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
          {hitos.map((h, i) => {
            const q = entrada(frame, h.d, 14);
            return (
              <div key={h.anio} style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 22, opacity: Math.min(1, q * 2), translate: `${(1 - q) * -260}px 0px` }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: i === 2 ? COLOR.lima : COLOR.blanco, flexShrink: 0 }} />
                <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 86, color: i === 2 ? COLOR.lima : COLOR.blanco, letterSpacing: -3, width: 230 }}>{h.anio}</div>
                <div style={{ fontFamily: FUENTE.rotulo, fontWeight: 700, fontSize: 40, color: COLOR.blanco, lineHeight: 1.1 }}>{h.t}</div>
              </div>
            );
          })}
        </div>
        <Tramo desde={cifra - 4} hasta={recupera}>
          <div style={{ position: "absolute", top: 820, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, backgroundColor: COLOR.blanco, borderRadius: 22, padding: "24px 30px", scale: entrada(frame, cifra - 4, 14) }}>
            <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 104, color: COLOR.rosa, letterSpacing: -4, lineHeight: 1 }}>131.000 €</div>
            <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 36, color: COLOR.azulOscuro, marginTop: 8 }}>al menos, en inversiones y mejoras comprometidas sin ejecutar</div>
          </div>
        </Tramo>
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 5. El cambio, en dos comparaciones ---------- */

const Cambio: React.FC = () => {
  const frame = useCurrentFrame();
  const dentro = M("cambio", 1);
  const reforma = M("cambio", 2);
  const firme = M("cambio", 3);
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro }}>
      <Tramo desde={0} hasta={dentro}>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: ZONA_SEGURA.arriba - 20, gap: 28, display: "flex", flexDirection: "column" }}>
          <Tarjeta k="fachadaAntigua" etiqueta="ANTES" desde={2} lado={-1} />
          <Tarjeta k="fachadaActual" etiqueta="TRAS LA REFORMA" lima desde={M("cambio", 0, "actual.") - 8} lado={1} />
        </AbsoluteFill>
      </Tramo>
      <Tramo desde={dentro} hasta={reforma}>
        <AbsoluteFill style={{ alignItems: "center", paddingTop: ZONA_SEGURA.arriba - 20, gap: 28, display: "flex", flexDirection: "column" }}>
          <Tarjeta k="interiorAntiguo" etiqueta="ANTES" desde={dentro + 2} lado={-1} />
          <Tarjeta k="interiorRenovado" etiqueta="TRAS LA REFORMA" lima desde={dentro + 14} lado={1} />
        </AbsoluteFill>
      </Tramo>
      <Tramo desde={reforma}>
        <Cortes tramos={[{ k: "fachadaActual", desde: reforma }, { k: "interiorRenovado", desde: firme }]} />
        <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, opacity: suave(frame, M("cambio", 2, "3,46") - 4, 8) }}>
          <div style={{ display: "inline-block", backgroundColor: COLOR.lima, color: COLOR.negro, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 112, letterSpacing: -4, padding: "6px 22px 12px", lineHeight: 1, scale: entrada(frame, M("cambio", 2, "3,46") - 4, 14, 11), transformOrigin: "0% 50%" }}>3,46 MILLONES DE EUROS</div>
          <div style={{ display: "inline-block", marginTop: 14, backgroundColor: COLOR.blanco, color: COLOR.azulOscuro, fontFamily: FUENTE.rotulo, fontWeight: 700, fontSize: 40, padding: "8px 18px" }}>Financiación de la Diputación de Cádiz</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
            {[
              { t: "Aseos", w: "aseos," },
              { t: "Dársenas", w: "dársenas" },
              { t: "Firme", w: "firme" },
            ].map((c) => {
              const q = entrada(frame, M("cambio", 2, c.w) - 3, 12, 12);
              return <div key={c.t} style={{ backgroundColor: COLOR.lima, color: COLOR.negro, fontFamily: FUENTE.rotulo, fontWeight: 800, fontSize: 42, padding: "8px 22px", borderRadius: 999, opacity: Math.min(1, q * 2), scale: interpolate(q, [0, 1], [0.6, 1]) }}>✓ {c.t} renovados</div>;
            })}
          </div>
        </div>
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- 6. La reapertura ---------- */

const Reapertura: React.FC = () => {
  const frame = useCurrentFrame();
  const ya = M("reapertura", 2);
  const digna = M("reapertura", 3);
  const avisos = [
    { t: "Billetes: en las casetas de fuera", d: M("reapertura", 1, "billetes") },
    { t: "Aseos: pedir la llave, unas semanas", d: M("reapertura", 1, "aseos") },
  ];
  const ventajas = [
    { t: "Sentarse dentro", d: M("reapertura", 2, "sentarse") },
    { t: "Esperar bajo techo", d: M("reapertura", 2, "esperar") },
    { t: "Subir desde las dársenas renovadas", d: M("reapertura", 2, "subir") },
  ];
  return (
    <AbsoluteFill>
      <Cortes tramos={[{ k: "fachadaActual", desde: 0 }, { k: "interiorRenovado", desde: ya }]} />
      <Tramo desde={0} hasta={ya}>
        <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados }}>
          <div style={{ display: "inline-block", backgroundColor: COLOR.blanco, color: COLOR.azulOscuro, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 78, letterSpacing: -2, padding: "6px 20px 10px", scale: entrada(frame, 2, 14), transformOrigin: "0% 50%" }}>REAPERTURA PROVISIONAL</div>
          {avisos.map((a) => {
            const q = entrada(frame, a.d - 3, 12);
            return <div key={a.t} style={{ marginTop: 16, backgroundColor: "rgba(10,10,10,0.75)", color: COLOR.blanco, fontFamily: FUENTE.rotulo, fontWeight: 700, fontSize: 40, padding: "12px 20px", borderRadius: 12, opacity: Math.min(1, q * 2), translate: `${(1 - q) * -200}px 0px` }}>{a.t}</div>;
          })}
        </div>
      </Tramo>
      <Tramo desde={ya} hasta={digna}>
        <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 30, left: ZONA_SEGURA.lados, right: ZONA_SEGURA.lados, display: "flex", flexDirection: "column", gap: 16 }}>
          {ventajas.map((v) => {
            const q = entrada(frame, v.d - 3, 12, 12);
            return <div key={v.t} style={{ alignSelf: "flex-start", backgroundColor: COLOR.lima, color: COLOR.negro, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 56, letterSpacing: -1.5, padding: "8px 22px 12px", borderRadius: 12, opacity: Math.min(1, q * 2), translate: `${(1 - q) * -260}px 0px` }}>✓ {v.t}</div>;
          })}
        </div>
      </Tramo>
      <Tramo desde={digna}>
        <AbsoluteFill style={{ backgroundColor: "rgba(6,30,92,0.35)" }} />
        <Titular lineas={["POR FIN,", "UNA ESTACIÓN", "*DIGNA"]} desde={M("reapertura", 3, "digna.") - 10} tam={140} />
      </Tramo>
    </AbsoluteFill>
  );
};

/* ---------- Composición ---------- */

const PIEZAS: { readonly id: EscenaId; readonly C: React.FC }[] = [
  { id: "gancho", C: Gancho },
  { id: "deterioro", C: Deterioro },
  { id: "denuncias", C: Denuncias },
  { id: "respuesta", C: Respuesta },
  { id: "cambio", C: Cambio },
  { id: "reapertura", C: Reapertura },
];

const CLAVES = /^(2009|2014|2015|2017|2018|2021|2023|131\.000|3,46|millones|socavones|agua|cables|sanción|Ayuntamiento|digna)$/i;

/** Reportaje: la estación de autobuses de La Línea. */
export const EstacionAutobuses: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const captions = useMemo(() => subtitulosEstacion(), []);
  const fin = aFrames(finDeEscenas());
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.azulOscuro }}>
      {PIEZAS.map(({ id, C }, i) => {
        const e = getEscena(id);
        const desde = aFrames(e.inicio);
        const ultima = id === "reapertura";
        return (
          <Sequence key={id} name={e.id} from={desde} durationInFrames={aFrames(e.fin) - desde} premountFor={fps}>
            {id === "gancho" ? (
              <C />
            ) : (
              <CamaraEscena direccion={i % 2 ? -1 : 1} empuje={0.03} salida={!ultima}>
                <C />
              </CamaraEscena>
            )}
          </Sequence>
        );
      })}
      <Sequence name="Firma" from={fin} premountFor={fps}>
        <Firma />
      </Sequence>
      <Sequence name="Subtítulos" durationInFrames={fin}>
        <Subtitulos captions={captions} claves={CLAVES} />
      </Sequence>
      {existe(AUDIO.locucion) ? <Audio name="Locución" src={staticFile(AUDIO.locucion)} /> : null}
      {existe(AUDIO.musica) ? <Audio name="Música" src={staticFile(AUDIO.musica)} volume={(fr) => interpolate(fr, [0, 10, durationInFrames - 30, durationInFrames], [0, AUDIO.volumenMusica, AUDIO.volumenMusica, 0], clamp)} /> : null}
      {PIEZAS.slice(1).map(({ id }) => (
        <Sequence key={`b-${id}`} name={`Barrido ${id}`} from={aFrames(getEscena(id).inicio) - 4} durationInFrames={20}>
          <Audio src={staticFile(AUDIO.barrido)} volume={AUDIO.volumenEfectos * 0.6} />
        </Sequence>
      ))}
      <Sequence name="Golpe «Mira ahora»" from={aFrames(getEscena("gancho").inicio) + M("gancho", 4)} durationInFrames={36}>
        <Audio src={staticFile(AUDIO.golpe)} volume={AUDIO.volumenEfectos} />
      </Sequence>
    </AbsoluteFill>
  );
};
