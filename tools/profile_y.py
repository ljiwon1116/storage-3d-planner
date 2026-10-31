# y가 위쪽인 모델의 높이별 최대 반지름 출력
import sys, math
from scan_info import load, acc

js, bin_ = load(sys.argv[1])
P = acc(js, bin_, js["meshes"][0]["primitives"][0]["attributes"]["POSITION"])
cx = (min(p[0] for p in P) + max(p[0] for p in P)) / 2
cz = (min(p[2] for p in P) + max(p[2] for p in P)) / 2
ys = [p[1] for p in P]; lo, hi = min(ys), max(ys)
B = 24
mr = [0.0] * B; cnt = [0] * B
for p in P:
    k = min(B - 1, int((p[1] - lo) / (hi - lo) * B))
    mr[k] = max(mr[k], math.hypot(p[0] - cx, p[2] - cz)); cnt[k] += 1
for k in range(B):
    print(f"y {lo + (hi - lo) * k / B:.4f}  maxR {mr[k]:.4f}  n {cnt[k]}")
print("verts", len(P))
