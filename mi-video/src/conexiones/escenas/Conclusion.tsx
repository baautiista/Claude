import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE, ZONA_SEGURA, existe } from "../../marca/marca";
import { FOTOS, MOMENTOS } from "../config";
import { PlanoTramo } from "../Plano";
import { beatsDeEscena, frameEnEscena } from "../tiempos";
import { PLANO_COLON } from "./ColonProblema";
import { PLANO_FILOMENA } from "./FilomenaProblema";

const Tramo: React.FC<{ readonly desde: number; readonly hasta: number; readonly children: React.ReactNode }> = ({
  desde,
  hasta,
  children,
}) => {
  const frame = useCurrentFrame();
  if (frame < desde - 1 || frame > hasta + 1) return null;
  const o = suave(frame, desde, 8) * (1 - suave(frame, hasta - 6, 6));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

const Parcela: React.FC<{ readonly nombre: string; readonly lado: number; readonly desde: number }> = ({ nombre, lado, desde }) => {
  const frame = useCurrentFrame();
  const p = entrada(frame, desde, 14, 13);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <div style={{ width: lado, height: lado, borderRadius: 10, backgroundColor: COLOR.rosa, scale: p }} />
      <div style={{ fontFamily: FUENTE.texto, fontWeight: 700, fontSize: 32, color: COLOR.blanco, opacity: p }}>{nombre}</div>
    </div>
  );
};

/** Plano de proyecto en papel que se convierte en calle real. */
const PapelACalle: React.FC<{ readonly papel: number; readonly real: number }> = ({ papel, real }) => (
  <div
    style={{
      position: "relative",
      width: 920,
      height: 600,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: interpolate(real, [0, 1], [0, 1]) > 0.5 ? "#3B4048" : "#F4F1E8",
      boxShadow: "0 24px 50px rgba(0,0,0,0.3)",
      opacity: papel,
      rotate: `${interpolate(real, [0, 1], [-3, 0])}deg`,
      scale: interpolate(papel, [0, 1], [0.9, 1]),
    }}
  >
    <svg viewBox="0 0 920 600" width="100%" height="100%">
      {/* Cuadrícula de papel milimetrado */}
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
      {/* Bordes de la calle: de trazo discontinuo (papel) a asfalto real */}
      <rect x={0} y={230} width={920} height={180} fill="#2A2E35" opacity={real} />
      <line x1={0} y1={230} x2={920} y2={230} stroke={real > 0.5 ? COLOR.blanco : COLOR.azul} strokeWidth={6} strokeDasharray={real > 0.5 ? "0" : "18 14"} />
      <line x1={0} y1={410} x2={920} y2={410} stroke={real > 0.5 ? COLOR.blanco : COLOR.azul} strokeWidth={6} strokeDasharray={real > 0.5 ? "0" : "18 14"} />
      <line x1={0} y1={320} x2={920 * real} y2={320} stroke={COLOR.blanco} strokeWidth={8} strokeDasharray="50 36" />
      {/* Aceras */}
      <rect x={0} y={190} width={920} height={40} fill="#9AA1AC" opacity={real} />
      <rect x={0} y={410} width={920} height={40} fill="#9AA1AC" opacity={real} />
    </svg>
  </div>
);

export const Conclusion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [, , continuidad, proyectos] = beatsDeEscena("conclusion");
  const granImpacto = frameEnEscena(MOMENTOS.granImpacto);
  const papel = frameEnEscena(MOMENTOS.papel);
  const terreno = frameEnEscena(MOMENTOS.terreno);
  const g = entrada(frame, granImpacto, 16, 12);
  const real = suave(frame, terreno, 0.8 * fps);
  const hayFoto = existe(FOTOS.antesDespues);
  const foto = suave(frame, frameEnEscena(MOMENTOS.fotoFinal), 0.5 * fps);

  return (
    <Escena fondo="azul">
      {/* Pequeñas parcelas… GRAN IMPACTO */}
      <Tramo desde={0} hasta={continuidad}>
        <AbsoluteFill style={{ paddingTop: ZONA_SEGURA.arriba + 60, alignItems: "center" }}>
          <div
            style={{
              fontFamily: FUENTE.display,
              fontWeight: 700,
              fontSize: 90,
              color: COLOR.blanco,
              letterSpacing: -2,
              opacity: suave(frame, 0, 10),
            }}
          >
            Pequeñas parcelas…
          </div>
          <div style={{ display: "flex", gap: 120, marginTop: 80, alignItems: "flex-end" }}>
            <Parcela nombre="Santa Filomena" lado={interpolate(g, [0, 1], [150, 90])} desde={8} />
            <Parcela nombre="Colón, 92" lado={interpolate(g, [0, 1], [110, 66])} desde={14} />
          </div>
          <div
            style={{
              marginTop: 90,
              fontFamily: FUENTE.display,
              fontWeight: 800,
              fontSize: 160,
              lineHeight: 0.95,
              letterSpacing: -5,
              color: COLOR.lima,
              textAlign: "center",
              opacity: g,
              scale: interpolate(g, [0, 1], [1.3, 1]),
            }}
          >
            …GRAN
            <br />
            IMPACTO
          </div>
        </AbsoluteFill>
      </Tramo>

      {/* Las dos calles se conectan a la vez */}
      <Tramo desde={continuidad} hasta={proyectos}>
        <AbsoluteFill style={{ paddingTop: ZONA_SEGURA.arriba + 40, paddingLeft: ZONA_SEGURA.lados }}>
          <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 78, lineHeight: 1, color: COLOR.blanco, letterSpacing: -2 }}>
            El último obstáculo,
            <div style={{ color: COLOR.lima }}>en los dos casos</div>
          </div>
        </AbsoluteFill>
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
                  demolicion={suave(frame, continuidad + 1.2 * fps, 0.6 * fps)}
                  conexion={suave(frame, continuidad + 1.6 * fps, 1.2 * fps)}
                />
              </div>
            </div>
          </div>
        ))}
      </Tramo>

      {/* Del papel al terreno */}
      <Tramo desde={proyectos} hasta={durationInFrames + 10}>
        <AbsoluteFill style={{ paddingTop: ZONA_SEGURA.arriba + 40, paddingLeft: ZONA_SEGURA.lados }}>
          <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 78, lineHeight: 1, color: COLOR.blanco, letterSpacing: -2 }}>
            <span style={{ opacity: 1 - real * 0.5 }}>Del papel…</span>
            <div style={{ color: COLOR.lima, opacity: real }}>…al terreno</div>
          </div>
        </AbsoluteFill>
        <div style={{ position: "absolute", top: 560, left: 80, opacity: 1 - foto }}>
          <PapelACalle papel={suave(frame, Math.min(papel, proyectos + 10), 12)} real={real} />
        </div>
        {hayFoto ? (
          <div
            style={{
              position: "absolute",
              top: 470,
              left: 130,
              width: 820,
              height: 820,
              borderRadius: 22,
              overflow: "hidden",
              border: `6px solid ${COLOR.blanco}`,
              opacity: foto,
              clipPath: `inset(0 ${100 - foto * 100}% 0 0)`,
            }}
          >
            <Img src={staticFile(FOTOS.antesDespues)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {[
              { texto: "ANTES", left: 18, fondo: COLOR.rosa },
              { texto: "DESPUÉS", left: 430, fondo: COLOR.lima },
            ].map((e) => (
              <div
                key={e.texto}
                style={{
                  position: "absolute",
                  top: 18,
                  left: e.left,
                  backgroundColor: e.fondo,
                  color: e.texto === "ANTES" ? COLOR.blanco : COLOR.negro,
                  fontFamily: FUENTE.rotulo,
                  fontWeight: 700,
                  fontSize: 30,
                  padding: "4px 14px",
                  borderRadius: 6,
                }}
              >
                {e.texto}
              </div>
            ))}
            <div
              style={{
                position: "absolute",
                right: 16,
                bottom: 16,
                backgroundColor: "rgba(10,10,10,0.75)",
                color: COLOR.blanco,
                fontFamily: FUENTE.texto,
                fontWeight: 600,
                fontSize: 24,
                padding: "4px 12px",
                borderRadius: 6,
              }}
            >
              Simulación
            </div>
          </div>
        ) : null}
      </Tramo>
    </Escena>
  );
};
