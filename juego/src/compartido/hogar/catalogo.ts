/**
 * Catálogo de Muebles Linenses (tienda del juego), suelos y pinturas.
 * Medidas en medias celdas (0,5 m). Precios ficticios del juego.
 *
 * Capas: "suelo" (choca con otros muebles de suelo), "alfombra" (debajo de
 * todo), "pared" (pegado a una pared), "encima" (sobre un mueble con superficie).
 */

export type Capa = "suelo" | "alfombra" | "pared" | "encima";
export type Funcion = "dormir" | "descansar" | "sentarse" | "cocinar" | "comer" | "ducharse" | "asearse" | "guardar" | "ordenador" | "tele" | "luz" | "decor" | "jardin";
export type Categoria = "Dormitorio" | "Salón" | "Cocina" | "Baño" | "Estudio" | "Iluminación" | "Decoración" | "Patio";

export interface MuebleDef {
  nombre: string;
  categoria: Categoria;
  precio: number;
  w: number;
  d: number;
  alto: number;
  capa: Capa;
  funcion: Funcion;
  /** Otros muebles pueden ir encima. */
  superficie?: boolean;
  colores: string[];
  /** Se vende también en caja para montarlo (más barato). */
  montable?: boolean;
}

export const MUEBLES: Record<string, MuebleDef> = {
  camaDoble: { nombre: "Cama de matrimonio", categoria: "Dormitorio", precio: 240, w: 4, d: 4, alto: 1.1, capa: "suelo", funcion: "dormir", colores: ["#F4F1EA", "#C9D8E8", "#E9C9C3", "#D7E3C8"], montable: true },
  camaIndividual: { nombre: "Cama individual", categoria: "Dormitorio", precio: 130, w: 2, d: 4, alto: 1, capa: "suelo", funcion: "dormir", colores: ["#F4F1EA", "#C9D8E8", "#F2D9A0"], montable: true },
  mesitaNoche: { nombre: "Mesita de noche", categoria: "Dormitorio", precio: 35, w: 1, d: 1, alto: 1, capa: "suelo", funcion: "guardar", superficie: true, colores: ["#8A5A35", "#F4F1EA", "#3E4A5C"], montable: true },
  armario: { nombre: "Armario ropero", categoria: "Dormitorio", precio: 190, w: 4, d: 2, alto: 4, capa: "suelo", funcion: "guardar", colores: ["#8A5A35", "#F4F1EA", "#6B4A2E"], montable: true },
  comoda: { nombre: "Cómoda", categoria: "Dormitorio", precio: 95, w: 3, d: 2, alto: 1.6, capa: "suelo", funcion: "guardar", superficie: true, colores: ["#8A5A35", "#F4F1EA", "#7FA6C7"], montable: true },
  sofa: { nombre: "Sofá de tres plazas", categoria: "Salón", precio: 260, w: 4, d: 2, alto: 1.5, capa: "suelo", funcion: "descansar", colores: ["#2F6DB5", "#C0392B", "#7E8B6A", "#E6D5B8", "#3E4A5C"] },
  sillon: { nombre: "Sillón orejero", categoria: "Salón", precio: 120, w: 2, d: 2, alto: 1.6, capa: "suelo", funcion: "descansar", colores: ["#C0392B", "#2E7D4F", "#E6A93A", "#8E7CC3"] },
  mesaCentro: { nombre: "Mesa de centro", categoria: "Salón", precio: 60, w: 3, d: 2, alto: 0.8, capa: "suelo", funcion: "decor", superficie: true, colores: ["#8A5A35", "#F4F1EA", "#2B2D31"], montable: true },
  muebleTele: { nombre: "Mueble de televisión", categoria: "Salón", precio: 80, w: 4, d: 1, alto: 1, capa: "suelo", funcion: "guardar", superficie: true, colores: ["#8A5A35", "#F4F1EA", "#2B2D31"], montable: true },
  television: { nombre: "Televisión", categoria: "Salón", precio: 180, w: 3, d: 1, alto: 1.4, capa: "encima", funcion: "tele", colores: ["#1C1D21"] },
  estanteria: { nombre: "Estantería con libros", categoria: "Salón", precio: 85, w: 3, d: 1, alto: 3.6, capa: "suelo", funcion: "guardar", colores: ["#8A5A35", "#F4F1EA", "#2B2D31"], montable: true },
  mesaComedor: { nombre: "Mesa de comedor", categoria: "Cocina", precio: 110, w: 4, d: 3, alto: 1.5, capa: "suelo", funcion: "comer", superficie: true, colores: ["#8A5A35", "#F4F1EA", "#6B4A2E"], montable: true },
  silla: { nombre: "Silla de enea", categoria: "Cocina", precio: 25, w: 1, d: 1, alto: 1.8, capa: "suelo", funcion: "sentarse", colores: ["#8A5A35", "#2E7D4F", "#C0392B", "#F4F1EA"] },
  cocina: { nombre: "Encimera con fogones", categoria: "Cocina", precio: 320, w: 4, d: 2, alto: 1.8, capa: "suelo", funcion: "cocinar", superficie: true, colores: ["#F4F1EA", "#2F6DB5", "#7E8B6A", "#2B2D31"] },
  frigorifico: { nombre: "Frigorífico", categoria: "Cocina", precio: 210, w: 2, d: 2, alto: 3.6, capa: "suelo", funcion: "comer", colores: ["#F4F4F2", "#C0392B", "#9AA4B2"] },
  lavabo: { nombre: "Lavabo con espejo", categoria: "Baño", precio: 90, w: 2, d: 1, alto: 1.8, capa: "suelo", funcion: "asearse", colores: ["#FFFFFF"] },
  inodoro: { nombre: "Inodoro", categoria: "Baño", precio: 80, w: 1, d: 2, alto: 1.6, capa: "suelo", funcion: "asearse", colores: ["#FFFFFF"] },
  ducha: { nombre: "Plato de ducha", categoria: "Baño", precio: 170, w: 2, d: 2, alto: 4, capa: "suelo", funcion: "ducharse", colores: ["#CFE8F5"] },
  banera: { nombre: "Bañera", categoria: "Baño", precio: 230, w: 4, d: 2, alto: 1.2, capa: "suelo", funcion: "ducharse", colores: ["#FFFFFF", "#F2D9A0"] },
  escritorio: { nombre: "Escritorio", categoria: "Estudio", precio: 95, w: 3, d: 2, alto: 1.5, capa: "suelo", funcion: "decor", superficie: true, colores: ["#8A5A35", "#F4F1EA", "#2B2D31"], montable: true },
  ordenador: { nombre: "Ordenador", categoria: "Estudio", precio: 380, w: 2, d: 1, alto: 1, capa: "encima", funcion: "ordenador", colores: ["#2B2D31", "#F4F4F2"] },
  sillaOficina: { nombre: "Silla de escritorio", categoria: "Estudio", precio: 55, w: 1, d: 1, alto: 2, capa: "suelo", funcion: "sentarse", colores: ["#2B2D31", "#2F6DB5", "#C0392B"] },
  lamparaPie: { nombre: "Lámpara de pie", categoria: "Iluminación", precio: 45, w: 1, d: 1, alto: 3.4, capa: "suelo", funcion: "luz", colores: ["#F7E3A1", "#FFFFFF", "#E9A08F"] },
  lamparaMesa: { nombre: "Lámpara de mesa", categoria: "Iluminación", precio: 25, w: 1, d: 1, alto: 1, capa: "encima", funcion: "luz", colores: ["#F7E3A1", "#FFFFFF", "#7FB0C9"] },
  alfombra: { nombre: "Alfombra de esparto", categoria: "Decoración", precio: 40, w: 4, d: 3, alto: 0.05, capa: "alfombra", funcion: "decor", colores: ["#D9C29A", "#C0392B", "#2F6DB5", "#7E8B6A"] },
  maceta: { nombre: "Maceta con kentia", categoria: "Decoración", precio: 20, w: 1, d: 1, alto: 2.2, capa: "suelo", funcion: "decor", colores: ["#B4643F", "#F4F1EA", "#2F6DB5"] },
  cuadro: { nombre: "Cuadro del Peñón", categoria: "Decoración", precio: 30, w: 2, d: 1, alto: 1.2, capa: "pared", funcion: "decor", colores: ["#1F5EFF", "#C4E910", "#FF1254"] },
  espejo: { nombre: "Espejo de forja", categoria: "Decoración", precio: 35, w: 2, d: 1, alto: 1.6, capa: "pared", funcion: "decor", colores: ["#2A2D33", "#C9A64B"] },
  reloj: { nombre: "Reloj de pared", categoria: "Decoración", precio: 18, w: 1, d: 1, alto: 0.8, capa: "pared", funcion: "decor", colores: ["#F4F1EA", "#2B2D31"] },
  jarron: { nombre: "Jarrón de Triana", categoria: "Decoración", precio: 15, w: 1, d: 1, alto: 0.8, capa: "encima", funcion: "decor", colores: ["#1F5EFF", "#E6A93A", "#2E7D4F"] },
  bancoPatio: { nombre: "Banco de forja", categoria: "Patio", precio: 70, w: 3, d: 1, alto: 1.4, capa: "suelo", funcion: "sentarse", colores: ["#2A2D33", "#2E7D4F"] },
  mesaPatio: { nombre: "Mesa de patio", categoria: "Patio", precio: 55, w: 2, d: 2, alto: 1.4, capa: "suelo", funcion: "comer", superficie: true, colores: ["#F4F1EA", "#2A2D33"], montable: true },
  geranios: { nombre: "Macetas de geranios", categoria: "Patio", precio: 12, w: 1, d: 1, alto: 0.9, capa: "pared", funcion: "decor", colores: ["#E94B6A", "#F06EAA", "#FFFFFF"] },
};

export const CATEGORIAS: Categoria[] = ["Salón", "Dormitorio", "Cocina", "Baño", "Estudio", "Iluminación", "Decoración", "Patio"];
/** En caja para montar: 30 % más barato. */
export const precioCaja = (id: string) => Math.round(MUEBLES[id].precio * 0.7);
/** Venta de un mueble usado: la mitad. */
export const precioReventa = (id: string) => Math.round(MUEBLES[id].precio * 0.5);

export const SUELOS: Record<string, { nombre: string; precioM2: number; colores: [string, string]; patron: "hidraulico" | "tablas" | "baldosa" | "liso" | "barro" }> = {
  hidraulico: { nombre: "Baldosa hidráulica", precioM2: 9, colores: ["#E9E2D3", "#2F6DB5"], patron: "hidraulico" },
  barro: { nombre: "Barro cocido", precioM2: 6, colores: ["#C9805E", "#B4643F"], patron: "barro" },
  parquet: { nombre: "Tarima de roble", precioM2: 11, colores: ["#C9A06A", "#B08550"], patron: "tablas" },
  terrazo: { nombre: "Terrazo", precioM2: 7, colores: ["#E8E2D6", "#BDB5A8"], patron: "baldosa" },
  marmol: { nombre: "Mármol blanco", precioM2: 15, colores: ["#F4F4F2", "#DCDCDC"], patron: "baldosa" },
  microcemento: { nombre: "Microcemento", precioM2: 10, colores: ["#BFC5CE", "#AEB5BF"], patron: "liso" },
  cesped: { nombre: "Césped (patio)", precioM2: 4, colores: ["#6FB257", "#5E9E45"], patron: "liso" },
};

export const PINTURAS: Record<string, { nombre: string; color: string }> = {
  cal: { nombre: "Cal blanca", color: "#FBFAF6" },
  albero: { nombre: "Albero", color: "#E8C27A" },
  anil: { nombre: "Azul añil", color: "#4F7FC7" },
  celeste: { nombre: "Azul celeste", color: "#BFD8F2" },
  salvia: { nombre: "Verde salvia", color: "#B9CDB0" },
  rosa: { nombre: "Rosa palo", color: "#EBC9C3" },
  perla: { nombre: "Gris perla", color: "#D9DCE0" },
  terracota: { nombre: "Terracota", color: "#D08060" },
  limon: { nombre: "Amarillo limón", color: "#F7E3A1" },
};
/** Bote de pintura para una habitación. */
export const PRECIO_PINTURA = 18;

export const PLANTAS_JARDIN: Record<string, { nombre: string; precio: number; horas: number; color: string }> = {
  geranio: { nombre: "Geranio", precio: 4, horas: 2, color: "#E94B6A" },
  jazmin: { nombre: "Jazmín", precio: 6, horas: 4, color: "#FFFFFF" },
  buganvilla: { nombre: "Buganvilla", precio: 9, horas: 8, color: "#D9479B" },
  limonero: { nombre: "Limonero", precio: 14, horas: 12, color: "#F4D35E" },
  romero: { nombre: "Romero", precio: 3, horas: 1, color: "#7FA6C7" },
};
