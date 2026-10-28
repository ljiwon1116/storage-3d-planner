// 메인 애플리케이션 컨트롤러 (여유로운 플로팅 UI, 좌상단/좌하단 아코디언, 3D 선반 콜아웃 카드, 자동 위로 적층, 모바일 터치 지원)

(function () {
  const STORAGE_KEY_CUSTOM_MODELS = 'storagefit_custom_models_v1';
  const STORAGE_KEY_SAVED_COMBOS = 'storagefit_saved_combos_v1';

  const state = {
    spaceConfig: {
      type: 'cabinet', // 'cabinet' | 'drawer'
      cabinet: {
        w: 800,
        d: 450,
        h: 1450,
        leftFrameW: 35,
        rightFrameW: 35,
        topFrameH: 30,
        bottomFrameH: 20,
        doorType: 'double',
        hingeClearanceW: 22,
        shelves: [
          { id: 'sh-1', bottomY: 360, thickness: 18 },
          { id: 'sh-2', bottomY: 730, thickness: 18 }
        ]
      },
      drawer: {
        w: 720,
        d: 480,
        exposedD: 350,
        h: 140,
        clearanceH: 175
      }
    },

    plans: [
      { id: 'plan-a', name: '시안 A', boxes: [] },
      { id: 'plan-b', name: '시안 B', boxes: [] },
      { id: 'plan-c', name: '시안 C', boxes: [] }
    ],
    activePlanId: 'plan-a',

    activeCompartmentIdx: 2,      // 현재 선택된 선반 칸
    expandedCompartmentIdx: null, // 우측 선반 콜아웃 카드 중 펼쳐진 칸 (기본상태는 null로 깔끔하게 접힘!)
    spaceCardOpen: false,         // 좌측 상단 가구 유형 카드 펼침 여부
    shelfCardOpen: false,         // 좌측 하단 중간 선반 카드 펼침 여부
    howToUseOpen: false,          // 중앙 상단 How to use 팝오버 펼침 여부
    errorDockCollapsed: false,    // 우측 하단 에러코드 접힘 여부

    selectedBoxIds: [],
    selectedCatalogModelId: 'muji-pp-drawer-wide-s',
    uiMode: 'mobile',             // 'mobile' | 'pc' (기본값: 'mobile'!)
    activeMobileTab: 'shelves',   // 'shelves' | 'space' | 'shelfpos' | 'errors'
    mobileSheetCollapsed: false,  // 모바일 하단 패널 접힘 여부
    rightSubTab: 'placed', // 'placed' | 'combos'
    autofillPanelOpen: false, // 자동 채우기 섹션 펼침 여부 (기본 접힘!)
    autofillMode: 'single',
    autofillSingleBrand: '무인양품',
    autofillBrand: '무인양품',
    autofillAvoidDeadzone: true,
    autofillRotate: true,
    autofillStack: true,

    drawerOpenRatio: 1.0,
    doorOpenAngle: 75,
    doorAnglePanelOpen: true,
    showDeadzones: true,
    xrayMode: false,
    snapStep: 5,
    touchMultiSelectMode: false,
    dbConnected: false,
    cloudModels: [],
    cloudCombos: [],

    catalogModels: [],
    modelsMap: {},
    savedCombos: [],
    pickerBrand: 'ALL',
    pickerSearch: ''
  };

  function mergeUniqueById(arr) {
    const map = new Map();
    arr.forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    return Array.from(map.values());
  }

  function loadCatalogAndCombos() {
    let custom = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_MODELS);
      if (saved) custom = JSON.parse(saved);
    } catch (e) {}
    state.catalogModels = mergeUniqueById([
      ...window.DEFAULT_STORAGE_MODELS,
      ...state.cloudModels,
      ...custom
    ]);
    state.modelsMap = {};
    state.catalogModels.forEach((m) => {
      state.modelsMap[m.id] = m;
    });

    let customCombos = [];
    try {
      const savedC = localStorage.getItem(STORAGE_KEY_SAVED_COMBOS);
      if (savedC) customCombos = JSON.parse(savedC);
    } catch (e) {}
    state.savedCombos = mergeUniqueById([
      ...(window.DEFAULT_SAVED_COMBOS || []),
      ...state.cloudCombos,
      ...customCombos
    ]);
  }

  function saveCustomModel(newModel) {
    let custom = [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_MODELS);
      if (saved) custom = JSON.parse(saved);
    } catch (e) {}
    custom.push(newModel);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_MODELS, JSON.stringify(custom));
    } catch (e) {}
    loadCatalogAndCombos();

    // Vercel + Neon DB에 비동기 저장
    fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newModel)
    }).catch(() => {});
  }

  function persistCustomCombo(newCombo) {
    let customCombos = [];
    try {
      const savedC = localStorage.getItem(STORAGE_KEY_SAVED_COMBOS);
      if (savedC) customCombos = JSON.parse(savedC);
    } catch (e) {}
    customCombos.unshift(newCombo);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_COMBOS, JSON.stringify(customCombos));
    } catch (e) {}
    loadCatalogAndCombos();

    // Vercel + Neon DB에 비동기 저장
    fetch('/api/combos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCombo)
    }).catch(() => {});
  }

  function deleteSavedCombo(comboId) {
    let customCombos = [];
    try {
      const savedC = localStorage.getItem(STORAGE_KEY_SAVED_COMBOS);
      if (savedC) customCombos = JSON.parse(savedC);
    } catch (e) {}
    customCombos = customCombos.filter((c) => c.id !== comboId);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_COMBOS, JSON.stringify(customCombos));
    } catch (e) {}
    state.cloudCombos = state.cloudCombos.filter((c) => c.id !== comboId);
    state.savedCombos = state.savedCombos.filter((c) => c.id !== comboId);
    refreshAll();

    // Vercel + Neon DB에서도 삭제
    fetch(`/api/combos?id=${encodeURIComponent(comboId)}`, {
      method: 'DELETE'
    }).catch(() => {});
  }

  // 시작 시 Vercel Serverless API (/api/bootstrap) 및 URL 공유 파라미터 확인
  async function syncWithCloudDatabase() {
    const badgeEl = document.getElementById('db-status-badge');
    const params = new URLSearchParams(window.location.search);
    const sharedPlanId = params.get('plan') || '';
    const encodedState = params.get('state') || '';

    // 1) URL 자체 인코딩 공유 링크(?state=...) 복원 지원
    if (encodedState) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(encodedState))));
        if (decoded.spaceConfig) state.spaceConfig = decoded.spaceConfig;
        if (decoded.plans) state.plans = decoded.plans;
        if (decoded.activePlanId) state.activePlanId = decoded.activePlanId;
        refreshAll();
      } catch (e) {
        console.warn('URL state 복원 실패:', e);
      }
    }

    // 2) Vercel + Neon DB (/api/bootstrap) 동기화
    if (window.location.protocol === 'file:') {
      if (badgeEl) {
        badgeEl.textContent = '⚪ 로컬 파일 모드';
        badgeEl.title = 'Vercel 배포 및 Neon DB 연결 시 자동으로 클라우드 DB와 동기화됩니다.';
      }
      return;
    }

    try {
      const res = await fetch(`/api/bootstrap${sharedPlanId ? `?plan=${encodeURIComponent(sharedPlanId)}` : ''}`);
      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();

      if (data.connected) {
        state.dbConnected = true;
        state.cloudModels = Array.isArray(data.models) ? data.models : [];
        state.cloudCombos = Array.isArray(data.combos) ? data.combos : [];
        loadCatalogAndCombos();

        if (data.sharedPlan) {
          if (data.sharedPlan.spaceConfig) state.spaceConfig = data.sharedPlan.spaceConfig;
          if (data.sharedPlan.plans) state.plans = data.sharedPlan.plans;
          if (data.sharedPlan.activePlanId) state.activePlanId = data.sharedPlan.activePlanId;
        }

        if (badgeEl) {
          badgeEl.textContent = '🟢 Neon DB 연동됨';
          badgeEl.style.background = '#e6f4ea';
          badgeEl.style.color = '#137333';
          badgeEl.style.borderColor = '#a8dab5';
        }
        refreshAll();
      } else {
        if (badgeEl) {
          badgeEl.textContent = '🟡 로컬 저장 모드';
          badgeEl.title = data.message || 'Vercel에 Neon DB 환경변수(DATABASE_URL)를 연결하면 클라우드 DB가 활성화됩니다.';
        }
      }
    } catch (e) {
      if (badgeEl) {
        badgeEl.textContent = '⚪ 로컬 저장 모드';
      }
    }
  }

  // 현재 3D 가구 치수 + 배치 시안을 링크로 생성하여 클립보드에 복사
  async function shareCurrentPlanLink() {
    const payload = {
      title: '내 3D 옷장·서랍 수납 배치도',
      spaceConfig: state.spaceConfig,
      plans: state.plans,
      activePlanId: state.activePlanId
    };

    let shareUrl = '';
    if (state.dbConnected && window.location.protocol !== 'file:') {
      try {
        const res = await fetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            const url = new URL(window.location.href);
            url.search = `?plan=${encodeURIComponent(data.id)}`;
            shareUrl = url.toString();
          }
        }
      } catch (e) {}
    }

    // Neon DB 연결 전이거나 로컬일 때는 URL 파라미터(?state=...)에 압축 인코딩하여 언제든 공유 가능하게 지원
    if (!shareUrl) {
      try {
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
        const base = window.location.href.split('?')[0];
        shareUrl = `${base}?state=${encoded}`;
      } catch (e) {
        shareUrl = window.location.href;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      alert(`🔗 현재 3D 수납 배치 공유 링크가 복사되었습니다!\n\n${shareUrl}\n\n이 링크를 다른 사람에게 보내면 동일한 3D 가구와 수납함 배치가 바로 열립니다.`);
    } catch (e) {
      prompt('아래 공유 링크를 복사하여 전달하세요:', shareUrl);
    }
  }

  function getActivePlan() {
    return state.plans.find((p) => p.id === state.activePlanId) || state.plans[0];
  }

  // 첨부 샘플 이미지와 유사한 초기 배치 시드 데이터
  function seedInitialDemoPlans() {
    const planA = state.plans[0];
    planA.boxes = [
      { id: 'demo-a1', modelId: 'muji-pp-drawer-wide-l', compartmentIndex: 0, x: 40, y: 0, z: 170, rot: 0, bundleGroupId: 'grp-muji-1' },
      { id: 'demo-a2', modelId: 'muji-pp-filebox-wide', compartmentIndex: 0, x: 425, y: 0, z: 110, rot: 0, bundleGroupId: 'grp-muji-1' },
      { id: 'demo-a3', modelId: 'muji-pp-filebox-wide', compartmentIndex: 0, x: 580, y: 0, z: 110, rot: 0, bundleGroupId: 'grp-muji-1' },
      { id: 'demo-a4', modelId: 'muji-softbox-rect-m', compartmentIndex: 2, x: 40, y: 0, z: 170, rot: 0 },
      { id: 'demo-a5', modelId: 'muji-softbox-rect-m', compartmentIndex: 2, x: 415, y: 0, z: 170, rot: 0 }
    ];

    const planB = state.plans[1];
    planB.boxes = [
      { id: 'demo-b1', modelId: 'ikea-kuggis-m', compartmentIndex: 0, x: 65, y: 0, z: 80, rot: 0 },
      { id: 'demo-b2', modelId: 'ikea-kuggis-m', compartmentIndex: 0, x: 65, y: 145, z: 80, rot: 0 }, // 2단 적층 예시
      { id: 'demo-b3', modelId: 'ikea-variera-l', compartmentIndex: 0, x: 340, y: 0, z: 190, rot: 0 },
      { id: 'demo-b4', modelId: 'ikea-skubb-l', compartmentIndex: 2, x: 65, y: 0, z: 150, rot: 0 },
      { id: 'demo-b5', modelId: 'ikea-skubb-l', compartmentIndex: 2, x: 350, y: 0, z: 150, rot: 0 }
    ];

    const planC = state.plans[2];
    planC.boxes = [
      { id: 'demo-c1', modelId: 'daiso-drawer-wide', compartmentIndex: 0, x: 65, y: 0, z: 80, rot: 0 },
      { id: 'demo-c2', modelId: 'daiso-drawer-wide', compartmentIndex: 0, x: 330, y: 0, z: 80, rot: 0 },
      { id: 'demo-c3', modelId: 'daiso-pantry-slim', compartmentIndex: 0, x: 595, y: 0, z: 150, rot: 0 },
      { id: 'demo-c4', modelId: 'daiso-basket-m', compartmentIndex: 2, x: 65, y: 0, z: 220, rot: 0 },
      { id: 'demo-c5', modelId: 'daiso-basket-m', compartmentIndex: 2, x: 365, y: 0, z: 220, rot: 0 }
    ];
  }

  function refreshAll() {
    renderLeftAccordionCards();
    renderPlanTabs();
    renderShelfCalloutCards();
    renderSelectedBoxInspector();
    renderComparisonTable();

    const activePlan = getActivePlan();
    window.Scene3DManager.renderScene(state.spaceConfig, activePlan.boxes, state.modelsMap, {
      selectedBoxIds: state.selectedBoxIds,
      activeCompartmentIdx: state.activeCompartmentIdx,
      drawerOpenRatio: state.drawerOpenRatio,
      doorOpenAngle: state.doorOpenAngle,
      showDeadzones: state.showDeadzones,
      xrayMode: state.xrayMode,
      snapStep: state.snapStep,
      touchMultiSelectMode: state.touchMultiSelectMode
    });

    renderWarningsBanner();
  }

  // 3D 화면에서 수납함 클릭 / Shift+클릭 / 모바일 터치 묶음 / 묶음 내 재클릭 처리
  function handleBoxInteraction(boxId, info) {
    const activePlan = getActivePlan();

    if (info.type === 'clear_selection' || !boxId) {
      state.selectedBoxIds = [];
      refreshAll();
      return;
    }

    const clickedBox = activePlan.boxes.find((b) => b.id === boxId);
    if (!clickedBox) return;

    if (state.spaceConfig.type === 'cabinet') {
      state.activeCompartmentIdx = clickedBox.compartmentIndex;
    }

    if (info.type === 'shift_toggle') {
      const sameShelfIds = state.selectedBoxIds.filter((id) => {
        const b = activePlan.boxes.find((item) => item.id === id);
        return b && b.compartmentIndex === clickedBox.compartmentIndex;
      });

      if (sameShelfIds.includes(boxId)) {
        state.selectedBoxIds = sameShelfIds.filter((id) => id !== boxId);
      } else {
        state.selectedBoxIds = [...sameShelfIds, boxId];
      }
      refreshAll();
      return;
    }

    if (info.type === 'unbundle_to_single') {
      state.selectedBoxIds = [boxId];
      refreshAll();
      return;
    }

    if (info.type === 'normal_click') {
      if (clickedBox.bundleGroupId) {
        const groupMembers = activePlan.boxes
          .filter((b) => b.compartmentIndex === clickedBox.compartmentIndex && b.bundleGroupId === clickedBox.bundleGroupId)
          .map((b) => b.id);
        if (groupMembers.length >= 2) {
          state.selectedBoxIds = groupMembers;
          refreshAll();
          return;
        }
      }
      state.selectedBoxIds = [boxId];
      refreshAll();
    }
  }

  // 3D 가구 선반의 2D 화면 좌표와 우측 선반 콜아웃 카드를 잇는 리더라인(연결선) 그리기
  function handleShelfAnchors(anchors) {
    const svgEl = document.getElementById('shelf-leader-svg');
    if (!svgEl) return;

    const svgRect = svgEl.getBoundingClientRect();
    let linesHtml = '';

    anchors.forEach((anc) => {
      const cardEl = document.getElementById(`shelf-callout-card-${anc.index}`);
      if (!cardEl) return;
      const cardRect = cardEl.getBoundingClientRect();
      if (cardRect.width === 0) return;

      const x1 = anc.x;
      const y1 = anc.y;
      const x2 = cardRect.left - svgRect.left;
      const y2 = cardRect.top - svgRect.top + cardRect.height / 2;

      const isAct = anc.index === state.activeCompartmentIdx;
      const strokeColor = isAct ? '#b86b43' : '#b8aa99';
      const strokeW = isAct ? '2.2' : '1.5';

      linesHtml += `
        <circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="3.5" fill="${strokeColor}" />
        <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
              stroke="${strokeColor}" stroke-width="${strokeW}" />
      `;
    });

    svgEl.innerHTML = linesHtml;
  }

  function handleBundleScreenPos(posInfo) {
    const popupEl = document.getElementById('bundle-floating-popup');
    if (!popupEl) return;

    if (!posInfo.visible || state.selectedBoxIds.length < 2) {
      popupEl.style.display = 'none';
      return;
    }

    popupEl.style.display = 'flex';
    popupEl.style.left = `${posInfo.x}px`;
    popupEl.style.top = `${posInfo.y - 12}px`;
    document.getElementById('bundle-popup-label').textContent =
      `📦 ${posInfo.count}개 수납함 묶음 선택됨`;

    const isCab = state.spaceConfig.type === 'cabinet';
    document.getElementById('btn-bundle-up').style.display = isCab ? 'inline-flex' : 'none';
    document.getElementById('btn-bundle-down').style.display = isCab ? 'inline-flex' : 'none';
  }

  function saveCurrentSelectionAsCombo() {
    const activePlan = getActivePlan();
    const selBoxes = activePlan.boxes.filter((b) => state.selectedBoxIds.includes(b.id));
    if (selBoxes.length === 0) return;

    const defaultName = `나만의 수납 조합 (${selBoxes.length}개 묶음)`;
    const name = prompt('저장할 수납함 묶음 조합의 이름을 입력하세요:', defaultName);
    if (!name) return;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxTopY = 0;
    selBoxes.forEach((b) => {
      const m = state.modelsMap[b.modelId];
      if (!m) return;
      const dims = window.PackerEngine.getOrientedDims(m, b.rot || 0);
      const by = b.y || 0;
      if (b.x < minX) minX = b.x;
      if (b.x + dims.w > maxX) maxX = b.x + dims.w;
      if (b.z < minZ) minZ = b.z;
      if (b.z + dims.d > maxZ) maxZ = b.z + dims.d;
      if (by < minY) minY = by;
      if (by + dims.h > maxTopY) maxTopY = by + dims.h;
    });

    const groupTag = 'grp-' + Date.now();
    const items = selBoxes.map((b) => {
      b.bundleGroupId = groupTag;
      return {
        modelId: b.modelId,
        dx: Math.round(b.x - minX),
        dy: Math.round((b.y || 0) - minY),
        dz: Math.round(b.z - minZ),
        rot: b.rot || 0
      };
    });

    const newCombo = {
      id: 'combo-' + Date.now(),
      name: name.trim(),
      totalW: Math.round(maxX - minX),
      totalD: Math.round(maxZ - minZ),
      maxH: Math.round(maxTopY - minY),
      items
    };

    persistCustomCombo(newCombo);
    state.rightSubTab = 'combos';
    state.expandedCompartmentIdx = state.activeCompartmentIdx;
    refreshAll();
  }

  function insertSavedComboToActiveSpace(comboId) {
    const combo = state.savedCombos.find((c) => c.id === comboId);
    if (!combo || !combo.items || combo.items.length === 0) return;

    const activePlan = getActivePlan();
    const compartments = window.PackerEngine.getCompartments(state.spaceConfig);
    const compIdx = state.spaceConfig.type === 'cabinet' ? state.activeCompartmentIdx : 0;
    const comp = compartments[compIdx] || compartments[0];

    let xMinBound = 0;
    if (state.spaceConfig.type === 'cabinet') {
      const cabConst = window.PackerEngine.getCabinetConstraints(state.spaceConfig);
      xMinBound = cabConst.leftDeadW;
    }

    let baseX = Math.max(0, Math.min(comp.w - combo.totalW, xMinBound));
    let baseZ = Math.max(0, comp.d - combo.totalD);

    const step = 20;
    let foundSpot = false;
    for (let z = comp.d - combo.totalD; z >= 0 && !foundSpot; z -= step) {
      for (let x = xMinBound; x <= comp.w - combo.totalW && !foundSpot; x += step) {
        const overlaps = activePlan.boxes.some((b) => {
          if (b.compartmentIndex !== compIdx) return false;
          const bm = state.modelsMap[b.modelId];
          if (!bm) return false;
          const bd = window.PackerEngine.getOrientedDims(bm, b.rot || 0);
          return x < b.x + bd.w - 2 && x + combo.totalW > b.x + 2 &&
                 z < b.z + bd.d - 2 && z + combo.totalD > b.z + 2;
        });
        if (!overlaps) {
          baseX = x;
          baseZ = z;
          foundSpot = true;
        }
      }
    }

    const newGroupId = 'grp-' + Date.now();
    const insertedBoxes = [];

    combo.items.forEach((it, idx) => {
      const m = state.modelsMap[it.modelId];
      if (!m) return;
      const dims = window.PackerEngine.getOrientedDims(m, it.rot || 0);
      const bx = Math.max(0, Math.min(comp.w - dims.w, baseX + (it.dx || 0)));
      const bz = Math.max(0, Math.min(comp.d - dims.d, baseZ + (it.dz || 0)));
      const newBox = {
        id: `box-${Date.now()}-${idx}`,
        modelId: m.id,
        compartmentIndex: compIdx,
        x: Math.round(bx),
        y: Math.round(it.dy || 0),
        z: Math.round(bz),
        rot: it.rot || 0,
        bundleGroupId: newGroupId
      };
      insertedBoxes.push(newBox);
    });

    // 만약 바닥이 이미 차 있어서 기존 수납함 위에 투입된 경우 자동으로 위로 적층!
    const insertedIds = insertedBoxes.map((b) => b.id);
    let maxSupportY = 0;
    insertedBoxes.forEach((b) => {
      const supY = window.PackerEngine.computeStackingY(
        state.spaceConfig,
        activePlan.boxes,
        b,
        state.modelsMap,
        insertedIds
      );
      if (supY > maxSupportY) maxSupportY = supY;
    });
    insertedBoxes.forEach((b) => {
      b.y = Math.round((b.y || 0) + maxSupportY);
      activePlan.boxes.push(b);
    });

    state.selectedBoxIds = insertedIds;
    refreshAll();
  }

  // 새 수납함 추가 시: 빈 바닥 공간이 있으면 바닥에 놓고, 다른 수납함이 이미 깔려 있으면 자동으로 그 위에 적층!
  function addBoxToActiveSpace(modelId, initialRot = 0) {
    const model = state.modelsMap[modelId];
    if (!model) return;

    const activePlan = getActivePlan();
    const compartments = window.PackerEngine.getCompartments(state.spaceConfig);
    const compIdx = state.spaceConfig.type === 'cabinet' ? state.activeCompartmentIdx : 0;
    const comp = compartments[compIdx] || compartments[0];
    const dims = window.PackerEngine.getOrientedDims(model, initialRot);

    let xMinBound = 0;
    if (state.spaceConfig.type === 'cabinet') {
      const cabConst = window.PackerEngine.getCabinetConstraints(state.spaceConfig);
      xMinBound = cabConst.leftDeadW;
    }

    let bestX = xMinBound;
    let bestZ = Math.max(0, comp.d - dims.d);
    let foundFloorSpot = false;

    // 1) 먼저 1층 바닥(y = 0)에 빈 자리가 있는지 탐색
    const step = 15;
    for (let z = comp.d - dims.d; z >= 0 && !foundFloorSpot; z -= step) {
      for (let x = xMinBound; x <= comp.w - dims.w && !foundFloorSpot; x += step) {
        const overlaps = activePlan.boxes.some((b) => {
          if (b.compartmentIndex !== compIdx) return false;
          const bm = state.modelsMap[b.modelId];
          if (!bm) return false;
          const bd = window.PackerEngine.getOrientedDims(bm, b.rot || 0);
          return x < b.x + bd.w - 4 && x + dims.w > b.x + 4 &&
                 z < b.z + bd.d - 4 && z + dims.d > b.z + 4;
        });
        if (!overlaps) {
          bestX = x;
          bestZ = z;
          foundFloorSpot = true;
        }
      }
    }

    // 2) 만약 바닥에 빈 자리가 없다면, 현재 칸에 있는 기존 수납함(같은 모델 우선, 그다음 가장 낮은 층)의 좌표를 찾아 그 위에 자동으로 쌓음!
    if (!foundFloorSpot) {
      const compBoxes = activePlan.boxes.filter((b) => b.compartmentIndex === compIdx);
      if (compBoxes.length > 0) {
        // 각 기존 박스 위치(x, z)에 쌓았을 때의 예상 높이를 계산하여 선반 높이를 넘지 않는 가장 낮은 곳 선택
        const candidates = compBoxes.map((b) => {
          const testBox = {
            id: 'temp',
            modelId: model.id,
            compartmentIndex: compIdx,
            x: b.x,
            z: b.z,
            rot: initialRot
          };
          const stackedY = window.PackerEngine.computeStackingY(
            state.spaceConfig,
            activePlan.boxes,
            testBox,
            state.modelsMap,
            ['temp']
          );
          const sameModelBonus = b.modelId === model.id ? -500 : 0;
          const fitsHeightBonus = (stackedY + dims.h <= comp.clearH) ? -2000 : 0;
          return { x: b.x, z: b.z, stackedY, score: stackedY + sameModelBonus + fitsHeightBonus };
        });
        candidates.sort((a, b) => a.score - b.score);
        bestX = Math.max(0, Math.min(comp.w - dims.w, candidates[0].x));
        bestZ = Math.max(0, Math.min(comp.d - dims.d, candidates[0].z));
      }
    }

    const newBox = {
      id: 'box-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      modelId: model.id,
      compartmentIndex: compIdx,
      x: Math.max(0, Math.min(comp.w - dims.w, bestX)),
      y: 0,
      z: Math.max(0, Math.min(comp.d - dims.d, bestZ)),
      rot: initialRot
    };

    // 해당 (x, z) 아래에 다른 수납함이 있으면 자동으로 그 위로 올라감!
    newBox.y = window.PackerEngine.computeStackingY(
      state.spaceConfig,
      activePlan.boxes,
      newBox,
      state.modelsMap,
      [newBox.id]
    );

    activePlan.boxes.push(newBox);
    state.selectedBoxIds = [newBox.id];
    refreshAll();
  }

  // 선택된 수납함 바로 위에 똑같은 수납함 1단 더 쌓기
  function stackOneMoreOnSelected() {
    const activePlan = getActivePlan();
    const selBoxes = activePlan.boxes.filter((b) => state.selectedBoxIds.includes(b.id));
    if (selBoxes.length === 0) return;

    const newIds = [];
    selBoxes.forEach((baseBox, i) => {
      const newBox = {
        id: `box-${Date.now()}-${i}`,
        modelId: baseBox.modelId,
        compartmentIndex: baseBox.compartmentIndex,
        x: baseBox.x,
        y: 0,
        z: baseBox.z,
        rot: baseBox.rot || 0
      };
      newBox.y = window.PackerEngine.computeStackingY(
        state.spaceConfig,
        activePlan.boxes,
        newBox,
        state.modelsMap,
        [newBox.id]
      );
      activePlan.boxes.push(newBox);
      newIds.push(newBox.id);
    });

    state.selectedBoxIds = newIds;
    refreshAll();
  }

  function moveSelectedBoxesToShelf(deltaIdx) {
    if (state.spaceConfig.type !== 'cabinet') return;
    if (state.selectedBoxIds.length === 0) return;

    const compartments = window.PackerEngine.getCompartments(state.spaceConfig);
    const activePlan = getActivePlan();
    const selBoxes = activePlan.boxes.filter((b) => state.selectedBoxIds.includes(b.id));
    if (selBoxes.length === 0) return;

    const currentCompIdx = selBoxes[0].compartmentIndex;
    const targetCompIdx = currentCompIdx + deltaIdx;
    if (targetCompIdx < 0 || targetCompIdx >= compartments.length) {
      alert(deltaIdx > 0 ? '더 이상 위에 선반 공간이 없습니다.' : '이미 가장 아래(1단) 선반 공간입니다.');
      return;
    }

    let minBaseY = Infinity;
    selBoxes.forEach((b) => { if ((b.y || 0) < minBaseY) minBaseY = b.y || 0; });
    if (!isFinite(minBaseY)) minBaseY = 0;

    selBoxes.forEach((b) => {
      b.compartmentIndex = targetCompIdx;
      b.y = Math.max(0, (b.y || 0) - minBaseY);
    });

    // 이동한 선반의 해당 위치에 이미 다른 박스가 있으면 자동으로 그 위로 올라감
    let maxSupportY = 0;
    selBoxes.forEach((b) => {
      const supY = window.PackerEngine.computeStackingY(
        state.spaceConfig,
        activePlan.boxes,
        b,
        state.modelsMap,
        state.selectedBoxIds
      );
      if (supY > maxSupportY) maxSupportY = supY;
    });
    selBoxes.forEach((b) => {
      b.y = Math.round((b.y || 0) + maxSupportY);
    });

    state.activeCompartmentIdx = targetCompIdx;
    refreshAll();
  }

  function rotateSelectedBoxes(deltaDeg) {
    const activePlan = getActivePlan();
    const selBoxes = activePlan.boxes.filter((b) => state.selectedBoxIds.includes(b.id));
    if (selBoxes.length === 0) return;

    const compartments = window.PackerEngine.getCompartments(state.spaceConfig);
    const comp = compartments[selBoxes[0].compartmentIndex] || compartments[0];

    if (selBoxes.length === 1) {
      const box = selBoxes[0];
      const model = state.modelsMap[box.modelId];
      if (!model) return;
      const oldDims = window.PackerEngine.getOrientedDims(model, box.rot || 0);
      const cx = box.x + oldDims.w / 2;
      const cz = box.z + oldDims.d / 2;
      const newRot = (((box.rot || 0) + deltaDeg) % 360 + 360) % 360;
      const newDims = window.PackerEngine.getOrientedDims(model, newRot);
      box.rot = newRot;
      box.x = Math.round(Math.max(0, Math.min(comp.w - newDims.w, cx - newDims.w / 2)));
      box.z = Math.round(Math.max(0, Math.min(comp.d - newDims.d, cz - newDims.d / 2)));
      box.y = window.PackerEngine.computeStackingY(
        state.spaceConfig,
        activePlan.boxes,
        box,
        state.modelsMap,
        [box.id]
      );
      refreshAll();
      return;
    }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minBaseY = Infinity;
    selBoxes.forEach((b) => {
      const m = state.modelsMap[b.modelId];
      if (!m) return;
      const d = window.PackerEngine.getOrientedDims(m, b.rot || 0);
      if (b.x < minX) minX = b.x;
      if (b.x + d.w > maxX) maxX = b.x + d.w;
      if (b.z < minZ) minZ = b.z;
      if (b.z + d.d > maxZ) maxZ = b.z + d.d;
      if ((b.y || 0) < minBaseY) minBaseY = b.y || 0;
    });
    if (!isFinite(minBaseY)) minBaseY = 0;

    const bundleCX = (minX + maxX) / 2;
    const bundleCZ = (minZ + maxZ) / 2;
    const sign = deltaDeg >= 0 ? 1 : -1;

    let newMinX = Infinity, newMaxX = -Infinity, newMinZ = Infinity, newMaxZ = -Infinity;
    selBoxes.forEach((b) => {
      const m = state.modelsMap[b.modelId];
      if (!m) return;
      const oldD = window.PackerEngine.getOrientedDims(m, b.rot || 0);
      const boxCX = b.x + oldD.w / 2;
      const boxCZ = b.z + oldD.d / 2;
      const relX = boxCX - bundleCX;
      const relZ = boxCZ - bundleCZ;

      const rotRelX = -sign * relZ;
      const rotRelZ = sign * relX;

      const newRot = (((b.rot || 0) + deltaDeg) % 360 + 360) % 360;
      const newD = window.PackerEngine.getOrientedDims(m, newRot);

      b.rot = newRot;
      b.x = Math.round(bundleCX + rotRelX - newD.w / 2);
      b.z = Math.round(bundleCZ + rotRelZ - newD.d / 2);
      if (b.x < newMinX) newMinX = b.x;
      if (b.x + newD.w > newMaxX) newMaxX = b.x + newD.w;
      if (b.z < newMinZ) newMinZ = b.z;
      if (b.z + newD.d > newMaxZ) newMaxZ = b.z + newD.d;
    });

    let shiftX = 0, shiftZ = 0;
    if (newMinX < 0) shiftX = -newMinX;
    else if (newMaxX > comp.w) shiftX = comp.w - newMaxX;
    if (newMinZ < 0) shiftZ = -newMinZ;
    else if (newMaxZ > comp.d) shiftZ = comp.d - newMaxZ;

    selBoxes.forEach((b) => {
      b.x = Math.round(b.x + shiftX);
      b.z = Math.round(b.z + shiftZ);
    });

    let maxSupportY = 0;
    selBoxes.forEach((b) => {
      const supY = window.PackerEngine.computeStackingY(
        state.spaceConfig,
        activePlan.boxes,
        b,
        state.modelsMap,
        state.selectedBoxIds
      );
      if (supY > maxSupportY) maxSupportY = supY;
    });
    selBoxes.forEach((b) => {
      b.y = Math.round(maxSupportY + Math.max(0, (b.y || 0) - minBaseY));
    });

    refreshAll();
  }

  function deleteSelectedBoxes() {
    if (state.selectedBoxIds.length === 0) return;
    const activePlan = getActivePlan();
    activePlan.boxes = activePlan.boxes.filter((b) => !state.selectedBoxIds.includes(b.id));
    state.selectedBoxIds = [];
    refreshAll();
  }

  // 좌상단 & 좌하단 아코디언 카드 렌더링
  function renderLeftAccordionCards() {
    const isCab = state.spaceConfig.type === 'cabinet';

    const spaceCard = document.getElementById('floating-space-card');
    spaceCard.classList.toggle('open', state.spaceCardOpen);
    document.getElementById('space-card-chevron').textContent = state.spaceCardOpen ? '∧' : '∨';
    document.getElementById('space-card-type-badge').textContent = isCab ? '장 형식' : '슬라이딩 서랍';

    const shelfCard = document.getElementById('floating-shelf-card');
    shelfCard.style.display = isCab ? 'flex' : 'none';
    shelfCard.classList.toggle('open', state.shelfCardOpen);
    document.getElementById('shelf-card-chevron').textContent = state.shelfCardOpen ? '∧' : '∨';
    document.getElementById('shelf-count-badge').textContent = `선반 ${state.spaceConfig.cabinet.shelves.length}개`;

    document.getElementById('card-type-cabinet').classList.toggle('active', isCab);
    document.getElementById('card-type-drawer').classList.toggle('active', !isCab);

    document.getElementById('cabinet-config-section').style.display = isCab ? 'block' : 'none';
    document.getElementById('drawer-config-section').style.display = !isCab ? 'block' : 'none';
    document.getElementById('hud-drawer-controls').style.display = !isCab ? 'flex' : 'none';

    if (isCab) {
      const c = state.spaceConfig.cabinet;
      setInputValue('cab-w', c.w);
      setInputValue('cab-d', c.d);
      setInputValue('cab-h', c.h);
      setInputValue('cab-left-frame', c.leftFrameW);
      setInputValue('cab-right-frame', c.rightFrameW);
      setInputValue('cab-top-frame', c.topFrameH);
      setInputValue('cab-bot-frame', c.bottomFrameH);
      setInputValue('cab-door-type', c.doorType);
      setInputValue('cab-hinge-w', c.hingeClearanceW);

      const isNoFrame = c.leftFrameW === 0 && c.rightFrameW === 0 && c.topFrameH === 0 && c.bottomFrameH === 0;
      const clearFrameBtn = document.getElementById('btn-clear-doorframe');
      if (clearFrameBtn) {
        clearFrameBtn.textContent = isNoFrame ? '🔄 기본 문틀 복원' : '문틀 없음(0)';
      }

      const hasDoors = c.doorType && c.doorType !== 'none';
      const angleWrapper = document.getElementById('door-angle-wrapper');
      const anglePanel = document.getElementById('door-angle-panel');
      const angleBadge = document.getElementById('door-angle-badge');
      const angleSlider = document.getElementById('cab-door-angle-slider');
      const angleVal = document.getElementById('cab-door-angle-val');
      if (angleWrapper) {
        angleWrapper.style.opacity = hasDoors ? '1' : '0.5';
        if (angleBadge) {
          angleBadge.textContent = hasDoors
            ? `${state.doorOpenAngle}° ${state.doorAnglePanelOpen ? '▴' : '▾'}`
            : '문 없음';
        }
        if (anglePanel) {
          anglePanel.style.display = (hasDoors && state.doorAnglePanelOpen) ? 'flex' : 'none';
        }
        if (angleSlider && document.activeElement !== angleSlider) {
          angleSlider.value = state.doorOpenAngle;
        }
        if (angleVal) {
          angleVal.textContent = `${state.doorOpenAngle}°`;
        }
      }

      const cabConst = window.PackerEngine.getCabinetConstraints(state.spaceConfig);
      document.getElementById('cab-opening-summary').innerHTML =
        `유효 문 개구부: <strong>${cabConst.doorClearW} × ${cabConst.doorClearH} mm</strong> ` +
        `(좌 사각지대 ${cabConst.leftDeadW}mm / 우 사각지대 ${cabConst.rightDeadW}mm)`;

      const shelfListEl = document.getElementById('shelf-list');
      shelfListEl.innerHTML = '';
      c.shelves.forEach((sh, idx) => {
        const row = document.createElement('div');
        row.className = 'shelf-item';
        row.innerHTML = `
          <span>선반 ${idx + 1} 높이</span>
          <input type="number" class="input-box shelf-y-input" data-idx="${idx}" value="${sh.bottomY}" step="10" />
          <span style="display:flex;align-items:center;gap:4px;">두께 <input type="number" class="input-box shelf-t-input" data-idx="${idx}" value="${sh.thickness}" step="2" style="width:48px;" /></span>
          <button class="btn btn-danger btn-sm shelf-del-btn" data-idx="${idx}">✕</button>
        `;
        shelfListEl.appendChild(row);
      });

      shelfListEl.querySelectorAll('.shelf-y-input').forEach((inp) => {
        inp.addEventListener('change', (e) => {
          const i = Number(e.target.dataset.idx);
          c.shelves[i].bottomY = Math.max(30, Math.min(c.h - 30, Number(e.target.value) || 100));
          refreshAll();
        });
      });

      shelfListEl.querySelectorAll('.shelf-t-input').forEach((inp) => {
        inp.addEventListener('change', (e) => {
          const i = Number(e.target.dataset.idx);
          c.shelves[i].thickness = Math.max(5, Math.min(60, Number(e.target.value) || 18));
          refreshAll();
        });
      });

      shelfListEl.querySelectorAll('.shelf-del-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const i = Number(e.target.dataset.idx);
          c.shelves.splice(i, 1);
          if (state.activeCompartmentIdx > c.shelves.length) {
            state.activeCompartmentIdx = c.shelves.length;
          }
          refreshAll();
        });
      });
    } else {
      const d = state.spaceConfig.drawer;
      setInputValue('drw-w', d.w);
      setInputValue('drw-d', d.d);
      setInputValue('drw-exposed-d', d.exposedD);
      setInputValue('drw-h', d.h);
      setInputValue('drw-clearance-h', d.clearanceH);

      const drwConst = window.PackerEngine.getDrawerConstraints(state.spaceConfig);
      const ratioPct = Math.round((drwConst.exposedD / drwConst.totalD) * 100);
      document.getElementById('drw-exposure-summary').innerHTML =
        `노출 구간: <strong style="color:#3b8a64">${drwConst.exposedD}mm (${ratioPct}%)</strong> / ` +
        `안쪽 미노출 구간: <strong style="color:#d97706">${drwConst.unexposedD}mm (${100 - ratioPct}%)</strong>`;
    }
  }

  function setInputValue(id, val) {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) {
      el.value = val;
    }
  }

  function renderPlanTabs() {
    const listEl = document.getElementById('plan-tabs-list');
    listEl.innerHTML = '';
    state.plans.forEach((plan) => {
      const btn = document.createElement('button');
      btn.className = 'plan-tab' + (plan.id === state.activePlanId ? ' active' : '');
      btn.textContent = plan.name;
      btn.addEventListener('click', () => {
        state.activePlanId = plan.id;
        state.selectedBoxIds = [];
        refreshAll();
      });
      listEl.appendChild(btn);
    });
  }

  // 3D 가구 우측에 연결선과 함께 떠 있는 선반 공간 콜아웃 카드 및 클릭 시 펼쳐지는 확장 패널 (샘플 이미지 1, 2, 3 구현)
  function renderShelfCalloutCards() {
    const compartments = window.PackerEngine.getCompartments(state.spaceConfig);
    if (state.activeCompartmentIdx >= compartments.length) {
      state.activeCompartmentIdx = Math.max(0, compartments.length - 1);
    }

    const activePlan = getActivePlan();
    const areaEl = document.getElementById('shelf-callouts-area');
    areaEl.innerHTML = '';

    const displayComps = [...compartments].reverse();
    displayComps.forEach((comp) => {
      const compBoxes = activePlan.boxes.filter((b) => b.compartmentIndex === comp.index);
      const isSelected = comp.index === state.activeCompartmentIdx;
      // 모바일 모드에서는 현재 활성화된 칸이 기본적으로 패널에 펼쳐져 직관적으로 조작 가능
      const isExpanded = (state.uiMode === 'mobile')
        ? isSelected
        : comp.index === state.expandedCompartmentIdx;

      const wrapper = document.createElement('div');
      wrapper.className = 'shelf-callout-wrapper' +
        (isSelected ? ' active' : '') +
        (isExpanded ? ' expanded' : '');

      const card = document.createElement('div');
      card.id = `shelf-callout-card-${comp.index}`;
      card.className = 'shelf-callout-card';
      card.innerHTML = `
        <div class="shelf-callout-top">
          <div class="shelf-callout-title">
            <span>📁 ${comp.name}</span>
          </div>
          <span class="badge">${compBoxes.length}개 배치됨</span>
        </div>
        <div class="shelf-callout-dims">내경 가로 ${comp.w} × 깊이 ${comp.d} × 유효높이 ${comp.clearH} mm</div>
      `;

      card.addEventListener('click', () => {
        state.activeCompartmentIdx = comp.index;
        if (state.expandedCompartmentIdx === comp.index) {
          state.expandedCompartmentIdx = null; // 다시 클릭하면 깔끔하게 접힘
        } else {
          state.expandedCompartmentIdx = comp.index;
        }
        refreshAll();
      });

      wrapper.appendChild(card);

      // 클릭 후 모습 (샘플 이미지 3): 해당 선반 공간 카드 바로 아래에 관리 패널이 펼쳐짐!
      if (isExpanded) {
        const panel = document.createElement('div');
        panel.className = 'shelf-expanded-panel';

        const isPlacedTab = state.rightSubTab === 'placed';
        const brands = [...new Set(state.catalogModels.map((m) => m.brand))];
        if (!brands.includes(state.autofillSingleBrand) && brands.length > 0) {
          state.autofillSingleBrand = brands[0];
        }
        const singleBrandModels = state.catalogModels.filter((m) => m.brand === state.autofillSingleBrand);
        if (singleBrandModels.length > 0 && !singleBrandModels.some((m) => m.id === state.selectedCatalogModelId)) {
          state.selectedCatalogModelId = singleBrandModels[0].id;
        }

        panel.innerHTML = `
          <button class="btn btn-primary btn-lg-cta exp-open-picker-btn">
            ➕ 이 공간에 수납함 / 저장 조합 추가
          </button>

          <div class="right-subtabs">
            <button class="subtab-btn exp-tab-placed ${isPlacedTab ? 'active' : ''}">📋 현재 공간 배치 목록</button>
            <button class="subtab-btn exp-tab-combos ${!isPlacedTab ? 'active' : ''}">⭐ 저장된 조합 탭 (${state.savedCombos.length})</button>
          </div>

          <div class="exp-placed-section" style="display:${isPlacedTab ? 'block' : 'none'};">
            <div style="font-size:0.7rem;color:var(--text-sub);margin-bottom:4px;">
              💡 목록에서도 <strong>Shift + 클릭</strong>으로 여러 개를 묶음 선택할 수 있습니다.
            </div>
            <div class="placed-mini-list exp-placed-list"></div>
          </div>

          <div class="exp-combos-section" style="display:${!isPlacedTab ? 'block' : 'none'};">
            <div class="saved-combo-list exp-combo-list"></div>
          </div>

          <div style="border-top:1px solid var(--border);padding-top:8px;">
            <button type="button" class="btn exp-toggle-autofill-btn" style="width:100%;justify-content:space-between;background:${state.autofillPanelOpen ? '#f3e5d3' : '#faf5eb'};border-color:#d5c3aa;color:#5c4228;font-weight:700;">
              <span>⚡ 자동 채우기 기능 (조건별 일괄 배치)</span>
              <span style="color:#b86b43;font-weight:800;">${state.autofillPanelOpen ? '접기 ∧' : '열기 ∨'}</span>
            </button>

            <div class="exp-autofill-body" style="display:${state.autofillPanelOpen ? 'flex' : 'none'};flex-direction:column;gap:7px;margin-top:8px;padding:10px;background:#faf5ec;border:1px solid #e3d5c1;border-radius:8px;">
              <div class="form-group">
                <label>자동 채우기 방식</label>
                <select class="exp-autofill-mode">
                  <option value="single" ${state.autofillMode === 'single' ? 'selected' : ''}>특정 수납함 1종류로 이 공간 최대 채우기</option>
                  <option value="brand_mix" ${state.autofillMode === 'brand_mix' ? 'selected' : ''}>특정 브랜드 다중 사이즈 조합으로 채우기</option>
                </select>
              </div>

              <div class="exp-single-group" style="display:${state.autofillMode === 'single' ? 'flex' : 'none'};flex-direction:column;gap:6px;">
                <div class="form-group">
                  <label>1. 채울 수납함 브랜드 선택</label>
                  <select class="exp-autofill-single-brand">
                    ${brands.map((b) => `<option value="${b}" ${b === state.autofillSingleBrand ? 'selected' : ''}>${b}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>2. 상세 규격 선택 (${state.autofillSingleBrand})</label>
                  <select class="exp-autofill-model">
                    ${singleBrandModels.map((m) => `<option value="${m.id}" ${m.id === state.selectedCatalogModelId ? 'selected' : ''}>[${m.lineup}] ${m.name} (${m.wTop}×${m.dTop}×H${m.h}mm)</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="form-group exp-brand-group" style="display:${state.autofillMode === 'brand_mix' ? 'flex' : 'none'};">
                <label>조합할 브랜드 선택</label>
                <select class="exp-autofill-brand">
                  ${brands.map((b) => `<option value="${b}" ${b === state.autofillBrand ? 'selected' : ''}>${b}</option>`).join('')}
                </select>
              </div>

              <label class="checkbox-row">
                <input type="checkbox" class="exp-chk-deadzone" ${state.autofillAvoidDeadzone ? 'checked' : ''} />
                <span>${state.spaceConfig.type === 'cabinet' ? '문설주 및 경첩 사각지대 피해서 채우기' : '서랍 안쪽 미노출 구역 피해서 채우기'}</span>
              </label>
              <label class="checkbox-row">
                <input type="checkbox" class="exp-chk-rotate" ${state.autofillRotate ? 'checked' : ''} />
                <span>90° 회전 배치 허용 (자투리 공간 활용)</span>
              </label>
              <label class="checkbox-row">
                <input type="checkbox" class="exp-chk-stack" ${state.autofillStack ? 'checked' : ''} />
                <span>적층 가능 모델은 높이 한도까지 위로 자동 쌓기</span>
              </label>

              <button class="btn exp-run-autofill-btn" style="width:100%;margin-top:4px;border-color:var(--accent);background:#fff;color:var(--accent);font-weight:800;">
                ⚡ 현재 선택된 공간에 자동 채우기 실행
              </button>
            </div>
          </div>
        `;

        // 이벤트 바인딩
        panel.querySelector('.exp-open-picker-btn').addEventListener('click', () => {
          renderPickerModalContent();
          document.getElementById('modal-box-picker').classList.add('open');
        });

        panel.querySelector('.exp-tab-placed').addEventListener('click', () => {
          state.rightSubTab = 'placed';
          renderShelfCalloutCards();
        });

        panel.querySelector('.exp-tab-combos').addEventListener('click', () => {
          state.rightSubTab = 'combos';
          renderShelfCalloutCards();
        });

        // 현재 공간 배치 목록 채우기
        const miniListEl = panel.querySelector('.exp-placed-list');
        const isMultiBundle = state.selectedBoxIds.length >= 2;
        if (compBoxes.length === 0) {
          miniListEl.innerHTML = `<div style="font-size:0.72rem;color:var(--text-muted);padding:4px;">배치된 수납함이 없습니다.</div>`;
        } else {
          compBoxes.forEach((box) => {
            const model = state.modelsMap[box.modelId];
            if (!model) return;
            const dims = window.PackerEngine.getOrientedDims(model, box.rot || 0);
            const isSel = state.selectedBoxIds.includes(box.id);
            const layerTag = (box.y || 0) > 5 ? ` · 높이+${box.y}mm` : '';

            const item = document.createElement('div');
            item.className = 'placed-mini-item' + (isSel ? (isMultiBundle ? ' in-bundle' : ' active') : '');
            item.innerHTML = `
              <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                <strong>[${model.brand}]</strong> ${model.name} <span style="color:var(--text-muted);">(${dims.w}×${dims.d}${layerTag})</span>
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0;">
                <button class="btn btn-sm mini-rot-btn" title="90° 회전">↻</button>
                <button class="btn btn-danger btn-sm mini-del-btn" title="삭제">✕</button>
              </div>
            `;
            item.addEventListener('click', (e) => {
              if (e.shiftKey || state.touchMultiSelectMode) {
                handleBoxInteraction(box.id, { type: 'shift_toggle' });
              } else if (state.selectedBoxIds.length >= 2 && state.selectedBoxIds.includes(box.id)) {
                handleBoxInteraction(box.id, { type: 'unbundle_to_single' });
              } else {
                state.selectedBoxIds = [box.id];
                refreshAll();
              }
            });
            item.querySelector('.mini-rot-btn').addEventListener('click', (e) => {
              e.stopPropagation();
              state.selectedBoxIds = [box.id];
              rotateSelectedBoxes(90);
            });
            item.querySelector('.mini-del-btn').addEventListener('click', (e) => {
              e.stopPropagation();
              activePlan.boxes = activePlan.boxes.filter((b) => b.id !== box.id);
              state.selectedBoxIds = state.selectedBoxIds.filter((id) => id !== box.id);
              refreshAll();
            });
            miniListEl.appendChild(item);
          });
        }

        // 저장된 조합 탭 채우기
        const comboListEl = panel.querySelector('.exp-combo-list');
        if (state.savedCombos.length === 0) {
          comboListEl.innerHTML = `<div style="font-size:0.72rem;color:var(--text-muted);padding:4px;">저장된 조합이 없습니다.</div>`;
        } else {
          state.savedCombos.forEach((combo) => {
            const fitsSize = combo.totalW <= comp.w && combo.totalD <= comp.d && combo.maxH <= comp.clearH;
            const cCard = document.createElement('div');
            cCard.className = 'saved-combo-card';
            cCard.innerHTML = `
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:0.75rem;">⭐ ${combo.name}</div>
                <div style="font-size:0.68rem;color:var(--text-sub);">
                  ${combo.items.length}개 · ${combo.totalW}×${combo.totalD}×H${combo.maxH}mm
                  <span style="color:${fitsSize ? '#047857' : '#b91c1c'};font-weight:700;">${fitsSize ? '(적합)' : '(초과)'}</span>
                </div>
              </div>
              <div style="display:flex;gap:4px;">
                <button class="btn btn-primary btn-sm c-ins-btn">+ 투입</button>
                <button class="btn btn-danger btn-sm c-del-btn">✕</button>
              </div>
            `;
            cCard.querySelector('.c-ins-btn').addEventListener('click', () => insertSavedComboToActiveSpace(combo.id));
            cCard.querySelector('.c-del-btn').addEventListener('click', () => deleteSavedCombo(combo.id));
            comboListEl.appendChild(cCard);
          });
        }

        // 자동 채우기 열기/접기 토글 및 내부 이벤트
        panel.querySelector('.exp-toggle-autofill-btn').addEventListener('click', () => {
          state.autofillPanelOpen = !state.autofillPanelOpen;
          renderShelfCalloutCards();
        });

        panel.querySelector('.exp-autofill-mode').addEventListener('change', (e) => {
          state.autofillMode = e.target.value;
          renderShelfCalloutCards();
        });
        panel.querySelector('.exp-autofill-single-brand')?.addEventListener('change', (e) => {
          state.autofillSingleBrand = e.target.value;
          const bModels = state.catalogModels.filter((m) => m.brand === state.autofillSingleBrand);
          if (bModels.length > 0) {
            state.selectedCatalogModelId = bModels[0].id;
          }
          renderShelfCalloutCards();
        });
        panel.querySelector('.exp-autofill-model')?.addEventListener('change', (e) => {
          state.selectedCatalogModelId = e.target.value;
        });
        panel.querySelector('.exp-autofill-brand')?.addEventListener('change', (e) => {
          state.autofillBrand = e.target.value;
        });
        panel.querySelector('.exp-chk-deadzone').addEventListener('change', (e) => {
          state.autofillAvoidDeadzone = e.target.checked;
        });
        panel.querySelector('.exp-chk-rotate').addEventListener('change', (e) => {
          state.autofillRotate = e.target.checked;
        });
        panel.querySelector('.exp-chk-stack').addEventListener('change', (e) => {
          state.autofillStack = e.target.checked;
        });
        panel.querySelector('.exp-run-autofill-btn').addEventListener('click', () => {
          const generated = window.PackerEngine.autoFill(
            state.spaceConfig,
            {
              mode: state.autofillMode,
              modelId: state.selectedCatalogModelId,
              brand: state.autofillBrand,
              compartmentIndex: comp.index,
              avoidDeadzone: state.autofillAvoidDeadzone,
              allowRotation: state.autofillRotate,
              allowStacking: state.autofillStack
            },
            state.catalogModels,
            state.modelsMap
          );
          activePlan.boxes = activePlan.boxes.filter((b) => b.compartmentIndex !== comp.index).concat(generated);
          state.selectedBoxIds = generated.length > 0 ? [generated[0].id] : [];
          refreshAll();
        });

        wrapper.appendChild(panel);
      }

      areaEl.appendChild(wrapper);
    });
  }

  // 팝업 모달 내부 렌더링
  function renderPickerModalContent() {
    const compartments = window.PackerEngine.getCompartments(state.spaceConfig);
    const compIdx = state.spaceConfig.type === 'cabinet' ? state.activeCompartmentIdx : 0;
    const activeComp = compartments[compIdx] || compartments[0];

    document.getElementById('picker-target-space-badge').textContent =
      `배치할 위치: ${activeComp.name} (내경 ${activeComp.w}×${activeComp.d}×높이 ${activeComp.clearH}mm)`;

    const tabsEl = document.getElementById('picker-brand-tabs');
    tabsEl.innerHTML = '';

    const comboTabBtn = document.createElement('button');
    comboTabBtn.className = 'brand-tab-btn combo-tab' + (state.pickerBrand === 'COMBOS' ? ' active' : '');
    comboTabBtn.textContent = `⭐ 저장된 조합 (${state.savedCombos.length})`;
    comboTabBtn.addEventListener('click', () => {
      state.pickerBrand = 'COMBOS';
      renderPickerModalContent();
    });
    tabsEl.appendChild(comboTabBtn);

    const brands = ['ALL', ...new Set(state.catalogModels.map((m) => m.brand))];
    brands.forEach((b) => {
      const btn = document.createElement('button');
      btn.className = 'brand-tab-btn' + (state.pickerBrand === b ? ' active' : '');
      btn.textContent = b === 'ALL' ? '전체 브랜드' : b;
      btn.addEventListener('click', () => {
        state.pickerBrand = b;
        renderPickerModalContent();
      });
      tabsEl.appendChild(btn);
    });

    const gridEl = document.getElementById('picker-cards-grid');
    gridEl.innerHTML = '';

    if (state.pickerBrand === 'COMBOS') {
      const filteredCombos = state.savedCombos.filter((c) => {
        if (!state.pickerSearch) return true;
        return c.name.toLowerCase().includes(state.pickerSearch.toLowerCase());
      });

      if (filteredCombos.length === 0) {
        gridEl.innerHTML = `<div style="grid-column:1/-1;padding:24px;text-align:center;color:var(--text-sub);">저장된 조합이 없습니다.</div>`;
        return;
      }

      filteredCombos.forEach((combo) => {
        const fits = combo.totalW <= activeComp.w && combo.totalD <= activeComp.d && combo.maxH <= activeComp.clearH;
        const svgHtml = window.getComboThumbnailSVG ? window.getComboThumbnailSVG(combo, state.modelsMap) : '';
        const itemNames = combo.items
          .map((it) => state.modelsMap[it.modelId]?.name || it.modelId)
          .slice(0, 3)
          .join(', ') + (combo.items.length > 3 ? ` 외 ${combo.items.length - 3}개` : '');

        const card = document.createElement('div');
        card.className = 'picker-card';
        card.innerHTML = `
          <div class="picker-thumb">
            <span class="picker-brand-badge" style="background:#b45309;">⭐ 저장된 묶음 조합</span>
            <span class="picker-fit-badge ${fits ? 'fit-ok' : 'fit-warn'}">${fits ? '✓ 현재 공간 투입 가능' : '⚠️ 공간 크기 확인'}</span>
            ${svgHtml}
          </div>
          <div class="picker-body">
            <div class="picker-lineup">총 ${combo.items.length}개 수납함 구성</div>
            <div class="picker-title">${combo.name}</div>
            <div class="picker-spec-box">
              <strong>묶음 전체 규격:</strong> 가로 ${combo.totalW} × 깊이 ${combo.totalD} × 최대높이 ${combo.maxH} mm<br>
              <span style="font-size:0.7rem;color:var(--text-muted);">구성: ${itemNames}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr auto;gap:6px;margin-top:8px;">
              <button class="btn btn-primary btn-sm combo-pick-insert">+ 이 공간에 조합 투입</button>
              <button class="btn btn-danger btn-sm combo-pick-del">삭제</button>
            </div>
          </div>
        `;

        card.querySelector('.combo-pick-insert').addEventListener('click', () => {
          insertSavedComboToActiveSpace(combo.id);
          document.getElementById('modal-box-picker').classList.remove('open');
        });
        card.querySelector('.combo-pick-del').addEventListener('click', () => {
          deleteSavedCombo(combo.id);
          renderPickerModalContent();
        });
        gridEl.appendChild(card);
      });
      return;
    }

    const filtered = state.catalogModels.filter((m) => {
      if (state.pickerBrand !== 'ALL' && m.brand !== state.pickerBrand) return false;
      if (state.pickerSearch) {
        const q = state.pickerSearch.toLowerCase();
        const match =
          m.name.toLowerCase().includes(q) ||
          m.brand.toLowerCase().includes(q) ||
          m.lineup.toLowerCase().includes(q) ||
          `${m.wTop}x${m.dTop}`.includes(q);
        if (!match) return false;
      }
      return true;
    });

    filtered.forEach((model) => {
      const fitInfo = window.PackerEngine.checkModelFitForCompartment(state.spaceConfig, compIdx, model);
      const isTapered = model.shapeType === 'tapered' && (model.wBot !== model.wTop || model.dBot !== model.dTop);
      const specHtml = isTapered
        ? `<strong>외경 규격:</strong> 가로 ${model.wTop} × 깊이 ${model.dTop} × 높이 ${model.h} mm<br><span style="font-size:0.7rem;">(바닥 하단: ${model.wBot} × ${model.dBot} mm)</span>`
        : `<strong>외경 규격:</strong> 가로 ${model.wTop} × 깊이 ${model.dTop} × 높이 ${model.h} mm`;

      const svgHtml = window.getProductThumbnailSVG ? window.getProductThumbnailSVG(model) : '';

      const card = document.createElement('div');
      card.className = 'picker-card';
      card.innerHTML = `
        <div class="picker-thumb">
          <span class="picker-brand-badge">${model.brand}</span>
          <span class="picker-fit-badge ${fitInfo.ok ? 'fit-ok' : 'fit-warn'}">${fitInfo.reason}</span>
          ${svgHtml}
        </div>
        <div class="picker-body">
          <div class="picker-lineup">${model.lineup}</div>
          <div class="picker-title">${model.name}</div>
          <div class="picker-spec-box">${specHtml}</div>
          <div class="picker-tags">
            <span class="mini-tag">${window.SHAPE_TYPE_LABELS[model.shapeType] || '직육면체'}</span>
            <span class="mini-tag">${window.ACCESS_TYPE_LABELS[model.accessType] || '상단 오픈형'}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:6px;margin-top:8px;">
            <button class="btn btn-primary btn-sm pick-add-normal">+ 이 공간에 추가</button>
            <button class="btn btn-sm pick-add-rot" title="90도 회전한 상태로 추가">↻ 90° 회전 추가</button>
          </div>
        </div>
      `;

      card.querySelector('.pick-add-normal').addEventListener('click', () => {
        state.selectedCatalogModelId = model.id;
        addBoxToActiveSpace(model.id, 0);
        document.getElementById('modal-box-picker').classList.remove('open');
      });

      card.querySelector('.pick-add-rot').addEventListener('click', () => {
        state.selectedCatalogModelId = model.id;
        addBoxToActiveSpace(model.id, 90);
        document.getElementById('modal-box-picker').classList.remove('open');
      });

      gridEl.appendChild(card);
    });
  }

  function renderSelectedBoxInspector() {
    const hud = document.getElementById('selected-box-hud');
    const activePlan = getActivePlan();
    const selBoxes = activePlan.boxes.filter((b) => state.selectedBoxIds.includes(b.id));

    if (selBoxes.length === 0) {
      hud.style.display = 'none';
      return;
    }

    hud.style.display = 'flex';
    const isCab = state.spaceConfig.type === 'cabinet';
    document.getElementById('btn-box-shelf-up').style.display = isCab ? 'inline-flex' : 'none';
    document.getElementById('btn-box-shelf-down').style.display = isCab ? 'inline-flex' : 'none';

    const saveComboBtn = document.getElementById('btn-box-save-combo');

    if (selBoxes.length === 1) {
      saveComboBtn.style.display = 'none';
      const box = selBoxes[0];
      const model = state.modelsMap[box.modelId];
      if (!model) return;
      const dims = window.PackerEngine.getOrientedDims(model, box.rot || 0);
      const yInfo = (box.y || 0) > 0 ? ` · 바닥에서 +${box.y}mm 적층됨` : '';
      document.getElementById('sel-box-title').innerHTML =
        `<strong>[${model.brand}] ${model.name}</strong> ` +
        `<span style="color:var(--text-sub);font-size:0.74rem;">(${dims.w}×${dims.d}×H${dims.h}mm, ${box.rot || 0}°${yInfo})</span>`;
    } else {
      saveComboBtn.style.display = 'inline-flex';
      document.getElementById('sel-box-title').innerHTML =
        `<strong style="color:#b45309;">📦 묶음 선택됨 (${selBoxes.length}개)</strong>`;
    }
  }

  function renderWarningsBanner() {
    const activePlan = getActivePlan();
    const val = window.PackerEngine.validatePlan(state.spaceConfig, activePlan.boxes, state.modelsMap);
    const container = document.getElementById('warnings-list');
    const tabTitle = document.getElementById('error-code-tab-title');
    container.innerHTML = '';

    const mobileErrLabel = document.getElementById('mobile-nav-err-label');

    if (val.messages.length === 0) {
      tabTitle.textContent = `에러코드 (이상 없음 ✓)`;
      if (mobileErrLabel) mobileErrLabel.textContent = `에러(0)`;
      const okDiv = document.createElement('div');
      okDiv.className = 'alert-item alert-ok';
      okDiv.textContent = `✓ 모든 수납함이 문설주·경첩·높이 간섭 없이 정상 배치되었습니다.`;
      container.appendChild(okDiv);
      return;
    }

    tabTitle.textContent = `에러코드 (${val.messages.length})`;
    if (mobileErrLabel) mobileErrLabel.textContent = `에러(${val.messages.length})`;
    val.messages.forEach((m) => {
      const div = document.createElement('div');
      div.className = 'alert-item ' + (m.severity === 'error' ? 'alert-error' : 'alert-warn');
      div.textContent = (m.severity === 'error' ? '⛔ ' : '⚠️ ') + m.text;
      div.style.cursor = 'pointer';
      div.addEventListener('click', () => {
        if (m.boxId) {
          state.selectedBoxIds = [m.boxId];
          refreshAll();
        }
      });
      container.appendChild(div);
    });
  }

  function renderComparisonTable() {
    const tbody = document.getElementById('comparison-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    state.plans.forEach((plan) => {
      const metrics = window.PackerEngine.calculatePlanMetrics(
        state.spaceConfig,
        plan.boxes,
        state.modelsMap
      );
      const tr = document.createElement('tr');
      if (plan.id === state.activePlanId) tr.className = 'active-row';

      const statusBadge = metrics.errorCount > 0
        ? `<span style="color:#c94a4a;font-weight:700;">오류 ${metrics.errorCount}</span>`
        : metrics.warnCount > 0
        ? `<span style="color:#d97706;font-weight:700;">주의 ${metrics.warnCount}</span>`
        : `<span style="color:#3b8a64;font-weight:700;">적합</span>`;

      tr.innerHTML = `
        <td style="text-align:left;cursor:pointer;font-weight:700;">${plan.name}</td>
        <td>${metrics.totalCount}개</td>
        <td><strong>${metrics.areaPercent}%</strong> (체적 ${metrics.volPercent}%)</td>
        <td>가로 ${metrics.remW} / 깊이 ${metrics.remD}</td>
        <td>${statusBadge}</td>
      `;
      tr.addEventListener('click', () => {
        state.activePlanId = plan.id;
        state.selectedBoxIds = [];
        document.getElementById('modal-report-table').classList.remove('open');
        refreshAll();
      });
      tbody.appendChild(tr);
    });
  }

  function setUIMode(mode) {
    state.uiMode = mode;
    document.body.classList.toggle('ui-mode-mobile', mode === 'mobile');
    document.body.classList.toggle('ui-mode-pc', mode === 'pc');
    document.getElementById('btn-mode-mobile')?.classList.toggle('active', mode === 'mobile');
    document.getElementById('btn-mode-pc')?.classList.toggle('active', mode === 'pc');

    // 모바일 모드 진입 시 선반 탭 기본 활성화
    if (mode === 'mobile') {
      document.body.setAttribute('data-active-mtab', state.activeMobileTab || 'shelves');
    } else {
      document.body.removeAttribute('data-active-mtab');
    }

    renderShelfCalloutCards();
    setTimeout(() => {
      window.Scene3DManager.resize();
    }, 60);
  }

  function setActiveMobileTab(tabKey) {
    state.activeMobileTab = tabKey;
    state.mobileSheetCollapsed = false;
    document.body.classList.remove('mobile-sheet-collapsed');
    document.body.setAttribute('data-active-mtab', tabKey);

    document.querySelectorAll('.mobile-nav-tab[data-mtab]').forEach((t) => {
      t.classList.toggle('active', t.dataset.mtab === tabKey);
    });

    const chevron = document.getElementById('mobile-sheet-chevron');
    if (chevron) chevron.textContent = '🔽';

    renderShelfCalloutCards();
    setTimeout(() => {
      window.Scene3DManager.resize();
    }, 60);
  }

  function toggleMobileSheet() {
    state.mobileSheetCollapsed = !state.mobileSheetCollapsed;
    document.body.classList.toggle('mobile-sheet-collapsed', state.mobileSheetCollapsed);
    const chevron = document.getElementById('mobile-sheet-chevron');
    if (chevron) {
      chevron.textContent = state.mobileSheetCollapsed ? '🔼' : '🔽';
    }
    setTimeout(() => {
      window.Scene3DManager.resize();
    }, 60);
  }

  function bindEvents() {
    // 0. PC / 모바일 UI 모드 스위처 (디폴트: 모바일!)
    document.getElementById('btn-mode-mobile')?.addEventListener('click', () => setUIMode('mobile'));
    document.getElementById('btn-mode-pc')?.addEventListener('click', () => setUIMode('pc'));

    // 모바일 탭 네비게이션 바 바인딩
    document.querySelectorAll('.mobile-nav-tab[data-mtab]').forEach((btn) => {
      btn.addEventListener('click', () => setActiveMobileTab(btn.dataset.mtab));
    });
    document.getElementById('btn-mobile-sheet-toggle')?.addEventListener('click', toggleMobileSheet);

    // 좌상단 & 좌하단 아코디언 토글
    document.getElementById('btn-toggle-space-card').addEventListener('click', () => {
      state.spaceCardOpen = !state.spaceCardOpen;
      renderLeftAccordionCards();
    });

    document.getElementById('btn-toggle-shelf-card').addEventListener('click', () => {
      state.shelfCardOpen = !state.shelfCardOpen;
      renderLeftAccordionCards();
    });

    // 중앙 상단 How to use 토글
    document.getElementById('btn-how-to-use').addEventListener('click', () => {
      state.howToUseOpen = !state.howToUseOpen;
      document.getElementById('how-to-use-popover').classList.toggle('open', state.howToUseOpen);
      document.getElementById('btn-how-to-use').classList.toggle('active', state.howToUseOpen);
    });
    document.getElementById('btn-close-howto').addEventListener('click', () => {
      state.howToUseOpen = false;
      document.getElementById('how-to-use-popover').classList.remove('open');
      document.getElementById('btn-how-to-use').classList.remove('active');
    });

    // 우측 하단 에러코드 토글
    document.getElementById('btn-toggle-error-dock').addEventListener('click', () => {
      state.errorDockCollapsed = !state.errorDockCollapsed;
      document.getElementById('error-code-dock').classList.toggle('collapsed', state.errorDockCollapsed);
    });

    // 스마트폰 터치 묶음선택 모드 토글
    const touchBtn = document.getElementById('btn-touch-multiselect');
    touchBtn.addEventListener('click', () => {
      state.touchMultiSelectMode = !state.touchMultiSelectMode;
      touchBtn.textContent = state.touchMultiSelectMode ? '🔗 터치 묶음선택: ON' : '🔗 터치 묶음선택: OFF';
      touchBtn.classList.toggle('btn-warning', state.touchMultiSelectMode);
      refreshAll();
    });

    // 1. 공간 유형 선택
    document.getElementById('card-type-cabinet').addEventListener('click', () => {
      state.spaceConfig.type = 'cabinet';
      state.selectedBoxIds = [];
      refreshAll();
      window.Scene3DManager.setCameraView('iso');
    });

    document.getElementById('card-type-drawer').addEventListener('click', () => {
      state.spaceConfig.type = 'drawer';
      state.activeCompartmentIdx = 0;
      state.expandedCompartmentIdx = 0;
      state.selectedBoxIds = [];
      state.plans.forEach((p) => {
        p.boxes.forEach((b) => { b.compartmentIndex = 0; });
      });
      refreshAll();
      window.Scene3DManager.setCameraView('iso');
    });

    // 2. 장 형식 치수 및 문설주 입력
    const bindCabInput = (id, key, isStr) => {
      const el = document.getElementById(id);
      el.addEventListener('input', () => {
        state.spaceConfig.cabinet[key] = isStr ? el.value : Math.max(0, Number(el.value) || 0);
        refreshAll();
      });
    };
    bindCabInput('cab-w', 'w');
    bindCabInput('cab-d', 'd');
    bindCabInput('cab-h', 'h');
    bindCabInput('cab-left-frame', 'leftFrameW');
    bindCabInput('cab-right-frame', 'rightFrameW');
    bindCabInput('cab-top-frame', 'topFrameH');
    bindCabInput('cab-bot-frame', 'bottomFrameH');
    bindCabInput('cab-door-type', 'doorType', true);
    bindCabInput('cab-hinge-w', 'hingeClearanceW');

    document.getElementById('btn-clear-doorframe').addEventListener('click', () => {
      const c = state.spaceConfig.cabinet;
      const isCurrentlyZero = c.leftFrameW === 0 && c.rightFrameW === 0 && c.topFrameH === 0 && c.bottomFrameH === 0;
      if (isCurrentlyZero) {
        // 기본 문틀 치수로 복원
        c.leftFrameW = 35;
        c.rightFrameW = 35;
        c.topFrameH = 30;
        c.bottomFrameH = 20;
        if (c.hingeClearanceW === 0) c.hingeClearanceW = 22;
      } else {
        // 문틀만 0으로 설정 (문 너비 = 내부 너비와 동일, 문짝 자체는 사라지지 않고 그대로 유지!)
        c.leftFrameW = 0;
        c.rightFrameW = 0;
        c.topFrameH = 0;
        c.bottomFrameH = 0;
      }
      if (!c.doorType || c.doorType === 'none') {
        c.doorType = 'double';
      }
      refreshAll();
    });

    // '문 개방각도' 버튼 및 슬라이더/프리셋 이벤트
    document.getElementById('btn-door-angle-toggle')?.addEventListener('click', () => {
      const c = state.spaceConfig.cabinet;
      if (!c.doorType || c.doorType === 'none') {
        c.doorType = 'double';
        state.doorAnglePanelOpen = true;
      } else {
        state.doorAnglePanelOpen = !state.doorAnglePanelOpen;
      }
      refreshAll();
    });

    document.getElementById('cab-door-angle-slider')?.addEventListener('input', (e) => {
      state.doorOpenAngle = Number(e.target.value) || 0;
      if (state.spaceConfig.cabinet.doorType === 'none') {
        state.spaceConfig.cabinet.doorType = 'double';
      }
      refreshAll();
    });

    document.querySelectorAll('.door-angle-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.doorOpenAngle = Number(btn.dataset.angle) || 0;
        if (state.spaceConfig.cabinet.doorType === 'none') {
          state.spaceConfig.cabinet.doorType = 'double';
        }
        refreshAll();
      });
    });

    document.getElementById('btn-add-shelf').addEventListener('click', () => {
      const c = state.spaceConfig.cabinet;
      const lastY = c.shelves.length > 0 ? c.shelves[c.shelves.length - 1].bottomY : 0;
      const nextY = Math.min(c.h - 80, lastY + 350);
      c.shelves.push({
        id: 'sh-' + Date.now(),
        bottomY: Math.max(80, nextY),
        thickness: 18
      });
      refreshAll();
    });

    // 3. 슬라이딩 서랍 치수 입력
    const bindDrwInput = (id, key) => {
      const el = document.getElementById(id);
      el.addEventListener('input', () => {
        state.spaceConfig.drawer[key] = Math.max(0, Number(el.value) || 0);
        refreshAll();
      });
    };
    bindDrwInput('drw-w', 'w');
    bindDrwInput('drw-d', 'd');
    bindDrwInput('drw-exposed-d', 'exposedD');
    bindDrwInput('drw-h', 'h');
    bindDrwInput('drw-clearance-h', 'clearanceH');

    // 4. 하단 카메라 시점 & 서랍 슬라이더
    document.querySelectorAll('[data-cam]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.Scene3DManager.setCameraView(btn.dataset.cam);
      });
    });

    const drawerSlider = document.getElementById('slider-drawer-open');
    drawerSlider.addEventListener('input', () => {
      state.drawerOpenRatio = Number(drawerSlider.value) / 100;
      document.getElementById('drawer-open-pct').textContent = `${drawerSlider.value}%`;
      refreshAll();
    });

    document.getElementById('chk-show-deadzones').addEventListener('change', (e) => {
      state.showDeadzones = e.target.checked;
      refreshAll();
    });

    // 5. 시안(Plan) 추가 / 비우기 / 비교표 모달
    document.getElementById('btn-add-plan').addEventListener('click', () => {
      const name = prompt('새 비교 시안의 이름을 입력하세요:', `시안 ${String.fromCharCode(65 + state.plans.length)}`);
      if (!name) return;
      const newPlan = {
        id: 'plan-' + Date.now(),
        name: name.trim(),
        boxes: []
      };
      state.plans.push(newPlan);
      state.activePlanId = newPlan.id;
      state.selectedBoxIds = [];
      refreshAll();
    });

    document.getElementById('btn-clear-plan').addEventListener('click', () => {
      const activePlan = getActivePlan();
      activePlan.boxes = [];
      state.selectedBoxIds = [];
      refreshAll();
    });

    document.getElementById('btn-open-report-modal').addEventListener('click', () => {
      renderComparisonTable();
      document.getElementById('modal-report-table').classList.add('open');
    });
    document.getElementById('btn-close-report-modal').addEventListener('click', () => {
      document.getElementById('modal-report-table').classList.remove('open');
    });

    // 6. 3D 묶음 플로팅 팝업 버튼 이벤트
    document.getElementById('btn-bundle-save').addEventListener('click', saveCurrentSelectionAsCombo);
    document.getElementById('btn-bundle-up').addEventListener('click', () => moveSelectedBoxesToShelf(1));
    document.getElementById('btn-bundle-down').addEventListener('click', () => moveSelectedBoxesToShelf(-1));
    document.getElementById('btn-bundle-rot').addEventListener('click', () => rotateSelectedBoxes(90));
    document.getElementById('btn-bundle-del').addEventListener('click', deleteSelectedBoxes);

    // 7. 하단 선택 바 컨트롤 (평면 이동 시에도 자동으로 아래 박스 위에 적층!)
    const moveSelectionOnPlane = (dx, dz) => {
      const activePlan = getActivePlan();
      const selBoxes = activePlan.boxes.filter((b) => state.selectedBoxIds.includes(b.id));
      if (selBoxes.length === 0) return;

      const compartments = window.PackerEngine.getCompartments(state.spaceConfig);
      const comp = compartments[selBoxes[0].compartmentIndex] || compartments[0];

      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minBaseY = Infinity;
      selBoxes.forEach((b) => {
        const m = state.modelsMap[b.modelId];
        if (!m) return;
        const dims = window.PackerEngine.getOrientedDims(m, b.rot || 0);
        if (b.x < minX) minX = b.x;
        if (b.x + dims.w > maxX) maxX = b.x + dims.w;
        if (b.z < minZ) minZ = b.z;
        if (b.z + dims.d > maxZ) maxZ = b.z + dims.d;
        if ((b.y || 0) < minBaseY) minBaseY = b.y || 0;
      });
      if (!isFinite(minBaseY)) minBaseY = 0;

      const clampedDX = Math.max(-minX, Math.min(comp.w - maxX, dx));
      const clampedDZ = Math.max(-minZ, Math.min(comp.d - maxZ, dz));

      selBoxes.forEach((b) => {
        b.x = Math.round(b.x + clampedDX);
        b.z = Math.round(b.z + clampedDZ);
      });

      let maxSupportY = 0;
      selBoxes.forEach((b) => {
        const supY = window.PackerEngine.computeStackingY(
          state.spaceConfig,
          activePlan.boxes,
          b,
          state.modelsMap,
          state.selectedBoxIds
        );
        if (supY > maxSupportY) maxSupportY = supY;
      });
      selBoxes.forEach((b) => {
        b.y = Math.round(maxSupportY + Math.max(0, (b.y || 0) - minBaseY));
      });

      refreshAll();
    };

    document.getElementById('btn-box-save-combo').addEventListener('click', saveCurrentSelectionAsCombo);
    document.getElementById('btn-box-stack-more').addEventListener('click', stackOneMoreOnSelected);
    document.getElementById('btn-box-shelf-up').addEventListener('click', () => moveSelectedBoxesToShelf(1));
    document.getElementById('btn-box-shelf-down').addEventListener('click', () => moveSelectedBoxesToShelf(-1));
    document.getElementById('btn-box-rot').addEventListener('click', () => rotateSelectedBoxes(90));
    document.getElementById('btn-box-rot-ccw').addEventListener('click', () => rotateSelectedBoxes(-90));
    document.getElementById('btn-box-left').addEventListener('click', () => moveSelectionOnPlane(-state.snapStep, 0));
    document.getElementById('btn-box-right').addEventListener('click', () => moveSelectionOnPlane(state.snapStep, 0));
    document.getElementById('btn-box-back').addEventListener('click', () => moveSelectionOnPlane(0, -state.snapStep));
    document.getElementById('btn-box-front').addEventListener('click', () => moveSelectionOnPlane(0, state.snapStep));
    document.getElementById('btn-box-del').addEventListener('click', deleteSelectedBoxes);

    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (state.selectedBoxIds.length === 0) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveSelectionOnPlane(-state.snapStep, 0); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); moveSelectionOnPlane(state.snapStep, 0); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveSelectionOnPlane(0, -state.snapStep); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); moveSelectionOnPlane(0, state.snapStep); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotateSelectedBoxes(90); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelectedBoxes(); }
    });

    // 8. '수납함 / 저장 조합 추가' 팝업 모달
    const pickerModal = document.getElementById('modal-box-picker');
    document.getElementById('btn-close-picker-modal').addEventListener('click', () => {
      pickerModal.classList.remove('open');
    });
    document.getElementById('picker-search-input').addEventListener('input', (e) => {
      state.pickerSearch = e.target.value;
      renderPickerModalContent();
    });

    // 9. 새 커스텀 수납함 등록 모달
    const customModal = document.getElementById('modal-custom-box');
    document.getElementById('btn-open-custom-modal').addEventListener('click', () => {
      customModal.classList.add('open');
    });
    document.getElementById('btn-close-custom-modal').addEventListener('click', () => {
      customModal.classList.remove('open');
    });

    const shapeSelect = document.getElementById('new-box-shape');
    shapeSelect.addEventListener('change', () => {
      document.getElementById('tapered-bot-inputs').style.display =
        shapeSelect.value === 'tapered' ? 'grid' : 'none';
    });

    document.getElementById('btn-save-custom-box').addEventListener('click', () => {
      const brand = document.getElementById('new-box-brand').value.trim() || '내 커스텀';
      const lineup = document.getElementById('new-box-lineup').value.trim() || '기본 라인업';
      const name = document.getElementById('new-box-name').value.trim() || '커스텀 수납함';
      const wTop = Math.max(20, Number(document.getElementById('new-box-wtop').value) || 200);
      const dTop = Math.max(20, Number(document.getElementById('new-box-dtop').value) || 200);
      const h = Math.max(20, Number(document.getElementById('new-box-h').value) || 120);
      const shapeType = document.getElementById('new-box-shape').value;
      const wBot = shapeType === 'tapered'
        ? Math.max(10, Number(document.getElementById('new-box-wbot').value) || wTop - 20)
        : wTop;
      const dBot = shapeType === 'tapered'
        ? Math.max(10, Number(document.getElementById('new-box-dbot').value) || dTop - 20)
        : dTop;
      const accessType = document.getElementById('new-box-access').value;
      const stackable = document.getElementById('new-box-stackable').checked;
      const hasFrontHandle = document.getElementById('new-box-handle').checked;
      const color = document.getElementById('new-box-color').value || '#efe7da';

      const newModel = {
        id: 'custom-' + Date.now(),
        brand,
        lineup,
        name,
        wTop,
        dTop,
        h,
        wBot,
        dBot,
        shapeType,
        accessType,
        stackable,
        stackingOffset: 3,
        hasFrontHandle,
        color
      };

      saveCustomModel(newModel);
      state.selectedCatalogModelId = newModel.id;
      customModal.classList.remove('open');
      refreshAll();
    });

    // 10. 브랜드 수납함 1:1 3D 겹쳐보기 비교 모달
    const compareModal = document.getElementById('modal-compare-3d');
    let compareViewerInitialized = false;

    const updateCompareModalView = () => {
      const idA = document.getElementById('cmp-select-a').value;
      const idB = document.getElementById('cmp-select-b').value;
      const align = document.getElementById('cmp-align-mode').value;
      const modA = state.modelsMap[idA];
      const modB = state.modelsMap[idB];

      window.Scene3DManager.renderCompareModels(modA, modB, align);

      if (modA && modB) {
        const diffW = modA.wTop - modB.wTop;
        const diffD = modA.dTop - modB.dTop;
        const diffH = modA.h - modB.h;
        const fmt = (v) => (v > 0 ? `+${v}mm` : `${v}mm`);
        document.getElementById('cmp-diff-summary').innerHTML = `
          <div><span class="legend-dot" style="background:#b86b43"></span><strong>A (${modA.brand} - ${modA.name}):</strong> 상단 ${modA.wTop}×${modA.dTop} / 하단 ${modA.wBot}×${modA.dBot} / 높이 ${modA.h}mm</div>
          <div><span class="legend-dot" style="background:#3b8a64"></span><strong>B (${modB.brand} - ${modB.name}):</strong> 상단 ${modB.wTop}×${modB.dTop} / 하단 ${modB.wBot}×${modB.dBot} / 높이 ${modB.h}mm</div>
          <div style="margin-top:4px;color:var(--text-main);"><strong>크기 차이 (A - B):</strong> 가로 <strong>${fmt(diffW)}</strong> / 깊이 <strong>${fmt(diffD)}</strong> / 높이 <strong>${fmt(diffH)}</strong></div>
        `;
      }
    };

    document.getElementById('btn-open-compare-modal').addEventListener('click', () => {
      compareModal.classList.add('open');
      const selA = document.getElementById('cmp-select-a');
      const selB = document.getElementById('cmp-select-b');
      const optsHtml = state.catalogModels
        .map((m) => `<option value="${m.id}">[${m.brand}] ${m.name} (${m.wTop}×${m.dTop}×${m.h})</option>`)
        .join('');
      selA.innerHTML = optsHtml;
      selB.innerHTML = optsHtml;
      selA.value = state.selectedCatalogModelId || state.catalogModels[0]?.id;
      const otherModel = state.catalogModels.find((m) => m.brand !== state.modelsMap[selA.value]?.brand) || state.catalogModels[1] || state.catalogModels[0];
      selB.value = otherModel.id;

      if (!compareViewerInitialized) {
        window.Scene3DManager.initCompareViewer('compare-3d-canvas');
        compareViewerInitialized = true;
      }
      updateCompareModalView();
    });

    document.getElementById('btn-close-compare-modal').addEventListener('click', () => {
      compareModal.classList.remove('open');
    });
    document.getElementById('cmp-select-a').addEventListener('change', updateCompareModalView);
    document.getElementById('cmp-select-b').addEventListener('change', updateCompareModalView);
    document.getElementById('cmp-align-mode').addEventListener('change', updateCompareModalView);

    // 11. 3D 배치 링크 공유 버튼
    document.getElementById('btn-share-plan-link')?.addEventListener('click', shareCurrentPlanLink);
  }

  window.addEventListener('DOMContentLoaded', () => {
    loadCatalogAndCombos();
    seedInitialDemoPlans();

    window.Scene3DManager.init('canvas-wrapper', {
      onBoxInteraction: handleBoxInteraction,
      onBoxesMoved: () => {
        renderShelfCalloutCards();
        renderSelectedBoxInspector();
        renderWarningsBanner();
        const activePlan = getActivePlan();
        window.Scene3DManager.renderScene(state.spaceConfig, activePlan.boxes, state.modelsMap, {
          selectedBoxIds: state.selectedBoxIds,
          activeCompartmentIdx: state.activeCompartmentIdx
        });
      },
      onBundleScreenPos: handleBundleScreenPos,
      onShelfAnchors: handleShelfAnchors
    });

    bindEvents();
    refreshAll();
    window.Scene3DManager.setCameraView('iso');

    // 디폴트 인터페이스: 모바일 모드로 초기화 (PC 모드로 즉시 전환 가능!)
    setUIMode('mobile');

    // Vercel + Neon DB 및 공유 URL 동기화
    syncWithCloudDatabase();
  });
})();
