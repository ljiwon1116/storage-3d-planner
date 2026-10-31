# y가 위쪽인 모델에서 cut 아래 점을 cut 높이로 눌러 바닥을 평평하게 (원본은 _original/ 에 백업)
import sys, struct, os, shutil
from scan_info import load

SRC, CUT = sys.argv[1], float(sys.argv[2])
raw = open(SRC, "rb").read()
js, _ = load(SRC)
jl = struct.unpack_from("<I", raw, 12)[0]
binstart = 20 + jl + 8
data = bytearray(raw)
prim = js["meshes"][0]["primitives"][0]

def view(ai):
    a = js["accessors"][ai]; bv = js["bufferViews"][a["bufferView"]]
    start = binstart + bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    return a, start, bv.get("byteStride", 0) or 12

pa, ps, pst = view(prim["attributes"]["POSITION"])
na = prim["attributes"].get("NORMAL")
if na is not None: _, ns, nst = view(na)
n = 0
for k in range(pa["count"]):
    o = ps + k * pst
    x, y, z = struct.unpack_from("<fff", data, o)
    if y < CUT:
        struct.pack_into("<fff", data, o, x, CUT, z)
        if na is not None:
            struct.pack_into("<fff", data, ns + k * nst, 0.0, -1.0, 0.0)
        n += 1
print("flattened verts", n)

# min 값 고치기 (JSON 길이가 바뀌지 않게 같은 자리 숫자만 교체)
pa["min"][1] = CUT
newj = __import__("json").dumps(js, separators=(",", ":")).encode()
oldj = raw[20:20 + jl]
bak = os.path.join(os.path.dirname(SRC), "_original")
os.makedirs(bak, exist_ok=True)
if not os.path.exists(os.path.join(bak, os.path.basename(SRC))):
    shutil.copy2(SRC, os.path.join(bak, os.path.basename(SRC)))
if len(newj) <= jl:
    newj += b" " * (jl - len(newj))
    data[20:20 + jl] = newj
else:
    print("json grew; min left as is (three.js recomputes bounds)")
open(SRC, "wb").write(data)
print("saved")
