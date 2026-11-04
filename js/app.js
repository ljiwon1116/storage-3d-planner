// 메인 애플리케이션 컨트롤러 (여유로운 플로팅 UI, 좌상단/좌하단 아코디언, 3D 선반 콜아웃 카드, 자동 위로 적층, 모바일 터치 지원)

(function () {
  const STORAGE_KEY_CUSTOM_MODELS = 'storagefit_custom_models_v1';
  const STORAGE_KEY_SAVED_COMBOS = 'storagefit_saved_combos_v1';

  // 냉장고 용량별 바깥 크기 (mm). 870L·832L·592L·507L은 LG 실제 제품 치수, 650L은 추정값
  const FRIDGE_CAPACITIES = {
    870: { w: 914, d: 918, h: 1787 },   // LG 디오스 오브제컬렉션 4도어 870L
    832: { w: 913, d: 913, h: 1790 },   // LG 디오스 오브제컬렉션 양문형 832L
    650: { w: 860, d: 760, h: 1860 },   // 추정값 (같은 크기 2도어 실제 제품을 찾지 못함)
    592: { w: 860, d: 730, h: 1840 },   // LG 일반냉장고 2도어 592L
    507: { w: 780, d: 730, h: 1800 }    // LG 일반냉장고 2도어 507L
  };
  // 도어 유형별 기본 용량 · 선반 수
  const FRIDGE_DOOR_DEFAULTS = {
    side: { capacity: 832, shelvesFridge: 4, shelvesFreezer: 4 },
    four: { capacity: 870, shelvesFridge: 3, shelvesFreezer: 1 },
    two: { capacity: 650, shelvesFridge: 3, shelvesFreezer: 1 }
  };
  function defaultFridge() {
    const dd = FRIDGE_DOOR_DEFAULTS.side;
    return Object.assign({ doorType: 'side', capacity: dd.capacity, shelvesFridge: dd.shelvesFridge, shelvesFreezer: dd.shelvesFreezer }, FRIDGE_CAPACITIES[dd.capacity]);
  }
  const SPACE_TYPE_LABELS = { cabinet: '문 달린 장', drawer: '빼는 서랍', pantry: '팬트리', fridge: '냉장고' };

  // 한국 아파트 ㄱ자 팬트리 기본값 (방 1500x1800, 선반 높이 2300, 깊이 400)
  function defaultPantry() {
    return {
      roomW: 1500,      // 뒤 벽 길이 (방 가로)
      roomD: 1800,      // 옆 벽 길이 (방 깊이)
      h: 2300,          // 선반 전체 높이
      depthA: 400,      // 뒤 벽 선반 깊이
      depthB: 400,      // 옆 벽 선반 깊이
      wallB: true,      // 옆 벽 선반 있음
      postW: 25,        // 세로 기둥 굵기
      postsA: [750],    // 뒤 벽 기둥 위치 (왼쪽 끝에서)
      postsB: [],       // 옆 벽 기둥 위치 (안쪽 구석에서)
      doorW: 800,       // 입구 폭 (그림 표시용)
      doorSide: 'left', // 입구 쪽: 'left'(옆 선반은 오른쪽 벽) | 'right'(옆 선반은 왼쪽 벽)
      keepFloor: false, // 맨 아래 칸 비워두기 (쌀통·생수·청소기 자리)
      defaultShelves: [400, 800, 1200, 1600, 2000].map((y, i) => ({ id: `ps-${i}`, bottomY: y, thickness: 18 })),
      bayShelves: {}    // 열마다 따로 바꾼 선반 { A0: [...], B0: [...] }
    };
  }

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
        bottomFrameH: 0,
        noBottomFrameV1: true,
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
        clearanceH: 175,
        tiers: 2
      },
      // ㄱ자 팬트리 (mm). 뒤 벽(A) = 방 가로, 옆 벽(B) = 방 깊이
      pantry: defaultPantry(),
      fridge: defaultFridge()
    },

    plans: [
      { id: 'plan-a', name: '계획 A', boxes: [] },
      { id: 'plan-b', name: '계획 B', boxes: [] },
      { id: 'plan-c', name: '계획 C', boxes: [] }
    ],
    activePlanId: 'plan-a',

    activeCompartmentIdx: 2,      // 현재 선택된 선반 칸
    expandedCompartmentIdx: null, // 우측 선반 콜아웃 카드 중 펼쳐진 칸 (기본상태는 null로 깔끔하게 접힘!)
    spaceCardOpen: false,         // 좌측 상단 가구 유형 카드 펼침 여부
    shelfCardOpen: false,         // 좌측 하단 중간 선반 카드 펼침 여부
    howToUseOpen: false,          // 중앙 상단 How to use 팝오버 펼침 여부
    errorDockCollapsed: false,    // 우측 하단 에러코드 접힘 여부

    selectedBoxIds: [],
    selectedCatalogModelId: 'muji-pp-drawer-wide-shallow',
    uiMode: 'mobile',             // 'mobile' | 'pc' (기본값: 'mobile'!)
    activeMobileTab: 'none',      // 'none'(순수 3D) | 'errors'(문제)
    mobileStep: 'setup',          // 'setup'(장 설정) | 'build'(3D 상자 배치)
    wizStep: 0,                   // 첫 설정 질문 번호
    wizFromBuild: false,          // 3D 화면에서 '장 설정'으로 들어왔는지
    wizPreview: true,             // 첫 설정 중 3D 예시를 자동으로 채우는지
    previewSeed: Math.floor(Math.random() * 1e9),
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
    doorOpenAngle: 100,           // 여닫이 문 기본 열림 각도
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
    pickerSearch: '',
    pickerBrandListOpen: false, // 브랜드 글자 눌렀을 때 목록 펼침
    pickerKind: 'ALL',          // 상자 종류 필터 호환용
    pickerFilterOpen: false,    // 필터 패널 펼침 여부
    pickerFilters: {
      kinds: ['drawer', 'basket', 'lid'],
      stackable: ['yes', 'no'],
      transparency: ['clear', 'translucent', 'opaque'],
      wMin: '', wMax: '',
      dMin: '', dMax: '',
      hMin: '', hMax: ''
    },
    pickerCart: {},      // { modelId: 수량 } 담기 바구니
    pickerTargetComp: 0  // 담을 선반 칸
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
      // 사다리꼴 모델(내 상자·클라우드 포함): 하단 치수가 없거나 상단과 같으면 사방 5mm 작게 보정
      if (m.shapeType === 'tapered' && typeof window.resolveBottomDims === 'function') {
        const bot = window.resolveBottomDims(m);
        m.wBot = bot.wBot;
        m.dBot = bot.dBot;
      }
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

    // Vercel + Neon DB에 비동기 저장 (사진은 크니까 빼고 보냄)
    const { image, ...forCloud } = newModel;
    fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forCloud)
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
        badgeEl.textContent = '⚪ 내 기기에 저장';
        badgeEl.title = '인터넷에 올리면 저절로 같이 저장돼요.';
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
          badgeEl.textContent = '🟢 인터넷에 저장됨';
          badgeEl.style.background = '#e6f4ea';
          badgeEl.style.color = '#137333';
          badgeEl.style.borderColor = '#a8dab5';
        }
        refreshAll();
      } else {
        if (badgeEl) {
          badgeEl.textContent = '🟡 내 기기에 저장';
          badgeEl.title = data.message || '인터넷에 연결하면 어디서나 볼 수 있어요.';
        }
      }
    } catch (e) {
      if (badgeEl) {
        badgeEl.textContent = '⚪ 내 기기에 저장';
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
      alert(`🔗 링크를 복사했어요!\n\n${shareUrl}\n\n이 링크를 보내면 똑같은 화면이 바로 열려요.`);
    } catch (e) {
      prompt('이 링크를 복사해서 보내세요:', shareUrl);
    }
  }

  function getActivePlan() {
    return state.plans.find((p) => p.id === state.activePlanId) || state.plans[0];
  }

  // 첨부 샘플 이미지와 유사한 초기 배치 시드 데이터
  function seedInitialDemoPlans() {
    const planA = state.plans[0];
    planA.boxes = [
      { id: 'demo-a1', modelId: 'muji-pp-drawer-wide-deep', compartmentIndex: 0, x: 40, y: 0, z: 170, rot: 0, bundleGroupId: 'grp-muji-1' },
      { id: 'demo-a2', modelId: 'muji-pp-drawer-deep', compartmentIndex: 0, x: 425, y: 0, z: 60, rot: 0, bundleGroupId: 'grp-muji-1' },
      { id: 'demo-a3', modelId: 'muji-pp-drawer-shallow', compartmentIndex: 0, x: 425, y: 172, z: 60, rot: 0, bundleGroupId: 'grp-muji-1' },
      { id: 'demo-a4', modelId: 'muji-pp-drawer-wide-shallow', compartmentIndex: 2, x: 40, y: 0, z: 170, rot: 0 },
      { id: 'demo-a5', modelId: 'muji-pp-drawer-wide-shallow', compartmentIndex: 2, x: 415, y: 0, z: 170, rot: 0 }
    ];

    const planB = state.plans[1];
    planB.boxes = [
      { id: 'demo-b1', modelId: 'ikea-kuggis-lid-26x35x15', compartmentIndex: 0, x: 65, y: 0, z: 80, rot: 0 },
      { id: 'demo-b2', modelId: 'ikea-kuggis-lid-26x35x15', compartmentIndex: 0, x: 65, y: 148, z: 80, rot: 0 }, // 2단 적층 예시
      { id: 'demo-b3', modelId: 'ikea-kuggis-lid-18x26x15', compartmentIndex: 0, x: 340, y: 0, z: 190, rot: 0 },
      { id: 'demo-b4', modelId: 'ikea-kuggis-lg-18x26x15', compartmentIndex: 2, x: 65, y: 0, z: 150, rot: 0 },
      { id: 'demo-b5', modelId: 'ikea-kuggis-lg-18x26x15', compartmentIndex: 2, x: 350, y: 0, z: 150, rot: 0 }
    ];

    const planC = state.plans[2];
    planC.boxes = [
      { id: 'demo-c1', modelId: 'daiso-drawer-1tier', compartmentIndex: 0, x: 65, y: 0, z: 80, rot: 0 },
      { id: 'demo-c2', modelId: 'daiso-drawer-1tier', compartmentIndex: 0, x: 330, y: 0, z: 80, rot: 0 },
      { id: 'demo-c3', modelId: 'daiso-pantry-handle-15', compartmentIndex: 0, x: 595, y: 0, z: 150, rot: 0 },
      { id: 'demo-c4', modelId: 'daiso-wood-handle-basket-m', compartmentIndex: 2, x: 65, y: 0, z: 40, rot: 0 },
      { id: 'demo-c5', modelId: 'daiso-wood-handle-basket-m', compartmentIndex: 2, x: 365, y: 0, z: 40, rot: 0 }
    ];
  }

  // ---------- 문 열기 / 서랍 열기: 버튼 -> 작은 창 + 슬라이드바 ----------
  function openCtrlMode() {
    const sc = state.spaceConfig;
    if (!sc) return null;
    if (sc.type === 'drawer') return 'drawer';
    if (sc.type === 'cabinet' && sc.cabinet && sc.cabinet.doorType && sc.cabinet.doorType !== 'none') return 'door';
    if (sc.type === 'fridge') return 'door';
    return null;   // 팬트리 · 문 없는 장은 버튼 없음
  }
  function updateOpenCtrlButton() {
    const btn = document.getElementById('btn-open-ctrl');
    if (!btn) return;
    const mode = openCtrlMode();
    btn.style.display = mode ? '' : 'none';
    btn.textContent = mode === 'drawer' ? '서랍 열기' : '문 열기';
    if (!mode) setOpenCtrl(false);
  }
  function syncOpenCtrlPop() {
    const mode = openCtrlMode();
    const slider = document.getElementById('ocp-slider');
    const val = document.getElementById('ocp-val');
    const title = document.getElementById('ocp-title');
    const maxEl = document.getElementById('ocp-max');
    if (!slider || !val || !mode) return;
    if (mode === 'door') {
      title.textContent = '문 열기';
      slider.min = 0; slider.max = 110; slider.step = 5;
      slider.value = state.doorOpenAngle;
      val.textContent = `${state.doorOpenAngle}°`;
      maxEl.textContent = '활짝';
    } else {
      const pct = Math.round(state.drawerOpenRatio * 100);
      title.textContent = '서랍 열기';
      slider.min = 0; slider.max = 100; slider.step = 5;
      slider.value = pct;
      val.textContent = `${pct}%`;
      maxEl.textContent = '다 열림';
    }
  }
  function placeOpenCtrlPop() {
    const pop = document.getElementById('open-ctrl-pop');
    const btn = document.getElementById('btn-open-ctrl');
    if (!pop || !btn) return;
    const r = btn.getBoundingClientRect();
    const w = pop.offsetWidth || 260;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    pop.style.left = `${left}px`;
    pop.style.bottom = `${Math.max(8, window.innerHeight - r.top + 8)}px`;
  }
  function setOpenCtrl(open) {
    const pop = document.getElementById('open-ctrl-pop');
    const bd = document.getElementById('open-ctrl-backdrop');
    const btn = document.getElementById('btn-open-ctrl');
    if (!pop || !bd) return;
    if (open) syncOpenCtrlPop();
    pop.hidden = !open;
    bd.hidden = !open;
    if (open) placeOpenCtrlPop();
    if (btn) { btn.classList.toggle('active', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  }
  let openCtrlRaf = 0;
  function bindOpenCtrl() {
    const btn = document.getElementById('btn-open-ctrl');
    const slider = document.getElementById('ocp-slider');
    const bd = document.getElementById('open-ctrl-backdrop');
    const pop = document.getElementById('open-ctrl-pop');
    if (!btn || !slider || !bd || !pop) return;
    btn.addEventListener('click', (e) => { e.stopPropagation(); setOpenCtrl(pop.hidden); });
    bd.addEventListener('pointerdown', (e) => { e.preventDefault(); setOpenCtrl(false); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) setOpenCtrl(false); });
    window.addEventListener('resize', () => { if (!pop.hidden) placeOpenCtrlPop(); });
    slider.addEventListener('input', () => {
      const v = Number(slider.value);
      if (openCtrlMode() === 'door') {
        state.doorOpenAngle = v;
        document.getElementById('ocp-val').textContent = `${v}°`;
      } else {
        state.drawerOpenRatio = v / 100;
        document.getElementById('ocp-val').textContent = `${v}%`;
      }
      // 끄는 동안 화면마다 한 번만 다시 그림
      if (openCtrlRaf) return;
      openCtrlRaf = requestAnimationFrame(() => { openCtrlRaf = 0; refreshAll(); });
    });
  }

  function refreshAll() {
    document.body.classList.toggle('space-drawer', state.spaceConfig.type === 'drawer');
    document.body.classList.toggle('space-pantry', state.spaceConfig.type === 'pantry');
    document.body.classList.toggle('space-fridge', state.spaceConfig.type === 'fridge');
    const shBtn = document.getElementById('btn-mobile-shelf-height');
    if (shBtn) shBtn.textContent = state.spaceConfig.type === 'pantry' ? '기둥·선반' : '선반 높이';
    const shHead = document.querySelector('#mobile-shelfh-popup .mobile-shelfh-head > span');
    if (shHead) shHead.textContent = state.spaceConfig.type === 'pantry' ? '기둥·선반' : '선반 높이';
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
    saveLocalSoon();
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

    // 톡 누름 → 보관함 자세히 보기 (물건 넣기)
    if (info.type === 'open_detail') {
      const model = state.modelsMap[clickedBox.modelId];
      if (model && window.BoxDetail && window.HOUSEHOLD_ITEMS) {
        document.body.classList.remove('mobile-setup-open', 'mobile-shelfh-open', 'mobile-shelf-sheet-open');
        window.BoxDetail.open(clickedBox, model);
      }
      return;
    }

    if (state.spaceConfig.type !== 'drawer') {
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
      setTimeout(maybeShowBoxGuide, 120);
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
  let lastShelfAnchors = [];
  function handleShelfAnchors(anchors) {
    lastShelfAnchors = anchors || [];
    if (state.costOverlayOpen) {
      renderCostOverlayLabels(lastShelfAnchors);
    }
    const svgEl = document.getElementById('shelf-leader-svg');
    const btnLayer = document.getElementById('mobile-shelf-buttons');

    // 모바일 3D 단계: 선반 옆 ＋버튼을 앵커 위치에 배치
    const isMobileBuild = state.uiMode === 'mobile' && state.mobileStep === 'build';
    if (isMobileBuild && btnLayer) {
      if (svgEl) svgEl.innerHTML = '';
      // 버튼은 매 프레임 새로 만들지 않고 위치만 갱신 (클릭 유지)
      const existing = btnLayer.querySelectorAll('.mobile-shelf-add-btn');
      if (existing.length !== anchors.length) {
        btnLayer.innerHTML = '';
        anchors.forEach((anc) => {
          const btn = document.createElement('button');
          btn.className = 'mobile-shelf-add-btn';
          btn.type = 'button';
          btn.innerHTML = `<span class="msab-num">${anc.label || anc.index + 1}</span><span class="msab-plus">+</span>`;
          btn.setAttribute('aria-label', `${anc.label || anc.index + 1} 칸에 상자 넣기`);
          btn.dataset.idx = anc.index;
          btn.style.left = `${anc.x.toFixed(1)}px`;
          btn.style.top = `${anc.y.toFixed(1)}px`;
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openShelfSheet(Number(btn.dataset.idx));
          });
          btnLayer.appendChild(btn);
        });
      } else {
        anchors.forEach((anc, i) => {
          const btn = existing[i];
          btn.dataset.idx = anc.index;
          const numEl = btn.querySelector('.msab-num');
          if (numEl) numEl.textContent = anc.label || anc.index + 1;
          btn.style.left = `${anc.x.toFixed(1)}px`;
          btn.style.top = `${anc.y.toFixed(1)}px`;
        });
      }
      return;
    }
    if (btnLayer) btnLayer.innerHTML = '';
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

  // ===== 가구 종류에 맞춘 무작위 채우기 =====
  function seededRng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 장 → 서랍형 상자, 서랍 → 바구니형 상자 (kind로 직접 고를 수도: 'drawer' | 'basket' | 'mix')
  function typeFillPool(kind) {
    const want = kind || (state.spaceConfig.type === 'cabinet' ? 'drawer' : 'basket');
    if (want === 'mix') {
      return state.catalogModels.filter((m) => ['drawer', 'basket'].includes(window.getModelKind(m)));
    }
    return state.catalogModels.filter((m) => window.getModelKind(m) === want);
  }

  // 앞으로 꺼내는 상자(서랍형 · 앞 손잡이 바구니)는 돌리지 않음 → 여는 쪽이 항상 문을 봄
  function opensFromFront(m) {
    return m.accessType === 'front_drawer' || m.accessType === 'front_open';
  }

  // 한 칸을 고른 상자들로 채움 (선반 바닥 사이즈를 최대한 채우는 크기를 우선 배치, 서랍형 앞뒤 이중 적치 방지)
  function randomFillCompartment(compIdx, pool, rng, opts) {
    const compartments = window.PackerEngine.getCompartments(state.spaceConfig);
    const comp = compartments[compIdx] || compartments[0];
    let xStart = 0, xEnd = comp.w, zStart = 0;
    const zEnd = comp.d;
    if (state.spaceConfig.type === 'cabinet') {
      const k = window.PackerEngine.getCabinetConstraints(state.spaceConfig);
      xStart = k.leftDeadW;
      xEnd = comp.w - k.rightDeadW;
    } else if (state.spaceConfig.type === 'drawer') {
      zStart = window.PackerEngine.getDrawerConstraints(state.spaceConfig).unexposedD;
    }

    const usableW = Math.max(0, xEnd - xStart);
    const usableD = Math.max(0, zEnd - zStart);
    const fits = pool.filter((m) => m.h <= comp.clearH);
    const boxes = [];
    if (fits.length === 0 || usableW <= 10 || usableD <= 10) return boxes;

    // 서랍형(front_drawer)이 주력인 경우, 높이가 제각각인 그룹으로 쪼개서 얕은 소형 서랍이 뽑히지 않도록 바닥 채움 우선
    const hasDrawer = fits.some((m) => m.accessType === 'front_drawer');
    const groups = [];
    if (opts.levelRows && !hasDrawer) {
      [...fits].sort((a, b) => a.h - b.h).forEach((m) => {
        const g = groups[groups.length - 1];
        if (g && m.h - g[0].h <= 15) g.push(m);
        else groups.push([m]);
      });
    } else {
      groups.push(fits);
    }

    let id = Date.now();
    let rowFront = zEnd;
    let groupIdx = Math.floor(rng() * Math.ceil(groups.length / 2));
    let anyFrontDrawerPlaced = false;

    // 후보 상자+회전이 남은 폭(remW)과 깊이(availD) 바닥을 얼마나 알차게 채우는지 점수화
    const getFittingCandidates = (rowPool, remW, availD, rowIdx) => {
      const cands = [];
      rowPool.forEach((m) => {
        // 뒷줄(rowIdx > 0)에는 앞으로 여는 서랍형(front_drawer) 절대 배치 금지
        if (rowIdx > 0 && m.accessType === 'front_drawer') return;
        const rots = (!opensFromFront(m) && m.wTop !== m.dTop) ? [0, 90] : [0];
        rots.forEach((rot) => {
          const dim = window.PackerEngine.getOrientedDims(m, rot);
          if (dim.w <= remW && dim.d <= availD) {
            const depthRatio = dim.d / Math.max(1, availD);
            const maxRepeat = Math.max(1, Math.floor((remW + 2) / (dim.w + 2)));
            const tiledWidthRatio = Math.min(1, (maxRepeat * dim.w) / Math.max(1, remW));
            const singleWidthRatio = dim.w / Math.max(1, usableW);
            // 선반 바닥 깊이(depthRatio)를 꽉 채우는 제품을 최우선으로 선택 (앞뒤 이중 쌓임 원천 방지)
            const depthWeight = m.accessType === 'front_drawer' ? 0.72 : 0.58;
            const score = (depthRatio * depthWeight) + (tiledWidthRatio * 0.24) + (singleWidthRatio * (1 - depthWeight - 0.24));
            cands.push({ m, rot, dim, score, maxRepeat });
          }
        });
      });
      cands.sort((a, b) => b.score - a.score);
      return cands;
    };

    // 한 줄 채우기: 선반 바닥을 최대한 채우는 모델부터 우선 배치
    const fillRow = (rowPool, rowIdx) => {
      let x = xStart;
      let rowDepth = 0;
      const availD = rowFront - zStart;
      let safety = 0;

      while (x < xEnd - 15 && safety++ < 30) {
        const remW = xEnd - x;
        const cands = getFittingCandidates(rowPool, remW, availD, rowIdx);
        if (cands.length === 0) break;

        // 바닥을 가장 잘 채우는 상위 후보군(최고점의 82% 이상, 최대 5개) 중에서 골라 매번 신선하면서도 바닥을 꽉 채움
        const topScore = cands[0].score;
        const topTier = cands.filter((c) => c.score >= topScore * 0.82).slice(0, 5);
        const picked = topTier[Math.floor(rng() * topTier.length)] || cands[0];
        const { m, rot, dim, maxRepeat } = picked;

        // 같은 모델로 나란히 채울 개수 (선반이 깔끔하게 정돈되도록 대부분 연속 배치)
        const repeatCount = (maxRepeat > 1 && rng() < 0.8)
          ? Math.max(1, maxRepeat - (rng() < 0.25 ? 1 : 0))
          : 1;

        for (let r = 0; r < repeatCount; r++) {
          if (x + dim.w > xEnd) break;
          const stepH = Math.max(10, m.h - (m.stackingOffset || 0));
          const layers = (opts.stack && m.stackable)
            ? Math.max(1, 1 + Math.floor((comp.clearH - m.h) / stepH))
            : 1;
          for (let l = 0; l < layers; l++) {
            boxes.push({
              id: 'box-' + (++id),
              modelId: m.id,
              compartmentIndex: compIdx,
              x: Math.round(x),
              y: Math.round(l * stepH),
              z: Math.round(rowFront - dim.d),
              rot
            });
          }
          if (m.accessType === 'front_drawer') {
            anyFrontDrawerPlaced = true;
          }
          x += dim.w + 2;
          rowDepth = Math.max(rowDepth, dim.d);
        }
      }
      return rowDepth;
    };

    for (let row = 0; row < 20 && rowFront - zStart > 40; row++) {
      let rowDepth = 0;
      if (opts.levelRows && !hasDrawer && groups.length > 1) {
        for (let g = groupIdx; g < groups.length && rowDepth === 0; g++) {
          rowDepth = fillRow(groups[g], row);
          if (rowDepth > 0) groupIdx = g;
        }
        if (groupIdx < groups.length - 1 && rng() < 0.6) groupIdx += 1;
      } else {
        rowDepth = fillRow(fits, row);
      }
      // 서랍형(front_drawer)이 하나라도 들어갔거나 multiRow가 꺼져 있으면 앞뒤 이중 적치를 막기 위해 즉시 종료!
      if (rowDepth === 0 || !opts.multiRow || anyFrontDrawerPlaced) break;
      rowFront -= rowDepth + 2;
    }
    return boxes;
  }

  // ===== 냉장고 채우기 =====
  // - 냉장고용 · 주방(팬트리·식품·계란 등) 상자만
  // - 바구니형: 칸 높이의 절반 이하만 / 쌓아도 칸 높이의 60%까지만
  // - 서랍형만: 서랍 깊이가 칸 깊이의 60% 이하, 앞쪽에 한 줄
  // - 섞어서: 서랍형을 안쪽부터, 그 앞에 낮은 바구니형을 한 층만
  const FRIDGE_FRIENDLY_RE = /냉장고|계란|주방|키친|팬트리|펜트리|식품|밀폐/;
  const FRIDGE_EXCLUDE_IDS = new Set(['daiso-clean-cutlery-white']); // 수저통은 냉장고에 넣지 않음
  function isFridgeFriendly(m) {
    if (!m || m.accessType === 'item' || FRIDGE_EXCLUDE_IDS.has(m.id)) return false;
    return FRIDGE_FRIENDLY_RE.test(`${m.name || ''} ${m.lineup || ''}`) || m.brand === '루틴랩'; // 루틴랩 = 팬트리 서랍 정리함
  }
  const fridgeIsBasket = (m) => ['basket', 'lid'].includes(window.getModelKind(m));
  const fridgeIsDrawer = (m) => window.getModelKind(m) === 'drawer';
  const FRIDGE_STACK_RATIO = 0.6;   // 쌓아도 칸 높이의 60%까지
  const FRIDGE_BASKET_RATIO = 0.5;  // 바구니형은 칸 높이의 절반까지
  const FRIDGE_DRAWER_DEPTH = 0.6;  // 서랍형만 채울 때 서랍 깊이는 칸 깊이의 60%까지

  // 이 칸에 넣을 수 있는 냉장고 상자 (kind: 'drawer' | 'basket' | 'mix')
  function fridgeFillPool(comp, kind, brand) {
    const capH = comp.clearH * FRIDGE_STACK_RATIO;
    const base = state.catalogModels.filter((m) => isFridgeFriendly(m) && (!brand || m.brand === brand));
    const drawers = base.filter((m) => fridgeIsDrawer(m) && m.h <= capH &&
      (kind !== 'drawer' || m.dTop <= comp.d * FRIDGE_DRAWER_DEPTH)); // 서랍형은 돌리지 않으니 깊이 = dTop
    const baskets = base.filter((m) => fridgeIsBasket(m) && m.h <= comp.clearH * FRIDGE_BASKET_RATIO);
    if (kind === 'drawer') return drawers;
    if (kind === 'basket') return baskets;
    return drawers.concat(baskets);
  }

  function fridgeFillCompartment(compIdx, kind, brand, rng) {
    const comp = window.PackerEngine.getCompartments(state.spaceConfig)[compIdx];
    if (!comp) return [];
    const capH = comp.clearH * FRIDGE_STACK_RATIO;
    const k = kind || 'mix';
    const boxes = [];
    let id = Date.now();
    const layersFor = (m, allowStack) => {
      if (!allowStack || !m.stackable) return 1;
      const stepH = Math.max(10, m.h - (m.stackingOffset || 0));
      return Math.max(1, 1 + Math.floor((capH - m.h) / stepH));
    };

    // 한 줄 채우기: align 'front'면 edge가 앞 끝, 'back'이면 edge가 뒤 끝
    const placeRow = (models, align, edge, maxD, allowStack) => {
      let x = 0, rowDepth = 0, safety = 0;
      while (x < comp.w - 15 && safety++ < 30) {
        const remW = comp.w - x;
        const cands = [];
        models.forEach((m) => {
          const rots = (!opensFromFront(m) && m.wTop !== m.dTop) ? [0, 90] : [0];
          rots.forEach((rot) => {
            const dim = window.PackerEngine.getOrientedDims(m, rot);
            if (dim.w > remW || dim.d > maxD) return;
            const rep = Math.max(1, Math.floor((remW + 2) / (dim.w + 2)));
            const score = (dim.d / Math.max(1, maxD)) * 0.6 + Math.min(1, (rep * dim.w) / Math.max(1, remW)) * 0.4;
            cands.push({ m, rot, dim, score, rep });
          });
        });
        if (!cands.length) break;
        cands.sort((a, b) => b.score - a.score);
        const top = cands.filter((c) => c.score >= cands[0].score * 0.85).slice(0, 5);
        const pick = top[Math.floor(rng() * top.length)] || cands[0];
        const count = pick.rep > 1 && rng() < 0.8 ? pick.rep : 1;
        for (let r = 0; r < count; r++) {
          if (x + pick.dim.w > comp.w) break;
          const z = align === 'front' ? edge - pick.dim.d : edge;
          const stepH = Math.max(10, pick.m.h - (pick.m.stackingOffset || 0));
          const layers = layersFor(pick.m, allowStack);
          for (let l = 0; l < layers; l++) {
            boxes.push({ id: 'box-' + (++id), modelId: pick.m.id, compartmentIndex: compIdx, x: Math.round(x), y: Math.round(l * stepH), z: Math.round(z), rot: pick.rot });
          }
          x += pick.dim.w + 2;
          rowDepth = Math.max(rowDepth, pick.dim.d);
        }
      }
      return rowDepth;
    };

    // 앞에서 뒤로 여러 줄 (바구니형)
    const fillRowsFromFront = (models, backLimit, allowStack) => {
      let front = comp.d;
      for (let row = 0; row < 10 && front - backLimit > 40; row++) {
        const dep = placeRow(models, 'front', front, front - backLimit, allowStack);
        if (!dep) break;
        front -= dep + 2;
      }
    };

    const pool = fridgeFillPool(comp, k, brand);
    const drawers = pool.filter(fridgeIsDrawer);
    const baskets = pool.filter(fridgeIsBasket);

    if (k === 'drawer') {
      placeRow(drawers, 'front', comp.d, comp.d * FRIDGE_DRAWER_DEPTH, true);
    } else if (k === 'basket') {
      fillRowsFromFront(baskets, 0, true);
    } else {
      // 낮은 바구니형: 바구니 중 낮은 편(가장 낮은 것의 1.6배 이하)만
      const minH = baskets.reduce((a, m) => Math.min(a, m.h), Infinity);
      const low = baskets.filter((m) => m.h <= Math.max(minH * 1.6, comp.clearH * 0.25));
      const minLowD = low.reduce((a, m) => Math.min(a, m.dTop, m.wTop), Infinity);
      // 서랍형은 안쪽(뒤)부터. 앞에 바구니를 두면 서랍이 절반은 열리도록 서랍 깊이의 절반만큼 비워 둠
      // → 서랍 깊이 × 1.5 + 바구니 깊이가 칸 깊이 안에 들어가는 서랍만
      const OPEN_RATIO = 0.5;
      const drawerMaxD = isFinite(minLowD) ? Math.max(0, (comp.d - minLowD - 2) / (1 + OPEN_RATIO)) : comp.d;
      const dDepth = placeRow(drawers, 'back', 0, drawerMaxD, true);
      const gapForOpen = dDepth ? Math.ceil(dDepth * (1 + OPEN_RATIO)) + 2 : 0;
      fillRowsFromFront(low, gapForOpen, false);  // 한 층만 (쌓지 않음)
    }
    return boxes;
  }

  // 첫 설정의 3D 예시: 장은 가운데 칸에 서랍형, 서랍은 바구니형
  function applyPreviewFill() {
    const plan = getActivePlan();
    const rng = seededRng(state.previewSeed);
    const isCab = state.spaceConfig.type === 'cabinet';
    if (state.spaceConfig.type === 'fridge') {
      // 냉장고 예시: 냉장실 가운데 칸에 바구니
      const comps = window.PackerEngine.getCompartments(state.spaceConfig).filter((c) => c.zoneKind === 'fridge');
      const mid = comps[Math.floor(comps.length / 2)];
      plan.boxes = mid ? fridgeFillCompartment(mid.index, 'mix', null, rng) : [];
    } else if (state.spaceConfig.type === 'pantry') {
      const comps = window.PackerEngine.getCompartments(state.spaceConfig);
      plan.boxes = [];
      comps.filter((c) => c.level === 1).forEach((c) => {
        plan.boxes = plan.boxes.concat(randomFillCompartment(c.index, typeFillPool('basket'), rng, { stack: false, multiRow: false, levelRows: false }));
      });
    } else if (isCab) {
      const count = window.PackerEngine.getCompartments(state.spaceConfig).length;
      plan.boxes = randomFillCompartment(Math.floor(count / 2), typeFillPool(), rng, { stack: true, multiRow: false });
    } else {
      plan.boxes = randomFillCompartment(0, typeFillPool(), rng, { stack: false, multiRow: true, levelRows: true });
    }
    state.selectedBoxIds = [];
  }

  // 3D 화면의 '한 번에 채우기': 가구 종류에 맞는 상자로 한 칸 채우기
  function runTypeFill(compIdx, brand, kind) {
    const plan = getActivePlan();
    const fillComp = window.PackerEngine.getCompartments(state.spaceConfig)[compIdx];
    if (fillComp && fillComp.reserved) return 0;   // 팬트리 '맨 아래 비워두기' 칸은 채우지 않음
    let pool = typeFillPool(kind);
    if (brand) pool = pool.filter((m) => m.brand === brand);
    const isCab = state.spaceConfig.type === 'cabinet';
    const isPan = state.spaceConfig.type === 'pantry' || state.spaceConfig.type === 'fridge';
    const isDrawerKind = kind === 'drawer' || (!kind && isCab);
    // 누를 때마다 새 조합 (이전과 똑같으면 한 번 더 뽑음)
    const sig = (list) => list.map((b) => `${b.modelId}@${b.x},${b.z},${b.y}`).join('|');
    const prevSig = sig(plan.boxes.filter((b) => b.compartmentIndex === compIdx));
    let boxes = [];
    // 서랍형(drawer)이거나 장/팬트리 선반에서 서랍형을 채울 때는 앞뒤 이중 쌓임(multiRow) 금지
    const opts = {
      stack: isCab || isPan,
      multiRow: !isCab && !isDrawerKind,
      levelRows: !isCab && !isPan && !isDrawerKind
    };
    // 채운 정도: 바닥을 덮은 비율 (쌓는 가구는 높이까지 본 부피 비율)
    const comp = window.PackerEngine.getCompartments(state.spaceConfig)[compIdx];
    const fillRate = (list) => {
      if (!comp || !list.length) return 0;
      let floor = 0, vol = 0;
      list.forEach((b) => {
        const m = state.modelsMap[b.modelId];
        if (!m) return;
        const dm = window.PackerEngine.getOrientedDims(m, b.rot || 0);
        if ((b.y || 0) < 5) floor += dm.w * dm.d;
        vol += dm.w * dm.d * dm.h;
      });
      const fr = floor / (comp.w * comp.d);
      const vr = vol / (comp.w * comp.d * Math.max(1, comp.clearH));
      return opts.stack ? Math.min(fr, 1) * 0.5 + Math.min(vr, 1) * 0.5 : Math.min(fr, 1);
    };
    // 일정 수준(목표 70%) 이상 채운 조합이 나올 때까지 여러 번 뽑고, 안 되면 가장 많이 채운 조합
    const TARGET = 0.7;
    let best = null, bestRate = -1;
    for (let attempt = 0; attempt < 18; attempt++) {
      const rng = seededRng(Math.floor(Math.random() * 1e9));
      const cand = state.spaceConfig.type === 'fridge'
        ? fridgeFillCompartment(compIdx, kind, brand, rng)
        : randomFillCompartment(compIdx, pool, rng, opts);
      if (!cand.length) continue;
      const rate = fillRate(cand);
      const same = sig(cand) === prevSig;
      if (!same && rate >= TARGET) { best = cand; bestRate = rate; break; }
      if (rate > bestRate && (!same || !best)) { best = cand; bestRate = rate; }
    }
    boxes = best || [];
    if (boxes.length > 0) {
      plan.boxes = plan.boxes.filter((b) => b.compartmentIndex !== compIdx).concat(boxes);
      state.selectedBoxIds = [];
    }
    return boxes.length;
  }

  function sheetBtn(label, sub, cls, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sheet-action-btn' + (cls ? ' ' + cls : '');
    b.innerHTML = `<span class="sheet-btn-text"><span>${label}</span>${sub ? `<span class="sheet-action-sub">${sub}</span>` : ''}</span>`;
    b.addEventListener('click', onClick);
    return b;
  }

  function renderAutofillChoice(compIdx, mode) {
    const body = document.getElementById('mobile-shelf-sheet-body');
    const compartments = window.PackerEngine.getCompartments(state.spaceConfig);
    const comp = compartments[compIdx] || compartments[0];
    const isPan = state.spaceConfig.type === 'pantry' || state.spaceConfig.type === 'fridge';
    const kind = isPan ? '상자' : state.spaceConfig.type === 'cabinet' ? '서랍형 상자' : '바구니형 상자';
    const pool = state.spaceConfig.type === 'fridge'
      ? fridgeFillPool(comp, 'mix')
      : typeFillPool(isPan ? 'mix' : undefined).filter((m) => m.h <= comp.clearH);
    const brands = [...new Set(pool.map((m) => m.brand))];

    body.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'sheet-step-head';
    head.innerHTML = mode === 'brand'
      ? `<div class="sheet-step-title">어떤 브랜드로 채울까요?</div><div class="sheet-step-hint">이 칸에 맞는 ${kind}만 보여요.</div>`
      : `<div class="sheet-step-title">어떻게 채울까요?</div><div class="sheet-step-hint">${isPan ? '먼저 브랜드를 골라요. 다음에 상자 종류를 골라요.' : `이 칸에 맞는 ${kind}로 채워요. 지금 놓인 상자는 바뀌어요.`}</div>`;
    body.appendChild(head);

    const fillAndClose = (brand) => {
      if (comp.reserved) {
        head.querySelector('.sheet-step-hint').textContent = '맨 아래 칸은 비워두기로 했어요. "기둥·선반"에서 바꿀 수 있어요.';
        return;
      }
      if (isPan) { renderPantryKindChoice(compIdx, brand); return; }
      const n = runTypeFill(compIdx, brand);
      if (n === 0) {
        head.querySelector('.sheet-step-hint').textContent = '이 칸에 들어가는 상자가 없어요.';
        return;
      }
      closeShelfSheet();
      refreshAll();
    };

    if (pool.length === 0) {
      head.querySelector('.sheet-step-hint').textContent = `이 칸 높이(${comp.clearH} mm)에 맞는 ${kind}가 없어요.`;
    } else if (mode === 'brand') {
      brands.forEach((br) => {
        const cnt = pool.filter((m) => m.brand === br).length;
        body.appendChild(sheetBtn(br, `${cnt}가지 상자`, '', () => fillAndClose(br)));
      });
    } else {
      body.appendChild(sheetBtn('브랜드 상관없이', `${pool.length}가지 상자를 섞어서 채워요`, 'primary', () => fillAndClose(null)));
      body.appendChild(sheetBtn('특정 브랜드만', `${brands.length}개 브랜드 중에서 골라요`, '', () => renderAutofillChoice(compIdx, 'brand')));
    }

    body.appendChild(sheetBtn('뒤로', '', 'ghost', () => {
      if (mode === 'brand') renderAutofillChoice(compIdx);
      else openShelfSheet(compIdx);
    }));
  }

  // 팬트리 한 번에 채우기 2단계: 서랍형 · 바구니형 · 섞어서
  function renderPantryKindChoice(compIdx, brand) {
    const body = document.getElementById('mobile-shelf-sheet-body');
    const comp = window.PackerEngine.getCompartments(state.spaceConfig)[compIdx];
    const isFridge = state.spaceConfig.type === 'fridge';
    const countOf = (k) => (isFridge
      ? fridgeFillPool(comp, k, brand)
      : typeFillPool(k).filter((m) => m.h <= comp.clearH && (!brand || m.brand === brand))).length;

    body.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'sheet-step-head';
    head.innerHTML = `<div class="sheet-step-title">어떤 상자로 채울까요?</div><div class="sheet-step-hint">${isFridge ? '냉장고·주방용 상자만 골라요. ' : ''}${brand ? `${brand} 상자 중에서 골라요.` : '모든 브랜드 상자 중에서 골라요.'} 지금 놓인 상자는 바뀌어요.</div>`;
    body.appendChild(head);

    const go = (k) => {
      const n = runTypeFill(compIdx, brand, k);
      if (n === 0) {
        head.querySelector('.sheet-step-hint').textContent = '이 칸에 들어가는 상자가 없어요.';
        return;
      }
      closeShelfSheet();
      refreshAll();
    };
    const kindRows = isFridge
      ? [['drawer', '서랍형', '칸 깊이의 60%까지 앞쪽에'], ['basket', '바구니형', '칸 높이의 절반까지'], ['mix', '섞어서', '서랍형은 안쪽, 앞에 낮은 바구니 (서랍 절반 열림)']]
      : [['drawer', '서랍형', '앞으로 빼는 상자'], ['basket', '바구니형', '위가 열린 바구니·통'], ['mix', '섞어서', '서랍형과 바구니형을 같이']];
    kindRows.forEach(([k, label, sub], i) => {
      const n = countOf(k);
      const b = sheetBtn(label, n ? `${sub} · ${n}가지` : '이 칸에 맞는 상자가 없어요', i === 2 ? 'primary' : '', () => go(k));
      if (!n) b.disabled = true;
      body.appendChild(b);
    });
    body.appendChild(sheetBtn('뒤로', '', 'ghost', () => renderAutofillChoice(compIdx, brand ? 'brand' : undefined)));
  }

  // 선반 ＋버튼 → 바텀시트 메뉴 열기
  function openShelfSheet(compIdx) {
    const prevIdx = state.activeCompartmentIdx;
    state.activeCompartmentIdx = compIdx;
    if (state.spaceConfig.type === 'drawer' && prevIdx !== compIdx) {
      refreshAll();
    }
    const compartments = window.PackerEngine.getCompartments(state.spaceConfig);
    const comp = compartments[compIdx] || compartments[0];
    const activePlan = getActivePlan();
    const compBoxes = activePlan.boxes.filter((b) => b.compartmentIndex === compIdx);

    document.getElementById('mobile-shelf-sheet-title').textContent =
      `${comp.name} · 상자 ${compBoxes.length}개`;

    const body = document.getElementById('mobile-shelf-sheet-body');
    body.innerHTML = '';

    const makeBtn = (icon, label, cls, onClick, sub) => {
      const b = document.createElement('button');
      b.className = 'sheet-action-btn sheet-menu-btn' + (cls ? ' ' + cls : '');
      b.innerHTML = `<span class="smb-label">${label}</span>${sub ? `<span class="smb-sub">${sub}</span>` : ''}`;
      b.addEventListener('click', onClick);
      return b;
    };

    // 1. 상자 넣기 (고르기 창 열기)
    body.appendChild(makeBtn('', '상자 넣기', 'primary', () => {
      closeShelfSheet();
      state.pickerBrand = 'ALL';
      state.pickerCart = {};
      renderPickerModalContent();
      document.getElementById('modal-box-picker').classList.add('open');
    }, '원하는 상자를 직접 골라 넣어요'));

    // 2. 저장한 묶음 넣기
    body.appendChild(makeBtn('', '저장한 묶음 넣기', '', () => {
      closeShelfSheet();
      state.pickerBrand = 'COMBOS';
      renderPickerModalContent();
      document.getElementById('modal-box-picker').classList.add('open');
    }, '전에 저장해 둔 상자 묶음을 그대로 넣어요'));

    // 3. 한 번에 채우기 → 브랜드 상관없이 / 특정 브랜드만
    body.appendChild(makeBtn('', '한 번에 채우기', '', () => {
      renderAutofillChoice(compIdx);
    }, 'AI가 이 칸에 맞는 알찬 조합을 골라 줘요'));

    // 4. 지금 놓은 것 보기/빼기
    if (compBoxes.length > 0) {
      const listWrap = document.createElement('div');
      listWrap.style.cssText = 'margin-top:4px;border-top:1px solid var(--border);padding-top:10px;';
      listWrap.innerHTML = `<div style="font-size:0.78rem;font-weight:700;color:var(--text-sub);margin-bottom:6px;">지금 놓은 것</div>`;
      compBoxes.forEach((box) => {
        const model = state.modelsMap[box.modelId];
        if (!model) return;
        const row = document.createElement('div');
        row.className = 'placed-mini-item';
        row.innerHTML = `
          <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            <strong>[${model.brand}]</strong> ${model.name}
          </div>
          <button class="btn btn-danger btn-sm" title="빼기">✕</button>`;
        row.querySelector('button').addEventListener('click', () => {
          activePlan.boxes = activePlan.boxes.filter((b) => b.id !== box.id);
          settleBoxes(activePlan.boxes, [box.compartmentIndex]);
          refreshAll();
          openShelfSheet(compIdx); // 목록 갱신
        });
        listWrap.appendChild(row);
      });
      body.appendChild(listWrap);
    }

    // 5. 이 칸 비우기
    if (compBoxes.length > 0) {
      body.appendChild(makeBtn('', '이 칸 비우기', 'danger', async () => {
        const ok = await confirmDialog({
          title: '이 칸을 비울까요?',
          message: `이 칸의 상자 ${compBoxes.length}개가 빠져요.`,
          ok: '비우기'
        });
        if (!ok) return;
        activePlan.boxes = activePlan.boxes.filter((b) => b.compartmentIndex !== compIdx);
        state.selectedBoxIds = [];
        closeShelfSheet();
        refreshAll();
      }));
    }

    document.body.classList.add('mobile-shelf-sheet-open');
    refreshAll();
  }

  function closeShelfSheet() {
    document.body.classList.remove('mobile-shelf-sheet-open');
  }

  // 3D 화면 위 '선반 높이' 팝업 내용 그리기
  function renderShelfHeightPopup() {
    const body = document.getElementById('mobile-shelfh-body');
    if (!body) return;
    if (state.spaceConfig.type === 'pantry') {
      renderPantryPopup(body);
      return;
    }
    if (state.spaceConfig.type === 'fridge') {
      body.innerHTML = `<div class="hint-text">냉장고 선반 수는 '장 설정'에서 바꿔요.</div>`;
      return;
    }
    if (state.spaceConfig.type !== 'cabinet') {
      body.innerHTML = `<div class="hint-text">서랍은 선반이 없어요.</div>`;
      return;
    }
    const c = state.spaceConfig.cabinet;
    body.innerHTML = `
      <div class="sub-block-title" style="margin-bottom:8px;">
        <span>선반 높이 (바닥에서 mm)</span>
        <button id="shelfh-add" class="btn btn-primary btn-sm">+ 선반 넣기</button>
      </div>
      <div id="shelfh-list" class="shelf-list"></div>
    `;

    const listEl = body.querySelector('#shelfh-list');
    c.shelves.forEach((sh, idx) => {
      const row = document.createElement('div');
      row.className = 'shelf-item';
      row.innerHTML = `
        <span>선반 ${idx + 1}</span>
        <input type="number" class="input-box shelfh-y" data-idx="${idx}" value="${sh.bottomY}" step="10" />
        <span style="display:flex;align-items:center;gap:4px;">두께 <input type="number" class="input-box shelfh-t" data-idx="${idx}" value="${sh.thickness}" step="2" style="width:48px;" /></span>
        <button class="btn btn-danger btn-sm shelfh-del" data-idx="${idx}">✕</button>
      `;
      listEl.appendChild(row);
    });

    listEl.querySelectorAll('.shelfh-y').forEach((inp) => {
      inp.addEventListener('change', (e) => {
        const i = Number(e.target.dataset.idx);
        c.shelves[i].bottomY = Math.max(30, Math.min(c.h - 30, Number(e.target.value) || 100));
        refreshAll();
      });
    });
    listEl.querySelectorAll('.shelfh-t').forEach((inp) => {
      inp.addEventListener('change', (e) => {
        const i = Number(e.target.dataset.idx);
        c.shelves[i].thickness = Math.max(5, Math.min(60, Number(e.target.value) || 18));
        refreshAll();
      });
    });
    listEl.querySelectorAll('.shelfh-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const i = Number(e.target.dataset.idx);
        c.shelves.splice(i, 1);
        if (state.activeCompartmentIdx > c.shelves.length) state.activeCompartmentIdx = c.shelves.length;
        refreshAll();
        renderShelfHeightPopup();
      });
    });
    body.querySelector('#shelfh-add').addEventListener('click', () => {
      const lastY = c.shelves.length > 0 ? c.shelves[c.shelves.length - 1].bottomY : 0;
      const nextY = Math.min(c.h - 80, lastY + 350);
      c.shelves.push({ id: 'sh-' + Date.now(), bottomY: Math.max(80, nextY), thickness: 18 });
      refreshAll();
      renderShelfHeightPopup();
    });
  }

  // ===== 팬트리: 기둥 위치 · 열마다 선반 높이 · 선반 깊이 (3D 화면의 '기둥·선반' 창) =====
  function renderPantryPopup(body) {
    const p = state.spaceConfig.pantry;
    const { bays, startB } = window.PackerEngine.getPantryBays(state.spaceConfig);
    if (!bays.some((b) => b.key === state.pantryBay)) state.pantryBay = bays[0] ? bays[0].key : 'A0';
    const bay = bays.find((b) => b.key === state.pantryBay);
    const bayLabel = (b) => `${b.wall === 'A' ? '안쪽' : '옆'} ${b.col + 1}열`;
    const clampNum = (v, lo, hi, dflt) => Math.max(lo, Math.min(hi, Number.isFinite(Number(v)) ? Number(v) : dflt));
    const after = (redraw) => { refreshAll(); if (redraw !== false) renderShelfHeightPopup(); };

    const walk = window.PackerEngine.getPantryWalkway(state.spaceConfig);
    body.innerHTML = `
      ${walk.ok ? '' : `<div class="pp-warn">걷는 길이 ${walk.min} mm로 좁아요. 600 mm 이상이 좋아요. 선반 깊이를 줄여 보세요.</div>`}
      <div class="pp-sec">
        <label class="pp-toggle"><span>맨 아래 칸 비워두기 <span class="pp-cap">쌀통·생수·청소기 자리</span></span><input id="pp-keep-floor" type="checkbox" ${p.keepFloor ? 'checked' : ''}></label>
        <div class="pp-h" style="margin-top:8px;">입구 쪽</div>
        <div class="pp-chips" id="pp-door"></div>
      </div>
      <div class="pp-sec">
        <div class="pp-h">열 고르기</div>
        <div class="pp-chips" id="pp-bays"></div>
      </div>
      <div class="pp-sec">
        <div class="pp-h-row">
          <span class="pp-h">${bay ? bayLabel(bay) : ''} 선반 높이 <span class="pp-cap">바닥에서 mm</span></span>
          <button id="pp-add-shelf" class="pp-text-btn" type="button">+ 선반 넣기</button>
        </div>
        <div id="pp-shelves" class="shelf-list"></div>
        <button id="pp-apply-all" class="pp-outline-btn" type="button">모든 열을 이 열처럼</button>
      </div>
      <div class="pp-sec">
        <div class="pp-h">세로 기둥 위치 <span class="pp-cap">벽 끝에서 mm</span></div>
        <div id="pp-posts"></div>
      </div>
      <div class="pp-sec">
        <div class="pp-h">선반 깊이 · 기둥 굵기</div>
        <div class="pp-grid2">
          <label class="pp-field"><span>안쪽 벽 깊이</span><input id="pp-depth-a" type="number" class="input-box" step="10" value="${p.depthA}"></label>
          <label class="pp-field"><span>옆 벽 깊이</span><input id="pp-depth-b" type="number" class="input-box" step="10" value="${p.depthB}" ${p.wallB === false ? 'disabled' : ''}></label>
          <label class="pp-field"><span>기둥 굵기</span><input id="pp-post-w" type="number" class="input-box" step="5" value="${p.postW}"></label>
        </div>
      </div>`;

    // 맨 아래 비워두기 · 입구 쪽
    body.querySelector('#pp-keep-floor').addEventListener('change', (e) => {
      p.keepFloor = e.target.checked;
      if (p.keepFloor) {
        // 이미 넣은 바닥 칸 상자는 지움
        const comps = window.PackerEngine.getCompartments(state.spaceConfig);
        state.plans.forEach((pl) => { pl.boxes = pl.boxes.filter((b) => !(comps[b.compartmentIndex] && comps[b.compartmentIndex].reserved)); });
      }
      after();
    });
    const doorEl = body.querySelector('#pp-door');
    [['left', '왼쪽 입구'], ['right', '오른쪽 입구']].forEach(([v, label]) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'sp-chip' + ((p.doorSide || 'left') === v ? ' selected' : '');
      chip.textContent = label;
      chip.addEventListener('click', () => {
        p.doorSide = v;
        after();
        window.Scene3DManager.setCameraView('iso');
      });
      doorEl.appendChild(chip);
    });

    // 열 칩
    const chipsEl = body.querySelector('#pp-bays');
    bays.forEach((b) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'sp-chip' + (b.key === state.pantryBay ? ' selected' : '');
      chip.innerHTML = `${bayLabel(b)}<span class="pp-chip-sub">${Math.round(b.w)}mm</span>`;
      chip.addEventListener('click', () => { state.pantryBay = b.key; renderShelfHeightPopup(); });
      chipsEl.appendChild(chip);
    });

    // 고른 열의 선반
    const shelvesEl = body.querySelector('#pp-shelves');
    const list = bay ? pantryBayShelves(bay.key, false) : [];
    list.forEach((sh, idx) => {
      const row = document.createElement('div');
      row.className = 'shelf-item';
      row.innerHTML = `
        <span>${idx + 1}단 위</span>
        <input type="number" class="input-box pp-y" value="${sh.bottomY}" step="10" aria-label="${idx + 1}번째 선반 높이" />
        <span style="display:flex;align-items:center;gap:4px;">두께 <input type="number" class="input-box pp-t" value="${sh.thickness || 18}" step="2" style="width:48px;" aria-label="두께" /></span>
        <button class="btn btn-danger btn-sm pp-del" type="button" aria-label="이 선반 빼기">✕</button>`;
      row.querySelector('.pp-y').addEventListener('change', (e) => {
        const own = pantryBayShelves(bay.key, true);
        own[idx].bottomY = clampNum(e.target.value, 30, p.h - 30, own[idx].bottomY);
        after();
      });
      row.querySelector('.pp-t').addEventListener('change', (e) => {
        const own = pantryBayShelves(bay.key, true);
        own[idx].thickness = clampNum(e.target.value, 5, 60, 18);
        after();
      });
      row.querySelector('.pp-del').addEventListener('click', () => {
        snapPantryComps();
        const own = pantryBayShelves(bay.key, true);
        own.splice(idx, 1);
        // 빠진 선반 위의 단은 한 칸씩 내려옴: 같은 열의 상자는 단 번호 기준으로 다시 맞춤
        clampPantryBoxes();
        after();
      });
      shelvesEl.appendChild(row);
    });
    if (!list.length) shelvesEl.innerHTML = '<div class="pp-cap">선반이 없어요. 바닥부터 천장까지 한 칸이에요.</div>';

    body.querySelector('#pp-add-shelf').addEventListener('click', () => {
      if (!bay) return;
      snapPantryComps();
      const own = pantryBayShelves(bay.key, true);
      const sorted = [...own].sort((a, b) => a.bottomY - b.bottomY);
      // 가장 넓은 칸 가운데에 넣음
      let bestGap = -1, bestY = 400;
      let prev = 0;
      [...sorted, { bottomY: p.h }].forEach((s) => {
        if (s.bottomY - prev > bestGap) { bestGap = s.bottomY - prev; bestY = Math.round((prev + s.bottomY) / 2 / 10) * 10; }
        prev = s.bottomY + (s.thickness || 18);
      });
      own.push({ id: `${bay.key}-${Date.now()}`, bottomY: bestY, thickness: 18 });
      own.sort((a, b) => a.bottomY - b.bottomY);
      clampPantryBoxes();
      after();
    });
    body.querySelector('#pp-apply-all').addEventListener('click', () => {
      if (!bay) return;
      snapPantryComps();
      const src = pantryBayShelves(bay.key, false).map((s) => ({ bottomY: s.bottomY, thickness: s.thickness || 18 }));
      p.defaultShelves = src.map((s, i) => ({ id: `ps-${i}-${Date.now()}`, ...s }));
      p.bayShelves = {};
      clampPantryBoxes();
      after();
    });

    // 기둥 위치
    const postsEl = body.querySelector('#pp-posts');
    const wallRow = (wall) => {
      if (wall === 'B' && p.wallB === false) return;
      const key = wall === 'A' ? 'postsA' : 'postsB';
      const lo = wall === 'A' ? 0 : startB;
      const hi = wall === 'A' ? p.roomW : p.roomD;
      const wrap = document.createElement('div');
      wrap.className = 'pp-post-wall';
      wrap.innerHTML = `<div class="pp-sub">${wall === 'A' ? '안쪽 벽 (왼쪽 끝부터)' : '옆 벽 (안쪽 구석부터)'}</div>`;
      const posts = [...(p[key] || [])].sort((a, b) => a - b);
      posts.forEach((pos, i) => {
        const row = document.createElement('div');
        row.className = 'shelf-item';
        row.innerHTML = `
          <span>기둥 ${i + 1}</span>
          <input type="number" class="input-box" value="${pos}" step="10" aria-label="기둥 ${i + 1} 위치" />
          <span class="pp-cap">mm</span>
          <button class="btn btn-danger btn-sm" type="button" aria-label="기둥 ${i + 1} 빼기">✕</button>`;
        row.querySelector('input').addEventListener('change', (e) => {
          snapPantryComps();
          posts[i] = clampNum(e.target.value, lo + 60, hi - 60, pos);
          p[key] = posts.sort((a, b) => a - b);
          clampPantryBoxes();
          after();
        });
        row.querySelector('button').addEventListener('click', () => {
          snapPantryComps();
          posts.splice(i, 1);
          p[key] = posts;
          delete p.bayShelves[`${wall}${posts.length}`];
          clampPantryBoxes();
          after();
        });
        wrap.appendChild(row);
      });
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'pp-text-btn';
      add.textContent = '+ 기둥 넣기';
      add.addEventListener('click', () => {
        snapPantryComps();
        // 가장 넓은 열 가운데에 기둥
        const edges = [lo, ...posts, hi];
        let bi = 0;
        for (let i = 0; i < edges.length - 1; i++) if (edges[i + 1] - edges[i] > edges[bi + 1] - edges[bi]) bi = i;
        posts.push(Math.round((edges[bi] + edges[bi + 1]) / 2 / 10) * 10);
        p[key] = posts.sort((a, b) => a - b);
        clampPantryBoxes();
        after();
      });
      wrap.appendChild(add);
      postsEl.appendChild(wrap);
    };
    wallRow('A');
    wallRow('B');

    const bindNum = (id, set) => body.querySelector(id).addEventListener('change', (e) => { set(Number(e.target.value)); after(); });
    bindNum('#pp-depth-a', (v) => { snapPantryComps(); p.depthA = clampNum(v, 150, Math.min(900, p.roomD - 200), 400); clampPantryBoxes(); });
    bindNum('#pp-depth-b', (v) => { p.depthB = clampNum(v, 150, Math.min(900, p.roomW - 200), 400); });
    bindNum('#pp-post-w', (v) => { p.postW = clampNum(v, 0, 80, 25); });
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
      `상자 ${posInfo.count}개 골랐어요`;

    const isCab = state.spaceConfig.type === 'cabinet';
    document.getElementById('btn-bundle-up').style.display = isCab ? 'inline-flex' : 'none';
    document.getElementById('btn-bundle-down').style.display = isCab ? 'inline-flex' : 'none';
  }

  function saveCurrentSelectionAsCombo() {
    const activePlan = getActivePlan();
    const selBoxes = activePlan.boxes.filter((b) => state.selectedBoxIds.includes(b.id));
    if (selBoxes.length === 0) return;

    const defaultName = `내 묶음 (${selBoxes.length}개)`;
    const name = prompt('이 묶음 이름을 정해주세요:', defaultName);
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
    const compIdx = Math.min(compartments.length - 1, Math.max(0, state.activeCompartmentIdx || 0));
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
    const compIdx = Math.min(compartments.length - 1, Math.max(0, state.activeCompartmentIdx || 0));
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
        // 바닥도 꽉 차고 위에 쌓아도 천장을 넘으면 넣지 않음 (칸 밖으로 튀어나오지 않게)
        if (candidates[0].stackedY + dims.h > comp.clearH + 1) return false;
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
    return true;
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
      alert(deltaIdx > 0 ? '위에 칸이 더 없어요.' : '이미 맨 아래 칸이에요.');
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

    settleBoxes(activePlan.boxes, [currentCompIdx]);
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

  // 아래 상자를 빼거나 옮기면, 그 위에 떠 있던 상자를 아래(바닥 또는 남은 상자 위)로 내려놓음
  // - 낮은 상자부터 차례로 내려놓고, 이미 내려놓은 상자만 받침으로 봄 (위 상자를 받침으로 착각하지 않게)
  // - 내려가기만 하고 올라가지는 않음
  function settleBoxes(boxes, compIdxList) {
    const targets = new Set(compIdxList);
    targets.forEach((ci) => {
      const list = boxes.filter((b) => b.compartmentIndex === ci).sort((a, b) => (a.y || 0) - (b.y || 0));
      const settled = [];
      list.forEach((b) => {
        const m = state.modelsMap[b.modelId];
        if (!m) { settled.push(b); return; }
        const d = window.PackerEngine.getOrientedDims(m, b.rot || 0);
        let support = 0;
        settled.forEach((o) => {
          const om = state.modelsMap[o.modelId];
          if (!om) return;
          const od = window.PackerEngine.getOrientedDims(om, o.rot || 0);
          const overlap = b.x < o.x + od.w - 4 && b.x + d.w > o.x + 4 && b.z < o.z + od.d - 4 && b.z + d.d > o.z + 4;
          if (!overlap) return;
          const offset = (om.id === m.id && om.stackable) ? (om.stackingOffset || 0) : 0;
          const top = (o.y || 0) + od.h - offset;
          if (top <= (b.y || 0) + 1 && top > support) support = top;
        });
        if (support < (b.y || 0)) b.y = Math.round(support);
        settled.push(b);
      });
    });
  }

  function deleteSelectedBoxes() {
    if (state.selectedBoxIds.length === 0) return;
    const activePlan = getActivePlan();
    const removed = activePlan.boxes.filter((b) => state.selectedBoxIds.includes(b.id));
    activePlan.boxes = activePlan.boxes.filter((b) => !state.selectedBoxIds.includes(b.id));
    settleBoxes(activePlan.boxes, removed.map((b) => b.compartmentIndex));
    state.selectedBoxIds = [];
    refreshAll();
  }

  // 좌상단 & 좌하단 아코디언 카드 렌더링
  function renderLeftAccordionCards() {
    const isCab = state.spaceConfig.type === 'cabinet';

    const spaceCard = document.getElementById('floating-space-card');
    spaceCard.classList.toggle('open', state.spaceCardOpen);
    document.getElementById('space-card-chevron').textContent = state.spaceCardOpen ? '∧' : '∨';
    document.getElementById('space-card-type-badge').textContent = SPACE_TYPE_LABELS[state.spaceConfig.type] || '문 달린 장';

    const shelfCard = document.getElementById('floating-shelf-card');
    shelfCard.style.display = isCab ? 'flex' : 'none';
    shelfCard.classList.toggle('open', state.shelfCardOpen);
    document.getElementById('shelf-card-chevron').textContent = state.shelfCardOpen ? '∧' : '∨';
    document.getElementById('shelf-count-badge').textContent = `선반 ${state.spaceConfig.cabinet.shelves.length}개`;

    ['cabinet', 'drawer', 'pantry', 'fridge'].forEach((t) => {
      document.getElementById(`card-type-${t}`)?.classList.toggle('active', state.spaceConfig.type === t);
    });

    document.getElementById('cabinet-config-section').style.display = isCab ? 'block' : 'none';
    document.getElementById('drawer-config-section').style.display = state.spaceConfig.type === 'drawer' ? 'block' : 'none';
    updateOpenCtrlButton();

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
        clearFrameBtn.textContent = isNoFrame ? '🔄 문틀 되돌리기' : '문틀 없음(0)';
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
        `들어가는 문 크기: <strong>${cabConst.doorClearW} × ${cabConst.doorClearH} mm</strong> ` +
        `(왼쪽 걸림 ${cabConst.leftDeadW}mm / 오른쪽 걸림 ${cabConst.rightDeadW}mm)`;

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

      // 서랍 칸 수 표시
      const tiers = Math.min(6, Math.max(1, Math.round(Number(d.tiers) || 2)));
      const tiersVal = document.getElementById('drw-tiers-val');
      const tiersLabel = document.getElementById('drw-tiers-label');
      if (tiersVal) tiersVal.textContent = tiers;
      if (tiersLabel) tiersLabel.textContent = tiers === 1 ? '칸' : `칸 (위 ${1}칸 열림)`;

      const drwConst = window.PackerEngine.getDrawerConstraints(state.spaceConfig);
      const ratioPct = Math.round((drwConst.exposedD / drwConst.totalD) * 100);
      document.getElementById('drw-exposure-summary').innerHTML =
        `보이는 곳: <strong style="color:#3b8a64">${drwConst.exposedD}mm (${ratioPct}%)</strong> / ` +
        `꺼내기 힘든 곳: <strong style="color:#d97706">${drwConst.unexposedD}mm (${100 - ratioPct}%)</strong>`;
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
      // 누른 칸만 아래로 펴짐 (PC·모바일 동일) — 팝업처럼 동작
      const isExpanded = comp.index === state.expandedCompartmentIdx;

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
          <span class="badge">${compBoxes.length}개 놓음</span>
        </div>
        <div class="shelf-callout-dims">가로 ${comp.w} × 깊이 ${comp.d} × 높이 ${comp.clearH} mm</div>
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
            ➕ 이 칸에 상자 넣기
          </button>

          <div class="right-subtabs">
            <button class="subtab-btn exp-tab-placed ${isPlacedTab ? 'active' : ''}">📋 지금 놓은 것</button>
            <button class="subtab-btn exp-tab-combos ${!isPlacedTab ? 'active' : ''}">저장한 묶음 (${state.savedCombos.length})</button>
          </div>

          <div class="exp-placed-section" style="display:${isPlacedTab ? 'block' : 'none'};">
            <div style="font-size:0.7rem;color:var(--text-sub);margin-bottom:4px;">
              💡 <strong>Shift + 클릭</strong>으로 여러 개 고르기.
            </div>
            <div class="placed-mini-list exp-placed-list"></div>
          </div>

          <div class="exp-combos-section" style="display:${!isPlacedTab ? 'block' : 'none'};">
            <div class="saved-combo-list exp-combo-list"></div>
          </div>

          <div style="border-top:1px solid var(--border);padding-top:8px;">
            <button type="button" class="btn exp-toggle-autofill-btn" style="width:100%;justify-content:space-between;background:${state.autofillPanelOpen ? '#f3e5d3' : '#faf5eb'};border-color:#d5c3aa;color:#5c4228;font-weight:700;">
              <span>⚡ 한 번에 채우기</span>
              <span style="color:#b86b43;font-weight:800;">${state.autofillPanelOpen ? '접기 ∧' : '열기 ∨'}</span>
            </button>

            <div class="exp-autofill-body" style="display:${state.autofillPanelOpen ? 'flex' : 'none'};flex-direction:column;gap:7px;margin-top:8px;padding:10px;background:#faf5ec;border:1px solid #e3d5c1;border-radius:8px;">
              <div class="form-group">
                <label>채우는 방법</label>
                <select class="exp-autofill-mode">
                  <option value="single" ${state.autofillMode === 'single' ? 'selected' : ''}>상자 한 종류로 채우기</option>
                  <option value="brand_mix" ${state.autofillMode === 'brand_mix' ? 'selected' : ''}>한 브랜드 여러 크기로 채우기</option>
                </select>
              </div>

              <div class="exp-single-group" style="display:${state.autofillMode === 'single' ? 'flex' : 'none'};flex-direction:column;gap:6px;">
                <div class="form-group">
                  <label>1. 브랜드</label>
                  <select class="exp-autofill-single-brand">
                    ${brands.map((b) => `<option value="${b}" ${b === state.autofillSingleBrand ? 'selected' : ''}>${b}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>2. 상자 (${state.autofillSingleBrand})</label>
                  <select class="exp-autofill-model">
                    ${singleBrandModels.map((m) => `<option value="${m.id}" ${m.id === state.selectedCatalogModelId ? 'selected' : ''}>[${m.lineup}] ${m.name} (${m.wTop}×${m.dTop}×H${m.h}mm)</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="form-group exp-brand-group" style="display:${state.autofillMode === 'brand_mix' ? 'flex' : 'none'};">
                <label>브랜드</label>
                <select class="exp-autofill-brand">
                  ${brands.map((b) => `<option value="${b}" ${b === state.autofillBrand ? 'selected' : ''}>${b}</option>`).join('')}
                </select>
              </div>

              <label class="checkbox-row">
                <input type="checkbox" class="exp-chk-deadzone" ${state.autofillAvoidDeadzone ? 'checked' : ''} />
                <span>${state.spaceConfig.type === 'cabinet' ? '문에 걸리는 곳 빼기' : '꺼내기 힘든 곳 빼기'}</span>
              </label>
              <label class="checkbox-row">
                <input type="checkbox" class="exp-chk-rotate" ${state.autofillRotate ? 'checked' : ''} />
                <span>필요하면 돌려서 넣기</span>
              </label>
              <label class="checkbox-row">
                <input type="checkbox" class="exp-chk-stack" ${state.autofillStack ? 'checked' : ''} />
                <span>위로 쌓기</span>
              </label>

              <button class="btn exp-run-autofill-btn" style="width:100%;margin-top:4px;border-color:var(--accent);background:#fff;color:var(--accent);font-weight:800;">
                ⚡ 이 칸 채우기
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
          miniListEl.innerHTML = `<div style="font-size:0.72rem;color:var(--text-muted);padding:4px;">아직 놓은 상자가 없어요.</div>`;
        } else {
          compBoxes.forEach((box) => {
            const model = state.modelsMap[box.modelId];
            if (!model) return;
            const dims = window.PackerEngine.getOrientedDims(model, box.rot || 0);
            const isSel = state.selectedBoxIds.includes(box.id);
            const layerTag = (box.y || 0) > 5 ? ` · 위로 +${box.y}mm` : '';

            const item = document.createElement('div');
            item.className = 'placed-mini-item' + (isSel ? (isMultiBundle ? ' in-bundle' : ' active') : '');
            item.innerHTML = `
              <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                <strong>[${model.brand}]</strong> ${model.name} <span style="color:var(--text-muted);">(${dims.w}×${dims.d}${layerTag})</span>
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0;">
                <button class="btn btn-sm mini-rot-btn" title="돌리기">↻</button>
                <button class="btn btn-danger btn-sm mini-del-btn" title="빼기">✕</button>
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
              settleBoxes(activePlan.boxes, [box.compartmentIndex]);
              state.selectedBoxIds = state.selectedBoxIds.filter((id) => id !== box.id);
              refreshAll();
            });
            miniListEl.appendChild(item);
          });
        }

        // 저장된 조합 탭 채우기
        const comboListEl = panel.querySelector('.exp-combo-list');
        if (state.savedCombos.length === 0) {
          comboListEl.innerHTML = `<div style="font-size:0.72rem;color:var(--text-muted);padding:4px;">저장한 묶음이 없어요.</div>`;
        } else {
          state.savedCombos.forEach((combo) => {
            const fitsSize = combo.totalW <= comp.w && combo.totalD <= comp.d && combo.maxH <= comp.clearH;
            const cCard = document.createElement('div');
            cCard.className = 'saved-combo-card';
            cCard.innerHTML = `
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:0.75rem;">${combo.name}</div>
                <div style="font-size:0.68rem;color:var(--text-sub);">
                  ${combo.items.length}개 · ${combo.totalW}×${combo.totalD}×H${combo.maxH}mm
                  <span style="color:${fitsSize ? '#047857' : '#b91c1c'};font-weight:700;">${fitsSize ? '(들어감)' : '(안 들어감)'}</span>
                </div>
              </div>
              <div style="display:flex;gap:4px;">
                <button class="btn btn-primary btn-sm c-ins-btn">+ 넣기</button>
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
          // 여러 크기로 채우기: 가구 종류에 맞는 상자로, 누를 때마다 다른 조합
          if (state.autofillMode === 'brand_mix') {
            runTypeFill(comp.index, state.autofillBrand === 'ALL' ? null : state.autofillBrand);
            refreshAll();
            return;
          }
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
    const compIdx = Math.min(compartments.length - 1, Math.max(0, state.activeCompartmentIdx || 0));
    const activeComp = compartments[compIdx] || compartments[0];

    document.getElementById('picker-target-space-badge').textContent =
      `놓을 곳: ${activeComp.name} (${Math.round(activeComp.w)}×${Math.round(activeComp.d)}×높이 ${Math.round(activeComp.clearH)}mm)`;

    const tabsEl = document.getElementById('picker-brand-tabs');
    tabsEl.innerHTML = '';

    // 브랜드 목록: ◀ 전체/브랜드 ▶ 화살표로 넘기기, 글자 누르면 목록 펼침
    const brandList = ['ALL', ...new Set(state.catalogModels.map((m) => m.brand)), 'COMBOS'];
    const labelOf = (b) => b === 'ALL' ? '전체' : b === 'COMBOS' ? '저장한 묶음' : b;
    let curIdx = brandList.indexOf(state.pickerBrand);
    if (curIdx < 0) curIdx = 0;

    const nav = document.createElement('div');
    nav.className = 'brand-nav';
    nav.innerHTML = `
      <button class="brand-nav-arrow" data-dir="-1" title="이전">◀</button>
      <button class="brand-nav-label">${labelOf(brandList[curIdx])}</button>
      <button class="brand-nav-arrow" data-dir="1" title="다음">▶</button>
    `;
    const goTo = (idx) => {
      const n = brandList.length;
      state.pickerBrand = brandList[((idx % n) + n) % n];
      state.pickerBrandListOpen = false;
      renderPickerModalContent();
    };
    nav.querySelectorAll('.brand-nav-arrow').forEach((btn) => {
      btn.addEventListener('click', () => goTo(curIdx + Number(btn.dataset.dir)));
    });
    nav.querySelector('.brand-nav-label').addEventListener('click', () => {
      state.pickerBrandListOpen = !state.pickerBrandListOpen;
      renderPickerModalContent();
    });
    const navSlot = document.getElementById('picker-brand-nav-slot');
    if (navSlot) { navSlot.innerHTML = ''; navSlot.appendChild(nav); } else tabsEl.appendChild(nav);

    // 필터 조건에 맞는 카탈로그 모델 목록 계산
    const getFilteredCatalogModels = () => {
      const pf = state.pickerFilters;
      const wMin = pf.wMin !== '' && Number.isFinite(Number(pf.wMin)) ? Number(pf.wMin) : null;
      const wMax = pf.wMax !== '' && Number.isFinite(Number(pf.wMax)) ? Number(pf.wMax) : null;
      const dMin = pf.dMin !== '' && Number.isFinite(Number(pf.dMin)) ? Number(pf.dMin) : null;
      const dMax = pf.dMax !== '' && Number.isFinite(Number(pf.dMax)) ? Number(pf.dMax) : null;
      const hMin = pf.hMin !== '' && Number.isFinite(Number(pf.hMin)) ? Number(pf.hMin) : null;
      const hMax = pf.hMax !== '' && Number.isFinite(Number(pf.hMax)) ? Number(pf.hMax) : null;

      return state.catalogModels.filter((m) => {
        if (state.pickerBrand !== 'ALL' && m.brand !== state.pickerBrand) return false;
        // 수납함 형태 (체크된 항목이 있을 때만 해당 항목으로 필터링)
        if (pf.kinds.length > 0 && pf.kinds.length < 3) {
          if (!pf.kinds.includes(window.getModelKind(m))) return false;
        }
        // 적층 가능 여부
        if (pf.stackable.length > 0 && pf.stackable.length < 2) {
          const stkKey = m.stackable ? 'yes' : 'no';
          if (!pf.stackable.includes(stkKey)) return false;
        }
        // 투명 / 반투명 / 불투명
        if (pf.transparency.length > 0 && pf.transparency.length < 3) {
          const trKey = window.getModelTransparency ? window.getModelTransparency(m) : 'opaque';
          if (!pf.transparency.includes(trKey)) return false;
        }
        // 찾는 사이즈 (가로 wTop, 세로 dTop, 높이 h)
        if (wMin !== null && m.wTop < wMin) return false;
        if (wMax !== null && m.wTop > wMax) return false;
        if (dMin !== null && m.dTop < dMin) return false;
        if (dMax !== null && m.dTop > dMax) return false;
        if (hMin !== null && m.h < hMin) return false;
        if (hMax !== null && m.h > hMax) return false;

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
    };

    const isFilterCustomized = () => {
      const pf = state.pickerFilters;
      const hasKindFilter = pf.kinds.length > 0 && pf.kinds.length < 3;
      const hasStackFilter = pf.stackable.length > 0 && pf.stackable.length < 2;
      const hasTransFilter = pf.transparency.length > 0 && pf.transparency.length < 3;
      const hasSizeFilter = [pf.wMin, pf.wMax, pf.dMin, pf.dMax, pf.hMin, pf.hMax].some((v) => v !== '' && v !== null);
      return hasKindFilter || hasStackFilter || hasTransFilter || hasSizeFilter;
    };

    // 새로운 '필터' 버튼 (슬라이더 조절 아이콘 + '필터' 글자) + 우측 '+ 직접 추가' 버튼
    let filterBtnEl = null;
    if (state.pickerBrand !== 'COMBOS') {
      const chips = document.createElement('div');
      chips.className = 'kind-chips';

      const filterBtn = document.createElement('button');
      filterBtn.type = 'button';
      filterBtnEl = filterBtn;
      const updateFilterBtnLabel = () => {
        const count = getFilteredCatalogModels().length;
        const active = state.pickerFilterOpen || isFilterCustomized();
        filterBtn.className = 'picker-filter-btn' + (active ? ' active' : '');
        filterBtn.innerHTML = `
          <svg class="picker-filter-icon" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <line x1="3" y1="5" x2="17" y2="5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="8" cy="5" r="2.1" fill="var(--pf-knob-bg, #fff)" stroke="currentColor" stroke-width="1.6"/>
            <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="12.5" cy="10" r="2.1" fill="var(--pf-knob-bg, #fff)" stroke="currentColor" stroke-width="1.6"/>
            <line x1="3" y1="15" x2="17" y2="15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="7" cy="15" r="2.1" fill="var(--pf-knob-bg, #fff)" stroke="currentColor" stroke-width="1.6"/>
          </svg>
          <span>필터</span>
          <span class="picker-filter-count">${count}</span>
        `;
      };
      updateFilterBtnLabel();
      filterBtn.addEventListener('click', () => {
        state.pickerFilterOpen = !state.pickerFilterOpen;
        renderPickerModalContent();
        if (state.pickerFilterOpen) maybeShowFilterGuide(); // 처음 필터를 열면 사용법 안내
      });
      chips.appendChild(filterBtn);

      // 목록에 없는 상자 직접 추가 (오른쪽 끝)
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'kind-add-btn';
      addBtn.innerHTML = '<span aria-hidden="true">＋</span> 직접 추가';
      addBtn.setAttribute('aria-label', '목록에 없는 상자 직접 추가');
      addBtn.addEventListener('click', openAddBoxModal);
      const sep = document.createElement('span');
      sep.className = 'kind-sep';
      sep.setAttribute('aria-hidden', 'true');
      chips.appendChild(sep);
      chips.appendChild(addBtn);
      tabsEl.appendChild(chips);

      // 필터 패널이 열려 있으면 바로 아래에 표시
      if (state.pickerFilterOpen) {
        const pf = state.pickerFilters;
        const panel = document.createElement('div');
        panel.className = 'picker-filter-panel';
        panel.innerHTML = `
          <div class="pfp-top-actions">
            <span class="pfp-top-title">상세 조건 필터 (중복 체크 가능)
              <button type="button" class="pfp-help-btn" data-act="help" aria-label="필터 사용법 보기">사용법</button>
            </span>
            <div class="pfp-top-btns">
              <button type="button" class="pfp-action-btn" data-act="check-all">모두 체크</button>
              <button type="button" class="pfp-action-btn" data-act="uncheck-all">모두 해제</button>
            </div>
          </div>

          <div class="pfp-group">
            <div class="pfp-group-label">수납함 형태</div>
            <div class="pfp-checks">
              <label class="pfp-check-chip"><input type="checkbox" data-group="kinds" value="drawer" ${pf.kinds.includes('drawer') ? 'checked' : ''} /><span>서랍형</span></label>
              <label class="pfp-check-chip"><input type="checkbox" data-group="kinds" value="basket" ${pf.kinds.includes('basket') ? 'checked' : ''} /><span>바구니형</span></label>
              <label class="pfp-check-chip"><input type="checkbox" data-group="kinds" value="lid" ${pf.kinds.includes('lid') ? 'checked' : ''} /><span>뚜껑형</span></label>
            </div>
          </div>

          <div class="pfp-group">
            <div class="pfp-group-label">적층 가능 여부</div>
            <div class="pfp-checks">
              <label class="pfp-check-chip"><input type="checkbox" data-group="stackable" value="yes" ${pf.stackable.includes('yes') ? 'checked' : ''} /><span>적층 가능</span></label>
              <label class="pfp-check-chip"><input type="checkbox" data-group="stackable" value="no" ${pf.stackable.includes('no') ? 'checked' : ''} /><span>적층 불가</span></label>
            </div>
          </div>

          <div class="pfp-group">
            <div class="pfp-group-head">
              <span class="pfp-group-label">찾는 사이즈 (단위: mm)</span>
              <div class="pfp-size-quick">
                <button type="button" class="pfp-mini-btn" data-act="fit-comp">현재 칸 이하로</button>
                <button type="button" class="pfp-mini-btn" data-act="clear-size">치수 지우기</button>
              </div>
            </div>
            <div class="pfp-size-rows">
              <div class="pfp-size-row">
                <span class="pfp-size-name">가로(폭)</span>
                <input type="number" class="pfp-size-input" data-size="wMin" placeholder="최소" value="${pf.wMin}" step="10" min="0" />
                <span class="pfp-tilde">~</span>
                <input type="number" class="pfp-size-input" data-size="wMax" placeholder="최대 (${Math.round(activeComp.w)})" value="${pf.wMax}" step="10" min="0" />
                <span class="pfp-unit">mm</span>
              </div>
              <div class="pfp-size-row">
                <span class="pfp-size-name">세로(깊이)</span>
                <input type="number" class="pfp-size-input" data-size="dMin" placeholder="최소" value="${pf.dMin}" step="10" min="0" />
                <span class="pfp-tilde">~</span>
                <input type="number" class="pfp-size-input" data-size="dMax" placeholder="최대 (${Math.round(activeComp.d)})" value="${pf.dMax}" step="10" min="0" />
                <span class="pfp-unit">mm</span>
              </div>
              <div class="pfp-size-row">
                <span class="pfp-size-name">높이</span>
                <input type="number" class="pfp-size-input" data-size="hMin" placeholder="최소" value="${pf.hMin}" step="10" min="0" />
                <span class="pfp-tilde">~</span>
                <input type="number" class="pfp-size-input" data-size="hMax" placeholder="최대 (${Math.round(activeComp.clearH)})" value="${pf.hMax}" step="10" min="0" />
                <span class="pfp-unit">mm</span>
              </div>
            </div>
          </div>

          <div class="pfp-group">
            <div class="pfp-group-label">투명 · 반투명 여부</div>
            <div class="pfp-checks">
              <label class="pfp-check-chip"><input type="checkbox" data-group="transparency" value="clear" ${pf.transparency.includes('clear') ? 'checked' : ''} /><span>투명</span></label>
              <label class="pfp-check-chip"><input type="checkbox" data-group="transparency" value="translucent" ${pf.transparency.includes('translucent') ? 'checked' : ''} /><span>반투명</span></label>
              <label class="pfp-check-chip"><input type="checkbox" data-group="transparency" value="opaque" ${pf.transparency.includes('opaque') ? 'checked' : ''} /><span>불투명(일반)</span></label>
            </div>
          </div>
        `;

        // 체크박스 이벤트
        panel.querySelectorAll('input[type="checkbox"][data-group]').forEach((chk) => {
          chk.addEventListener('change', () => {
            const grp = chk.dataset.group;
            const val = chk.value;
            const arr = state.pickerFilters[grp] || [];
            if (chk.checked) {
              if (!arr.includes(val)) arr.push(val);
            } else {
              state.pickerFilters[grp] = arr.filter((x) => x !== val);
            }
            updateFilterBtnLabel();
            renderCardsOnly();
          });
        });

        // 사이즈 입력 이벤트 (포커스가 끊기지 않도록 카드 목록과 버튼 배지만 즉시 갱신)
        panel.querySelectorAll('.pfp-size-input').forEach((inp) => {
          inp.addEventListener('input', () => {
            const k = inp.dataset.size;
            state.pickerFilters[k] = inp.value.trim();
            updateFilterBtnLabel();
            renderCardsOnly();
          });
        });

        // 상단 액션 버튼 (모두 체크 / 모두 해제)
        panel.querySelector('[data-act="check-all"]').addEventListener('click', () => {
          state.pickerFilters.kinds = ['drawer', 'basket', 'lid'];
          state.pickerFilters.stackable = ['yes', 'no'];
          state.pickerFilters.transparency = ['clear', 'translucent', 'opaque'];
          panel.querySelectorAll('input[type="checkbox"][data-group]').forEach((c) => { c.checked = true; });
          updateFilterBtnLabel();
          renderCardsOnly();
        });
        panel.querySelector('[data-act="uncheck-all"]').addEventListener('click', () => {
          state.pickerFilters.kinds = [];
          state.pickerFilters.stackable = [];
          state.pickerFilters.transparency = [];
          panel.querySelectorAll('input[type="checkbox"][data-group]').forEach((c) => { c.checked = false; });
          updateFilterBtnLabel();
          renderCardsOnly();
        });
        panel.querySelector('[data-act="help"]').addEventListener('click', () => showFilterGuide());
        panel.querySelector('[data-act="fit-comp"]').addEventListener('click', () => {
          state.pickerFilters.wMax = String(Math.round(activeComp.w));
          state.pickerFilters.dMax = String(Math.round(activeComp.d));
          state.pickerFilters.hMax = String(Math.round(activeComp.clearH));
          panel.querySelector('[data-size="wMax"]').value = state.pickerFilters.wMax;
          panel.querySelector('[data-size="dMax"]').value = state.pickerFilters.dMax;
          panel.querySelector('[data-size="hMax"]').value = state.pickerFilters.hMax;
          updateFilterBtnLabel();
          renderCardsOnly();
        });
        panel.querySelector('[data-act="clear-size"]').addEventListener('click', () => {
          state.pickerFilters.wMin = ''; state.pickerFilters.wMax = '';
          state.pickerFilters.dMin = ''; state.pickerFilters.dMax = '';
          state.pickerFilters.hMin = ''; state.pickerFilters.hMax = '';
          panel.querySelectorAll('.pfp-size-input').forEach((inp) => { inp.value = ''; });
          updateFilterBtnLabel();
          renderCardsOnly();
        });

        tabsEl.appendChild(panel);
      }
    }

    // 글자 누르면 펼쳐지는 전체 목록
    if (state.pickerBrandListOpen) {
      const dd = document.createElement('div');
      dd.className = 'brand-dropdown';
      brandList.forEach((b) => {
        const row = document.createElement('button');
        row.className = 'brand-dropdown-item' + (b === state.pickerBrand ? ' active' : '');
        row.textContent = labelOf(b);
        row.addEventListener('click', () => {
          state.pickerBrand = b;
          state.pickerBrandListOpen = false;
          renderPickerModalContent();
        });
        dd.appendChild(row);
      });
      tabsEl.appendChild(dd);
    }

    const gridEl = document.getElementById('picker-cards-grid');

    function renderCardsOnly() {
      gridEl.innerHTML = '';

      if (state.pickerBrand === 'COMBOS') {
        const filteredCombos = state.savedCombos.filter((c) => {
          if (!state.pickerSearch) return true;
          return c.name.toLowerCase().includes(state.pickerSearch.toLowerCase());
        });

        if (filteredCombos.length === 0) {
          gridEl.innerHTML = `<div style="grid-column:1/-1;padding:24px;text-align:center;color:var(--text-sub);">저장한 묶음이 없어요.</div>`;
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
              <span class="picker-brand-badge" style="background:#b45309;">저장한 묶음</span>
              <span class="picker-fit-badge ${fits ? 'fit-ok' : 'fit-warn'}">${fits ? '들어감' : '크기 확인'}</span>
              ${svgHtml}
            </div>
            <div class="picker-body">
              <div class="picker-lineup">상자 ${combo.items.length}개</div>
              <div class="picker-title">${combo.name}</div>
              <div class="picker-spec-box">
                <strong>묶음 크기:</strong> 가로 ${combo.totalW} × 깊이 ${combo.totalD} × 높이 ${combo.maxH} mm<br>
                <span style="font-size:0.7rem;color:var(--text-muted);">들어있는 것: ${itemNames}</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr auto;gap:6px;margin-top:8px;">
                <button class="btn btn-primary btn-sm combo-pick-insert">+ 이 칸에 넣기</button>
                <button class="btn btn-danger btn-sm combo-pick-del">빼기</button>
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

      const filtered = getFilteredCatalogModels();
      if (filtered.length === 0) {
        gridEl.innerHTML = `<div style="padding:28px 16px;text-align:center;color:var(--text-sub);font-size:0.86rem;">찾으시는 조건에 맞는 수납함이 없어요.<br><span style="font-size:0.76rem;color:var(--text-muted);">필터 조건을 조정하거나 '모두 체크'를 눌러 보세요.</span></div>`;
        updatePickerCartBar();
        return;
      }

      filtered.forEach((model) => {
        const fitInfo = window.PackerEngine.checkModelFitForCompartment(state.spaceConfig, compIdx, model);
        const svgHtml = window.getProductThumbnailSVG ? window.getProductThumbnailSVG(model) : '';
        const qty = state.pickerCart[model.id] || 0;

        const card = document.createElement('div');
        card.className = 'picker-card pick-slide-card pick-row-card';
        card.dataset.modelId = model.id;
        const sizeLine = `${model.wTop}×${model.dTop}×${model.h}`;
        card.innerHTML = `
          <div class="pick-row-thumb">
            ${svgHtml}
            <span class="pick-qty-badge" style="display:${qty > 0 ? 'flex' : 'none'};">${qty}</span>
          </div>
          <div class="pick-row-main">
            <div class="pick-row-top">
              <span class="pick-row-brand">${model.brand}</span>
              <span class="picker-fit-badge ${fitInfo.ok ? 'fit-ok' : 'fit-warn'}">${fitInfo.reason}</span>
            </div>
            <div class="pick-row-name">${model.name}</div>
            <div class="pick-row-size">${sizeLine} mm</div>
          </div>
          <div class="pick-row-qty">
            <button class="pick-minus" title="빼기">−</button>
            <span class="pick-row-qtynum">${qty}</span>
            <button class="pick-plus" title="담기">＋</button>
          </div>
        `;

        const syncQty = () => {
          const n = state.pickerCart[model.id] || 0;
          const badge = card.querySelector('.pick-qty-badge');
          badge.textContent = n;
          badge.style.display = n > 0 ? 'flex' : 'none';
          card.querySelector('.pick-row-qtynum').textContent = n;
        };

        const addOne = () => {
          state.pickerCart[model.id] = (state.pickerCart[model.id] || 0) + 1;
          updatePickerCartBar();
          syncQty();
          card.classList.add('pick-bump');
          setTimeout(() => card.classList.remove('pick-bump'), 180);
        };
        const removeOne = () => {
          const cur = state.pickerCart[model.id] || 0;
          if (cur <= 0) return;
          if (cur - 1 <= 0) delete state.pickerCart[model.id];
          else state.pickerCart[model.id] = cur - 1;
          updatePickerCartBar();
          syncQty();
        };

        card.querySelector('.pick-plus').addEventListener('click', addOne);
        card.querySelector('.pick-minus').addEventListener('click', removeOne);

        // 가로 슬라이드: 오른쪽 +1, 왼쪽 -1
        let startX = null, moved = false;
        card.addEventListener('pointerdown', (e) => { startX = e.clientX; moved = false; });
        card.addEventListener('pointermove', (e) => {
          if (startX === null) return;
          const dx = e.clientX - startX;
          if (Math.abs(dx) > 6) e.preventDefault();
          card.style.transform = `translateX(${Math.max(-50, Math.min(50, dx))}px)`;
          if (Math.abs(dx) > 44 && !moved) {
            moved = true;
            if (dx > 0) addOne(); else removeOne();
            startX = e.clientX;
          }
        });
        const endSlide = () => { startX = null; card.style.transform = ''; };
        card.addEventListener('pointerup', endSlide);
        card.addEventListener('pointercancel', endSlide);
        card.addEventListener('pointerleave', endSlide);

        gridEl.appendChild(card);
      });

      updatePickerCartBar();
    }

    renderCardsOnly();
  }

  // 담기 바구니 하단 바 갱신
  function updatePickerCartBar() {
    const countEl = document.getElementById('picker-cart-count');
    const btn = document.getElementById('btn-picker-cart-add');
    const bar = document.getElementById('picker-cart-bar');
    if (!countEl || !btn || !bar) return;
    // 저장한 묶음 탭에서는 담기 바 숨김
    bar.style.display = state.pickerBrand === 'COMBOS' ? 'none' : 'flex';
    const total = Object.values(state.pickerCart).reduce((a, b) => a + b, 0);
    countEl.textContent = `담은 상자 ${total}개`;
    btn.textContent = total > 0 ? `${total}개 담기` : '담기';
    btn.disabled = total === 0;
  }

  // 바구니에 담은 상자들을 현재 칸에 한 번에 넣기
  function applyPickerCart() {
    const entries = Object.entries(state.pickerCart);
    if (entries.length === 0) return;
    let skipped = 0;
    entries.forEach(([modelId, qty]) => {
      for (let i = 0; i < qty; i++) {
        if (addBoxToActiveSpace(modelId, 0) === false) skipped += 1;
      }
    });
    state.pickerCart = {};
    updatePickerCartBar();
    document.getElementById('modal-box-picker').classList.remove('open');
    refreshAll();
    if (skipped > 0) showToast(`자리가 모자라서 ${skipped}개는 넣지 못했어요`);
  }

  function renderSelectedBoxInspector() {
    const hud = document.getElementById('selected-box-hud');
    const activePlan = getActivePlan();
    const selBoxes = activePlan.boxes.filter((b) => state.selectedBoxIds.includes(b.id));

    if (selBoxes.length === 0) {
      hud.style.display = 'none';
      document.body.classList.remove('has-box-selected');
      if (window.closeBoxFinePad) window.closeBoxFinePad();
      return;
    }

    hud.style.display = 'flex';
    document.body.classList.add('has-box-selected');
    const isCab = state.spaceConfig.type === 'cabinet';
    document.getElementById('btn-box-shelf-up').style.display = isCab ? 'inline-flex' : 'none';
    document.getElementById('btn-box-shelf-down').style.display = isCab ? 'inline-flex' : 'none';
    const fineShelf = document.querySelector('#box-fine-pad .fine-shelf');
    if (fineShelf) fineShelf.style.display = isCab ? 'flex' : 'none';

    const saveComboBtn = document.getElementById('btn-box-save-combo');

    if (selBoxes.length === 1) {
      saveComboBtn.style.display = 'none';
      const box = selBoxes[0];
      const model = state.modelsMap[box.modelId];
      if (!model) return;
      const dims = window.PackerEngine.getOrientedDims(model, box.rot || 0);
      const yInfo = (box.y || 0) > 0 ? ` · 바닥에서 +${box.y}mm 위` : '';
      document.getElementById('sel-box-title').innerHTML =
        `<strong>[${model.brand}] ${model.name}</strong> ` +
        `<span class="sel-box-meta">${dims.w}×${dims.d}×${dims.h}mm · ${box.rot || 0}°${yInfo}</span>`;
    } else {
      saveComboBtn.style.display = 'inline-flex';
      document.getElementById('sel-box-title').innerHTML =
        `<strong>상자 ${selBoxes.length}개 골랐어요</strong>`;
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
      tabTitle.textContent = `문제 알림 (괜찮아요)`;
      if (mobileErrLabel) mobileErrLabel.textContent = `문제(0)`;
      const okDiv = document.createElement('div');
      okDiv.className = 'alert-item alert-ok';
      okDiv.textContent = `걸리는 곳 없이 잘 놓였어요.`;
      container.appendChild(okDiv);
      return;
    }

    tabTitle.textContent = `문제 알림 (${val.messages.length})`;
    if (mobileErrLabel) mobileErrLabel.textContent = `문제(${val.messages.length})`;
    val.messages.forEach((m) => {
      const div = document.createElement('div');
      div.className = 'alert-item ' + (m.severity === 'error' ? 'alert-error' : 'alert-warn');
      div.textContent = (m.severity === 'error' ? '[문제] ' : '[주의] ') + m.text;
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
        ? `<span style="color:#c94a4a;font-weight:700;">문제 ${metrics.errorCount}</span>`
        : metrics.warnCount > 0
        ? `<span style="color:#d97706;font-weight:700;">주의 ${metrics.warnCount}</span>`
        : `<span style="color:#3b8a64;font-weight:700;">괜찮음</span>`;

      tr.innerHTML = `
        <td style="text-align:left;cursor:pointer;font-weight:700;">${plan.name}</td>
        <td>${metrics.totalCount}개</td>
        <td><strong>${metrics.areaPercent}%</strong> (부피 ${metrics.volPercent}%)</td>
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

  // 화면 종류: 'mobile' | 'pc'(데스크탑·태블릿)
  // 둘 다 같은 흐름(첫 설정 질문 -> 3D 화면)을 쓰고, 데스크탑은 넓은 화면에 맞게 배치만 바꿔요.
  function setUIMode(mode) {
    state.layout = mode === 'pc' ? 'pc' : 'mobile';
    state.uiMode = 'mobile';
    document.body.classList.add('ui-mode-mobile');
    document.body.classList.remove('ui-mode-pc');
    document.body.classList.toggle('ui-wide', state.layout === 'pc');
    document.getElementById('btn-mode-mobile')?.classList.toggle('active', state.layout === 'mobile');
    document.getElementById('btn-mode-pc')?.classList.toggle('active', state.layout === 'pc');
    updateDragGuideText();

    // 3D 단계의 기본은 순수 3D 화면(오버레이 없음), 단계는 저장된 상태(처음엔 설정)
    document.body.setAttribute('data-active-mtab', state.activeMobileTab || 'none');
    setMobileStep(state.mobileStep || 'setup');

    renderShelfCalloutCards();
    saveLocalSoon();
    setTimeout(() => {
      window.Scene3DManager.resize();
    }, 60);
  }

  // ---------- 목록에 없는 상자 직접 추가 ----------
  let addBoxPhoto = null;   // 줄인 사진 (dataURL)
  function openAddBoxModal() {
    const m = document.getElementById('modal-add-box');
    if (!m) return;
    addBoxPhoto = null;
    ['ab-name', 'ab-brand', 'ab-w', 'ab-d', 'ab-h'].forEach((id) => { document.getElementById(id).value = ''; });
    document.getElementById('ab-stack').checked = true;
    document.getElementById('ab-photo-preview').hidden = true;
    document.getElementById('ab-photo-empty').hidden = false;
    document.getElementById('ab-photo-clear').hidden = true;
    document.getElementById('ab-name-err').hidden = true;
    document.getElementById('ab-dim-err').hidden = true;
    setAddBoxKind(state.pickerKind === 'basket' ? 'top_open' : state.pickerKind === 'lid' ? 'top_lid' : 'front_drawer');
    m.classList.add('open');
    setTimeout(() => document.getElementById('ab-name').focus(), 50);
  }
  function setAddBoxKind(kind) {
    document.querySelectorAll('#ab-kind .sp-chip').forEach((c) => {
      const on = c.dataset.kind === kind;
      c.classList.toggle('selected', on);
      c.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }
  // 사진은 작게 줄여서 저장 (가장 긴 쪽 200px, JPEG)
  function shrinkPhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('not image')); return; }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, 200 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.width * s));
        cv.height = Math.max(1, Math.round(img.height * s));
        const g = cv.getContext('2d');
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, cv.width, cv.height);
        g.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load fail')); };
      img.src = url;
    });
  }
  function bindAddBoxModal() {
    const m = document.getElementById('modal-add-box');
    if (!m) return;
    const close = () => m.classList.remove('open');
    document.getElementById('btn-close-add-box').addEventListener('click', close);
    m.addEventListener('click', (e) => { if (e.target === m) close(); });
    document.querySelectorAll('#ab-kind .sp-chip').forEach((c) => c.addEventListener('click', () => setAddBoxKind(c.dataset.kind)));
    const input = document.getElementById('ab-photo-input');
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      input.value = '';
      if (!f) return;
      try {
        addBoxPhoto = await shrinkPhoto(f);
        const pv = document.getElementById('ab-photo-preview');
        pv.src = addBoxPhoto;
        pv.hidden = false;
        document.getElementById('ab-photo-empty').hidden = true;
        document.getElementById('ab-photo-clear').hidden = false;
      } catch (e) {
        showToast('사진을 못 불러왔어요. 다른 사진을 골라 주세요');
      }
    });
    document.getElementById('ab-photo-clear').addEventListener('click', () => {
      addBoxPhoto = null;
      document.getElementById('ab-photo-preview').hidden = true;
      document.getElementById('ab-photo-empty').hidden = false;
      document.getElementById('ab-photo-clear').hidden = true;
    });
    document.getElementById('btn-add-box-save').addEventListener('click', () => {
      const clean = (s) => s.replace(/[<>&"'`]/g, '').trim();   // 화면에 그대로 찍히므로 꺾쇠 등은 뺌
      const name = clean(document.getElementById('ab-name').value);
      const brand = clean(document.getElementById('ab-brand').value) || '내 상자';
      const num = (id) => Math.round(Number(document.getElementById(id).value));
      const w = num('ab-w'), d = num('ab-d'), h = num('ab-h');
      const okDim = [w, d, h].every((v) => Number.isFinite(v) && v >= 20 && v <= 2000);
      document.getElementById('ab-name-err').hidden = !!name;
      document.getElementById('ab-dim-err').hidden = okDim;
      if (!name || !okDim) {
        (name ? document.getElementById(okDim ? 'ab-name' : 'ab-w') : document.getElementById('ab-name')).focus();
        return;
      }
      const accessType = (document.querySelector('#ab-kind .sp-chip.selected') || {}).dataset?.kind || 'front_drawer';
      const newModel = {
        id: 'custom-' + Date.now(),
        brand,
        lineup: '직접 추가',
        name,
        wTop: w, dTop: d, h,
        wBot: w, dBot: d,
        shapeType: 'box',
        accessType,
        stackable: document.getElementById('ab-stack').checked,
        stackingOffset: 3,
        hasFrontHandle: accessType === 'front_drawer',
        color: '#efe7da'
      };
      if (addBoxPhoto) newModel.image = addBoxPhoto;
      saveCustomModel(newModel);
      // 방금 만든 상자를 담기 바구니에 1개 넣고 목록에서 보이게
      state.pickerBrand = 'ALL';
      state.pickerSearch = '';
      const si = document.getElementById('picker-search-input');
      if (si) si.value = '';
      const newKind = window.getModelKind(newModel);
      state.pickerKind = newKind;
      if (state.pickerFilters && Array.isArray(state.pickerFilters.kinds) && state.pickerFilters.kinds.length > 0 && !state.pickerFilters.kinds.includes(newKind)) {
        state.pickerFilters.kinds.push(newKind);
      }
      state.pickerCart = state.pickerCart || {};
      state.pickerCart[newModel.id] = 1;
      close();
      renderPickerModalContent();
      showToast('목록에 추가했어요. 담기를 누르면 칸에 들어가요');
    });
  }

  // ---------- 짧은 알림 · 확인 창 ----------
  let toastTimer = null;
  function showToast(msg) {
    let el = document.getElementById('app-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'app-toast';
      el.className = 'app-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }
  // 되돌리기 힘든 동작 전에 한 번 묻기. 결과: true(진행) / false(취소)
  function confirmDialog({ title, message, ok }) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'app-confirm';
      wrap.innerHTML = `
        <div class="app-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="app-confirm-t">
          <div id="app-confirm-t" class="app-confirm-t">${title}</div>
          ${message ? `<div class="app-confirm-m">${message}</div>` : ''}
          <div class="app-confirm-btns">
            <button type="button" class="app-confirm-no">취소</button>
            <button type="button" class="app-confirm-yes">${ok || '확인'}</button>
          </div>
        </div>`;
      const done = (v) => { wrap.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape') done(false); };
      wrap.addEventListener('click', (e) => { if (e.target === wrap) done(false); });
      wrap.querySelector('.app-confirm-no').addEventListener('click', () => done(false));
      wrap.querySelector('.app-confirm-yes').addEventListener('click', () => done(true));
      document.addEventListener('keydown', onKey);
      document.body.appendChild(wrap);
      wrap.querySelector('.app-confirm-no').focus();
    });
  }

  // ---------- 3D 화면 사진 저장 (남는 공간 상·좌·우·전·후 표시 선택 + 오른쪽 아래 만든 사람 표시) ----------
  function getSelectedMarginDirs() {
    const chkMain = document.getElementById('chk-export-show-margins');
    const show = chkMain ? chkMain.checked : true;
    const dirsWrap = document.getElementById('export-margin-dirs');
    const dirs = [];
    if (dirsWrap) {
      dirsWrap.querySelectorAll('input[type="checkbox"]:checked').forEach((c) => dirs.push(c.value));
    } else {
      dirs.push('top', 'left', 'right', 'front', 'back');
    }
    return { show: show && dirs.length > 0, dirs };
  }

  function formatMarginLine(m, dirs) {
    const dirMap = {
      top: `상 ${m.top}`,
      left: `좌 ${m.left}`,
      right: `우 ${m.right}`,
      front: `전 ${m.front}`,
      back: `후 ${m.back}`
    };
    return dirs.map((k) => dirMap[k]).filter(Boolean).join(' · ') + ' mm';
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function savePhoto() {
    const url = window.Scene3DManager.snapshot && window.Scene3DManager.snapshot();
    if (!url) return;
    const { show: showMargins, dirs: marginDirs } = getSelectedMarginDirs();
    const activePlan = getActivePlan();
    const allMargins = window.PackerEngine.getCompartmentMargins
      ? window.PackerEngine.getCompartmentMargins(state.spaceConfig, activePlan.boxes, state.modelsMap)
      : [];
    const occupiedMargins = allMargins.filter((m) => m.boxCount > 0);
    const targetMargins = occupiedMargins.length > 0 ? occupiedMargins : allMargins.slice(0, 1);

    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = img.width;
      cv.height = img.height;
      const g = cv.getContext('2d');
      g.drawImage(img, 0, 0);

      const fontFamily = `Pretendard, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`;

      // [옵션] 공간 상·좌·우·전·후 남는 공간(mm) 표시
      if (showMargins && targetMargins.length > 0) {
        const wrapperEl = document.getElementById('canvas-wrapper');
        const domW = (wrapperEl && wrapperEl.clientWidth) || cv.width;
        const domH = (wrapperEl && wrapperEl.clientHeight) || cv.height;
        const scaleX = cv.width / Math.max(1, domW);
        const scaleY = cv.height / Math.max(1, domH);

        // 1) 3D 각 칸 위치에 말풍선 배지 표시 (최대 6개 칸까지 겹치지 않게 표시)
        if (lastShelfAnchors && lastShelfAnchors.length > 0 && targetMargins.length <= 6) {
          const badgeFs = Math.max(12, Math.round(Math.min(cv.width, cv.height) * 0.021));
          targetMargins.forEach((m) => {
            const anc = lastShelfAnchors.find((a) => a.index === m.compartmentIndex);
            if (!anc) return;
            const cx = (Number.isFinite(anc.cx) ? anc.cx : anc.x) * scaleX;
            const cy = (Number.isFinite(anc.cy) ? anc.cy : anc.y) * scaleY;
            if (cx < 20 || cx > cv.width - 20 || cy < 20 || cy > cv.height - 20) return;

            const titleStr = `${m.short || m.name}`;
            const valStr = formatMarginLine(m, marginDirs);

            g.font = `700 ${badgeFs}px ${fontFamily}`;
            const w1 = g.measureText(titleStr).width;
            g.font = `600 ${Math.round(badgeFs * 0.92)}px ${fontFamily}`;
            const w2 = g.measureText(valStr).width;

            const padX = Math.round(badgeFs * 0.75);
            const padY = Math.round(badgeFs * 0.55);
            const boxW = Math.max(w1, w2) + padX * 2;
            const boxH = badgeFs * 2.25 + padY;
            const bx = Math.max(12, Math.min(cv.width - boxW - 12, cx - boxW / 2));
            const by = Math.max(12, Math.min(cv.height - boxH - 12, cy - boxH / 2));

            drawRoundedRect(g, bx, by, boxW, boxH, Math.round(badgeFs * 0.6));
            g.fillStyle = 'rgba(255, 252, 246, 0.92)';
            g.fill();
            g.lineWidth = Math.max(1.5, badgeFs * 0.1);
            g.strokeStyle = 'rgba(125, 98, 68, 0.45)';
            g.stroke();

            g.textBaseline = 'top';
            g.fillStyle = '#7d6244';
            g.font = `700 ${Math.round(badgeFs * 0.88)}px ${fontFamily}`;
            g.fillText(titleStr + ' 남는 공간', bx + padX, by + padY * 0.65);

            g.fillStyle = '#2b2118';
            g.font = `700 ${Math.round(badgeFs * 0.94)}px ${fontFamily}`;
            g.fillText(valStr, bx + padX, by + padY * 0.65 + badgeFs * 1.15);
          });
        }

        // 2) 좌측 상단 요약 카드: 칸별 상·좌·우·전·후 남은 공간 일람표
        const cardFs = Math.max(13, Math.round(Math.min(cv.width, cv.height) * 0.023));
        const lineH = Math.round(cardFs * 1.55);
        const cardPad = Math.round(cardFs * 0.95);
        const headerText = '남는 공간 여백 (단위: mm)';
        const rows = targetMargins.slice(0, 8).map((m) => ({
          name: `${m.name} (${m.compW}×${m.compD}×${m.compH})`,
          vals: formatMarginLine(m, marginDirs)
        }));

        g.font = `700 ${cardFs}px ${fontFamily}`;
        let maxRowW = g.measureText(headerText).width;
        rows.forEach((r) => {
          g.font = `700 ${Math.round(cardFs * 0.9)}px ${fontFamily}`;
          const nw = g.measureText(r.name).width;
          g.font = `600 ${Math.round(cardFs * 0.92)}px ${fontFamily}`;
          const vw = g.measureText(r.vals).width;
          maxRowW = Math.max(maxRowW, nw + vw + cardFs * 1.2);
        });

        const cardW = Math.min(cv.width - 24, maxRowW + cardPad * 2);
        const cardH = cardPad * 1.8 + lineH * (1 + rows.length);
        const cx0 = Math.round(cardFs * 0.9);
        const cy0 = Math.round(cardFs * 0.9);

        drawRoundedRect(g, cx0, cy0, cardW, cardH, Math.round(cardFs * 0.75));
        g.fillStyle = 'rgba(255, 253, 249, 0.90)';
        g.fill();
        g.lineWidth = 1.5;
        g.strokeStyle = 'rgba(125, 98, 68, 0.32)';
        g.stroke();

        g.textBaseline = 'middle';
        g.fillStyle = '#5c4630';
        g.font = `800 ${cardFs}px ${fontFamily}`;
        g.fillText(headerText, cx0 + cardPad, cy0 + cardPad * 0.9 + lineH * 0.35);

        rows.forEach((r, idx) => {
          const ry = cy0 + cardPad * 1.0 + lineH * (idx + 1.25);
          g.font = `700 ${Math.round(cardFs * 0.88)}px ${fontFamily}`;
          g.fillStyle = '#6e5236';
          g.fillText(r.name, cx0 + cardPad, ry);

          const nw = g.measureText(r.name).width;
          g.font = `700 ${Math.round(cardFs * 0.9)}px ${fontFamily}`;
          g.fillStyle = '#1a1714';
          g.fillText(r.vals, cx0 + cardPad + nw + Math.round(cardFs * 0.8), ry);
        });
      }

      // 표시 크기는 사진 크기에 맞춰요 (짧은 변의 3.2%)
      const fs = Math.max(14, Math.round(Math.min(cv.width, cv.height) * 0.032));
      const pad = Math.round(fs * 0.9);
      const text = 'made by joshleeliving';
      g.font = `600 ${fs}px ${fontFamily}`;
      const tw = g.measureText(text).width;
      const bw = tw + pad * 1.4, bh = fs * 1.9;
      const bx = cv.width - bw - pad, by = cv.height - bh - pad;
      const r = Math.round(bh * 0.3);
      g.fillStyle = 'rgba(255, 255, 255, 0.78)';
      drawRoundedRect(g, bx, by, bw, bh, r);
      g.fill();
      g.fillStyle = '#5c4630';
      g.textBaseline = 'middle';
      g.fillText(text, bx + pad * 0.7, by + bh / 2);

      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
      const a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = `수납공간-${stamp}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    img.src = url;
  }

  // ---------- 고르는 창 맨 위 손잡이: 잡고 위아래로 끌면 창 높이가 바뀜 ----------
  function makeSheetResizable(el, opts) {
    if (!el || el.querySelector(':scope > .sheet-grip')) return;
    const grip = document.createElement('div');
    grip.className = 'sheet-grip';
    grip.setAttribute('role', 'separator');
    grip.setAttribute('aria-orientation', 'horizontal');
    grip.setAttribute('aria-label', '창 높이 조절: 위아래로 끌어요');
    grip.tabIndex = 0;
    grip.innerHTML = '<span></span>';
    el.insertBefore(grip, el.firstChild);
    el.classList.add('has-grip');

    const vh = () => (window.visualViewport ? window.visualViewport.height : window.innerHeight);
    const apply = (h) => {
      const hh = Math.round(Math.max(vh() * 0.22, Math.min(vh() * 0.92, h)));
      el.style.height = hh + 'px';
      el.style.maxHeight = 'none';
      if (opts && opts.onResize) opts.onResize(hh);
    };
    let startY = 0, startH = 0, dragging = false;
    grip.addEventListener('pointerdown', (e) => {
      if (opts && opts.enabled && !opts.enabled()) return;
      dragging = true;
      startY = e.clientY;
      startH = el.getBoundingClientRect().height;
      grip.setPointerCapture(e.pointerId);
      grip.classList.add('dragging');
      e.preventDefault();
    });
    grip.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      apply(startH - (e.clientY - startY));   // 위로 끌면 커지고, 아래로 끌면 작아짐
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      grip.classList.remove('dragging');
      try { grip.releasePointerCapture(e.pointerId); } catch (err) {}
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
    // 키보드: ↑↓ 로 조금씩
    grip.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      apply(el.getBoundingClientRect().height + (e.key === 'ArrowUp' ? 40 : -40));
    });
  }

  function setupResizableSheets() {
    makeSheetResizable(document.getElementById('mobile-shelf-sheet'));
    makeSheetResizable(document.querySelector('#modal-box-picker .modal-box'));
    const bdSheet = document.querySelector('.box-detail-sheet');
    makeSheetResizable(bdSheet, {
      // 보관함 자세히 보기는 아래에 붙어 있을 때만 (옆에 붙은 넓은 화면에서는 끔)
      enabled: () => bdSheet.getBoundingClientRect().width >= window.innerWidth - 4,
      onResize: (h) => {
        const cv = document.getElementById('box-detail-canvas');
        if (cv) cv.style.bottom = h + 'px';
        // 끄는 동안 매 화면마다 3D 크기를 바로 맞춤 (뚝뚝 끊기지 않게)
        if (setupResizableSheets.raf) return;
        setupResizableSheets.raf = requestAnimationFrame(() => {
          setupResizableSheets.raf = 0;
          if (window.BoxDetail && window.BoxDetail.resize) window.BoxDetail.resize();
        });
      }
    });
    // 화면을 돌리면 끌어서 바꾼 높이는 처음대로
    window.addEventListener('orientationchange', () => {
      [document.getElementById('mobile-shelf-sheet'), document.querySelector('#modal-box-picker .modal-box'), bdSheet].forEach((el) => {
        if (el) { el.style.height = ''; el.style.maxHeight = ''; }
      });
      const cv = document.getElementById('box-detail-canvas');
      if (cv) cv.style.bottom = '';
    });
  }

  // ---------- 3D 돌려 보는 법 안내 (처음 3D 화면에 들어왔을 때 한 번) ----------
  const STORAGE_KEY_GUIDE_SEEN = 'storagefit_drag_guide_seen_v1';
  function updateDragGuideText() {
    const wide = state.layout === 'pc';
    const items = document.querySelectorAll('#drag-guide .drag-guide-list li');
    if (items.length < 3) return;
    items[0].innerHTML = wide ? '<b>마우스로 끌기</b> 장을 이리저리 돌려요' : '<b>한 손가락으로 끌기</b> 장을 이리저리 돌려요';
    items[1].innerHTML = wide ? '<b>마우스 휠 굴리기</b> 크게·작게 봐요' : '<b>두 손가락 벌리기·모으기</b> 크게·작게 봐요';
  }
  function maybeShowDragGuide() {
    let seen = false;
    try { seen = localStorage.getItem(STORAGE_KEY_GUIDE_SEEN) === '1'; } catch (e) {}
    const el = document.getElementById('drag-guide');
    if (!el || seen) return;
    updateDragGuideText();
    el.hidden = false;
    document.getElementById('drag-guide-ok')?.focus();
  }
  function closeDragGuide() {
    const el = document.getElementById('drag-guide');
    if (el) el.hidden = true;
    try { localStorage.setItem(STORAGE_KEY_GUIDE_SEEN, '1'); } catch (e) {}
  }

  // 상자를 처음 눌렀을 때 한 번: 고르기 · 한 번 더 = 안 채우기 · 꾹 끌기 = 옮기기
  const STORAGE_KEY_BOX_GUIDE_SEEN = 'storagefit_box_guide_seen_v1';
  function maybeShowBoxGuide() {
    let seen = false;
    try { seen = localStorage.getItem(STORAGE_KEY_BOX_GUIDE_SEEN) === '1'; } catch (e) {}
    const el = document.getElementById('box-guide');
    const drag = document.getElementById('drag-guide');
    if (!el || seen || (drag && !drag.hidden)) return;
    const li = el.querySelectorAll('.drag-guide-list li');
    if (li.length >= 3) {
      const wide = state.layout === 'pc';
      li[0].innerHTML = wide ? '<b>한 번 클릭</b> 상자를 골라요' : '<b>한 번 누르기</b> 상자를 골라요';
      li[1].innerHTML = wide ? '<b>고른 상자를 한 번 더 클릭</b> 상자 안에 물건을 채워요' : '<b>고른 상자를 한 번 더 누르기</b> 상자 안에 물건을 채워요';
      li[2].innerHTML = wide ? '<b>고른 상자를 누른 채 끌기</b> 상자를 옮겨요 · 방향키로 조금씩' : '<b>고른 상자를 꾹 누른 채 끌기</b> 상자를 옮겨요';
    }
    el.hidden = false;
    document.getElementById('box-guide-ok')?.focus();
  }
  function closeBoxGuide() {
    const el = document.getElementById('box-guide');
    if (el) el.hidden = true;
    try { localStorage.setItem(STORAGE_KEY_BOX_GUIDE_SEEN, '1'); } catch (e) {}
  }

  // 상자 고르기 창 '필터' 사용법: 처음 필터를 열 때 한 번 + 필터 창의 '사용법' 버튼으로 언제든
  const STORAGE_KEY_FILTER_GUIDE_SEEN = 'storagefit_filter_guide_seen_v1';
  function showFilterGuide() {
    const el = document.getElementById('filter-guide');
    if (!el) return;
    el.hidden = false;
    document.getElementById('filter-guide-ok')?.focus();
  }
  function maybeShowFilterGuide() {
    let seen = false;
    try { seen = localStorage.getItem(STORAGE_KEY_FILTER_GUIDE_SEEN) === '1'; } catch (e) {}
    if (!seen) showFilterGuide();
  }
  function closeFilterGuide() {
    const el = document.getElementById('filter-guide');
    if (el) el.hidden = true;
    try { localStorage.setItem(STORAGE_KEY_FILTER_GUIDE_SEEN, '1'); } catch (e) {}
  }

  // ---------- 내 설정 저장 (다음에 링크를 다시 열어도 그대로) ----------
  const STORAGE_KEY_STATE = 'storagefit_state_v1';
  let saveTimer = null;
  function saveLocalNow() {
    try {
      const payload = {
        v: 1,
        spaceConfig: state.spaceConfig,
        plans: state.plans,
        activePlanId: state.activePlanId,
        setupDone: state.mobileStep === 'build' || !!state.setupDone,
        layout: state.layout,
        savedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(payload));
    } catch (e) {
      // 저장 공간이 꽉 찼거나 막힌 브라우저(사생활 보호 모드 등)는 그냥 넘어가요
    }
  }
  function saveLocalSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveLocalNow, 400);
  }
  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_STATE);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || d.v !== 1 || !d.spaceConfig || !Array.isArray(d.plans) || !d.plans.length) return null;
      // 여닫이 장 바닥 문틀(턱) 기본값 20 → 0 으로 바뀐 뒤 한 번만 정리
      const cab = d.spaceConfig.cabinet;
      if (cab && !cab.noBottomFrameV1) {
        if (cab.bottomFrameH === 20) cab.bottomFrameH = 0;
        cab.noBottomFrameV1 = true;
      }
      return d;
    } catch (e) {
      return null;
    }
  }

  // 모바일 단계 전환: 'setup'(장 설정만) <-> 'build'(3D 상자 배치)
  function setMobileStep(step) {
    state.mobileStep = step;
    document.body.classList.toggle('mobile-step-setup', step === 'setup');
    document.body.classList.toggle('mobile-step-build', step === 'build');

    const spaceCard = document.getElementById('floating-space-card');
    const shelfBody = document.querySelector('#floating-shelf-card .accordion-body');
    const spaceBody = document.querySelector('#floating-space-card .accordion-body');

    if (step === 'setup') {
      document.body.classList.remove('mobile-shelfh-open', 'mobile-shelf-sheet-open', 'mobile-setup-open');
      state.selectedBoxIds = [];
      // 설정 단계: 선반 설정 내용을 가구 카드 본문 끝에 이어 붙여 한 화면에서 전부 보이게
      if (shelfBody && spaceBody && state.spaceConfig.type === 'cabinet' && !spaceBody.contains(shelfBody)) {
        spaceBody.appendChild(shelfBody);
      }
      state.spaceCardOpen = true;
      if (state.wizPreview) {
        applyPreviewFill();
        refreshAll();
      }
      renderWizard();
    } else {
      // 3D 단계: 선반 본문을 원래 선반 카드로 되돌림
      const shelfCard = document.getElementById('floating-shelf-card');
      if (shelfBody && shelfCard && !shelfCard.contains(shelfBody)) {
        shelfCard.appendChild(shelfBody);
      }
    }

    renderLeftAccordionCards();
    if (step === 'build') {
      state.setupDone = true;
      saveLocalSoon();
      setTimeout(maybeShowDragGuide, 350);
    }
    setTimeout(() => {
      window.Scene3DManager.resize();
      window.Scene3DManager.setCameraView('iso');
    }, 60);
  }

  // ===== 첫 설정: 재는 법 안내 (그림 + 순서) =====
  const WIZ_MEASURE = {
    cabW: { fig: 'w', tips: ['문을 열고 줄자 끝을 안쪽 왼쪽 벽에 대요.', '오른쪽 벽까지 쭉 당겨서 재요.', '문틀이 아니라 안쪽 벽과 벽 사이예요.'] },
    cabD: { fig: 'd', tips: ['장 바닥 앞 끝에 줄자를 대요.', '뒷벽에 닿을 때까지 재요.', '뒤에 배관이나 턱이 있으면 그 앞까지만 재요.'] },
    cabH: { fig: 'h', tips: ['바닥 판 위에 줄자를 세워요.', '천장 판 아래까지 재요.'] },
    cabFrame: { fig: 'frame', tips: ['문을 활짝 열어요.', '옆벽 안쪽에서 문틀 끝까지 재요.', '양쪽이 다르면 더 큰 쪽을 넣어요.'] },
    cabShelves: { fig: 'count', tips: ['장 안의 선반 판을 세요.', '맨 아래 바닥 판과 맨 위 천장 판은 빼고 세요.'] },
    drwW: { fig: 'w', tips: ['서랍을 끝까지 빼요.', '서랍 안쪽 왼쪽 벽에서 오른쪽 벽까지 재요.'] },
    drwD: { fig: 'd', tips: ['서랍 앞판 안쪽에 줄자를 대요.', '서랍 뒷벽까지 재요.'] },
    drwExposed: { fig: 'exposed', tips: ['서랍을 끝까지 빼요.', '앞판 안쪽에서 서랍장 몸통 앞면까지 재요.', '그만큼이 밖으로 나와 보이는 깊이예요.'] },
    drwClear: { fig: 'h', tips: ['서랍 바닥에 줄자를 세워요.', '위 서랍 밑이나 위 판 아래까지 재요.', '서랍 벽보다 높으면 위에 걸려요.'] },
    panW: { fig: 'pw', tips: ['팬트리 안에 들어가 맞은편 벽을 봐요.', '바닥에서 왼쪽 벽 끝부터 오른쪽 벽 끝까지 재요.'] },
    panD: { fig: 'pd', tips: ['옆 선반이 있는 벽을 봐요.', '안쪽 벽부터 입구 문틀까지 재요.'] },
    panH: { fig: 'h', tips: ['바닥에서 맨 위 선반 판 위까지 재요.', '천장까지가 아니에요. 선반이 끝나는 곳까지예요.'] },
    panDepth: { fig: 'pdep', tips: ['벽에 줄자 끝을 대요.', '선반 판 앞 끝까지 재요.', '앞에 기둥이 있으면 기둥 앞면까지 재요.'] },
    panCols: { fig: 'count', tips: ['세로 기둥 사이 칸을 세요.', '가운데 기둥이 1개면 2열이에요.'] },
    panLevels: { fig: 'count', tips: ['한 열의 선반 판을 세요.', '판이 5개면 바닥 칸까지 6단이에요.'] },
    frW: { fig: 'w', tips: ['문을 닫은 채로 재요.', '냉장고 왼쪽 옆면에서 오른쪽 옆면까지 재요.', '문 손잡이는 빼고 몸통 폭만 재요.'] },
    frH: { fig: 'h', tips: ['바닥에 줄자 끝을 대요.', '냉장고 맨 윗면까지 재요.', '위에 올려 둔 물건은 빼고 재요.'] },
    frD: { fig: 'd', tips: ['냉장고 옆에 서서 재요.', '문 앞면에서 냉장고 뒷면까지 재요.', '뒤가 벽에 붙어 있으면 문 앞면에서 벽까지 재고 5cm를 빼요.'] },
    frShelfR: { fig: 'count', tips: ['냉장실 문을 열어요.', '유리 선반 판을 세요.', '야채칸 위 덮개 판도 선반 1개로 세요.'] },
    frShelfF: { fig: 'count', tips: ['냉동실 문을 열어요.', '선반 판을 세요.', '서랍(트레이)은 빼고 판만 세요.'] }
  };

  // 재는 곳을 갈색 화살표로 보여주는 작은 그림 (선 그림, 단색)
  function measureFigSvg(fig) {
    const ln = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" opacity=".55"';
    const ac = 'fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"';
    const head = (x, y, ang) => {
      const a = (ang * Math.PI) / 180, s = 5;
      const p1 = `${x + s * Math.cos(a + 2.6)},${y + s * Math.sin(a + 2.6)}`;
      const p2 = `${x + s * Math.cos(a - 2.6)},${y + s * Math.sin(a - 2.6)}`;
      return `<path d="M${p1} L${x},${y} L${p2}" ${ac}/>`;
    };
    const arrow = (x1, y1, x2, y2) => {
      const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
      return `<path d="M${x1},${y1} L${x2},${y2}" ${ac}/>${head(x2, y2, ang)}${head(x1, y1, ang + 180)}`;
    };
    // 비스듬히 본 상자 (앞면 + 윗면 + 옆면)
    const box = `<path d="M18,26 L62,26 L62,58 L18,58 Z" ${ln}/><path d="M18,26 L34,14 L78,14 L62,26" ${ln}/><path d="M62,26 L78,14 L78,46 L62,58" ${ln}/>`;
    let body = '';
    if (fig === 'w') body = box + arrow(21, 52, 59, 52);
    else if (fig === 'h') body = box + arrow(24, 29, 24, 55);
    else if (fig === 'd') body = box + arrow(65, 27, 76, 18);
    else if (fig === 'frame') body = box + `<rect x="18" y="26" width="7" height="32" fill="var(--accent)" opacity=".35"/>` + arrow(18, 62, 25, 62);
    else if (fig === 'exposed') body = `<path d="M10,34 L50,34 L50,58 L10,58 Z" ${ln}/><path d="M40,30 L86,30 L86,58 L40,58" ${ln} stroke-dasharray="3 3"/><path d="M10,34 L22,26 L62,26" ${ln}/>` + arrow(13, 52, 47, 52);
    else if (fig === 'pw') body = `<path d="M14,14 L82,14 L82,58" ${ln}/><path d="M14,14 L14,58" ${ln} stroke-dasharray="3 3"/>` + arrow(16, 20, 80, 20);
    else if (fig === 'pd') body = `<path d="M14,14 L82,14 L82,58" ${ln}/><path d="M14,14 L14,58" ${ln} stroke-dasharray="3 3"/>` + arrow(76, 16, 76, 56);
    else if (fig === 'pdep') body = `<path d="M14,14 L82,14 L82,58" ${ln}/><rect x="14" y="14" width="68" height="12" fill="currentColor" opacity=".12"/>` + arrow(48, 15, 48, 25);
    else body = `<path d="M18,10 L78,10 L78,58 L18,58 Z" ${ln}/><path d="M18,26 L78,26 M18,42 L78,42" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/>`;
    return `<svg class="wiz-measure-fig" viewBox="0 0 96 68" width="96" height="68" aria-hidden="true">${body}</svg>`;
  }

  // ===== 냉장고: 칸 구성이 바뀌면 상자를 같은 칸(냉장실 n칸)으로 옮기고, 넘치면 칸 안으로 =====
  let fridgeCompSnapshot = null;
  function snapFridgeComps() {
    if (state.spaceConfig.type === 'fridge') fridgeCompSnapshot = window.PackerEngine.getCompartments(state.spaceConfig);
  }
  function clampFridgeBoxes() {
    if (state.spaceConfig.type !== 'fridge') return;
    const before = fridgeCompSnapshot;
    fridgeCompSnapshot = null;
    const after = window.PackerEngine.getCompartments(state.spaceConfig);
    const findNew = (old) => {
      if (!old) return null;
      const sameZone = after.filter((c) => c.zoneKey === old.zoneKey);
      const sameKind = sameZone.length ? sameZone : after.filter((c) => c.zoneKind === old.zoneKind);
      if (!sameKind.length) return null;
      return sameKind.find((c) => c.level === old.level) || sameKind[sameKind.length - 1];
    };
    state.plans.forEach((pl) => {
      pl.boxes = pl.boxes.filter((b) => {
        const nc = before ? findNew(before[b.compartmentIndex]) : after[b.compartmentIndex];
        if (!nc) return false;
        b.compartmentIndex = nc.index;
        const m = state.modelsMap[b.modelId];
        if (m) {
          const dims = window.PackerEngine.getOrientedDims(m, b.rot || 0);
          b.x = Math.max(0, Math.min(nc.w - dims.w, b.x));
          b.z = Math.max(0, Math.min(nc.d - dims.d, b.z));
        }
        return true;
      });
    });
    const maxIdx = after.length - 1;
    if (state.activeCompartmentIdx > maxIdx) state.activeCompartmentIdx = 0;
    state.selectedBoxIds = [];
  }

  // ===== 팬트리: 열(기둥)과 단(선반) =====
  function pantryShelfCount() {
    return (state.spaceConfig.pantry.defaultShelves || []).length;
  }
  // 벽을 n열로 고르게 나눔 (기둥 n-1개)
  function setPantryCols(wall, n) {
    snapPantryComps();
    const p = state.spaceConfig.pantry;
    const start = wall === 'A' ? 0 : Math.min(p.roomD - 100, p.depthA);
    const end = wall === 'A' ? p.roomW : p.roomD;
    const cols = Math.max(1, Math.round(n));
    const posts = [];
    for (let i = 1; i < cols; i++) posts.push(Math.round((start + ((end - start) * i) / cols) / 5) * 5);
    if (wall === 'A') p.postsA = posts; else p.postsB = posts;
    p.bayShelves = {};   // 열이 바뀌면 열마다 높이는 처음 값으로
    clampPantryBoxes();
  }
  // 모든 열을 같은 간격 선반 n개로
  function setPantryLevels(n) {
    snapPantryComps();
    const p = state.spaceConfig.pantry;
    const k = Math.max(0, Math.round(n));
    const shelves = [];
    for (let i = 1; i <= k; i++) {
      shelves.push({ id: `ps-${i}-${Date.now()}`, bottomY: Math.round((p.h * i) / (k + 1) / 10) * 10, thickness: 18 });
    }
    p.defaultShelves = shelves;
    p.bayShelves = {};
    clampPantryBoxes();
  }
  // 칸 구성이 바뀌어도 상자는 같은 열·같은 단에 그대로 (없어진 칸의 상자만 지움)
  let pantryCompSnapshot = null;
  function snapPantryComps() {
    if (state.spaceConfig.type === 'pantry') pantryCompSnapshot = window.PackerEngine.getCompartments(state.spaceConfig);
  }
  function clampPantryBoxes() {
    const now = window.PackerEngine.getCompartments(state.spaceConfig);
    const before = pantryCompSnapshot;
    pantryCompSnapshot = null;
    const findNew = (old) => now.find((c) => c.bayKey === old.bayKey && c.level === old.level);
    state.plans.forEach((plan) => {
      if (!before) {
        plan.boxes = plan.boxes.filter((b) => b.compartmentIndex < now.length);
        return;
      }
      plan.boxes = plan.boxes.filter((b) => {
        const old = before[b.compartmentIndex];
        const nc = old && findNew(old);
        if (!nc) return false;
        b.compartmentIndex = nc.index;
        return true;
      });
    });
    if (state.activeCompartmentIdx >= now.length) state.activeCompartmentIdx = 0;
  }
  // 한 열의 선반 목록 (따로 바꾼 적 없으면 기본값을 복사해서 그 열 것으로)
  function pantryBayShelves(key, forEdit) {
    const p = state.spaceConfig.pantry;
    p.bayShelves = p.bayShelves || {};
    if (!p.bayShelves[key] && forEdit) {
      p.bayShelves[key] = (p.defaultShelves || []).map((s, i) => ({ id: `${key}-${i}-${Date.now()}`, bottomY: s.bottomY, thickness: s.thickness || 18 }));
    }
    return p.bayShelves[key] || p.defaultShelves || [];
  }

  // ===== 모바일 첫 설정: 한 화면에 질문 하나 =====
  function setShelfCount(n) {
    const c = state.spaceConfig.cabinet;
    const shelves = [];
    for (let i = 1; i <= n; i++) {
      shelves.push({
        id: `sh-${i}-${Date.now()}`,
        bottomY: Math.round((c.h * i) / (n + 1) / 10) * 10,
        thickness: 18
      });
    }
    c.shelves = shelves;
    // 없어진 칸에 있던 상자는 맨 위 칸으로
    state.plans.forEach((p) => p.boxes.forEach((b) => {
      if (b.compartmentIndex > n) b.compartmentIndex = n;
    }));
    if (state.activeCompartmentIdx > n) state.activeCompartmentIdx = n;
  }

  // ===== 첫 설정: 은은한 반짝임 (테마 색, 움직임 줄이기 설정이면 안 함) =====
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function wizSparkle(el) {
    if (!el || reduceMotion()) return;
    const r = el.getBoundingClientRect();
    const host = document.body;
    const colors = ['#c9a46a', '#e7d6b5', '#7d6244', '#f3e7cf'];
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('span');
      s.className = 'wiz-glint';
      const ang = (Math.PI * 2 * i) / 6 + Math.random() * 0.6;
      const dist = 26 + Math.random() * 22;
      s.style.left = `${r.left + r.width / 2}px`;
      s.style.top = `${r.top + r.height / 2}px`;
      s.style.setProperty('--dx', `${Math.cos(ang) * (r.width / 2 + dist * 0.4)}px`);
      s.style.setProperty('--dy', `${Math.sin(ang) * dist * 0.6}px`);
      s.style.setProperty('--c', colors[i % colors.length]);
      s.style.setProperty('--sz', `${6 + Math.random() * 5}px`);
      host.appendChild(s);
      setTimeout(() => s.remove(), 750);
    }
  }
  // 질문 칸 위쪽에 아주 작게 깜빡이는 별 몇 개 (한 번만 만들어 둠)
  function ensureWizStars() {
    const panel = document.getElementById('wiz-panel');
    if (!panel || panel.querySelector('.wiz-stars')) return;
    const wrap = document.createElement('div');
    wrap.className = 'wiz-stars';
    wrap.setAttribute('aria-hidden', 'true');
    [[8, 14, 0], [22, 6, 1.4], [78, 10, 0.7], [90, 22, 2.1], [64, 4, 2.8]].forEach(([x, y, delay], i) => {
      const s = document.createElement('span');
      s.style.left = `${x}%`;
      s.style.top = `${y}px`;
      s.style.animationDelay = `${delay}s`;
      s.style.setProperty('--c', ['#c9a46a', '#e7d6b5', '#7d6244'][i % 3]);
      wrap.appendChild(s);
    });
    panel.appendChild(wrap);
  }

  function getWizardSteps() {
    const c = state.spaceConfig.cabinet;
    const d = state.spaceConfig.drawer;
    const num = (o) => Object.assign({ kind: 'number', unit: 'mm', step: 10 }, o);

    const typeStep = {
      kind: 'choice',
      title: '어떤 가구를<br>정리할까요?',
      hint: () => '나중에 언제든 바꿀 수 있어요.',
      options: [
        { value: 'cabinet', label: '문 달린 장', sub: '옷장 · 벽장 · 주방장' },
        { value: 'drawer', label: '빼는 서랍', sub: '앞으로 당겨 여는 서랍장' },
        { value: 'pantry', label: '팬트리', sub: 'ㄱ자로 걸어 들어가는 방' },
        { value: 'fridge', label: '냉장고', sub: '양문형 · 4도어 · 2도어' }
      ],
      get: () => state.spaceConfig.type,
      set: (v) => {
        if (v === state.spaceConfig.type) return;
        state.previewSeed = Math.floor(Math.random() * 1e9);
        const cardId = { cabinet: 'card-type-cabinet', drawer: 'card-type-drawer', pantry: 'card-type-pantry', fridge: 'card-type-fridge' }[v];
        document.getElementById(cardId).click();
      }
    };

    if (state.spaceConfig.type === 'fridge') {
      const f = state.spaceConfig.fridge;
      const capOptions = Object.keys(FRIDGE_CAPACITIES).map(Number).sort((a, b) => b - a).map((cap) => {
        const d = FRIDGE_CAPACITIES[cap];
        return { value: cap, label: `${cap}L`, sub: `${d.w} × ${d.d} × ${d.h} mm${cap === 650 ? ' (추정)' : ''}` };
      });
      const sizeStep = (title, key, min, max, hint, measure) => num({
        title, min, max, step: 10, hint, measure,
        get: () => f[key],
        set: (v) => { snapFridgeComps(); f[key] = v; f.capacity = null; clampFridgeBoxes(); }
      });
      return [
        typeStep,
        {
          kind: 'choice',
          title: '어떤 냉장고인가요?',
          hint: () => '문 모양에 따라 냉장실·냉동실 위치가 달라요.',
          options: [
            { value: 'side', label: '양문형', sub: '왼쪽 냉동실 · 오른쪽 냉장실' },
            { value: 'four', label: '4도어', sub: '위 냉장실 · 아래 냉동실 2칸' },
            { value: 'two', label: '2도어', sub: '위 냉동실 · 아래 냉장실' }
          ],
          get: () => f.doorType,
          set: (v) => {
            if (v === f.doorType) return;
            snapFridgeComps();
            const dd = FRIDGE_DOOR_DEFAULTS[v];
            Object.assign(f, { doorType: v, capacity: dd.capacity, shelvesFridge: dd.shelvesFridge, shelvesFreezer: dd.shelvesFreezer }, FRIDGE_CAPACITIES[dd.capacity]);
            clampFridgeBoxes();
          }
        },
        {
          kind: 'choice',
          title: '용량은 얼마인가요?',
          hint: () => '냉장고 옆면이나 문 안쪽 스티커(에너지 효율 라벨)에 용량이 적혀 있어요. 고르면 바깥 크기가 맞춰져요.',
          options: capOptions,
          get: () => f.capacity,
          set: (v) => { snapFridgeComps(); f.capacity = Number(v); Object.assign(f, FRIDGE_CAPACITIES[v]); clampFridgeBoxes(); }
        },
        sizeStep('냉장고 가로는<br>몇 mm인가요?', 'w', 500, 1300, () => '용량을 골랐다면 이미 맞춰져 있어요. 다르면 재서 고쳐요.', WIZ_MEASURE.frW),
        sizeStep('냉장고 높이는<br>몇 mm인가요?', 'h', 1000, 2200, () => '바닥에서 냉장고 맨 위까지예요.', WIZ_MEASURE.frH),
        sizeStep('냉장고 깊이는<br>몇 mm인가요?', 'd', 500, 1100, () => '문 앞면에서 뒷면까지예요. 손잡이는 빼요.', WIZ_MEASURE.frD),
        num({
          title: '냉장실 선반은<br>몇 개인가요?',
          measure: WIZ_MEASURE.frShelfR,
          unit: '개', step: 1, min: 0, max: 6,
          hint: () => `냉장실이 ${(Number(f.shelvesFridge) || 0) + 1}칸으로 나뉘어요.`,
          get: () => f.shelvesFridge,
          set: (v) => { snapFridgeComps(); f.shelvesFridge = v; clampFridgeBoxes(); }
        }),
        num({
          title: '냉동실 선반은<br>몇 개인가요?',
          measure: WIZ_MEASURE.frShelfF,
          unit: '개', step: 1, min: 0, max: 6,
          hint: () => `냉동실이 ${(Number(f.shelvesFreezer) || 0) + 1}칸으로 나뉘어요.${f.doorType === 'four' ? ' 아래 두 칸이 똑같이 나뉘어요.' : ''}`,
          get: () => f.shelvesFreezer,
          set: (v) => { snapFridgeComps(); f.shelvesFreezer = v; clampFridgeBoxes(); }
        })
      ];
    }

    if (state.spaceConfig.type === 'pantry') {
      const p = state.spaceConfig.pantry;
      const bayCount = (wall) => window.PackerEngine.getPantryBays(state.spaceConfig).bays.filter((b) => b.wall === wall).length;
      return [
        typeStep,
        {
          kind: 'choice',
          title: '입구는<br>어느 쪽인가요?',
          hint: () => '방에 들어가서 정면을 볼 때 입구가 있는 쪽이에요.',
          options: [
            { value: 'left', label: '왼쪽 입구', sub: '선반은 안쪽 벽과 오른쪽 벽' },
            { value: 'right', label: '오른쪽 입구', sub: '선반은 안쪽 벽과 왼쪽 벽' }
          ],
          get: () => p.doorSide || 'left',
          set: (v) => { p.doorSide = v; }
        },
        num({
          title: '안쪽 벽은<br>몇 mm인가요?',
          measure: WIZ_MEASURE.panW,
          caption: '방 가로 (뒤 벽 길이)',
          hint: () => '입구에서 보이는 맞은편 벽 끝에서 끝까지 재요.',
          min: 600, max: 4000,
          get: () => p.roomW,
          set: (v) => { p.roomW = v; setPantryCols('A', bayCount('A')); }
        }),
        num({
          title: '옆 벽은<br>몇 mm인가요?',
          measure: WIZ_MEASURE.panD,
          caption: '방 깊이 (오른쪽 벽 길이)',
          hint: () => '안쪽 벽에서 입구까지 재요.',
          min: 600, max: 4000,
          get: () => p.roomD,
          set: (v) => { p.roomD = v; setPantryCols('B', bayCount('B')); }
        }),
        num({
          title: '선반 전체 높이는<br>얼마인가요?',
          measure: WIZ_MEASURE.panH,
          hint: () => '바닥에서 맨 위 선반 위까지 재요.',
          min: 600, max: 2800,
          get: () => p.h,
          set: (v) => { p.h = v; setPantryLevels(pantryShelfCount()); }
        }),
        num({
          title: '선반 깊이는<br>얼마인가요?',
          measure: WIZ_MEASURE.panDepth,
          caption: '안쪽 벽 · 옆 벽 똑같이',
          hint: () => {
            const w = window.PackerEngine.getPantryWalkway(state.spaceConfig);
            return w.ok
              ? `걷는 길은 ${w.min} mm 남아요.`
              : `걷는 길이 ${w.min} mm로 좁아요. 600 mm는 남겨 두는 게 좋아요.`;
          },
          min: 150, max: 800, step: 10,
          get: () => p.depthA,
          set: (v) => { p.depthA = v; p.depthB = v; }
        }),
        num({
          title: '안쪽 벽은<br>몇 열로 나뉘나요?',
          measure: WIZ_MEASURE.panCols,
          unit: '열', step: 1, min: 1, max: 6,
          hint: () => `세로 기둥이 ${Math.max(0, bayCount('A') - 1)}개예요. 기둥 위치는 3D 화면에서 바꿀 수 있어요.`,
          get: () => bayCount('A'),
          set: (v) => setPantryCols('A', v)
        }),
        num({
          title: '옆 벽은<br>몇 열로 나뉘나요?',
          measure: WIZ_MEASURE.panCols,
          unit: '열', step: 1, min: 0, max: 6,
          hint: () => (p.wallB === false ? '옆 벽에는 선반이 없어요.' : `세로 기둥이 ${Math.max(0, bayCount('B') - 1)}개예요.`),
          get: () => (p.wallB === false ? 0 : bayCount('B')),
          set: (v) => { if (v <= 0) { p.wallB = false; } else { p.wallB = true; setPantryCols('B', v); } }
        }),
        num({
          title: '선반은 몇 단인가요?',
          measure: WIZ_MEASURE.panLevels,
          unit: '단', step: 1, min: 1, max: 9,
          hint: () => '모든 열이 같은 높이로 나뉘어요. 열마다 높이는 3D 화면에서 바꿔요.',
          get: () => pantryShelfCount() + 1,
          set: (v) => setPantryLevels(v - 1)
        })
      ];
    }

    if (state.spaceConfig.type === 'cabinet') {
      return [
        typeStep,
        num({
          title: '장 안쪽 가로 길이를<br>알려주세요.',
          measure: WIZ_MEASURE.cabW,
          hint: () => '왼쪽 벽에서 오른쪽 벽까지, 안쪽을 재요.',
          min: 200, max: 3000, get: () => c.w, set: (v) => { c.w = v; }
        }),
        num({
          title: '안쪽 깊이는<br>얼마인가요?',
          measure: WIZ_MEASURE.cabD,
          hint: () => '문 안쪽에서 뒷벽까지 재요.',
          min: 150, max: 1200, get: () => c.d, set: (v) => { c.d = v; }
        }),
        num({
          title: '안쪽 높이는<br>얼마인가요?',
          measure: WIZ_MEASURE.cabH,
          hint: () => '바닥 판에서 천장 판까지 재요.',
          min: 200, max: 3000, get: () => c.h, set: (v) => { c.h = v; }
        }),
        {
          kind: 'choice',
          title: '문은 어떻게<br>열리나요?',
          hint: () => '문이 열리는 쪽은 상자를 꺼내기 어려울 수 있어요.',
          options: [
            { value: 'double', label: '양쪽 문', sub: '가운데에서 양쪽으로 열려요' },
            { value: 'left', label: '왼쪽으로 열림', sub: '경첩이 왼쪽에 있어요' },
            { value: 'right', label: '오른쪽으로 열림', sub: '경첩이 오른쪽에 있어요' },
            { value: 'none', label: '문 없음', sub: '열린 선반장이에요' }
          ],
          get: () => c.doorType,
          set: (v) => { c.doorType = v; }
        },
        num({
          title: '문틀이 있나요?',
          measure: WIZ_MEASURE.cabFrame,
          caption: '왼쪽 · 오른쪽 문틀 폭',
          hint: () => {
            const k = window.PackerEngine.getCabinetConstraints(state.spaceConfig);
            return `문으로 넣을 수 있는 폭은 ${k.doorClearW} mm예요.`;
          },
          min: 0, max: 150, step: 5,
          get: () => c.leftFrameW,
          set: (v) => { c.leftFrameW = v; c.rightFrameW = v; },
          skipLabel: '없어요',
          onSkip: () => { c.leftFrameW = 0; c.rightFrameW = 0; c.topFrameH = 0; c.bottomFrameH = 0; }
        }),
        num({
          title: '선반은 몇 개인가요?',
          measure: WIZ_MEASURE.cabShelves,
          unit: '개', step: 1, min: 0, max: 8,
          hint: () => `칸이 ${c.shelves.length + 1}개 생겨요. 높이는 3D 화면에서 바꿀 수 있어요.`,
          get: () => c.shelves.length,
          set: (v) => setShelfCount(v)
        })
      ];
    }

    return [
      typeStep,
      num({
        title: '서랍 안쪽 가로 길이를<br>알려주세요.',
          measure: WIZ_MEASURE.drwW,
        hint: () => '왼쪽 벽에서 오른쪽 벽까지, 안쪽을 재요.',
        min: 150, max: 1500, get: () => d.w, set: (v) => { d.w = v; }
      }),
      num({
        title: '서랍 깊이는<br>얼마인가요?',
          measure: WIZ_MEASURE.drwD,
        hint: () => '앞판 안쪽에서 뒷벽까지 재요.',
        min: 150, max: 900,
        get: () => d.d,
        set: (v) => { d.d = v; if (d.exposedD > v) d.exposedD = v; }
      }),
      num({
        title: '끝까지 빼면<br>얼마나 보이나요?',
          measure: WIZ_MEASURE.drwExposed,
        hint: () => {
          const hidden = Math.max(0, d.d - d.exposedD);
          return hidden > 0 ? `안쪽 ${hidden} mm는 다 빼도 가려져요.` : '서랍 안이 전부 보여요.';
        },
        min: 50, max: 900,
        get: () => d.exposedD,
        set: (v) => { d.exposedD = Math.min(v, d.d); }
      }),
      num({
        title: '위로 넣을 수 있는<br>높이는요?',
          measure: WIZ_MEASURE.drwClear,
        hint: () => '서랍 바닥에서 위 판까지의 높이예요.',
        min: 40, max: 600, step: 5,
        get: () => d.clearanceH,
        set: (v) => { d.clearanceH = v; }
      }),
      num({
        title: '서랍은 모두<br>몇 칸인가요?',
        measure: WIZ_MEASURE.panLevels,
        unit: '칸', step: 1, min: 1, max: 6,
        hint: () => {
          const t = Math.min(6, Math.max(1, Math.round(Number(d.tiers) || 2)));
          return t === 1 ? '서랍 1칸짜리예요.' : `서랍 ${t}칸 중 맨 위 1칸이 열린 모습으로 보여요.`;
        },
        get: () => Math.min(6, Math.max(1, Math.round(Number(d.tiers) || 2))),
        set: (v) => {
          const nt = Math.min(6, Math.max(1, Math.round(Number(v) || 2)));
          d.tiers = nt;
          state.plans.forEach((pl) => pl.boxes.forEach((b) => {
            if (b.compartmentIndex >= nt) b.compartmentIndex = nt - 1;
          }));
          if (state.activeCompartmentIdx >= nt) state.activeCompartmentIdx = nt - 1;
        }
      })
    ];
  }

  function finishWizard() {
    state.wizFromBuild = false;
    state.wizPreview = false;
    setMobileStep('build');
    setActiveMobileTab('none');
  }

  // ===== 3D 화면 안 '장 설정' 작은 창 (첫 설정과 같은 값, 한 줄씩) =====
  function renderSetupPopup() {
    const body = document.getElementById('mobile-setup-body');
    if (!body) return;
    const steps = getWizardSteps();
    const names = state.spaceConfig.type === 'fridge'
      ? ['가구 종류', '도어 유형', '용량', '가로', '높이', '깊이', '냉장실 선반', '냉동실 선반']
      : state.spaceConfig.type === 'pantry'
      ? ['가구 종류', '입구 쪽', '안쪽 벽', '옆 벽', '전체 높이', '선반 깊이', '안쪽 벽 열', '옆 벽 열', '단 수']
      : state.spaceConfig.type === 'cabinet'
      ? ['가구 종류', '가로', '깊이', '높이', '문 여는 쪽', '문틀 폭', '선반 개수']
      : ['가구 종류', '가로', '깊이', '보이는 깊이', '넣을 수 있는 높이', '서랍 칸 수'];

    body.innerHTML = '';
    const minusSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>';
    const plusSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

    steps.forEach((step, i) => {
      const row = document.createElement('div');
      row.className = 'sp-row';
      const label = document.createElement('div');
      label.className = 'sp-label';
      label.textContent = names[i] || '';
      row.appendChild(label);

      if (step.kind === 'choice') {
        const chips = document.createElement('div');
        chips.className = 'sp-chips';
        step.options.forEach((opt) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'sp-chip' + (step.get() === opt.value ? ' selected' : '');
          b.textContent = opt.label;
          b.addEventListener('click', () => {
            step.set(opt.value);
            refreshAll();
            renderSetupPopup(); // 가구 종류가 바뀌면 줄 목록도 바뀜
          });
          chips.appendChild(b);
        });
        row.appendChild(chips);
      } else {
        const ctl = document.createElement('div');
        ctl.className = 'sp-stepper';
        ctl.innerHTML = `
          <button type="button" class="sp-step" data-d="-1" aria-label="줄이기">${minusSvg}</button>
          <input type="number" inputmode="numeric" class="sp-input" value="${step.get()}" />
          <span class="sp-unit">${step.unit}</span>
          <button type="button" class="sp-step" data-d="1" aria-label="늘리기">${plusSvg}</button>`;
        const input = ctl.querySelector('.sp-input');
        const hint = document.createElement('div');
        hint.className = 'sp-hint';
        const showHint = () => { hint.textContent = step.hint ? step.hint() : ''; };
        const apply = (v) => {
          const val = Math.max(step.min, Math.min(step.max, Math.round(Number(v) || 0)));
          step.set(val);
          input.value = step.get();
          refreshAll();
          showHint();
          if (document.body.classList.contains('mobile-shelfh-open')) renderShelfHeightPopup();
        };
        ctl.querySelectorAll('.sp-step').forEach((b) => {
          b.addEventListener('click', () => apply(Number(input.value) + Number(b.dataset.d) * step.step));
        });
        input.addEventListener('change', () => apply(input.value));
        row.appendChild(ctl);
        // 문틀 폭·선반 개수처럼 결과가 궁금한 줄만 안내 한 줄
        if (step.skipLabel || step.unit === '개') { showHint(); row.appendChild(hint); }
      }
      body.appendChild(row);
    });

    const restart = document.createElement('button');
    restart.type = 'button';
    restart.className = 'sp-restart';
    restart.textContent = '처음부터 다시 설정';
    restart.addEventListener('click', () => {
      document.body.classList.remove('mobile-setup-open');
      state.wizStep = 0;
      state.wizFromBuild = true;
      setMobileStep('setup');
    });
    body.appendChild(restart);
  }

  function renderWizard() {
    ensureWizStars();
    const steps = getWizardSteps();
    state.wizStep = Math.max(0, Math.min(steps.length - 1, state.wizStep));
    const step = steps[state.wizStep];
    const isLast = state.wizStep === steps.length - 1;

    document.getElementById('wiz-progress-fill').style.width =
      `${((state.wizStep + 1) / steps.length) * 100}%`;

    const backBtn = document.getElementById('wiz-back');
    backBtn.style.visibility = (state.wizStep > 0 || state.wizFromBuild) ? 'visible' : 'hidden';
    backBtn.onclick = () => {
      if (state.wizStep > 0) {
        state.wizStep -= 1;
        renderWizard();
      } else if (state.wizFromBuild) {
        finishWizard();
      }
    };

    document.getElementById('wiz-title').innerHTML = step.title;
    const hintEl = document.getElementById('wiz-hint');
    const updateHint = () => { hintEl.textContent = step.hint ? step.hint() : ''; };
    updateHint();

    // 값이 바뀌면 3D 미리보기를 바로 다시 그림
    const afterChange = () => {
      if (state.wizPreview) applyPreviewFill();
      refreshAll();
      window.Scene3DManager.setCameraView('iso');
      updateHint();
    };

    const ctrl = document.getElementById('wiz-control');
    ctrl.innerHTML = '';

    if (step.kind === 'choice') {
      const list = document.createElement('div');
      list.className = 'wiz-options';
      step.options.forEach((opt) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'wiz-option' + (step.get() === opt.value ? ' selected' : '');
        b.innerHTML = `
          <span class="wiz-option-text">
            <span class="wiz-option-label">${opt.label}</span>
            ${opt.sub ? `<span class="wiz-option-sub">${opt.sub}</span>` : ''}
          </span>
          <span class="wiz-check"></span>`;
        b.addEventListener('click', () => {
          wizSparkle(b.querySelector('.wiz-check') || b);
          step.set(opt.value);
          afterChange();
          renderWizard();
        });
        list.appendChild(b);
      });
      ctrl.appendChild(list);
    } else {
      const minusSvg = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>';
      const plusSvg = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
      ctrl.innerHTML = `
        <div class="wiz-stepper">
          <button type="button" class="wiz-step-btn" data-d="-1" aria-label="줄이기">${minusSvg}</button>
          <div class="wiz-value">
            <input class="wiz-value-input" type="number" inputmode="numeric" value="${step.get()}" />
            <span class="wiz-value-unit">${step.unit}</span>
          </div>
          <button type="button" class="wiz-step-btn" data-d="1" aria-label="늘리기">${plusSvg}</button>
        </div>
        ${step.caption ? `<div class="wiz-value-caption">${step.caption}</div>` : ''}
        ${step.measure ? `
        <div class="wiz-measure">
          ${measureFigSvg(step.measure.fig)}
          <div class="wiz-measure-text">
            <div class="wiz-measure-h">이렇게 재요</div>
            <ol class="wiz-measure-list">${step.measure.tips.map((tip) => `<li>${tip}</li>`).join('')}</ol>
          </div>
        </div>` : ''}
      `;
      const input = ctrl.querySelector('.wiz-value-input');
      const apply = (v) => {
        const val = Math.max(step.min, Math.min(step.max, Math.round(Number(v) || 0)));
        step.set(val);
        input.value = step.get();
        wizSparkle(ctrl.querySelector('.wiz-value'));
        afterChange();
      };
      ctrl.querySelectorAll('.wiz-step-btn').forEach((btn) => {
        btn.addEventListener('click', () => apply(Number(input.value) + Number(btn.dataset.d) * step.step));
      });
      input.addEventListener('change', () => apply(input.value));
    }

    const skipBtn = document.getElementById('wiz-skip');
    if (step.skipLabel) {
      skipBtn.style.display = '';
      skipBtn.textContent = step.skipLabel;
      skipBtn.onclick = () => {
        step.onSkip();
        if (state.wizPreview) applyPreviewFill();
        refreshAll();
        if (isLast) { finishWizard(); return; }
        state.wizStep += 1;
        renderWizard();
      };
    } else {
      skipBtn.style.display = 'none';
    }

    const nextBtn = document.getElementById('wiz-next');
    nextBtn.textContent = isLast ? '3D로 시작하기' : '다음';
    nextBtn.onclick = () => {
      if (isLast) { finishWizard(); return; }
      state.wizStep += 1;
      renderWizard();
    };
  }

  function setActiveMobileTab(tabKey) {
    state.activeMobileTab = tabKey;
    document.body.setAttribute('data-active-mtab', tabKey);

    document.querySelectorAll('.mobile-nav-tab[data-mtab]').forEach((t) => {
      t.classList.toggle('active', t.dataset.mtab === tabKey);
    });

    renderShelfCalloutCards();
    setTimeout(() => {
      window.Scene3DManager.resize();
    }, 60);
  }

  function toggleMobileSheet() {
    // 3D 단계에서 열린 탭 오버레이(상자/문제)를 닫고 순수 3D로 돌아감
    setActiveMobileTab('none');
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

    // 모바일 단계 전환 버튼
    document.getElementById('btn-mobile-setup-done')?.addEventListener('click', () => {
      setMobileStep('build');
      setActiveMobileTab('none');
    });
    document.getElementById('btn-mobile-edit-setup')?.addEventListener('click', () => {
      // 첫 설정이 끝난 뒤에는 3D 화면 안 작은 창으로 고침
      if (document.body.classList.contains('mobile-setup-open')) {
        document.body.classList.remove('mobile-setup-open');
        return;
      }
      document.body.classList.remove('mobile-shelfh-open', 'mobile-shelf-sheet-open');
      renderSetupPopup();
      document.body.classList.add('mobile-setup-open');
    });
    document.getElementById('btn-mobile-setup-close')?.addEventListener('click', () => {
      document.body.classList.remove('mobile-setup-open');
    });

    // 선반 높이 팝업 열기/닫기
    document.getElementById('btn-mobile-shelf-height')?.addEventListener('click', () => {
      // 이미 열려 있으면 한 번 더 눌러 닫기 ('장 설정' 버튼과 같은 동작)
      if (document.body.classList.contains('mobile-shelfh-open')) {
        document.body.classList.remove('mobile-shelfh-open');
        return;
      }
      document.body.classList.remove('mobile-setup-open');
      renderShelfHeightPopup();
      document.body.classList.add('mobile-shelfh-open');
    });
    document.getElementById('btn-mobile-shelfh-close')?.addEventListener('click', () => {
      document.body.classList.remove('mobile-shelfh-open');
    });

    // '장 설정'·'선반 높이' 작은 창: 창 바깥(투명 배경)을 누르거나 Esc를 누르면 닫기
    const closeMobilePopups = () => {
      const active = document.activeElement;
      if (active && active.closest && active.closest('#mobile-setup-popup, #mobile-shelfh-popup')) {
        active.blur(); // 입력 중이던 값이 change 이벤트로 먼저 반영되도록
      }
      document.body.classList.remove('mobile-setup-open', 'mobile-shelfh-open');
    };
    const mobilePopupBackdrop = document.getElementById('mobile-popup-backdrop');
    mobilePopupBackdrop?.addEventListener('pointerdown', (e) => {
      e.preventDefault();   // 뒤의 3D 화면에 터치가 넘어가 상자가 골라지지 않도록
      e.stopPropagation();
      closeMobilePopups();
    });
    mobilePopupBackdrop?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (document.body.classList.contains('mobile-setup-open') || document.body.classList.contains('mobile-shelfh-open')) {
        closeMobilePopups();
      }
    });

    // 선반 바텀시트 닫기
    document.getElementById('mobile-shelf-sheet-close')?.addEventListener('click', closeShelfSheet);
    document.getElementById('mobile-shelf-sheet-backdrop')?.addEventListener('click', closeShelfSheet);

    // 상자 고르기 창의 '담기' 버튼
    document.getElementById('btn-picker-cart-add')?.addEventListener('click', applyPickerCart);

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
      touchBtn.textContent = state.touchMultiSelectMode ? '여러 개 고르기: 켜짐' : '여러 개 고르기: 꺼짐';
      touchBtn.classList.toggle('btn-warning', state.touchMultiSelectMode);
      refreshAll();
    });

    // 1. 공간 유형 선택 — 문 달린 장과 서랍장은 따로 정리해요 (각자 상자 배치를 따로 기억)
    const switchSpaceType = (next) => {
      const prev = state.spaceConfig.type;
      if (prev === next) return false;
      state.plans.forEach((p) => {
        p.boxesByType = p.boxesByType || {};
        p.boxesByType[prev] = p.boxes;
        p.boxes = Array.isArray(p.boxesByType[next]) ? p.boxesByType[next] : [];
      });
      state.spaceConfig.type = next;
      return true;
    };

    document.getElementById('card-type-cabinet').addEventListener('click', () => {
      switchSpaceType('cabinet');
      state.selectedBoxIds = [];
      refreshAll();
      window.Scene3DManager.setCameraView('iso');
    });

    document.getElementById('card-type-fridge')?.addEventListener('click', () => {
      if (!state.spaceConfig.fridge) state.spaceConfig.fridge = defaultFridge();
      switchSpaceType('fridge');
      state.activeCompartmentIdx = 0;
      state.expandedCompartmentIdx = null;
      state.selectedBoxIds = [];
      const count = window.PackerEngine.getCompartments(state.spaceConfig).length;
      state.plans.forEach((p) => {
        p.boxes = p.boxes.filter((b) => b.compartmentIndex < count);
      });
      refreshAll();
      window.Scene3DManager.setCameraView('iso');
    });

    document.getElementById('card-type-pantry')?.addEventListener('click', () => {
      if (!state.spaceConfig.pantry) state.spaceConfig.pantry = defaultPantry();
      switchSpaceType('pantry');
      state.activeCompartmentIdx = 0;
      state.expandedCompartmentIdx = null;
      state.selectedBoxIds = [];
      const count = window.PackerEngine.getCompartments(state.spaceConfig).length;
      state.plans.forEach((p) => {
        p.boxes = p.boxes.filter((b) => b.compartmentIndex < count);
      });
      refreshAll();
      window.Scene3DManager.setCameraView('iso');
    });

    document.getElementById('card-type-drawer').addEventListener('click', () => {
      switchSpaceType('drawer');
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
        c.bottomFrameH = 0;
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

    // 서랍 칸 수 +/- 버튼
    const setDrawerTiers = (nextTiers) => {
      const nt = Math.min(6, Math.max(1, Math.round(Number(nextTiers) || 2)));
      state.spaceConfig.drawer.tiers = nt;
      state.plans.forEach((pl) => pl.boxes.forEach((b) => {
        if (b.compartmentIndex >= nt) b.compartmentIndex = nt - 1;
      }));
      if (state.activeCompartmentIdx >= nt) state.activeCompartmentIdx = nt - 1;
      refreshAll();
    };
    const tiersInc = document.getElementById('drw-tiers-inc');
    const tiersDec = document.getElementById('drw-tiers-dec');
    if (tiersInc) {
      tiersInc.addEventListener('click', () => {
        const cur = Math.min(6, Math.max(1, Math.round(Number(state.spaceConfig.drawer.tiers) || 2)));
        if (cur < 6) setDrawerTiers(cur + 1);
      });
    }
    if (tiersDec) {
      tiersDec.addEventListener('click', () => {
        const cur = Math.min(6, Math.max(1, Math.round(Number(state.spaceConfig.drawer.tiers) || 2)));
        if (cur > 1) setDrawerTiers(cur - 1);
      });
    }

    // 4. 하단 카메라 시점 & 서랍 슬라이더
    document.querySelectorAll('[data-cam]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.Scene3DManager.setCameraView(btn.dataset.cam);
      });
    });

    // (예전 서랍 열기 슬라이드바는 '문 열기 / 서랍 열기' 버튼 창으로 옮겼어요: bindOpenCtrl)

    document.getElementById('chk-show-deadzones').addEventListener('change', (e) => {
      state.showDeadzones = e.target.checked;
      refreshAll();
      // 눌렀을 때 무엇이 바뀌었는지 바로 알려줌
      const sc = state.spaceConfig;
      let has = false;
      if (sc.type === 'cabinet') {
        const k = window.PackerEngine.getCabinetConstraints(sc);
        has = k.leftDeadW > 0 || k.rightDeadW > 0;
      } else if (sc.type === 'drawer') {
        has = window.PackerEngine.getDrawerConstraints(sc).unexposedD > 0;
      } else {
        has = !!window.PackerEngine.getPantryCorner(sc);
      }
      if (!state.showDeadzones) showToast('빨간 표시를 숨겼어요');
      else showToast(has ? '꺼내기 힘든 곳을 빨간색으로 보여줘요' : '이 가구에는 꺼내기 힘든 곳이 없어요');
    });

    // 5. 시안(Plan) 추가 / 비우기 / 비교표 모달
    document.getElementById('btn-add-plan').addEventListener('click', () => {
      const name = prompt('새 계획 이름을 정해주세요:', `계획 ${String.fromCharCode(65 + state.plans.length)}`);
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

    document.getElementById('btn-clear-plan').addEventListener('click', async () => {
      const activePlan = getActivePlan();
      if (!activePlan.boxes.length) { showToast('비울 상자가 없어요'); return; }
      const ok = await confirmDialog({
        title: '상자를 다 비울까요?',
        message: `지금 계획의 상자 ${activePlan.boxes.length}개가 모두 빠져요.`,
        ok: '다 비우기'
      });
      if (!ok) return;
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
    document.getElementById('btn-box-stack-more')?.addEventListener('click', stackOneMoreOnSelected);

    // 상세 조정: 방향키 창 열고 닫기 (창 밖을 누르면 닫힘)
    const finePad = document.getElementById('box-fine-pad');
    const fineBackdrop = document.getElementById('box-fine-backdrop');
    const fineBtn = document.getElementById('btn-box-fine');
    const setFine = (open) => {
      finePad.hidden = !open;
      fineBackdrop.hidden = !open;
      fineBtn.classList.toggle('active', open);
      fineBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    window.closeBoxFinePad = () => setFine(false);
    fineBtn.addEventListener('click', (e) => { e.stopPropagation(); setFine(finePad.hidden); });
    fineBackdrop.addEventListener('pointerdown', (e) => { e.preventDefault(); setFine(false); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !finePad.hidden) setFine(false); });
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
      const brand = document.getElementById('new-box-brand').value.trim() || '내 상자';
      const lineup = document.getElementById('new-box-lineup').value.trim() || '내 종류';
      const name = document.getElementById('new-box-name').value.trim() || '내 상자';
      const wTop = Math.max(20, Number(document.getElementById('new-box-wtop').value) || 200);
      const dTop = Math.max(20, Number(document.getElementById('new-box-dtop').value) || 200);
      const h = Math.max(20, Number(document.getElementById('new-box-h').value) || 120);
      const shapeType = document.getElementById('new-box-shape').value;
      const wBot = shapeType === 'tapered'
        ? Math.max(10, Number(document.getElementById('new-box-wbot').value) || wTop - 10)
        : wTop;
      const dBot = shapeType === 'tapered'
        ? Math.max(10, Number(document.getElementById('new-box-dbot').value) || dTop - 10)
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

    // 지난번에 쓰던 설정이 있으면 그대로 불러와요 (공유 링크로 열었을 때는 링크 내용이 먼저)
    const urlParams = new URLSearchParams(window.location.search);
    const isSharedLink = !!(urlParams.get('state') || urlParams.get('plan'));
    const restored = isSharedLink ? null : loadLocal();
    if (isSharedLink) {
      // 공유 링크로 연 사람은 질문 없이 바로 받은 배치를 3D로 봐요
      state.setupDone = true;
      state.mobileStep = 'build';
      state.wizPreview = false;
    }
    if (restored) {
      state.spaceConfig = restored.spaceConfig;
      if (!state.spaceConfig.pantry) state.spaceConfig.pantry = defaultPantry();
      if (!state.spaceConfig.fridge) state.spaceConfig.fridge = defaultFridge();
      if (state.spaceConfig.drawer && !state.spaceConfig.drawer.tiers) state.spaceConfig.drawer.tiers = 2;
      state.plans = restored.plans;
      if (restored.plans.some((p) => p.id === restored.activePlanId)) state.activePlanId = restored.activePlanId;
      if (restored.setupDone) {
        state.setupDone = true;
        state.mobileStep = 'build';
        state.wizPreview = false;
      }
    }
    window.addEventListener('pagehide', saveLocalNow);
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveLocalNow(); });
    document.getElementById('drag-guide-ok')?.addEventListener('click', closeDragGuide);
    document.getElementById('box-guide-ok')?.addEventListener('click', closeBoxGuide);
    document.getElementById('filter-guide-ok')?.addEventListener('click', closeFilterGuide);
    document.getElementById('filter-guide')?.addEventListener('click', (e) => {
      if (e.target.id === 'filter-guide') closeFilterGuide(); // 바깥을 눌러도 닫힘
    });
    window.addEventListener('keydown', (e) => {
      const fg = document.getElementById('filter-guide');
      if (e.key === 'Escape' && fg && !fg.hidden) { e.stopPropagation(); closeFilterGuide(); }
    }, true);
    setupResizableSheets();
    bindAddBoxModal();
    bindOpenCtrl();
    updateOpenCtrlButton();
    document.getElementById('box-guide')?.addEventListener('click', (e) => {
      if (e.target.id === 'box-guide') closeBoxGuide();
    });
    document.getElementById('btn-save-photo')?.addEventListener('click', savePhoto);
    document.getElementById('drag-guide')?.addEventListener('click', (e) => {
      if (e.target.id === 'drag-guide') closeDragGuide();
    });

    window.Scene3DManager.init('canvas-wrapper', {
      onBoxInteraction: handleBoxInteraction,
      onBoxesMoved: () => {
        saveLocalSoon();
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

    // ===== 내보내기 모달 (#modal-export) & 칸별 금액 오버레이 (#cost-overlay) =====
    const exportModal = document.getElementById('modal-export');
    const costOverlay = document.getElementById('cost-overlay');

    function renderCostOverlayLabels(anchors) {
      const labelsEl = document.getElementById('cost-overlay-labels');
      if (!labelsEl) return;
      const activePlan = getActivePlan();
      const compartments = window.PackerEngine.getCompartments(state.spaceConfig);
      labelsEl.innerHTML = '';

      (anchors || []).forEach((anc) => {
        const comp = compartments[anc.index];
        if (!comp) return;
        const compBoxes = activePlan.boxes.filter((b) => b.compartmentIndex === anc.index);
        const compCost = Math.round(compBoxes.reduce((sum, b) => {
          const m = state.modelsMap[b.modelId];
          return sum + (Number(m?.price) || 0) / Math.max(1, Number(m?.packQty) || 1); // 묶음 상품은 1개 몫
        }, 0));
        const hasPrice = compBoxes.some((b) => Number(state.modelsMap[b.modelId]?.price) > 0);

        let costText = '0원';
        if (compBoxes.length > 0) {
          costText = hasPrice
            ? `${compCost.toLocaleString('ko-KR')}원 (${compBoxes.length}개)`
            : `상자 ${compBoxes.length}개 · 가격 준비 중`;
        }

        const badge = document.createElement('div');
        badge.className = 'cost-overlay-badge';
        const px = Number.isFinite(anc.cx) ? anc.cx : anc.x;
        const py = Number.isFinite(anc.cy) ? anc.cy : anc.y;
        badge.style.left = `${px.toFixed(1)}px`;
        badge.style.top = `${py.toFixed(1)}px`;
        badge.innerHTML = `<span class="cob-name">${comp.name}</span><span class="cob-val">${costText}</span>`;
        labelsEl.appendChild(badge);
      });
    }

    function openCostOverlay() {
      closeExportModal();
      state.costOverlayOpen = true;
      if (costOverlay) {
        costOverlay.style.display = 'block';
        renderCostOverlayLabels(lastShelfAnchors);
      }
    }

    function closeCostOverlay() {
      state.costOverlayOpen = false;
      if (costOverlay) costOverlay.style.display = 'none';
    }

    function updateExportMarginPreview() {
      const previewEl = document.getElementById('export-margin-preview');
      const dirsEl = document.getElementById('export-margin-dirs');
      const chkMain = document.getElementById('chk-export-show-margins');
      if (!previewEl) return;
      const enabled = chkMain ? chkMain.checked : true;
      if (dirsEl) dirsEl.style.display = enabled ? 'flex' : 'none';
      if (!enabled) {
        previewEl.style.display = 'none';
        return;
      }
      const { show, dirs } = getSelectedMarginDirs();
      if (!show) {
        previewEl.style.display = 'block';
        previewEl.innerHTML = `<div class="emp-empty">표시할 방향(상·좌·우·전·후)을 하나 이상 체크해 주세요.</div>`;
        return;
      }
      const activePlan = getActivePlan();
      const allMargins = window.PackerEngine.getCompartmentMargins
        ? window.PackerEngine.getCompartmentMargins(state.spaceConfig, activePlan.boxes, state.modelsMap)
        : [];
      const occupied = allMargins.filter((m) => m.boxCount > 0);
      const targets = occupied.length > 0 ? occupied : allMargins.slice(0, 1);
      previewEl.style.display = 'block';
      previewEl.innerHTML = targets.map((m) => `
        <div class="emp-row">
          <span class="emp-name">${m.name}</span>
          <span class="emp-vals">${formatMarginLine(m, dirs)}</span>
        </div>
      `).join('');
    }

    function renderExportModal() {
      const activePlan = getActivePlan();
      const boxes = activePlan.boxes || [];
      const costTotalEl = document.getElementById('export-cost-total');
      const linksListEl = document.getElementById('export-links-list');

      updateExportMarginPreview();

      // 1) 총 구매비용 계산
      if (costTotalEl) {
        if (boxes.length === 0) {
          costTotalEl.textContent = '0원';
        } else {
          // 묶음 판매 상품(packQty)은 필요한 묶음 수만큼: 예) 3개 묶음 상품을 4개 놓으면 2묶음
          const countByModel = {};
          boxes.forEach((b) => { countByModel[b.modelId] = (countByModel[b.modelId] || 0) + 1; });
          const totalCost = Object.keys(countByModel).reduce((sum, id) => {
            const m = state.modelsMap[id];
            const pack = Math.max(1, Number(m?.packQty) || 1);
            return sum + (Number(m?.price) || 0) * Math.ceil(countByModel[id] / pack);
          }, 0);
          const hasAnyPrice = boxes.some((b) => Number(state.modelsMap[b.modelId]?.price) > 0);
          costTotalEl.textContent = hasAnyPrice
            ? `${totalCost.toLocaleString('ko-KR')}원`
            : '가격 정보 준비 중';
        }
      }

      // 2) 브랜드별 구매 링크 모음 (중복 모델 제거, 3열 썸네일)
      if (linksListEl) {
        linksListEl.innerHTML = '';
        if (boxes.length === 0) {
          linksListEl.innerHTML = `<div style="font-size:13px;color:#6B7280;padding:4px 0;">아직 배치한 수납함이 없어요.</div>`;
        } else {
          // 브랜드별로 고유 모델과 수량 집계
          const brandMap = new Map();
          boxes.forEach((b) => {
            const m = state.modelsMap[b.modelId];
            if (!m) return;
            const brand = m.brand || '기타';
            if (!brandMap.has(brand)) brandMap.set(brand, new Map());
            const modelGroup = brandMap.get(brand);
            if (!modelGroup.has(m.id)) {
              modelGroup.set(m.id, { model: m, count: 0 });
            }
            modelGroup.get(m.id).count += 1;
          });

          brandMap.forEach((modelGroup, brand) => {
            const groupEl = document.createElement('div');
            groupEl.className = 'export-brand-group';

            const headerEl = document.createElement('div');
            headerEl.className = 'export-brand-name open';
            headerEl.innerHTML = `
              <span>${brand} (${modelGroup.size}종)</span>
              <span class="toggle-arrow">▾</span>
            `;

            const itemsEl = document.createElement('div');
            itemsEl.className = 'export-brand-items';

            headerEl.addEventListener('click', () => {
              const isOpen = headerEl.classList.toggle('open');
              itemsEl.style.display = isOpen ? 'grid' : 'none';
            });

            modelGroup.forEach(({ model, count }) => {
              const card = document.createElement('div');
              card.className = 'export-item-card';
              const thumbHtml = model.image
                ? `<img src="${model.image}" alt="${model.name}" style="width:100%;height:100%;object-fit:cover;" />`
                : (window.getProductThumbnailSVG ? window.getProductThumbnailSVG(model) : '<span>사진 준비 중</span>');
              card.innerHTML = `
                <div class="export-item-thumb" style="position:relative;">
                  ${thumbHtml}
                  ${count > 1 ? `<span style="position:absolute;top:6px;right:6px;padding:1px 6px;border-radius:999px;background:rgba(59,42,26,0.82);color:#fff;font-size:10px;font-weight:600;">${count}개</span>` : ''}
                </div>
                <div class="export-item-name">${model.name}</div>
              `;
              card.addEventListener('click', () => {
                if (model.url) {
                  window.open(model.url, '_blank', 'noopener,noreferrer');
                } else {
                  showToast('구매 링크 준비 중이에요');
                }
              });
              itemsEl.appendChild(card);
            });

            groupEl.appendChild(headerEl);
            groupEl.appendChild(itemsEl);
            linksListEl.appendChild(groupEl);
          });
        }
      }
    }

    function openExportModal() {
      renderExportModal();
      if (exportModal) {
        exportModal.classList.add('open');
        exportModal.style.display = 'flex';
      }
    }

    function closeExportModal() {
      if (exportModal) {
        exportModal.classList.remove('open');
        exportModal.style.display = 'none';
      }
    }

    document.getElementById('btn-export')?.addEventListener('click', openExportModal);
    document.getElementById('btn-close-export')?.addEventListener('click', closeExportModal);
    exportModal?.addEventListener('click', (e) => {
      if (e.target === exportModal) closeExportModal();
    });
    document.getElementById('chk-export-show-margins')?.addEventListener('change', updateExportMarginPreview);
    document.querySelectorAll('#export-margin-dirs input[type="checkbox"]').forEach((c) => {
      c.addEventListener('change', updateExportMarginPreview);
    });
    document.getElementById('btn-export-photo')?.addEventListener('click', () => {
      savePhoto();
    });
    document.getElementById('export-cost-total')?.addEventListener('click', openCostOverlay);
    document.getElementById('btn-export-cost-view')?.addEventListener('click', openCostOverlay);
    document.getElementById('btn-cost-overlay-close')?.addEventListener('click', closeCostOverlay);

    refreshAll();
    window.Scene3DManager.setCameraView('iso');

    // 처음 화면 종류: 지난번에 고른 것 -> 없으면 화면 너비로 (900px 이상은 데스크탑)
    const startLayout = (restored && restored.layout) || (window.innerWidth >= 900 ? 'pc' : 'mobile');
    setUIMode(startLayout);

    // Vercel + Neon DB 및 공유 URL 동기화
    syncWithCloudDatabase();
  });
})();
