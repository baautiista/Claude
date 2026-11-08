"""Genera un .srt (máx. dos líneas por bloque) a partir de src/<video>/locucion-tiempos.json y el guion de config.ts.
Uso: python3 scripts/srt.py <video> <salida.srt>"""
import json, re, sys

video, salida = sys.argv[1], sys.argv[2]
datos = json.load(open(f"src/{video}/locucion-tiempos.json"))["frases"]
cfg = open(f"src/{video}/config.ts", encoding="utf-8").read()
bloque = cfg[cfg.index("export const ESCENAS"):]
frases = {}
for m in re.finditer(r'id: "(\w+)".*?frases: \[(.*?)\]', bloque, re.S):
    frases[m.group(1)] = re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(2))

def hms(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"

MAX_LINEA, bloques = 32, []
for escena, lista in datos.items():
    for k, f in enumerate(lista):
        palabras = frases[escena][k].split()
        tiempos = f["palabras"] if len(f["palabras"]) == len(palabras) else None
        i = 0
        while i < len(palabras):
            lineas, j = [[], []], i
            for li in range(2):
                while j < len(palabras) and len(" ".join(lineas[li] + [palabras[j]])) <= MAX_LINEA:
                    lineas[li].append(palabras[j]); j += 1
            ini = tiempos[i]["inicio"] if tiempos else f["inicio"] + (f["fin"] - f["inicio"]) * i / len(palabras)
            fin = tiempos[j - 1]["fin"] if tiempos else f["inicio"] + (f["fin"] - f["inicio"]) * j / len(palabras)
            bloques.append((ini, fin, "\n".join(" ".join(l) for l in lineas if l)))
            i = j
with open(salida, "w", encoding="utf-8") as out:
    for n, (a, b, t) in enumerate(bloques, 1):
        siguiente = bloques[n][0] if n < len(bloques) else b + 1
        out.write(f"{n}\n{hms(a)} --> {hms(min(b + 0.15, siguiente - 0.02))}\n{t}\n\n")
print(f"{len(bloques)} bloques → {salida}")
