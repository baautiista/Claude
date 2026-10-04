import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  type InteractivitySchema,
} from "remotion";
import { Background } from "./Background";
import { fontFamily } from "./theme";

type BarChartSceneProps = {
  readonly title: string;
  readonly unit: string;
  readonly q1: number;
  readonly q2: number;
  readonly q3: number;
  readonly q4: number;
  readonly barColor: string;
  readonly highlightColor: string;
  readonly style?: React.CSSProperties;
};

const CHART_HEIGHT = 1000;

const BarChartSceneInner: React.FC<BarChartSceneProps> = ({
  title,
  unit,
  q1,
  q2,
  q3,
  q4,
  barColor,
  highlightColor,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bars = [
    { label: "T1", value: q1 },
    { label: "T2", value: q2 },
    { label: "T3", value: q3 },
    { label: "T4", value: q4 },
  ];
  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <AbsoluteFill style={{ fontFamily, ...style }}>
      <Background />
      <AbsoluteFill style={{ padding: "160px 90px 140px", gap: 60 }}>
        <Interactive.Div
          name="Chart title"
          style={{
            color: "white",
            fontSize: 96,
            fontWeight: 900,
            lineHeight: 1.05,
            opacity: interpolate(frame, [0, 0.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {title}
        </Interactive.Div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 40,
            borderBottom: "4px solid #334155",
          }}
        >
          {bars.map((bar, i) => {
            const start = (0.4 + i * 0.35) * fps;
            const progress = interpolate(
              frame,
              [start, start + 1.2 * fps],
              [0, 1],
              {
                easing: Easing.bezier(0.16, 1, 0.3, 1),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            );
            const isLast = i === bars.length - 1;
            return (
              <div
                key={bar.label}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    color: "white",
                    fontSize: 52,
                    fontWeight: 700,
                    opacity: progress,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {Math.round(bar.value * progress)}
                  {unit}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: (bar.value / max) * CHART_HEIGHT * progress,
                    borderRadius: "24px 24px 0 0",
                    backgroundColor: isLast ? highlightColor : barColor,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 40 }}>
          {bars.map((bar) => (
            <div
              key={bar.label}
              style={{
                flex: 1,
                textAlign: "center",
                color: "#94A3B8",
                fontSize: 48,
                fontWeight: 700,
              }}
            >
              {bar.label}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const barChartSceneSchema = {
  title: { type: "text-content", default: "", description: "Título" },
  unit: { type: "text-content", default: "", description: "Unidad" },
  q1: { type: "number", default: 0, description: "Trimestre 1", hiddenFromList: false },
  q2: { type: "number", default: 0, description: "Trimestre 2", hiddenFromList: false },
  q3: { type: "number", default: 0, description: "Trimestre 3", hiddenFromList: false },
  q4: { type: "number", default: 0, description: "Trimestre 4", hiddenFromList: false },
  barColor: { type: "color", default: "#6366F1", description: "Color de barras" },
  highlightColor: {
    type: "color",
    default: "#4ADE80",
    description: "Color de la última barra",
  },
} as const satisfies InteractivitySchema;

export const BarChartScene = Interactive.withSchema({
  Component: BarChartSceneInner,
  componentName: "<BarChartScene>",
  schema: barChartSceneSchema,
  wrapInSequence: true,
});
