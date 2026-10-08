import { aFrames, crearTiempos, type DatosLocucion } from "../marca/guion";
import { DURACION_TOTAL, ESCENAS, FIRMA_SEGUNDOS } from "./config";
import datosLocucion from "./locucion-tiempos.json";

const datos = datosLocucion as DatosLocucion;

/** Cola final calculada para que el vídeo dure exactamente DURACION_TOTAL. */
const ultimaFrase = datos.frases ? Math.max(...Object.values(datos.frases).flat().map((f) => f.fin)) : null;
const colaFinal = ultimaFrase === null ? 0.5 : Math.max(0.4, DURACION_TOTAL - FIRMA_SEGUNDOS - ultimaFrase);

const tiempos = crearTiempos({
  escenas: ESCENAS,
  datos,
  firmaSegundos: FIRMA_SEGUNDOS,
  colaFinal,
  maxCaracteresSubtitulo: 26,
});

export { aFrames };
export const { getEscena, finDeEscenas, duracionTotal, beatsDeEscena, frameEnEscena, segundoDe } = tiempos;
export const subtitulosDesdeGuion = tiempos.subtitulos;
