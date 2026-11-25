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
      "Vocación Educativa.",
      "¿Qué docente o centro educativo de La Línea merece un premio por su labor este año?",
      "Estas son las candidaturas."
    ]
  },
  {
    "id": "n0",
    "nombre": "Academia La Fuente",
    "inicio": 8,
    "fin": 13.8,
    "frases": [
      "Academia La Fuente. Refuerzo educativo."
    ]
  },
  {
    "id": "n1",
    "nombre": "IES Tolosa",
    "inicio": 13.8,
    "fin": 19.6,
    "frases": [
      "IES Tolosa. Proyecto de ingeniería y tecnología."
    ]
  },
  {
    "id": "n2",
    "nombre": "Nemesio Andrades Rodríguez (Neme)",
    "inicio": 19.6,
    "fin": 25.400000000000002,
    "frases": [
      "Nemesio Andrades Rodríguez (Neme). Maestro de Educación Infantil."
    ]
  },
  {
    "id": "n3",
    "nombre": "Noelia Valle Ruiz — Ni de Venus ni de Marte",
    "inicio": 25.400000000000002,
    "fin": 31.200000000000003,
    "frases": [
      "Noelia Valle Ruiz. Maestra, psicopedagoga y especialista en altas capacidades intelectuales."
    ]
  },
  {
    "id": "n4",
    "nombre": "Nuria Viñas Martínez — Centro de Formación V&G",
    "inicio": 31.200000000000003,
    "fin": 37.0,
    "frases": [
      "Nuria Viñas Martínez. Docente y emprendedora educativa."
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
  "n0": 6.19,
  "n1": 6.19,
  "n2": 6.19,
  "n3": 6.19,
  "n4": 6.19
};

export const PAUSAS_ENTRE_FRASES: Record<string, number> = { categoria: 0.3, votar: 0.35, cierre: 0.45 };

/** Voz habitual de InfoLinense con algo más de ritmo para encajar en 35–50 s. */
export const AJUSTES_VOZ = { speed: 1.18 };
