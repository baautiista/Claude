import { aFrames, crearTiempos } from "../marca/guion";
import { VOZ } from "../marca/voz";
import { ESCENAS, FIRMA_SEGUNDOS, SUBTITULOS } from "./config";
import datosLocucion from "./locucion-tiempos.json";

const tiempos = crearTiempos({
  escenas: ESCENAS,
  datos: datosLocucion,
  firmaSegundos: FIRMA_SEGUNDOS,
  colaFinal: VOZ.colaFinal,
  maxCaracteresSubtitulo: SUBTITULOS.maxCaracteres,
});

export { aFrames };
export const { getEscena, finDeEscenas, duracionTotal, beatsDeEscena, frameEnEscena } = tiempos;
export const subtitulosDesdeGuion = tiempos.subtitulos;
