import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { MOMENTOS } from "../config";
import { MapaIstmo } from "../MapaIstmo";
import { beatsDeEscena, frameEnEscena } from "../tiempos";

const Titular: React.FC<{
  readonly arriba: string;
  readonly abajo: string;
  readonly visible: number;
}> = ({ arriba, abajo, visible }) => (
  <div
    style={{
      position: "absolute",
      top: ZONA_SEGURA.arriba + 40,
      left: ZONA_SEGURA.lados,
      right: ZONA_SEGURA.lados,
      opacity: visible,
      translate: `0px ${(1 - visible) * 24}px`,
    }}
  >
    <div style={{ fontFamily: FUENTE.display, fontWeight: 800, fontSize: 76, lineHeight: 1.02, color: COLOR.negro, letterSpacing: -1 }}>
      {arriba}
    </div>
    <div style={{ fontFamily: FUENTE.texto, fontWeight: 500, fontSize: 42, color: COLOR.grisOscuro, marginTop: 12 }}>
      {abajo}
    </div>
  </div>
);

export const Origen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [, fortificaciones, nucleo] = beatsDeEscena("origen");
  const rotulo = frameEnEscena(MOMENTOS.rotuloLineaDeGibraltar);

  const mapa = suave(frame, fortificaciones - 0.25 * fps, 0.35 * fps);
  const zoom = suave(frame, nucleo - 0.2 * fps, 1.2 * fps);
  const titular1 = suave(frame, fortificaciones, 0.5 * fps) * (1 - suave(frame, nucleo - 0.3 * fps, 0.3 * fps));
  const titular2 = suave(frame, nucleo, 0.5 * fps);
  const rotuloP = entrada(frame, rotulo, 0.5 * fps, 14);

  return (
    <Escena fondo="oscuro">
      {/* Archivo: postal del Peñón desde las Líneas españolas */}
      <AbsoluteFill style={{ opacity: 1 - mapa }}>
        <Img
          src={staticFile("lalinea/penon-postal.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${interpolate(frame, [0, fortificaciones], [12, 42], {
              extrapolateRight: "clamp",
            })}% 50%`,
            scale: 1.04,
          }}
        />
        <AbsoluteFill
          style={{ background: "linear-gradient(180deg, rgba(10,10,10,0.7) 0%, rgba(10,10,10,0) 30%)" }}
        />
        <div
          style={{
            position: "absolute",
            top: ZONA_SEGURA.arriba + 40,
            left: ZONA_SEGURA.lados,
            fontFamily: FUENTE.texto,
            fontWeight: 600,
            fontSize: 30,
            color: COLOR.blanco,
            opacity: suave(frame, 6, 10) * 0.9,
          }}
        >
          ARCHIVO · El Peñón desde las Líneas españolas
        </div>
      </AbsoluteFill>

      {/* Mapa esquemático */}
      <AbsoluteFill style={{ opacity: mapa, overflow: "hidden" }}>
        <AbsoluteFill
          style={{
            scale: interpolate(zoom, [0, 1], [1, 1.45]),
            transformOrigin: "680px 720px",
          }}
        >
          <MapaIstmo
            linea={suave(frame, fortificaciones + 0.2 * fps, 1.4 * fps)}
            fuertes={entrada(frame, fortificaciones + 1.4 * fps, 0.5 * fps, 14)}
            nucleo={suave(frame, nucleo + 0.4 * fps, 2.2 * fps)}
            rotulos={1 - zoom}
          />
        </AbsoluteFill>
        <Titular arriba="Una línea de fortificaciones" abajo="frente a Gibraltar · siglo XVIII" visible={titular1} />
        <Titular arriba="A su alrededor, un pueblo" abajo="crece junto a la línea defensiva" visible={titular2} />
        <div
          style={{
            position: "absolute",
            top: 470,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: rotuloP,
            scale: interpolate(rotuloP, [0, 1], [0.8, 1]),
          }}
        >
          <div
            style={{
              backgroundColor: COLOR.azul,
              color: COLOR.blanco,
              fontFamily: FUENTE.display,
              fontWeight: 800,
              fontSize: 72,
              padding: "10px 32px",
              borderRadius: 10,
              boxShadow: "0 16px 40px rgba(31,94,255,0.35)",
            }}
          >
            Línea de Gibraltar
          </div>
        </div>
      </AbsoluteFill>
    </Escena>
  );
};
