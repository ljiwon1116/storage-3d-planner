/**
 * 보관함 자세히 보기
 * - 보관함을 누르면 뒤 3D는 흐리게, 그 보관함만 크게 띄움
 * - 생활 물건(블렌더 모델 models/items/*.glb)을 골라 넣으면 안에 자동으로 놓아 줌
 * - 넣을 물건을 체크하면 돌려 가며 틈 없이 자동으로 채움 (box.picks = 고른 물건, box.contents = 들어간 개수)
 */
(function () {
  const WALL = 4, FLOOR = 4;          // 상자 벽·바닥 두께 (mm, 어림)
  const glbCache = {};                // itemId -> Promise<THREE.Object3D | null>

  let renderer, scene, camera, controls, rafId = null, itemsGroup = null;
  let cur = null;                     // { box, model, onChange }

  // ---------- 안쪽 크기 ----------
  function innerSize(model) {
    const front = model.accessType === 'front_drawer';
    const wall = front ? 8 : WALL;    // 서랍형은 바깥 틀 + 서랍 벽
    const w = Math.min(model.wTop, model.wBot || model.wTop) - wall * 2;
    const d = Math.min(model.dTop, model.dBot || model.dTop) - wall * 2;
    let h = model.h - FLOOR;
    if (model.accessType === 'top_lid') h -= 12;   // 뚜껑 두께
    if (front) h -= 12;                             // 서랍 위 틈
    return { w: Math.max(0, w), d: Math.max(0, d), h: Math.max(0, h) };
  }

  // ---------- 자동 채우기: 고른 물건으로 틈 없이 ----------
  // 큰 물건부터 가장 많이 들어가는 방향으로 격자처럼 쌓고,
  // 남은 세 조각(옆·뒤·위)에 들어가는 것 중 가장 큰 물건으로 다시 채워요.
  const MAX_PIECES = 300;

  function orientsOf(it) {
    const dims = [it.wTop, it.h, it.dTop];          // x, y(높이), z
    const H = Math.PI / 2;
    const eulers = it.upright
      ? [[0, 0, 0], [0, H, 0]]
      : [[0, 0, 0], [0, H, 0], [H, 0, 0], [0, 0, H], [H, H, 0], [H, 0, H], [0, H, H], [H, H, H]];
    const out = [], seen = new Set();
    eulers.forEach((e) => {
      const el = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(e[0], e[1], e[2])).elements;
      const s = [0, 1, 2].map((i) => Math.round(Math.abs(el[i]) * dims[0] + Math.abs(el[4 + i]) * dims[1] + Math.abs(el[8 + i]) * dims[2]));
      const key = s.join('x');
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ w: s[0], h: s[1], d: s[2], e });
    });
    return out;
  }

  function pack(inner, picks) {
    const all = window.HOUSEHOLD_ITEMS || [];
    const types = (picks || []).map((id) => all.find((m) => m.id === id)).filter(Boolean)
      .map((it) => ({ it, os: orientsOf(it) }))
      .sort((a, b) => (b.it.wTop * b.it.dTop * b.it.h) - (a.it.wTop * a.it.dTop * a.it.h));
    const placed = [];
    const used = {};
    const fits = (t, s) => t.os.some((o) => o.w <= s.W && o.h <= s.H && o.d <= s.D);

    function fill(s, depth) {
      if (depth > 10 || placed.length >= MAX_PIECES || s.W < 1 || s.H < 1 || s.D < 1) return;
      // 큰 물건부터: 이 빈 곳에 들어가는 것 중 가장 큰 물건을 고름
      const t = types.find((tt) => fits(tt, s));
      if (!t) return;

      let best = null;
      t.os.forEach((o) => {
        if (o.w > s.W || o.h > s.H || o.d > s.D) return;
        const nx = Math.floor(s.W / o.w), ny = Math.floor(s.H / o.h), nz = Math.floor(s.D / o.d);
        const vol = nx * ny * nz * o.w * o.h * o.d;
        // 같은 양이면 낮게 눕힌 방향(안정적)
        if (!best || vol > best.vol || (vol === best.vol && o.h < best.o.h)) best = { o, nx, ny, nz, vol };
      });
      if (!best) return;

      const { o, nx, ny, nz } = best;
      used[t.it.id] = (used[t.it.id] || 0) + 1;
      for (let iy = 0; iy < ny; iy++)
        for (let iz = 0; iz < nz; iz++)
          for (let ix = 0; ix < nx; ix++) {
            if (placed.length >= MAX_PIECES) break;
            placed.push({ item: t.it, o, x: s.x + ix * o.w, y: s.y + iy * o.h, z: s.z + iz * o.d });
          }
      const bw = nx * o.w, bh = ny * o.h, bd = nz * o.d;
      fill({ x: s.x + bw, y: s.y, z: s.z, W: s.W - bw, H: s.H, D: s.D }, depth + 1);   // 옆
      fill({ x: s.x, y: s.y, z: s.z + bd, W: bw, H: s.H, D: s.D - bd }, depth + 1);    // 뒤
      fill({ x: s.x, y: s.y + bh, z: s.z, W: bw, H: s.H - bh, D: bd }, depth + 1);     // 위
    }

    fill({ x: 0, y: 0, z: 0, W: inner.w, H: inner.h, D: inner.d }, 0);

    const counts = {};
    placed.forEach((q) => { counts[q.item.id] = (counts[q.item.id] || 0) + 1; });
    const vol = placed.reduce((s, q) => s + q.o.w * q.o.h * q.o.d, 0);
    const pct = inner.w * inner.d * inner.h > 0 ? Math.round((vol / (inner.w * inner.d * inner.h)) * 100) : 0;
    const left = types.filter((t) => !counts[t.it.id]).map((t) => t.it);
    return { placed, counts, left, fill: pct };
  }

  // ---------- 물건 모양 불러오기 (블렌더 모델 → 없으면 코드로 그린 모양) ----------
  function loadItem(item) {
    if (glbCache[item.id]) return glbCache[item.id];
    glbCache[item.id] = new Promise((resolve) => {
      if (!THREE.GLTFLoader || item.noGlb) { resolve(null); return; }
      new THREE.GLTFLoader().load(
        'models/items/' + item.id + '.glb',
        (g) => {
          // 받은 모델은 크기·기준점이 제각각 → 표 크기(w x d x h)에 맞추고 바닥 가운데로 옮김
          const model = g.scene;
          model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
          const turn = new THREE.Group();
          if (item.glbRot) model.rotation.set(item.glbRot[0], item.glbRot[1], item.glbRot[2]);
          turn.add(model);
          turn.updateMatrixWorld(true);
          let bb = new THREE.Box3().setFromObject(turn);
          let sz = bb.getSize(new THREE.Vector3());
          // 가로·깊이 방향이 표와 반대면 90도 돌림
          if (item.wTop !== item.dTop && (sz.x - sz.z) * (item.wTop - item.dTop) < 0) {
            turn.rotation.y = Math.PI / 2;
            turn.updateMatrixWorld(true);
            bb = new THREE.Box3().setFromObject(turn);
            sz = bb.getSize(new THREE.Vector3());
          }
          const root = new THREE.Group();
          root.add(turn);
          if (sz.x > 0 && sz.y > 0 && sz.z > 0) {
            const c = bb.getCenter(new THREE.Vector3());
            turn.position.set(-c.x, -bb.min.y, -c.z);
            root.scale.set(item.wTop / sz.x, item.h / sz.y, item.dTop / sz.z);
          }
          resolve(root);
        },
        undefined,
        () => resolve(null)
      );
    });
    return glbCache[item.id];
  }

  function itemObject(item, proto) {
    if (proto) {
      const wrap = new THREE.Group();
      wrap.add(proto.clone(true));
      return wrap;
    }
    return window.buildItemMesh ? window.buildItemMesh(item) : new THREE.Group();
  }

  // ---------- 3D ----------
  function initViewer() {
    const host = document.getElementById('box-detail-canvas');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc2, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 0.75);
    sun.position.set(600, 1200, 900);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -700; sc.right = sc.top = 700; sc.near = 10; sc.far = 4000;
    scene.add(sun);

    camera = new THREE.PerspectiveCamera(35, 1, 5, 20000);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI * 0.49;
  }

  function resize() {
    const host = document.getElementById('box-detail-canvas');
    if (!renderer || !host) return;
    const w = host.clientWidth || 300, h = host.clientHeight || 300;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function loop() {
    rafId = requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  }

  function buildContainer(model) {
    const g = new THREE.Group();
    g.name = 'container';
    const w = model.wTop, d = model.dTop, h = model.h;
    const col = new THREE.Color(model.color || '#eeeae3');

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(w, FLOOR, d),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 })
    );
    floor.position.y = FLOOR / 2;
    floor.receiveShadow = true;
    g.add(floor);

    // 벽은 반투명 (안이 보이게), 위는 열어 둠
    const wallMat = new THREE.MeshStandardMaterial({
      color: col, roughness: 0.3, transparent: true, opacity: 0.22,
      side: THREE.DoubleSide, depthWrite: false
    });
    [[w, h, 1, 0, -d / 2], [w, h, 1, 0, d / 2], [1, h, d, -w / 2, 0], [1, h, d, w / 2, 0]].forEach(([a, b, c, x, z]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(a, b, c), wallMat);
      m.position.set(x, h / 2, z);
      g.add(m);
    });
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)),
      new THREE.LineBasicMaterial({ color: 0x8a7a6a })
    );
    edges.position.y = h / 2;
    g.add(edges);

    // 바닥 그림자 받는 판
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 4, d * 4),
      new THREE.ShadowMaterial({ opacity: 0.12 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    g.add(ground);
    return g;
  }

  function frameCamera(model) {
    const s = Math.max(model.wTop, model.dTop, model.h);
    const dist = s * 2.3;
    controls.target.set(0, model.h * 0.4, 0);
    camera.position.set(dist * 0.55, dist * 0.75, dist * 0.95);
    controls.minDistance = s * 1.1;
    controls.maxDistance = s * 5;
    controls.update();
  }

  async function drawItems() {
    if (!cur) return;
    const token = (drawItems.token = (drawItems.token || 0) + 1);
    const inner = innerSize(cur.model);
    const res = pack(inner, cur.box.picks);
    cur.box.contents = res.counts;                       // 다른 곳에서 쓰는 개수 기록
    const protos = await Promise.all(res.placed.map((q) => loadItem(q.item)));
    if (token !== drawItems.token || !cur) return;

    if (itemsGroup) scene.remove(itemsGroup);
    itemsGroup = new THREE.Group();
    const tmp = new THREE.Box3(), c = new THREE.Vector3();
    res.placed.forEach((q, i) => {
      const body = itemObject(q.item, protos[i]);
      body.rotation.set(q.o.e[0], q.o.e[1], q.o.e[2]);
      const obj = new THREE.Group();
      obj.add(body);
      obj.updateMatrixWorld(true);
      tmp.setFromObject(obj);
      tmp.getCenter(c);
      body.position.set(-c.x, -tmp.min.y, -c.z);     // 돌린 뒤 바닥 가운데 맞추기
      obj.position.set(
        -inner.w / 2 + q.x + q.o.w / 2,
        FLOOR + q.y,
        -inner.d / 2 + q.z + q.o.d / 2
      );
      itemsGroup.add(obj);
    });
    scene.add(itemsGroup);
    renderSummary(inner, res);
    renderList(res);
  }

  // ---------- 물건 썸네일 (모델을 작게 찍어서 그림으로) ----------
  const thumbCache = {};
  let thumbQ = Promise.resolve(), thumbR = null, thumbS = null, thumbC = null;
  function thumbOf(item) {
    if (thumbCache[item.id]) return thumbCache[item.id];
    thumbCache[item.id] = thumbQ = thumbQ.then(() => loadItem(item)).then((proto) => {
      if (!thumbR) {
        thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        thumbR.setPixelRatio(1);
        thumbR.setSize(112, 112);
        thumbS = new THREE.Scene();
        thumbS.add(new THREE.HemisphereLight(0xffffff, 0xd8cfc2, 1.0));
        const sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(1, 2, 1.5);
        thumbS.add(sun);
        thumbC = new THREE.PerspectiveCamera(30, 1, 1, 20000);
      }
      const obj = itemObject(item, proto);
      thumbS.add(obj);
      const bb = new THREE.Box3().setFromObject(obj);
      const c = bb.getCenter(new THREE.Vector3());
      const r = bb.getSize(new THREE.Vector3()).length() / 2;
      const dist = (r / Math.sin((15 * Math.PI) / 180)) * 1.02;
      thumbC.position.copy(c).addScaledVector(new THREE.Vector3(0.8, 0.75, 1).normalize(), dist);
      thumbC.near = dist / 50; thumbC.far = dist * 5;
      thumbC.lookAt(c);
      thumbC.updateProjectionMatrix();
      thumbR.render(thumbS, thumbC);
      const url = thumbR.domElement.toDataURL('image/png');
      thumbS.remove(obj);
      return url;
    }).catch(() => null);
    return thumbCache[item.id];
  }

  // ---------- 크기 알림 창 ----------
  const ROUND = ['tuna', 'water', 'coke', 'roll', 'cup-noodle'];
  let tipFor = null;
  function hideSizeTip() {
    document.querySelector('.bd-tip')?.remove();
    tipFor = null;
  }
  function showSizeTip(it, btn) {
    if (tipFor === it.id) { hideSizeTip(); return; }
    hideSizeTip();
    const sheet = document.querySelector('.box-detail-sheet');
    const tip = document.createElement('div');
    tip.className = 'bd-tip';
    tip.setAttribute('role', 'dialog');
    const round = ROUND.includes(it.itemShape) && it.wTop === it.dTop;
    tip.innerHTML = `<div class="bd-tip-name">${it.name}</div>` + (round
      ? `<div class="bd-tip-row"><span>지름</span><b>${it.wTop} mm</b></div>`
      : `<div class="bd-tip-row"><span>가로</span><b>${it.wTop} mm</b></div><div class="bd-tip-row"><span>깊이</span><b>${it.dTop} mm</b></div>`) +
      `<div class="bd-tip-row"><span>높이</span><b>${it.h} mm</b></div>`;
    sheet.appendChild(tip);
    const sr = sheet.getBoundingClientRect(), br = btn.getBoundingClientRect();
    let left = br.left - sr.left - 8;
    left = Math.max(8, Math.min(left, sr.width - tip.offsetWidth - 8));
    let top = br.bottom - sr.top + 4;
    if (top + tip.offsetHeight > sr.height - 8) top = br.top - sr.top - tip.offsetHeight - 4;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    tipFor = it.id;
    document.getElementById('box-detail-list')?.addEventListener('scroll', hideSizeTip, { once: true });
  }
  document.addEventListener('click', (ev) => {
    if (tipFor && !ev.target.closest('.bd-tip') && !ev.target.closest('.bd-info')) hideSizeTip();
  });

  // ---------- 화면 글자·목록 ----------
  function renderSummary(inner, res) {
    const total = res.placed.length;
    const picks = (cur.box.picks || []).length;
    const names = Object.keys(res.counts)
      .map((id) => ({ it: (window.HOUSEHOLD_ITEMS || []).find((m) => m.id === id), n: res.counts[id] }))
      .filter((x) => x.it)
      .sort((a, b) => b.n - a.n)
      .map((x) => `<span class="bd-got">${x.it.name} <b>${x.n}개</b></span>`).join('');
    document.getElementById('box-detail-summary').innerHTML =
      `안쪽 ${Math.round(inner.w)}x${Math.round(inner.d)}x${Math.round(inner.h)} mm · ` +
      (picks ? `모두 ${total}개 · 채운 정도 ${res.fill}%` : '여러 개 골라도 돼요. 큰 것부터 알아서 채워요') +
      (res.left.length ? ` · <b class="bd-left">${res.left.map((m) => m.name).join(', ')}: 자리가 없어요</b>` : '') +
      (names ? `<div class="bd-got-list">${names}</div>` : '');
  }

  function renderList(res) {
    const list = document.getElementById('box-detail-list');
    const items = window.HOUSEHOLD_ITEMS || [];
    const inner = innerSize(cur.model);
    const picks = cur.box.picks || (cur.box.picks = []);
    const counts = (res && res.counts) || {};
    list.innerHTML = '';
    items.forEach((it) => {
      const tooBig = !orientsOf(it).some((o) => o.w <= inner.w && o.h <= inner.h && o.d <= inner.d);
      const on = picks.includes(it.id);
      const n = counts[it.id] || 0;
      const row = document.createElement('label');
      row.className = 'bd-pick' + (tooBig ? ' too-big' : '') + (on ? ' on' : '');
      row.innerHTML = `
        <input type="checkbox" class="bd-cb" ${on ? 'checked' : ''} ${tooBig ? 'disabled' : ''}>
        <span class="bd-thumb"><img alt="" hidden></span>
        <span class="bd-row-text">
          <span class="bd-name-line">
            <span class="bd-row-name">${it.name}</span>
            <button type="button" class="bd-info" aria-label="${it.name} 크기 보기">
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 5.6v5.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="14" r="1.1" fill="currentColor"/></svg>
            </button>
          </span>
          ${tooBig ? '<span class="bd-row-size">이 보관함엔 안 들어가요</span>' : ''}
        </span>
        <span class="bd-num">${on && n ? n + '개' : ''}</span>`;
      const img = row.querySelector('.bd-thumb img');
      thumbOf(it).then((url) => { if (url) { img.src = url; img.hidden = false; } });
      row.querySelector('.bd-info').addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        showSizeTip(it, ev.currentTarget);
      });
      row.querySelector('.bd-cb').addEventListener('change', (ev) => {
        const i = picks.indexOf(it.id);
        if (ev.target.checked && i < 0) picks.push(it.id);
        if (!ev.target.checked && i >= 0) picks.splice(i, 1);
        row.classList.toggle('on', ev.target.checked);
        drawItems();
        if (cur.onChange) cur.onChange();
      });
      list.appendChild(row);
    });
  }

  function open(box, model, onChange) {
    if (!box || !model) return;
    if (!renderer) initViewer();
    cur = { box, model, onChange };
    if (!box.picks) box.picks = Object.keys(box.contents || {});

    document.getElementById('box-detail-title').textContent = model.name;
    const old = scene.getObjectByName('container');
    if (old) scene.remove(old);
    scene.add(buildContainer(model));
    if (itemsGroup) { scene.remove(itemsGroup); itemsGroup = null; }

    document.body.classList.add('box-detail-open');
    requestAnimationFrame(() => {
      resize();
      frameCamera(model);
      if (!rafId) loop();
    });
    renderList();
    drawItems();
  }

  function close() {
    document.body.classList.remove('box-detail-open');
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    cur = null;
  }

  function bind() {
    document.getElementById('box-detail-close')?.addEventListener('click', close);
    document.getElementById('box-detail-done')?.addEventListener('click', close);
    document.getElementById('box-detail-backdrop')?.addEventListener('click', close);
    document.getElementById('box-detail-clear')?.addEventListener('click', () => {
      if (!cur) return;
      cur.box.contents = {};
      cur.box.picks = [];
      renderList();
      drawItems();
      if (cur.onChange) cur.onChange();
    });
    window.addEventListener('resize', () => { if (cur) resize(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();

  window.BoxDetail = { open, close, pack, innerSize };
})();
