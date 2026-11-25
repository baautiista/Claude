/** Generado por scripts/premios-datos.py: tiempos de locución de cada categoría. */
import type { DatosLocucion } from "../marca/guion";
import MeritoDeportivo from "./merito-deportivo/locucion-tiempos.json";
import { ESCENAS as EMeritoDeportivo } from "./merito-deportivo/config";
import TalentoEmprendedor from "./talento-emprendedor/locucion-tiempos.json";
import { ESCENAS as ETalentoEmprendedor } from "./talento-emprendedor/config";
import ComercioAPieDeCalle from "./comercio-a-pie-de-calle/locucion-tiempos.json";
import { ESCENAS as EComercioAPieDeCalle } from "./comercio-a-pie-de-calle/config";
import ArteConFirma from "./arte-con-firma/locucion-tiempos.json";
import { ESCENAS as EArteConFirma } from "./arte-con-firma/config";
import CreacionEnRed from "./creacion-en-red/locucion-tiempos.json";
import { ESCENAS as ECreacionEnRed } from "./creacion-en-red/config";
import VocacionEducativa from "./vocacion-educativa/locucion-tiempos.json";
import { ESCENAS as EVocacionEducativa } from "./vocacion-educativa/config";
import VidaAsociativa from "./vida-asociativa/locucion-tiempos.json";
import { ESCENAS as EVidaAsociativa } from "./vida-asociativa/config";
import AccionDeBarrio from "./accion-de-barrio/locucion-tiempos.json";
import { ESCENAS as EAccionDeBarrio } from "./accion-de-barrio/config";
import CarnavalLinense from "./carnaval-linense/locucion-tiempos.json";
import { ESCENAS as ECarnavalLinense } from "./carnaval-linense/config";
import VocacionCofrade from "./vocacion-cofrade/locucion-tiempos.json";
import { ESCENAS as EVocacionCofrade } from "./vocacion-cofrade/config";
import ImpulsoCofrade from "./impulso-cofrade/locucion-tiempos.json";
import { ESCENAS as EImpulsoCofrade } from "./impulso-cofrade/config";

export const TIEMPOS_LOCUCION: Record<string, DatosLocucion> = {
  "merito-deportivo": MeritoDeportivo as DatosLocucion,
  "talento-emprendedor": TalentoEmprendedor as DatosLocucion,
  "comercio-a-pie-de-calle": ComercioAPieDeCalle as DatosLocucion,
  "arte-con-firma": ArteConFirma as DatosLocucion,
  "creacion-en-red": CreacionEnRed as DatosLocucion,
  "vocacion-educativa": VocacionEducativa as DatosLocucion,
  "vida-asociativa": VidaAsociativa as DatosLocucion,
  "accion-de-barrio": AccionDeBarrio as DatosLocucion,
  "carnaval-linense": CarnavalLinense as DatosLocucion,
  "vocacion-cofrade": VocacionCofrade as DatosLocucion,
  "impulso-cofrade": ImpulsoCofrade as DatosLocucion,
};

export const GUIONES: Record<string, { id: string; nombre: string; inicio: number; fin: number; frases: string[] }[]> = {
  "merito-deportivo": EMeritoDeportivo,
  "talento-emprendedor": ETalentoEmprendedor,
  "comercio-a-pie-de-calle": EComercioAPieDeCalle,
  "arte-con-firma": EArteConFirma,
  "creacion-en-red": ECreacionEnRed,
  "vocacion-educativa": EVocacionEducativa,
  "vida-asociativa": EVidaAsociativa,
  "accion-de-barrio": EAccionDeBarrio,
  "carnaval-linense": ECarnavalLinense,
  "vocacion-cofrade": EVocacionCofrade,
  "impulso-cofrade": EImpulsoCofrade,
};
