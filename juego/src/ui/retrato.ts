/** Retratos geométricos de los personajes (SVG, estilo editorial plano). */
export interface Aspecto {
  piel: string;
  pelo: string;
  ropa: string;
  canas?: boolean;
}

export const retrato = (a: Aspecto, fondo = "#1F5EFF") => `
<svg viewBox="0 0 64 64" aria-hidden="true">
  <rect width="64" height="64" fill="${fondo}"/>
  <path d="M10 64c2-13 11-19 22-19s20 6 22 19z" fill="${a.ropa}"/>
  <path d="M27 40h10v7a5 5 0 0 1-10 0z" fill="${a.piel}"/>
  <circle cx="32" cy="28" r="13" fill="${a.piel}"/>
  <path d="M19 27c0-9 6-14 13-14s13 5 13 14c-3-4-7-6-13-6s-10 2-13 6z" fill="${a.canas ? "#E9E9E9" : a.pelo}"/>
  <circle cx="27.5" cy="29" r="1.6" fill="#0A0A0A"/>
  <circle cx="36.5" cy="29" r="1.6" fill="#0A0A0A"/>
  <path d="M28.5 34.5q3.5 2.5 7 0" stroke="#0A0A0A" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</svg>`;

/** Retrato del narrador: el Peñón sobre azul. */
export const retratoNarrador = `
<svg viewBox="0 0 64 64" aria-hidden="true">
  <rect width="64" height="64" fill="#061E5C"/>
  <path d="M8 50c8-4 14-18 22-22 6-3 12 4 16 10s8 10 12 12z" fill="#FFFFFF" opacity=".85"/>
  <path d="M0 52h64v12H0z" fill="#1F5EFF"/>
</svg>`;
