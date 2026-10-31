# 루틴랩 추천 조합 미리 계산 (boxdetail.js pack/recommend 와 같은 방식)
from itertools import permutations, combinations

ITEMS = {
    'tshirt': ('접은 티셔츠 6장', 215, 280, 200, True),
    'tuna-can': ('참치캔', 86, 86, 35, False),
    'water-2l': ('생수 500ml', 63, 63, 210, False),
    'wet-wipes': ('물티슈', 200, 115, 68, False),
    'spam-340': ('스팸', 100, 55, 85, False),
    'shin-ramyun': ('신라면', 140, 140, 38, False),
    'yukgaejang-cup': ('육개장', 145, 145, 75, True),
    'coke-355': ('콜라', 66, 66, 122, False),
    'toilet-roll': ('휴지', 115, 115, 99, False),
    'guinness-440': ('기네스', 66, 66, 150, False),
    'gochujang-1kg': ('고추장', 155, 115, 105, False),
    'cereal-box': ('시리얼', 195, 65, 280, False),
    'jin-cup-small': ('진라면컵', 100, 100, 105, True),
    'chamggae-cup-big': ('참깨컵', 142, 142, 108, True),
    'chocopie-box': ('초코파이', 295, 205, 85, False),
}
THEMES = [
    ('라면', ['shin-ramyun', 'yukgaejang-cup', 'jin-cup-small', 'chamggae-cup-big']),
    ('통조림', ['tuna-can', 'spam-340', 'gochujang-1kg']),
    ('간식', ['chocopie-box', 'cereal-box', 'tuna-can', 'spam-340']),
    ('음료', ['water-2l', 'coke-355', 'guinness-440']),
    ('생활용품', ['tshirt', 'wet-wipes', 'toilet-roll']),
]
BOXES = {'3L': (126, 340, 110), '6L': (255, 340, 110), '9L': (170, 340, 220)}


def orients(k):
    _, w, d, h, up = ITEMS[k]
    if up:
        return list({(w, h, d), (d, h, w)})
    return list(set(permutations((w, h, d))))


def pack(W, H, D, picks):
    types = sorted(picks, key=lambda k: -ITEMS[k][1] * ITEMS[k][2] * ITEMS[k][3])
    placed = []

    def fill(W, H, D, depth):
        if depth > 10 or W < 1 or H < 1 or D < 1:
            return
        t = next((k for k in types if any(o[0] <= W and o[1] <= H and o[2] <= D for o in orients(k))), None)
        if not t:
            return
        best = None
        for o in orients(t):
            if o[0] > W or o[1] > H or o[2] > D:
                continue
            nx, ny, nz = W // o[0], H // o[1], D // o[2]
            v = nx * ny * nz * o[0] * o[1] * o[2]
            if not best or v > best[0] or (v == best[0] and o[1] < best[1][1]):
                best = (v, o, nx, ny, nz)
        v, o, nx, ny, nz = best
        placed.extend([(t, o)] * (nx * ny * nz))
        bw, bh, bd = nx * o[0], ny * o[1], nz * o[2]
        fill(W - bw, H, D, depth + 1)
        fill(bw, H, D - bd, depth + 1)
        fill(bw, H - bh, bd, depth + 1)

    fill(W, H, D, 0)
    counts = {}
    for k, _ in placed:
        counts[k] = counts.get(k, 0) + 1
    vol = sum(o[0] * o[1] * o[2] for _, o in placed)
    return counts, round(vol * 100 / (W * H * D)), [k for k in picks if k not in counts]


for name, (w, d, h) in BOXES.items():
    W, D, H = w - 16, d - 16, h - 16
    out = []
    used = set()
    for tn, ids in THEMES:
        cands = []
        for n in (1, 2, 3):
            for c in combinations(ids, n):
                counts, pct, left = pack(W, H, D, list(c))
                if left or not counts or pct < 30:
                    continue
                cands.append((pct, len(c), c, counts))
        cands.sort(key=lambda x: (-x[0], -x[1]))
        best = next((x for x in cands if tuple(sorted(x[2])) not in used), None)
        if best:
            used.add(tuple(sorted(best[2])))
            out.append((best[0], tn, ' · '.join(f'{ITEMS[k][0]} {best[3][k]}' for k in best[2])))
    out.sort(reverse=True)
    print(f'{name} 안쪽 {W}x{D}x{H}')
    for p, tn, s in out[:4]:
        print(f'  {tn} {p}% : {s}')
