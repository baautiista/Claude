import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { suave } from "../../marca/animacion";
import { Calendario } from "../../marca/Calendario";
import { Escena } from "../../marca/Escena";
import { TarjetaFoto } from "../../marca/Foto";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { Sello } from "../../marca/Sello";
import { TarjetaDato } from "../../marca/TarjetaDato";
import { Titular, ZonaPlano } from "../comun";
import { DATOS, FOTOS, MOMENTOS } from "../config";
import { PlanoTramo } from "../Plano";
import { beatsDeEscena, frameEnEscena } from "../tiempos";
import { PLANO_COLON } from "./ColonProblema";

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

/** 83 cuadrados de 1 m² que se van rellenando. */
const MetrosCuadrados: React.FC<{ readonly total: number; readonly desde: number }> = ({ total, desde }) => {
  const frame = useCurrentFrame();
  const lado = 52;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", width: 10 * (lado + 8), gap: 8 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: lado,
            height: lado,
            borderRadius: 8,
            backgroundColor: COLOR.lima,
            opacity: suave(frame, desde + i * 0.45, 6),
            scale: 0.5 + suave(frame, desde + i * 0.45, 6) * 0.5,
          }}
        />
      ))}
    </div>
  );
};

export const ColonExpropiacion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [, cifras, acta, avance] = beatsDeEscena("colonExpropiacion");
  const sello2 = frameEnEscena(MOMENTOS.sello2);
  const metros = frameEnEscena(MOMENTOS.metros);
  const euros = frameEnEscena(MOMENTOS.euros);
  const dia15 = frameEnEscena(MOMENTOS.dia15);
  const conexion = frameEnEscena(MOMENTOS.conexionColon);

  return (
    <Escena fondo="azul">
      {/* Sellos sobre la foto de la finca */}
      <Tramo desde={0} hasta={cifras}>
        <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 40, left: 80 }}>
          <TarjetaFoto archivo={FOTOS.colon} ancho={920} alto={620} desde={0} etiqueta="Colón, 92" enfoque="50% 62%" />
        </div>
        <div style={{ position: "absolute", top: 520, left: 120 }}>
          <Sello lineas={["EXPROPIACIÓN", "APROBADA"]} color={COLOR.lima} fondo="rgba(10,10,10,0.75)" desde={0.5 * fps} rotacion={-7} />
        </div>
        <div style={{ position: "absolute", top: 820, right: 110 }}>
          <Sello lineas={["OCUPACIÓN", "URGENTE"]} color={COLOR.rosa} fondo={COLOR.blanco} desde={sello2} rotacion={5} />
        </div>
      </Tramo>

      {/* 83 m² y 31.800 € */}
      <Tramo desde={cifras} hasta={acta}>
        <Titular principal="La finca, en cifras" desde={cifras} tamano={72} />
        <div style={{ position: "absolute", top: 420, left: 240 }}>
          <MetrosCuadrados total={DATOS.colonMetros} desde={Math.min(metros, cifras + 8)} />
        </div>
        <div style={{ position: "absolute", top: 1030, left: 80, display: "flex", gap: 40 }}>
          <TarjetaDato valor={DATOS.colonMetros} unidad="m²" etiqueta="Superficie" desde={metros} variante="lima" />
          <TarjetaDato valor={DATOS.colonEuros} unidad="€" etiqueta="Valoración inicial" desde={euros} />
        </div>
      </Tramo>

      {/* 15 de octubre */}
      <Tramo desde={acta} hasta={avance}>
        <Titular principal="Siguiente paso" desde={acta} tamano={72} />
        <div style={{ position: "absolute", top: 400, left: 160 }}>
          <Calendario anio={DATOS.acta.anio} mes={DATOS.acta.mes} dia={DATOS.acta.dia} desde={Math.min(dia15, acta + 6)} />
        </div>
        <div
          style={{
            position: "absolute",
            top: 1130,
            left: 160,
            right: 160,
            fontFamily: FUENTE.display,
            fontWeight: 700,
            fontSize: 48,
            lineHeight: 1.1,
            color: COLOR.blanco,
            opacity: suave(frame, dia15 + 10, 10),
          }}
        >
          Acta previa a la ocupación
        </div>
      </Tramo>

      {/* Conexión */}
      <Tramo desde={avance} hasta={durationInFrames + 10}>
        <Titular principal="Vía libre para" destacado="la nueva conexión" desde={avance} />
        <ZonaPlano top={640}>
          <PlanoTramo
            {...PLANO_COLON}
            calles={1}
            bloque={1}
            demolicion={suave(frame, conexion - 0.4 * fps, 0.7 * fps)}
            conexion={suave(frame, conexion, 1.2 * fps)}
          />
        </ZonaPlano>
      </Tramo>
    </Escena>
  );
};
