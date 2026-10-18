import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import fs from "node:fs";
import path from "node:path";

/**
 * Los artefactos publicados no sirven .glb: al compilar, cada modelo de Blender se copia también
 * como <nombre>.glb.json ({"glb": base64}), que el cargador usa en producción.
 */
function modelosJson(): Plugin {
  return {
    name: "modelos-json",
    apply: "build",
    closeBundle() {
      const raiz = path.resolve(__dirname, "dist/modelos");
      const recorrer = (d: string): string[] => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? recorrer(path.join(d, e.name)) : [path.join(d, e.name)])) : []);
      for (const f of recorrer(raiz).filter((f) => f.endsWith(".glb"))) fs.writeFileSync(f + ".json", JSON.stringify({ glb: fs.readFileSync(f).toString("base64") }));
    },
  };
}

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
            const { edificio, cambios, borrar } = JSON.parse(cuerpo);
            if (!/^B-[A-Za-z0-9]{2,40}$/.test(edificio)) throw new Error("id no válido");
            const dir = path.resolve(__dirname, "src/datos/correcciones");
            fs.mkdirSync(dir, { recursive: true });
            const f = path.join(dir, "ciudad.json");
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
  plugins: [modelosJson(), viteSingleFile(), editorCorrecciones()],
  build: { assetsInlineLimit: 100_000_000 },
});
