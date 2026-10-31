# .glb 안의 노드 구조와 메시 좌표 범위를 출력 (가벼운 확인용)
import json, struct, sys, os

def info(path):
    with open(path, "rb") as f:
        f.read(12)
        ln, typ = struct.unpack("<II", f.read(8))
        js = json.loads(f.read(ln))
    print("==", os.path.basename(path))
    for i, n in enumerate(js.get("nodes", [])):
        keys = {k: n[k] for k in ("name", "mesh", "children", "rotation", "scale", "translation", "matrix") if k in n}
        print(" node", i, keys)
    acc = js.get("accessors", [])
    for mi, m in enumerate(js.get("meshes", [])):
        for p in m["primitives"]:
            a = acc[p["attributes"]["POSITION"]]
            print(" mesh", mi, "min", [round(v, 4) for v in a["min"]], "max", [round(v, 4) for v in a["max"]])

for p in sys.argv[1:]:
    info(p)
