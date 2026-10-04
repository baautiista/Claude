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

type TitleSceneProps = {
  readonly title: string;
  readonly subtitle: string;
  readonly accentColor: string;
  readonly style?: React.CSSProperties;
};

const TitleSceneInner: React.FC<TitleSceneProps> = ({
  title,
  subtitle,
  accentColor,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ fontFamily, ...style }}>
      <Background />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 100,
          gap: 40,
        }}
      >
        <Interactive.Div
          name="Accent line"
          style={{
            width: 160,
            height: 12,
            borderRadius: 6,
            backgroundColor: accentColor,
            scale: interpolate(frame, [0, 0.6 * fps], ["0 1", "1 1"], {
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
        <Interactive.Div
          name="Title"
          style={{
            color: "white",
            fontSize: 150,
            fontWeight: 900,
            lineHeight: 1,
            textAlign: "center",
            opacity: interpolate(frame, [0.2 * fps, 0.8 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            translate: interpolate(
              frame,
              [0.2 * fps, 1 * fps],
              ["0px 80px", "0px 0px"],
              {
                easing: Easing.spring({ damping: 200 }),
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            ),
          }}
        >
          {title}
        </Interactive.Div>
        <Interactive.Div
          name="Subtitle"
          style={{
            color: "#A5B4FC",
            fontSize: 56,
            fontWeight: 400,
            textAlign: "center",
            opacity: interpolate(frame, [0.6 * fps, 1.2 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {subtitle}
        </Interactive.Div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const titleSceneSchema = {
  title: { type: "text-content", default: "", description: "Título" },
  subtitle: { type: "text-content", default: "", description: "Subtítulo" },
  accentColor: {
    type: "color",
    default: "#4ADE80",
    description: "Color de acento",
  },
} as const satisfies InteractivitySchema;

export const TitleScene = Interactive.withSchema({
  Component: TitleSceneInner,
  componentName: "<TitleScene>",
  schema: titleSceneSchema,
  wrapInSequence: true,
});
