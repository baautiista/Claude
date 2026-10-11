/**
 * Almacén de documentos por colecciones, con transacciones atómicas.
 * Dos implementaciones: SQLite en el servidor (servidor/bd.ts) y localStorage
 * en el navegador (src/red/local.ts) para jugar sin conexión.
 */

export type Coleccion =
  | "jugadores" | "usuarios" | "sesiones" | "partidas" | "operaciones" | "amistades" | "bloqueos" | "denuncias" | "mensajes"
  | "invitaciones" | "inmuebles" | "interiores" | "inventarios" | "contratos" | "encargos" | "carreras" | "turnos" | "negocios" | "ofertas";

export interface Almacen {
  leer<T>(col: Coleccion, id: string): T | null;
  escribir<T>(col: Coleccion, id: string, doc: T): void;
  borrar(col: Coleccion, id: string): void;
  /** Lista documentos (con su id) que cumplen el filtro. */
  listar<T>(col: Coleccion, filtro?: (d: T, id: string) => boolean, limite?: number): (T & { id: string })[];
  /** Ejecuta `fn` de forma atómica: o se aplica todo o nada. */
  transaccion<R>(fn: () => R): R;
}

/** Almacén en memoria (base del local y de las pruebas). */
export class AlmacenMemoria implements Almacen {
  protected datos = new Map<Coleccion, Map<string, string>>();
  private enTx = false;
  private copia: Map<Coleccion, Map<string, string>> | null = null;

  protected tabla(col: Coleccion) {
    let t = this.datos.get(col);
    if (!t) this.datos.set(col, (t = new Map()));
    return t;
  }
  leer<T>(col: Coleccion, id: string): T | null {
    const s = this.tabla(col).get(id);
    return s ? (JSON.parse(s) as T) : null;
  }
  escribir<T>(col: Coleccion, id: string, doc: T) {
    this.tabla(col).set(id, JSON.stringify(doc));
    if (!this.enTx) this.persistir();
  }
  borrar(col: Coleccion, id: string) {
    this.tabla(col).delete(id);
    if (!this.enTx) this.persistir();
  }
  listar<T>(col: Coleccion, filtro?: (d: T, id: string) => boolean, limite = Infinity) {
    const out: (T & { id: string })[] = [];
    for (const [id, s] of this.tabla(col)) {
      const d = JSON.parse(s) as T;
      if (!filtro || filtro(d, id)) out.push({ ...d, id });
      if (out.length >= limite) break;
    }
    return out;
  }
  transaccion<R>(fn: () => R): R {
    if (this.enTx) return fn();
    this.enTx = true;
    this.copia = new Map([...this.datos].map(([k, v]) => [k, new Map(v)]));
    try {
      const r = fn();
      this.enTx = false;
      this.persistir();
      return r;
    } catch (e) {
      this.datos = this.copia!;
      this.enTx = false;
      throw e;
    } finally {
      this.copia = null;
    }
  }
  /** Las subclases guardan aquí (localStorage). */
  protected persistir() {}
}
