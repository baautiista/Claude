/**
 * Pruebas automáticas contra un servidor real con base de datos temporal.
 *   npm run pruebas
 */
import { fase1 } from "./fase1.ts";
import { fase2 } from "./fase2.ts";
import { Servidor } from "./utilidades.ts";

const srv = new Servidor();
await srv.arrancar();
const informes = [];
try {
  informes.push(await fase1(srv));
  informes.push(await fase2(srv));
} finally {
  await srv.parar();
  srv.limpiar();
}
const ok = informes.reduce((s, i) => s + i.ok, 0);
const fallos = informes.flatMap((i) => i.fallos);
console.log(`\n${ok} correctas, ${fallos.length} fallidas`);
for (const f of fallos) console.log(`  ✘ ${f}`);
process.exit(fallos.length ? 1 : 0);
