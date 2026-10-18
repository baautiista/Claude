// Capturas del juego para la comparación: una por edificio del lote, con la misma cámara que su
// enlace a Google Earth y su render de Blender (scripts/exploracion/vistas.py).
//
//   node scripts/exploracion/capturas_juego.mjs <LOTE> [url del juego, p. ej. http://localhost:4173/]
//
// Escribe city-reconstruction/exploracion/capturas/<LOTE>/<id>.png y
// city-reconstruction/exploracion/capturas/<LOTE>/verificacion.json (estado del lote en el juego),
// que usa `explorar.py integrar --verificacion`.
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const lote = process.argv[2];
const base = process.argv[3] ?? "http://localhost:4173/";
if (!lote) throw new Error("uso: capturas_juego.mjs <LOTE> [url]");
const datos = JSON.parse(fs.readFileSync(path.join(RAIZ, "city-reconstruction", "blender", "lotes", `${lote}.json`), "utf8"));
// Las cámaras salen del mismo módulo que usan Google Earth y Blender.
const vistas = JSON.parse(execFileSync("python3", ["-c", `
import json, sys
sys.path.insert(0, ${JSON.stringify(path.join(RAIZ, "scripts", "exploracion"))})
import vistas
d = json.load(open(${JSON.stringify(path.join(RAIZ, "city-reconstruction", "blender", "lotes", `${lote}.json`))}))
print(json.dumps({e["id"]: vistas.vista(e["huella"], e.get("caras") or [], float(e["alturaM"])) for e in d["edificios"]}))
`]).toString());
const dir = path.join(RAIZ, "city-reconstruction", "exploracion", "capturas", lote);
fs.mkdirSync(dir, { recursive: true });

const exe = fs.existsSync("/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell") ? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell" : undefined;
const b = await chromium.launch({ executablePath: exe, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 960, height: 720 } });
const errores = [];
p.on("pageerror", (e) => errores.push(e.message));
const [id0] = Object.keys(vistas);
const [c0, o0] = vistas[id0];
await p.goto(`${base}?revisar=${c0[0]},${c0[1]}&mira=${o0[0]},${o0[1]}&etiqueta=${encodeURIComponent(lote)}`, { timeout: 180000 });
// Espera a que carguen las teselas cercanas y el lote de Blender.
let estado = null;
for (let i = 0; i < 900; i++) {
  await p.waitForTimeout(1000);
  estado = await p.evaluate((l) => ({ lote: window.__blender?.estado?.[l] ?? null, pendientes: window.__ciudad?.pendientes?.() ?? 1 }), lote);
  if (estado.lote && estado.pendientes === 0 && i > 5) break;
}
for (const [id, [cam, obj]] of Object.entries(vistas)) {
  await p.evaluate(([c, o, e]) => {
    window.__revisar(c[0], c[1], o[0], o[1]);
    const r = document.querySelector(".rotulo-revision");
    if (r) r.textContent = e;
  }, [cam, obj, id]);
  await p.waitForTimeout(4000);
  await p.screenshot({ path: path.join(dir, `${id}.png`), timeout: 180000 });
  console.log("captura", id);
}
const verificacion = { [lote]: { ...(estado?.lote ?? {}), errores } };
fs.writeFileSync(path.join(dir, "verificacion.json"), JSON.stringify(verificacion, null, 1));
console.log("verificación", JSON.stringify(verificacion));
await b.close();
