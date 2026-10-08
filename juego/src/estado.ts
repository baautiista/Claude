import type { BarrioId, LugarId } from "./datos/mapa";
import { NODOS } from "./datos/mapa";
import { CULTIVOS, OBJETOS, type ObjetoId } from "./datos/objetos";
import { PERSONAJES, type PersonajeId } from "./datos/personajes";

/** Estado de la partida, reloj, viento, necesidades y guardado. */

export type Viento = "poniente" | "levante" | "levanteFuerte" | "calma";
export type Oficio = "pescador" | "hortelano" | "periodista";
export type Trato = "o" | "a";

export interface Noticia {
  dia: number;
  seccion: string;
  titular: string;
  entradilla: string;
  /** Publicada por el jugador desde la redacción. */
  tuya?: boolean;
}

export interface Pedido {
  id: number;
  de: PersonajeId;
  pide: Partial<Record<ObjetoId, number>>;
  paga: number;
}

export interface Parcela {
  cultivo: keyof typeof CULTIVOS | null;
  /** Minuto absoluto de juego en que se plantó. */
  desde: number;
  /** Horas de crecimiento ya acumuladas (con bonus de viento). */
  horas: number;
}

export interface Estado {
  version: 1;
  nombre: string;
  trato: Trato;
  piel: string;
  ropa: string;
  /** Minutos absolutos desde el día 1 a las 00:00. */
  minuto: number;
  dia: number;
  viento: Viento;
  vientoManana: Viento;
  dinero: number;
  energia: number;
  comida: number;
  animo: number;
  social: number;
  nodo: string;
  mochila: Partial<Record<ObjetoId, number>>;
  oficio: Oficio | null;
  turnos: number;
  amistad: Record<PersonajeId, number>;
  charlaHoy: Partial<Record<PersonajeId, number>>;
  reputacion: Record<BarrioId, number>;
  huerto: Parcela[];
  pedidos: Pedido[];
  siguientePedido: number;
  noticias: Noticia[];
  noticiasVistas: number;
  paso: number;
  flags: Record<string, boolean | number | string>;
  /** Último día en que se trabajó (un turno por día). */
  turnoDia: number;
}

const CLAVE = "mi-linea-v1";

export const HORA_DESPERTAR = 8;

export function nuevaPartida(nombre: string, trato: Trato, piel: string, ropa: string): Estado {
  const amistad = Object.fromEntries(Object.keys(PERSONAJES).map((k) => [k, 0])) as Record<PersonajeId, number>;
  const e: Estado = {
    version: 1,
    nombre, trato, piel, ropa,
    minuto: 24 * 60 + 11 * 60, // día 1, 11:00
    dia: 1,
    viento: "poniente",
    vientoManana: tirarViento(),
    dinero: 40,
    energia: 90,
    comida: 60,
    animo: 60,
    social: 30,
    nodo: "estacion",
    mochila: { semTomate: 2, semLechuga: 2 },
    oficio: null,
    turnos: 0,
    amistad,
    charlaHoy: {},
    reputacion: { sanBernardo: 10, centro: 0, atunara: 0, zabal: 0, poniente: 0, levante: 0 },
    huerto: Array.from({ length: 4 }, () => ({ cultivo: null, desde: 0, horas: 0 })),
    pedidos: [],
    siguientePedido: 1,
    noticias: [],
    noticiasVistas: 0,
    paso: 0,
    flags: {},
    turnoDia: 0,
  };
  e.noticias.push({
    dia: 1, seccion: "CIUDAD",
    titular: "Poniente y cielo limpio para empezar la semana",
    entradilla: "Buen día para la pesca en La Atunara y para pasear por Poniente. Las huertas del Zabal agradecen la humedad.",
  });
  rellenarPedidos(e);
  return e;
}

export function guardar(e: Estado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(e));
  } catch {
    /* sin almacenamiento: la partida dura lo que dure la pestaña */
  }
}

export function cargar(): Estado | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return null;
    const e = JSON.parse(raw) as Estado;
    return e.version === 1 && e.nodo in NODOS ? e : null;
  } catch {
    return null;
  }
}

export function borrar() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada que borrar */
  }
}

/* ── Textos ─────────────────────────────────────────────────────────── */

/** Concordancia de género según el trato elegido: g(e, "nieto", "nieta"). */
export const g = (e: Estado, o: string, a: string) => (e.trato === "a" ? a : o);

export const hora = (e: Estado) => {
  const m = e.minuto % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export const horaDelDia = (e: Estado) => (e.minuto % (24 * 60)) / 60;

export const VIENTOS: Record<Viento, { nombre: string; efecto: string }> = {
  poniente: { nombre: "Poniente", efecto: "Buena pesca. La huerta crece un 25 % más rápido." },
  levante: { nombre: "Levante", efecto: "La pesca se complica. La nube asoma en el Peñón." },
  levanteFuerte: { nombre: "Levante fuerte", efecto: "Las barcas no salen. Bandera roja en Levante. Poniente, a reventar." },
  calma: { nombre: "Calma", efecto: "Día de paseo: el Mercado paga un 10 % más." },
};

function tirarViento(): Viento {
  const r = Math.random();
  if (r < 0.45) return "poniente";
  if (r < 0.65) return "levante";
  if (r < 0.8) return "levanteFuerte";
  return "calma";
}

/* ── Mochila ────────────────────────────────────────────────────────── */

export const cuantos = (e: Estado, id: ObjetoId) => e.mochila[id] ?? 0;

export function dar(e: Estado, id: ObjetoId, n = 1) {
  e.mochila[id] = cuantos(e, id) + n;
}

export function quitar(e: Estado, id: ObjetoId, n = 1): boolean {
  if (cuantos(e, id) < n) return false;
  const quedan = cuantos(e, id) - n;
  if (quedan > 0) e.mochila[id] = quedan;
  else delete e.mochila[id];
  return true;
}

export const tiene = (e: Estado, lista: Partial<Record<ObjetoId, number>>) =>
  (Object.entries(lista) as [ObjetoId, number][]).every(([id, n]) => cuantos(e, id) >= n);

export const precioVenta = (e: Estado, id: ObjetoId) => {
  const base = OBJETOS[id].venta * (e.flags.puesto ? 1.3 : 1) * (e.viento === "calma" ? 1.1 : 1);
  return Math.max(1, Math.round(base));
};

/* ── Necesidades y reloj ────────────────────────────────────────────── */

export const limitar = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function pasarTiempo(e: Estado, minutos: number, esfuerzo = 0) {
  const horas = minutos / 60;
  e.minuto += minutos;
  e.comida = limitar(e.comida - horas * 4);
  e.energia = limitar(e.energia - horas * 2 - esfuerzo);
  e.social = limitar(e.social - horas * 1.5);
  if (e.comida < 20 || e.social < 15) e.animo = limitar(e.animo - horas * 3);
  const bonus = e.viento === "poniente" ? 1.25 : 1;
  for (const p of e.huerto) if (p.cultivo) p.horas += horas * bonus;
}

export const listo = (p: Parcela) => p.cultivo !== null && p.horas >= CULTIVOS[p.cultivo].horas;

/** ¿Es tarde? A partir de las 2:00 el personaje vuelve a casa a dormir. */
export const esMadrugada = (e: Estado) => horaDelDia(e) >= 2 && horaDelDia(e) < HORA_DESPERTAR;

/** Duerme hasta las 8:00 del día siguiente. Devuelve las noticias nuevas. */
export function dormir(e: Estado) {
  const despertar = (e.dia + 1) * 24 * 60 + HORA_DESPERTAR * 60;
  const horas = (despertar - e.minuto) / 60;
  const bonus = e.viento === "poniente" ? 1.25 : 1;
  for (const p of e.huerto) if (p.cultivo) p.horas += horas * bonus;
  e.minuto = despertar;
  e.dia += 1;
  e.energia = 100;
  e.comida = limitar(e.comida - 15);
  e.animo = limitar(e.animo + (e.comida > 30 ? 10 : -10));
  e.viento = e.vientoManana;
  e.vientoManana = tirarViento();
  e.charlaHoy = {};
  e.nodo = "casa";
  rellenarPedidos(e);
  e.noticias.push(noticiaDelDia(e));
}

/* ── Amistad y reputación ───────────────────────────────────────────── */

export function amistad(e: Estado, quien: PersonajeId, n: number) {
  e.amistad[quien] = limitar(e.amistad[quien] + n);
}

export function reputacion(e: Estado, barrio: BarrioId, n: number) {
  e.reputacion[barrio] = limitar(e.reputacion[barrio] + n);
}

export const nivelAmistad = (n: number) =>
  n >= 80 ? "Familia" : n >= 55 ? "Amistad" : n >= 30 ? "Confianza" : n >= 10 ? "Conocido" : "Desconocido";

/* ── Pedidos del tablón ─────────────────────────────────────────────── */

const QUIEN_PIDE: readonly PersonajeId[] = ["carmen", "lola", "juani", "antonio", "rafa", "andres"];

const POSIBLES: readonly Partial<Record<ObjetoId, number>>[] = [
  { tomate: 3 }, { lechuga: 2 }, { tomate: 2, lechuga: 1 }, { pimiento: 2 },
  { sardina: 4 }, { boqueron: 3 }, { camaron: 3 },
  { ensalada: 1 }, { pipirrana: 1 }, { tortillitas: 1 }, { espeto: 1 }, { pescaito: 1 },
];

export function rellenarPedidos(e: Estado) {
  while (e.pedidos.length < 3) {
    const de = QUIEN_PIDE[Math.floor(Math.random() * QUIEN_PIDE.length)];
    const pide = POSIBLES[Math.floor(Math.random() * POSIBLES.length)];
    if (e.pedidos.some((p) => p.de === de)) continue;
    const valor = (Object.entries(pide) as [ObjetoId, number][]).reduce((s, [id, n]) => s + OBJETOS[id].venta * n, 0);
    e.pedidos.push({ id: e.siguientePedido++, de, pide, paga: Math.round(valor * 1.6 + 4) });
  }
}

/* ── Noticias del día (edición del juego) ───────────────────────────── */

const DEL_DIA: Record<Viento, readonly [string, string, string][]> = {
  poniente: [
    ["CIUDAD", "Poniente suave: día de barcas en La Atunara", "Las capturas de sardina y boquerón vuelven a buen nivel. En el Zabal, la huerta agradece la humedad."],
    ["CIUDAD", "La bahía amanece en calma y con poniente", "Buen día para el Paseo de Poniente y para salir a pescar temprano."],
  ],
  levante: [
    ["CIUDAD", "La nube vuelve al Peñón: llega el levante", "Viento moderado de levante durante todo el día. La pesca se complica en La Atunara."],
  ],
  levanteFuerte: [
    ["CIUDAD", "Levante fuerte: las barcas no salen hoy", "Bandera roja en la playa de Levante. El Paseo de Poniente, refugio para quien quiera playa."],
  ],
  calma: [
    ["CIUDAD", "Día de calma y paseo en el Centro", "Sin viento y con sol: buen día para el Mercado y las terrazas de la Calle Real."],
  ],
};

const VARIAS: readonly [string, string, string][] = [
  ["DEPORTES", "La Balona prepara el partido del domingo", "Entrenamiento a puerta abierta en el Estadio Municipal. Buen ambiente en la grada."],
  ["CULTURA", "Las agrupaciones ya ensayan para el Carnaval", "Faltan meses, pero en los locales de ensayo ya se escuchan los primeros pasodobles."],
  ["CIUDAD", "El Mercado de Abastos alarga su horario los sábados", "Los puestos abrirán hasta media tarde para atraer a más público."],
  ["CURIOSIDADES", "¿Por qué la nube del Peñón anuncia el levante?", "El viento húmedo del este sube por la Roca, se enfría y forma la famosa nube."],
  ["HISTORIA", "Los fuertes que defendían la línea", "Los fuertes de Santa Bárbara y San Felipe formaban parte de la línea defensiva que da nombre a la ciudad."],
];

function noticiaDelDia(e: Estado): Noticia {
  const lista = Math.random() < 0.6 ? DEL_DIA[e.viento] : VARIAS;
  const [seccion, titular, entradilla] = lista[Math.floor(Math.random() * lista.length)];
  return { dia: e.dia, seccion, titular, entradilla };
}

export function publicar(e: Estado, n: Omit<Noticia, "dia">) {
  e.noticias.push({ ...n, dia: e.dia });
}

export const sinLeer = (e: Estado) => e.noticias.length - e.noticiasVistas;

export type { LugarId };
