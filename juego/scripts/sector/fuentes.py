"""
Descarga y estado de las fuentes cartográficas del generador de sectores.

  python3 scripts/sector/fuentes.py estado      # qué fuentes responden desde esta máquina
  python3 scripts/sector/fuentes.py overture    # edificios de Overture (S3 público) para La Línea
  python3 scripts/sector/fuentes.py catastro    # edificios INSPIRE del Catastro (WFS BU) para La Línea

Las descargas se guardan en fuentes/ y el generador las usa si existen. Ninguna fuente
se inventa: si una no está disponible, el informe del sector lo dice.
"""
import json
import os
import sys
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = os.path.join(RAIZ, "fuentes")
BBOX = (-5.385, 36.150, -5.325, 36.200)  # lon/lat de La Línea
RELEASE = "2026-09-23.1"

FUENTES = {
    "osm": ("OpenStreetMap (extracto local fuentes/la-linea.geojson)", None),
    "overture": ("Overture Maps · buildings (S3 público)", "https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&max-keys=1&prefix=release/"),
    "catastro": ("Catastro INSPIRE · WFS edificios (BU)", "https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx?service=WFS&request=GetCapabilities"),
    "catastro_atom": ("Catastro INSPIRE · ATOM municipal", "https://www.catastro.hacienda.gob.es/INSPIRE/buildings/ES.SDGC.BU.atom.xml"),
    "pnoa_lidar": ("CNIG · Centro de Descargas (PNOA LiDAR)", "https://centrodedescargas.cnig.es/CentroDescargas/"),
}


def responde(url):
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            return r.status < 400
    except Exception as e:  # noqa: BLE001
        return f"no accesible ({str(e)[:80]})"


def estado():
    out = {}
    for k, (nombre, url) in FUENTES.items():
        if url is None:
            ok = os.path.exists(os.path.join(DIR, "la-linea.geojson"))
        else:
            ok = responde(url)
        out[k] = {"nombre": nombre, "url": url, "estado": "ok" if ok is True else (ok or "no accesible")}
    out["overture"]["descargado"] = os.path.exists(os.path.join(DIR, "overture", "la-linea-buildings.parquet"))
    out["catastro"]["descargado"] = os.path.exists(os.path.join(DIR, "catastro", "la-linea-bu.gml"))
    os.makedirs(DIR, exist_ok=True)
    json.dump(out, open(os.path.join(DIR, "estado.json"), "w"), ensure_ascii=False, indent=1)
    return out


def overture():
    """Lee solo los grupos de filas cuyo bbox toca La Línea (estadísticas de Parquet)."""
    import pyarrow.compute as pc
    import pyarrow.fs as fs
    import pyarrow.parquet as pq
    from concurrent.futures import ThreadPoolExecutor

    s3 = fs.S3FileSystem(anonymous=True, region="us-west-2")
    base = f"overturemaps-us-west-2/release/{RELEASE}/theme=buildings/type=building/"
    ficheros = [f.path for f in s3.get_file_info(fs.FileSelector(base))]

    def grupos(p):
        md = pq.ParquetFile(s3.open_input_file(p)).metadata
        ix = {md.row_group(0).column(i).path_in_schema: i for i in range(md.num_columns)}
        hits = []
        for r in range(md.num_row_groups):
            st = lambda n: md.row_group(r).column(ix[n]).statistics  # noqa: E731
            if st("bbox.xmax").max >= BBOX[0] and st("bbox.xmin").min <= BBOX[2] and st("bbox.ymax").max >= BBOX[1] and st("bbox.ymin").min <= BBOX[3]:
                hits.append(r)
        return p, hits

    with ThreadPoolExecutor(32) as ex:
        sel = [(p, h) for p, h in ex.map(grupos, ficheros) if h]
    tablas = []
    for p, h in sel:
        t = pq.ParquetFile(s3.open_input_file(p)).read_row_groups(h)
        b = t.column("bbox")
        m = pc.and_(
            pc.and_(pc.greater_equal(pc.struct_field(b, "xmax"), BBOX[0]), pc.less_equal(pc.struct_field(b, "xmin"), BBOX[2])),
            pc.and_(pc.greater_equal(pc.struct_field(b, "ymax"), BBOX[1]), pc.less_equal(pc.struct_field(b, "ymin"), BBOX[3])),
        )
        tablas.append(t.filter(m))
    import pyarrow as pa

    t = pa.concat_tables(tablas)
    os.makedirs(os.path.join(DIR, "overture"), exist_ok=True)
    pq.write_table(t, os.path.join(DIR, "overture", "la-linea-buildings.parquet"))
    print("Overture:", t.num_rows, "edificios")


def catastro():
    """WFS INSPIRE BU del Catastro (EPSG:25830). Requiere acceso de red a ovc.catastro.meh.es."""
    # Recuadro de La Línea en ETRS89 / UTM 30N.
    url = (
        "https://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx?service=WFS&version=2.0.0&request=GetFeature"
        "&typeNames=BU:Building&srsName=EPSG::25830&bbox=284000,3999500,290000,4005000,EPSG::25830"
    )
    os.makedirs(os.path.join(DIR, "catastro"), exist_ok=True)
    with urllib.request.urlopen(url, timeout=120) as r:
        open(os.path.join(DIR, "catastro", "la-linea-bu.gml"), "wb").write(r.read())
    print("Catastro descargado")


if __name__ == "__main__":
    accion = sys.argv[1] if len(sys.argv) > 1 else "estado"
    if accion == "estado":
        print(json.dumps(estado(), ensure_ascii=False, indent=1))
    elif accion == "overture":
        overture()
    elif accion == "catastro":
        catastro()
