import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build` genera un único dist/index.html autocontenido (fuentes y logos
// incluidos), listo para publicarse en la web o envolverse con Capacitor.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  build: { assetsInlineLimit: 100_000_000 },
});
