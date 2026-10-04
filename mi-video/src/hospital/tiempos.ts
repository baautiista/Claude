import { aFrames, crearTiempos } from "../marca/guion";
import { ESCENAS, FIRMA_SEGUNDOS, SUBTITULOS } from "./config";
import datosLocucion from "./locucion-tiempos.json";

const tiempos = crearTiempos({
  escenas: ESCENAS,
  datos: datosLocucion,
  firmaSegundos: FIRMA_SEGUNDOS,
  colaFinal: 0.6, // más corta que la general para no pasar de 1:50
  maxCaracteresSubtitulo: SUBTITULOS.maxCaracteres,
});

export { aFrames };
export const { getEscena, finDeEscenas, duracionTotal, beatsDeEscena, frameEnEscena } = tiempos;
export const subtitulosDesdeGuion = tiempos.subtitulos;
