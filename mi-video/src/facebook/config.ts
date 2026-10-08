/**
 * CONFIGURACIÓN DEL VÍDEO "InfoLinense cambia de casa en Facebook"
 * Anuncio de 15–20 s. Tiempos en segundos; con `npm run locucion -- facebook`
 * salen solos del audio. Los efectos van anclados a palabras del guion.
 */
import type { EscenaGuion, Momento as MomentoGuion } from "../marca/guion";

export type EscenaId = "cambio" | "nuevaPagina" | "pasos" | "notificaciones" | "cierre";
export type Momento = MomentoGuion<EscenaId>;

export const ESCENAS: readonly EscenaGuion<EscenaId>[] = [
  { id: "cambio", nombre: "1. Cambio de casa", inicio: 0, fin: 3, frases: ["InfoLinense cambia de casa en Facebook."] },
  {
    id: "nuevaPagina",
    nombre: "2. Nueva Página",
    inicio: 3,
    fin: 7,
    frases: ["A partir de ahora, toda la actualidad de La Línea estará en nuestra nueva Página oficial."],
  },
  {
    id: "pasos",
    nombre: "3. Cómo seguirnos",
    inicio: 7,
    fin: 12,
    frases: ["¿Cómo seguirnos?", "Busca InfoLinense,", "entra en nuestra Página", "y pulsa Seguir."],
  },
  {
    id: "notificaciones",
    nombre: "4. Notificaciones",
    inicio: 12,
    fin: 16,
    frases: ["Y activa las notificaciones para no perderte nada."],
  },
  { id: "cierre", nombre: "5. Cierre", inicio: 16, fin: 19, frases: ["InfoLinense continúa aquí."] },
];

const m = (escena: EscenaId, frase: number, palabra?: string, mas?: number): Momento => ({ escena, frase, palabra, mas });

export const MOMENTOS = {
  nuevaEntra: m("cambio", 0, "casa"),
  oficial: m("nuevaPagina", 0, "nueva"),
  pulsaSeguir: m("pasos", 3, "Seguir.", 0.2),
  campana: m("notificaciones", 0, "notificaciones"),
} satisfies Record<string, Momento>;

export const IMAGENES = {
  perfilAntiguo: "facebook/perfil-antiguo.jpg",
  paginaNueva: "facebook/pagina-nueva.jpg",
  banner: "facebook/banner.jpg",
} as const;

export const PRONUNCIACION: Record<string, string> = {
  "InfoLinense": "Info Linense",
  "InfoLinense,": "Info Linense,",
};

export const AUDIO = {
  locucion: "facebook/locucion.mp3",
  musica: "facebook/musica.mp3",
  volumenMusicaConVoz: 0.12,
  volumenMusicaSinVoz: 0.25,
  fundidoMusica: 0.6,
} as const;

/** Pausa breve entre los pasos para que se lean. */
export const PAUSAS_ENTRE_FRASES: Record<string, number> = { pasos: 0.45 };
