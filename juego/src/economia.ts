import type { Estado } from "./estado";
import { con } from "./red/conexion";

/**
 * Dinero del jugador. El saldo lo decide la autoridad (servidor o servicio
 * local): el cliente aplica el cambio al momento para que el juego responda
 * rápido y luego lo sustituye por el saldo confirmado. Si se rechaza (topes,
 * saldo insuficiente, sin conexión), se deshace y se avisa.
 */

type Aviso = (texto: string) => void;
let avisar: Aviso = () => {};
let refrescar: () => void = () => {};
export const conectarEconomia = (a: Aviso, r: () => void) => {
  avisar = a;
  refrescar = r;
};

async function mover(e: Estado, cantidad: number, motivo: string, detalle: string) {
  e.dinero += cantidad;
  try {
    const r = await con.llamar<{ dinero: number }>("movimiento", { motivo, cantidad, detalle });
    e.dinero = r.dinero;
    return true;
  } catch (err) {
    e.dinero -= cantidad;
    avisar((err as Error).message);
    return false;
  } finally {
    refrescar();
  }
}

/** Ingreso por una actividad (venta, puesto, encargo, jornada…). */
export const cobrar = (e: Estado, cantidad: number, motivo: "venta" | "puesto" | "encargo" | "jornada" | "historia", detalle = "") =>
  cantidad > 0 ? mover(e, Math.round(cantidad), motivo, detalle) : Promise.resolve(true);

/** Gasto (comprueba que alcanza antes de pedirlo). */
export function pagar(e: Estado, cantidad: number, motivo: "semillas" | "billete" | "compra" | "historia" | "cocina" | "barca", detalle = "") {
  if (cantidad <= 0) return Promise.resolve(true);
  if (e.dinero < cantidad) {
    avisar("No tienes dinero suficiente.");
    return Promise.resolve(false);
  }
  return mover(e, -Math.round(cantidad), motivo, detalle);
}

/** Saldo confirmado (al entrar o al reconectar). */
export async function sincronizarSaldo(e: Estado) {
  try {
    const r = await con.llamar<{ dinero: number }>("saldo");
    e.dinero = r.dinero;
    refrescar();
  } catch {
    /* se reintenta en la siguiente operación */
  }
}
