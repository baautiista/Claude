/** Correcciones del editor de ciudad en el backend: permisos, validación y persistencia. */
import { Informe, Servidor } from "./utilidades.ts";

export const EDITOR_PRUEBA = "editorciudad";

export async function ciudad(srv: Servidor) {
  const inf = new Informe("Editor de ciudad · correcciones en el backend");
  const ed = await srv.cliente();
  const otro = await srv.cliente();
  await ed.llamar("registrar", { usuario: EDITOR_PRUEBA, clave: "clave-segura", nombre: "Editora" });
  await otro.llamar("registrar", { usuario: `vecino${Date.now() % 100000}`, clave: "clave-segura", nombre: "Vecino" });
  await inf.caso("Un jugador sin permiso no puede corregir la ciudad", async () => (await otro.intentar("guardarCorreccionCiudad", { id: "B-w123", cambios: { plantas: 4 } })).codigo === "permiso");
  await inf.caso("La editora guarda una corrección", async () => (await ed.llamar("guardarCorreccionCiudad", { id: "B-w877673083", cambios: { plantas: 7, color: "#E9B38F", revision: "correcto" } })).ok === true);
  await inf.caso("Id de edificio no válido rechazado", async () => (await ed.intentar("guardarCorreccionCiudad", { id: "../../etc", cambios: { plantas: 2 } })).codigo === "datos");
  await inf.caso("Campos desconocidos o mal formados se descartan", async () => {
    await ed.llamar("guardarCorreccionCiudad", { id: "B-w1", cambios: { plantas: 999, color: "rojo", hackeo: "x", nota: "<script>" } });
    const c = (await otro.llamar("correccionesCiudad")).correcciones["B-w1"];
    return c && c.plantas === undefined && c.color === undefined && c.hackeo === undefined && c.nota === "script";
  });
  await inf.caso("Todos ven la corrección guardada", async () => {
    const c = (await otro.llamar("correccionesCiudad")).correcciones["B-w877673083"];
    return c?.plantas === 7 && c?.color === "#E9B38F" && c?.revision === "correcto" && typeof c?.fecha === "string";
  });
  await inf.caso("La corrección sobrevive a un reinicio del servidor", async () => {
    await srv.parar();
    await srv.arrancar();
    const c = await srv.cliente();
    await c.llamar("entrar", { usuario: EDITOR_PRUEBA, clave: "clave-segura" });
    return (await c.llamar("correccionesCiudad")).correcciones["B-w877673083"]?.plantas === 7;
  });
  await inf.caso("Borrar una corrección vuelve a los datos generados", async () => {
    const c = await srv.cliente();
    await c.llamar("entrar", { usuario: EDITOR_PRUEBA, clave: "clave-segura" });
    await c.llamar("borrarCorreccionCiudad", { id: "B-w1" });
    return (await c.llamar("correccionesCiudad")).correcciones["B-w1"] === undefined;
  });
  return inf;
}
