# 스캔한 육개장 모델에서 그릇 밖(바닥·탁자)을 지우고 새 .glb로 저장 (numpy 없이)
import json, struct, sys, math, os, shutil
from scan_info import load, acc

SRC = sys.argv[1]
CX, CY = float(sys.argv[2]), float(sys.argv[3])   # 그릇 가운데 (모델 좌표)
R_RIM = float(sys.argv[4])                        # 테두리 반지름
R_BASE = float(sys.argv[5])                       # 바닥 반지름
Z_FLOOR = float(sys.argv[6])                      # 이 높이 아래 + 바닥 반지름 밖 = 탁자

js, bin_ = load(SRC)
prim = js["meshes"][0]["primitives"][0]
A = prim["attributes"]
P = acc(js, bin_, A["POSITION"])
N = acc(js, bin_, A["NORMAL"]) if "NORMAL" in A else None
T = acc(js, bin_, A["TEXCOORD_0"]) if "TEXCOORD_0" in A else None
I = [v[0] for v in acc(js, bin_, prim["indices"])]

def r(p): return math.hypot(p[0] - CX, p[1] - CY)

keep = []
for k in range(0, len(I), 3):
    tri = I[k:k + 3]
    ps = [P[i] for i in tri]
    if max(r(p) for p in ps) > R_RIM:
        continue
    if max(p[2] for p in ps) < Z_FLOOR and sum(r(p) for p in ps) / 3 > R_BASE:
        continue
    keep.append(tri)

used = sorted({i for t in keep for i in t})
remap = {o: n for n, o in enumerate(used)}
print("tris", len(I) // 3, "->", len(keep), " verts", len(P), "->", len(used))

# ---- 새 버퍼 만들기 ----
out = bytearray()
views, new_acc = [], {}

def pad4():
    while len(out) % 4: out.append(0)

def add_view(data, target=None):
    pad4()
    v = {"buffer": 0, "byteOffset": len(out), "byteLength": len(data)}
    if target: v["target"] = target
    out.extend(data)
    views.append(v)
    return len(views) - 1

def add_vec(rows, n, key):
    data = b"".join(struct.pack("<" + "f" * n, *row) for row in rows)
    a = {"bufferView": add_view(data, 34962), "componentType": 5126, "count": len(rows), "type": {2: "VEC2", 3: "VEC3"}[n]}
    if key == "POSITION":
        a["min"] = [min(rw[c] for rw in rows) for c in range(3)]
        a["max"] = [max(rw[c] for rw in rows) for c in range(3)]
    return a

accs = []
attrs = {}
for key, src, n in (("POSITION", P, 3), ("NORMAL", N, 3), ("TEXCOORD_0", T, 2)):
    if src is None: continue
    accs.append(add_vec([src[o] for o in used], n, key))
    attrs[key] = len(accs) - 1
idx = [remap[i] for t in keep for i in t]
accs.append({"bufferView": add_view(struct.pack("<" + "I" * len(idx), *idx), 34963), "componentType": 5125, "count": len(idx), "type": "SCALAR"})
idx_acc = len(accs) - 1

# 그림(텍스처) 데이터 옮기기
for img in js.get("images", []):
    if "bufferView" in img:
        bv = js["bufferViews"][img["bufferView"]]
        o = bv.get("byteOffset", 0)
        img["bufferView"] = add_view(bin_[o:o + bv["byteLength"]])
pad4()

prim["attributes"] = attrs
prim["indices"] = idx_acc
js["meshes"][0]["primitives"] = [prim]
js["accessors"] = accs
js["bufferViews"] = views
js["buffers"] = [{"byteLength": len(out)}]

j = json.dumps(js, separators=(",", ":")).encode()
j += b" " * ((4 - len(j) % 4) % 4)
total = 12 + 8 + len(j) + 8 + len(out)
bak = os.path.join(os.path.dirname(SRC), "_original")
os.makedirs(bak, exist_ok=True)
if not os.path.exists(os.path.join(bak, os.path.basename(SRC))):
    shutil.copy2(SRC, os.path.join(bak, os.path.basename(SRC)))
with open(SRC, "wb") as f:
    f.write(struct.pack("<III", 0x46546C67, 2, total))
    f.write(struct.pack("<II", len(j), 0x4E4F534A)); f.write(j)
    f.write(struct.pack("<II", len(out), 0x004E4942)); f.write(out)
xs = [P[o][0] for o in used]; ys = [P[o][1] for o in used]
print("footprint", round(max(xs) - min(xs), 4), "x", round(max(ys) - min(ys), 4), " size KB", total // 1024)
