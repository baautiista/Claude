import { aFrames, crearTiempos, type DatosLocucion } from "../marca/guion";
import { CIERRE_SEGUNDOS, ESCENAS } from "./config";
import datosLocucion from "./locucion-tiempos.json";

const tiempos = crearTiempos({
  escenas: ESCENAS,
  datos: datosLocucion as DatosLocucion,
  firmaSegundos: CIERRE_SEGUNDOS,
  colaFinal: 0.3,
  maxCaracteresSubtitulo: 24,
});

export { aFrames };
export const { getEscena, finDeEscenas, duracionTotal, segundoDe } = tiempos;
export const subtitulosDesdeGuion = tiempos.subtitulos;
