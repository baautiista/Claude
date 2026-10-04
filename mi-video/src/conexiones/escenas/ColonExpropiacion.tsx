import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { suave } from "../../marca/animacion";
import { Calendario } from "../../marca/Calendario";
import { Escena } from "../../marca/Escena";
import { TarjetaFoto } from "../../marca/Foto";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { Sello } from "../../marca/Sello";
import { TarjetaDato } from "../../marca/TarjetaDato";
import { Titular } from "../../marca/Titular";
import { Tramo } from "../../marca/Tramo";
import { ZonaPlano } from "../comun";
import { DATOS, FOTOS, MOMENTOS } from "../config";
import { Camara, PlanoTramo } from "../Plano";
import { beatsDeEscena, frameEnEscena } from "../tiempos";
import { PLANO_COLON } from "./ColonProblema";

/** 83 cuadrados de 1 m² que se van rellenando. */
const MetrosCuadrados: React.FC<{ readonly total: number; readonly desde: number }> = ({ total, desde }) => {
  const frame = useCurrentFrame();
  const lado = 52;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", width: 10 * (lado + 8), gap: 8 }}>
      {Array.from({ length: total }, (_, i) => {
        const v = suave(frame, desde + i * 0.35, 5);
        return <div key={i} style={{ width: lado, height: lado, borderRadius: 8, backgroundColor: COLOR.lima, opacity: v, scale: 0.4 + v * 0.6 }} />;
      })}
    </div>
  );
};

export const ColonExpropiacion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [, cifras, acta, avance] = beatsDeEscena("colonExpropiacion");
  const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);
  const conexion = f("conexionColon");

  return (
    <Escena fondo="azul">
      {/* Sellos sobre la foto de la finca */}
      <Tramo desde={0} hasta={cifras}>
        <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 40, left: 80 }}>
          <TarjetaFoto archivo={FOTOS.colon} ancho={920} alto={700} desde={0} etiqueta="Colón, 92" enfoque="45% 72%" />
        </div>
        <div style={{ position: "absolute", top: 470, left: 110 }}>
          <Sello lineas={["EXPROPIACIÓN", "APROBADA"]} color={COLOR.lima} fondo="rgba(10,10,10,0.8)" desde={f("sello1")} rotacion={-7} />
        </div>
        <div style={{ position: "absolute", top: 830, right: 100 }}>
          <Sello lineas={["OCUPACIÓN", "URGENTE"]} color={COLOR.rosa} fondo={COLOR.blanco} desde={f("sello2")} rotacion={5} />
        </div>
      </Tramo>

      {/* 83 m² y 31.800 € */}
      <Tramo desde={cifras} hasta={acta}>
        <Titular principal="La finca, en cifras" desde={cifras} tamano={72} />
        <div style={{ position: "absolute", top: 420, left: 240 }}>
          <MetrosCuadrados total={DATOS.colonMetros} desde={cifras + 6} />
        </div>
        <div style={{ position: "absolute", top: 1000, left: 80, display: "flex", gap: 40 }}>
          <TarjetaDato valor={DATOS.colonMetros} unidad="m²" etiqueta="Superficie" desde={f("metros") - 4} variante="lima" />
          <TarjetaDato valor={DATOS.colonEuros} unidad="€" etiqueta="Valoración inicial" desde={f("euros") - 4} />
        </div>
      </Tramo>

      {/* 15 de octubre */}
      <Tramo desde={acta} hasta={avance}>
        <Titular principal="Siguiente paso" desde={acta} tamano={72} />
        <div style={{ position: "absolute", top: 400, left: 160 }}>
          <Calendario anio={DATOS.acta.anio} mes={DATOS.acta.mes} dia={DATOS.acta.dia} desde={Math.min(f("dia15") - 8, acta + 6)} />
        </div>
        <div
          style={{
            position: "absolute",
            top: 1120,
            left: 160,
            right: 160,
            fontFamily: FUENTE.display,
            fontWeight: 700,
            fontSize: 50,
            lineHeight: 1.1,
            color: COLOR.blanco,
            opacity: suave(frame, f("acta"), 8),
            translate: `0px ${(1 - suave(frame, f("acta"), 10)) * 30}px`,
          }}
        >
          Acta previa a la ocupación
        </div>
      </Tramo>

      {/* La conexión: Colón → Urb. Doña Curra → San Pedro de Alcántara */}
      <Tramo desde={avance} hasta={durationInFrames + 10}>
        <Titular principal="Colón · Doña Curra" destacado="· San Pedro de Alcántara" desde={avance} tamano={70} />
        <ZonaPlano top={600}>
          <Camara zoom={interpolate(frame, [avance, f("ocupacion"), conexion + fps], [1.4, 1.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} x={430} y={400}>
            <PlanoTramo
              {...PLANO_COLON}
              calles={1}
              bloque={1}
              demolicion={suave(frame, f("ocupacion"), 0.6 * fps)}
              conexion={suave(frame, conexion, 0.9 * fps)}
              resaltes={{
                izquierda: suave(frame, conexion + 0.9 * fps, 10),
                derecha: suave(frame, conexion + 1.3 * fps, 10),
                final: suave(frame, conexion + 1.8 * fps, 14),
              }}
              recorrido={interpolate(frame, [conexion + 0.8 * fps, conexion + 2.8 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}
            />
          </Camara>
        </ZonaPlano>
      </Tramo>
    </Escena>
  );
};
