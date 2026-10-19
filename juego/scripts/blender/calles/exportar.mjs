// Exporta la sección final de cada tramo desde el juego compilado (vite preview en :5180)
// a city-reconstruction/calles/tramos.json (entrada de scripts/blender/calles/calles.py).
import { chromium } from "playwright-core";
import fs from "node:fs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage();
await p.goto("http://localhost:5180/?revisar=2600,3000&etiqueta=exportar", { timeout: 180000 });
await p.waitForFunction(() => window.__exportarCalles, null, { timeout: 120000 });
const d = await p.evaluate(() => window.__exportarCalles());
fs.writeFileSync("city-reconstruction/calles/tramos.json", JSON.stringify(d));
console.log(d.length, "tramos");
await b.close();
