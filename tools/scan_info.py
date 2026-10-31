# 스캔 모델 분석 (numpy 없이): 높이 분포와 그릇 위치 추정
import json, struct, sys, math

CT = {5126: ("f", 4), 5125: ("I", 4), 5123: ("H", 2), 5121: ("B", 1)}
NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}

def load(path):
    b = open(path, "rb").read()
    jl = struct.unpack_from("<I", b, 12)[0]
    js = json.loads(b[20:20 + jl])
    off = 20 + jl
    bl = struct.unpack_from("<I", b, off)[0]
    return js, b[off + 8: off + 8 + bl]

def acc(js, bin_, i):
    a = js["accessors"][i]
    bv = js["bufferViews"][a["bufferView"]]
    f, sz = CT[a["componentType"]]
    n = NC[a["type"]]
    start = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = bv.get("byteStride", 0) or sz * n
    fmt = "<" + f * n
    return [struct.unpack_from(fmt, bin_, start + k * stride) for k in range(a["count"])]

def pct(vals, q):
    s = sorted(vals)
    return s[min(len(s) - 1, int(len(s) * q / 100))]

if __name__ == "__main__":
    js, bin_ = load(sys.argv[1])
    prim = js["meshes"][0]["primitives"][0]
    print("attrs", prim["attributes"], "idx", prim.get("indices"), "mat", prim.get("material"), "prims", len(js["meshes"][0]["primitives"]))
    P = acc(js, bin_, prim["attributes"]["POSITION"])
    print("verts", len(P))
    zs = [p[2] for p in P]
    lo, hi_ = min(zs), max(zs)
    bins = [0] * 15
    for z in zs:
        bins[min(14, int((z - lo) / (hi_ - lo) * 15))] += 1
    for k, c in enumerate(bins):
        print(f" z {lo + (hi_ - lo) * k / 15:.4f}: {c}")
    zt = pct(zs, 70)
    hi = [p for p in P if p[2] > zt]
    cx = sum(p[0] for p in hi) / len(hi); cy = sum(p[1] for p in hi) / len(hi)
    print("high centroid", round(cx, 4), round(cy, 4))
    r = [math.hypot(p[0] - cx, p[1] - cy) for p in P]
    print(" r pct", [(q, round(pct(r, q), 4)) for q in (50, 80, 90, 95, 98, 100)])
    rh = [math.hypot(p[0] - cx, p[1] - cy) for p in hi]
    print(" high r pct 95/99", round(pct(rh, 95), 4), round(pct(rh, 99), 4))
    print(" high x", round(min(p[0] for p in hi), 4), round(max(p[0] for p in hi), 4), " high y", round(min(p[1] for p in hi), 4), round(max(p[1] for p in hi), 4))
    # 바닥 근처 점들의 퍼짐
    low = [p for p in P if p[2] < lo + (hi_ - lo) * 0.15]
    print(" low count", len(low), " low r pct 50/90", round(pct([math.hypot(p[0]-cx, p[1]-cy) for p in low], 50), 4), round(pct([math.hypot(p[0]-cx, p[1]-cy) for p in low], 90), 4))
