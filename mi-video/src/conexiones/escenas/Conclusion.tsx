import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { AntesDespues } from "../../marca/AntesDespues";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE, existe } from "../../marca/marca";
import { Titular } from "../../marca/Titular";
import { Tramo } from "../../marca/Tramo";
import { FOTOS, MOMENTOS } from "../config";
import { PlanoTramo } from "../Plano";
import { beatsDeEscena, frameEnEscena } from "../tiempos";
import { PLANO_COLON } from "./ColonProblema";
import { PLANO_FILOMENA } from "./FilomenaProblema";

/** Foto en tarjeta que se encoge hasta convertirse en una pequeña parcela rosa. */
const FotoAParcela: React.FC<{
  readonly archivo: string;
  readonly enfoque: string;
  readonly nombre: string;
  readonly encoger: number;
  readonly lado: number;
  readonly desde: number;
}> = ({ archivo, enfoque, nombre, encoger, lado, desde }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 12);
  const tam = interpolate(encoger, [0, 1], [400, lado]);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: 420, opacity: p }}>
      <div style={{ height: 420, display: "flex", alignItems: "flex-end" }}>
        <div
          style={{
            width: tam,
            height: tam,
            borderRadius: interpolate(encoger, [0, 1], [24, 10]),
            overflow: "hidden",
            backgroundColor: COLOR.rosa,
            border: `${interpolate(encoger, [0, 1], [6, 0])}px solid ${COLOR.blanco}`,
          }}
        >
          {existe(archivo) ? (
            <Img src={staticFile(archivo)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: enfoque, opacity: 1 - encoger }} />
          ) : null}
        </div>
      </div>
      <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 34, color: COLOR.blanco }}>{nombre}</div>
    </div>
  );
};

/** Plano de proyecto en papel que se convierte en calle real. */
const PapelACalle: React.FC<{ readonly papel: number; readonly real: number }> = ({ papel, real }) => (
  <div
    style={{
      width: 920,
      height: 600,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: real > 0.5 ? "#3B4048" : "#F4F1E8",
      boxShadow: "0 24px 50px rgba(0,0,0,0.3)",
      opacity: papel,
      rotate: `${interpolate(real, [0, 1], [-4, 0])}deg`,
      scale: interpolate(papel, [0, 1], [0.85, 1]),
    }}
  >
    <svg viewBox="0 0 920 600" width="100%" height="100%">
      <g opacity={1 - real}>
        {Array.from({ length: 24 }, (_, i) => (
          <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={600} stroke="#C9D6F2" strokeWidth={1.5} />
        ))}
        {Array.from({ length: 16 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 40} x2={920} y2={i * 40} stroke="#C9D6F2" strokeWidth={1.5} />
        ))}
        <text x={40} y={70} fontFamily={FUENTE.rotulo} fontWeight={700} fontSize={34} fill={COLOR.azul}>
          PROYECTO · NUEVO VIARIO
        </text>
      </g>
      <rect x={0} y={190} width={920} height={40} fill="#9AA1AC" opacity={real} />
      <rect x={0} y={410} width={920} height={40} fill="#9AA1AC" opacity={real} />
      <rect x={0} y={230} width={920} height={180} fill="#2A2E35" opacity={real} />
      <line x1={0} y1={230} x2={920} y2={230} stroke={real > 0.5 ? COLOR.blanco : COLOR.azul} strokeWidth={6} strokeDasharray={real > 0.5 ? "0" : "18 14"} />
      <line x1={0} y1={410} x2={920} y2={410} stroke={real > 0.5 ? COLOR.blanco : COLOR.azul} strokeWidth={6} strokeDasharray={real > 0.5 ? "0" : "18 14"} />
      <line x1={0} y1={320} x2={920 * real} y2={320} stroke={COLOR.blanco} strokeWidth={8} strokeDasharray="50 36" />
    </svg>
  </div>
);

export const Conclusion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [, importancia, continuidad, proyectos] = beatsDeEscena("conclusion");
  const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);
  const encoger = suave(frame, f("tamano") - 4, 0.6 * fps);
  const g = entrada(frame, f("granImpacto") - 4, 14, 11);
  const real = suave(frame, f("terreno"), 0.7 * fps);
  const fotoFinal = f("fotoFinal");

  return (
    <Escena fondo="azul">
      {/* Pequeñas parcelas… */}
      <Tramo desde={0} hasta={continuidad}>
        <Titular principal="Pequeñas parcelas…" desde={0} tamano={88} />
        <div style={{ position: "absolute", top: 400, left: 70, display: "flex", gap: 100 }}>
          <FotoAParcela archivo={FOTOS.santaFilomena} enfoque="50% 64%" nombre="Santa Filomena" encoger={encoger} lado={110} desde={2} />
          <FotoAParcela archivo={FOTOS.colon} enfoque="45% 72%" nombre="Colón, 92" encoger={encoger} lado={70} desde={6} />
        </div>
        {/* …GRAN IMPACTO: ondas desde las parcelas */}
        <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
          {[0, 1, 2].map((i) => {
            const t = interpolate(frame - importancia - i * 8, [0, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <g key={i} opacity={(1 - t) * g}>
                <circle cx={280} cy={765} r={60 + t * 400} fill="none" stroke={COLOR.lima} strokeWidth={6} />
                <circle cx={800} cy={785} r={40 + t * 400} fill="none" stroke={COLOR.lima} strokeWidth={6} />
              </g>
            );
          })}
        </svg>
        <div
          style={{
            position: "absolute",
            top: 960,
            left: 0,
            right: 0,
            fontFamily: FUENTE.display,
            fontWeight: 800,
            fontSize: 170,
            lineHeight: 0.92,
            letterSpacing: -6,
            color: COLOR.lima,
            textAlign: "center",
            opacity: g,
            scale: interpolate(g, [0, 1], [1.4, 1]),
          }}
        >
          …GRAN
          <br />
          IMPACTO
        </div>
      </Tramo>

      {/* El último obstáculo en los dos casos: se conectan a la vez */}
      <Tramo desde={continuidad} hasta={proyectos}>
        <Titular principal="El último obstáculo," destacado="en los dos casos" desde={continuidad} tamano={78} />
        {[
          { nombre: "1 · Santa Filomena", plano: PLANO_FILOMENA, top: 520 },
          { nombre: "2 · Calle Colón", plano: PLANO_COLON, top: 930 },
        ].map(({ nombre, plano, top }) => (
          <div key={nombre} style={{ position: "absolute", top, left: 80, width: 920 }}>
            <div style={{ fontFamily: FUENTE.rotulo, fontWeight: 700, fontSize: 36, color: COLOR.blanco }}>{nombre}</div>
            <div style={{ height: 330, marginTop: 10, overflow: "hidden", borderRadius: 18 }}>
              <div style={{ width: 920, height: 736, translate: "0px -203px" }}>
                <PlanoTramo
                  {...plano}
                  calles={1}
                  bloque={1}
                  demolicion={suave(frame, f("eliminando"), 0.5 * fps)}
                  conexion={suave(frame, f("continuidad"), 0.9 * fps)}
                  recorrido={interpolate(frame, [f("continuidad") + 0.8 * fps, f("continuidad") + 2.4 * fps], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}
                />
              </div>
            </div>
          </div>
        ))}
      </Tramo>

      {/* Del papel al terreno */}
      <Tramo desde={proyectos} hasta={fotoFinal + 4}>
        <Titular principal="Del papel…" destacado="…al terreno" desde={proyectos} tamano={84} />
        <div style={{ position: "absolute", top: 600, left: 80 }}>
          <PapelACalle papel={suave(frame, proyectos + 4, 12)} real={real} />
        </div>
      </Tramo>

      {/* Cambio real: antes / después */}
      <Tramo desde={fotoFinal} hasta={durationInFrames + 10}>
        <AntesDespues archivo={FOTOS.puntoRibotAntesDespues} progreso={suave(frame, fotoFinal + 4, 1.2 * fps)} nota="Punto Ribot · simulación" />
      </Tramo>
    </Escena>
  );
};
