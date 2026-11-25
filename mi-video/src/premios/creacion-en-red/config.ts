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
      "Creación en Red.",
      "¿Qué linense ha destacado este año con sus vídeos, pódcast o publicaciones en redes?",
      "Estas son las candidaturas."
    ]
  },
  {
    "id": "n0",
    "nombre": "Aday Montes",
    "inicio": 8,
    "fin": 13.8,
    "frases": [
      "Aday Montes. Fotografía y vídeo de naturaleza."
    ]
  },
  {
    "id": "n1",
    "nombre": "Berto",
    "inicio": 13.8,
    "fin": 19.6,
    "frases": [
      "Berto. Creación digital."
    ]
  },
  {
    "id": "n2",
    "nombre": "Hippie Domaris",
    "inicio": 19.6,
    "fin": 25.400000000000002,
    "frases": [
      "Hippie Domaris. TikTok."
    ]
  },
  {
    "id": "n3",
    "nombre": "Josele Fotografía",
    "inicio": 25.400000000000002,
    "fin": 31.200000000000003,
    "frases": [
      "Josele Fotografía. Fotografía y contenido audiovisual."
    ]
  },
  {
    "id": "n4",
    "nombre": "Zequi Rojas",
    "inicio": 31.200000000000003,
    "fin": 37.0,
    "frases": [
      "Zequi Rojas. Creación digital."
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
  "n0": 5.0,
  "n1": 5.0,
  "n2": 5.0,
  "n3": 5.0,
  "n4": 5.0
};

export const PAUSAS_ENTRE_FRASES: Record<string, number> = { categoria: 0.3, votar: 0.35, cierre: 0.45 };

/** Voz habitual de InfoLinense con algo más de ritmo para encajar en 35–50 s. */
export const AJUSTES_VOZ = { speed: 1.18 };
