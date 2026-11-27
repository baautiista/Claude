/**
 * DOCUMENTAL «Del "es el que podemos pagar" a 2026»: el alumbrado navideño de La Línea, 2023 → 2026.
 * Material en public/alumbrado/. Lo que falta se ve como hueco con su nombre hasta añadirlo (ver LEEME.md).
 * La locución solo cubre las escenas con narración; el gancho y las palabras del alcalde van sin narrador.
 */
import type { EscenaGuion } from "../marca/guion";

export type EscenaId = "hemeroteca" | "cambio" | "crece" | "presente" | "cierre";

export const ESCENAS: readonly EscenaGuion<EscenaId>[] = [
  {
    id: "hemeroteca",
    nombre: "2. Las críticas de 2023",
    inicio: 0,
    fin: 10,
    frases: [
      "En diciembre de 2023, La Línea era noticia por las críticas a su alumbrado navideño.",
      "Las quejas llegaron incluso a la prensa nacional y el alcalde tuvo que explicar las limitaciones económicas del Ayuntamiento.",
    ],
  },
  { id: "cambio", nombre: "4. 2024", inicio: 10, fin: 14, frases: ["En 2024 comenzaron a apreciarse los primeros cambios."] },
  { id: "crece", nombre: "5. 2025", inicio: 14, fin: 20, frases: ["En 2025, la Navidad ganó nuevos espacios, elementos decorativos y espectáculos."] },
  {
    id: "presente",
    nombre: "6. 2026",
    inicio: 20,
    fin: 30,
    frases: [
      "Y este 2026, la ciudad da un nuevo paso:",
      "más calles iluminadas, un árbol de 16 metros y un espectáculo de luz y sonido en pleno corazón de La Línea.",
    ],
  },
  { id: "cierre", nombre: "7. Cierre", inicio: 30, fin: 34, frases: ["La misma ciudad.", "Tres años después.", "Una Navidad diferente."] },
];

export const PRONUNCIACION: Record<string, string> = {
  "2023": "dos mil veintitrés",
  "2024": "dos mil veinticuatro",
  "2025": "dos mil veinticinco",
  "2026": "dos mil veintiséis",
  "16": "dieciséis",
};

export const PAUSAS_ENTRE_FRASES: Record<string, number> = { hemeroteca: 0.4, presente: 0.35, cierre: 0.6 };

/** Voz habitual, tono documental: algo más pausada y estable. */
export const AJUSTES_VOZ = { speed: 1.06, stability: 0.5 };

/* ---------- Montaje (segundos del vídeo final) ---------- */

/** Inicio de cada escena. El vídeo dura FIN segundos. */
export const T = { gancho: 0, hemeroteca: 4, alcalde: 18, cambio: 26, crece: 31, presente: 38.5, cierre: 54 } as const;
export const FIN = 61;
/** La locución de cada escena empieza este tiempo después del corte. */
export const RETARDO_VOZ = 0.3;

/* ---------- Material ---------- */

export type Medio = { readonly archivo: string; readonly nombre: string; readonly credito?: string; readonly enfoque?: string };

/** Todo en public/alumbrado/. Si un archivo no existe, se ve un hueco con su nombre. */
export const MEDIOS = {
  diarioArea: { archivo: "alumbrado/prensa-diarioarea.jpg", nombre: "Diario Área", credito: "Diario Área · diciembre de 2023" },
  laRazon: { archivo: "alumbrado/prensa-larazon.jpg", nombre: "La Razón", credito: "La Razón · 5 de diciembre de 2023" },
  archivo2023: { archivo: "alumbrado/archivo-2023.jpg", nombre: "Alumbrado 2023", credito: "Imagen: Diario Área, 2023", enfoque: "40% 45%" },
  fotogramaAlcalde: { archivo: "alumbrado/alcalde-2023-fotograma.jpg", nombre: "Vídeo del alcalde", credito: "Imagen: vídeo de Juan Franco vía La Razón", enfoque: "40% 50%" },
  encendido2024a: { archivo: "alumbrado/encendido-2024-1.jpg", nombre: "Encendido 2024" , credito: "Imagen: Europa Sur, 2024" },
  encendido2024b: { archivo: "alumbrado/encendido-2024-2.jpg", nombre: "Nuevos motivos 2024", credito: "Imagen: Europa Sur, 2024" },
  encendido2025: { archivo: "alumbrado/encendido-2025.jpg", nombre: "Encendido 2025", credito: "Imagen: Diario Área, 2025", enfoque: "50% 45%" },
  drones2025a: { archivo: "alumbrado/drones-2025-adornos.jpg", nombre: "Drones 2025", credito: "Imagen: Europa Sur, 2025" },
  drones2025b: { archivo: "alumbrado/drones-2025-feliz-ano.jpg", nombre: "Drones 2025", credito: "Imagen: Europa Sur, 2025" },
  plaza2026: { archivo: "alumbrado/2026-plaza-iglesia.jpg", nombre: "Plaza de la Iglesia 2026" },
  arbol2026: { archivo: "alumbrado/2026-arbol.jpg", nombre: "Árbol de 16 metros" },
  espectaculo2026: { archivo: "alumbrado/2026-espectaculo.mp4", nombre: "Espectáculo de luz y sonido" },
  calles2026: { archivo: "alumbrado/2026-calles.jpg", nombre: "Calles iluminadas 2026" },
  /** Mismo encuadre que archivo-2023.jpg, para el antes/después. */
  mismoLugar2026: { archivo: "alumbrado/2026-mismo-lugar.jpg", nombre: "Mismo lugar en 2026" },
  cierre2026: { archivo: "alumbrado/2026-cierre.jpg", nombre: "Mejor imagen 2026" },
} as const satisfies Record<string, Medio>;

/**
 * Fragmento real del vídeo de Juan Franco (4 de diciembre de 2023), recortado a ~8 s.
 * Si public/alumbrado/alcalde-2023.mp4 existe, sustituye a las citas de prensa de la escena 3
 * y suena con su audio original. `subtitulos`: transcripción literal por tramos (segundos del clip);
 * las palabras entre asteriscos van en dorado. No escribas nada que no se oiga en el vídeo.
 */
export const ALCALDE = {
  archivo: "alumbrado/alcalde-2023.mp4",
  recorteInicio: 0,
  subtitulos: [] as { desde: number; hasta: number; texto: string }[],
};

/** Citas que publicó la prensa (titulares verificables en las capturas). */
export const CITAS_PRENSA = [
  { texto: "«Es el que *podemos* *pagar»", fuente: "Diario Área" },
  { texto: "«Me encantaría tener un *BMW* *525* y tengo un *Toyota* *Auris* de segunda mano»", fuente: "La Razón" },
] as const;

export const AUDIO = {
  locucion: "alumbrado/locucion.mp3",
  musica: "alumbrado/musica.mp3",
  ambiente: "alumbrado/ambiente.mp3",
  proyector: "alumbrado/proyector.mp3",
  papel: "alumbrado/papel.mp3",
  subrayado: "alumbrado/subrayado.mp3",
  barrido: "alumbrado/barrido.mp3",
  golpe: "alumbrado/golpe.mp3",
  destello: "alumbrado/destello.mp3",
  tic: "alumbrado/tic.mp3",
} as const;
