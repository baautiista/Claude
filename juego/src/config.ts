/**
 * Conexión con la web real de InfoLinense.
 *
 * FEED_URL: RSS de la web. Si se rellena, la app del móvil del juego muestra
 * una pestaña «En infolinense» con las últimas noticias reales (titular y
 * enlace). En la app nativa (Capacitor) no hay problema de CORS; en navegador,
 * el servidor del feed debe permitir el origen del juego.
 *
 * La redacción decide qué noticias reales activan eventos en el juego; por
 * norma, sucesos, tribunales y política nunca se convierten en juego.
 */
export const FEED_URL = "";

/** Portada de la web, para el enlace «Leer más en InfoLinense». */
export const WEB_URL = "";
