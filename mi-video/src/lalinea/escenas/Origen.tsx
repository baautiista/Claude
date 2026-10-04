import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { MOMENTOS } from "../config";
import { COLORES, FUENTES, ZONA_SEGURA } from "../estilo";
import { Capitulo, EscenaBase, entrada, suave } from "../comun";
import { Fondo } from "../Fondo";
import { IconoFortificacion } from "../Iconos";
import { Penon } from "../Penon";
import { beatsDeEscena, frameEnEscena } from "../tiempos";

const FUERTES = [0, 1, 2, 3, 4, 5];

export const Origen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [, fortificaciones] = beatsDeEscena("origen");
  const rotulo = frameEnEscena(MOMENTOS.rotuloLineaDeGibraltar);

  const ilustracion = suave(frame, fortificaciones - 0.3 * fps, 0.8 * fps);
  const muralla = suave(frame, fortificaciones + 0.3 * fps, 2.4 * fps);

  return (
    <EscenaBase>
      <Fondo tono="calido" />
      <Capitulo>EL ORIGEN</Capitulo>

      {/* Fase A: postal antigua */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          paddingTop: ZONA_SEGURA.arriba + 230,
          opacity: 1 - ilustracion,
        }}
      >
        <div
          style={{
            width: 940,
            height: 560,
            overflow: "hidden",
            borderRadius: 8,
            border: `10px solid ${COLORES.pergamino}`,
            boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
            rotate: "-2deg",
            opacity: suave(frame, 0.1 * fps, 0.8 * fps),
            scale: interpolate(entrada(frame, 0, fps), [0, 1], [0.92, 1]),
          }}
        >
          <Img
            name="Postal antigua del Peñón"
            src={staticFile("lalinea/penon-postal.jpg")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "35% 40%",
              filter: "sepia(0.35)",
              scale: interpolate(frame, [0, fortificaciones], [1.05, 1.18], {
                extrapolateRight: "clamp",
              }),
            }}
          />
        </div>
        <div
          style={{
            marginTop: 30,
            fontFamily: FUENTES.acta,
            fontStyle: "italic",
            fontSize: 40,
            color: COLORES.pergaminoOscuro,
            opacity: suave(frame, 0.8 * fps, 0.8 * fps),
          }}
        >
          El Peñón desde las Líneas españolas
        </div>
      </AbsoluteFill>

      {/* Fase B: ilustración de las fortificaciones frente al Peñón */}
      <AbsoluteFill style={{ opacity: ilustracion }}>
        <svg
          width={1080}
          height={1920}
          viewBox="0 0 1080 1920"
          style={{ position: "absolute", inset: 0 }}
        >
          <defs>
            <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3A2C1E" />
              <stop offset="1" stopColor="#7A5A3A" />
            </linearGradient>
          </defs>
          <rect x={0} y={520} width={1080} height={520} fill="url(#cielo)" opacity={0.55} />
          {/* Mar */}
          <rect x={0} y={1000} width={1080} height={40} fill="#4A5A63" opacity={0.6} />
          {/* Istmo */}
          <rect x={0} y={1036} width={1080} height={220} fill="#2E2318" />
        </svg>
        <Penon
          color="#1B140D"
          style={{
            position: "absolute",
            left: -60,
            top: 570,
            width: 1200,
            height: 480,
            translate: `0px ${(1 - entrada(frame, fortificaciones - 0.3 * fps, 1.2 * fps)) * 40}px`,
          }}
        />
        {/* Muralla que une los fuertes */}
        <div
          style={{
            position: "absolute",
            left: 90,
            top: 1158,
            height: 14,
            width: 900 * muralla,
            backgroundColor: COLORES.pergaminoOscuro,
            borderRadius: 4,
          }}
        />
        {FUERTES.map((i) => {
          const aparece = entrada(frame, fortificaciones + (0.3 + i * 0.4) * fps, 0.6 * fps, 12);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 90 + i * 168 - 10,
                top: 1060,
                scale: aparece,
                transformOrigin: "50% 100%",
              }}
            >
              <IconoFortificacion color={COLORES.pergamino} size={120} />
            </div>
          );
        })}
        {/* Rótulo */}
        <div
          style={{
            position: "absolute",
            top: ZONA_SEGURA.arriba + 200,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: suave(frame, rotulo, 0.4 * fps),
            scale: interpolate(entrada(frame, rotulo, 0.7 * fps, 12), [0, 1], [0.6, 1]),
          }}
        >
          <div
            style={{
              fontFamily: FUENTES.titulo,
              fontWeight: 900,
              fontSize: 92,
              color: COLORES.pergamino,
              backgroundColor: COLORES.rojo,
              padding: "14px 44px",
              borderRadius: 6,
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              border: `3px solid ${COLORES.oro}`,
            }}
          >
            Línea de Gibraltar
          </div>
        </div>
      </AbsoluteFill>
    </EscenaBase>
  );
};
