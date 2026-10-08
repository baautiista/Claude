/** Utilidades mínimas de DOM (sin framework). */

type Hijo = Node | string | number | null | undefined | false;
type Atributos = Record<string, string | number | boolean | ((ev: Event) => void) | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Atributos = {}, ...hijos: Hijo[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === "function") el.addEventListener(k.replace(/^on/, "").toLowerCase(), v);
    else if (k === "html") el.innerHTML = String(v);
    else if (k === "class") el.className = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of hijos) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

/** Inserta un fragmento HTML de confianza (iconos y retratos generados aquí). */
export const html = (s: string) => {
  const t = document.createElement("template");
  t.innerHTML = s.trim();
  return t.content.firstChild as HTMLElement;
};

/** Escapa texto del jugador (su nombre) antes de meterlo en HTML. */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
