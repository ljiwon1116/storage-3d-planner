// 3D 공간 구획 계산, 자동 적층(Auto-Stacking), 충돌/간섭 검증(문설주·경첩·서랍 미노출 구간), 자동 채우기 엔진

window.PackerEngine = (function () {
  // 1. 장 형식의 선반 구획(칸) 또는 슬라이딩 서랍의 유효 공간 목록 반환
  function getCompartments(spaceConfig) {
    if (spaceConfig.type === 'drawer') {
      const d = spaceConfig.drawer;
      const clearH = d.clearanceH && d.clearanceH > 0 ? d.clearanceH : d.h;
      return [
        {
          index: 0,
          name: '슬라이딩 서랍 내부 공간',
          yStart: 0,
          yEnd: clearH,
          clearH: clearH,
          wallH: d.h,
          w: d.w,
          d: d.d
        }
      ];
    }

    const c = spaceConfig.cabinet;
    const sortedShelves = [...(c.shelves || [])].sort((a, b) => a.bottomY - b.bottomY);
    const compartments = [];
    let currentY = 0;

    sortedShelves.forEach((shelf, idx) => {
      const topY = Math.min(c.h, Math.max(currentY + 20, shelf.bottomY));
      compartments.push({
        index: idx,
        name: `${idx + 1}단 선반 공간`,
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
      name: `${sortedShelves.length + 1}단 선반 공간 (최상단)`,
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
      return { ok: false, reason: `높이 초과 (칸 높이 ${comp.clearH}mm)` };
    }
    const fitsNormal = model.wTop <= comp.w && model.dTop <= comp.d;
    const fitsRotated = model.dTop <= comp.w && model.wTop <= comp.d;
    if (!fitsNormal && !fitsRotated) {
      return { ok: false, reason: `바닥 크기 초과` };
    }
    if (spaceConfig.type === 'cabinet') {
      const cabConst = getCabinetConstraints(spaceConfig);
      if (!canPassThroughDoor(model, cabConst.doorClearW, cabConst.doorClearH)) {
        return { ok: false, reason: `문 입구보다 큼` };
      }
    }
    if (!fitsNormal && fitsRotated) {
      return { ok: true, reason: `✓ 90° 회전 시 수납 가능` };
    }
    return { ok: true, reason: `✓ 수납 가능` };
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
        issues.push(`[경계 초과] '${model.name}' 수납함이 선반 내경을 벗어났습니다.`);
      }

      // (B) 높이 초과 검사 (위로 적층되어 선반 칸 높이를 넘긴 경우 포함)
      if (relYMax > comp.clearH + 0.5) {
        setSeverity('error');
        if (spaceConfig.type === 'drawer') {
          issues.push(`[상단 걸림] '${model.name}' 상단 높이(${Math.round(relYMax)}mm)가 서랍 유효 입구 높이(${comp.clearH}mm)를 초과하여 서랍이 열리지 않습니다.`);
        } else {
          issues.push(`[선반 높이 초과] '${model.name}' 상단 높이(${Math.round(relYMax)}mm)가 ${comp.name} 유효 높이(${comp.clearH}mm)를 초과합니다.`);
        }
      }

      // (C) 장 형식 전용 검증
      if (spaceConfig.type === 'cabinet' && cabConst) {
        if (!canPassThroughDoor(model, cabConst.doorClearW, cabConst.doorClearH)) {
          setSeverity('error');
          issues.push(`[입구 진입 불가] '${model.name}' 크기가 문 개구부(${cabConst.doorClearW}×${cabConst.doorClearH}mm)보다 커서 장 안으로 넣을 수 없습니다.`);
        }

        const inLeftDead = cabConst.leftDeadW > 0 && xMin < cabConst.leftDeadW - 0.5;
        const inRightDead = cabConst.rightDeadW > 0 && xMax > comp.w - cabConst.rightDeadW + 0.5;
        const inBottomDead = cabConst.bottomFrameH > 0 && (comp.yStart + relYMin) < cabConst.bottomFrameH - 0.5;

        if (inLeftDead || inRightDead || inBottomDead) {
          const zoneName = inLeftDead ? '좌측 문설주/경첩' : inRightDead ? '우측 문설주/경첩' : '하단 문틀';
          if (model.accessType === 'front_drawer') {
            setSeverity('error');
            issues.push(`[서랍 열림 불가] 전면 서랍형 '${model.name}'이(가) ${zoneName} 사각지대에 걸려 서랍을 앞으로 당겨 열 수 없습니다.`);
          } else {
            setSeverity('warn');
            issues.push(`[사각지대 주의] '${model.name}'이(가) ${zoneName} 뒤쪽 사각지대에 걸쳐 있어 일직선으로 바로 빼기 어렵습니다.`);
          }
        }
      }

      // (D) 슬라이딩 서랍 전용 검증
      if (spaceConfig.type === 'drawer' && drwConst) {
        if (drwConst.unexposedD > 0 && zMin < drwConst.unexposedD - 0.5) {
          const hiddenDepth = Math.min(dims.d, drwConst.unexposedD - zMin);
          if (model.accessType === 'top_open' || model.accessType === 'top_lid') {
            setSeverity('warn');
            issues.push(`[미노출 구간 주의] '${model.name}'의 안쪽 ${Math.round(hiddenDepth)}mm가 서랍을 끝까지 열어도 윗판에 가려져 위에서 꺼내기 불편합니다.`);
          } else {
            setSeverity('warn');
            issues.push(`[미노출 구간 배치] '${model.name}' 일부(${Math.round(hiddenDepth)}mm)가 서랍 안쪽 미노출 구간에 위치합니다.`);
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
          const msg = `[수납함 겹침] '${modA.name}'와(과) '${modB.name}'이(가) 서로 겹쳐 있습니다.`;
          boxStatuses[a.id].issues.push(msg);
          boxStatuses[b.id].issues.push(msg);
          messages.push({ boxId: a.id, severity: 'error', text: msg });
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

      const candidates = [0];
      if (options.allowRotation && model.wTop !== model.dTop) {
        candidates.push(90);
      }

      let bestLayout = [];
      candidates.forEach((rot) => {
        const dims = getOrientedDims(model, rot);
        const cols = Math.floor(usableW / dims.w);
        const rows = Math.floor(usableD / dims.d);
        const layout = [];

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const bx = xStart + c * dims.w;
            const bz = zEnd - (r + 1) * dims.d;
            layout.push({ x: bx, z: bz, rot });
          }
        }

        if (options.allowRotation) {
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

    pool.sort((a, b) => (b.wTop * b.dTop) - (a.wTop * a.dTop));
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
          const rots = options.allowRotation && model.wTop !== model.dTop ? [0, 90] : [0];
          let placed = false;

          for (const rot of rots) {
            const dims = getOrientedDims(model, rot);
            const gw = Math.ceil(dims.w / step);
            const gd = Math.ceil(dims.d / step);

            if (canFitGrid(gx, gz, gw, gd)) {
              markGrid(gx, gz, gw, gd);
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
    getCompartments,
    getOrientedDims,
    getCabinetConstraints,
    getDrawerConstraints,
    checkModelFitForCompartment,
    validatePlan,
    computeStackingY,
    autoFill,
    calculatePlanMetrics
  };
})();
