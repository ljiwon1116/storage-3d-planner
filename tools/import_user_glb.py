# 사용자가 받은 .glb 파일을 앱 모델 폴더로 복사 (기존 블렌더 모델은 _blender/ 에 백업)
import os, shutil

SRC = r"S:\신혼여행 브이로그\_지원🖤하은\@@사업관련@@\프로그램 제작\3D 수납장 시뮬레이터"
DST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "items")
BAK = os.path.join(DST, "_blender")

MAP = {
    "개켜진 옷.glb": "item-tshirt.glb",
    "동원참치 일반캔.glb": "item-tuna-can.glb",
    "물병.glb": "item-water-2l.glb",
    "물티슈.glb": "item-wet-wipes.glb",
    "스팸 큰 캔.glb": "item-spam-340.glb",
    "신라면 봉지면.glb": "item-shin-ramyun.glb",
    "육개장라면 작은컵.glb": "item-yukgaejang-cup.glb",
    "코카콜라 뚱캔.glb": "item-coke-355.glb",
    "화장지 롤.glb": "item-toilet-roll.glb",
    "기네스 캔맥주.glb": "item-guinness-440.glb",
    "노브랜드 고추장 1kg.glb": "item-gochujang-1kg.glb",
    "시리얼박스.glb": "item-cereal-box.glb",
    "진라면 작은컵.glb": "item-jin-cup-small.glb",
    "참깨라면 큰컵.glb": "item-chamggae-cup-big.glb",
    "초코파이박스.glb": "item-chocopie-box.glb",
}

os.makedirs(BAK, exist_ok=True)
for src, dst in MAP.items():
    s = os.path.join(SRC, src)
    d = os.path.join(DST, dst)
    if not os.path.exists(s):
        print("MISSING", src)
        continue
    if os.path.exists(d) and not os.path.exists(os.path.join(BAK, dst)):
        shutil.copy2(d, os.path.join(BAK, dst))
    shutil.copy2(s, d)
    print("OK", dst, os.path.getsize(d) // 1024, "KB")
