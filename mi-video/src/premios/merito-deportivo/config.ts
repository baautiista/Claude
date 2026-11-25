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
      "Mérito Deportivo.",
      "¿Qué deportista de La Línea merece este premio?",
      "Estas son las candidaturas."
    ]
  },
  {
    "id": "n0",
    "nombre": "Alfredo Mena",
    "inicio": 8,
    "fin": 13.8,
    "frases": [
      "Alfredo Mena. Remo de mar."
    ]
  },
  {
    "id": "n1",
    "nombre": "Desi Márquez",
    "inicio": 13.8,
    "fin": 19.6,
    "frases": [
      "Desi Márquez. Taekwondo."
    ]
  },
  {
    "id": "n2",
    "nombre": "Gonzalo Herrera",
    "inicio": 19.6,
    "fin": 25.400000000000002,
    "frases": [
      "Gonzalo Herrera. Deportista de CrossFit y entrenador en Ghetto Crosstraining La Línea."
    ]
  },
  {
    "id": "n3",
    "nombre": "Raquel Retamero",
    "inicio": 25.400000000000002,
    "fin": 31.200000000000003,
    "frases": [
      "Raquel Retamero. Vela."
    ]
  },
  {
    "id": "n4",
    "nombre": "Sonia Castillo Arenillas",
    "inicio": 31.200000000000003,
    "fin": 37.0,
    "frases": [
      "Sonia Castillo Arenillas. Judo."
    ]
  },
  {
    "id": "votar",
    "nombre": "Cómo votar",
    "inicio": 37.0,
    "fin": 45.0,
    "frases": [
      "Entra en premios.infolinense.com y pulsa «Vota».",
      "Elige tu candidatura, revisa tu papeleta y confirma tu voto.",
      "Sin registrarte."
    ]
  },
  {
    "id": "cierre",
    "nombre": "Cierre",
    "inicio": 46.0,
    "fin": 51.0,
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
  "n0": 5.64,
  "n1": 5.64,
  "n2": 5.64,
  "n3": 5.64,
  "n4": 5.64
};

export const PAUSAS_ENTRE_FRASES: Record<string, number> = { categoria: 0.3, votar: 0.35, cierre: 0.45 };

/** Voz habitual de InfoLinense con algo más de ritmo para encajar en 35–50 s. */
export const AJUSTES_VOZ = { speed: 1.18 };
