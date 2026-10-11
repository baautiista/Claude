import { DatabaseSync } from "node:sqlite";
import type { Almacen, Coleccion } from "../src/compartido/almacen.ts";

/**
 * Almacén SQLite del servidor: una tabla por colección (id, datos JSON,
 * actualizado), modo WAL y transacciones reales (BEGIN IMMEDIATE / COMMIT).
 */
const COLECCIONES: Coleccion[] = [
  "jugadores", "usuarios", "sesiones", "partidas", "operaciones", "amistades", "bloqueos", "denuncias", "mensajes",
  "invitaciones", "inmuebles", "interiores", "inventarios", "contratos", "encargos", "carreras", "turnos", "negocios", "ofertas",
];

export class AlmacenSQLite implements Almacen {
  private db: DatabaseSync;
  private profundidad = 0;
  private sentencias = new Map<string, ReturnType<DatabaseSync["prepare"]>>();

  constructor(ruta: string) {
    this.db = new DatabaseSync(ruta);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;");
    for (const c of COLECCIONES) {
      this.db.exec(`CREATE TABLE IF NOT EXISTS ${c} (id TEXT PRIMARY KEY, datos TEXT NOT NULL, actualizado INTEGER NOT NULL)`);
    }
    // Índices útiles para las consultas más frecuentes.
    this.db.exec("CREATE INDEX IF NOT EXISTS operaciones_jugador ON operaciones (json_extract(datos, '$.jugador'), json_extract(datos, '$.t'))");
  }

  private sql(q: string) {
    let s = this.sentencias.get(q);
    if (!s) this.sentencias.set(q, (s = this.db.prepare(q)));
    return s;
  }

  leer<T>(col: Coleccion, id: string): T | null {
    const fila = this.sql(`SELECT datos FROM ${col} WHERE id = ?`).get(id) as { datos: string } | undefined;
    return fila ? (JSON.parse(fila.datos) as T) : null;
  }

  escribir<T>(col: Coleccion, id: string, doc: T) {
    this.sql(`INSERT INTO ${col} (id, datos, actualizado) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET datos = excluded.datos, actualizado = excluded.actualizado`).run(id, JSON.stringify(doc), Date.now());
  }

  borrar(col: Coleccion, id: string) {
    this.sql(`DELETE FROM ${col} WHERE id = ?`).run(id);
  }

  listar<T>(col: Coleccion, filtro?: (d: T, id: string) => boolean, limite = Infinity) {
    const out: (T & { id: string })[] = [];
    for (const f of this.sql(`SELECT id, datos FROM ${col}`).iterate() as Iterable<{ id: string; datos: string }>) {
      const d = JSON.parse(f.datos) as T;
      if (!filtro || filtro(d, f.id)) out.push({ ...d, id: f.id });
      if (out.length >= limite) break;
    }
    return out;
  }

  transaccion<R>(fn: () => R): R {
    if (this.profundidad > 0) {
      this.profundidad++;
      try {
        return fn();
      } finally {
        this.profundidad--;
      }
    }
    this.db.exec("BEGIN IMMEDIATE");
    this.profundidad = 1;
    try {
      const r = fn();
      this.db.exec("COMMIT");
      return r;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    } finally {
      this.profundidad = 0;
    }
  }
}
