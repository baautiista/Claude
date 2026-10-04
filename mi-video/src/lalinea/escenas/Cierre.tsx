import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORES, FUENTES, ZONA_SEGURA } from "../estilo";
import { Capitulo, EscenaBase, entrada, suave } from "../comun";
import { Fondo } from "../Fondo";
import { IconoFortificacion, IconoInmaculada } from "../Iconos";
import { beatsDeEscena } from "../tiempos";

const Bloque: React.FC<{
  readonly titulo: string;
  readonly detalle: string;
  readonly icono: React.ReactNode;
  readonly separacion: number;
  readonly aparicion: number;
  readonly desplazamiento: number;
}> = ({ titulo, detalle, icono, separacion, aparicion, desplazamiento }) => {
  return (
    <div
      style={{
        position: "relative",
        width: 920,
        height: 330,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        padding: "0 50px",
        boxSizing: "border-box",
        translate: `0px ${(1 - separacion) * desplazamiento}px`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 28,
          backgroundColor: "rgba(234,220,190,0.08)",
          border: `3px solid rgba(217,164,65,${0.8 * separacion})`,
          opacity: separacion,
        }}
      />
      <div
        style={{
          width: 200 * aparicion,
          scale: aparicion,
          overflow: "visible",
          flexShrink: 0,
        }}
      >
        {icono}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            fontFamily: FUENTES.titulo,
            fontWeight: 900,
            fontSize: 96,
            lineHeight: 1,
            color: COLORES.pergamino,
          }}
        >
          {titulo}
        </div>
        <div
          style={{
            fontFamily: FUENTES.texto,
            fontWeight: 700,
            fontSize: 40,
            lineHeight: 1.2,
            color: COLORES.oro,
            opacity: aparicion,
          }}
        >
          {detalle}
        </div>
      </div>
    </div>
  );
};

export const Cierre: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [, laLinea, concepcion] = beatsDeEscena("cierre");

  const separacion = entrada(frame, laLinea - 0.3 * fps, 0.9 * fps);

  return (
    <EscenaBase>
      <Fondo tono="calido" />
      <Capitulo>EN RESUMEN</Capitulo>
      <AbsoluteFill
        style={{
          alignItems: "center",
          paddingTop: ZONA_SEGURA.arriba + 250,
          gap: interpolate(separacion, [0, 1], [0, 60]),
          opacity: suave(frame, 0, 0.6 * fps),
        }}
      >
        <Bloque
          titulo="La Línea"
          detalle="Por la línea defensiva frente a Gibraltar"
          separacion={separacion}
          aparicion={entrada(frame, laLinea, 0.7 * fps, 12)}
          desplazamiento={120}
          icono={<IconoFortificacion color={COLORES.pergamino} size={200} />}
        />
        <Bloque
          titulo="de la Concepción"
          detalle="Por la Inmaculada Concepción"
          separacion={separacion}
          aparicion={entrada(frame, concepcion, 0.7 * fps, 12)}
          desplazamiento={-120}
          icono={
            <IconoInmaculada
              manto={COLORES.azulManto}
              detalle={COLORES.oro}
              size={200}
            />
          }
        />
      </AbsoluteFill>
    </EscenaBase>
  );
};
