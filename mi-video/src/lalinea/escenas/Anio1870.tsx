import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORES, FUENTES, ZONA_SEGURA } from "../estilo";
import { Capitulo, EscenaBase, entrada, suave } from "../comun";
import { Fondo } from "../Fondo";
import { beatsDeEscena } from "../tiempos";

export const Anio1870: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [, constitucion, diezDias] = beatsDeEscena("anio1870");

  const anio = Math.round(
    interpolate(frame, [0.2 * fps, 1.8 * fps], [1730, 1870], {
      easing: Easing.bezier(0.33, 1, 0.68, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const salidaContador = suave(frame, constitucion - 0.4 * fps, 0.6 * fps);
  const calendario = entrada(frame, constitucion - 0.2 * fps, 0.8 * fps, 14);
  const cambio = suave(frame, diezDias + 0.6 * fps, 0.5 * fps);
  const chip = entrada(frame, diezDias + 0.2 * fps, 0.6 * fps, 10);

  return (
    <EscenaBase>
      <Fondo />
      <Capitulo>LA SEGREGACIÓN</Capitulo>

      {/* Contador de año */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          paddingTop: ZONA_SEGURA.arriba + 280,
          opacity: 1 - salidaContador,
          translate: `0px ${salidaContador * -120}px`,
        }}
      >
        <div
          style={{
            fontFamily: FUENTES.titulo,
            fontWeight: 900,
            fontSize: 300,
            lineHeight: 1,
            color: COLORES.oro,
            fontVariantNumeric: "tabular-nums",
            textShadow: "0 10px 40px rgba(217,164,65,0.3)",
            scale: interpolate(entrada(frame, 0, 0.8 * fps), [0, 1], [0.7, 1]),
          }}
        >
          {anio}
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontFamily: FUENTES.texto,
            fontWeight: 700,
            fontSize: 54,
            color: COLORES.pergamino,
            opacity: suave(frame, 1.6 * fps, 0.6 * fps),
            translate: `0px ${(1 - entrada(frame, 1.6 * fps, 0.8 * fps)) * 40}px`,
          }}
        >
          <span style={{ opacity: 0.6, textDecoration: "line-through" }}>San Roque</span>
          <span style={{ color: COLORES.oro }}>→</span>
          <span>La Línea</span>
        </div>
        <div
          style={{
            marginTop: 24,
            fontFamily: FUENTES.texto,
            fontSize: 44,
            color: COLORES.pergaminoOscuro,
            opacity: suave(frame, 2.2 * fps, 0.6 * fps),
          }}
        >
          Segregación oficial
        </div>
      </AbsoluteFill>

      {/* Calendario */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          paddingTop: ZONA_SEGURA.arriba + 230,
          opacity: calendario > 0.01 ? 1 : 0,
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 600,
              height: 640,
              borderRadius: 24,
              overflow: "hidden",
              backgroundColor: COLORES.pergamino,
              boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              scale: calendario,
              rotate: "-2deg",
            }}
          >
            <div
              style={{
                backgroundColor: COLORES.rojo,
                color: COLORES.pergamino,
                fontFamily: FUENTES.texto,
                fontWeight: 900,
                fontSize: 52,
                letterSpacing: 6,
                textAlign: "center",
                padding: "26px 0",
              }}
            >
              JULIO · 1870
            </div>
            <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
              {[
                { dia: "20", texto: "Se constituye el Ayuntamiento", visible: 1 - cambio, dy: -cambio * 200 },
                { dia: "30", texto: "Sesión para elegir el nombre", visible: cambio, dy: (1 - cambio) * 200 },
              ].map((p) => (
                <div
                  key={p.dia}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: p.visible,
                    translate: `0px ${p.dy}px`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FUENTES.titulo,
                      fontWeight: 900,
                      fontSize: 300,
                      lineHeight: 1,
                      color: COLORES.tinta,
                    }}
                  >
                    {p.dia}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      fontFamily: FUENTES.texto,
                      fontWeight: 700,
                      fontSize: 38,
                      color: COLORES.tinta,
                      textAlign: "center",
                      padding: "0 40px",
                    }}
                  >
                    {p.texto}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* +10 días */}
          <div
            style={{
              position: "absolute",
              right: -70,
              top: -70,
              backgroundColor: COLORES.oro,
              color: COLORES.fondo,
              fontFamily: FUENTES.texto,
              fontWeight: 900,
              fontSize: 48,
              padding: "16px 30px",
              borderRadius: 999,
              rotate: "8deg",
              scale: chip,
              boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
            }}
          >
            +10 días
          </div>
        </div>
      </AbsoluteFill>
    </EscenaBase>
  );
};
