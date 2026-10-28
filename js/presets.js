// 브랜드별/사이즈별 기본 수납함 카탈로그 데이터 (단위: mm), 기본 저장 조합 및 제품 예시 일러스트 생성기

window.DEFAULT_STORAGE_MODELS = [
  // 1. 무인양품 (MUJI)
  {
    id: 'muji-pp-drawer-wide-s',
    brand: '무인양품',
    lineup: 'PP 서랍식 케이스',
    name: 'PP 케이스 서랍식·가로와이드·소',
    wTop: 370, dTop: 260, h: 120,
    wBot: 370, dBot: 260,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#f3efe6'
  },
  {
    id: 'muji-pp-drawer-wide-l',
    brand: '무인양품',
    lineup: 'PP 서랍식 케이스',
    name: 'PP 케이스 서랍식·가로와이드·대',
    wTop: 370, dTop: 260, h: 175,
    wBot: 370, dBot: 260,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: true,
    color: '#ebe5d9'
  },
  {
    id: 'muji-pp-filebox-std',
    brand: '무인양품',
    lineup: 'PP 파일박스',
    name: 'PP 파일박스·스탠다드 (폭10cm)',
    wTop: 100, dTop: 320, h: 240,
    wBot: 100, dBot: 320,
    shapeType: 'box',
    accessType: 'top_open',
    stackable: false,
    stackingOffset: 0,
    hasFrontHandle: true,
    color: '#f5f2eb'
  },
  {
    id: 'muji-pp-filebox-wide',
    brand: '무인양품',
    lineup: 'PP 파일박스',
    name: 'PP 파일박스·와이드 (폭15cm)',
    wTop: 150, dTop: 320, h: 240,
    wBot: 150, dBot: 320,
    shapeType: 'box',
    accessType: 'top_open',
    stackable: false,
    stackingOffset: 0,
    hasFrontHandle: true,
    color: '#eae4d7'
  },
  {
    id: 'muji-pp-makeup-half',
    brand: '무인양품',
    lineup: 'PP 메이크업박스',
    name: 'PP 메이크업박스·1/2',
    wTop: 150, dTop: 220, h: 86,
    wBot: 146, dBot: 216,
    shapeType: 'tapered',
    accessType: 'top_open',
    stackable: true,
    stackingOffset: 4,
    hasFrontHandle: false,
    color: '#f0ece1'
  },
  {
    id: 'muji-softbox-rect-m',
    brand: '무인양품',
    lineup: '소프트박스',
    name: '소프트박스·장방형·중 (뚜껑형)',
    wTop: 370, dTop: 260, h: 260,
    wBot: 360, dBot: 250,
    shapeType: 'tapered',
    accessType: 'top_lid',
    stackable: true,
    stackingOffset: 0,
    hasFrontHandle: true,
    color: '#dfcfb9'
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

  // 3. 다이소 (DAISO)
  {
    id: 'daiso-sys-1',
    brand: '다이소',
    lineup: '시스템 정리함',
    name: '시스템 정리함 1호 (7.5x7.5)',
    wTop: 75, dTop: 75, h: 45,
    wBot: 70, dBot: 70,
    shapeType: 'tapered',
    accessType: 'top_open',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: false,
    color: '#f5efe6'
  },
  {
    id: 'daiso-sys-3',
    brand: '다이소',
    lineup: '시스템 정리함',
    name: '시스템 정리함 3호 (22.5x7.5)',
    wTop: 225, dTop: 75, h: 45,
    wBot: 218, dBot: 70,
    shapeType: 'tapered',
    accessType: 'top_open',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: false,
    color: '#efe7da'
  },
  {
    id: 'daiso-sys-5',
    brand: '다이소',
    lineup: '시스템 정리함',
    name: '시스템 정리함 5호 (22.5x15)',
    wTop: 225, dTop: 150, h: 45,
    wBot: 218, dBot: 143,
    shapeType: 'tapered',
    accessType: 'top_open',
    stackable: true,
    stackingOffset: 3,
    hasFrontHandle: false,
    color: '#e8decb'
  },
  {
    id: 'daiso-drawer-wide',
    brand: '다이소',
    lineup: '모듈형 서랍장',
    name: '반투명 서랍장 1단 와이드',
    wTop: 260, dTop: 355, h: 135,
    wBot: 260, dBot: 355,
    shapeType: 'box',
    accessType: 'front_drawer',
    stackable: true,
    stackingOffset: 4,
    hasFrontHandle: true,
    color: '#f2ece1'
  },
  {
    id: 'daiso-pantry-slim',
    brand: '다이소',
    lineup: '팬트리 수납함',
    name: '팬트리 손잡이 수납함 슬림',
    wTop: 130, dTop: 285, h: 155,
    wBot: 118, dBot: 270,
    shapeType: 'tapered',
    accessType: 'front_open',
    stackable: false,
    stackingOffset: 0,
    hasFrontHandle: true,
    color: '#faf7f2'
  },
  {
    id: 'daiso-basket-m',
    brand: '다이소',
    lineup: '직사각 바구니',
    name: '직사각 다용도 바구니 중',
    wTop: 290, dTop: 195, h: 125,
    wBot: 255, dBot: 165,
    shapeType: 'tapered',
    accessType: 'top_open',
    stackable: false,
    stackingOffset: 0,
    hasFrontHandle: true,
    color: '#e6d7c3'
  },

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
    color: '#eef6fb'
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
    color: '#e5f1f8'
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
    color: '#dcecf6'
  }
];

// 기본 제공 저장된 조합 프리셋 (Shift+클릭으로 저장한 조합과 동일한 구조)
window.DEFAULT_SAVED_COMBOS = [
  {
    id: 'combo-muji-starter',
    name: '무인양품 PP서랍 + 파일박스 2개 조합',
    totalW: 685,
    totalD: 320,
    maxH: 240,
    items: [
      { modelId: 'muji-pp-drawer-wide-l', dx: 0, dz: 60, rot: 0 },
      { modelId: 'muji-pp-filebox-wide', dx: 380, dz: 0, rot: 0 },
      { modelId: 'muji-pp-filebox-wide', dx: 535, dz: 0, rot: 0 }
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
    name: '다이소 시스템 정리함 서랍 세트 (5호+3호+1호)',
    totalW: 305,
    totalD: 230,
    maxH: 45,
    items: [
      { modelId: 'daiso-sys-5', dx: 0, dz: 0, rot: 0 },
      { modelId: 'daiso-sys-3', dx: 0, dz: 155, rot: 0 },
      { modelId: 'daiso-sys-1', dx: 230, dz: 0, rot: 0 },
      { modelId: 'daiso-sys-1', dx: 230, dz: 78, rot: 0 },
      { modelId: 'daiso-sys-1', dx: 230, dz: 155, rot: 0 }
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
  front_drawer: '전면 서랍형',
  top_open: '상단 오픈형',
  top_lid: '상단 뚜껑형',
  front_open: '전면 손잡이형'
};

window.SHAPE_TYPE_LABELS = {
  box: '직육면체',
  tapered: '테이퍼드(바구니형)'
};

// 개별 수납함 입체 예시 일러스트(SVG) 생성기
window.getProductThumbnailSVG = function (model) {
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
