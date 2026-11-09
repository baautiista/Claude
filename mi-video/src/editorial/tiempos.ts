import { aFrames, crearTiempos, type DatosLocucion } from "../marca/guion";
import { ESCENAS, type EscenaId } from "./config";
import datosLocucion from "./locucion-tiempos.json";

/** Cierre: logotipo sobre el árbol junto a Camarón. */
export const FIRMA_SEGUNDOS = 3;

const tiempos = crearTiempos({ escenas: ESCENAS, datos: datosLocucion as DatosLocucion, firmaSegundos: FIRMA_SEGUNDOS, colaFinal: 0.8, maxCaracteresSubtitulo: 26 });

export { aFrames };
export const { getEscena, finDeEscenas, duracionTotal, frameEnEscena } = tiempos;
export const subtitulosDesdeGuion = tiempos.subtitulos;
/** Frame (relativo a su escena) de una frase o palabra del guion. */
export const M = (escena: EscenaId, frase: number, palabra?: string) => frameEnEscena({ escena, frase, palabra });
