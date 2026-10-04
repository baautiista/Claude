import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { AntesDespues } from "../../marca/AntesDespues";
import { BandaObra } from "../../marca/BandaObra";
import { Escena } from "../../marca/Escena";
import { TarjetaFoto } from "../../marca/Foto";
import { LineaPasos } from "../../marca/LineaPasos";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { TarjetaDato } from "../../marca/TarjetaDato";
import { Titular } from "../../marca/Titular";
import { Tramo } from "../../marca/Tramo";
import { Chip, ZonaPlano } from "../comun";
import { DATOS, FOTOS, MOMENTOS } from "../config";
import { Camara, PlanoTramo } from "../Plano";
import { beatsDeEscena, frameEnEscena } from "../tiempos";
import { PLANO_FILOMENA } from "./FilomenaProblema";

const PASOS = ["Planeamiento", "Expropiaciones", "Demolición", "Urbanización", "Nueva calle"];

export const FilomenaDemolicion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [, pregunta, pasos, plazos, urbanizar] = beatsDeEscena("filomenaDemolicion");
  const f = (k: keyof typeof MOMENTOS) => frameEnEscena(MOMENTOS[k]);
  const q = entrada(frame, pregunta, 12, 11);
  const nuevoViario = f("nuevoViario");
  const progresoPasos = interpolate(
    frame,
    [f("planeamiento"), f("expropiaciones"), f("despejando")],
    [0, 1, 2],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <Escena fondo="azul">
      {/* Adjudicación */}
      <Tramo desde={0} hasta={pregunta}>
        <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 40, left: 80 }}>
          <TarjetaFoto archivo={FOTOS.santaFilomena} ancho={920} alto={560} desde={0} etiqueta="Zona a demoler" enfoque="50% 64%" />
        </div>
        <BandaObra alto={26} style={{ position: "absolute", top: ZONA_SEGURA.arriba + 560, left: 0, right: 0, rotate: "-3deg" }} />
        <div style={{ position: "absolute", top: 880, left: 80, display: "flex", gap: 40 }}>
          <TarjetaDato valor={DATOS.demolicionEuros} unidad="€" etiqueta="Demolición adjudicada" desde={f("euros48") - 4} variante="lima" />
          <TarjetaDato valor={DATOS.demolicionMeses} unidad="meses" etiqueta="Plazo previsto" desde={f("dosMeses") - 4} />
        </div>
      </Tramo>

      {/* ¿Qué significa esto? */}
      <Tramo desde={pregunta} hasta={pasos}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 300 }}>
          <div
            style={{
              fontFamily: FUENTE.display,
              fontWeight: 800,
              fontSize: 440,
              lineHeight: 0.8,
              color: COLOR.lima,
              scale: interpolate(q, [0, 1], [0.4, 1]),
              rotate: `${interpolate(q, [0, 1], [-20, 0])}deg`,
            }}
          >
            ?
          </div>
          <div style={{ marginTop: 30, fontFamily: FUENTE.display, fontWeight: 800, fontSize: 100, lineHeight: 1, color: COLOR.blanco, textAlign: "center", letterSpacing: -2, opacity: q }}>
            ¿Qué significa
            <br />
            esto?
          </div>
        </AbsoluteFill>
      </Tramo>

      {/* Pasos: avanzan al ritmo de la locución */}
      <Tramo desde={pasos} hasta={plazos}>
        <Titular principal="Años de trámites…" destacado="y ahora, la demolición" desde={pasos} tamano={72} />
        <div style={{ position: "absolute", top: 560, left: 90 }}>
          <LineaPasos pasos={PASOS} actual={2} desde={pasos} progreso={progresoPasos} />
        </div>
      </Tramo>

      {/* El obstáculo desaparece y se abre la calle */}
      <Tramo desde={plazos} hasta={nuevoViario + 4}>
        <Titular principal="Antes de fin de año" destacado="sin obstáculo" desde={plazos} hasta={urbanizar} />
        <Titular principal="Después: urbanizar" destacado="y abrir la calle" desde={urbanizar} />
        <ZonaPlano>
          <Camara
            zoom={interpolate(frame, [plazos, f("demoler"), urbanizar + fps], [1.5, 1.5, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
            x={510}
            y={400}
          >
            <PlanoTramo
              {...PLANO_FILOMENA}
              calles={1}
              bloque={1}
              obra
              demolicion={suave(frame, f("demoler"), 0.6 * fps)}
              conexion={suave(frame, urbanizar + 0.2 * fps, 1.0 * fps)}
              recorrido={interpolate(frame, [urbanizar + 1.1 * fps, urbanizar + 2.3 * fps], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })}
            />
          </Camara>
        </ZonaPlano>
        <div style={{ position: "absolute", top: 1240, left: 80 }}>
          <Chip desde={f("finDeAnio")}>Objetivo: fin de año</Chip>
        </div>
      </Tramo>

      {/* Antes / después (simulación) */}
      <Tramo desde={nuevoViario} hasta={durationInFrames + 10}>
        <AntesDespues
          archivo={FOTOS.puntoRibotAntesDespues}
          progreso={suave(frame, nuevoViario + 6, 1.4 * fps)}
          nota="Punto Ribot · simulación"
        />
      </Tramo>
    </Escena>
  );
};
