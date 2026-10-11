/** Fase 1: cuentas, sesiones, economía validada, multijugador y persistencia. */
import { esperar, Informe, Servidor, unico } from "./utilidades.ts";

export async function fase1(srv: Servidor) {
  const inf = new Informe("Fase 1 · servidor, cuentas, multijugador y economía");
  const a = await srv.cliente();
  const b = await srv.cliente();
  const ua = unico("ana");
  const ub = unico("beto");
  let A: any, B: any;
  await inf.caso("Registro con 39 € iniciales", async () => {
    A = await a.llamar("registrar", { usuario: ua, clave: "clave-segura", nombre: "Ana" });
    B = await b.llamar("registrar", { usuario: ub, clave: "clave-segura", nombre: "Beto" });
    return A.perfil.dinero === 39 && B.perfil.dinero === 39;
  });
  await inf.caso("Usuario repetido rechazado", async () => (await a.intentar("registrar", { usuario: ua, clave: "otra-clave" })).codigo === "existe");
  await inf.caso("Contraseña incorrecta rechazada", async () => (await (await srv.cliente()).intentar("entrar", { usuario: ua, clave: "mala-clave" })).codigo === "credenciales");
  await inf.caso("Sin sesión no hay operaciones", async () => (await (await srv.cliente()).intentar("saldo")).codigo === "sesion");
  await inf.caso("Ingreso legal aceptado y anotado", async () => (await a.llamar("movimiento", { motivo: "venta", cantidad: 20 })).dinero === 59);
  await inf.caso("Ingreso por encima del máximo rechazado", async () => (await a.intentar("movimiento", { motivo: "venta", cantidad: 5000 })).codigo === "tope");
  await inf.caso("Tope diario por actividad", async () => {
    for (let i = 0; i < 5; i++) await a.intentar("movimiento", { motivo: "venta", cantidad: 120 });
    return (await a.intentar("movimiento", { motivo: "venta", cantidad: 120 })).codigo === "tope";
  });
  await inf.caso("Motivo inventado rechazado", async () => (await a.intentar("movimiento", { motivo: "regalo", cantidad: 10 })).codigo === "motivo");
  await inf.caso("Gasto sin saldo rechazado", async () => (await b.intentar("movimiento", { motivo: "compra", cantidad: -1000 })).codigo === "saldo");
  await inf.caso("Transferencia negativa rechazada", async () => !(await b.intentar("transferir", { a: A.jugador, cantidad: -10 })).ok);
  await inf.caso("Transferencia atómica", async () => {
    const antes = (await a.llamar("saldo")).dinero;
    await b.llamar("transferir", { a: A.jugador, cantidad: 9 });
    return (await a.llamar("saldo")).dinero === antes + 9 && (await b.llamar("saldo")).dinero === 30;
  });
  await inf.caso("El libro de operaciones cuadra con el saldo", async () => {
    const h = await b.llamar<any[]>("historial");
    return h.reduce((s, o) => s + o.cantidad, 0) === (await b.llamar("saldo")).dinero;
  });
  await inf.caso("Posiciones sincronizadas en la escena", async () => {
    a.enviar({ t: "mov", x: 1500, y: 1800, r: 1, anim: "andar" });
    b.enviar({ t: "mov", x: 1506, y: 1803, r: 2, anim: "quieto" });
    await esperar(400);
    const vista = (a as any).jugadores as any[];
    return vista?.some((j) => j.nombre === "Beto" && j.x === 1506 && j.anim === "quieto");
  });
  await inf.caso("Lista de cercanos con distancia", async () => (await a.llamar<any[]>("cercanos")).some((j) => j.nombre === "Beto" && j.distancia < 10));
  await inf.caso("Chat público", async () => {
    b.enviar({ t: "chat", texto: "Hola, Ana" });
    return (await a.esperar("chat")).texto === "Hola, Ana";
  });
  await inf.caso("Gesto social visible", async () => {
    b.enviar({ t: "gesto", g: "hola" });
    await esperar(300);
    return ((a as any).jugadores as any[]).some((j) => j.gesto === "hola");
  });
  await inf.caso("Solicitud y aceptación de amistad", async () => {
    await a.llamar("solicitarAmistad", { a: B.jugador });
    await b.esperar("amistad");
    await b.llamar("aceptarAmistad", { de: A.jugador });
    return (await a.llamar<any[]>("amigos")).some((x) => x.id === B.jugador && x.estado === "aceptada");
  });
  await inf.caso("Mensaje privado", async () => {
    await a.llamar("enviarPrivado", { a: B.jugador, texto: "¿Vamos a la Atunara?" });
    return (await b.esperar("privado")).texto === "¿Vamos a la Atunara?";
  });
  await inf.caso("Invitación y teletransporte junto al anfitrión", async () => {
    b.enviar({ t: "mov", x: 900, y: 1200, r: 0, anim: "quieto" });
    const { id } = await a.llamar("invitar", { a: B.jugador, tipo: "unirse", escena: "ciudad", x: 1500, y: 1800 });
    await b.esperar("invitacion");
    await b.llamar("responderInvitacion", { id, acepta: true });
    const t = await b.esperar("teletransporte");
    return Math.hypot(Number(t.x) - 1500, Number(t.y) - 1800) < 10;
  });
  await inf.caso("Invitación caducada o ajena no se puede usar", async () => !(await a.intentar("responderInvitacion", { id: "inexistente", acepta: true })).ok);
  await inf.caso("Salas con capacidad", async () => (await a.llamar<any[]>("salas")).length >= 2);
  await inf.caso("Denuncia registrada", async () => (await a.llamar("denunciar", { a: B.jugador, motivo: "spam", texto: "prueba" })).ok);
  await inf.caso("Bloqueo: dejan de verse y de escribirse", async () => {
    await a.llamar("bloquear", { a: B.jugador });
    await esperar(300);
    const ve = ((a as any).jugadores as any[]).some((j) => j.nombre === "Beto");
    const escribe = await b.intentar("enviarPrivado", { a: A.jugador, texto: "hola" });
    return !ve && escribe.codigo === "bloqueo";
  });
  await inf.caso("Partida guardada en el servidor", async () => {
    await a.llamar("guardarPartida", { partida: { nombre: "Ana", xp: 30, flags: { prueba: 1 } } });
    const r = await a.llamar("cargarPartida");
    return r.partida.flags.prueba === 1 && r.dinero > 0;
  });
  await inf.caso("La experiencia no salta de golpe", async () => {
    await a.llamar("guardarPartida", { partida: { xp: 999999 } });
    return (await a.llamar("cargarPartida")).xp <= 30 + 120;
  });
  // Reinicio del servidor: todo debe seguir igual.
  await a.llamar("guardarPartida", { partida: { nombre: "Ana", xp: 40, flags: { prueba: 1 } } });
  const token = A.token;
  const saldo = (await a.llamar("saldo")).dinero;
  a.cerrar();
  b.cerrar();
  await srv.parar();
  await srv.arrancar();
  await inf.caso("Tras reiniciar el servidor: sesión, saldo y partida intactos", async () => {
    const c = await srv.cliente();
    await c.llamar("reanudar", { token });
    const r = await c.llamar("cargarPartida");
    c.cerrar();
    return r.dinero === saldo && r.partida.flags.prueba === 1;
  });
  return inf;
}
