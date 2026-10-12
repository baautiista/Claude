import { definirModulo } from "../modulos.ts";
import { ErrorJuego, type Servicio } from "../servicio.ts";

/**
 * Correcciones del editor de ciudad guardadas en el backend (SQLite en el servidor,
 * localStorage en el modo local). Es una capa aparte de los datos generados: regenerar
 * la ciudad no las toca y el juego las aplica encima al cargar.
 *
 * Leer: cualquiera (todos ven la ciudad corregida).
 * Escribir: los jugadores de la variable de entorno EDITORES (ids o usuarios separados por comas).
 * En el modo local del navegador, el propio jugador.
 */

interface Correccion {
  [k: string]: unknown;
}

const CAMPOS = new Set(["plantas", "alturaM", "color", "tipologia", "revestimiento", "ventanas", "balcones", "cubierta", "pb", "modelo", "revision", "nota"]);
const ID = /^B-[A-Za-z0-9]{2,40}$/;

function limpiar(c: Record<string, unknown>): Correccion {
  const out: Correccion = {};
  for (const [k, v] of Object.entries(c ?? {})) {
    if (!CAMPOS.has(k)) continue;
    if (k === "plantas" && typeof v === "number" && v >= 1 && v <= 40) out[k] = Math.round(v);
    else if (k === "alturaM" && typeof v === "number" && v >= 2 && v <= 150) out[k] = Math.round(v * 10) / 10;
    else if (k === "color" && typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)) out[k] = v;
    else if (typeof v === "string" && v.length <= 200 && !["plantas", "alturaM", "color"].includes(k)) out[k] = v.replace(/[<>]/g, "");
  }
  return out;
}

definirModulo((s: Servicio) => {
  const bd = s.bd;
  const proc = (globalThis as { process?: { versions?: { node?: string }; env?: Record<string, string | undefined> } }).process;
  const enServidor = !!proc?.versions?.node;
  const editores = new Set((proc?.env?.EDITORES ?? "").split(",").map((x: string) => x.trim()).filter(Boolean));
  const puedeEditar = (jugador: string | null) => {
    if (!jugador) return false;
    if (!enServidor) return true;
    if (editores.has(jugador)) return true;
    const usuario = bd.listar<{ jugador: string }>("usuarios", (u) => u.jugador === jugador, 1)[0]?.id;
    return !!usuario && editores.has(usuario);
  };
  return {
    ops: {
      correccionesCiudad: () => {
        const out: Record<string, Correccion> = {};
        for (const d of bd.listar<Correccion & { id: string }>("correcciones")) {
          const { id, ...resto } = d;
          out[id] = resto;
        }
        return { correcciones: out, editor: false };
      },
      soyEditorCiudad: (ctx) => ({ editor: puedeEditar(ctx.jugador) }),
      guardarCorreccionCiudad: (ctx, args) => {
        if (!puedeEditar(ctx.jugador)) throw new ErrorJuego("permiso", "Tu cuenta no puede editar la ciudad.");
        const id = String(args.id ?? "");
        if (!ID.test(id)) throw new ErrorJuego("datos", "Edificio no válido.");
        const previo = bd.leer<Correccion>("correcciones", id) ?? {};
        const nuevo = { ...previo, ...limpiar(args.cambios as Record<string, unknown>), fecha: new Date().toISOString(), autor: ctx.jugador };
        bd.escribir("correcciones", id, nuevo);
        return { ok: true, correccion: nuevo };
      },
      borrarCorreccionCiudad: (ctx, args) => {
        if (!puedeEditar(ctx.jugador)) throw new ErrorJuego("permiso", "Tu cuenta no puede editar la ciudad.");
        const id = String(args.id ?? "");
        if (!ID.test(id)) throw new ErrorJuego("datos", "Edificio no válido.");
        bd.borrar("correcciones", id);
        return { ok: true };
      },
    },
  };
});
