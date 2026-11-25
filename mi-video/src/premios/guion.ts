/** Datos oficiales de los Premios InfoLinense 2026 (src/premios/datos.json, generado por scripts/premios-datos.py). */
import datos from "./datos.json";

export type Categoria = (typeof datos.categorias)[number];
export type Nominado = Categoria["nominados"][number];
export const WEB = datos.web;
export const CATEGORIAS: readonly Categoria[] = datos.categorias;

export const categoriaDe = (slug: string): Categoria => {
  const c = CATEGORIAS.find((x) => x.slug === slug);
  if (!c) throw new Error(`Categoría desconocida: ${slug}`);
  return c;
};

/** Patrocinadores oficiales por categoría (public/premios/marca/). */
export const PATROCINIO: Record<string, { logo: string; nombre: string } | undefined> = {
  "carnaval-linense": { logo: "premios/marca/carnavalinense.png", nombre: "Carnavalinense" },
  "vocacion-cofrade": { logo: "premios/marca/el-cofrade-linense.png", nombre: "El Cofrade Linense" },
  "impulso-cofrade": { logo: "premios/marca/el-cofrade-linense.png", nombre: "El Cofrade Linense" },
};
