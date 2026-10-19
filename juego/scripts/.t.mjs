import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell", args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1500, height: 620 } });
for (const [n, q] of [["salon", "&hab=salon"], ["cocina", "&hab=cocina"], ["dormitorio", "&hab=dormitorio"], ["bano", "&hab=bano"]]) {
  await p.goto("http://localhost:5180/?comparar=1" + q, { timeout: 120000 });
  await p.waitForTimeout(10000);
  await p.screenshot({ path: `${process.argv[2]}/int-${n}.png` });
}
await b.close();
