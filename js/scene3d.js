// Three.js 3D 메인 뷰포트 (자동 위로 적층, 모바일 터치 조작, Shift+클릭 묶음, 3D 선반 리더라인 투영)

window.Scene3DManager = (function () {
  let scene, camera, renderer, controls, containerEl;
  let rootGroup, roomEnvGroup, cabinetGroup, drawerStaticGroup, drawerSlidingGroup, boxesGroup;
  let raycaster, mouse, dragPlane;

  let isDragging = false;
  let tapBoxId = null;
  let hasDraggedBeyondThreshold = false;
  let pointerDownScreenPos = { x: 0, y: 0 };
  let pendingUnbundleBoxId = null;
  let clickedEmptySpace = false;

  let dragAnchorBoxId = null;
  let dragStartWorldPoint = new THREE.Vector3();
  let dragInitialPositions = {}; // { boxId: { x, z, relY, w, d } }
  let dragBundleBounds = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };

  let currentSpaceConfig = null;
  let currentBoxes = [];
  let currentModelsMap = {};
  let currentValidation = { boxStatuses: {}, messages: [] };
  let selectedBoxIds = [];
  let activeCompartmentIdx = 0;
  let drawerOpenRatio = 1.0;
  let doorOpenAngle = 0; // 기본은 문을 열어두거나 닫지 않아 선반이 잘 보이도록 설정
  let showDeadzones = true;
  let xrayMode = false;
  let snapStep = 5;
  let touchMultiSelectMode = false; // 스마트폰 터치용 묶음 선택 모드 토글

  let onBoxInteractionCallback = null;
  let onBoxesMovedCallback = null;
  let onBundleScreenPosCallback = null;
  let onShelfAnchorsCallback = null;

  function createFrustumGeometry(wTop, dTop, wBot, dBot, h) {
    const hwT = wTop / 2, hdT = dTop / 2;
    const hwB = wBot / 2, hdB = dBot / 2;

    const v = [
      [-hwB, 0, -hdB], [hwB, 0, -hdB], [hwB, 0, hdB], [-hwB, 0, hdB],
      [-hwT, h, -hdT], [hwT, h, -hdT], [hwT, h, hdT], [-hwT, h, hdT]
    ];

    const indices = [
      0, 2, 1, 0, 3, 2,
      4, 5, 6, 4, 6, 7,
      3, 6, 2, 3, 7, 6,
      1, 4, 0, 1, 5, 4,
      0, 7, 3, 0, 4, 7,
      2, 5, 1, 2, 6, 5
    ];

    const positions = [];
    indices.forEach((idx) => {
      positions.push(v[idx][0], v[idx][1], v[idx][2]);
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    return geom;
  }

  function buildStorageBoxMesh(model, rot, statusSeverity, isSelected, isInBundle, isXray) {
    // 생활 물건: 상자 대신 물건 모양으로 그림
    if (model.itemShape && typeof window.buildItemMesh === 'function') {
      const g = window.buildItemMesh(model);
      if (isXray) {
        g.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = 0.45; } });
      }
      if (statusSeverity === 'error' || statusSeverity === 'warn' || isSelected) {
        const col = isSelected ? (isInBundle ? 0xf59e0b : 0xb86b43)
          : (statusSeverity === 'error' ? 0xdc2626 : 0xd97706);
        const outline = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(model.wTop + 5, model.h + 5, model.dTop + 5)),
          new THREE.LineBasicMaterial({ color: col })
        );
        outline.position.y = model.h / 2;
        g.add(outline);
      }
      g.rotation.y = -((rot || 0) * Math.PI) / 180;
      return g;
    }

    const group = new THREE.Group();

    const wT = model.wTop, dT = model.dTop;
    const wB = model.shapeType === 'tapered' ? (model.wBot || wT) : wT;
    const dB = model.shapeType === 'tapered' ? (model.dBot || dT) : dT;
    const h = model.h;

    const geom = createFrustumGeometry(wT, dT, wB, dB, h);

    let baseColor = model.color || '#f2ece1';
    let edgeColor = 0x7d6b5d;
    let opacity = isXray ? 0.42 : 0.92;

    if (statusSeverity === 'error') {
      baseColor = '#fca5a5';
      edgeColor = 0xdc2626;
    } else if (statusSeverity === 'warn') {
      edgeColor = 0xd97706;
    }

    if (isSelected) {
      edgeColor = isInBundle ? 0xd97706 : 0xb86b43;
    }

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseColor),
      roughness: 0.42,
      metalness: 0.02,
      transparent: true,
      opacity: opacity
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const edgesGeom = new THREE.EdgesGeometry(geom, 15);
    const edgesMat = new THREE.LineBasicMaterial({
      color: edgeColor
    });
    const edges = new THREE.LineSegments(edgesGeom, edgesMat);
    group.add(edges);

    if (isSelected) {
      const selGeom = new THREE.BoxGeometry(wT + 5, h + 5, dT + 5);
      const selEdges = new THREE.EdgesGeometry(selGeom);
      const selLine = new THREE.LineSegments(
        selEdges,
        new THREE.LineBasicMaterial({ color: isInBundle ? 0xf59e0b : 0xb86b43 })
      );
      selLine.position.y = h / 2;
      group.add(selLine);
    }

    const frontZ = (dT + dB) / 4;
    if (model.accessType === 'front_drawer') {
      const drawerFaceW = wB * 0.88;
      const drawerFaceH = h * 0.82;
      const faceGeom = new THREE.PlaneGeometry(drawerFaceW, drawerFaceH);
      const faceEdges = new THREE.EdgesGeometry(faceGeom);
      const faceLine = new THREE.LineSegments(
        faceEdges,
        new THREE.LineBasicMaterial({ color: 0x6e5d52 })
      );
      faceLine.position.set(0, h * 0.5, dT / 2 + 0.8);
      group.add(faceLine);

      const handleGeom = new THREE.BoxGeometry(Math.min(70, wB * 0.35), 9, 8);
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x8c6239 });
      const handleMesh = new THREE.Mesh(handleGeom, handleMat);
      handleMesh.position.set(0, h * 0.56, dT / 2 + 4);
      group.add(handleMesh);
    } else if (model.accessType === 'top_lid') {
      const lidH = Math.min(16, h * 0.12);
      const lidGeom = new THREE.BoxGeometry(wT + 3, lidH, dT + 3);
      const lidMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(baseColor).multiplyScalar(0.92),
        roughness: 0.45,
        transparent: true,
        opacity: opacity
      });
      const lidMesh = new THREE.Mesh(lidGeom, lidMat);
      lidMesh.position.y = h - lidH / 2 + 1;
      group.add(lidMesh);
    } else if (model.accessType === 'top_open' || model.accessType === 'front_open') {
      const topInsetGeom = new THREE.PlaneGeometry(wT * 0.88, dT * 0.88);
      const topInsetMat = new THREE.MeshBasicMaterial({
        color: 0x8c7a6b,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide
      });
      const topInset = new THREE.Mesh(topInsetGeom, topInsetMat);
      topInset.rotation.x = -Math.PI / 2;
      topInset.position.y = h + 0.4;
      group.add(topInset);
    }

    if (model.hasFrontHandle && model.accessType !== 'front_drawer') {
      const hGeom = new THREE.BoxGeometry(Math.min(60, wT * 0.35), 11, 5);
      const hMat = new THREE.MeshStandardMaterial({ color: 0x8c6239 });
      const hMesh = new THREE.Mesh(hGeom, hMat);
      hMesh.position.set(0, h * 0.72, frontZ + 2);
      group.add(hMesh);
    }

    const rad = -((rot || 0) * Math.PI) / 180;
    group.rotation.y = rad;

    return group;
  }

  function init(containerId, callbacks) {
    containerEl = document.getElementById(containerId);
    if (!containerEl) return;

    onBoxInteractionCallback = callbacks.onBoxInteraction;
    onBoxesMovedCallback = callbacks.onBoxesMoved;
    onBundleScreenPosCallback = callbacks.onBundleScreenPos;
    onShelfAnchorsCallback = callbacks.onShelfAnchors;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xefe9df); // 아이보리 베이지 배경

    const w = containerEl.clientWidth || 800;
    const h = containerEl.clientHeight || 600;

    camera = new THREE.PerspectiveCamera(38, w / h, 10, 20000);
    camera.position.set(780, 920, 2200);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // 스마트폰 터치 드래그 시 브라우저 스크롤 방지
    renderer.domElement.style.touchAction = 'none';
    containerEl.innerHTML = '';
    containerEl.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(60, 520, 0);
    controls.maxPolarAngle = Math.PI * 0.49;

    const ambientLight = new THREE.AmbientLight(0xfff9f0, 0.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff2dd, 0.6);
    sunLight.position.set(750, 1650, 1250);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 100;
    sunLight.shadow.camera.far = 5000;
    const d = 1600;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    const warmFillLight = new THREE.DirectionalLight(0xfde6c4, 0.25);
    warmFillLight.position.set(-850, 750, 700);
    scene.add(warmFillLight);

    rootGroup = new THREE.Group();
    roomEnvGroup = new THREE.Group();
    cabinetGroup = new THREE.Group();
    drawerStaticGroup = new THREE.Group();
    drawerSlidingGroup = new THREE.Group();
    boxesGroup = new THREE.Group();

    rootGroup.add(roomEnvGroup);
    rootGroup.add(cabinetGroup);
    rootGroup.add(drawerStaticGroup);
    rootGroup.add(drawerSlidingGroup);
    scene.add(rootGroup);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: false });
    renderer.domElement.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('resize', () => onWindowResize(containerEl));

    animate();
  }

  function onWindowResize(container) {
    if (!container || !renderer || !camera) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
      updateBundleFloatingPopupPosition();
      updateShelfCalloutAnchors();
    }
  }

  // 3D 가구의 각 선반 우측 모서리 지점을 2D 화면 좌표로 변환하여 선반 카드 리더라인(연결선)에 전달
  function updateShelfCalloutAnchors() {
    if (!onShelfAnchorsCallback || !currentSpaceConfig || !containerEl || !camera) return;
    const compartments = window.PackerEngine.getCompartments(currentSpaceConfig);
    const isCab = currentSpaceConfig.type === 'cabinet';
    const W = isCab ? currentSpaceConfig.cabinet.w : currentSpaceConfig.drawer.w;
    const D = isCab ? currentSpaceConfig.cabinet.d : currentSpaceConfig.drawer.d;

    const cw = containerEl.clientWidth;
    const ch = containerEl.clientHeight;

    const anchors = compartments.map((comp) => {
      const worldX = W / 2 + 18;
      const worldY = comp.yStart + Math.min(45, comp.clearH * 0.25);
      const worldZ = D / 2;
      const v = new THREE.Vector3(worldX, worldY, worldZ);
      v.project(camera);
      return {
        index: comp.index,
        x: (v.x * 0.5 + 0.5) * cw,
        y: (-(v.y * 0.5) + 0.5) * ch
      };
    });

    onShelfAnchorsCallback(anchors);
  }

  function updateBundleFloatingPopupPosition() {
    if (!onBundleScreenPosCallback || !currentSpaceConfig || !containerEl) return;
    if (!selectedBoxIds || selectedBoxIds.length < 2) {
      onBundleScreenPosCallback({ visible: false });
      return;
    }

    const selBoxes = currentBoxes.filter((b) => selectedBoxIds.includes(b.id));
    if (selBoxes.length < 2) {
      onBundleScreenPosCallback({ visible: false });
      return;
    }

    const compartments = window.PackerEngine.getCompartments(currentSpaceConfig);
    const comp = compartments[selBoxes[0].compartmentIndex] || compartments[0];
    const W = currentSpaceConfig.type === 'cabinet' ? currentSpaceConfig.cabinet.w : currentSpaceConfig.drawer.w;
    const D = currentSpaceConfig.type === 'cabinet' ? currentSpaceConfig.cabinet.d : currentSpaceConfig.drawer.d;
    const slideZ = currentSpaceConfig.type === 'drawer'
      ? drawerOpenRatio * window.PackerEngine.getDrawerConstraints(currentSpaceConfig).exposedD
      : 0;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxTopY = 0;
    selBoxes.forEach((b) => {
      const m = currentModelsMap[b.modelId];
      if (!m) return;
      const dims = window.PackerEngine.getOrientedDims(m, b.rot || 0);
      if (b.x < minX) minX = b.x;
      if (b.x + dims.w > maxX) maxX = b.x + dims.w;
      if (b.z < minZ) minZ = b.z;
      if (b.z + dims.d > maxZ) maxZ = b.z + dims.d;
      if ((b.y || 0) + dims.h > maxTopY) maxTopY = (b.y || 0) + dims.h;
    });

    const worldX = -W / 2 + (minX + maxX) / 2;
    const worldY = comp.yStart + maxTopY + 30;
    const worldZ = -D / 2 + (minZ + maxZ) / 2 + slideZ;

    const pos3D = new THREE.Vector3(worldX, worldY, worldZ);
    pos3D.project(camera);

    const cw = containerEl.clientWidth;
    const ch = containerEl.clientHeight;
    const screenX = Math.max(165, Math.min(cw - 165, (pos3D.x * 0.5 + 0.5) * cw));
    const screenY = Math.max(70, Math.min(ch - 90, (-(pos3D.y * 0.5) + 0.5) * ch));

    onBundleScreenPosCallback({
      visible: true,
      x: screenX,
      y: screenY,
      count: selBoxes.length
    });
  }

  function clearGroup(group) {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }
  }

  // 첨부 샘플 이미지와 같은 깔끔한 웜톤 가정집 실내 배경 (벽면 + 따뜻한 마루 바닥)
  function buildWarmHomeRoomEnvironment(spaceConfig) {
    const isCab = spaceConfig.type === 'cabinet';
    const W = isCab ? spaceConfig.cabinet.w : spaceConfig.drawer.w;
    const D = isCab ? spaceConfig.cabinet.d : spaceConfig.drawer.d;
    const H = isCab ? spaceConfig.cabinet.h : spaceConfig.drawer.h;

    const floorY = isCab ? -46 : -360;
    const backWallZ = -D / 2 - 24;

    const roomW = 2400;
    const roomD = 2200;
    const wallH = Math.max(2400, H + 500);

    // 1. 따뜻한 밝은 우드 마루 바닥
    const floorGeom = new THREE.PlaneGeometry(roomW, roomD);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xe8dcc8,
      roughness: 0.8,
      metalness: 0.0
    });
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, floorY, backWallZ + roomD / 2);
    floorMesh.receiveShadow = true;
    roomEnvGroup.add(floorMesh);

    const plankLinesPoints = [];
    const plankStep = 130;
    for (let x = -roomW / 2; x <= roomW / 2; x += plankStep) {
      plankLinesPoints.push(new THREE.Vector3(x, floorY + 0.6, backWallZ));
      plankLinesPoints.push(new THREE.Vector3(x, floorY + 0.6, backWallZ + roomD));
    }
    const plankGeom = new THREE.BufferGeometry().setFromPoints(plankLinesPoints);
    const plankLines = new THREE.LineSegments(
      plankGeom,
      new THREE.LineBasicMaterial({ color: 0xd6c8b2, transparent: true, opacity: 0.45 })
    );
    roomEnvGroup.add(plankLines);

    // 2. 가정집 아이보리 화이트 뒷벽
    const backWallGeom = new THREE.BoxGeometry(roomW, wallH, 24);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xfdfbf7,
      roughness: 0.92,
      metalness: 0.0
    });
    const backWallMesh = new THREE.Mesh(backWallGeom, wallMat);
    backWallMesh.position.set(0, floorY + wallH / 2, backWallZ - 12);
    backWallMesh.receiveShadow = true;
    roomEnvGroup.add(backWallMesh);

    // 3. 벽 하단 걸레받이 몰딩
    const baseboardH = 55;
    const baseboardGeom = new THREE.BoxGeometry(roomW, baseboardH, 8);
    const baseboardMat = new THREE.MeshStandardMaterial({
      color: 0xf4ead5,
      roughness: 0.7
    });
    const baseboardMesh = new THREE.Mesh(baseboardGeom, baseboardMat);
    baseboardMesh.position.set(0, floorY + baseboardH / 2, backWallZ + 4);
    roomEnvGroup.add(baseboardMesh);

    if (isCab) {
      const plinthH = 28;
      const plinthGeom = new THREE.BoxGeometry(W + 36, plinthH, D + 10);
      const plinthMat = new THREE.MeshStandardMaterial({
        color: 0xc8a279,
        roughness: 0.65
      });
      const plinthMesh = new THREE.Mesh(plinthGeom, plinthMat);
      plinthMesh.position.set(0, -18 - plinthH / 2, -4);
      plinthMesh.castShadow = true;
      plinthMesh.receiveShadow = true;
      roomEnvGroup.add(plinthMesh);
    }
  }

  function renderScene(spaceConfig, placedBoxes, modelsMap, stateOpts) {
    currentSpaceConfig = spaceConfig;
    currentBoxes = placedBoxes;
    currentModelsMap = modelsMap;
    if (stateOpts) {
      if (stateOpts.selectedBoxIds !== undefined) selectedBoxIds = stateOpts.selectedBoxIds;
      if (stateOpts.activeCompartmentIdx !== undefined) activeCompartmentIdx = stateOpts.activeCompartmentIdx;
      if (stateOpts.drawerOpenRatio !== undefined) drawerOpenRatio = stateOpts.drawerOpenRatio;
      if (stateOpts.doorOpenAngle !== undefined) doorOpenAngle = stateOpts.doorOpenAngle;
      if (stateOpts.showDeadzones !== undefined) showDeadzones = stateOpts.showDeadzones;
      if (stateOpts.xrayMode !== undefined) xrayMode = stateOpts.xrayMode;
      if (stateOpts.snapStep !== undefined) snapStep = stateOpts.snapStep;
      if (stateOpts.touchMultiSelectMode !== undefined) touchMultiSelectMode = stateOpts.touchMultiSelectMode;
    }

    currentValidation = window.PackerEngine.validatePlan(spaceConfig, placedBoxes, modelsMap);

    clearGroup(roomEnvGroup);
    clearGroup(cabinetGroup);
    clearGroup(drawerStaticGroup);
    clearGroup(drawerSlidingGroup);
    clearGroup(boxesGroup);

    buildWarmHomeRoomEnvironment(spaceConfig);

    if (spaceConfig.type === 'cabinet') {
      buildCabinetScene(spaceConfig);
      cabinetGroup.add(boxesGroup);
      boxesGroup.position.set(0, 0, 0);
    } else {
      buildDrawerScene(spaceConfig);
      drawerSlidingGroup.add(boxesGroup);
      boxesGroup.position.set(0, 0, 0);
    }

    buildPlacedBoxes(spaceConfig, placedBoxes, modelsMap);
  }

  function buildCabinetScene(spaceConfig) {
    const c = spaceConfig.cabinet;
    const W = c.w, D = c.d, H = c.h;
    const wallT = 18;
    const compartments = window.PackerEngine.getCompartments(spaceConfig);
    const cabConst = window.PackerEngine.getCabinetConstraints(spaceConfig);

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xd8b58d,
      roughness: 0.65,
      transparent: true,
      opacity: xrayMode ? 0.25 : 0.9
    });
    const backPanelMat = new THREE.MeshStandardMaterial({
      color: 0xf4ead4,
      roughness: 0.78,
      transparent: true,
      opacity: xrayMode ? 0.25 : 0.96
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x9b7955 });

    const addPanel = (pw, ph, pd, px, py, pz, matOverride) => {
      const g = new THREE.BoxGeometry(pw, ph, pd);
      const m = new THREE.Mesh(g, matOverride || woodMat);
      m.position.set(px, py, pz);
      m.castShadow = true;
      m.receiveShadow = true;
      cabinetGroup.add(m);
      const eg = new THREE.EdgesGeometry(g);
      const el = new THREE.LineSegments(eg, edgeMat);
      el.position.set(px, py, pz);
      cabinetGroup.add(el);
    };

    addPanel(W + wallT * 2, wallT, D + wallT, 0, -wallT / 2, -wallT / 2);
    addPanel(W + wallT * 2, wallT, D + wallT, 0, H + wallT / 2, -wallT / 2);
    addPanel(wallT, H, D + wallT, -W / 2 - wallT / 2, H / 2, -wallT / 2);
    addPanel(wallT, H, D + wallT, W / 2 + wallT / 2, H / 2, -wallT / 2);
    addPanel(W, H, wallT, 0, H / 2, -D / 2 - wallT / 2, backPanelMat);

    const shelfMat = new THREE.MeshStandardMaterial({
      color: 0xd0ac84,
      roughness: 0.6,
      transparent: true,
      opacity: xrayMode ? 0.35 : 0.92
    });
    (c.shelves || []).forEach((shelf) => {
      const st = shelf.thickness || 18;
      addPanel(W, st, D, 0, shelf.bottomY + st / 2, 0, shelfMat);
    });

    const activeComp = compartments[activeCompartmentIdx] || compartments[0];
    if (activeComp) {
      const floorHighlightGeom = new THREE.PlaneGeometry(W - 4, D - 4);
      const floorHighlightMat = new THREE.MeshBasicMaterial({
        color: 0xb86b43,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide
      });
      const floorMesh = new THREE.Mesh(floorHighlightGeom, floorHighlightMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.set(0, activeComp.yStart + 0.8, 0);
      cabinetGroup.add(floorMesh);
    }

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xc29c74,
      roughness: 0.55,
      transparent: true,
      opacity: 0.85
    });
    const frameDepth = 18;
    const fz = D / 2 + frameDepth / 2;

    if (cabConst.leftFrameW > 0) {
      addPanel(cabConst.leftFrameW, H, frameDepth, -W / 2 + cabConst.leftFrameW / 2, H / 2, fz, frameMat);
    }
    if (cabConst.rightFrameW > 0) {
      addPanel(cabConst.rightFrameW, H, frameDepth, W / 2 - cabConst.rightFrameW / 2, H / 2, fz, frameMat);
    }
    if (cabConst.topFrameH > 0) {
      addPanel(W - cabConst.leftFrameW - cabConst.rightFrameW, cabConst.topFrameH, frameDepth, 0, H - cabConst.topFrameH / 2, fz, frameMat);
    }
    if (cabConst.bottomFrameH > 0) {
      addPanel(W - cabConst.leftFrameW - cabConst.rightFrameW, cabConst.bottomFrameH, frameDepth, 0, cabConst.bottomFrameH / 2, fz, frameMat);
    }

    // 3D 여닫이 문짝 (문틀이 0이어도 문 방향이 'none'이 아니면 문짝, 경첩, 손잡이를 렌더링하고 개방각도만큼 회전!)
    if (c.doorType && c.doorType !== 'none') {
      const openLeftX = -W / 2 + cabConst.leftFrameW;
      const openRightX = W / 2 - cabConst.rightFrameW;
      const openW = Math.max(80, openRightX - openLeftX);
      const openBotY = cabConst.bottomFrameH;
      const openTopY = H - cabConst.topFrameH;
      const openH = Math.max(80, openTopY - openBotY);
      const doorCenterY = openBotY + openH / 2;
      const hingeZ = D / 2 + (cabConst.leftFrameW > 0 || cabConst.rightFrameW > 0 ? frameDepth : 2);
      const doorT = 16;

      const doorMat = new THREE.MeshStandardMaterial({
        color: 0xe3c7a2,
        roughness: 0.55,
        transparent: true,
        opacity: xrayMode ? 0.16 : 0.48,
        depthWrite: false
      });
      const doorEdgeMat = new THREE.LineBasicMaterial({ color: 0x8c6239, transparent: true, opacity: 0.85 });
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x6e4b2a, roughness: 0.4, metalness: 0.15 });
      const hingeMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.3, metalness: 0.7 });

      const angleRad = THREE.MathUtils.degToRad(typeof doorOpenAngle === 'number' ? doorOpenAngle : 75);

      const createDoorLeaf = (pivotX, leafW, isLeftHinge) => {
        const pivot = new THREE.Group();
        pivot.position.set(pivotX, doorCenterY, hingeZ);

        // 문짝 패널
        const leafGeom = new THREE.BoxGeometry(leafW, openH - 4, doorT);
        const leafMesh = new THREE.Mesh(leafGeom, doorMat);
        const offsetX = isLeftHinge ? leafW / 2 : -leafW / 2;
        leafMesh.position.set(offsetX, 0, doorT / 2);
        pivot.add(leafMesh);

        const leafEdge = new THREE.LineSegments(new THREE.EdgesGeometry(leafGeom), doorEdgeMat);
        leafEdge.position.copy(leafMesh.position);
        pivot.add(leafEdge);

        // 문 손잡이 (열리는 쪽 가장자리)
        const handleH = Math.min(140, openH * 0.14);
        const handleGeom = new THREE.BoxGeometry(12, handleH, 20);
        const handleMesh = new THREE.Mesh(handleGeom, handleMat);
        const handleX = isLeftHinge ? Math.max(16, leafW - 26) : Math.min(-16, -leafW + 26);
        handleMesh.position.set(handleX, 0, doorT + 8);
        pivot.add(handleMesh);

        // 상/하단 경첩 표현
        [-openH * 0.34, openH * 0.34].forEach((hy) => {
          const hg = new THREE.BoxGeometry(14, 34, 14);
          const hm = new THREE.Mesh(hg, hingeMat);
          hm.position.set(isLeftHinge ? 6 : -6, hy, 2);
          pivot.add(hm);
        });

        // 개방 각도 회전 (좌측 경첩은 -Y 회전, 우측 경첩은 +Y 회전으로 앞쪽(+Z)을 향해 열림)
        pivot.rotation.y = isLeftHinge ? -angleRad : angleRad;
        cabinetGroup.add(pivot);
      };

      if (c.doorType === 'double') {
        const halfW = Math.max(40, openW / 2 - 3);
        createDoorLeaf(openLeftX + 1, halfW, true);
        createDoorLeaf(openRightX - 1, halfW, false);
      } else if (c.doorType === 'left') {
        createDoorLeaf(openLeftX + 1, Math.max(60, openW - 4), true);
      } else if (c.doorType === 'right') {
        createDoorLeaf(openRightX - 1, Math.max(60, openW - 4), false);
      }
    }

    if (showDeadzones) {
      const deadMat = new THREE.MeshBasicMaterial({
        color: 0xdc2626,
        transparent: true,
        opacity: 0.13,
        depthWrite: false
      });
      const deadEdgeMat = new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.45 });

      if (cabConst.leftDeadW > 0) {
        const dg = new THREE.BoxGeometry(cabConst.leftDeadW, H, D);
        const dm = new THREE.Mesh(dg, deadMat);
        dm.position.set(-W / 2 + cabConst.leftDeadW / 2, H / 2, 0);
        cabinetGroup.add(dm);
        const dl = new THREE.LineSegments(new THREE.EdgesGeometry(dg), deadEdgeMat);
        dl.position.copy(dm.position);
        cabinetGroup.add(dl);
      }

      if (cabConst.rightDeadW > 0) {
        const dg = new THREE.BoxGeometry(cabConst.rightDeadW, H, D);
        const dm = new THREE.Mesh(dg, deadMat);
        dm.position.set(W / 2 - cabConst.rightDeadW / 2, H / 2, 0);
        cabinetGroup.add(dm);
        const dl = new THREE.LineSegments(new THREE.EdgesGeometry(dg), deadEdgeMat);
        dl.position.copy(dm.position);
        cabinetGroup.add(dl);
      }
    }
  }

  function buildDrawerScene(spaceConfig) {
    const d = spaceConfig.drawer;
    const W = d.w, D = d.d, wallH = d.h;
    const drwConst = window.PackerEngine.getDrawerConstraints(spaceConfig);
    const clearH = drwConst.clearanceH;
    const exposedD = drwConst.exposedD;
    const unexposedD = drwConst.unexposedD;

    const chestWoodMat = new THREE.MeshStandardMaterial({
      color: 0xc8a47e,
      roughness: 0.65
    });
    const chestTopMat = new THREE.MeshStandardMaterial({
      color: 0xd2b08c,
      roughness: 0.55,
      transparent: true,
      opacity: xrayMode ? 0.2 : 0.42
    });
    const chestEdgeMat = new THREE.LineBasicMaterial({ color: 0x8c6d4e });

    const lowerBodyH = 346;
    const lowerGeom = new THREE.BoxGeometry(W + 52, lowerBodyH, D + 30);
    const lowerMesh = new THREE.Mesh(lowerGeom, chestWoodMat);
    lowerMesh.position.set(0, -14 - lowerBodyH / 2, -8);
    lowerMesh.castShadow = true;
    lowerMesh.receiveShadow = true;
    drawerStaticGroup.add(lowerMesh);
    const lowerLine = new THREE.LineSegments(new THREE.EdgesGeometry(lowerGeom), chestEdgeMat);
    lowerLine.position.copy(lowerMesh.position);
    drawerStaticGroup.add(lowerLine);

    const topCoverGeom = new THREE.BoxGeometry(W + 56, 20, D + 34);
    const topCoverMesh = new THREE.Mesh(topCoverGeom, chestTopMat);
    topCoverMesh.position.set(0, clearH + 10, -8);
    drawerStaticGroup.add(topCoverMesh);
    const topCoverLine = new THREE.LineSegments(new THREE.EdgesGeometry(topCoverGeom), chestEdgeMat);
    topCoverLine.position.copy(topCoverMesh.position);
    drawerStaticGroup.add(topCoverLine);

    const lintelGeom = new THREE.BoxGeometry(W + 52, 8, 8);
    const lintelMat = new THREE.MeshBasicMaterial({ color: 0xd97706 });
    const lintelMesh = new THREE.Mesh(lintelGeom, lintelMat);
    lintelMesh.position.set(0, clearH, D / 2);
    drawerStaticGroup.add(lintelMesh);

    const slideOffsetZ = drawerOpenRatio * exposedD;
    drawerSlidingGroup.position.set(0, 0, slideOffsetZ);

    const drawerWallMat = new THREE.MeshStandardMaterial({
      color: 0xe6d7c3,
      roughness: 0.55,
      transparent: true,
      opacity: xrayMode ? 0.3 : 0.85
    });
    const drawerEdgeMat = new THREE.LineBasicMaterial({ color: 0x9c8267 });
    const wallT = 14;

    const addDrawerPart = (pw, ph, pd, px, py, pz, matOverride) => {
      const g = new THREE.BoxGeometry(pw, ph, pd);
      const m = new THREE.Mesh(g, matOverride || drawerWallMat);
      m.position.set(px, py, pz);
      m.castShadow = true;
      m.receiveShadow = true;
      drawerSlidingGroup.add(m);
      const el = new THREE.LineSegments(new THREE.EdgesGeometry(g), drawerEdgeMat);
      el.position.copy(m.position);
      drawerSlidingGroup.add(el);
    };

    addDrawerPart(W + wallT * 2, wallT, D + wallT * 2, 0, -wallT / 2, 0);
    addDrawerPart(wallT, wallH, D, -W / 2 - wallT / 2, wallH / 2, 0);
    addDrawerPart(wallT, wallH, D, W / 2 + wallT / 2, wallH / 2, 0);
    addDrawerPart(W + wallT * 2, wallH, wallT, 0, wallH / 2, -D / 2 - wallT / 2);

    const frontPanelH = Math.max(wallH, Math.min(clearH - 4, wallH + 28));
    const frontPanelMat = new THREE.MeshStandardMaterial({
      color: 0xd2b08c,
      roughness: 0.5,
      transparent: true,
      opacity: xrayMode ? 0.25 : 0.72
    });
    addDrawerPart(W + 44, frontPanelH, 18, 0, frontPanelH / 2, D / 2 + 9, frontPanelMat);

    const handleW = Math.min(140, W * 0.32);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x6e5034, metalness: 0.2, roughness: 0.4 });
    addDrawerPart(handleW, 14, 22, 0, frontPanelH * 0.58, D / 2 + 26, handleMat);

    if (exposedD > 0) {
      const expGeom = new THREE.PlaneGeometry(W - 2, exposedD - 2);
      const expMat = new THREE.MeshBasicMaterial({
        color: 0x3b8a64,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide
      });
      const expMesh = new THREE.Mesh(expGeom, expMat);
      expMesh.rotation.x = -Math.PI / 2;
      expMesh.position.set(0, 0.6, -D / 2 + unexposedD + exposedD / 2);
      drawerSlidingGroup.add(expMesh);
    }

    if (unexposedD > 0) {
      const unexpGeom = new THREE.PlaneGeometry(W - 2, unexposedD - 2);
      const unexpMat = new THREE.MeshBasicMaterial({
        color: 0xd97706,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide
      });
      const unexpMesh = new THREE.Mesh(unexpGeom, unexpMat);
      unexpMesh.rotation.x = -Math.PI / 2;
      unexpMesh.position.set(0, 0.7, -D / 2 + unexposedD / 2);
      drawerSlidingGroup.add(unexpMesh);

      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-W / 2, 2, -D / 2 + unexposedD),
        new THREE.Vector3(W / 2, 2, -D / 2 + unexposedD)
      ]);
      const boundaryLine = new THREE.Line(
        lineGeom,
        new THREE.LineBasicMaterial({ color: 0xd97706, linewidth: 2 })
      );
      drawerSlidingGroup.add(boundaryLine);

      if (showDeadzones) {
        const unexpVolGeom = new THREE.BoxGeometry(W, clearH, unexposedD);
        const unexpVolMat = new THREE.MeshBasicMaterial({
          color: 0xd97706,
          transparent: true,
          opacity: 0.12,
          depthWrite: false
        });
        const unexpVol = new THREE.Mesh(unexpVolGeom, unexpVolMat);
        unexpVol.position.set(0, clearH / 2, -D / 2 + unexposedD / 2);
        drawerSlidingGroup.add(unexpVol);
      }
    }
  }

  // 배치된 수납함 렌더링 (자동 적층 높이 box.y 반영!)
  function buildPlacedBoxes(spaceConfig, placedBoxes, modelsMap) {
    const compartments = window.PackerEngine.getCompartments(spaceConfig);
    const W = spaceConfig.type === 'cabinet' ? spaceConfig.cabinet.w : spaceConfig.drawer.w;
    const D = spaceConfig.type === 'cabinet' ? spaceConfig.cabinet.d : spaceConfig.drawer.d;
    const isMultiBundle = selectedBoxIds.length >= 2;

    placedBoxes.forEach((box) => {
      const model = modelsMap[box.modelId];
      if (!model) return;

      const dims = window.PackerEngine.getOrientedDims(model, box.rot || 0);
      const comp = compartments[box.compartmentIndex] || compartments[0];
      const status = currentValidation.boxStatuses[box.id] || { severity: 'ok' };
      const isSelected = selectedBoxIds.includes(box.id);

      const meshGroup = buildStorageBoxMesh(
        model,
        box.rot || 0,
        status.severity,
        isSelected,
        isSelected && isMultiBundle,
        xrayMode
      );

      const centerX = -W / 2 + box.x + dims.w / 2;
      const centerZ = -D / 2 + box.z + dims.d / 2;
      const bottomY = comp.yStart + (box.y || 0); // 자동 적층된 Y 높이 반영

      meshGroup.position.set(centerX, bottomY, centerZ);
      meshGroup.userData = { boxId: box.id };

      meshGroup.traverse((child) => {
        if (child.isMesh) {
          child.userData = { boxId: box.id };
        }
      });

      boxesGroup.add(meshGroup);
    });

    if (isMultiBundle) {
      const selBoxes = placedBoxes.filter((b) => selectedBoxIds.includes(b.id));
      if (selBoxes.length >= 2) {
        const comp = compartments[selBoxes[0].compartmentIndex] || compartments[0];
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minY = Infinity, maxTopY = 0;
        selBoxes.forEach((b) => {
          const m = modelsMap[b.modelId];
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

        const bw = (maxX - minX) + 12;
        const bd = (maxZ - minZ) + 12;
        const bh = (maxTopY - minY) + 14;
        const bundleGeom = new THREE.BoxGeometry(bw, bh, bd);
        const bundleEdges = new THREE.EdgesGeometry(bundleGeom);
        const bundleLine = new THREE.LineSegments(
          bundleEdges,
          new THREE.LineBasicMaterial({ color: 0xd97706 })
        );
        bundleLine.position.set(
          -W / 2 + (minX + maxX) / 2,
          comp.yStart + minY + bh / 2,
          -D / 2 + (minZ + maxZ) / 2
        );
        boxesGroup.add(bundleLine);
      }
    }
  }

  function getPointerNDC(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function prepareGroupDrag(hitBoxId, planeY) {
    dragPlane.set(new THREE.Vector3(0, 1, 0), -planeY);
    const intersectPoint = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(dragPlane, intersectPoint)) return;

    dragAnchorBoxId = hitBoxId;
    dragStartWorldPoint.copy(intersectPoint);
    dragInitialPositions = {};

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minBaseY = Infinity;
    const activeIds = selectedBoxIds.includes(hitBoxId) ? selectedBoxIds : [hitBoxId];

    activeIds.forEach((id) => {
      const b = currentBoxes.find((item) => item.id === id);
      if (!b) return;
      if ((b.y || 0) < minBaseY) minBaseY = b.y || 0;
    });
    if (!isFinite(minBaseY)) minBaseY = 0;

    activeIds.forEach((id) => {
      const b = currentBoxes.find((item) => item.id === id);
      if (!b) return;
      const m = currentModelsMap[b.modelId];
      if (!m) return;
      const dims = window.PackerEngine.getOrientedDims(m, b.rot || 0);
      dragInitialPositions[id] = {
        x: b.x,
        z: b.z,
        relY: Math.max(0, (b.y || 0) - minBaseY),
        w: dims.w,
        d: dims.d
      };
      if (b.x < minX) minX = b.x;
      if (b.x + dims.w > maxX) maxX = b.x + dims.w;
      if (b.z < minZ) minZ = b.z;
      if (b.z + dims.d > maxZ) maxZ = b.z + dims.d;
    });

    dragBundleBounds = { minX, maxX, minZ, maxZ };
    isDragging = true;
    controls.enabled = false;
  }

  // 마우스 좌클릭 및 스마트폰 터치(pointerdown) 통합 처리
  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    pointerDownScreenPos = { x: event.clientX, y: event.clientY };
    hasDraggedBeyondThreshold = false;
    pendingUnbundleBoxId = null;
    tapBoxId = null;
    clickedEmptySpace = false;

    getPointerNDC(event);
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(boxesGroup.children, true);
    if (intersects.length > 0) {
      let hitBoxId = null;
      for (let i = 0; i < intersects.length; i++) {
        if (intersects[i].object.userData && intersects[i].object.userData.boxId) {
          hitBoxId = intersects[i].object.userData.boxId;
          break;
        }
      }

      if (hitBoxId) {
        const targetBox = currentBoxes.find((b) => b.id === hitBoxId);
        if (!targetBox) return;

        const compartments = window.PackerEngine.getCompartments(currentSpaceConfig);
        const comp = compartments[targetBox.compartmentIndex] || compartments[0];
        const planeY = comp.yStart;

        const isMultiTrigger = event.shiftKey || touchMultiSelectMode;

        if (isMultiTrigger) {
          if (onBoxInteractionCallback) {
            onBoxInteractionCallback(hitBoxId, { type: 'shift_toggle' });
          }
          if (selectedBoxIds.includes(hitBoxId)) {
            prepareGroupDrag(hitBoxId, planeY);
          }
        } else {
          if (selectedBoxIds.length >= 2 && selectedBoxIds.includes(hitBoxId)) {
            pendingUnbundleBoxId = hitBoxId;
            prepareGroupDrag(hitBoxId, planeY);
          } else {
            if (onBoxInteractionCallback) {
              onBoxInteractionCallback(hitBoxId, { type: 'normal_click' });
            }
            tapBoxId = hitBoxId;   // 손을 떼면 '자세히 보기'를 열지 판단
            prepareGroupDrag(hitBoxId, planeY);
          }
        }
        return;
      }
    }

    clickedEmptySpace = true;
  }

  // 드래그 시 수평(X, Z) 이동과 동시에 아래에 다른 수납함이 있으면 자동으로 위로 올라타도록(Auto-Stacking) 처리!
  function onPointerMove(event) {
    if (!isDragging || !dragAnchorBoxId || !currentSpaceConfig) return;

    const dist = Math.hypot(
      event.clientX - pointerDownScreenPos.x,
      event.clientY - pointerDownScreenPos.y
    );
    if (dist > 5) {
      hasDraggedBeyondThreshold = true;
      pendingUnbundleBoxId = null;
    }

    if (!hasDraggedBeyondThreshold) return;

    getPointerNDC(event);
    raycaster.setFromCamera(mouse, camera);

    const intersectPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane, intersectPoint)) {
      const W = currentSpaceConfig.type === 'cabinet' ? currentSpaceConfig.cabinet.w : currentSpaceConfig.drawer.w;
      const D = currentSpaceConfig.type === 'cabinet' ? currentSpaceConfig.cabinet.d : currentSpaceConfig.drawer.d;

      let deltaX = intersectPoint.x - dragStartWorldPoint.x;
      let deltaZ = intersectPoint.z - dragStartWorldPoint.z;

      const step = snapStep || 5;
      deltaX = Math.round(deltaX / step) * step;
      deltaZ = Math.round(deltaZ / step) * step;

      const minAllowedDeltaX = -dragBundleBounds.minX;
      const maxAllowedDeltaX = W - dragBundleBounds.maxX;
      const minAllowedDeltaZ = -dragBundleBounds.minZ;
      const maxAllowedDeltaZ = D - dragBundleBounds.maxZ;

      deltaX = Math.max(minAllowedDeltaX, Math.min(maxAllowedDeltaX, deltaX));
      deltaZ = Math.max(minAllowedDeltaZ, Math.min(maxAllowedDeltaZ, deltaZ));

      const movingIds = Object.keys(dragInitialPositions);

      // 1) 먼저 X, Z 좌표 갱신
      movingIds.forEach((id) => {
        const b = currentBoxes.find((item) => item.id === id);
        const initPos = dragInitialPositions[id];
        if (b && initPos) {
          b.x = Math.round(initPos.x + deltaX);
          b.z = Math.round(initPos.z + deltaZ);
        }
      });

      // 2) 아래에 다른(드래그 중이 아닌) 수납함이 있으면 자동으로 위로 올라타는 Y 높이 계산!
      let maxSupportY = 0;
      movingIds.forEach((id) => {
        const b = currentBoxes.find((item) => item.id === id);
        if (!b) return;
        const supportY = window.PackerEngine.computeStackingY(
          currentSpaceConfig,
          currentBoxes,
          b,
          currentModelsMap,
          movingIds
        );
        if (supportY > maxSupportY) maxSupportY = supportY;
      });

      movingIds.forEach((id) => {
        const b = currentBoxes.find((item) => item.id === id);
        const initPos = dragInitialPositions[id];
        if (b && initPos) {
          b.y = Math.round(maxSupportY + (initPos.relY || 0));
        }
      });

      if (onBoxesMovedCallback) onBoxesMovedCallback();
    }
  }

  function onPointerUp(event) {
    const dist = Math.hypot(
      (event.clientX || 0) - pointerDownScreenPos.x,
      (event.clientY || 0) - pointerDownScreenPos.y
    );

    if (isDragging) {
      isDragging = false;
      dragAnchorBoxId = null;
      if (controls) controls.enabled = true;

      // 끌지 않고 톡 누른 보관함 → 자세히 보기
      if (!hasDraggedBeyondThreshold && tapBoxId && dist < 6 && onBoxInteractionCallback) {
        onBoxInteractionCallback(tapBoxId, { type: 'open_detail' });
      }
      tapBoxId = null;
      if (!hasDraggedBeyondThreshold && pendingUnbundleBoxId && onBoxInteractionCallback) {
        onBoxInteractionCallback(pendingUnbundleBoxId, { type: 'unbundle_to_single' });
      }
      pendingUnbundleBoxId = null;
      return;
    }

    if (clickedEmptySpace && dist < 6 && !event.shiftKey) {
      if (onBoxInteractionCallback) {
        onBoxInteractionCallback(null, { type: 'clear_selection' });
      }
    }
    clickedEmptySpace = false;
  }

  function setCameraView(viewType) {
    if (!currentSpaceConfig || !camera || !controls) return;
    const W = currentSpaceConfig.type === 'cabinet' ? currentSpaceConfig.cabinet.w : currentSpaceConfig.drawer.w;
    const D = currentSpaceConfig.type === 'cabinet' ? currentSpaceConfig.cabinet.d : currentSpaceConfig.drawer.d;
    const H = currentSpaceConfig.type === 'cabinet' ? currentSpaceConfig.cabinet.h : currentSpaceConfig.drawer.h;
    const maxDim = Math.max(W, D, H, 600);

    controls.target.set(80, H * 0.46, 0);

    if (viewType === 'front') {
      camera.position.set(80, H * 0.48, maxDim * 2.0);
    } else if (viewType === 'top') {
      camera.position.set(0, maxDim * 2.1, 40);
    } else if (viewType === 'side') {
      camera.position.set(maxDim * 1.9, H * 0.48, 150);
    } else {
      camera.position.set(maxDim * 0.72, maxDim * 0.85, maxDim * 1.85);
    }
    controls.update();
  }

  // =========================================================================
  // 브랜드별 1:1 3D 겹쳐보기 비교 미니 뷰어
  // =========================================================================
  let cmpScene, cmpCamera, cmpRenderer, cmpControls, cmpGroup;
  let cmpAlignMode = 'corner';

  function initCompareViewer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    cmpScene = new THREE.Scene();
    cmpScene.background = new THREE.Color(0xefe6d8);
    const w = container.clientWidth || 520;
    const h = container.clientHeight || 280;

    cmpCamera = new THREE.PerspectiveCamera(40, w / h, 5, 5000);
    cmpCamera.position.set(420, 340, 480);

    cmpRenderer = new THREE.WebGLRenderer({ antialias: true });
    cmpRenderer.setSize(w, h);
    cmpRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    cmpRenderer.domElement.style.touchAction = 'none';
    container.innerHTML = '';
    container.appendChild(cmpRenderer.domElement);

    cmpControls = new THREE.OrbitControls(cmpCamera, cmpRenderer.domElement);
    cmpControls.enableDamping = true;

    cmpScene.add(new THREE.AmbientLight(0xfff8ef, 0.85));
    const dl = new THREE.DirectionalLight(0xfff1dc, 0.6);
    dl.position.set(300, 500, 400);
    cmpScene.add(dl);

    const grid = new THREE.GridHelper(600, 12, 0xb8966e, 0xd8c8b4);
    cmpScene.add(grid);

    cmpGroup = new THREE.Group();
    cmpScene.add(cmpGroup);

    const animateCmp = () => {
      requestAnimationFrame(animateCmp);
      if (cmpControls) cmpControls.update();
      if (cmpRenderer && cmpScene && cmpCamera) cmpRenderer.render(cmpScene, cmpCamera);
    };
    animateCmp();
  }

  function renderCompareModels(modelA, modelB, alignMode) {
    if (!cmpGroup) return;
    if (alignMode) cmpAlignMode = alignMode;
    clearGroup(cmpGroup);

    const buildOverlayMesh = (model, hexColor, wireColor, opacity) => {
      if (!model) return null;
      const wT = model.wTop, dT = model.dTop;
      const wB = model.shapeType === 'tapered' ? (model.wBot || wT) : wT;
      const dB = model.shapeType === 'tapered' ? (model.dBot || dT) : dT;
      const geom = createFrustumGeometry(wT, dT, wB, dB, model.h);

      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({
        color: hexColor,
        transparent: true,
        opacity: opacity,
        roughness: 0.3,
        depthWrite: false
      });
      g.add(new THREE.Mesh(geom, mat));

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geom),
        new THREE.LineBasicMaterial({ color: wireColor })
      );
      g.add(edges);

      if (cmpAlignMode === 'corner') {
        g.position.set(wT / 2 - 150, 0, dT / 2 - 150);
      } else {
        g.position.set(0, 0, 0);
      }
      return g;
    };

    const meshA = buildOverlayMesh(modelA, 0xb86b43, 0x8c4622, 0.48);
    const meshB = buildOverlayMesh(modelB, 0x3b8a64, 0x1f5c3f, 0.48);

    if (meshA) cmpGroup.add(meshA);
    if (meshB) cmpGroup.add(meshB);

    const maxH = Math.max(modelA ? modelA.h : 150, modelB ? modelB.h : 150);
    if (cmpControls) {
      cmpControls.target.set(0, maxH * 0.45, 0);
      cmpControls.update();
    }
  }

  return {
    init,
    renderScene,
    setCameraView,
    initCompareViewer,
    renderCompareModels,
    createFrustumGeometry,
    resize: () => {
      if (containerEl) onWindowResize(containerEl);
    }
  };
})();
