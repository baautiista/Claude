import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Contador } from "../../marca/Contador";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { Titular } from "../../marca/Titular";
import { Tramo } from "../../marca/Tramo";
import { Tachado } from "../comun";
import { DATOS, MOMENTOS } from "../config";
import { beatsDeEscena, frameEnEscena } from "../tiempos";
import { Edificio } from "../graficos";

const Nodo: React.FC<{ readonly icono: React.ReactNode; readonly texto: string; readonly desde: number }> = ({ icono, texto, desde }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 12, 13);
  return (
    <div style={{ width: 230, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: p, scale: interpolate(p, [0, 1], [0.6, 1]) }}>
      <div style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: COLOR.azul, display: "flex", alignItems: "center", justifyContent: "center" }}>{icono}</div>
      <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 28, lineHeight: 1.15, textAlign: "center", color: COLOR.negro }}>{texto}</div>
    </div>
  );
};

const Flecha: React.FC<{ readonly desde: number }> = ({ desde }) => {
  const frame = useCurrentFrame();
  const p = suave(frame, desde, 10);
  return (
    <svg width={60} height={110} viewBox="0 0 60 110">
      <path d={`M4 55 H${4 + 44 * p}`} stroke={COLOR.azul} strokeWidth={7} strokeLinecap="round" />
      <path d="M40 42 L52 55 L40 68" stroke={COLOR.azul} strokeWidth={7} fill="none" strokeLinecap="round" opacity={p > 0.9 ? 1 : 0} />
    </svg>
  );
};

const ic = { stroke: "white", strokeWidth: 3.2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const Cesion: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const [, paraQue, viviendas] = beatsDeEscena("cesion");
  const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);
  const cesion = entrada(frame, f("cesion"), 14, 12);
  const q = entrada(frame, paraQue, 12, 11);
  const tarjetaB = entrada(frame, f("sanitarioPrivado") - 4, 14);

  return (
    <Escena fondo="azul">
      {/* Comprar → Cesión */}
      <Tramo desde={0} hasta={paraQue}>
        <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 40, left: 80, display: "flex", alignItems: "center", gap: 18, opacity: suave(frame, f("alcalde"), 8) }}>
          <svg width={70} height={70} viewBox="0 0 24 24" {...ic}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
          </svg>
          <div>
            <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 52, color: COLOR.blanco, lineHeight: 1 }}>Juan Franco</div>
            <div style={{ fontFamily: FUENTE.texto, fontWeight: 600, fontSize: 30, color: "rgba(255,255,255,0.8)" }}>Alcalde de La Línea</div>
          </div>
        </div>
        <Edificio
          dibujo={suave(frame, 4, 20)}
          style={{ position: "absolute", left: 140, top: 1060, width: 800, height: 560, opacity: 0.8 - suave(frame, f("comprar"), 10) * 0.5 }}
        />
        <div style={{ position: "absolute", top: 640, left: 80, right: 80 }}>
          <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 36, color: COLOR.blanco, letterSpacing: 2, opacity: suave(frame, f("comprar") - 10, 8) }}>EN LUGAR DE…</div>
          <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 150, color: COLOR.blanco, lineHeight: 1, opacity: suave(frame, f("comprar"), 6) }}>
            <Tachado tachar={f("comprar") + 12}>Comprar</Tachado>
          </div>
          <div style={{ marginTop: 50, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 170, color: COLOR.lima, lineHeight: 1, opacity: cesion, scale: interpolate(cesion, [0, 1], [1.4, 1]), transformOrigin: "0% 50%" }}>
            Cesión
          </div>
        </div>
      </Tramo>

      {/* ¿Para hacer qué? */}
      <Tramo desde={paraQue} hasta={viviendas}>
        <div style={{ position: "absolute", top: 700, left: 0, right: 0, textAlign: "center", fontFamily: FUENTE.display, fontWeight: 800, fontSize: 130, lineHeight: 1, color: COLOR.blanco, letterSpacing: -3, scale: interpolate(q, [0, 1], [0.6, 1]), opacity: q }}>
          ¿Para hacer
          <br />
          <span style={{ color: COLOR.lima }}>qué?</span>
        </div>
      </Tramo>

      {/* Dos vías */}
      <Tramo desde={viviendas} hasta={durationInFrames + 10}>
        <Titular principal="Dos vías" destacado="estudiadas" desde={viviendas} tamano={80} />
        {/* Tarjeta A: viviendas */}
        <div
          style={{
            position: "absolute",
            top: 470,
            left: 70,
            right: 70,
            backgroundColor: COLOR.blanco,
            borderRadius: 28,
            padding: "30px 30px 26px",
            boxShadow: "0 20px 44px rgba(0,0,0,0.25)",
            opacity: suave(frame, f("viviendas120") - 6, 8),
            scale: interpolate(tarjetaB, [0, 1], [1, 0.96]),
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 130, lineHeight: 0.9, color: COLOR.azul, letterSpacing: -4 }}>
              ≈<Contador valor={DATOS.viviendas} desde={f("viviendas120") - 4} duracion={24} />
            </div>
            <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 48, lineHeight: 1, color: COLOR.negro }}>
              viviendas
              <br />
              en alquiler
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginTop: 24 }}>
            <Nodo
              desde={f("empresa")}
              texto="Una empresa rehabilita"
              icono={
                <svg width={64} height={64} viewBox="0 0 24 24" {...ic}>
                  <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" />
                </svg>
              }
            />
            <Flecha desde={f("rehabilitacion")} />
            <Nodo
              desde={f("rehabilitacion") + 8}
              texto="Alquila las viviendas"
              icono={
                <svg width={64} height={64} viewBox="0 0 24 24" {...ic}>
                  <circle cx="8" cy="15" r="4" />
                  <path d="M11 12l8-8M16 7l3 3M14 9l2 2" />
                </svg>
              }
            />
            <Flecha desde={f("alquileres") - 6} />
            <Nodo
              desde={f("alquileres")}
              texto="Recupera la inversión"
              icono={
                <svg width={64} height={64} viewBox="0 0 24 24" {...ic}>
                  <path d="M17 7a6 6 0 1 0 0 10M5 10h9M5 14h9" />
                </svg>
              }
            />
          </div>
        </div>
        {/* Tarjeta B: centro sanitario privado */}
        <div
          style={{
            position: "absolute",
            top: 1090,
            left: 70,
            right: 70,
            display: "flex",
            alignItems: "center",
            gap: 26,
            backgroundColor: COLOR.lima,
            borderRadius: 28,
            padding: "26px 30px",
            boxShadow: "0 20px 44px rgba(0,0,0,0.25)",
            opacity: tarjetaB,
            translate: `0px ${(1 - tarjetaB) * 80}px`,
          }}
        >
          <svg width={110} height={110} viewBox="0 0 24 24" fill="none" stroke={COLOR.negro} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 62, lineHeight: 1, color: COLOR.negro }}>
            Centro sanitario
            <br />
            privado
          </div>
        </div>
      </Tramo>
    </Escena>
  );
};
