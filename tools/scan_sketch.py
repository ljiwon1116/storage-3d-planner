# .glb 점들을 위·옆에서 본 그림으로 저장 (눈 확인용)
import sys, os
from PIL import Image, ImageDraw
from scan_info import load, acc

js, bin_ = load(sys.argv[1])
P = acc(js, bin_, js["meshes"][0]["primitives"][0]["attributes"]["POSITION"])
S = 400
img = Image.new("RGB", (S * 2 + 20, S), "white")
d = ImageDraw.Draw(img)
mn = [min(p[c] for p in P) for c in range(3)]
mx = [max(p[c] for p in P) for c in range(3)]
span = max(mx[c] - mn[c] for c in range(3))
def m(v, c): return int((v - mn[c]) / span * (S - 20)) + 10
for p in P:
    d.point((m(p[0], 0), S - m(p[1], 1)), fill=(60, 60, 60))           # 위에서 (x, y)
    d.point((S + 20 + m(p[0], 0), S - m(p[2], 2)), fill=(150, 60, 40))  # 옆에서 (x, z)
out = os.path.join(os.environ.get("KIROCREW_SCRATCH", "."), "scan_check.png")
img.save(out)
print(out)
