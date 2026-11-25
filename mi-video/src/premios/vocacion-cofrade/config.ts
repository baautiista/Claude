/** Generado por scripts/premios-datos.py a partir de los datos oficiales. No editar a mano. */
export const ESCENAS = [
  {
    "id": "apertura",
    "nombre": "Apertura",
    "inicio": 0,
    "fin": 3,
    "frases": [
      "Premios InfoLinense 2026."
    ]
  },
  {
    "id": "categoria",
    "nombre": "Categoría",
    "inicio": 3,
    "fin": 8,
    "frases": [
      "Vocación Cofrade.",
      "¿Qué persona o trayectoria del mundo cofrade de La Línea merece este premio?",
      "Estas son las candidaturas."
    ]
  },
  {
    "id": "n0",
    "nombre": "Antonia Gil Muñoz",
    "inicio": 8,
    "fin": 13.8,
    "frases": [
      "Antonia Gil Muñoz. Bordadora, pregonera y directora de talleres de bordado cofrade."
    ]
  },
  {
    "id": "n1",
    "nombre": "Ernesto Frigolet y Pepe Guzmán",
    "inicio": 13.8,
    "fin": 19.6,
    "frases": [
      "Ernesto Frigolet y Pepe Guzmán. Capataces de la Sagrada Flagelación desde 1996."
    ]
  },
  {
    "id": "n2",
    "nombre": "Josema Sánchez Bautista",
    "inicio": 19.6,
    "fin": 25.400000000000002,
    "frases": [
      "Josema Sánchez Bautista. Vestidor de imágenes religiosas y divulgador de la cultura cofrade."
    ]
  },
  {
    "id": "votar",
    "nombre": "Cómo votar",
    "inicio": 25.400000000000002,
    "fin": 33.400000000000006,
    "frases": [
      "Entra en premios.infolinense.com y pulsa «Vota».",
      "Elige tu candidatura, revisa tu papeleta y confirma tu voto.",
      "Sin registrarte."
    ]
  },
  {
    "id": "cierre",
    "nombre": "Cierre",
    "inicio": 34.400000000000006,
    "fin": 39.400000000000006,
    "frases": [
      "El talento es linense. La decisión es tuya.",
      "Vota en los Premios InfoLinense 2026."
    ]
  }
];

export const PRONUNCIACION: Record<string, string> = {
  "InfoLinense": "Info Linense",
  "premios.infolinense.com": "premios punto infolinense punto com",
  "2026": "dos mil veintiséis",
  "1996": "mil novecientos noventa y seis",
  "ACALI": "Acali",
  "AFAL": "Afal",
  "IES": "i e ese",
  "JD": "jota de",
  "(Neme)": "Neme",
  "STEM": "Stem"
};

export const DURACION_MINIMA_ESCENA: Record<string, number> = {
  "apertura": 2.6,
  "n0": 7.31,
  "n1": 7.31,
  "n2": 7.31
};

export const PAUSAS_ENTRE_FRASES: Record<string, number> = { categoria: 0.3, votar: 0.35, cierre: 0.45 };

/** Voz habitual de InfoLinense con algo más de ritmo para encajar en 35–50 s. */
export const AJUSTES_VOZ = { speed: 1.18 };
