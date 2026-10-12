import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import fs from "node:fs";
import path from "node:path";

/**
 * Editor de ciudad (solo en desarrollo): guarda las correcciones manuales en
 * src/datos/correcciones/<sector>.json, una capa aparte de los datos generados.
 */
function editorCorrecciones(): Plugin {
  return {
    name: "editor-correcciones",
    // Guardar una corrección no recarga la página que se está revisando, pero invalida el
    // módulo para que la próxima carga (o una regeneración del sector) lea el fichero nuevo.
    handleHotUpdate({ file, server }) {
      if (!file.includes("/src/datos/correcciones/")) return;
      for (const m of server.moduleGraph.getModulesByFile(file) ?? []) server.moduleGraph.invalidateModule(m);
      return [];
    },
    configureServer(server) {
      server.middlewares.use("/__editor/correcciones", (req, res) => {
        if (req.method !== "POST") return void ((res.statusCode = 405), res.end());
        let cuerpo = "";
        req.on("data", (c) => (cuerpo += c));
        req.on("end", () => {
          try {
            const { sector, edificio, cambios, borrar } = JSON.parse(cuerpo);
            if (!/^[A-Z0-9-]+$/.test(sector) || !/^[A-Z0-9-]+$/.test(edificio)) throw new Error("id no válido");
            const dir = path.resolve(__dirname, "src/datos/correcciones");
            fs.mkdirSync(dir, { recursive: true });
            const f = path.join(dir, `${sector}.json`);
            const actual = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
            if (borrar) delete actual[edificio];
            else actual[edificio] = { ...actual[edificio], ...cambios, fecha: new Date().toISOString() };
            fs.writeFileSync(f, JSON.stringify(actual, null, 1) + "\n");
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ ok: true, fichero: path.relative(__dirname, f) }));
          } catch (e) {
            res.statusCode = 400;
            res.end(String(e));
          }
        });
      });
    },
  };
}

// `npm run build` genera un único dist/index.html autocontenido (fuentes y logos
// incluidos), listo para publicarse en la web o envolverse con Capacitor.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile(), editorCorrecciones()],
  build: { assetsInlineLimit: 100_000_000 },
});
