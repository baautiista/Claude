import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { MOMENTOS } from "../config";
import { COLORES, FUENTES, ZONA_SEGURA } from "../estilo";
import { Capitulo, EscenaBase, entrada, suave } from "../comun";
import { Fondo } from "../Fondo";
import { beatsDeEscena, frameEnEscena } from "../tiempos";

export const Nombre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [, aprobacion] = beatsDeEscena("nombre");
  const escritura = frameEnEscena(MOMENTOS.escrituraNombre);
  const sello = frameEnEscena(MOMENTOS.selloAprobado);

  const linea1 = suave(frame, escritura, 1.1 * fps);
  const linea2 = suave(frame, escritura + 1.0 * fps, 1.5 * fps);
  const golpe = entrada(frame, sello, 0.45 * fps, 14);
  const temblor =
    frame >= sello && frame < sello + 8 ? Math.sin(frame * 3.1) * (8 - (frame - sello)) : 0;

  return (
    <EscenaBase>
      <Fondo tono="calido" />
      <Capitulo>EL NOMBRE</Capitulo>
      <AbsoluteFill
        style={{
          alignItems: "center",
          paddingTop: ZONA_SEGURA.arriba + 210,
        }}
      >
        {/* Acta */}
        <div
          style={{
            position: "relative",
            width: 920,
            height: 760,
            padding: "56px 60px",
            boxSizing: "border-box",
            background: `radial-gradient(ellipse at center, ${COLORES.pergamino} 55%, ${COLORES.pergaminoOscuro} 100%)`,
            boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
            rotate: "-1deg",
            translate: `${temblor}px ${(1 - entrada(frame, 0, 0.9 * fps)) * 80}px`,
            opacity: suave(frame, 0, 0.5 * fps),
            color: COLORES.tinta,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 18,
              border: `2px solid rgba(42,29,18,0.35)`,
            }}
          />
          <div
            style={{
              fontFamily: FUENTES.acta,
              fontSize: 54,
              textAlign: "center",
              letterSpacing: 4,
            }}
          >
            ACTA DE LA SESIÓN
          </div>
          <div
            style={{
              fontFamily: FUENTES.acta,
              fontStyle: "italic",
              fontSize: 44,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            30 de julio de 1870
          </div>
          <div
            style={{
              height: 2,
              backgroundColor: "rgba(42,29,18,0.5)",
              margin: "26px 80px",
            }}
          />
          <div
            style={{
              fontFamily: FUENTES.acta,
              fontSize: 40,
              lineHeight: 1.3,
              textAlign: "center",
              opacity: suave(frame, aprobacion, 0.8 * fps),
            }}
          >
            Los señores concejales acuerdan por unanimidad que el nuevo municipio
            se denomine:
          </div>
          <div
            style={{
              marginTop: 20,
              fontFamily: FUENTES.manuscrita,
              fontSize: 108,
              lineHeight: 1.05,
              textAlign: "center",
            }}
          >
            <div style={{ clipPath: `inset(0 ${100 - linea1 * 100}% 0 0)` }}>La Línea</div>
            <div style={{ clipPath: `inset(0 ${100 - linea2 * 100}% 0 0)` }}>
              de la Concepción
            </div>
          </div>

          {/* Sello */}
          <div
            style={{
              position: "absolute",
              right: -50,
              bottom: -100,
              width: 270,
              height: 270,
              borderRadius: 135,
              border: `10px solid ${COLORES.rojo}`,
              boxShadow: `inset 0 0 0 8px ${COLORES.pergamino}, inset 0 0 0 12px ${COLORES.rojo}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: COLORES.rojo,
              fontFamily: FUENTES.texto,
              fontWeight: 900,
              textAlign: "center",
              lineHeight: 1.05,
              rotate: "-14deg",
              opacity: interpolate(frame, [sello, sello + 3], [0, 0.92], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              scale: interpolate(golpe, [0, 1], [2.6, 1]),
              backgroundColor: "rgba(234,220,190,0.9)",
            }}
          >
            <div style={{ fontSize: 31, letterSpacing: 1 }}>APROBADO</div>
            <div style={{ fontSize: 24, marginTop: 6 }}>POR</div>
            <div style={{ fontSize: 24 }}>UNANIMIDAD</div>
          </div>
        </div>
      </AbsoluteFill>
    </EscenaBase>
  );
};
