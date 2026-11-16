/**
 * REPORTAJE "La estación de autobuses de La Línea" (2:30–3:00).
 * Fotos en public/estacion/. Las que faltan se ven como hueco con su nombre hasta añadirlas:
 * fachada-actual.jpg, vigas-anden.jpg, humedades.jpg, suciedad-paredes.jpg.
 * Las fechas de los rótulos son de la cronología, no de la toma de las fotos.
 */
import type { EscenaGuion } from "../marca/guion";

export type EscenaId = "gancho" | "deterioro" | "denuncias" | "respuesta" | "cambio" | "reapertura";

export const ESCENAS: readonly EscenaGuion<EscenaId>[] = [
  {
    id: "gancho",
    nombre: "1. Gancho",
    inicio: 0,
    fin: 15,
    frases: [
      "Los baños no tenían agua.",
      "Los conductores tenían que ir al bar de enfrente.",
      "Y dentro de los autobuses había pasajeros que se golpeaban con las ventanas al pasar por los socavones.",
      "Esto ocurría en la estación de La Línea en 2015.",
      "Mira ahora la entrada.",
      "Es la misma estación.",
    ],
  },
  {
    id: "deterioro",
    nombre: "2. El deterioro venía de lejos",
    inicio: 15,
    fin: 55,
    frases: [
      "El deterioro ya venía de lejos.",
      "En una carta fechada en 2009 que se conserva reproducida en un foro local se hablaba de aseos sucios, estructuras oxidadas y paneles que no servían.",
      "Cuando el Ayuntamiento adjudicó la gestión a Los Amarillos en 2014, los baños, el vallado, las cancelas y la marquesina ya figuraban entre las reparaciones urgentes.",
      "La empresa tenía que hacer las obras y al Ayuntamiento le correspondía exigir que se cumplieran.",
      "En enero de 2015, el PP reprochó al gobierno municipal de PSOE y PA que las primeras reparaciones siguieran pendientes.",
      "Días después, UPyD volvió a denunciar el abandono tras visitar la estación a petición de varios vecinos.",
    ],
  },
  {
    id: "denuncias",
    nombre: "3. Las denuncias de 2017",
    inicio: 55,
    fin: 80,
    frases: [
      "En 2017, los conductores de Comes denunciaban que había tantos socavones que los autobuses no podían esquivarlos.",
      "Contaron que algún pasajero llegó a caerse dentro del vehículo.",
      "El comité se planteó dejar a los viajeros fuera.",
      "También faltaba vigilancia y se documentaron extintores con revisiones atrasadas y agujeros en el falso techo con los cables a la vista.",
    ],
  },
  {
    id: "respuesta",
    nombre: "4. El Ayuntamiento recupera la terminal",
    inicio: 80,
    fin: 110,
    frases: [
      "El Defensor del Pueblo Andaluz abrió una queja de oficio.",
      "El Ayuntamiento le remitió un informe de la concesionaria e impuso la primera sanción a Los Amarillos en 2018.",
      "En 2021, el Pleno acordó resolver el contrato por incumplimientos graves.",
      "El Consistorio cifró en al menos 131.000 euros las inversiones y mejoras comprometidas que quedaron sin ejecutar.",
      "La empresa recurrió, los tribunales avalaron la decisión del Ayuntamiento y en marzo de 2023 el Ayuntamiento recuperó la gestión pública de la estación.",
    ],
  },
  {
    id: "cambio",
    nombre: "5. El cambio",
    inicio: 110,
    fin: 135,
    frases: [
      "Mira la fachada antigua y luego la entrada actual.",
      "Dentro, fíjate en el techo, en el pavimento y en los bancos de la sala de espera.",
      "La reforma que impulsó el Ayuntamiento, con 3,46 millones de euros financiados por la Diputación de Cádiz, renovó también los aseos, las dársenas y el firme por el que circulan los autobuses.",
      "Aquel firme del que los conductores llevaban años quejándose.",
    ],
  },
  {
    id: "reapertura",
    nombre: "6. La reapertura",
    inicio: 135,
    fin: 160,
    frases: [
      "La reapertura es provisional.",
      "De momento, los billetes se compran en las casetas de fuera y para usar los aseos hay que pedir la llave durante unas semanas.",
      "Los viajeros ya pueden volver a sentarse dentro, esperar bajo techo y subir al autobús desde las dársenas renovadas.",
      "Después de tantos años de quejas, La Línea por fin tiene una estación de autobuses digna.",
    ],
  },
];

export const PRONUNCIACION: Record<string, string> = {
  "2009": "dos mil nueve",
  "2014": "dos mil catorce",
  "2015": "dos mil quince",
  "2017": "dos mil diecisiete",
  "2018": "dos mil dieciocho",
  "2021": "dos mil veintiuno",
  "2023": "dos mil veintitrés",
  "131.000": "ciento treinta y un mil",
  "3,46": "tres coma cuarenta y seis",
  PP: "pepé",
  PSOE: "pesóe",
  PA: "pe a",
  UPyD: "u pe y de",
};

/** Pausas expresivas (reportaje): el gancho respira antes de «Mira ahora la entrada». */
export const PAUSAS_ENTRE_FRASES: Record<string, number> = { gancho: 0.6, deterioro: 0.5, denuncias: 0.55, respuesta: 0.55, cambio: 0.6, reapertura: 0.6 };

export const AUDIO = {
  locucion: "estacion/locucion.mp3",
  musica: "estacion/musica.mp3",
  golpe: "encuesta/golpe.mp3",
  barrido: "encuesta/barrido.mp3",
  volumenMusica: 0.1,
  volumenEfectos: 0.3,
} as const;
