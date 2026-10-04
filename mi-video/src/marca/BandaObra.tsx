import { useCurrentFrame } from "remotion";
import { COLOR } from "./marca";

/** Banda de obra (rayas diagonales lima y negro) que se desplaza lentamente. */
export const BandaObra: React.FC<{ readonly alto?: number; readonly style?: React.CSSProperties }> = ({
  alto = 28,
  style,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        height: alto,
        backgroundImage: `repeating-linear-gradient(-45deg, ${COLOR.lima} 0 ${alto * 0.7}px, ${COLOR.negro} ${alto * 0.7}px ${alto * 1.4}px)`,
        backgroundPosition: `${frame * 1.2}px 0`,
        ...style,
      }}
    />
  );
};
