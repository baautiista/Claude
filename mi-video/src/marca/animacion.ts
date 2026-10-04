import { Easing, interpolate } from "remotion";

/** Progreso 0→1 con spring sin rebote (o con rebote si damping es bajo). */
export const entrada = (frame: number, desde: number, duracion: number, damping = 200) =>
  interpolate(frame, [desde, desde + duracion], [0, 1], {
    easing: Easing.spring({ damping }),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Progreso 0→1 con la curva editorial de InfoLinense (rápida al principio, suave al final). */
export const suave = (frame: number, desde: number, duracion: number) =>
  interpolate(frame, [desde, desde + duracion], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
