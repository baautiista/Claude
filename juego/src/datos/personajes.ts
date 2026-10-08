import type { BarrioId, LugarId } from "./mapa";

/** Vecinos de «Mi Línea». Personajes ficticios: cualquier parecido es cariño. */

export type PersonajeId = "carmen" | "lola" | "juani" | "antonio" | "rafa" | "marta" | "andres";

export interface Personaje {
  nombre: string;
  rol: string;
  lugar: LugarId;
  barrio: BarrioId;
  /** Retrato: piel, pelo, ropa. */
  piel: string;
  pelo: string;
  ropa: string;
  canas?: boolean;
  /** Charlas del día a día (una al día sube la amistad). */
  charlas: readonly string[];
}

export const PERSONAJES: Record<PersonajeId, Personaje> = {
  carmen: {
    nombre: "Carmen", rol: "Vecina de tu abuela", lugar: "casa", barrio: "sanBernardo",
    piel: "#E8B796", pelo: "#BFBFBF", ropa: "#7A4FB0", canas: true,
    charlas: [
      "Tu abuela regaba la higuera a las ocho en punto. Ni un minuto más tarde.",
      "Si sopla levante, tiende dentro, que se te vuela hasta la pinza.",
      "En este barrio nos conocemos todos. Para lo bueno y para lo otro.",
      "¿Has comido? Que te veo con cara de no haber comido.",
    ],
  },
  lola: {
    nombre: "Lola", rol: "Dueña del bar de la Calle Real", lugar: "bar", barrio: "centro",
    piel: "#D9A07A", pelo: "#2B1B12", ropa: "#FF1254",
    charlas: [
      "Aquí se entera una de todo antes que el periódico. Sin ofender a InfoLinense.",
      "Las tortillitas, finas finas, que se vea el camarón.",
      "Los lunes esto es un velatorio si la Balona pierde el domingo.",
      "Siéntate un rato, que hoy vas con mucha prisa.",
    ],
  },
  juani: {
    nombre: "Juani", rol: "Tendera del Mercado", lugar: "mercado", barrio: "centro",
    piel: "#F0C3A0", pelo: "#8A4B2A", ropa: "#1F5EFF",
    charlas: [
      "Cuarenta años en este mercado. He visto pasar de todo, menos dinero.",
      "La harina, de la buena. Que luego las tortillitas se te rompen.",
      "El puesto de tu abuela era el más alegre del mercado. Cantaba coplas.",
      "Hoy el pescado ha venido bonito. Será que ha soplado poniente.",
    ],
  },
  antonio: {
    nombre: "Antonio", rol: "Patrón de barca en La Atunara", lugar: "atunara", barrio: "atunara",
    piel: "#B97A55", pelo: "#E5E5E5", ropa: "#2B2D31", canas: true,
    charlas: [
      "El mar no se pelea, se escucha. Con levante fuerte, a tierra y a remendar.",
      "Mi padre ya pescaba aquí. Y su padre. Mi hijo… ya veremos.",
      "La Atunara no es un barrio, es una familia muy grande que discute mucho.",
      "Si ves la nube en el Peñón, ya sabes lo que viene.",
    ],
  },
  rafa: {
    nombre: "Rafa", rol: "Hortelano del Zabal", lugar: "huerta", barrio: "zabal",
    piel: "#C98E66", pelo: "#3A2A1E", ropa: "#C4E910",
    charlas: [
      "Con poniente, la huerta respira. Con levante, hay que estar encima.",
      "El tomate del Zabal sabe a tomate. Eso ya no se encuentra.",
      "Me han ofrecido comprar la huerta tres veces este año. Tres.",
      "El pulgón no descansa. Yo tampoco.",
    ],
  },
  marta: {
    nombre: "Marta", rol: "Redactora jefa de InfoLinense", lugar: "redaccion", barrio: "centro",
    piel: "#EAC1A1", pelo: "#151515", ropa: "#1F5EFF",
    charlas: [
      "Una noticia sin contrastar no es una noticia. Es un rumor con titular.",
      "Lo local también es importante. A veces, lo más importante.",
      "Si algo no se entiende sin sonido, no está bien contado.",
      "Dato, contexto, explicación. En ese orden.",
    ],
  },
  andres: {
    nombre: "Andrés", rol: "Jubilado, trabajó en Gibraltar", lugar: "frontera", barrio: "centro",
    piel: "#D4A27E", pelo: "#F2F2F2", ropa: "#5A6B7D", canas: true,
    charlas: [
      "Yo crucé esa Verja todos los días durante veinte años. Hasta que no se pudo.",
      "Los llanitos y nosotros somos primos. A veces primos que no se hablan.",
      "La cola de hoy no es nada. Tenías que haber visto la de los ochenta.",
      "Siéntate, que el banco es de todos.",
    ],
  },
};
