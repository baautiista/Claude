"""Exporta los datos oficiales de los Premios InfoLinense 2026 para los vídeos.

Uso: python3 -I scripts/premios-datos.py <ruta al repositorio premios-infolinense>

Reconstruye la base de datos aplicando las migraciones del repositorio (la misma que usa la web)
y escribe src/premios/datos.json y una carpeta src/premios/<slug>/ por categoría con votación,
con su config.ts (para `npm run locucion -- premios/<slug>`).
Solo candidaturas publicadas y no suplentes. Orden alfabético dentro de cada categoría (neutral).
"""
import glob, json, os, sqlite3, sys, unicodedata

repo = [a for a in sys.argv[1:] if not a.startswith("--")][0]
db = sqlite3.connect(":memory:")
db.row_factory = sqlite3.Row
for f in sorted(glob.glob(os.path.join(repo, "migrations", "*.sql"))):
    db.executescript(open(f, encoding="utf-8").read())

def clave(s):
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()

categorias = []
for c in db.execute("select * from categories where published = 1 and votable = 1 order by position"):
    nominados = [dict(n) for n in db.execute(
        "select * from nominees where category_id = ? and published = 1 and is_alternate = 0", (c["id"],))]
    nominados.sort(key=lambda n: clave(n["name"]))
    categorias.append({
        "slug": c["slug"], "nombre": c["name"], "titulo": c["award_title"], "pregunta": c["question"],
        "descripcion": c["description"], "nota": c["nomination_note"], "color": c["color"], "tinta": c["ink"],
        "nominados": [{
            "slug": n["slug"], "nombre": n["name"], "subtitulo": n["subtitle"], "motivo": n["reason"],
            "meritos": [m.strip() for m in (n["merits"] or "").split("\n") if m.strip()],
            "foto": n["photo_portrait"], "credito": n["photo_credit"],
        } for n in nominados],
    })

base = os.path.join(os.path.dirname(__file__), "..", "src", "premios")
json.dump({"edicion": 2026, "web": "premios.infolinense.com", "categorias": categorias},
          open(os.path.join(base, "datos.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
WEB = "premios.infolinense.com"
SEGUNDOS_CANDIDATURA = 5.8
PRONUNCIACION = {
    "InfoLinense": "Info Linense", WEB: "premios punto infolinense punto com", "2026": "dos mil veintiséis",
    "1996": "mil novecientos noventa y seis", "ACALI": "Acali", "AFAL": "Afal", "IES": "i e ese", "JD": "jota de",
    "(Neme)": "Neme", "STEM": "Stem",
}

def ambito(n):
    return (n["subtitulo"] or "").split("·")[0].strip()

def lema(c):
    if c["pregunta"]:
        return c["pregunta"]
    return (c["descripcion"] or "").replace("Cuatro candidaturas que reconocen", "Reconoce").strip()

def ranura(c):
    """Tiempo idéntico para todas las candidaturas de la categoría: el de la locución más larga + margen.
    Con --igualar se mide sobre la locución ya generada; si no, se conserva el valor actual del config.ts
    (para no desajustarlo de la locución existente) o, en una categoría nueva, el mínimo."""
    if "--igualar" not in sys.argv:
        actual = os.path.join(base, c["slug"], "config.ts")
        if os.path.exists(actual):
            import re
            m = re.search(r'"n0": ([0-9.]+)', open(actual).read())
            if m:
                return float(m.group(1))
        return 4.0
    t = json.load(open(os.path.join(base, c["slug"], "locucion-tiempos.json")))["frases"]
    largos = [t[f"n{i}"][-1]["fin"] - t[f"n{i}"][0]["inicio"] for i in range(len(c["nominados"]))]
    return round(max(5.0, max(largos) + 0.9), 2)

def guion(c):
    """Misma frase para todas las candidaturas: nombre y ámbito (primer tramo del subtítulo oficial)."""
    escenas = [{"id": "apertura", "nombre": "Apertura", "inicio": 0, "fin": 3, "frases": ["Premios InfoLinense 2026."]},
               {"id": "categoria", "nombre": "Categoría", "inicio": 3, "fin": 8, "frases": [c["nombre"] + ".", lema(c), "Estas son las candidaturas."]}]
    t = 8
    for i, n in enumerate(c["nominados"]):
        escenas.append({"id": f"n{i}", "nombre": n["nombre"], "inicio": t, "fin": t + SEGUNDOS_CANDIDATURA, "frases": [f'{n["nombre"]}. {ambito(n)}.']})
        t += SEGUNDOS_CANDIDATURA
    escenas.append({"id": "votar", "nombre": "Cómo votar", "inicio": t, "fin": t + 8, "frases": [
        f"Entra en {WEB} y pulsa «Vota».",
        "Elige tu candidatura, revisa tu papeleta y confirma tu voto.",
        "Sin registrarte."]})
    escenas.append({"id": "cierre", "nombre": "Cierre", "inicio": t + 9, "fin": t + 14, "frases": [
        "El talento es linense. La decisión es tuya.", "Vota en los Premios InfoLinense 2026."]})
    minimas = {"apertura": 2.6, **{f"n{i}": ranura(c) for i in range(len(c["nominados"]))}}
    return escenas, minimas

J = lambda x: json.dumps(x, ensure_ascii=False, indent=2)
for c in categorias:
    d = os.path.join(base, c["slug"])
    os.makedirs(d, exist_ok=True)
    escenas, minimas = guion(c)
    open(os.path.join(d, "config.ts"), "w", encoding="utf-8").write(
        "/** Generado por scripts/premios-datos.py a partir de los datos oficiales. No editar a mano. */\n"
        f"export const ESCENAS = {J(escenas)};\n\n"
        f"export const PRONUNCIACION: Record<string, string> = {J(PRONUNCIACION)};\n\n"
        f"export const DURACION_MINIMA_ESCENA: Record<string, number> = {J(minimas)};\n\n"
        'export const PAUSAS_ENTRE_FRASES: Record<string, number> = { categoria: 0.3, votar: 0.35, cierre: 0.45 };\n\n'
        '/** Voz habitual de InfoLinense con algo más de ritmo para encajar en 35–50 s. */\n'
        'export const AJUSTES_VOZ = { speed: 1.18 };\n')
    t = os.path.join(d, "locucion-tiempos.json")
    if not os.path.exists(t):
        open(t, "w").write('{ "frases": null }\n')
def camel(slug):
    return "".join(p.capitalize() for p in slug.split("-"))
indice = ["/** Generado por scripts/premios-datos.py: tiempos de locución de cada categoría. */",
          'import type { DatosLocucion } from "../marca/guion";']
for c in categorias:
    indice.append(f'import {camel(c["slug"])} from "./{c["slug"]}/locucion-tiempos.json";')
    indice.append(f'import {{ ESCENAS as E{camel(c["slug"])} }} from "./{c["slug"]}/config";')
indice.append("\nexport const TIEMPOS_LOCUCION: Record<string, DatosLocucion> = {")
for c in categorias:
    indice.append(f'  "{c["slug"]}": {camel(c["slug"])} as DatosLocucion,')
indice.append("};\n")
indice.append("export const GUIONES: Record<string, { id: string; nombre: string; inicio: number; fin: number; frases: string[] }[]> = {")
for c in categorias:
    indice.append(f'  "{c["slug"]}": E{camel(c["slug"])},')
indice.append("};\n")
open(os.path.join(base, "tiempos-locucion.ts"), "w").write("\n".join(indice))
print(len(categorias), "categorías:", ", ".join(f'{c["nombre"]} ({len(c["nominados"])})' for c in categorias))
