// 3D 공간 구획 계산, 자동 적층(Auto-Stacking), 충돌/간섭 검증(문설주·경첩·서랍 미노출 구간), 자동 채우기 엔진

window.PackerEngine = (function () {
  // 0. 가구 전체 크기 (가로 W, 깊이 D, 높이 H)
  function getSpaceDims(spaceConfig) {
    if (spaceConfig.type === 'fridge') {
      const f = spaceConfig.fridge;
      return { W: f.w, D: f.d, H: f.h };
    }
    if (spaceConfig.type === 'pantry') {
      const p = spaceConfig.pantry;
      return { W: p.roomW, D: p.roomD, H: p.h };
    }
    if (spaceConfig.type === 'drawer') {
      const d = spaceConfig.drawer;
      return { W: d.w, D: d.d, H: d.h };
    }
    const c = spaceConfig.cabinet;
    return { W: c.w, D: c.d, H: c.h };
  }

  // 0-1. ㄱ자 팬트리: 기둥으로 나뉜 열(bay) 목록
  // - 'A' = 안쪽(뒤) 벽: 방 왼쪽 끝부터 오른쪽으로
  // - 'B' = 오른쪽 옆 벽: 안쪽 구석(뒤 선반 끝)부터 입구 쪽으로
  // 좌표: 방 가운데가 (0,0). 뒤 벽 면은 z = -roomD/2, 오른쪽 벽 면은 x = +roomW/2
  function getPantryBays(spaceConfig) {
    const p = spaceConfig.pantry;
    const postW = Math.max(0, Number(p.postW) || 0);
    const bays = [];
    const makeWall = (wall, length, posts, startAt) => {
      const pts = [...(posts || [])].map(Number).filter((v) => v > startAt && v < length).sort((a, b) => a - b);
      const edges = [startAt, ...pts, length];
      for (let i = 0; i < edges.length - 1; i++) {
        const s0 = edges[i] + (i === 0 ? 0 : postW / 2);
        const s1 = edges[i + 1] - (i === edges.length - 2 ? 0 : postW / 2);
        if (s1 - s0 < 40) continue;
        bays.push({ wall, col: i, key: `${wall}${i}`, s0, s1, w: s1 - s0 });
      }
      return pts;
    };
    const postsA = makeWall('A', p.roomW, p.postsA, 0);
    const startB = Math.min(p.roomD - 100, p.depthA);
    const postsB = p.wallB === false ? [] : makeWall('B', p.roomD, p.postsB, startB);
    if (p.wallB === false) {
      for (let i = bays.length - 1; i >= 0; i--) if (bays[i].wall === 'B') bays.splice(i, 1);
    }
    bays.forEach((b) => {
      const leftSide = p.doorSide === 'right';   // 입구가 오른쪽이면 옆 선반은 왼쪽 벽
      if (b.wall === 'A') {
        b.d = p.depthA;
        b.ox = -p.roomW / 2 + b.s0;
        b.oz = -p.roomD / 2;
        b.rotY = 0;
      } else if (leftSide) {
        // 왼쪽 벽: 칸 안 x는 입구 쪽 끝에서 안쪽 구석으로
        b.d = p.depthB;
        b.ox = -p.roomW / 2;
        b.oz = -p.roomD / 2 + b.s1;
        b.rotY = Math.PI / 2;
      } else {
        b.d = p.depthB;
        b.ox = p.roomW / 2;
        b.oz = -p.roomD / 2 + b.s0;
        b.rotY = -Math.PI / 2;
      }
      const sh = (p.bayShelves && p.bayShelves[b.key]) || p.defaultShelves || [];
      b.shelves = [...sh].sort((x, y) => x.bottomY - y.bottomY);
    });
    return { bays, postsA, postsB, startB };
  }

  // 0-2. 팬트리 구석: 안쪽 벽 선반 중 옆 선반에 막혀 손이 잘 안 닿는 구간 (안쪽 벽 왼쪽 끝 기준 mm)
  function getPantryCorner(spaceConfig) {
    const p = spaceConfig.pantry;
    if (!p || p.wallB === false) return null;
    return p.doorSide === 'right' ? { s0: 0, s1: p.depthB } : { s0: p.roomW - p.depthB, s1: p.roomW };
  }

  // 0-3. 팬트리 걷는 길 폭: 안쪽 선반 앞 · 옆 선반 앞
  function getPantryWalkway(spaceConfig) {
    const p = spaceConfig.pantry;
    const front = p.roomD - p.depthA;                          // 안쪽 선반 앞에서 입구까지
    const side = p.wallB === false ? p.roomW : p.roomW - p.depthB; // 옆 선반 앞에서 맞은편 벽까지
    return { front, side, min: Math.min(front, side), ok: Math.min(front, side) >= 600 };
  }

  // 0-4. 냉장고: 바깥 크기(가로·깊이·높이)에서 안쪽 칸(냉장실·냉동실)을 나눔
  // - 'side' 양문형: 왼쪽 냉동실 · 오른쪽 냉장실
  // - 'four' 4도어: 위 냉장실 · 아래 냉동실 왼쪽/오른쪽
  // - 'two'  2도어: 위 냉동실 · 아래 냉장실
  // 안쪽 치수는 실제 제품 평균에 맞춘 추정값 (벽·문 포켓 두께를 빼서 계산)
  const FRIDGE_PARTS = { wall: 40, top: 50, base: 70, back: 60, door: 70, pocket: 150, divider: 50, glass: 6 };
  function getFridgeLayout(spaceConfig) {
    const f = spaceConfig.fridge;
    const P = FRIDGE_PARTS;
    const IW = Math.max(200, f.w - P.wall * 2);
    const IH = Math.max(300, f.h - P.top - P.base);
    const bodyD = Math.max(300, f.d - P.door);
    const innerD = Math.max(200, bodyD - P.back - P.pocket);
    const div = P.divider;
    let zones;
    if (f.doorType === 'four') {
      const topH = Math.round((IH - div) * 0.6);
      const botH = IH - div - topH;
      const bw = Math.round((IW - div) / 2);
      zones = [
        { key: 'rf', kind: 'fridge', label: '냉장실', x0: 0, y0: botH + div, w: IW, h: topH },
        { key: 'fzL', kind: 'freezer', label: '냉동실 왼쪽', x0: 0, y0: 0, w: bw, h: botH },
        { key: 'fzR', kind: 'freezer', label: '냉동실 오른쪽', x0: bw + div, y0: 0, w: IW - bw - div, h: botH }
      ];
    } else if (f.doorType === 'two') {
      const fzH = Math.round((IH - div) * 0.3);
      const rfH = IH - div - fzH;
      zones = [
        { key: 'rf', kind: 'fridge', label: '냉장실', x0: 0, y0: 0, w: IW, h: rfH },
        { key: 'fz', kind: 'freezer', label: '냉동실', x0: 0, y0: rfH + div, w: IW, h: fzH }
      ];
    } else {
      const fw = Math.round((IW - div) * 0.42);
      zones = [
        { key: 'rf', kind: 'fridge', label: '냉장실', x0: fw + div, y0: 0, w: IW - fw - div, h: IH },
        { key: 'fz', kind: 'freezer', label: '냉동실', x0: 0, y0: 0, w: fw, h: IH }
      ];
    }
    zones.forEach((z) => {
      const n = Math.max(0, Math.round(Number(z.kind === 'fridge' ? f.shelvesFridge : f.shelvesFreezer) || 0));
      z.shelfCount = n;
      z.clear = Math.max(20, Math.floor((z.h - n * P.glass) / (n + 1)));
      z.ox = -f.w / 2 + P.wall + z.x0;          // 칸 왼쪽 끝 (방 좌표)
      z.oz = -f.d / 2 + P.back;                 // 칸 뒤쪽 끝
      z.yBase = P.base + z.y0;                  // 칸 바닥 높이
      z.d = innerD;
    });
    return { zones, IW, IH, bodyD, innerD, parts: P };
  }

  // 칸 안의 위치(x: 벽을 따라, z: 벽에서 앞으로)를 방 좌표로
  function localToWorld(comp, lx, lz) {
    const c = Math.cos(comp.rotY || 0), s = Math.sin(comp.rotY || 0);
    return { x: comp.ox + lx * c + lz * s, z: comp.oz - lx * s + lz * c };
  }
  function worldDeltaToLocal(comp, dx, dz) {
    const c = Math.cos(comp.rotY || 0), s = Math.sin(comp.rotY || 0);
    return { x: dx * c - dz * s, z: dx * s + dz * c };
  }

  // 1. 장 형식의 선반 구획(칸) 또는 슬라이딩 서랍의 유효 공간 목록 반환
  function getCompartments(spaceConfig) {
    const list = getCompartmentsRaw(spaceConfig);
    if (spaceConfig.type !== 'pantry' && spaceConfig.type !== 'fridge') {
      const { W, D } = getSpaceDims(spaceConfig);
      list.forEach((c) => { c.ox = -W / 2; c.oz = -D / 2; c.rotY = 0; });
    }
    return list;
  }

  function getCompartmentsRaw(spaceConfig) {
    if (spaceConfig.type === 'fridge') {
      const { zones, parts } = getFridgeLayout(spaceConfig);
      const out = [];
      zones.forEach((z) => {
        for (let lvl = 0; lvl <= z.shelfCount; lvl++) {
          const yStart = z.yBase + lvl * (z.clear + parts.glass);
          out.push({
            index: out.length,
            name: `${z.label} ${lvl + 1}칸`,
            short: `${z.kind === 'fridge' ? '냉장' : '냉동'}${lvl + 1}`,
            zoneKey: z.key, zoneKind: z.kind, level: lvl,
            yStart, yEnd: yStart + z.clear, clearH: z.clear,
            w: z.w, d: z.d, ox: z.ox, oz: z.oz, rotY: 0
          });
        }
      });
      return out;
    }
    if (spaceConfig.type === 'pantry') {
      const p = spaceConfig.pantry;
      const { bays } = getPantryBays(spaceConfig);
      const out = [];
      bays.forEach((b) => {
        let curY = 0;
        const wallName = b.wall === 'A' ? '안쪽 벽' : '옆 벽';
        const pushComp = (yEnd, lvl) => {
          out.push({
            index: out.length,
            name: `${wallName} ${b.col + 1}열 ${lvl + 1}단`,
            short: `${b.wall === 'A' ? '안' : '옆'}${b.col + 1}-${lvl + 1}`,
            bayKey: b.key, wall: b.wall, col: b.col, level: lvl, s0: b.s0,
            reserved: !!p.keepFloor && lvl === 0,
            yStart: curY, yEnd, clearH: Math.max(0, yEnd - curY),
            w: b.w, d: b.d, ox: b.ox, oz: b.oz, rotY: b.rotY
          });
        };
        b.shelves.forEach((sh, i) => {
          const topY = Math.min(p.h, Math.max(curY + 20, sh.bottomY));
          pushComp(topY, i);
          curY = Math.min(p.h, topY + (sh.thickness || 18));
        });
        pushComp(p.h, b.shelves.length);
      });
      return out;
    }
    if (spaceConfig.type === 'drawer') {
      const d = spaceConfig.drawer;
      const clearH = d.clearanceH && d.clearanceH > 0 ? d.clearanceH : d.h;
      const tiers = Math.min(6, Math.max(1, Math.round(Number(d.tiers) || 2)));
      const out = [];
      for (let t = 0; t < tiers; t++) {
        out.push({
          index: t,
          name: tiers === 1 ? '서랍 안 공간' : `서랍 ${t + 1}단`,
          tierIndex: t,
          yStart: 0,
          yEnd: clearH,
          clearH: clearH,
          wallH: d.h,
          w: d.w,
          d: d.d
        });
      }
      return out;
    }

    const c = spaceConfig.cabinet;
    const sortedShelves = [...(c.shelves || [])].sort((a, b) => a.bottomY - b.bottomY);
    const compartments = [];
    let currentY = 0;

    sortedShelves.forEach((shelf, idx) => {
      const topY = Math.min(c.h, Math.max(currentY + 20, shelf.bottomY));
      compartments.push({
        index: idx,
        name: `${idx + 1}번째 칸`,
        yStart: currentY,
        yEnd: topY,
        clearH: Math.max(0, topY - currentY),
        w: c.w,
        d: c.d
      });
      currentY = Math.min(c.h, topY + (shelf.thickness || 18));
    });

    compartments.push({
      index: sortedShelves.length,
      name: `${sortedShelves.length + 1}번째 칸 (맨 위)`,
      yStart: currentY,
      yEnd: c.h,
      clearH: Math.max(0, c.h - currentY),
      w: c.w,
      d: c.d
    });

    return compartments;
  }

  // 2. 회전 각도(0, 90, 180, 270)에 따른 수납함 치수 반환
  function getOrientedDims(model, rot) {
    const r = ((rot % 360) + 360) % 360;
    const swapped = r === 90 || r === 270;
    return {
      w: swapped ? model.dTop : model.wTop,
      d: swapped ? model.wTop : model.dTop,
      wBot: swapped ? model.dBot : model.wBot,
      dBot: swapped ? model.wBot : model.dBot,
      h: model.h,
      rot: r
    };
  }

  // 3. 장 형식의 문설주/경첩 사각지대 및 개구부 유효 치수 계산
  function getCabinetConstraints(spaceConfig) {
    const c = spaceConfig.cabinet;
    const leftFrameW = Math.max(0, Number(c.leftFrameW) || 0);
    const rightFrameW = Math.max(0, Number(c.rightFrameW) || 0);
    const topFrameH = Math.max(0, Number(c.topFrameH) || 0);
    const bottomFrameH = Math.max(0, Number(c.bottomFrameH) || 0);
    const hingeW = Math.max(0, Number(c.hingeClearanceW) || 0);
    const doorType = c.doorType || 'double';

    let leftHingeExtra = 0;
    let rightHingeExtra = 0;
    if (doorType === 'left') leftHingeExtra = hingeW;
    else if (doorType === 'right') rightHingeExtra = hingeW;
    else if (doorType === 'double') {
      leftHingeExtra = hingeW;
      rightHingeExtra = hingeW;
    }

    const leftDeadW = Math.min(c.w / 2, leftFrameW + leftHingeExtra);
    const rightDeadW = Math.min(c.w / 2, rightFrameW + rightHingeExtra);
    const doorClearW = Math.max(0, c.w - leftDeadW - rightDeadW);
    const doorClearH = Math.max(0, c.h - topFrameH - bottomFrameH);

    return {
      leftFrameW,
      rightFrameW,
      topFrameH,
      bottomFrameH,
      leftHingeExtra,
      rightHingeExtra,
      leftDeadW,
      rightDeadW,
      doorClearW,
      doorClearH
    };
  }

  // 4. 슬라이딩 서랍의 노출 깊이 / 안쪽 미노출 깊이 계산
  function getDrawerConstraints(spaceConfig) {
    const d = spaceConfig.drawer;
    const exposedD = Math.min(d.d, Math.max(0, Number(d.exposedD) || d.d));
    const unexposedD = Math.max(0, d.d - exposedD);
    const clearanceH = Number(d.clearanceH) > 0 ? Number(d.clearanceH) : d.h;
    return {
      totalD: d.d,
      exposedD,
      unexposedD,
      wallH: d.h,
      clearanceH
    };
  }

  // 5. 문 개구부로 수납함이 물리적으로 들어갈 수 있는지 체크
  function canPassThroughDoor(model, doorClearW, doorClearH) {
    const dims = [model.wTop, model.dTop, model.h].sort((a, b) => a - b);
    const doorDims = [doorClearW, doorClearH].sort((a, b) => a - b);
    return dims[0] <= doorDims[0] && dims[1] <= doorDims[1];
  }

  // 6. 팝업 카탈로그에서 특정 수납함이 현재 선택된 선반 공간에 들어갈 수 있는지 사전 판별
  function checkModelFitForCompartment(spaceConfig, compIdx, model) {
    const compartments = getCompartments(spaceConfig);
    const comp = compartments[compIdx] || compartments[0];

    if (model.h > comp.clearH) {
      return { ok: false, reason: `너무 높아요 (칸 높이 ${comp.clearH}mm)` };
    }
    const fitsNormal = model.wTop <= comp.w && model.dTop <= comp.d;
    // 서랍형은 서랍 면이 항상 앞을 봐야 해서 돌려 넣지 않음
    const fitsRotated = model.accessType !== 'front_drawer' && model.dTop <= comp.w && model.wTop <= comp.d;
    if (!fitsNormal && !fitsRotated) {
      return { ok: false, reason: `바닥에 안 들어가요` };
    }
    if (spaceConfig.type === 'cabinet') {
      const cabConst = getCabinetConstraints(spaceConfig);
      if (!canPassThroughDoor(model, cabConst.doorClearW, cabConst.doorClearH)) {
        return { ok: false, reason: `문보다 커요` };
      }
    }
    if (!fitsNormal && fitsRotated) {
      return { ok: true, reason: `돌리면 들어가요` };
    }
    return { ok: true, reason: `들어가요` };
  }

  // 7. 자동 적층(Auto-Stacking) Y 좌표 계산:
  // 수납함을 (x, z)로 이동하거나 새로 추가할 때, 그 아래에 다른 수납함이 있으면 자동으로 그 위로 올라감!
  function computeStackingY(spaceConfig, placedBoxes, targetBox, modelsMap, ignoreIds) {
    const model = modelsMap[targetBox.modelId];
    if (!model) return 0;
    const dims = getOrientedDims(model, targetBox.rot || 0);
    const ignoreSet = new Set(ignoreIds || [targetBox.id]);

    let baseY = 0;
    const margin = 4; // 모서리가 살짝 스치는 정도는 올라타지 않도록 4mm 여유

    placedBoxes.forEach((other) => {
      if (ignoreSet.has(other.id)) return;
      if (other.compartmentIndex !== targetBox.compartmentIndex) return;
      const otherModel = modelsMap[other.modelId];
      if (!otherModel) return;
      const otherDims = getOrientedDims(otherModel, other.rot || 0);

      const overlapX = targetBox.x < other.x + otherDims.w - margin && targetBox.x + dims.w > other.x + margin;
      const overlapZ = targetBox.z < other.z + otherDims.d - margin && targetBox.z + dims.d > other.z + margin;

      if (overlapX && overlapZ) {
        // 같은 모델이고 적층 홈(stackingOffset)이 있으면 그만큼 맞물려 낮아짐
        const offset = (otherModel.id === model.id && otherModel.stackable) ? (otherModel.stackingOffset || 0) : 0;
        const candidateY = (other.y || 0) + otherDims.h - offset;
        if (candidateY > baseY) {
          baseY = candidateY;
        }
      }
    });

    return Math.max(0, Math.round(baseY));
  }

  // 8. 배치된 모든 수납함의 3D 충돌, 경계 이탈, 문설주/경첩 간섭, 서랍 미노출 간섭 검증
  function validatePlan(spaceConfig, placedBoxes, modelsMap) {
    const compartments = getCompartments(spaceConfig);
    const boxStatuses = {};
    const messages = [];

    const cabConst = spaceConfig.type === 'cabinet' ? getCabinetConstraints(spaceConfig) : null;
    const drwConst = spaceConfig.type === 'drawer' ? getDrawerConstraints(spaceConfig) : null;

    placedBoxes.forEach((box) => {
      const model = modelsMap[box.modelId];
      if (!model) return;
      const dims = getOrientedDims(model, box.rot || 0);
      const comp = compartments[box.compartmentIndex] || compartments[0];
      const issues = [];
      let severity = 'ok';

      const setSeverity = (level) => {
        if (level === 'error') severity = 'error';
        else if (level === 'warn' && severity !== 'error') severity = 'warn';
      };

      const xMin = box.x;
      const xMax = box.x + dims.w;
      const zMin = box.z;
      const zMax = box.z + dims.d;
      const relYMin = box.y || 0;
      const relYMax = relYMin + dims.h;

      // (A) 공간 외곽 경계 이탈 검사
      if (xMin < -0.5 || zMin < -0.5 || xMax > comp.w + 0.5 || zMax > comp.d + 0.5) {
        setSeverity('error');
        issues.push(`[밖으로 나감] '${model.name}' 상자가 칸 밖으로 나갔어요.`);
      }

      // (B) 높이 초과 검사 (위로 적층되어 선반 칸 높이를 넘긴 경우 포함)
      if (relYMax > comp.clearH + 0.5) {
        setSeverity('error');
        if (spaceConfig.type === 'drawer') {
          issues.push(`[서랍 안 닫힘] '${model.name}'이 너무 높아서(${Math.round(relYMax)}mm) 서랍이 안 닫혀요. (들어가는 높이 ${comp.clearH}mm)`);
        } else {
          issues.push(`[너무 높음] '${model.name}'이 ${comp.name}보다 높아요. 상자 ${Math.round(relYMax)}mm > 칸 ${comp.clearH}mm`);
        }
      }

      // (C) 장 형식 전용 검증
      if (spaceConfig.type === 'cabinet' && cabConst) {
        if (!canPassThroughDoor(model, cabConst.doorClearW, cabConst.doorClearH)) {
          setSeverity('error');
          issues.push(`[문으로 못 들어감] '${model.name}'이 문(${cabConst.doorClearW}×${cabConst.doorClearH}mm)보다 커서 장 안에 못 넣어요.`);
        }

        const inLeftDead = cabConst.leftDeadW > 0 && xMin < cabConst.leftDeadW - 0.5;
        const inRightDead = cabConst.rightDeadW > 0 && xMax > comp.w - cabConst.rightDeadW + 0.5;
        const inBottomDead = cabConst.bottomFrameH > 0 && (comp.yStart + relYMin) < cabConst.bottomFrameH - 0.5;

        if (inLeftDead || inRightDead || inBottomDead) {
          const zoneName = inLeftDead ? '왼쪽 문틀' : inRightDead ? '오른쪽 문틀' : '아래 문틀';
          if (model.accessType === 'front_drawer') {
            setSeverity('error');
            issues.push(`[서랍 못 뺌] 서랍형 '${model.name}'이 ${zoneName}에 걸려서 앞으로 못 빼요.`);
          } else {
            setSeverity('warn');
            issues.push(`[빼기 불편] '${model.name}'이 ${zoneName} 뒤에 걸쳐 있어서 똑바로 빼기 힘들어요.`);
          }
        }
      }

      // (D) 슬라이딩 서랍 전용 검증
      if (spaceConfig.type === 'drawer' && drwConst) {
        if (drwConst.unexposedD > 0 && zMin < drwConst.unexposedD - 0.5) {
          const hiddenDepth = Math.min(dims.d, drwConst.unexposedD - zMin);
          if (model.accessType === 'top_open' || model.accessType === 'top_lid') {
            setSeverity('warn');
            issues.push(`[꺼내기 힘든 곳 주의] '${model.name}'의 안쪽 ${Math.round(hiddenDepth)}mm가 서랍을 다 열어도 가려져서 위로 꺼내기 불편해요.`);
          } else {
            setSeverity('warn');
            issues.push(`[꺼내기 힘든 곳] '${model.name}'의 일부(${Math.round(hiddenDepth)}mm)가 서랍 안쪽 꺼내기 힘든 곳에 있어요.`);
          }
        }
      }

      // (D-2) 팬트리 구석: 옆 선반에 막혀 손이 잘 안 닿는 곳
      if (spaceConfig.type === 'pantry' && comp.wall === 'A') {
        const corner = getPantryCorner(spaceConfig);
        if (corner) {
          const a0 = (comp.s0 || 0) + xMin, a1 = (comp.s0 || 0) + xMax;
          if (a1 > corner.s0 + 0.5 && a0 < corner.s1 - 0.5) {
            setSeverity('warn');
            issues.push(`[구석] '${model.name}'이 구석에 있어요. 옆 선반에 막혀 꺼내기 힘들어요.`);
          }
        }
      }

      boxStatuses[box.id] = { severity, issues };
      issues.forEach((msg) => messages.push({ boxId: box.id, severity, text: msg }));
    });

    // (E) 수납함 상호 3D 충돌 검사 (위아래로 정상 적층된 경우는 Y가 겹치지 않으므로 통과!)
    for (let i = 0; i < placedBoxes.length; i++) {
      for (let j = i + 1; j < placedBoxes.length; j++) {
        const a = placedBoxes[i];
        const b = placedBoxes[j];
        if (a.compartmentIndex !== b.compartmentIndex) continue;

        const modA = modelsMap[a.modelId];
        const modB = modelsMap[b.modelId];
        if (!modA || !modB) continue;

        const dimA = getOrientedDims(modA, a.rot || 0);
        const dimB = getOrientedDims(modB, b.rot || 0);

        const overlapX = a.x < b.x + dimB.w - 2 && a.x + dimA.w > b.x + 2;
        const overlapZ = a.z < b.z + dimB.d - 2 && a.z + dimA.d > b.z + 2;
        const yA = a.y || 0;
        const yB = b.y || 0;
        const overlapY = yA < yB + dimB.h - 6 && yA + dimA.h > yB + 6;

        if (overlapX && overlapZ && overlapY) {
          boxStatuses[a.id].severity = 'error';
          boxStatuses[b.id].severity = 'error';
          const msg = `[상자 겹침] '${modA.name}'와 '${modB.name}'이 서로 겹쳐 있어요.`;
          boxStatuses[a.id].issues.push(msg);
          boxStatuses[b.id].issues.push(msg);
          messages.push({ boxId: a.id, severity: 'error', text: msg });
        } else if (overlapX && overlapY) {
          // 서랍형(front_drawer) 앞에 다른 상자가 놓여 서랍을 열 수 없는 경우 검사
          if (modA.accessType === 'front_drawer' && b.z >= a.z + dimA.d - 4) {
            boxStatuses[a.id].severity = 'error';
            const msg = `[서랍 못 엶] '${modA.name}' 바로 앞에 '${modB.name}'이 있어서 서랍을 열 수 없어요.`;
            boxStatuses[a.id].issues.push(msg);
            messages.push({ boxId: a.id, severity: 'error', text: msg });
          } else if (modB.accessType === 'front_drawer' && a.z >= b.z + dimB.d - 4) {
            boxStatuses[b.id].severity = 'error';
            const msg = `[서랍 못 엶] '${modB.name}' 바로 앞에 '${modA.name}'이 있어서 서랍을 열 수 없어요.`;
            boxStatuses[b.id].issues.push(msg);
            messages.push({ boxId: b.id, severity: 'error', text: msg });
          }
        }
      }
    }

    return { boxStatuses, messages };
  }

  // 9. 자동 채우기 (Auto-Fill) 알고리즘 (다단 자동 적층 옵션 지원)
  function autoFill(spaceConfig, options, catalogModels, modelsMap) {
    const compartments = getCompartments(spaceConfig);
    const compIdx = options.compartmentIndex || 0;
    const comp = compartments[compIdx] || compartments[0];

    let xStart = 0;
    let xEnd = comp.w;
    let zStart = 0;
    let zEnd = comp.d;

    if (options.avoidDeadzone) {
      if (spaceConfig.type === 'cabinet') {
        const cab = getCabinetConstraints(spaceConfig);
        xStart = cab.leftDeadW;
        xEnd = comp.w - cab.rightDeadW;
      } else if (spaceConfig.type === 'drawer') {
        const drw = getDrawerConstraints(spaceConfig);
        zStart = drw.unexposedD;
        zEnd = comp.d;
      }
    }

    const usableW = Math.max(0, xEnd - xStart);
    const usableD = Math.max(0, zEnd - zStart);
    const usableH = comp.clearH;

    if (usableW <= 10 || usableD <= 10 || usableH <= 10) return [];

    const results = [];
    let idCounter = Date.now();

    if (options.mode === 'single') {
      const model = modelsMap[options.modelId];
      if (!model || model.h > usableH) return [];

      // 앞으로 꺼내는 상자는 돌리지 않고, 앞줄에만 놓음 (뒤에 두면 못 꺼냄)
      const frontAccess = model.accessType === 'front_drawer' || model.accessType === 'front_open';
      const canRotate = options.allowRotation && !frontAccess;

      const candidates = [0];
      if (canRotate && model.wTop !== model.dTop) {
        candidates.push(90);
      }

      let bestLayout = [];
      candidates.forEach((rot) => {
        const dims = getOrientedDims(model, rot);
        const cols = Math.floor(usableW / dims.w);
        const rows = frontAccess ? Math.min(1, Math.floor(usableD / dims.d)) : Math.floor(usableD / dims.d);
        const layout = [];

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const bx = xStart + c * dims.w;
            const bz = zEnd - (r + 1) * dims.d;
            layout.push({ x: bx, z: bz, rot });
          }
        }

        if (canRotate) {
          const rotAlt = rot === 0 ? 90 : 0;
          const altDims = getOrientedDims(model, rotAlt);
          const remW = usableW - cols * dims.w;
          if (remW >= altDims.w && usableD >= altDims.d) {
            const extraCols = Math.floor(remW / altDims.w);
            const extraRows = Math.floor(usableD / altDims.d);
            for (let r = 0; r < extraRows; r++) {
              for (let c = 0; c < extraCols; c++) {
                layout.push({
                  x: xStart + cols * dims.w + c * altDims.w,
                  z: zEnd - (r + 1) * altDims.d,
                  rot: rotAlt
                });
              }
            }
          }
          const remD = usableD - rows * dims.d;
          if (remD >= altDims.d && usableW >= altDims.w) {
            const extraCols = Math.floor(usableW / altDims.w);
            const extraRows = Math.floor(remD / altDims.d);
            for (let r = 0; r < extraRows; r++) {
              for (let c = 0; c < extraCols; c++) {
                layout.push({
                  x: xStart + c * altDims.w,
                  z: zEnd - rows * dims.d - (r + 1) * altDims.d,
                  rot: rotAlt
                });
              }
            }
          }
        }

        if (layout.length > bestLayout.length) {
          bestLayout = layout;
        }
      });

      const effStepH = Math.max(10, model.h - (model.stackingOffset || 0));
      const maxLayers = (options.allowStacking && model.stackable)
        ? Math.max(1, 1 + Math.floor((usableH - model.h) / effStepH))
        : 1;

      for (let layer = 0; layer < maxLayers; layer++) {
        const yPos = layer * effStepH;
        bestLayout.forEach((slot) => {
          results.push({
            id: 'box-' + (++idCounter),
            modelId: model.id,
            compartmentIndex: compIdx,
            x: Math.round(slot.x),
            y: Math.round(yPos),
            z: Math.round(slot.z),
            rot: slot.rot
          });
        });
      }

      return results;
    }

    // mode === 'brand_mix'
    let pool = catalogModels.filter((m) => {
      if (options.brand && options.brand !== 'ALL' && m.brand !== options.brand) return false;
      return m.h <= usableH;
    });

    // 선반 바닥(깊이 usableD · 폭 usableW)을 최대한 채우는 크기부터 우선 정렬
    const floorFitScore = (m) => {
      const frontAccess = m.accessType === 'front_drawer' || m.accessType === 'front_open';
      const rots = options.allowRotation && !frontAccess && m.wTop !== m.dTop ? [0, 90] : [0];
      let best = 0;
      for (const r of rots) {
        const d = getOrientedDims(m, r);
        if (d.w <= usableW && d.d <= usableD) {
          const depthFit = d.d / Math.max(1, usableD);
          const area = d.w * d.d;
          // 서랍형은 선반 깊이를 꽉 채울수록 가중치 부여 (앞뒤 이중 적치 방지)
          const bonus = m.accessType === 'front_drawer' ? (depthFit * depthFit * 1.6) : depthFit;
          const sc = area * (0.6 + bonus);
          if (sc > best) best = sc;
        }
      }
      return best;
    };
    pool.sort((a, b) => floorFitScore(b) - floorFitScore(a));
    if (pool.length === 0) return [];

    const step = 5;
    const gridW = Math.floor(usableW / step);
    const gridD = Math.floor(usableD / step);
    const occupied = Array.from({ length: gridD }, () => new Uint8Array(gridW));

    const canFitGrid = (gx, gz, gw, gd) => {
      if (gx + gw > gridW || gz + gd > gridD) return false;
      for (let dz = 0; dz < gd; dz++) {
        for (let dx = 0; dx < gw; dx++) {
          if (occupied[gz + dz][gx + dx]) return false;
        }
      }
      return true;
    };

    const markGrid = (gx, gz, gw, gd) => {
      for (let dz = 0; dz < gd; dz++) {
        for (let dx = 0; dx < gw; dx++) {
          occupied[gz + dz][gx + dx] = 1;
        }
      }
    };

    for (let gz = 0; gz < gridD; gz++) {
      for (let gx = 0; gx < gridW; gx++) {
        if (occupied[gz][gx]) continue;

        for (let mIdx = 0; mIdx < pool.length; mIdx++) {
          const model = pool[mIdx];
          const isFrontDrawer = model.accessType === 'front_drawer';
          // 서랍형은 반드시 맨 앞줄(gz === 0)에만 배치하여 앞에 다른 상자가 막지 않게 함
          if (isFrontDrawer && gz > 0) continue;

          const frontAccess = isFrontDrawer || model.accessType === 'front_open';
          const rots = options.allowRotation && !frontAccess && model.wTop !== model.dTop ? [0, 90] : [0];
          let placed = false;

          for (const rot of rots) {
            const dims = getOrientedDims(model, rot);
            const gw = Math.ceil(dims.w / step);
            const gd = Math.ceil(dims.d / step);

            if (canFitGrid(gx, gz, gw, gd)) {
              // 서랍형(front_drawer)이 들어간 폭 구간은 뒤쪽까지 전후 열 전체를 점유 처리해 서랍 앞뒤 이중 쌓임을 방지
              markGrid(gx, gz, gw, isFrontDrawer ? (gridD - gz) : gd);
              const realX = xStart + gx * step;
              const realZ = zEnd - gz * step - dims.d;
              if (realZ >= zStart - 1) {
                const effStepH = Math.max(10, model.h - (model.stackingOffset || 0));
                const layers = (options.allowStacking && model.stackable)
                  ? Math.max(1, 1 + Math.floor((usableH - model.h) / effStepH))
                  : 1;
                for (let l = 0; l < layers; l++) {
                  results.push({
                    id: 'box-' + (++idCounter),
                    modelId: model.id,
                    compartmentIndex: compIdx,
                    x: Math.round(realX),
                    y: Math.round(l * effStepH),
                    z: Math.round(realZ),
                    rot
                  });
                }
                placed = true;
                break;
              }
            }
          }
          if (placed) break;
        }
      }
    }

    return results;
  }

  // 9-2. 각 칸(선반/서랍)의 상·좌·우·전·후 남는 공간(mm) 계산
  function getCompartmentMargins(spaceConfig, placedBoxes, modelsMap) {
    const compartments = getCompartments(spaceConfig);
    return compartments.map((comp) => {
      const compBoxes = (placedBoxes || []).filter((b) => b.compartmentIndex === comp.index);
      if (compBoxes.length === 0) {
        return {
          compartmentIndex: comp.index,
          name: comp.name,
          short: comp.short || comp.name,
          boxCount: 0,
          compW: Math.round(comp.w),
          compD: Math.round(comp.d),
          compH: Math.round(comp.clearH),
          top: Math.round(comp.clearH),
          left: Math.round(comp.w),
          right: Math.round(comp.w),
          front: Math.round(comp.d),
          back: Math.round(comp.d),
          freeW: Math.round(comp.w),
          freeD: Math.round(comp.d)
        };
      }
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      let maxTopY = 0;
      compBoxes.forEach((b) => {
        const m = modelsMap[b.modelId];
        if (!m) return;
        const dims = getOrientedDims(m, b.rot || 0);
        if (b.x < minX) minX = b.x;
        if (b.x + dims.w > maxX) maxX = b.x + dims.w;
        if (b.z < minZ) minZ = b.z;
        if (b.z + dims.d > maxZ) maxZ = b.z + dims.d;
        const topY = (b.y || 0) + dims.h;
        if (topY > maxTopY) maxTopY = topY;
      });
      const left = Math.max(0, Math.round(minX));
      const right = Math.max(0, Math.round(comp.w - maxX));
      const back = Math.max(0, Math.round(minZ));
      const front = Math.max(0, Math.round(comp.d - maxZ));
      const top = Math.max(0, Math.round(comp.clearH - maxTopY));
      return {
        compartmentIndex: comp.index,
        name: comp.name,
        short: comp.short || comp.name,
        boxCount: compBoxes.length,
        compW: Math.round(comp.w),
        compD: Math.round(comp.d),
        compH: Math.round(comp.clearH),
        top,
        left,
        right,
        front,
        back,
        freeW: left + right,
        freeD: front + back
      };
    });
  }

  // 10. 시안별 요약 지표 계산
  function calculatePlanMetrics(spaceConfig, placedBoxes, modelsMap) {
    const compartments = getCompartments(spaceConfig);
    let totalSpaceVol = 0;
    let totalSpaceArea = 0;
    compartments.forEach((c) => {
      totalSpaceVol += c.w * c.d * c.clearH;
      totalSpaceArea += c.w * c.d;
    });

    let usedVol = 0;
    let usedFloorArea = 0;

    placedBoxes.forEach((b) => {
      const m = modelsMap[b.modelId];
      if (!m) return;
      const dims = getOrientedDims(m, b.rot || 0);
      usedVol += dims.w * dims.d * dims.h;
      if ((b.y || 0) < 5) {
        usedFloorArea += dims.w * dims.d;
      }
    });

    const firstComp = compartments[0];
    let maxUsedX = 0;
    let minUsedZ = firstComp.d;
    let maxUsedZ = 0;
    let maxUsedY = 0;

    placedBoxes.forEach((b) => {
      const m = modelsMap[b.modelId];
      if (!m) return;
      const dims = getOrientedDims(m, b.rot || 0);
      if (b.x + dims.w > maxUsedX) maxUsedX = b.x + dims.w;
      if (b.z < minUsedZ) minUsedZ = b.z;
      if (b.z + dims.d > maxUsedZ) maxUsedZ = b.z + dims.d;
      if ((b.y || 0) + dims.h > maxUsedY) maxUsedY = (b.y || 0) + dims.h;
    });

    const usedSpanD = placedBoxes.length > 0 ? Math.max(0, maxUsedZ - minUsedZ) : 0;
    const remW = Math.max(0, Math.round(firstComp.w - maxUsedX));
    const remD = Math.max(0, Math.round(firstComp.d - usedSpanD));
    const remH = Math.max(0, Math.round(firstComp.clearH - maxUsedY));

    const validation = validatePlan(spaceConfig, placedBoxes, modelsMap);
    const errorCount = validation.messages.filter((m) => m.severity === 'error').length;
    const warnCount = validation.messages.filter((m) => m.severity === 'warn').length;

    const volPercent = totalSpaceVol > 0 ? Math.min(100, (usedVol / totalSpaceVol) * 100) : 0;
    const areaPercent = totalSpaceArea > 0 ? Math.min(100, (usedFloorArea / totalSpaceArea) * 100) : 0;

    return {
      totalCount: placedBoxes.length,
      volPercent: volPercent.toFixed(1),
      areaPercent: areaPercent.toFixed(1),
      remW,
      remD,
      remH,
      errorCount,
      warnCount,
      validation
    };
  }

  return {
    getSpaceDims,
    getPantryBays,
    getFridgeLayout,
    getPantryCorner,
    getPantryWalkway,
    localToWorld,
    worldDeltaToLocal,
    getCompartments,
    getOrientedDims,
    getCabinetConstraints,
    getDrawerConstraints,
    checkModelFitForCompartment,
    validatePlan,
    computeStackingY,
    autoFill,
    getCompartmentMargins,
    calculatePlanMetrics
  };
})();
