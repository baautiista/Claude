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

type CounterSceneProps = {
  readonly value: number;
  readonly label: string;
  readonly change: string;
  readonly accentColor: string;
  readonly style?: React.CSSProperties;
};

const CounterSceneInner: React.FC<CounterSceneProps> = ({
  value,
  label,
  change,
  accentColor,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const current = Math.round(
    interpolate(frame, [0, 1.8 * fps], [0, value], {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <AbsoluteFill style={{ fontFamily, ...style }}>
      <Background />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 100,
          gap: 30,
        }}
      >
        <Interactive.Div
          name="Number"
          style={{
            color: "white",
            fontSize: 220,
            fontWeight: 900,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {current.toLocaleString("es-ES")}
        </Interactive.Div>
        <Interactive.Div
          name="Label"
          style={{
            color: "#CBD5E1",
            fontSize: 64,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {label}
        </Interactive.Div>
        <Interactive.Div
          name="Change badge"
          style={{
            marginTop: 40,
            color: "#0B0F1A",
            backgroundColor: accentColor,
            fontSize: 56,
            fontWeight: 900,
            padding: "20px 48px",
            borderRadius: 999,
            scale: interpolate(frame, [1.6 * fps, 2.1 * fps], [0, 1], {
              easing: Easing.spring({ damping: 12 }),
              output: "perceptual-scale",
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {change}
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const counterSceneSchema = {
  value: { type: "number", default: 0, description: "Número final", hiddenFromList: false },
  label: { type: "text-content", default: "", description: "Etiqueta" },
  change: { type: "text-content", default: "", description: "Cambio" },
  accentColor: {
    type: "color",
    default: "#4ADE80",
    description: "Color de acento",
  },
} as const satisfies InteractivitySchema;

export const CounterScene = Interactive.withSchema({
  Component: CounterSceneInner,
  componentName: "<CounterScene>",
  schema: counterSceneSchema,
  wrapInSequence: true,
});
