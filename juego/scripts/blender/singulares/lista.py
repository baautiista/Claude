"""Lista de singulares a modelar: ids OSM comprobados a mano contra el catálogo, con huella,
caras, plantas del Catastro (INSPIRE BU) cuando las hay. Escribe city-reconstruction/blender/singulares/lista.json"""
import glob, json, os, sys
RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.join(RAIZ, "scripts", "exploracion"))
import explorar as X  # noqa: E402
L0, A0, KX, KY = -5.3762, 36.2005, 89842, 110950
# id → (arquetipo, categoría del catálogo)
IDS = {
    "B-w692428477": ("iglesia", "Iglesias y templos"), "B-w720874799": ("iglesia", "Iglesias y templos"),
    "B-w1220983272": ("iglesia", "Iglesias y templos"), "B-w1327914034": ("iglesia", "Iglesias y templos"),
    "B-w1354218026": ("iglesia", "Iglesias y templos"), "B-w1347193501": ("iglesia", "Iglesias y templos"),
    "B-w1333188073": ("ermita", "Iglesias y templos"), "B-w1087131240": ("hermandad", "Iglesias y templos"),
    "B-w1327914038": ("hermandad", "Iglesias y templos"), "B-w1347199960": ("hermandad", "Iglesias y templos"),
    "B-w1296318896": ("equipamiento", "Iglesias y templos"),
    "B-w108197586": ("palacio", "Edificios públicos"), "B-w42896656": ("estacion", "Edificios públicos"),
    "B-w257431096": ("equipamiento", "Edificios públicos"), "B-w720862894": ("equipamiento", "Edificios públicos"),
    "B-w719422967": ("equipamiento", "Edificios públicos"), "B-w1153373360": ("equipamiento", "Edificios públicos"),
    "B-w1475236311": ("equipamiento", "Edificios públicos"), "B-w877660201": ("residencia", "Edificios públicos"),
    "B-w1259462253": ("residencia", "Edificios públicos"), "B-w1267129653": ("residencia", "Edificios públicos"),
    "B-w877660200": ("equipamiento", "Cultura y sociedades"), "B-w297237751": ("teatro", "Cultura y sociedades"),
    "B-w1329606844": ("mercado", "Cultura y sociedades"),
    "B-w1387264327": ("villa", "Patrimonio histórico"), "B-w1247820568": ("villa", "Patrimonio histórico"),
    "B-w1220988670": ("bunker", "Patrimonio histórico"), "B-w769139281": ("bunker", "Patrimonio histórico"),
    "B-w257433026": ("pabellon", "Deporte"),
}
eds = {}
for f in glob.glob(os.path.join(RAIZ, "public/ciudad/teselas/*.json")):
    for e in json.load(open(f))["edificios"]:
        if e["id"] in IDS:
            eds[e["id"]] = e
out = []
for i, (eid, (arq, cat)) in enumerate(IDS.items()):
    e = eds[eid]
    xs = [p[0] for p in e["huella"]]; ys = [p[1] for p in e["huella"]]
    bb = [L0 + (min(xs) - 5) / KX, A0 - (max(ys) + 5) / KY, L0 + (max(xs) + 5) / KX, A0 - (min(ys) - 5) / KY]
    cat_pl = None
    cache = os.path.join(RAIZ, "city-reconstruction/exploracion/cache", f"catastro-bu-sing-{eid}.json")
    try:
        if "--sin-catastro" in sys.argv and not os.path.exists(cache):
            raise RuntimeError("sin consultar")
        _, partes = X.fuente_catastro(f"sing-{eid}", bb)
        r = X.plantas_catastro({"datos": json.dumps({"huella": e["huella"]})}, partes)
        cat_pl = r[0] if r else None
    except Exception as ex:  # noqa: BLE001
        print("catastro", eid, ex)
    out.append({"id": eid, "nombre": e["nombre"], "arquetipo": arq, "categoria": cat, "huella": e["huella"], "patios": e.get("patios") or [],
                "caras": e["caras"], "area": e["area"], "plantas_estimadas": e["plantas"], "plantas_catastro": cat_pl, "barrio": e.get("barrio")})
    print(eid, e["nombre"], arq, "catastro:", cat_pl, "estimadas:", e["plantas"])
json.dump(out, open(os.path.join(RAIZ, "city-reconstruction/blender/singulares/lista.json"), "w"), ensure_ascii=False, indent=1)
