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
    // 다른 앱으로 가거나 창을 벗어나면 누르던 동작은 모두 취소
    window.addEventListener('blur', () => cancelGesture(true));
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelGesture(true); });

    // 3D 그리기(WebGL)가 끊기면 다시 이어 붙임 → 화면이 비거나 X 표시가 뜨는 문제 방지
    renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      contextLost = true;
      cancelGesture(true);
      setTimeout(() => {
        if (!contextLost) return;
        try { renderer.forceContextRestore(); } catch (err) {}
      }, 800);
      setTimeout(() => { if (contextLost) showReloadNotice(); }, 4000);
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      contextLost = false;
      hideReloadNotice();
      if (lastRenderArgs) renderScene.apply(null, lastRenderArgs);   // 상자·가구를 다시 그림
      if (containerEl) onWindowResize(containerEl);
    });
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
    if (renderer && scene && camera && !contextLost) {
      renderer.render(scene, camera);
      updateBundleFloatingPopupPosition();
      updateShelfCalloutAnchors();
    }
  }

  // 3D 가구의 각 선반 우측 모서리 지점을 2D 화면 좌표로 변환하여 선반 카드 리더라인(연결선)에 전달
  function updateShelfCalloutAnchors() {
    if (!onShelfAnchorsCallback || !currentSpaceConfig || !containerEl || !camera) return;
    const compartments = window.PackerEngine.getCompartments(currentSpaceConfig);
    const isPantry = currentSpaceConfig.type === 'pantry';

    const cw = containerEl.clientWidth;
    const ch = containerEl.clientHeight;

    const isDrawer = currentSpaceConfig.type === 'drawer';
    const exposedD = isDrawer ? window.PackerEngine.getDrawerConstraints(currentSpaceConfig).exposedD : 0;

    const anchors = compartments.map((comp) => {
      if (isDrawer) {
        const t = comp.tierIndex || comp.index || 0;
        const isTop = t === 0;
        const tierCenterY = isTop
          ? Math.min(45, comp.clearH * 0.25)
          : -14 - 8 - (t - 1) * (comp.clearH + 8) - (comp.clearH - 2) * 0.5;
        const edgeX = comp.ox + comp.w + (isTop ? 18 : 26);
        const edgeZ = isTop
          ? comp.oz + comp.d + drawerOpenRatio * exposedD * 0.45
          : -8 + (comp.d + 30) / 2 + 12;
        const v = new THREE.Vector3(edgeX, tierCenterY, edgeZ);
        v.project(camera);

        const cv = new THREE.Vector3(
          0,
          isTop ? comp.clearH * 0.35 : tierCenterY,
          isTop ? drawerOpenRatio * exposedD * 0.45 : -8 + (comp.d + 30) / 2 + 20
        );
        cv.project(camera);
        return {
          index: comp.index,
          name: comp.name,
          label: comp.short || String(comp.index + 1),
          x: (v.x * 0.5 + 0.5) * cw,
          y: (-(v.y * 0.5) + 0.5) * ch,
          cx: (cv.x * 0.5 + 0.5) * cw,
          cy: (-(cv.y * 0.5) + 0.5) * ch
        };
      }

      // 장·서랍: 오른쪽 바깥 / 팬트리: 각 칸 앞쪽 오른편 안
      const p = window.PackerEngine.localToWorld(comp, isPantry ? comp.w - 36 : comp.w + 18, comp.d);
      const worldX = p.x;
      const worldY = comp.yStart + Math.min(45, comp.clearH * 0.25);
      const worldZ = p.z;
      const v = new THREE.Vector3(worldX, worldY, worldZ);
      v.project(camera);

      const cp = window.PackerEngine.localToWorld(comp, comp.w * 0.5, comp.d * 0.65);
      const cv = new THREE.Vector3(cp.x, comp.yStart + comp.clearH * 0.4, cp.z);
      cv.project(camera);
      return {
        index: comp.index,
        name: comp.name,
        label: comp.short || String(comp.index + 1),
        x: (v.x * 0.5 + 0.5) * cw,
        y: (-(v.y * 0.5) + 0.5) * ch,
        cx: (cv.x * 0.5 + 0.5) * cw,
        cy: (-(cv.y * 0.5) + 0.5) * ch
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

    const bpos = window.PackerEngine.localToWorld(comp, (minX + maxX) / 2, (minZ + maxZ) / 2);
    const worldX = bpos.x;
    const worldY = comp.yStart + maxTopY + 30;
    const worldZ = bpos.z + slideZ;

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
  // 1~6단 서랍장: 아래 닫힌 서랍 칸들(tiers - 1개) + 받침 높이
  function drawerLowerBodyH(spaceConfig) {
    const d = (spaceConfig && spaceConfig.drawer) || {};
    const tiers = Math.min(6, Math.max(1, Math.round(Number(d.tiers) || 2)));
    const clearH = window.PackerEngine.getDrawerConstraints(spaceConfig).clearanceH;
    const closedTiers = Math.max(0, tiers - 1);
    return closedTiers * (clearH + 8) + 56;
  }

  function buildWarmHomeRoomEnvironment(spaceConfig) {
    const isCab = spaceConfig.type === 'cabinet';
    const isPantry = spaceConfig.type === 'pantry';
    const { W, D, H } = window.PackerEngine.getSpaceDims(spaceConfig);

    const floorY = isPantry ? -2 : isCab ? -46 : -14 - drawerLowerBodyH(spaceConfig);
    const backWallZ = isPantry ? -D / 2 - 2 : -D / 2 - 24;

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

  // ㄱ자 팬트리 방: 뒤 벽 선반 + 오른쪽 옆 벽 선반, 기둥(세로 기둥)으로 열을 나눔
  function buildPantryScene(spaceConfig) {
    const p = spaceConfig.pantry;
    const { bays, postsA, postsB, startB } = window.PackerEngine.getPantryBays(spaceConfig);
    const H = p.h;
    const postW = Math.max(6, Number(p.postW) || 25);

    const shelfMat = new THREE.MeshStandardMaterial({ color: 0xf6f1e8, roughness: 0.7 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0xe9e1d3, roughness: 0.6 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xb9a78f });
    const sideWallMat = new THREE.MeshStandardMaterial({ color: 0xeee6d8, roughness: 0.92 });
    const nearWallMat = new THREE.MeshStandardMaterial({
      color: 0xeee6d8, roughness: 0.92, transparent: true, opacity: 0.4, depthWrite: false
    });
    const wallEdgeMat = new THREE.LineBasicMaterial({ color: 0xb9a78f });

    const addPart = (w, h, d, x, y, z, rotY, mat) => {
      const g = new THREE.BoxGeometry(w, h, d);
      const m = new THREE.Mesh(g, mat);
      m.position.set(x, y, z);
      m.rotation.y = rotY || 0;
      m.castShadow = true;
      m.receiveShadow = true;
      cabinetGroup.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat);
      e.position.copy(m.position);
      e.rotation.y = m.rotation.y;
      cabinetGroup.add(e);
      return m;
    };

    // 방 양옆 벽: 선반이 벽에 딱 붙어 보이게
    // - 옆 선반 쪽 벽은 불투명, 입구 쪽 벽은 보는 쪽이라 거의 투명
    {
      const wallHgt = Math.max(2400, H + 300);
      const rightX = p.roomW / 2 + 12, leftX = -p.roomW / 2 - 12;
      const bOnLeft = p.doorSide === 'right';
      const bWall = new THREE.Mesh(new THREE.BoxGeometry(24, wallHgt, p.roomD + 24), p.wallB === false ? nearWallMat : sideWallMat);
      bWall.position.set(bOnLeft ? leftX : rightX, wallHgt / 2 - 2, -12);
      bWall.receiveShadow = true;
      roomEnvGroup.add(bWall);
      const nWall = new THREE.Mesh(new THREE.BoxGeometry(24, wallHgt, p.roomD + 24), nearWallMat);
      nWall.position.set(bOnLeft ? rightX : leftX, wallHgt / 2 - 2, -12);
      roomEnvGroup.add(nWall);
      // 벽과 바닥·뒷벽이 만나는 선: 선반이 벽에 붙은 게 잘 보이게
      [bOnLeft ? -p.roomW / 2 : p.roomW / 2, bOnLeft ? p.roomW / 2 : -p.roomW / 2].forEach((wx) => {
        const seam = new THREE.LineSegments(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(wx, 0.5, -p.roomD / 2), new THREE.Vector3(wx, 0.5, p.roomD / 2),
            new THREE.Vector3(wx, 0, -p.roomD / 2), new THREE.Vector3(wx, wallHgt, -p.roomD / 2)
          ]),
          wallEdgeMat
        );
        roomEnvGroup.add(seam);
      });
    }

    // 선반 판: 칸(열)마다
    bays.forEach((b) => {
      const comp0 = { ox: b.ox, oz: b.oz, rotY: b.rotY };
      b.shelves.forEach((sh) => {
        const t = sh.thickness || 18;
        const c = window.PackerEngine.localToWorld(comp0, b.w / 2, b.d / 2);
        addPart(b.w, t, b.d, c.x, sh.bottomY + t / 2, c.z, b.rotY, shelfMat);
      });
    });

    // 세로 기둥: 벽마다 시작·끝·중간 기둥 위치
    const leftSide = p.doorSide === 'right';
    const wallPoint = (wall, s, dd) => {
      if (wall === 'A') return { x: -p.roomW / 2 + s, z: -p.roomD / 2 + dd };
      return leftSide ? { x: -p.roomW / 2 + dd, z: -p.roomD / 2 + s } : { x: p.roomW / 2 - dd, z: -p.roomD / 2 + s };
    };
    const postAt = (wall, s) => {
      const d = wall === 'A' ? p.depthA : p.depthB;
      const front = wallPoint(wall, s, d - postW / 2);
      addPart(postW, H, postW, front.x, H / 2, front.z, 0, postMat);
      const back = wallPoint(wall, s, postW / 2);
      addPart(postW, H, postW, back.x, H / 2, back.z, 0, postMat);
    };
    [postW / 2, ...postsA, p.roomW - postW / 2].forEach((s) => postAt('A', s));
    if (p.wallB !== false) [startB + postW / 2, ...postsB, p.roomD - postW / 2].forEach((s) => postAt('B', s));

    // 구석 (옆 선반에 막혀 꺼내기 힘든 곳): 주황색으로 옅게
    const corner = window.PackerEngine.getPantryCorner(spaceConfig);
    if (corner && showDeadzones) {
      const cw = corner.s1 - corner.s0;
      const cornerVol = new THREE.Mesh(
        new THREE.BoxGeometry(cw, H, p.depthA),
        new THREE.MeshBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.2, depthWrite: false })
      );
      cornerVol.position.set(-p.roomW / 2 + corner.s0 + cw / 2, H / 2, -p.roomD / 2 + p.depthA / 2);
      cabinetGroup.add(cornerVol);
    }

    // 맨 아래 빈칸 (쌀통·생수·청소기 자리): 바닥에 옅은 표시
    if (p.keepFloor) {
      bays.forEach((b) => {
        const topY = b.shelves.length ? b.shelves[0].bottomY : H;
        const c = window.PackerEngine.localToWorld({ ox: b.ox, oz: b.oz, rotY: b.rotY }, b.w / 2, b.d / 2);
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(b.w - 4, topY, b.d - 4),
          new THREE.MeshBasicMaterial({ color: 0x8a9a7b, transparent: true, opacity: 0.08, depthWrite: false })
        );
        m.position.set(c.x, topY / 2, c.z);
        m.rotation.y = b.rotY;
        cabinetGroup.add(m);
      });
    }

    // 손 닿는 높이 선 (1800mm): 이보다 위는 의자가 필요해요
    const reachY = 1800;
    if (H > reachY + 50) {
      const pts = [];
      const fA0 = wallPoint('A', 0, p.depthA + 2), fA1 = wallPoint('A', p.roomW, p.depthA + 2);
      pts.push(new THREE.Vector3(fA0.x, reachY, fA0.z), new THREE.Vector3(fA1.x, reachY, fA1.z));
      if (p.wallB !== false) {
        const fB0 = wallPoint('B', startB, p.depthB + 2), fB1 = wallPoint('B', p.roomD, p.depthB + 2);
        pts.push(new THREE.Vector3(fB0.x, reachY, fB0.z), new THREE.Vector3(fB1.x, reachY, fB1.z));
      }
      const reachLine = new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineDashedMaterial({ color: 0x5c7fa3, dashSize: 40, gapSize: 25 })
      );
      reachLine.computeLineDistances();
      cabinetGroup.add(reachLine);
      // 글자 표시
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 96;
      const g = cv.getContext('2d');
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.fillRect(0, 0, 512, 96);
      g.fillStyle = '#3f5f80';
      g.font = '600 40px Pretendard, sans-serif';
      g.textBaseline = 'middle';
      g.fillText('손 닿는 높이 1800', 20, 48);
      const tex = new THREE.CanvasTexture(cv);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
      label.scale.set(360, 68, 1);
      const lp = wallPoint('A', leftSide ? p.roomW - 220 : 220, p.depthA + 10);
      label.position.set(lp.x, reachY + 50, lp.z);
      cabinetGroup.add(label);
    }

    // 걷는 길이 좁으면 바닥에 붉게 표시 (600mm 미만)
    const walk = window.PackerEngine.getPantryWalkway(spaceConfig);
    if (!walk.ok) {
      const wz0 = -p.roomD / 2 + p.depthA;
      const wx0 = leftSide ? -p.roomW / 2 + (p.wallB === false ? 0 : p.depthB) : -p.roomW / 2;
      const wx1 = leftSide ? p.roomW / 2 : p.roomW / 2 - (p.wallB === false ? 0 : p.depthB);
      const floorWarn = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(10, wx1 - wx0), 2, Math.max(10, p.roomD / 2 - wz0)),
        new THREE.MeshBasicMaterial({ color: 0xc2410c, transparent: true, opacity: 0.16, depthWrite: false })
      );
      floorWarn.position.set((wx0 + wx1) / 2, 2, (wz0 + p.roomD / 2) / 2);
      cabinetGroup.add(floorWarn);
    }

    // 바닥에 입구 표시 (입구 쪽 앞)
    const doorW = Math.max(300, Math.min(p.doorW || 800, p.roomW - p.depthB - 50));
    const doorLine = new THREE.Mesh(
      new THREE.BoxGeometry(doorW, 2, 30),
      new THREE.MeshBasicMaterial({ color: 0xb08d63, transparent: true, opacity: 0.5 })
    );
    const doorX = leftSide ? p.roomW / 2 - doorW / 2 - 40 : -p.roomW / 2 + doorW / 2 + 40;
    doorLine.position.set(doorX, 1, p.roomD / 2 - 15);
    cabinetGroup.add(doorLine);

    // 출입문 틀은 그리지 않음 (바닥 표시선 + 글자만)

    // 바닥 글자: 문 표시선 바로 안쪽에 '팬트리 출입문'
    {
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 128;
      const g = cv.getContext('2d');
      g.clearRect(0, 0, 512, 128);
      g.fillStyle = 'rgba(255, 252, 246, 0.92)';
      const r = 28;
      g.beginPath();
      g.moveTo(r, 8); g.arcTo(504, 8, 504, 120, r); g.arcTo(504, 120, 8, 120, r); g.arcTo(8, 120, 8, 8, r); g.arcTo(8, 8, 504, 8, r);
      g.closePath(); g.fill();
      g.fillStyle = '#7d6244';
      g.font = '700 54px Pretendard, -apple-system, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('팬트리 출입문', 256, 66);
      const tex = new THREE.CanvasTexture(cv);
      const labelW = Math.min(doorW * 0.9, 520);
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(labelW, labelW / 4),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
      );
      label.rotation.x = -Math.PI / 2;              // 바닥에 눕힘, 입구에서 읽히는 방향
      label.position.set(doorX, 3, p.roomD / 2 - 40 - labelW / 8);
      cabinetGroup.add(label);
    }
  }

  function renderScene(spaceConfig, placedBoxes, modelsMap, stateOpts) {
    lastRenderArgs = [spaceConfig, placedBoxes, modelsMap, stateOpts];
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
    } else if (spaceConfig.type === 'pantry') {
      buildPantryScene(spaceConfig);
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
        opacity: 0.22,
        depthWrite: false
      });
      const deadEdgeMat = new THREE.LineBasicMaterial({ color: 0xdc2626, transparent: true, opacity: 0.8 });

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
    const tiers = Math.min(6, Math.max(1, Math.round(Number(d.tiers) || 2)));
    const W = d.w, D = d.d;
    const drwConst = window.PackerEngine.getDrawerConstraints(spaceConfig);
    const clearH = drwConst.clearanceH;
    const exposedD = drwConst.exposedD;
    const unexposedD = drwConst.unexposedD;
    // 서랍 벽 높이는 '넣을 수 있는 높이'를 따라가요 (높이를 올리면 벽·앞판도 같이 올라감)
    const wallH = Math.max(40, clearH - 8);
    const tierH = clearH; // 한 단 높이

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

    const lowerBodyH = drawerLowerBodyH(spaceConfig);
    const lowerGeom = new THREE.BoxGeometry(W + 52, lowerBodyH, D + 30);
    const lowerMesh = new THREE.Mesh(lowerGeom, chestWoodMat);
    lowerMesh.position.set(0, -14 - lowerBodyH / 2, -8);
    lowerMesh.castShadow = true;
    lowerMesh.receiveShadow = true;
    drawerStaticGroup.add(lowerMesh);
    const lowerLine = new THREE.LineSegments(new THREE.EdgesGeometry(lowerGeom), chestEdgeMat);
    lowerLine.position.copy(lowerMesh.position);
    drawerStaticGroup.add(lowerLine);

    // 아래 단들: 닫혀 있는 서랍 칸 (tiers - 1개, 앞판 + 손잡이). 맨 위 칸(1단)만 열려요
    const closedTiers = Math.max(0, tiers - 1);
    const lowFrontH = Math.max(40, clearH - 2);
    const lowFrontZ = -8 + (D + 30) / 2 + 9;
    const lowFrontMat = new THREE.MeshStandardMaterial({ color: 0xd2b08c, roughness: 0.5 });
    const lowHandleMat = new THREE.MeshStandardMaterial({ color: 0x6e5034, metalness: 0.2, roughness: 0.4 });
    const lowHandleGeom = new THREE.BoxGeometry(Math.min(140, W * 0.32), 14, 22);
    for (let i = 0; i < closedTiers; i++) {
      const lowFrontY = -14 - 8 - i * (clearH + 8) - lowFrontH / 2;
      const lowFrontGeom = new THREE.BoxGeometry(W + 44, lowFrontH, 18);
      const lowFront = new THREE.Mesh(lowFrontGeom, lowFrontMat);
      lowFront.position.set(0, lowFrontY, lowFrontZ);
      lowFront.castShadow = true;
      drawerStaticGroup.add(lowFront);
      const lowFrontLine = new THREE.LineSegments(new THREE.EdgesGeometry(lowFrontGeom), chestEdgeMat);
      lowFrontLine.position.copy(lowFront.position);
      drawerStaticGroup.add(lowFrontLine);

      const lowHandle = new THREE.Mesh(lowHandleGeom, lowHandleMat);
      lowHandle.position.set(0, lowFrontY + lowFrontH * 0.08, lowFrontZ + 17);
      drawerStaticGroup.add(lowHandle);
    }

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

    // 서랍장 몸통의 옆판·뒤판 (반투명): 서랍 칸이 옆으로 뚫려 보이지 않게
    const chestSideMat = new THREE.MeshStandardMaterial({
      color: 0xd2b08c,
      roughness: 0.6,
      transparent: true,
      opacity: xrayMode ? 0.12 : 0.3,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const sideT = 12;
    const chestInnerHalf = (W + 52) / 2;
    const addChestPart = (pw, ph, pd, px, py, pz) => {
      const g = new THREE.BoxGeometry(pw, ph, pd);
      const m = new THREE.Mesh(g, chestSideMat);
      m.position.set(px, py, pz);
      m.renderOrder = 1;
      drawerStaticGroup.add(m);
      const el = new THREE.LineSegments(new THREE.EdgesGeometry(g), chestEdgeMat);
      el.position.copy(m.position);
      drawerStaticGroup.add(el);
    };
    addChestPart(sideT, clearH + 14, D + 30, -chestInnerHalf + sideT / 2, (clearH - 14) / 2, -8);
    addChestPart(sideT, clearH + 14, D + 30, chestInnerHalf - sideT / 2, (clearH - 14) / 2, -8);
    addChestPart(W + 52, clearH + 14, sideT, 0, (clearH - 14) / 2, -8 - (D + 30) / 2 + sideT / 2);

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

    // 앞판(손잡이 쪽 벽)도 높이를 따라 올라가요
    const frontPanelH = Math.max(wallH, clearH - 2);
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

    if (unexposedD > 0 && showDeadzones) {
      const unexpGeom = new THREE.PlaneGeometry(W - 2, unexposedD - 2);
      const unexpMat = new THREE.MeshBasicMaterial({
        color: 0xdc2626,
        transparent: true,
        opacity: 0.32,
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
        new THREE.LineBasicMaterial({ color: 0xdc2626, linewidth: 2 })
      );
      drawerSlidingGroup.add(boundaryLine);

      if (showDeadzones) {
        const unexpVolGeom = new THREE.BoxGeometry(W, clearH, unexposedD);
        const unexpVolMat = new THREE.MeshBasicMaterial({
          color: 0xdc2626,
          transparent: true,
          opacity: 0.2,
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
    const isMultiBundle = selectedBoxIds.length >= 2;
    const activeDrawerTier = Math.min(compartments.length - 1, Math.max(0, activeCompartmentIdx || 0));
    const visibleBoxes = spaceConfig.type === 'drawer'
      ? placedBoxes.filter((b) => (b.compartmentIndex || 0) === activeDrawerTier)
      : placedBoxes;

    visibleBoxes.forEach((box) => {
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

      const wp = window.PackerEngine.localToWorld(comp, box.x + dims.w / 2, box.z + dims.d / 2);
      const bottomY = comp.yStart + (box.y || 0); // 자동 적층된 Y 높이 반영

      meshGroup.position.set(wp.x, bottomY, wp.z);
      meshGroup.rotation.y += comp.rotY || 0;   // 팬트리 옆 벽은 90도 돌아가 있음
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
        const bp = window.PackerEngine.localToWorld(comp, (minX + maxX) / 2, (minZ + maxZ) / 2);
        bundleLine.position.set(bp.x, comp.yStart + minY + bh / 2, bp.z);
        bundleLine.rotation.y = comp.rotY || 0;
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
  const HOLD_MS = 380;              // 이만큼 꾹 누르면 옮기기 시작
  let holdTimer = null, holdPending = false, selectOnlyPending = false, holdStart = null;
  let gesturePointerId = null;      // 지금 동작을 시작한 손가락
  const activePointers = new Set(); // 화면에 닿아 있는 손가락들
  let contextLost = false, lastRenderArgs = null;

  // 누르던 동작을 모두 깨끗이 취소 (두 손가락, 창 벗어남, 3D 끊김 등)
  function cancelGesture(clearPointers) {
    clearTimeout(holdTimer);
    holdPending = false;
    selectOnlyPending = false;
    tapBoxId = null;
    pendingUnbundleBoxId = null;
    clickedEmptySpace = false;
    if (isDragging) {
      isDragging = false;
      dragAnchorBoxId = null;
      if (onBoxesMovedCallback) onBoxesMovedCallback();
    }
    if (controls) controls.enabled = true;
    if (gesturePointerId !== null && renderer) {
      try { renderer.domElement.releasePointerCapture(gesturePointerId); } catch (e) {}
    }
    gesturePointerId = null;
    if (clearPointers) activePointers.clear();
  }

  function showReloadNotice() {
    if (!containerEl || containerEl.querySelector('.gl-lost')) return;
    const n = document.createElement('div');
    n.className = 'gl-lost';
    n.innerHTML = '<div class="gl-lost-card"><div class="gl-lost-t">3D 화면이 잠깐 끊겼어요</div><div class="gl-lost-s">놓은 상자는 저장돼 있어요.</div><button type="button" class="gl-lost-btn">다시 불러오기</button></div>';
    n.querySelector('button').addEventListener('click', () => window.location.reload());
    containerEl.appendChild(n);
  }
  function hideReloadNotice() {
    const n = containerEl && containerEl.querySelector('.gl-lost');
    if (n) n.remove();
  }

  function onPointerDown(event) {
    activePointers.add(event.pointerId);
    // 두 번째 손가락이 닿으면 (크게·작게 보기) 상자 동작은 취소하고 화면 조작만
    if (activePointers.size > 1) {
      cancelGesture(false);
      return;
    }
    gesturePointerId = event.pointerId;
    try { renderer.domElement.setPointerCapture(event.pointerId); } catch (e) {}
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
          } else if (selectedBoxIds.length === 1 && selectedBoxIds[0] === hitBoxId) {
            // 이미 고른 상자: 톡 = 안 채우기(자세히 보기), 꾹 누른 채 끌기 = 옮기기
            tapBoxId = hitBoxId;
            holdPending = true;
            holdStart = { boxId: hitBoxId, planeY };
            controls.enabled = false;
            clearTimeout(holdTimer);
            holdTimer = setTimeout(() => {
              if (!holdPending) return;
              holdPending = false;
              tapBoxId = null;                 // 꾹 누른 뒤에는 자세히 보기를 열지 않음
              prepareGroupDrag(hitBoxId, planeY);
              hasDraggedBeyondThreshold = false;
              if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
              if (onBoxInteractionCallback) onBoxInteractionCallback(hitBoxId, { type: 'drag_ready' });
            }, HOLD_MS);
          } else {
            // 처음 누른 상자: 고르기만
            if (onBoxInteractionCallback) {
              onBoxInteractionCallback(hitBoxId, { type: 'normal_click' });
            }
            selectOnlyPending = true;
            controls.enabled = false;
          }
        }
        return;
      }
    }

    clickedEmptySpace = true;
  }

  // 드래그 시 수평(X, Z) 이동과 동시에 아래에 다른 수납함이 있으면 자동으로 위로 올라타도록(Auto-Stacking) 처리!
  function onPointerMove(event) {
    if (gesturePointerId !== null && event.pointerId !== gesturePointerId) return;
    // 꾹 누르기 전에 손가락이 움직이면 옮기기 취소 (화면 돌리기도 안 함)
    if (holdPending && pointerDownScreenPos) {
      const d0 = Math.hypot(event.clientX - pointerDownScreenPos.x, event.clientY - pointerDownScreenPos.y);
      if (d0 > 8 && event.pointerType === 'mouse' && holdStart) {
        // 마우스는 기다리지 않음: 고른 상자를 누른 채 끌면 바로 옮기기
        holdPending = false;
        clearTimeout(holdTimer);
        tapBoxId = null;
        prepareGroupDrag(holdStart.boxId, holdStart.planeY);
        hasDraggedBeyondThreshold = true;
      } else if (d0 > 8) { holdPending = false; clearTimeout(holdTimer); tapBoxId = null; if (controls) controls.enabled = true; }
    }
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
      const anchorBox = currentBoxes.find((item) => item.id === dragAnchorBoxId);
      const dragComps = window.PackerEngine.getCompartments(currentSpaceConfig);
      const dragComp = (anchorBox && dragComps[anchorBox.compartmentIndex]) || dragComps[0];
      const W = dragComp.w;
      const D = dragComp.d;

      // 화면에서 끈 만큼을 칸 안의 방향으로 바꿈 (팬트리 옆 벽은 돌아가 있음)
      const loc = window.PackerEngine.worldDeltaToLocal(
        dragComp,
        intersectPoint.x - dragStartWorldPoint.x,
        intersectPoint.z - dragStartWorldPoint.z
      );
      let deltaX = loc.x;
      let deltaZ = loc.z;

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
    activePointers.delete(event.pointerId);
    // 이 동작을 시작한 손가락이 아니면 무시 (두 손가락 조작 중 한 손가락만 뗀 경우 등)
    if (gesturePointerId === null || event.pointerId !== gesturePointerId) return;
    try { renderer.domElement.releasePointerCapture(event.pointerId); } catch (e) {}
    gesturePointerId = null;
    if (event.type === 'pointercancel') { cancelGesture(false); return; }

    const dist = Math.hypot(
      (event.clientX || 0) - pointerDownScreenPos.x,
      (event.clientY || 0) - pointerDownScreenPos.y
    );

    // 처음 고른 상자: 고르기만 하고 끝
    if (selectOnlyPending) {
      selectOnlyPending = false;
      if (controls) controls.enabled = true;
      return;
    }

    // 고른 상자를 다시 톡: 안 채우기(자세히 보기)
    if (holdPending || (!isDragging && tapBoxId)) {
      const wasTap = holdPending && dist < 8;
      holdPending = false;
      clearTimeout(holdTimer);
      if (controls) controls.enabled = true;
      if (wasTap && tapBoxId && onBoxInteractionCallback) {
        onBoxInteractionCallback(tapBoxId, { type: 'open_detail' });
      }
      tapBoxId = null;
      return;
    }

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
    const { W, D, H } = window.PackerEngine.getSpaceDims(currentSpaceConfig);
    const lowerH = currentSpaceConfig.type === 'drawer' ? drawerLowerBodyH(currentSpaceConfig) : 0;
    const maxDim = Math.max(W, D, H + lowerH * 0.85, 600);

    if (currentSpaceConfig.type === 'pantry') {
      // 팬트리: 입구(왼쪽 앞)에서 안쪽 구석을 비스듬히 내려다봄
      const mir = currentSpaceConfig.pantry && currentSpaceConfig.pantry.doorSide === 'right' ? -1 : 1;
      controls.target.set(mir * W * 0.12, H * 0.45, -D * 0.1);
      camera.position.set(-mir * W * 0.9, H * 1.1, D * 1.4 + 2400);
      controls.update();
      return;
    }

    const targetY = currentSpaceConfig.type === 'drawer' ? H * 0.46 - Math.max(0, lowerH - 240) * 0.28 : H * 0.46;
    controls.target.set(80, targetY, 0);

    if (viewType === 'front') {
      camera.position.set(80, targetY, maxDim * 2.0);
    } else if (viewType === 'top') {
      camera.position.set(0, maxDim * 2.1, 40);
    } else if (viewType === 'side') {
      camera.position.set(maxDim * 1.9, targetY, 150);
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
    },
    // 지금 3D 화면을 그림(dataURL)으로 (바로 다시 그린 뒤 읽어서 빈 그림이 안 나와요)
    snapshot: () => {
      if (!renderer || !scene || !camera) return null;
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    }
  };
})();
