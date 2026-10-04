import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { entrada, suave } from "../../marca/animacion";
import { Escena } from "../../marca/Escena";
import { TarjetaFoto } from "../../marca/Foto";
import { LineaPasos } from "../../marca/LineaPasos";
import { COLOR, FUENTE, ZONA_SEGURA } from "../../marca/marca";
import { TarjetaDato } from "../../marca/TarjetaDato";
import { Titular, ZonaPlano } from "../comun";
import { DATOS, FOTOS, MOMENTOS } from "../config";
import { PlanoTramo } from "../Plano";
import { beatsDeEscena, frameEnEscena } from "../tiempos";
import { PLANO_FILOMENA } from "./FilomenaProblema";

const PASOS = ["Planeamiento", "Expropiaciones", "Demolición", "Urbanización", "Nueva calle"];

/** Muestra su contenido solo entre dos frames (con fundido). */
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

export const FilomenaDemolicion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [, pregunta, pasos, plazos, urbanizar] = beatsDeEscena("filomenaDemolicion");
  const dosMeses = frameEnEscena(MOMENTOS.dosMeses);
  const demoler = frameEnEscena(MOMENTOS.demoler);
  const q = entrada(frame, pregunta, 14, 12);

  return (
    <Escena fondo="azul">
      {/* Adjudicación: foto de la calle + cifras */}
      <Tramo desde={0} hasta={pregunta}>
        <div style={{ position: "absolute", top: ZONA_SEGURA.arriba + 40, left: 80 }}>
          <TarjetaFoto archivo={FOTOS.santaFilomenaCalle} ancho={920} alto={540} desde={2} etiqueta="Santa Filomena" enfoque="50% 45%" />
        </div>
        <div style={{ position: "absolute", top: 830, left: 80, display: "flex", gap: 40 }}>
          <TarjetaDato valor={DATOS.demolicionEuros} unidad="€" etiqueta="Demolición adjudicada" desde={10} variante="lima" />
          <TarjetaDato valor={DATOS.demolicionMeses} unidad="meses" etiqueta="Plazo previsto" desde={dosMeses} />
        </div>
      </Tramo>

      {/* ¿Qué significa esto? */}
      <Tramo desde={pregunta} hasta={pasos}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 300 }}>
          <div
            style={{
              fontFamily: FUENTE.display,
              fontWeight: 800,
              fontSize: 420,
              lineHeight: 0.8,
              color: COLOR.lima,
              scale: interpolate(q, [0, 1], [0.6, 1]),
            }}
          >
            ?
          </div>
          <div
            style={{
              marginTop: 30,
              fontFamily: FUENTE.display,
              fontWeight: 800,
              fontSize: 100,
              lineHeight: 1,
              color: COLOR.blanco,
              textAlign: "center",
              letterSpacing: -2,
              opacity: q,
            }}
          >
            ¿Qué significa
            <br />
            esto?
          </div>
        </AbsoluteFill>
      </Tramo>

      {/* Línea de pasos */}
      <Tramo desde={pasos} hasta={plazos}>
        <Titular principal="Años de trámites…" destacado="y ahora, la demolición" desde={pasos} tamano={72} />
        <div style={{ position: "absolute", top: 560, left: 90 }}>
          <LineaPasos pasos={PASOS} actual={2} desde={pasos + 10} avance={Math.round(0.9 * fps)} />
        </div>
      </Tramo>

      {/* El obstáculo desaparece y la calle se dibuja */}
      <Tramo desde={plazos} hasta={durationInFrames + 10}>
        <Titular principal="Antes de fin de año" destacado="sin obstáculo" desde={plazos} hasta={urbanizar} />
        <Titular principal="Después: urbanizar" destacado="y abrir la calle" desde={urbanizar} />
        <ZonaPlano>
          <PlanoTramo
            {...PLANO_FILOMENA}
            calles={1}
            bloque={1}
            obra
            demolicion={suave(frame, demoler, 0.8 * fps)}
            conexion={suave(frame, urbanizar + 0.3 * fps, 1.4 * fps)}
          />
        </ZonaPlano>
      </Tramo>
    </Escena>
  );
};
