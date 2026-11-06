import { aFrames, crearTiempos, type DatosLocucion } from "../marca/guion";
import { CIERRE_SEGUNDOS, ESCENAS } from "./config";
import datosLocucion from "./locucion-tiempos.json";

const datos = datosLocucion as DatosLocucion;

/** Tras la última frase, una pausa breve y el cierre de marca (sin locución). */
const tiempos = crearTiempos({
  escenas: ESCENAS,
  datos,
  firmaSegundos: CIERRE_SEGUNDOS,
  colaFinal: 0.6,
  maxCaracteresSubtitulo: 30,
});

export { aFrames };
export const { getEscena, finDeEscenas, duracionTotal, frameEnEscena, segundoDe } = tiempos;
export const subtitulosDesdeGuion = tiempos.subtitulos;
