/** Objetos, semillas, recetas y precios de «Mi Línea». */

export type ObjetoId =
  | "tomate" | "lechuga" | "pimiento"
  | "semTomate" | "semLechuga" | "semPimiento"
  | "sardina" | "boqueron" | "camaron" | "pulpo"
  | "harina" | "aceite"
  | "tortillitas" | "pescaito" | "pipirrana" | "ensalada" | "espeto";

export type Tipo = "huerta" | "semilla" | "pesca" | "despensa" | "plato";

export interface Objeto {
  nombre: string;
  plural: string;
  tipo: Tipo;
  /** Lo que te pagan en el Mercado. */
  venta: number;
  /** Comida que repone al comerlo (solo platos). */
  comida?: number;
  animo?: number;
  color: string;
}

export const OBJETOS: Record<ObjetoId, Objeto> = {
  tomate: { nombre: "Tomate", plural: "tomates", tipo: "huerta", venta: 2, color: "#FF4D4D" },
  lechuga: { nombre: "Lechuga", plural: "lechugas", tipo: "huerta", venta: 2, color: "#7BD55A" },
  pimiento: { nombre: "Pimiento", plural: "pimientos", tipo: "huerta", venta: 3, color: "#3BB54A" },
  semTomate: { nombre: "Semillas de tomate", plural: "semillas de tomate", tipo: "semilla", venta: 0, color: "#C9A27A" },
  semLechuga: { nombre: "Semillas de lechuga", plural: "semillas de lechuga", tipo: "semilla", venta: 0, color: "#C9A27A" },
  semPimiento: { nombre: "Semillas de pimiento", plural: "semillas de pimiento", tipo: "semilla", venta: 0, color: "#C9A27A" },
  sardina: { nombre: "Sardina", plural: "sardinas", tipo: "pesca", venta: 2, color: "#9FB4D9" },
  boqueron: { nombre: "Boquerón", plural: "boquerones", tipo: "pesca", venta: 3, color: "#BFD0EE" },
  camaron: { nombre: "Camarón", plural: "camarones", tipo: "pesca", venta: 3, color: "#FFB38A" },
  pulpo: { nombre: "Pulpo", plural: "pulpos", tipo: "pesca", venta: 9, color: "#E07AA8" },
  harina: { nombre: "Harina", plural: "paquetes de harina", tipo: "despensa", venta: 1, color: "#F4EBD9" },
  aceite: { nombre: "Aceite", plural: "botellas de aceite", tipo: "despensa", venta: 2, color: "#E3C34A" },
  tortillitas: { nombre: "Tortillitas de camarones", plural: "raciones de tortillitas", tipo: "plato", venta: 12, comida: 45, animo: 10, color: "#E8B04B" },
  pescaito: { nombre: "Pescaíto frito", plural: "raciones de pescaíto", tipo: "plato", venta: 14, comida: 50, animo: 10, color: "#E6C27A" },
  pipirrana: { nombre: "Pipirrana", plural: "pipirranas", tipo: "plato", venta: 10, comida: 35, animo: 5, color: "#E85A4F" },
  ensalada: { nombre: "Ensalada", plural: "ensaladas", tipo: "plato", venta: 7, comida: 25, animo: 5, color: "#8FD16A" },
  espeto: { nombre: "Espeto de sardinas", plural: "espetos", tipo: "plato", venta: 9, comida: 40, animo: 8, color: "#A7B8D6" },
};

export type CultivoId = "lechuga" | "tomate" | "pimiento";

export interface Cultivo {
  semilla: ObjetoId;
  da: ObjetoId;
  cantidad: number;
  /** Minutos de juego hasta la cosecha (1 s real = 1 min de juego). */
  minutos: number;
}

export const CULTIVOS: Record<CultivoId, Cultivo> = {
  lechuga: { semilla: "semLechuga", da: "lechuga", cantidad: 2, minutos: 90 },
  tomate: { semilla: "semTomate", da: "tomate", cantidad: 3, minutos: 180 },
  pimiento: { semilla: "semPimiento", da: "pimiento", cantidad: 2, minutos: 300 },
};

/** Salidas de la barca en La Atunara (como el barco de Hay Day). */
export const SALIDAS = {
  corta: { nombre: "Salida corta", minutos: 60, descripcion: "Cerca de la costa: sardinas y algún boquerón." },
  larga: { nombre: "Salida larga", minutos: 180, descripcion: "Mar adentro: camarón, boquerón y, con suerte, pulpo." },
} as const;
export type SalidaId = keyof typeof SALIDAS;

export interface Receta {
  da: ObjetoId;
  necesita: Partial<Record<ObjetoId, number>>;
  minutos: number;
}

export const RECETAS: readonly Receta[] = [
  { da: "ensalada", necesita: { lechuga: 1, tomate: 1 }, minutos: 15 },
  { da: "pipirrana", necesita: { tomate: 2, pimiento: 1, aceite: 1 }, minutos: 25 },
  { da: "tortillitas", necesita: { camaron: 2, harina: 1 }, minutos: 30 },
  { da: "espeto", necesita: { sardina: 3 }, minutos: 35 },
  { da: "pescaito", necesita: { boqueron: 2, harina: 1, aceite: 1 }, minutos: 45 },
];

/** Tiendas: qué se compra y dónde. */
export const TIENDAS = {
  mercado: { harina: 2, aceite: 3, semTomate: 1, semLechuga: 1, semPimiento: 1 },
  huerta: { semTomate: 1, semLechuga: 1, semPimiento: 1, tomate: 3 },
  atunara: { camaron: 3, sardina: 2 },
} as const satisfies Record<string, Partial<Record<ObjetoId, number>>>;
