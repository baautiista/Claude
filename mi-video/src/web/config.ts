/**
 * CONFIGURACIÓN DEL ANUNCIO "InfoLinense da el salto a la web" (15–20 s).
 * Capturas reales de la web en public/web/ (si faltan, se ven huecos):
 *   web-movil-portada.png   captura LARGA de la portada en el móvil (se desplaza sola)
 *   web-movil-noticia.png   una noticia abierta en el móvil
 *   web-escritorio.png      portada en ordenador (captura larga, se desplaza)
 *   web-grabacion.mp4       opcional: grabación de pantalla navegando (sustituye a la portada móvil)
 */
import type { EscenaGuion, Momento as MomentoGuion } from "../marca/guion";

export type EscenaId = "salto" | "url" | "contenido" | "dispositivos" | "cierre";
export type Momento = MomentoGuion<EscenaId>;

export const URL_WEB = "infolinense.com";

export const ESCENAS: readonly EscenaGuion<EscenaId>[] = [
  { id: "salto", nombre: "1. El salto", inicio: 0, fin: 2.5, frases: ["InfoLinense da el salto a la web."] },
  { id: "url", nombre: "2. La dirección", inicio: 2.5, fin: 5.5, frases: ["Ya puedes leernos en infolinense.com."] },
  {
    id: "contenido",
    nombre: "3. Contenido",
    inicio: 5.5,
    fin: 10.5,
    frases: ["Toda la actualidad de La Línea, ordenada y en un solo sitio."],
  },
  { id: "dispositivos", nombre: "4. Móvil y ordenador", inicio: 10.5, fin: 13.5, frases: ["Desde el móvil o desde el ordenador."] },
  { id: "cierre", nombre: "5. Cierre", inicio: 13.5, fin: 17, frases: ["Entra ya en infolinense.com."] },
];

const m = (escena: EscenaId, frase: number, palabra?: string, mas?: number): Momento => ({ escena, frase, palabra, mas });

export const MOMENTOS = {
  web: m("salto", 0, "web."),
  ordenada: m("contenido", 0, "ordenada"),
  ordenador: m("dispositivos", 0, "ordenador."),
} satisfies Record<string, Momento>;

export const CAPTURAS = {
  movilPortada: "web/web-movil-portada.png",
  movilNoticia: "web/web-movil-noticia.png",
  escritorio: "web/web-escritorio.png",
  grabacion: "web/web-grabacion.mp4",
} as const;

export const SECCIONES = ["ÚLTIMA HORA", "CIUDAD", "URBANISMO", "GIBRALTAR", "DEPORTES", "CULTURA"];

export const PRONUNCIACION: Record<string, string> = {
  "InfoLinense": "Info Linense",
  "infolinense.com": "infolinense punto com",
};

export const AUDIO = {
  locucion: "web/locucion.mp3",
  musica: "web/musica.mp3",
  volumenMusicaConVoz: 0.12,
  volumenMusicaSinVoz: 0.25,
  fundidoMusica: 0.6,
} as const;
