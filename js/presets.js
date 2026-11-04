// 브랜드별/사이즈별 기본 수납함 카탈로그 데이터 (단위: mm), 기본 저장 조합 및 제품 예시 일러스트 생성기

// 루틴랩 구매 링크 (3L·6L·9L 공통) — 공동구매 링크가 정해지면 여기 한 곳만 바꾸면 됨
const ROUTINELAB_URL = 'https://smartstore.naver.com/nuber/products/13818484744';

// 아이리스 BC 시리즈 구매 링크 (전 사이즈 공통)
const IRIS_BC_URL = 'https://brand.naver.com/iriskorea/products/315482921';

window.DEFAULT_STORAGE_MODELS = [
  // 1. 무인양품 (MUJI) - 폴리프로필렌 케이스·서랍식 (9종)
  {
    id: 'muji-pp-drawer-wide-deep',
    brand: '무인양품',
    lineup: '폴리프로필렌 케이스·서랍식',
    name: '폴리프로필렌 케이스·서랍식·가로와이드·깊은형',
    wTop: 370, dTop: 260, h: 175,
    wBot: 370, dBot: 260,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#ebe5d9',
    price: 19900,
    url: 'https://mujikorea.co.kr/products/view/96065',
    image: 'img/muji/muji-pp-drawer-wide-deep.png'
  },
  {
    id: 'muji-pp-drawer-wide-shallow',
    brand: '무인양품',
    lineup: '폴리프로필렌 케이스·서랍식',
    name: '폴리프로필렌 케이스·서랍식·가로와이드·얕은형',
    wTop: 370, dTop: 260, h: 120,
    wBot: 370, dBot: 260,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#f3efe6',
    price: 17900,
    url: 'https://mujikorea.co.kr/products/view/96066',
    image: 'img/muji/muji-pp-drawer-wide-shallow.png'
  },
  {
    id: 'muji-pp-drawer-wide-thin',
    brand: '무인양품',
    lineup: '폴리프로필렌 케이스·서랍식',
    name: '폴리프로필렌 케이스·서랍식·가로와이드·얇은형',
    wTop: 370, dTop: 260, h: 90,
    wBot: 370, dBot: 260,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#f5f2eb',
    price: 19900,
    url: 'https://mujikorea.co.kr/products/view/96067',
    image: 'img/muji/muji-pp-drawer-wide-thin.png'
  },
  {
    id: 'muji-pp-drawer-wide-thin-2p',
    brand: '무인양품',
    lineup: '폴리프로필렌 케이스·서랍식',
    name: '폴리프로필렌 케이스·서랍식·가로와이드·얇은형·2개',
    wTop: 370, dTop: 260, h: 90,
    wBot: 370, dBot: 260,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#f0ece1',
    price: 19900,
    url: 'https://mujikorea.co.kr/products/view/96068',
    image: 'img/muji/muji-pp-drawer-wide-thin-2p.png'
  },
  {
    id: 'muji-pp-drawer-deep',
    brand: '무인양품',
    lineup: '폴리프로필렌 케이스·서랍식',
    name: '폴리프로필렌 케이스·서랍식·깊은형',
    wTop: 260, dTop: 370, h: 175,
    wBot: 260, dBot: 370,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#ebe5d9',
    price: 17900,
    url: 'https://mujikorea.co.kr/products/view/95911',
    image: 'img/muji/muji-pp-drawer-deep.png'
  },
  {
    id: 'muji-pp-drawer-deep-2p',
    brand: '무인양품',
    lineup: '폴리프로필렌 케이스·서랍식',
    name: '폴리프로필렌 케이스·서랍식·깊은형·2개',
    wTop: 260, dTop: 370, h: 175,
    wBot: 260, dBot: 370,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#eae4d7',
    price: 24900,
    url: 'https://mujikorea.co.kr/products/view/96062',
    image: 'img/muji/muji-pp-drawer-deep-2p.png'
  },
  {
    id: 'muji-pp-drawer-shallow',
    brand: '무인양품',
    lineup: '폴리프로필렌 케이스·서랍식',
    name: '폴리프로필렌 케이스·서랍식·얕은형',
    wTop: 260, dTop: 370, h: 120,
    wBot: 260, dBot: 370,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#f3efe6',
    price: 14900,
    url: 'https://mujikorea.co.kr/products/view/95910',
    image: 'img/muji/muji-pp-drawer-shallow.png'
  },
  {
    id: 'muji-pp-drawer-shallow-2p',
    brand: '무인양품',
    lineup: '폴리프로필렌 케이스·서랍식',
    name: '폴리프로필렌 케이스·서랍식·얕은형·2개',
    wTop: 260, dTop: 370, h: 120,
    wBot: 260, dBot: 370,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#f0ece1',
    price: 19900,
    url: 'https://mujikorea.co.kr/products/view/96064',
    image: 'img/muji/muji-pp-drawer-shallow-2p.png'
  },
  {
    id: 'muji-pp-drawer-thin-v',
    brand: '무인양품',
    lineup: '폴리프로필렌 케이스·서랍식',
    name: '폴리프로필렌 케이스·서랍식·얇은형·세로',
    wTop: 260, dTop: 370, h: 90,
    wBot: 260, dBot: 370,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#f5f2eb',
    price: 13900,
    url: 'https://mujikorea.co.kr/products/view/96063',
    image: 'img/muji/muji-pp-drawer-thin-v.png'
  },
  // 1-2. 무인양품 (MUJI) - PP 수납 시리즈 (12종: 수납케이스 / 가로와이드 / 의류 케이스 / 클로젯 케이스)
  {
    id: 'muji-pp-storage-s',
    brand: '무인양품',
    lineup: 'PP 수납케이스',
    name: '폴리프로필렌 수납케이스·S',
    wTop: 340, dTop: 445, h: 180,
    wBot: 340, dBot: 445,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#eef1f3',
    price: 24900,
    url: 'https://mujikorea.co.kr/products/view/95889',
    image: 'img/muji/muji-pp-storage-s.png'
  },
  {
    id: 'muji-pp-storage-l',
    brand: '무인양품',
    lineup: 'PP 수납케이스',
    name: '폴리프로필렌 수납케이스·L',
    wTop: 340, dTop: 445, h: 240,
    wBot: 340, dBot: 445,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#eaeef1',
    price: 29900,
    url: 'https://mujikorea.co.kr/products/view/95888',
    image: 'img/muji/muji-pp-storage-l.png'
  },
  {
    id: 'muji-pp-storage-deep',
    brand: '무인양품',
    lineup: 'PP 수납케이스',
    name: '폴리프로필렌 수납케이스·깊은형',
    wTop: 340, dTop: 445, h: 300,
    wBot: 340, dBot: 445,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#e5eaee',
    price: 34900,
    url: 'https://mujikorea.co.kr/products/view/95887',
    image: 'img/muji/muji-pp-storage-deep.png'
  },
  {
    id: 'muji-pp-storage-wide-s',
    brand: '무인양품',
    lineup: 'PP 수납케이스 가로와이드',
    name: '폴리프로필렌 수납케이스 가로와이드·S',
    wTop: 550, dTop: 445, h: 180,
    wBot: 550, dBot: 445,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#eef1f3',
    price: 34900,
    url: 'https://mujikorea.co.kr/products/view/95896',
    image: 'img/muji/muji-pp-storage-wide-s.png'
  },
  {
    id: 'muji-pp-storage-wide-l',
    brand: '무인양품',
    lineup: 'PP 수납케이스 가로와이드',
    name: '폴리프로필렌 수납케이스 가로와이드·L',
    wTop: 550, dTop: 445, h: 240,
    wBot: 550, dBot: 445,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#eaeef1',
    price: 39900,
    url: 'https://mujikorea.co.kr/products/view/95895',
    image: 'img/muji/muji-pp-storage-wide-l.png'
  },
  {
    id: 'muji-pp-storage-wide-deep',
    brand: '무인양품',
    lineup: 'PP 수납케이스 가로와이드',
    name: '폴리프로필렌 수납케이스 가로와이드·깊은형',
    wTop: 550, dTop: 445, h: 300,
    wBot: 550, dBot: 445,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#e5eaee',
    price: 44900,
    url: 'https://mujikorea.co.kr/products/view/95894',
    image: 'img/muji/muji-pp-storage-wide-deep.png'
  },
  {
    id: 'muji-pp-clothes-s',
    brand: '무인양품',
    lineup: 'PP 의류 케이스·서랍식',
    name: '폴리프로필렌 의류 케이스·서랍식·S',
    wTop: 400, dTop: 650, h: 180,
    wBot: 400, dBot: 650,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#eef1f3',
    price: 21900,
    url: 'https://mujikorea.co.kr/products/view/100197',
    image: 'img/muji/muji-pp-clothes-s.png'
  },
  {
    id: 'muji-pp-clothes-l',
    brand: '무인양품',
    lineup: 'PP 의류 케이스·서랍식',
    name: '폴리프로필렌 의류 케이스·서랍식·L',
    wTop: 400, dTop: 650, h: 240,
    wBot: 400, dBot: 650,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#eaeef1',
    price: 24900,
    url: 'https://mujikorea.co.kr/products/view/100198',
    image: 'img/muji/muji-pp-clothes-l.png'
  },
  {
    id: 'muji-pp-clothes-deep',
    brand: '무인양품',
    lineup: 'PP 의류 케이스·서랍식',
    name: '폴리프로필렌 의류 케이스·서랍식·깊은형',
    wTop: 400, dTop: 650, h: 300,
    wBot: 400, dBot: 650,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#e5eaee',
    price: 29900,
    url: 'https://mujikorea.co.kr/products/view/100199',
    image: 'img/muji/muji-pp-clothes-deep.png'
  },
  {
    id: 'muji-pp-closet-s',
    brand: '무인양품',
    lineup: 'PP 클로젯 케이스·서랍식',
    name: '폴리프로필렌 클로젯 케이스·서랍식·S',
    wTop: 440, dTop: 550, h: 180,
    wBot: 440, dBot: 550,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#eef1f3',
    price: 19900,
    url: 'https://mujikorea.co.kr/products/view/100191',
    image: 'img/muji/muji-pp-closet-s.png'
  },
  {
    id: 'muji-pp-closet-l',
    brand: '무인양품',
    lineup: 'PP 클로젯 케이스·서랍식',
    name: '폴리프로필렌 클로젯 케이스·서랍식·L',
    wTop: 440, dTop: 550, h: 240,
    wBot: 440, dBot: 550,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#eaeef1',
    price: 24900,
    url: 'https://mujikorea.co.kr/products/view/100192',
    image: 'img/muji/muji-pp-closet-l.png'
  },
  {
    id: 'muji-pp-closet-deep',
    brand: '무인양품',
    lineup: 'PP 클로젯 케이스·서랍식',
    name: '폴리프로필렌 클로젯 케이스·서랍식·깊은형',
    wTop: 440, dTop: 550, h: 300,
    wBot: 440, dBot: 550,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#e5eaee',
    price: 29900,
    url: 'https://mujikorea.co.kr/products/view/100193',
    image: 'img/muji/muji-pp-closet-deep.png'
  },

  // 2. 이케아 (IKEA)
  {
    id: 'ikea-skubb-s',
    brand: '이케아',
    lineup: 'SKUBB (스쿠브)',
    name: 'SKUBB 수납박스 소 (14x14)',
    wTop: 140, dTop: 140, h: 130,
    wBot: 140, dBot: 140,
    shapeType: 'box',
    accessType: 'top_open',
    stackable: false,
    stackingOffset: 0,
    hasFrontHandle: false,
    color: '#f7f4ef'
  },
  {
    id: 'ikea-skubb-m',
    brand: '이케아',
    lineup: 'SKUBB (스쿠브)',
    name: 'SKUBB 수납박스 중 (28x14)',
    wTop: 280, dTop: 140, h: 130,
    wBot: 280, dBot: 140,
    shapeType: 'box',
    accessType: 'top_open',
    stackable: false,
    stackingOffset: 0,
    hasFrontHandle: false,
    color: '#efeae2'
  },
  {
    id: 'ikea-skubb-l',
    brand: '이케아',
    lineup: 'SKUBB (스쿠브)',
    name: 'SKUBB 수납박스 대 (28x28)',
    wTop: 280, dTop: 280, h: 130,
    wBot: 280, dBot: 280,
    shapeType: 'box',
    accessType: 'top_open',
    stackable: false,
    stackingOffset: 0,
    hasFrontHandle: false,
    color: '#e5ddd0'
  },
  {
    id: 'ikea-variera-s',
    brand: '이케아',
    lineup: 'VARIERA (바리에라)',
    name: 'VARIERA 바구니 소 (24x17)',
    wTop: 240, dTop: 170, h: 105,
    wBot: 210, dBot: 145,
    shapeType: 'tapered',
    accessType: 'front_open',
    stackable: false,
    stackingOffset: 0,
    hasFrontHandle: true,
    color: '#ffffff'
  },
  {
    id: 'ikea-variera-l',
    brand: '이케아',
    lineup: 'VARIERA (바리에라)',
    name: 'VARIERA 바구니 대 (33.5x24)',
    wTop: 335, dTop: 240, h: 145,
    wBot: 300, dBot: 205,
    shapeType: 'tapered',
    accessType: 'front_open',
    stackable: false,
    stackingOffset: 0,
    hasFrontHandle: true,
    color: '#f8f6f2'
  },
  {
    id: 'ikea-kuggis-m',
    brand: '이케아',
    lineup: 'KUGGIS (쿠기스)',
    name: 'KUGGIS 뚜껑 수납함 (26x35x15)',
    wTop: 260, dTop: 350, h: 150,
    wBot: 245, dBot: 335,
    shapeType: 'tapered',
    accessType: 'top_lid',
    stackable: true,
    stackingOffset: 5,
    hasFrontHandle: true,
    color: '#d9e2dc'
  },

  // 3. 다이소 (DAISO) — 캡처 62종 전체 라인업 (적층 가능 여부 및 다이소몰 상세페이지 링크 반영)
  ...[
    // [id, lineup, name, wTop, dTop, h, wBot, dBot, shapeType, accessType, stackable, hasFrontHandle, color, price, pdNo]
    // --- 캡처 1 (12종) ---
    ['daiso-wood-handle-basket-m', '우드 핸들 바구니', '우드 핸들 바구니 중형', 205, 400, 170, 185, 375, 'tapered', 'front_open', false, true, '#f5f4f0', 3000, '1077554'],
    ['daiso-handle-basket-18x34', '손잡이 바구니', '손잡이 바구니 18.5X34cm', 185, 340, 150, 165, 315, 'tapered', 'front_open', false, true, '#e8e5df', 1000, '1028333'],
    ['daiso-stack-rack-tall', '반투명 적층 정리대', '반투명 적층 정리대 높은형 37 X 26 X 26 cm', 370, 260, 260, 370, 260, 'box', 'front_open', true, false, '#f1f1ef', 5000, '1061717'],
    ['daiso-pantry-handle-15', '팬트리 수납함', '팬트리 핸들형 수납함 15 X 30 X 17.5 cm', 150, 300, 175, 150, 300, 'box', 'front_open', false, true, '#f3efe8', 3000, '1047621'],
    ['daiso-rect-basket-3', '직사각 바구니', '직사각 바구니 3호 8 X 32 X 24 cm', 80, 320, 240, 80, 320, 'box', 'front_open', false, true, '#f5f4f2', 3000, '56045'],
    ['daiso-simple-pantry-20x10', '심플 팬트리 수납함', '심플 팬트리수납함(약20*10*6 cm)', 200, 100, 60, 200, 100, 'box', 'top_open', true, true, '#f5f4f2', 1000, '1047615'],
    ['daiso-stack-rack-low', '반투명 적층 정리대', '반투명 적층 정리대 낮은형 37 X 26 X 17.5 cm', 370, 260, 175, 370, 260, 'box', 'front_open', true, false, '#f1f1ef', 3000, '1061716'],
    ['daiso-simple-pantry-14x7', '심플 팬트리 수납함', '심플 팬트리 수납함 14 X 7 X 15 cm', 140, 70, 150, 140, 70, 'box', 'top_open', true, true, '#f5f4f2', 1000, '1047616'],
    ['daiso-folding-steel-rack', '스틸 의류 정리대', '폴딩형 스틸 의류 정리대', 320, 400, 210, 320, 400, 'box', 'front_open', true, false, '#e4e7ea', 5000, '1071286'],
    ['daiso-doi-box-l', '도이 수납함', '도이 수납함 대형', 370, 260, 240, 345, 240, 'tapered', 'top_lid', true, true, '#f6f5f2', 5000, '1039100'],
    ['daiso-rect-basket-4', '직사각 바구니', '직사각 바구니 4호 24 X 32 X 12 cm', 240, 320, 120, 240, 320, 'box', 'front_open', false, true, '#f5f4f2', 3000, '1067843'],
    ['daiso-doi-box-m', '도이 수납함', '도이 수납함 중형', 260, 185, 160, 240, 170, 'tapered', 'top_lid', true, true, '#f6f5f2', 3000, '1039099'],

    // --- 캡처 2 (15종) ---
    ['daiso-stack-drawer-l', '층층이 서랍장', '층층이 서랍장 대형', 230, 315, 150, 230, 315, 'box', 'front_drawer', true, true, '#ede8e0', 5000, '1065177'],
    ['daiso-stack-drawer-m', '층층이 서랍장', '층층이 서랍장 중형', 170, 230, 105, 170, 230, 'box', 'front_drawer', true, true, '#ede8e0', 3000, '1065176'],
    ['daiso-jp-adj-tray-42', '길이 조정 트레이', '일본제 길이 조정 수납 트레이 42 cm 슬림형', 105, 420, 80, 105, 420, 'box', 'top_open', false, false, '#f6f5f2', 2000, '1066461'],
    ['daiso-jp-adj-tray-33', '길이 조정 트레이', '일본제 길이 조정 수납 트레이 33 cm 넓은형', 150, 330, 80, 150, 330, 'box', 'top_open', false, false, '#f6f5f2', 2000, '1066459'],
    ['daiso-slim-tray-3', '슬림 트레이', '슬림 트레이 3호', 185, 264, 45, 172, 250, 'tapered', 'top_open', true, false, '#f2f1ee', 1000, '63977'],
    ['daiso-pantry-sys-box-l', '팬트리 수납함', '팬트리 시스템 수납함 대형', 265, 370, 320, 265, 370, 'box', 'top_lid', true, true, '#f4f3ef', 5000, '1045823'],
    ['daiso-fold-container-s', '폴딩 박스', '접이식 컨테이너 박스 소형', 210, 140, 80, 210, 140, 'box', 'top_open', true, true, '#ebe7de', 1000, '1050117'],
    ['daiso-drawer-tray-20', '서랍 정리 트레이', '서랍 정리 트레이 20 X 13 X 6.5 cm', 200, 130, 65, 200, 130, 'box', 'top_open', true, true, '#d4d8db', 1000, '1057969'],
    ['daiso-pantry-clear-45', '팬트리 클리어 바구니', '팬트리 클리어 바구니 45 X 15 X 28 cm', 150, 450, 280, 150, 450, 'box', 'front_open', false, true, '#eef2f4', 3000, '1043204'],
    ['daiso-slim-stack-rack', '반투명 적층 정리대', '반투명 틈새 적층 정리대 23 X 39 X 25 cm', 230, 390, 250, 230, 390, 'box', 'front_open', true, false, '#f1f1ef', 3000, '1061715'],
    ['daiso-pixar-fold-box', '폴딩 박스', '픽사 토이스토리 폴딩 박스 24.5 X 16 X 9.5 cm 그린', 245, 160, 95, 245, 160, 'box', 'top_open', true, true, '#dce8c8', 2000, '1054802'],
    ['daiso-simple-cover-box', '뚜껑 수납함', '심플 덮개 수납함 37 X 24.5 X 15 cm', 370, 245, 150, 370, 245, 'box', 'top_lid', true, false, '#eef0f1', 3000, '1044681'],
    ['daiso-slim-tray-2', '슬림 트레이', '슬림트레이 2호', 90, 260, 45, 80, 248, 'tapered', 'top_open', true, false, '#f2f1ee', 1000, '63976'],
    ['daiso-lid-handle-box', '뚜껑 수납함', '뚜껑 포함 핸들 수납함 26 X 17 X 12 cm', 260, 170, 120, 260, 170, 'box', 'top_lid', true, true, '#d9d9d4', 2000, '1047593'],
    ['daiso-handle-basket-13x34', '손잡이 바구니', '손잡이 바구니 13X34cm', 130, 340, 150, 115, 315, 'tapered', 'front_open', false, true, '#e8e5df', 1000, '1028334'],

    // --- 캡처 3 (15종) ---
    ['daiso-pantry-basket-2', '팬트리 수납 바구니', '팬트리 수납 바구니 2호', 170, 310, 110, 150, 290, 'tapered', 'front_open', false, true, '#ece8e1', 2000, '1034451'],
    ['daiso-pantry-clear-33', '팬트리 클리어 바구니', '팬트리 클리어 바구니 33 X 15 X 28 cm', 150, 330, 280, 150, 330, 'box', 'front_open', false, true, '#eef2f4', 3000, '1043203'],
    ['daiso-clear-rect-2p', '뚜껑 수납함', '일체형 직사각 투명 정리함 2개입 약 12 X 9.5 X 4.5 cm', 120, 95, 45, 120, 95, 'box', 'top_lid', true, false, '#f0f3f5', 1000, '1066841'],
    ['daiso-grid-lid-box-15', '칸칸이 뚜껑 수납함', '칸칸이 뚜껑 수납함 15칸', 290, 220, 85, 290, 220, 'box', 'top_lid', true, false, '#f2efe9', 3000, '1076773'],
    ['daiso-rect-adj-basket', '길이 조절 바구니', '직사각 길이 조절 바구니', 120, 180, 70, 120, 180, 'box', 'top_open', false, true, '#f2efe9', 2000, '1056302'],
    ['daiso-sliding-case', '슬라이딩 케이스', '다용도 슬라이딩 케이스', 130, 183, 100, 130, 183, 'box', 'front_drawer', true, true, '#eef2f5', 1000, '1064210'],
    ['daiso-grid-lid-box-10', '칸칸이 뚜껑 수납함', '칸칸이 뚜껑 수납함 10칸', 290, 220, 85, 290, 220, 'box', 'top_lid', true, false, '#f2efe9', 3000, '1076774'],
    ['daiso-temba-box-ivory', '뚜껑 수납함', '템바보드 수납함 35.5 X 30 X 22.5 cm 아이보리', 355, 300, 225, 355, 300, 'box', 'top_lid', true, true, '#e8e2d6', 5000, '10397331'],
    ['daiso-rattan-drawer-2', '라탄 서랍장', '라탄 서랍장 2칸', 265, 370, 180, 265, 370, 'box', 'front_drawer', true, true, '#d4c9b8', 5000, '1060266'],
    ['daiso-rattan-drawer-1', '라탄 서랍장', '라탄 서랍장 1칸', 265, 370, 180, 265, 370, 'box', 'front_drawer', true, true, '#d4c9b8', 5000, '1060265'],
    ['daiso-drawer-1tier', '모듈형 서랍장', '1단 서랍장', 260, 355, 135, 260, 355, 'box', 'front_drawer', true, true, '#f2ece1', 5000, '37135'],
    ['daiso-rattan-drawer-white-1', '라탄 서랍장', '라탄 서랍장 화이트 1칸', 265, 370, 180, 265, 370, 'box', 'front_drawer', true, true, '#f2efe9', 5000, '1065023'],
    ['daiso-clear-drawer-19', '클리어 서랍장', '클리어 서랍장 19 X 15 X 11 cm', 190, 150, 110, 190, 150, 'box', 'front_drawer', true, true, '#eef2f4', 3000, '1069645'],
    ['daiso-stack-drawer-s', '층층이 서랍장', '층층이 서랍장 소형', 115, 170, 75, 115, 170, 'box', 'front_drawer', true, true, '#ede8e0', 2000, '1065175'],
    ['daiso-stack-drawer-wide', '층층이 서랍장', '층층이 서랍장 와이드', 230, 170, 105, 230, 170, 'box', 'front_drawer', true, true, '#ede8e0', 3000, '1065178'],

    // --- 캡처 4 (15종) ---
    ['daiso-stack-clear-basket-4', '클리어 바구니', '적층가능투명바구니(4호)(약29.5x24x9 cm)', 240, 295, 90, 240, 295, 'box', 'front_open', true, true, '#edf2f5', 3000, '1068192'],
    ['daiso-jp-fridge-tray-slim', '냉장고 수납 바구니', '일본제 냉장고 정리 핸들 트레이 슬림 깊은형', 125, 300, 125, 125, 300, 'box', 'front_open', false, true, '#edf2f5', 3000, '1059221'],
    ['daiso-divider-organizer', '칸막이 정리함', '다용도 칸막이 정리함', 160, 460, 125, 160, 460, 'box', 'top_open', false, false, '#f0f2f4', 2000, '1056411'],
    ['daiso-egg-case-14', '냉장고 수납 바구니', '투명한 계란 보관함 14구', 110, 370, 75, 110, 370, 'box', 'top_lid', true, true, '#edf2f5', 3000, '1063382'],
    ['daiso-simple-pantry-30x15', '심플 팬트리 수납함', '심플 팬트리수납함(약30*15*7.1 cm)', 300, 150, 71, 300, 150, 'box', 'top_open', true, true, '#f5f4f2', 2000, '1047617'],
    ['daiso-clear-org-5', '클리어 정리함', '클리어 정리함 5호', 150, 150, 150, 150, 150, 'box', 'top_open', false, false, '#edf2f5', 1000, '1035252'],
    ['daiso-clear-org-8x8', '클리어 정리함', '클리어 정리함 8.2 X 8.2 X 12.4 cm', 82, 82, 124, 82, 82, 'box', 'top_open', false, false, '#edf2f5', 1000, '1035253'],
    ['daiso-dot-mesh-basket-1', '메쉬 바구니', '도트 메쉬 바구니 1호', 190, 260, 105, 175, 240, 'tapered', 'top_open', false, true, '#f4f4f2', 1000, '1052605'],
    ['daiso-fridge-sys-basket-2', '냉장고 수납 바구니', '냉장고 시스템 바구니 2호', 160, 310, 90, 145, 290, 'tapered', 'top_open', false, true, '#f0f2f4', 2000, '1001122'],
    ['daiso-handle-basket-24x34', '손잡이 바구니', '손잡이 바구니 24 X 34 X 9.5 cm', 240, 340, 95, 240, 340, 'box', 'front_open', false, true, '#f4f1ea', 2000, '1067847'],
    ['daiso-clear-basket-29x9', '클리어 바구니', '클리어 바구니 29.3X9.5X6.2cm', 95, 293, 62, 95, 293, 'box', 'top_open', false, false, '#edf2f5', 1000, '1033085'],
    ['daiso-oval-clear-basket', '클리어 바구니', '타원 클리어 바구니 24X16.7X11.2cm', 167, 240, 112, 167, 240, 'box', 'front_open', false, true, '#edf2f5', 2000, '1037550'],
    ['daiso-wheel-clear-basket', '클리어 바구니', '클리어 바퀴 바구니 38.5 X 24 X 7 cm', 240, 385, 70, 240, 385, 'box', 'front_open', false, true, '#edf2f5', 3000, '1058223'],
    ['daiso-pantry-basket-1', '팬트리 수납 바구니', '팬트리 수납 바구니 1호', 125, 320, 85, 110, 300, 'tapered', 'front_open', false, true, '#ece8e1', 1000, '1034450'],
    ['daiso-pantry-basket-3', '팬트리 수납 바구니', '팬트리 수납 바구니 3호', 170, 320, 140, 150, 300, 'tapered', 'front_open', false, true, '#f4f3ef', 3000, '1034452'],

    // --- 캡처 5 (5종) ---
    ['daiso-clear-3div-org', '칸막이 정리함', '투명 3분할 정리함', 127, 331, 69, 127, 331, 'box', 'top_open', false, false, '#edf2f5', 2000, '1043184'],
    ['daiso-fridge-basket-1', '냉장고 수납 바구니', '냉장고 수납 바구니 1호', 75, 300, 98, 65, 285, 'tapered', 'front_open', false, true, '#f0f2f4', 1000, '67793'],
    ['daiso-fridge-basket-5', '냉장고 수납 바구니', '냉장고 수납 바구니 5호', 200, 310, 115, 185, 290, 'tapered', 'front_open', false, true, '#f0f2f4', 2000, '1014186'],
    ['daiso-clean-cutlery-white', '수저통/트레이', '클린 수저통 화이트', 115, 275, 65, 115, 275, 'box', 'top_lid', true, false, '#dcdad5', 2000, '51573'],
    ['daiso-fridge-basket-4', '냉장고 수납 바구니', '냉장고 수납 바구니 4호', 135, 310, 115, 120, 290, 'tapered', 'front_open', false, true, '#f0f2f4', 2000, '1014184']
  ].map(([id, lineup, name, wTop, dTop, h, wBot, dBot, shapeType, accessType, stackable, hasFrontHandle, color, price, pdNo]) => ({
    id,
    brand: '다이소',
    lineup,
    name,
    wTop, dTop, h,
    wBot, dBot,
    shapeType,
    accessType,
    stackable,
    stackingOffset: stackable ? 3 : 0,
    hasFrontHandle,
    color,
    price,
    url: `https://www.daisomall.co.kr/pd/pdr/SCR_PDR_0001?pdNo=${pdNo}`,
    image: `img/daiso/${id}.png`
  })),

  // 4. 루틴랩 (Routine Lab) - 투명 서랍형 수납함 (3L / 6L / 9L)
  {
    id: 'routinelab-drawer-3l',
    brand: '루틴랩',
    lineup: '투명 서랍형 수납함',
    name: '루틴랩 투명 서랍 3L (12.6×34×H11cm)',
    wTop: 126, dTop: 340, h: 110,
    wBot: 126, dBot: 340,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 2,
    hasFrontHandle: true,
    color: '#eef6fb',
    price: 12500,
    url: ROUTINELAB_URL,
    image: 'img/routinelab/routinelab-drawer-3l.png'
  },
  {
    id: 'routinelab-drawer-6l',
    brand: '루틴랩',
    lineup: '투명 서랍형 수납함',
    name: '루틴랩 투명 서랍 6L (25.5×34×H11cm)',
    wTop: 255, dTop: 340, h: 110,
    wBot: 255, dBot: 340,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 2,
    hasFrontHandle: true,
    color: '#e5f1f8',
    price: 19900,
    url: ROUTINELAB_URL,
    image: 'img/routinelab/routinelab-drawer-6l.png'
  },
  {
    id: 'routinelab-drawer-9l',
    brand: '루틴랩',
    lineup: '투명 서랍형 수납함',
    name: '루틴랩 투명 서랍 9L (17×34×H22cm)',
    wTop: 170, dTop: 340, h: 220,
    wBot: 170, dBot: 340,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 2,
    hasFrontHandle: true,
    color: '#dcecf6',
    price: 21900,
    url: ROUTINELAB_URL,
    image: 'img/routinelab/routinelab-drawer-9l.png'
  },

  // 5. 코멧 (쿠팡) — 사용자 제공 규격 (가로×세로×높이 cm → mm)
  {
    id: 'comet-multi-box-xl',
    brand: '코멧',
    lineup: '다용도 정리함',
    name: '다용도 정리함 특대형',
    wTop: 505, dTop: 500, h: 400,
    wBot: 505, dBot: 500,
    shapeType: 'box',
    accessType: 'top_lid',
    stackable: true,
    stackingOffset: 0,
    hasFrontHandle: false,
    color: '#eceae5'
  },
  {
    id: 'comet-clear-drawer-wide-l',
    brand: '코멧',
    lineup: '클리어 시스템 수납 서랍',
    name: '클리어 시스템 수납 서랍 와이드 대형',
    wTop: 384, dTop: 482, h: 284,
    wBot: 384, dBot: 482,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 2,
    hasFrontHandle: true,
    color: '#eef3f6'
  },
  {
    id: 'comet-cosmetic-clear',
    brand: '코멧',
    lineup: '모던 투명 화장품 정리함',
    name: '모던 투명 화장품 정리함',
    wTop: 300, dTop: 190, h: 365,
    wBot: 300, dBot: 190,
    shapeType: 'box',
    accessType: 'top_lid',
    stackable: false,
    stackingOffset: 0,
    hasFrontHandle: true,
    color: '#f1f4f6'
  },
  // 코멧 홈 투명창 서랍 다용도 펜트리 정리함 (2개입) — 사용자 제공 규격
  {
    id: 'comet-pantry-drawer-l',
    brand: '코멧',
    lineup: '투명창 서랍 펜트리 정리함',
    name: '투명창 서랍 펜트리 정리함 대형',
    wTop: 230, dTop: 335, h: 115,
    wBot: 230, dBot: 335,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 0,
    hasFrontHandle: true,
    color: '#f4f4f2'
  },
  {
    id: 'comet-pantry-drawer-m',
    brand: '코멧',
    lineup: '투명창 서랍 펜트리 정리함',
    name: '투명창 서랍 펜트리 정리함 중형',
    wTop: 170, dTop: 240, h: 90,
    wBot: 170, dBot: 240,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 0,
    hasFrontHandle: true,
    color: '#f4f4f2'
  },
  {
    id: 'comet-pantry-drawer-s',
    brand: '코멧',
    lineup: '투명창 서랍 펜트리 정리함',
    name: '투명창 서랍 펜트리 정리함 소형',
    wTop: 150, dTop: 200, h: 85,
    wBot: 150, dBot: 200,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 0,
    hasFrontHandle: true,
    color: '#f4f4f2'
  },

  // 6. 아이리스 (네이버) — BC 시리즈 라인업 (폭×깊이×높이 mm, 사진: img/iris/)
  ...[
    // [key, code, 폭, 깊이, 높이, 가격(원), 판매 묶음 개수]  — BC-200·200D는 3개 묶음 가격
    ['bc-370', 'BC-370', 264, 370, 160, 10900, 1],
    ['bc-200', 'BC-200', 200, 500, 235, 32900, 3],
    ['bc-200d', 'BC-200D', 200, 500, 300, 35900, 3],
    ['bc-450s', 'BC-450S', 350, 450, 180, 14900, 1],
    ['bc-450', 'BC-450', 350, 450, 235, 15900, 1],
    ['bc-450d', 'BC-450D', 350, 450, 300, 16900, 1],
    ['bc-500s', 'BC-500S', 400, 500, 180, 16900, 1],
    ['bc-500', 'BC-500', 400, 500, 235, 17900, 1],
    ['bc-500d', 'BC-500D', 400, 500, 300, 18900, 1]
  ].map(([key, code, w, d, h, price, packQty]) => ({
    id: 'iris-' + key,
    brand: '아이리스',
    lineup: '서랍형 시스템 수납박스 BC',
    name: `아이리스 서랍형 수납함 ${code}`,
    wTop: w, dTop: d, h: h,
    wBot: w, dBot: d,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 2,
    hasFrontHandle: true,
    color: '#eef0f2',
    ...(price ? { price } : {}),
    ...(packQty > 1 ? { packQty } : {}),
    url: IRIS_BC_URL,
    image: `img/iris/${key}.png`
  }))
];

// 사다리꼴(바구니 모양) 수납함의 하단 치수 계산
// - 하단 치수가 상단보다 작게 등록돼 있으면 그대로 사용
// - 없거나 상단과 같으면(또는 더 크면) 전·후·좌·우 5mm씩, 즉 가로·세로 각 10mm 작게 자동 보정
window.TAPERED_DEFAULT_INSET = 5;
window.resolveBottomDims = function (model) {
  const wTop = Number(model && model.wTop) || 0;
  const dTop = Number(model && model.dTop) || 0;
  if (!model || model.shapeType !== 'tapered') return { wBot: wTop, dBot: dTop };
  const inset = window.TAPERED_DEFAULT_INSET * 2;
  const wB = Number(model.wBot);
  const dB = Number(model.dBot);
  return {
    wBot: (wB > 0 && wB < wTop) ? wB : Math.max(10, wTop - inset),
    dBot: (dB > 0 && dB < dTop) ? dB : Math.max(10, dTop - inset)
  };
};

// 기본 카탈로그의 사다리꼴 모델에 보정된 하단 치수를 미리 반영 (치수 표시·비교·3D가 같은 값을 쓰도록)
window.DEFAULT_STORAGE_MODELS.forEach((m) => {
  if (m.shapeType !== 'tapered') return;
  const b = window.resolveBottomDims(m);
  m.wBot = b.wBot;
  m.dBot = b.dBot;
});

// 기본 제공 저장된 조합 프리셋 (Shift+클릭으로 저장한 조합과 동일한 구조)
window.DEFAULT_SAVED_COMBOS = [
  {
    id: 'combo-muji-starter',
    name: '무인양품 폴리프로필렌 서랍식 가로와이드 + 세로 조합',
    totalW: 635,
    totalD: 370,
    maxH: 175,
    items: [
      { modelId: 'muji-pp-drawer-wide-deep', dx: 0, dz: 110, rot: 0 },
      { modelId: 'muji-pp-drawer-deep', dx: 375, dz: 0, rot: 0 }
    ]
  },
  {
    id: 'combo-ikea-skubb-set',
    name: '이케아 SKUBB 서랍 정리 4종 세트',
    totalW: 565,
    totalD: 280,
    maxH: 130,
    items: [
      { modelId: 'ikea-skubb-l', dx: 0, dz: 0, rot: 0 },
      { modelId: 'ikea-skubb-m', dx: 285, dz: 0, rot: 0 },
      { modelId: 'ikea-skubb-s', dx: 285, dz: 140, rot: 0 },
      { modelId: 'ikea-skubb-s', dx: 425, dz: 140, rot: 0 }
    ]
  },
  {
    id: 'combo-daiso-cutlery',
    name: '다이소 슬림 트레이 서랍 세트 (3호 + 2호)',
    totalW: 280,
    totalD: 264,
    maxH: 45,
    items: [
      { modelId: 'daiso-slim-tray-3', dx: 0, dz: 0, rot: 0 },
      { modelId: 'daiso-slim-tray-2', dx: 190, dz: 0, rot: 0 }
    ]
  },
  {
    id: 'combo-routinelab-set',
    name: '루틴랩 투명 서랍 3L + 6L + 9L 라인업 세트',
    totalW: 559,
    totalD: 340,
    maxH: 220,
    items: [
      { modelId: 'routinelab-drawer-3l', dx: 0, dy: 0, dz: 0, rot: 0 },
      { modelId: 'routinelab-drawer-6l', dx: 130, dy: 0, dz: 0, rot: 0 },
      { modelId: 'routinelab-drawer-9l', dx: 389, dy: 0, dz: 0, rot: 0 }
    ]
  }
];

window.ACCESS_TYPE_LABELS = {
  front_drawer: '앞으로 빼는 서랍',
  top_open: '위가 열린 통',
  top_lid: '위 뚜껑',
  front_open: '앞 손잡이',
  item: '물건'
};

window.SHAPE_TYPE_LABELS = {
  box: '네모 반듯',
  tapered: '바구니 모양'
};

// 상자 종류: 'drawer'(서랍형) · 'basket'(바구니형, 위나 앞이 열림) · 'lid'(뚜껑형)
window.getModelKind = function (m) {
  if (m.accessType === 'item') return 'item';
  if (m.accessType === 'front_drawer') return 'drawer';
  if (m.accessType === 'top_lid') return 'lid';
  return 'basket';
};

window.MODEL_KIND_LABELS = { drawer: '서랍형', basket: '바구니형', lid: '뚜껑형', item: '물건' };

// 투명도 분류: 'clear'(투명) · 'translucent'(반투명) · 'opaque'(불투명)
window.getModelTransparency = function (m) {
  if (!m) return 'opaque';
  if (m.transparency) return m.transparency;
  const text = `${m.brand || ''} ${m.lineup || ''} ${m.name || ''} ${m.id || ''}`;
  if (text.includes('반투명') || m.brand === '무인양품') {
    return 'translucent';
  }
  if (
    text.includes('투명') ||
    text.includes('클리어') ||
    text.includes('clear') ||
    m.id === 'daiso-partition-lid-15' ||
    m.id === 'daiso-partition-lid-10'
  ) {
    if (text.includes('투명창')) return 'translucent';
    return 'clear';
  }
  const translucentIds = new Set([
    'daiso-stack-drawer-l',
    'daiso-stack-drawer-m',
    'daiso-stack-drawer-s',
    'daiso-stack-drawer-wide',
    'daiso-drawer-1tier',
    'daiso-multi-sliding-case',
    'daiso-multi-partition-box',
    'daiso-fridge-system-2',
    'daiso-fridge-basket-1',
    'daiso-fridge-basket-4',
    'daiso-fridge-basket-5',
    'daiso-slim-tray-3',
    'daiso-slim-tray-2',
    'daiso-clean-cutlery-white'
  ]);
  if (translucentIds.has(m.id)) return 'translucent';
  return 'opaque';
};

window.TRANSPARENCY_LABELS = {
  clear: '투명',
  translucent: '반투명',
  opaque: '불투명'
};

// 개별 수납함 입체 예시 일러스트(SVG) 생성기 — 사진이 있으면 사진을 씀
window.getProductThumbnailSVG = function (model) {
  if (model.image) {
    const safeSrc = String(model.image).replace(/"/g, '&quot;');
    return `<img class="product-photo" src="${safeSrc}" alt="" loading="lazy" onerror="this.remove()" />`;
  }
  return window.getProductIllustrationSVG(model);
};

window.getProductIllustrationSVG = function (model) {
  const maxDim = Math.max(model.wTop, model.dTop, model.h, 220);
  const scale = 52 / maxDim;
  const wT = Math.max(22, model.wTop * scale);
  const dT = Math.max(18, model.dTop * scale * 0.65);
  const h = Math.max(18, model.h * scale * 0.9);
  const taperRatio = model.shapeType === 'tapered' ? 0.86 : 1.0;
  const wB = wT * taperRatio;
  const dB = dT * taperRatio;

  const cx = 90;
  const cy = 66 + h * 0.32;

  const pt = (x, y, z) => {
    const px = cx + (x - z * 0.75);
    const py = cy - y + (x * 0.28 + z * 0.35);
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  };

  const tFL = pt(-wT / 2, h, dT / 2);
  const tFR = pt(wT / 2, h, dT / 2);
  const tBR = pt(wT / 2, h, -dT / 2);
  const tBL = pt(-wT / 2, h, -dT / 2);

  const bFL = pt(-wB / 2, 0, dB / 2);
  const bFR = pt(wB / 2, 0, dB / 2);
  const bBR = pt(wB / 2, 0, -dB / 2);

  const baseHex = model.color || '#f0ebe1';

  const inFL = pt(-wT * 0.42, h - 1, dT * 0.42);
  const inFR = pt(wT * 0.42, h - 1, dT * 0.42);
  const inBR = pt(wT * 0.42, h - 1, -dT * 0.42);
  const inBL = pt(-wT * 0.42, h - 1, -dT * 0.42);

  let detailSvg = '';
  if (model.accessType === 'front_drawer') {
    const dFL = pt(-wB * 0.42, h * 0.82, dB / 2);
    const dFR = pt(wB * 0.42, h * 0.82, dB / 2);
    const dBR = pt(wB * 0.42, h * 0.15, dB / 2);
    const dBL = pt(-wB * 0.42, h * 0.15, dB / 2);
    const hL = pt(-wB * 0.16, h * 0.55, dB / 2 + 2);
    const hR = pt(wB * 0.16, h * 0.55, dB / 2 + 2);
    detailSvg = `
      <polygon points="${dFL} ${dFR} ${dBR} ${dBL}" fill="none" stroke="#8c7a6b" stroke-width="1.2"/>
      <line x1="${hL.split(',')[0]}" y1="${hL.split(',')[1]}" x2="${hR.split(',')[0]}" y2="${hR.split(',')[1]}" stroke="#5c4938" stroke-width="3.2" stroke-linecap="round"/>
    `;
  } else if (model.accessType === 'top_lid') {
    const lFL = pt(-wT / 2 - 1, h * 0.86, dT / 2 + 1);
    const lFR = pt(wT / 2 + 1, h * 0.86, dT / 2 + 1);
    const lBR = pt(wT / 2 + 1, h * 0.86, -dT / 2 - 1);
    detailSvg = `
      <polyline points="${lFL} ${lFR} ${lBR}" fill="none" stroke="#7d6b5d" stroke-width="1.6"/>
    `;
  } else {
    detailSvg = `
      <polygon points="${inFL} ${inFR} ${inBR} ${inBL}" fill="#cbbba8" fill-opacity="0.55" stroke="#9c8b7a" stroke-width="0.8"/>
    `;
  }

  if (model.hasFrontHandle && model.accessType !== 'front_drawer') {
    const holeL = pt(-wT * 0.15, h * 0.68, dT / 2);
    const holeR = pt(wT * 0.15, h * 0.68, dT / 2);
    detailSvg += `<line x1="${holeL.split(',')[0]}" y1="${holeL.split(',')[1]}" x2="${holeR.split(',')[0]}" y2="${holeR.split(',')[1]}" stroke="#6e5d52" stroke-width="3" stroke-linecap="round"/>`;
  }

  return `
    <svg viewBox="0 0 180 115" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="${cx}" cy="${cy + 14}" rx="${Math.max(28, wB * 0.75)}" ry="${Math.max(10, dB * 0.38)}" fill="rgba(61,49,42,0.08)" />
      <polygon points="${tFL} ${tFR} ${bFR} ${bFL}" fill="${baseHex}" stroke="#7d6b5d" stroke-width="1.3" stroke-linejoin="round"/>
      <polygon points="${tFR} ${tBR} ${bBR} ${bFR}" fill="${baseHex}" style="filter:brightness(0.91)" stroke="#7d6b5d" stroke-width="1.3" stroke-linejoin="round"/>
      <polygon points="${tFL} ${tFR} ${tBR} ${tBL}" fill="${baseHex}" style="filter:brightness(1.04)" stroke="#7d6b5d" stroke-width="1.3" stroke-linejoin="round"/>
      ${detailSvg}
    </svg>
  `;
};

// 저장된 묶음 조합(Combo)의 배치 구성을 한눈에 보여주는 미니 평면/입체 다이어그램(SVG) 생성기
window.getComboThumbnailSVG = function (combo, modelsMap) {
  const pad = 16;
  const availW = 148;
  const availH = 84;
  const scale = Math.min(availW / Math.max(100, combo.totalW), availH / Math.max(100, combo.totalD));
  const drawW = combo.totalW * scale;
  const drawD = combo.totalD * scale;
  const startX = (180 - drawW) / 2;
  const startY = (115 - drawD) / 2;

  let rectsSvg = `
    <rect x="${(startX - 4).toFixed(1)}" y="${(startY - 4).toFixed(1)}" width="${(drawW + 8).toFixed(1)}" height="${(drawD + 8).toFixed(1)}" rx="5" fill="rgba(217,119,6,0.08)" stroke="#d97706" stroke-dasharray="4 2" stroke-width="1.4"/>
  `;

  (combo.items || []).forEach((it) => {
    const m = modelsMap[it.modelId];
    if (!m) return;
    const swapped = (it.rot === 90 || it.rot === 270);
    const w = (swapped ? m.dTop : m.wTop) * scale;
    const d = (swapped ? m.wTop : m.dTop) * scale;
    const x = startX + it.dx * scale;
    const y = startY + it.dz * scale;
    const fill = m.color || '#f2ece1';
    rectsSvg += `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(4, w - 1.5).toFixed(1)}" height="${Math.max(4, d - 1.5).toFixed(1)}" rx="3" fill="${fill}" stroke="#6e5d52" stroke-width="1.3"/>
    `;
  });

  return `
    <svg viewBox="0 0 180 115" xmlns="http://www.w3.org/2000/svg">
      ${rectsSvg}
    </svg>
  `;
};
