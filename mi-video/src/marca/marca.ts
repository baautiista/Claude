/**
 * Sistema visual InfoLinense: colores, tipografías y zona segura.
 * Todos los vídeos de InfoLinense deben importar sus tokens desde aquí.
 */
import { loadFont } from "@remotion/fonts";
import { getStaticFiles, staticFile } from "remotion";

export const COLOR = {
  /** Azul InfoLinense: identificador de marca, uso puntual. */
  azul: "#1F5EFF",
  /** Secundario lima: resaltar (palabra activa, subrayados, dato destacado). */
  lima: "#C4E910",
  /** Secundario rosa: contraste y avisos (tachados, negativo, "antes"). */
  rosa: "#FF1254",
  blanco: "#FFFFFF",
  negro: "#0A0A0A",
  grisClaro: "#F2F3F5",
  grisOscuro: "#2B2D31",
} as const;

/** Archivo de All Round Gothic (fuente comercial): cópialo en public/fonts/. */
const ALL_ROUND_GOTHIC = [
  { archivo: "AllRoundGothic-Demi.woff2", weight: "600" },
  { archivo: "AllRoundGothic-Bold.woff2", weight: "700" },
];

const hayAllRoundGothic = ALL_ROUND_GOTHIC.some((f) =>
  getStaticFiles().some((s) => s.name === `fonts/${f.archivo}`),
);

export const FUENTE = {
  /** Datos y titulares. Si falta All Round Gothic, se usa Poppins. */
  display: hayAllRoundGothic ? "All Round Gothic, Poppins" : "Poppins",
  /** Etiquetas de sección, rótulos y titulares secundarios. */
  rotulo: "Poppins",
  /** Explicaciones, subtítulos e información secundaria. */
  texto: "Inter",
} as const;

const cargar = (family: string, archivo: string, weight: string) =>
  loadFont({ family, url: staticFile(`fonts/${archivo}`), weight });

for (const w of ["400", "500", "600", "700", "800", "900"]) {
  cargar("Poppins", `Poppins-${w}.woff2`, w);
}
for (const w of ["400", "500", "600", "700", "800", "900"]) {
  cargar("Inter", `Inter-${w}.woff2`, w);
}
if (hayAllRoundGothic) {
  for (const f of ALL_ROUND_GOTHIC) {
    if (getStaticFiles().some((s) => s.name === `fonts/${f.archivo}`)) {
      cargar("All Round Gothic", f.archivo, f.weight);
    }
  }
}

/** Zona segura para TikTok / Reels / Shorts (1080 × 1920). */
export const ZONA_SEGURA = { arriba: 200, abajo: 380, lados: 80 } as const;

export const MARCA = {
  logo: staticFile("marca/logo.png"),
  isotipo: staticFile("marca/isotipo.png"),
} as const;
