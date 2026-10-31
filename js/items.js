/**
 * 집에 흔한 물건 (선반에 무엇이 들어갈지 대충 보여주는 용도)
 * - 크기(mm): wTop=앞에서 본 가로, dTop=깊이, h=높이
 * - 크기는 흔한 제품의 대략 값. (est)는 검색으로 정확한 값을 못 찾아 어림한 값
 * - itemShape 별로 Three.js 기본 도형을 조합해 3D 모양을 만든다
 */
(function () {
  const ITEMS = [
    // [id, 이름, itemShape, w, d, h, 쌓기, {upright: 세워서만, glbRot: 받은 모델 먼저 돌리기}]
    // 크기: 사용자 제공 실측 표 (2026-10-31). 범위로 적힌 값은 가운데 값
    ['tshirt', '접은 티셔츠 6장', 'tshirt', 215, 280, 200, true, { upright: true, noGlb: true }],
    ['tuna-can', '참치캔 135g', 'tuna', 86, 86, 35, true],
    ['water-2l', '생수 500ml', 'water', 63, 63, 210, true],
    ['wet-wipes', '물티슈 캡형 100매', 'wipes', 200, 115, 68, true],
    ['spam-340', '스팸 340g', 'spam', 100, 55, 85, true],
    ['shin-ramyun', '신라면 봉지', 'ramen-bag', 140, 140, 38, true, { glbRot: [-Math.PI / 2, 0, 0] }],
    ['yukgaejang-cup', '육개장 사발면', 'cup-noodle', 145, 145, 75, true, { upright: true }],
    ['coke-355', '코카콜라 뚱캔 355ml', 'coke', 66, 66, 122, true],
    ['toilet-roll', '두루마리 휴지', 'roll', 115, 115, 99, true],
    ['guinness-440', '기네스 드래프트 캔 440ml', 'coke', 66, 66, 150, true],
    ['gochujang-1kg', '노브랜드 고추장 1kg', 'tissue', 155, 115, 105, true],
    ['cereal-box', '시리얼 박스', 'tissue', 195, 65, 280, false],
    ['jin-cup-small', '진라면 작은컵', 'cup-noodle', 100, 100, 105, true, { upright: true }],
    ['chamggae-cup-big', '참깨라면 큰컵', 'cup-noodle', 142, 142, 108, true, { upright: true }],
    ['chocopie-box', '초코파이 큰 박스 (30개입)', 'tissue', 295, 205, 85, true]
  ];

  window.HOUSEHOLD_ITEMS = ITEMS.map(([id, name, itemShape, w, d, h, stack, opt = {}]) => ({
    upright: !!opt.upright,
    noGlb: !!opt.noGlb,
    glbRot: opt.glbRot || null,
    id: 'item-' + id,
    brand: '생활 물건',
    lineup: '집에 흔한 물건',
    name,
    wTop: w, dTop: d, h,
    wBot: w, dBot: d,
    shapeType: 'box',
    accessType: 'item',
    itemShape,
    stackable: stack,
    stackingOffset: 0,
    hasFrontHandle: false,
    color: '#ffffff'
  }));

  // 생활 물건은 선반에 바로 놓지 않고, 보관함 안에 넣는 용도 (boxdetail.js)

  // ===== 3D 모양 =====
  function M(color, o) {
    return new THREE.MeshStandardMaterial(Object.assign({
      color: new THREE.Color(color), roughness: 0.6, metalness: 0.0
    }, o || {}));
  }
  function add(g, geom, mat, x, y, z) {
    const m = new THREE.Mesh(geom, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }
  // 바닥이 y 위치에 오는 상자 / 원통
  function box(g, w, h, d, mat, x, y, z) { return add(g, new THREE.BoxGeometry(w, h, d), mat, x, (y || 0) + h / 2, z); }
  function cyl(g, rT, rB, h, mat, x, y, z, seg) {
    return add(g, new THREE.CylinderGeometry(rT, rB, h, seg || 28), mat, x, (y || 0) + h / 2, z);
  }

  window.buildItemMesh = function (model) {
    const g = new THREE.Group();
    const w = model.wTop, d = model.dTop, h = model.h;
    const r = Math.min(w, d) / 2;
    const front = d / 2;

    switch (model.itemShape) {
      case 'towel': {
        const c = M('#b9cfd9', { roughness: 0.95 });
        box(g, w, h * 0.48, d, c, 0, 0, 0);
        box(g, w - 4, h * 0.48, d - 4, c, 0, h * 0.5, 0);
        break;
      }
      case 'tshirt': {
        // 접은 티셔츠 6장: 장마다 두께가 같아서 위가 평평한 묶음
        const n = 6, t = h / n;
        const cols = ['#f4f2ec', '#9aa3ad', '#2f3a52', '#d8c8ae', '#3a3a3a', '#b8cde0'];
        for (let i = 0; i < n; i++) {
          const inset = (i % 2) * 4;
          const c = M(cols[i], { roughness: 0.95 });
          const ww = w - inset - 2, dd = d - inset - 2, r = (t - 1.5) / 2, x = (i % 2 ? 1.5 : -1.5);
          box(g, ww, t - 1.5, dd - r, c, x, i * t + 0.75, -r / 2);
          // 접힌 앞단: 둥근 앞 테두리 (크기 안쪽)
          const lip = add(g, new THREE.CylinderGeometry(r, r, ww, 12), c, x, i * t + 0.75 + r, dd / 2 - r);
          lip.rotation.z = Math.PI / 2;
        }
        add(g, new THREE.TorusGeometry(34, 4, 8, 24, Math.PI), M('#cfc8bb'), 0, h + 0.5, -d / 2 + 34).rotation.x = -Math.PI / 2;
        break;
      }
      case 'socks': {
        const c = M('#8a8f96', { roughness: 0.95 });
        const s = add(g, new THREE.SphereGeometry(1, 18, 12), c, 0, h / 2, 0);
        s.scale.set(w / 2, h / 2, d / 2);
        break;
      }
      case 'roll':
      case 'kitchen-roll': {
        cyl(g, r, r, h, M('#fbfaf7', { roughness: 0.9 }));
        cyl(g, r * 0.3, r * 0.3, 1, M('#b79b78'), 0, h, 0);
        break;
      }
      case 'tissue': {
        box(g, w, h * 0.86, d, M('#e8dcc8'));
        box(g, w * 0.5, 1, d * 0.3, M('#9b8a74'), 0, h * 0.86, 0);
        const t = add(g, new THREE.SphereGeometry(1, 12, 8), M('#ffffff', { roughness: 1 }), 0, h * 0.86, 0);
        t.scale.set(w * 0.16, h * 0.14, d * 0.12);
        break;
      }
      case 'wipes': {
        box(g, w, h, d, M('#dfeef2'));
        box(g, w * 0.55, 6, d * 0.45, M('#ffffff'), 0, h, 0);
        break;
      }
      case 'water': {
        const water = M('#cfe6f2', { transparent: true, opacity: 0.75, roughness: 0.15 });
        cyl(g, r, r, h * 0.72, water);
        cyl(g, r * 0.32, r, h * 0.16, water, 0, h * 0.72, 0);
        cyl(g, r * 0.32, r * 0.32, h * 0.12, M('#2f6fb3'), 0, h * 0.88, 0);
        cyl(g, r * 1.01, r * 1.01, h * 0.16, M('#3d86c6'), 0, h * 0.36, 0);
        break;
      }
      case 'tuna': {
        cyl(g, r, r, h, M('#c9ccd0', { metalness: 0.6, roughness: 0.35 }));
        cyl(g, r * 1.005, r * 1.005, h * 0.6, M('#e5b33a'), 0, h * 0.2, 0);
        break;
      }
      case 'detergent': {
        box(g, w * 0.78, h * 0.82, d, M('#5a8fd0'), -w * 0.11, 0, 0);
        box(g, w * 0.22, h * 0.82, d * 0.5, M('#5a8fd0'), w * 0.39, 0, 0);
        const handle = add(g, new THREE.TorusGeometry(w * 0.16, 9, 8, 20, Math.PI), M('#4a7fc0'), w * 0.2, h * 0.82, 0);
        handle.rotation.z = 0;
        cyl(g, 24, 24, h * 0.12, M('#f2f2f2'), -w * 0.3, h * 0.82, 0);
        break;
      }
      case 'shampoo': {
        const s = add(g, new THREE.CylinderGeometry(1, 1, h * 0.78, 24), M('#ece6dc'), 0, h * 0.39, 0);
        s.scale.set(w / 2, 1, d / 2);
        cyl(g, 10, 10, h * 0.12, M('#3b3b3b'), 0, h * 0.78, 0);
        box(g, 12, 10, 40, M('#3b3b3b'), 0, h * 0.88, 14);
        break;
      }
      case 'zipbox': {
        box(g, w, h, d, M('#3f7ec4'));
        box(g, w * 0.6, h * 0.45, 1, M('#ffffff'), 0, h * 0.28, front);
        break;
      }
      case 'firstaid': {
        box(g, w, h, d, M('#f5f3ef'));
        box(g, 50, 14, 1, M('#d64541'), 0, h / 2 - 7, front);
        box(g, 14, 50, 1, M('#d64541'), 0, h / 2 - 25, front);
        box(g, 70, 10, 10, M('#9a948b'), 0, h, 0);
        break;
      }
      case 'shoes': {
        const upper = M('#f0f0ee'), sole = M('#3a3a3a');
        const sw = w * 0.46, uh = h - 22;
        [-w / 4, w / 4].forEach((x) => {
          box(g, sw, 22, d, sole, x, 0, 0);
          box(g, sw * 0.96, uh, d * 0.55, upper, x, 22, -d * 0.2);          // 발목 쪽
          box(g, sw * 0.92, uh * 0.55, d * 0.4, upper, x, 22, d * 0.27);    // 앞코
          cyl(g, sw * 0.46, sw * 0.46, 1, M('#5b5b5b'), x, h, -d * 0.28);   // 발 넣는 곳
        });
        break;
      }
      case 'mug': {
        const body = M('#e9dfd0', { roughness: 0.3 });
        const cr = d / 2;
        cyl(g, cr, cr, h, body, -(w - d) / 2, 0, 0);
        cyl(g, cr * 0.88, cr * 0.88, 1, M('#6b4a32'), -(w - d) / 2, h - 6, 0);
        const hd = add(g, new THREE.TorusGeometry(20, 6, 8, 20), body, w / 2 - 26, h * 0.5, 0);
        hd.rotation.y = 0;
        break;
      }
      case 'spam': {
        const tin = M('#2c4e9a', { metalness: 0.3, roughness: 0.4 });
        box(g, w, h * 0.86, d, tin);
        box(g, w + 2, h * 0.14, d + 2, M('#f2c230', { metalness: 0.4, roughness: 0.35 }), 0, h * 0.86, 0);
        box(g, w * 0.7, h * 0.3, 1, M('#e23b2e'), 0, h * 0.35, front);
        break;
      }
      case 'hetbahn': {
        cyl(g, r * 0.92, r * 0.85, h * 0.85, M('#ffffff', { roughness: 0.4 }));
        cyl(g, r, r, h * 0.12, M('#e8e2d6'), 0, h * 0.85, 0);
        cyl(g, r * 0.35, r * 0.35, 1, M('#c8302f'), 0, h * 0.97, 0);
        break;
      }
      case 'ramen-bag': {
        const bag = M('#d42a20', { roughness: 0.35 });
        const b = add(g, new THREE.SphereGeometry(1, 20, 10), bag, 0, h / 2, 0);
        b.scale.set(w / 2, h / 2, d / 2);
        box(g, w, 4, d * 0.98, bag, 0, h / 2 - 2, 0);
        box(g, w * 0.4, 1, d * 0.3, M('#111111'), 0, h - 2, 0);
        break;
      }
      case 'cup-noodle': {
        cyl(g, r, r * 0.78, h * 0.95, M('#c9452c'));
        cyl(g, r * 1.02, r * 1.02, h * 0.05, M('#f0e6d6'), 0, h * 0.95, 0);
        break;
      }
      case 'pads': {
        box(g, w, h, d, M('#f1d9e3', { roughness: 0.5 }));
        box(g, w * 0.6, h * 0.35, 1, M('#ffffff'), 0, h * 0.35, front);
        break;
      }
      case 'coke': {
        cyl(g, r, r, h * 0.92, M('#d4161c', { metalness: 0.4, roughness: 0.3 }));
        cyl(g, r * 0.84, r, h * 0.08, M('#c7cacd', { metalness: 0.7, roughness: 0.3 }), 0, h * 0.92, 0);
        cyl(g, r * 1.005, r * 1.005, h * 0.08, M('#ffffff'), 0, h * 0.45, 0);
        break;
      }
      case 'pasta': {
        box(g, w, h, d, M('#1f3f8f', { roughness: 0.45 }));
        box(g, w * 0.5, 1, d * 0.4, M('#e8cf8a'), 0, h, 0);
        box(g, w * 0.25, h * 0.5, 1, M('#e2c060'), -w * 0.2, h * 0.25, front);
        break;
      }
      case 'milk': {
        box(g, w, h * 0.94, d, M('#fafafa', { roughness: 0.5 }));
        box(g, w + 1, h * 0.3, d + 1, M('#2f6fc7'), 0, h * 0.1, 0);
        cyl(g, 13, 13, h * 0.06, M('#2f6fc7'), 0, h * 0.94, -d * 0.18);
        break;
      }
      default:
        box(g, w, h, d, M('#e8e2d6'));
    }
    return g;
  };
})();
