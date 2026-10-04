import { Composition, Folder, Still } from "remotion";
import { duracionTotal } from "./lalinea/tiempos";
import { FPS } from "./lalinea/config";
import { Miniatura } from "./lalinea/Miniatura";
import { OrigenNombreLaLinea } from "./lalinea/OrigenNombreLaLinea";
import { BarChartScene } from "./BarChartScene";
import { CounterScene } from "./CounterScene";
import { DataVideo } from "./DataVideo";
import { TitleScene } from "./TitleScene";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="La-Linea">
        <Composition
          id="OrigenNombreLaLinea"
          component={OrigenNombreLaLinea}
          durationInFrames={duracionTotal()}
          fps={FPS}
          width={1080}
          height={1920}
        />
        <Still
          id="Miniatura"
          component={Miniatura}
          width={1280}
          height={720}
        />
      </Folder>
      <Folder name="Escenas">
        <Composition
          id="Intro"
          component={TitleScene}
          durationInFrames={75}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Resultados 2026",
            subtitle: "Un año en números",
            accentColor: "#4ADE80",
          }}
        />
        <Composition
          id="Contador"
          component={CounterScene}
          durationInFrames={90}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            value: 12480,
            label: "clientes nuevos",
            change: "+38% vs 2025",
            accentColor: "#4ADE80",
          }}
        />
        <Composition
          id="Grafica"
          component={BarChartScene}
          durationInFrames={135}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Ventas por trimestre",
            unit: "k",
            q1: 120,
            q2: 165,
            q3: 210,
            q4: 290,
            barColor: "#6366F1",
            highlightColor: "#4ADE80",
          }}
        />
      </Folder>
      <Composition
        id="VideoDatos"
        component={DataVideo}
        durationInFrames={330}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
