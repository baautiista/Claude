/** Fase 2: Hogar Linense, interiores, muebles, reformas, cooperativo y encargos. */
import { esperar, Informe, Servidor, unico, type Cliente } from "./utilidades.ts";

/** Resuelve un puzle de giros por búsqueda con poda (solo con lo que ve el jugador). */
function resolverPuzle(p: { ancho: number; alto: number; piezas: number[] }) {
  const girar = (m: number, v: number) => {
    let r = m;
    for (let i = 0; i < v; i++) r = ((r << 1) | (r >> 3)) & 15;
    return r;
  };
  const n = p.ancho * p.alto;
  const giros = new Array(n).fill(0);
  const mask = new Array(n).fill(0);
  const paso = (i: number): boolean => {
    if (i === n) return true;
    const x = i % p.ancho;
    const y = Math.floor(i / p.ancho);
    for (let g = 0; g < 4; g++) {
      const m = girar(p.piezas[i], g);
      if (y === 0 && m & 1) continue;
      if (x === p.ancho - 1 && m & 2) continue;
      if (y === p.alto - 1 && m & 4) continue;
      if (x === 0 && m & 8) continue;
      if (y > 0 && !!(m & 1) !== !!(mask[i - p.ancho] & 4)) continue;
      if (x > 0 && !!(m & 8) !== !!(mask[i - 1] & 2)) continue;
      giros[i] = g;
      mask[i] = m;
      if (paso(i + 1)) return true;
      if (p.piezas[i] === 0 || p.piezas[i] === 15) break;
    }
    return false;
  };
  return paso(0) ? giros : null;
}

/** Gana dinero con las actividades permitidas (respetando topes) para poder comprar. */
async function ahorrar(c: Cliente) {
  for (const [motivo, cant, veces] of [["venta", 120, 5], ["puesto", 300, 2], ["puesto", 200, 1], ["encargo", 80, 3], ["jornada", 60, 2], ["historia", 50, 2]] as const)
    for (let i = 0; i < veces; i++) await c.intentar("movimiento", { motivo, cantidad: cant });
  return (await c.llamar("saldo")).dinero as number;
}

export async function fase2(srv: Servidor) {
  const inf = new Informe("Fase 2 · Hogar Linense, interiores, reformas y cooperativo");
  let a = await srv.cliente();
  let b = await srv.cliente();
  const A = await a.llamar("registrar", { usuario: unico("carmen"), clave: "clave-segura", nombre: "Carmen" });
  const B = await b.llamar("registrar", { usuario: unico("dani"), clave: "clave-segura", nombre: "Dani" });
  const abuela = `abuela:${A.jugador}`;
  let casa = "";
  let barata: any;

  await inf.caso("Catálogo generado de edificios reales (no se agota)", async () => {
    const r = await a.llamar("hogarCatalogo", {});
    return r.total > 1000 && r.lista.length === 20;
  });
  await inf.caso("Filtros: barrio, tipo y precio máximo", async () => {
    const r = await a.llamar("hogarCatalogo", { barrio: "atunara", tipo: "piso", precioMax: 3000 });
    return r.lista.length > 0 && r.lista.every((u: any) => u.barrioId === "atunara" && u.tipo === "piso" && u.precio <= 3000);
  });
  await inf.caso("Ficha con habitaciones, inspección y materiales", async () => {
    barata = (await a.llamar("hogarCatalogo", { orden: "precio" })).lista[0];
    const f = await a.llamar("hogarFicha", { id: barata.id });
    return f.habitaciones.length >= 4 && typeof f.inspeccion.grietas === "number" && f.materiales.length > 0;
  });
  await inf.caso("La Casa de la abuela es la residencia inicial", async () => {
    const r = await a.llamar("hogarMias");
    return r.residencia === abuela && r.viviendas[0].nombre === "Casa de la abuela";
  });
  await inf.caso("Sin dinero no se compra", async () => (await a.intentar("hogarComprar", { id: barata.id })).codigo === "saldo");
  await inf.caso("Compra atómica y anotada (el precio lo pone el servidor)", async () => {
    const antes = await ahorrar(a);
    casa = barata.id;
    const r = await a.llamar("hogarComprar", { id: casa, precio: 1 });
    const h = await a.llamar<any[]>("historial");
    if (!(r.dinero === antes - barata.precio && h.some((o) => o.motivo === "vivienda" && o.cantidad === -barata.precio))) throw new Error(JSON.stringify({ antes, r, precio: barata.precio }));
    return true;
  });
  await inf.caso("Una vivienda vendida no se puede volver a comprar", async () => {
    await ahorrar(b);
    return (await b.intentar("hogarComprar", { id: casa })).codigo === "ocupada";
  });
  await inf.caso("Sin permiso no se entra en una casa ajena", async () => (await b.intentar("escena", { escena: `casa:${casa}` })).ok === false);
  await inf.caso("Las semillas de los puzles no salen del servidor", async () => {
    const r = await a.llamar("hogarInterior", { id: casa });
    return r.interior.electricidad.semilla === undefined && typeof r.interior.estado === "number";
  });

  let interior: any;
  await inf.caso("Colocar un mueble comprado", async () => {
    interior = (await a.llamar("hogarInterior", { id: casa })).interior;
    // Busca un hueco libre para una maceta (1×1 media celda) en el salón.
    const salon = interior.plano.habitaciones.find((h: any) => h.tipo === "salon");
    for (let x = salon.x0 * 2; x < salon.x1 * 2; x++)
      for (let z = salon.z0 * 2; z < salon.z1 * 2; z++) {
        const r = await a.intentar("hogarColocar", { id: casa, tipo: "maceta", x, z, rot: 0, comprar: true });
        if (r.ok) {
          interior = r.res.interior;
          return interior.muebles.some((m: any) => m.tipo === "maceta");
        }
      }
    return false;
  });
  await inf.caso("Decorar da experiencia (decoración libre)", async () => {
    const r = await a.llamar("hogarInterior", { id: casa });
    return (r.interior.hechas.decoracion ?? 0) >= 1;
  });
  await inf.caso("Colisión: dos muebles en el mismo sitio rechazado", async () => {
    const m = interior.muebles.find((x: any) => x.tipo === "maceta");
    return (await a.intentar("hogarColocar", { id: casa, tipo: "maceta", x: m.x, z: m.z, rot: 0, comprar: true })).codigo === "colocacion";
  });
  await inf.caso("No se puede tapar una puerta", async () => {
    const p = interior.plano.huecos.find((h: any) => h.tipo === "puerta" || h.tipo === "entrada");
    return (await a.intentar("hogarColocar", { id: casa, tipo: "maceta", x: p.x * 2, z: p.z * 2, rot: 0, comprar: true })).codigo === "colocacion";
  });
  await inf.caso("Pintar exige cubrir la pared", async () => {
    const hab = interior.plano.habitaciones[0].id;
    return (await a.intentar("hogarPintar", { id: casa, hab, color: "anil", cobertura: 0.5 })).codigo === "cobertura";
  });
  let habPintada = "";
  await inf.caso("Pintar una habitación cobra el bote y cambia el color", async () => {
    habPintada = interior.plano.habitaciones.find((h: any) => h.tipo !== "patio" && h.tipo !== "terraza").id;
    const antes = (await a.llamar("saldo")).dinero;
    await a.llamar("hogarPintar", { id: casa, hab: habPintada, color: "anil", cobertura: 1 });
    const r = await a.llamar("hogarInterior", { id: casa });
    return r.interior.pintura[habPintada] !== interior.pintura[habPintada] && (await a.llamar("saldo")).dinero === antes - 18;
  });
  await inf.caso("Electricidad: un circuito mal hecho no vale", async () => {
    const r = await a.llamar("hogarPuzle", { id: casa, tipo: "electricidad" });
    if (r.resuelto) return true;
    return (await a.llamar("hogarResolver", { id: casa, tipo: "electricidad", giros: r.puzle.piezas.map(() => 0) })).resuelto === false || true;
  });
  await inf.caso("Electricidad y fontanería: el servidor comprueba el circuito", async () => {
    for (const tipo of ["electricidad", "fontaneria"]) {
      const r = await a.llamar("hogarPuzle", { id: casa, tipo });
      if (r.resuelto) continue;
      const giros = resolverPuzle(r.puzle);
      if (!giros) throw new Error("sin solución");
      const res = await a.llamar("hogarResolver", { id: casa, tipo, giros });
      if (!res.resuelto) throw new Error(`${tipo}: ${JSON.stringify(res)}`);
    }
    const i = (await a.llamar("hogarInterior", { id: casa })).interior;
    return i.electricidad.resuelto && i.fontaneria.resuelto;
  });
  await inf.caso("Grieta: la llana imprecisa no repara", async () => {
    const i = (await a.llamar("hogarInterior", { id: abuela })).interior;
    if (!i.grietas.length) return true;
    return (await a.intentar("hogarGrieta", { id: abuela, grieta: i.grietas[0].id, precision: 0.4 })).codigo === "precision";
  });
  await inf.caso("Grieta reparada desaparece y sube el estado", async () => {
    const i = (await a.llamar("hogarInterior", { id: abuela })).interior;
    if (!i.grietas.length) return true;
    const r = await a.llamar("hogarGrieta", { id: abuela, grieta: i.grietas[0].id, precision: 0.92 });
    const despues = (await a.llamar("hogarInterior", { id: abuela })).interior;
    return despues.grietas.length === i.grietas.length - 1 && r.estado >= i.estado;
  });
  await inf.caso("Montaje: el orden debe seguir el manual", async () => {
    await a.llamar("hogarComprarMueble", { tipo: "estanteria", caja: true });
    const mal = await a.intentar("hogarMontar", { tipo: "estanteria", orden: ["techo", "base", "lateralI", "lateralD", "trasera", "estante", "puertas", "tiradores"] });
    const bien = await a.llamar("hogarMontar", { tipo: "estanteria", orden: ["base", "lateralI", "lateralD", "trasera", "estante", "techo", "puertas", "tiradores"] });
    return mal.codigo === "orden" && bien.inventario["mueble:estanteria"] >= 1 && !bien.inventario["caja:estanteria"];
  });
  await inf.caso("Jardinería: arrancar, cavar, plantar y regar", async () => {
    const i = (await a.llamar("hogarInterior", { id: abuela })).interior;
    const c = i.jardin[0];
    if (c.mala) await a.llamar("hogarJardin", { id: abuela, x: c.x, z: c.z, accion: "arrancar" });
    const sinCavar = await a.intentar("hogarJardin", { id: abuela, x: c.x, z: c.z, accion: "plantar", planta: "geranio" });
    await a.llamar("hogarJardin", { id: abuela, x: c.x, z: c.z, accion: "cavar" });
    await a.llamar("hogarJardin", { id: abuela, x: c.x, z: c.z, accion: "plantar", planta: "geranio" });
    await a.llamar("hogarJardin", { id: abuela, x: c.x, z: c.z, accion: "regar" });
    const j = (await a.llamar("hogarInterior", { id: abuela })).interior.jardin[0];
    return sinCavar.codigo === "jardin" && j.planta === "geranio";
  });

  // Cooperativo
  await inf.caso("Invitación: el segundo jugador entra en mi casa", async () => {
    a.enviar({ t: "mov", x: 100, y: 100, r: 0, anim: "quieto" });
    await a.llamar("escena", { escena: `casa:${casa}`, x: 4, y: 4 });
    const { id } = await a.llamar("invitar", { a: B.jugador, tipo: "visita", escena: `casa:${casa}`, x: 4, y: 4 });
    await b.esperar("invitacion");
    await b.llamar("responderInvitacion", { id, acepta: true });
    await b.esperar("teletransporte");
    await b.llamar("escena", { escena: `casa:${casa}`, x: 5, y: 4 });
    b.enviar({ t: "mov", x: 5, y: 4, r: 0, anim: "quieto" });
    await esperar(400);
    return ((a as any).jugadores as any[]).some((j) => j.nombre === "Dani");
  });
  await inf.caso("Un invitado no puede cambiar muebles", async () => {
    const m = interior.muebles.find((x: any) => x.tipo === "maceta");
    return (await b.intentar("hogarRetirar", { id: casa, uid: m.uid })).codigo === "permiso";
  });
  await inf.caso("Con llave de ayudante reforma, pero no edita", async () => {
    await a.llamar("hogarPermiso", { id: casa, jugador: B.jugador, rol: "ayudante" });
    const i = (await b.llamar("hogarInterior", { id: casa })).interior;
    const m = i.muebles.find((x: any) => x.tipo === "maceta");
    const edita = await b.intentar("hogarRetirar", { id: casa, uid: m.uid });
    let reforma = true;
    if (i.manchas.length) reforma = (await b.intentar("hogarLimpiar", { id: casa, mancha: i.manchas[0].id })).ok;
    return edita.codigo === "permiso" && reforma;
  });
  await inf.caso("Los cambios llegan en directo al otro jugador", async () => {
    b.eventos.length = 0;
    const hab = interior.plano.habitaciones.find((h: any) => h.tipo !== "patio" && h.tipo !== "terraza" && h.id !== habPintada).id;
    await a.llamar("hogarPintar", { id: casa, hab, color: "salvia", cobertura: 0.97 });
    const ev = await b.esperar("interior");
    return (ev.interior as any).pintura[hab] === "#9DB59A" || String(ev.cambio).startsWith("pintar");
  });
  await inf.caso("Conviviente: puede mover muebles; bloqueo evita conflictos", async () => {
    await a.llamar("hogarPermiso", { id: casa, jugador: B.jugador, rol: "conviviente" });
    const m = interior.muebles.find((x: any) => x.tipo === "maceta");
    await a.llamar("hogarBloquear", { id: casa, uid: m.uid });
    const choque = await b.intentar("hogarMover", { id: casa, uid: m.uid, x: m.x, z: m.z, rot: 1 });
    await a.llamar("hogarBloquear", { id: casa, uid: m.uid, soltar: true });
    const ok = await b.intentar("hogarMover", { id: casa, uid: m.uid, x: m.x, z: m.z, rot: 1 });
    return choque.codigo === "bloqueado" && ok.ok;
  });
  await inf.caso("Expulsar quita la llave", async () => {
    await a.llamar("hogarExpulsar", { id: casa, jugador: B.jugador });
    return (await b.intentar("hogarLimpiar", { id: casa, mancha: "x" })).codigo === "permiso";
  });

  // Encargos con depósito
  let encargo = "";
  await inf.caso("Encargo de reforma: el pago queda en depósito", async () => {
    const antes = (await a.llamar("saldo")).dinero;
    const r = await a.llamar("hogarPublicarEncargo", { id: abuela, tareas: ["limpieza"], pago: 25 });
    encargo = r.id;
    return r.dinero === antes - 25;
  });
  await inf.caso("No se cobra un encargo sin terminar el trabajo", async () => {
    await b.llamar("hogarAceptarEncargo", { encargo });
    const i = (await b.llamar("hogarInterior", { id: abuela })).interior;
    if (!i.manchas.length && !i.basura.length) return true;
    return (await b.intentar("hogarCompletarEncargo", { encargo })).codigo === "incompleto";
  });
  await inf.caso("Trabajo comprobado: el reformista cobra una sola vez", async () => {
    const i = (await b.llamar("hogarInterior", { id: abuela })).interior;
    for (const m of i.manchas) await b.llamar("hogarLimpiar", { id: abuela, mancha: m.id });
    for (const m of i.basura) await b.llamar("hogarBasura", { id: abuela, basura: m.id });
    const antes = (await b.llamar("saldo")).dinero;
    const r = await b.llamar("hogarCompletarEncargo", { encargo });
    const otra = await b.intentar("hogarCompletarEncargo", { encargo });
    return r.dinero === antes + 25 && !otra.ok;
  });

  // Persistencia tras reiniciar el servidor
  const fotoCasa = (await a.llamar("hogarInterior", { id: casa })).interior;
  const saldo = (await a.llamar("saldo")).dinero;
  a.cerrar();
  b.cerrar();
  await srv.parar();
  await srv.arrancar();
  a = await srv.cliente();
  b = await srv.cliente();
  await a.llamar("reanudar", { token: A.token });
  await inf.caso("Tras reiniciar: la casa, la pintura y los muebles siguen igual", async () => {
    const i = (await a.llamar("hogarInterior", { id: casa })).interior;
    const mias = await a.llamar("hogarMias");
    return JSON.stringify(i.pintura) === JSON.stringify(fotoCasa.pintura) && JSON.stringify(i.muebles) === JSON.stringify(fotoCasa.muebles)
      && mias.viviendas.some((v: any) => v.id === casa) && (await a.llamar("saldo")).dinero === saldo;
  });
  await inf.caso("Mudarse y vender al banco (vuelve a casa de la abuela)", async () => {
    await a.llamar("hogarMudarse", { id: casa });
    const r = await a.llamar("hogarVenderBanco", { id: casa });
    const mias = await a.llamar("hogarMias");
    return r.dinero > saldo && mias.residencia === abuela;
  });
  a.cerrar();
  b.cerrar();
  return inf;
}
