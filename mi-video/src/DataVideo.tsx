import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { useVideoConfig } from "remotion";
import { BarChartScene } from "./BarChartScene";
import { CounterScene } from "./CounterScene";
import { TitleScene } from "./TitleScene";

export const DataVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <TransitionSeries>
      <TransitionSeries.Sequence
        name="Intro"
        durationInFrames={75}
        premountFor={fps}
      >
        <TitleScene
          title="Resultados 2026"
          subtitle="Un año en números"
          accentColor="#4ADE80"
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence
        name="Contador"
        durationInFrames={90}
        premountFor={fps}
      >
        <CounterScene
          value={12480}
          label="clientes nuevos"
          change="+38% vs 2025"
          accentColor="#4ADE80"
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence
        name="Gráfica"
        durationInFrames={135}
        premountFor={fps}
      >
        <BarChartScene
          title="Ventas por trimestre"
          unit="k"
          q1={120}
          q2={165}
          q3={210}
          q4={290}
          barColor="#6366F1"
          highlightColor="#4ADE80"
        />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: 15 })}
      />
      <TransitionSeries.Sequence
        name="Cierre"
        durationInFrames={75}
        premountFor={fps}
      >
        <TitleScene
          title="¡Gracias!"
          subtitle="Vamos por más en 2027"
          accentColor="#6366F1"
        />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
