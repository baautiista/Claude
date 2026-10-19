// Capturas de prueba del juego compilado (vite preview en :5180).
//   node scripts/capturas.mjs <carpeta> nombre:aerea:x,y,dist  nombre:calle:x,y,mx,my ...
import { chromium } from "playwright-core";
const [dir, ...vistas] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1000, height: 640 } });
const err = [];
p.on("pageerror", (e) => err.push(e.message));
const prim = vistas[0].split(":")[2].split(",").map(Number);
await p.goto(`http://localhost:5180/?revisar=${prim[0]},${prim[1]}&mira=${prim[0]},${prim[1] - 10}&etiqueta=prueba`, { timeout: 180000 });
for (let i = 0; i < 60; i++) {
  await p.waitForTimeout(1000);
  if (i > 12 && (await p.evaluate(() => window.__ciudad?.pendientes?.() === 0))) break;
}
for (const v of vistas) {
  const [n, tipo, c] = v.split(":");
  const q = c.split(",").map(Number);
  await p.evaluate(([t, q]) => (t === "aerea" ? window.__aerea(q[0], q[1], q[2]) : window.__revisar(q[0], q[1], q[2], q[3])), [tipo, q]);
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `${dir}/${n}.png`, timeout: 120000 });
}
if (err.length) console.log(err.slice(0, 3).join("\n"));
await b.close();
