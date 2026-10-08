import { aFrames, crearTiempos } from "../marca/guion";
import { ESCENAS } from "./config";
import datosLocucion from "./locucion-tiempos.json";

const tiempos = crearTiempos({ escenas: ESCENAS, datos: datosLocucion, firmaSegundos: 0, colaFinal: 2.6, maxCaracteresSubtitulo: 30 });

export { aFrames };
export const { getEscena, duracionTotal, frameEnEscena } = tiempos;
