import { AbsoluteFill } from "remotion";

export const Background: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 30% 20%, #1E2A5A 0%, #0B0F1A 60%)",
      }}
    />
  );
};
