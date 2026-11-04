# 🏡 StorageFit 3D (옷장·서랍·팬트리 3D 수납 플래너)
> **Claude Code 인수인계 및 개발 가이드 문서 (Handoff Guide)**  
> **현재 버전:** `1104b` (2026-11-04 기준)  
> **라이브 주소:** [https://storage3dplanner.vercel.app](https://storage3dplanner.vercel.app)  
> **원격 저장소:** [https://github.com/ljiwon1116/storage-3d-planner.git](https://github.com/ljiwon1116/storage-3d-planner.git) (`gh-pages` 브랜치)  
> **실사용자:** 인스타그램 인테리어/수납 크리에이터 @joshleeliving (이지원)

---

## 📌 1. 프로젝트 개요 & 핵심 철학

이 프로젝트는 집안의 **여닫이 옷장, 슬라이딩 서랍, 팬트리(ㄱ자 선반)** 등의 실제 치수를 입력하고, 시중 브랜드(**무인양품, 다이소, 루틴랩**)의 수납함을 3D로 직접 또는 자동으로 배치해 보며 공간 적합성과 적층 가능 여부를 검증하는 **모바일 중심 3D 수납 시뮬레이터 웹앱**입니다.

### 🎯 핵심 기술 및 설계 원칙
- **Zero-Build Vanilla Architecture:**
  - 번들러(Webpack/Vite/Next.js) 없이 순수 `HTML5`, `CSS3`, `Vanilla JavaScript(ES6+)`, `Three.js (r128 CDN)`로 동작합니다.
  - 빌드 단계 없이 브라우저나 로컬 웹 서버에서 `index.html`을 바로 열어도 100% 동일하게 동작하며, `gh-pages` 브랜치에 Push하면 Vercel에서 정적 웹으로 즉시 배포됩니다.
- **모바일 First & 마디아(Madia) 디자인 원칙:**
  - 주요 타겟 사용자가 인스타그램 모바일 방문자이므로 데스크탑 모드 대신 모바일 반응형 뷰에 집중합니다.
  - **위계:** 폰트 크기 과장보다 굵기(Weight)와 명도(Contrast) 차이로 시각 위계 표현.
  - **간격:** 4px, 8px, 12px, 16px, 24px의 4/8 배수 그리드 준수.
  - **버튼:** 한 화면/팝업 내 가장 중요한 Primary Action 버튼은 오직 1개로 제한.
  - **선/여백:** 과도한 테두리선을 지양하고 면 분할과 넉넉한 여백(Negative Space) 활용.
  - **컬러:** 아이보리/베이지 웜톤 테마 (`#FAF7F2`, `#4A3E3D`), 유치한 컬러 이모지 지양, 정돈된 라인 아이콘 적용.

---

## 📁 2. 파일 구조 및 역할

```
storage-3d-planner/
├── index.html            # 메인 HTML 마크업 (위저드, 3D 뷰포트, 상자 고르기 창, 팝업, 모달)
├── styles.css            # 전체 UI 스타일시트 (아이보리 웜톤 테마, 모바일 바텀시트, 팝업 애니메이션)
├── manifest.json         # PWA 매니페스트 설정
├── icons/                # PWA 및 파비콘 아이콘
├── models/               # 3D GLB 모델 파일 (수납함 및 생활 물품 23종)
├── js/
│   ├── presets.js        # 수납함 카탈로그 데이터 (무인양품, 다이소, 루틴랩), 사다리꼴/적층 여부, 썸네일 SVG
│   ├── items.js          # 수납함 내부용 생활 물건 데이터 (23개 생활 물품: 햇반, 신라면, 수건 등)
│   ├── packer.js         # 3D 칸 공간 분할 및 자동 채우기 알고리즘, 서랍형 바닥 우선 배치, 적층 Y 계산
│   ├── scene3d.js        # Three.js 3D 씬 매니저 (가구 3종 렌더링, 수납함 메쉬 생성, 드래그&적층, 워터마크)
│   ├── app.js            # 메인 애플리케이션 컨트롤러 (전역 state, 이벤트 바인딩, 필터, 팝업 제어)
│   └── boxdetail.js      # 수납함 상세 보기 및 내부 물건(23종) 배치 시뮬레이터
└── README.md             # 본 인수인계 문서
```

### 핵심 모듈 상세 설명

| 모듈 | 핵심 역할 및 주요 함수 |
|---|---|
| **`index.html`** | - 상단 헤더, 가구 설정 위저드, 3D Canvas, 하단 액션 HUD 바<br>- `#modal-box-picker`: 상자 추가 팝업 및 조건 필터 패널<br>- `#mobile-setup-popup`: 장 설정 팝업<br>- `#mobile-shelfh-popup`: 선반 높이 조절 팝업<br>- `#modal-export`: 내보내기/사진 저장 모달 |
| **`js/presets.js`** | - `DEFAULT_STORAGE_MODELS`: 각 브랜드별 수납함 데이터<br>- 필드: `id, brandKey, name, w, d, h, shapeType('box'\|'tapered'), canStack, price, link, thumbPath`<br>- `wBot, dBot`: 사다리꼴(tapered) 모델의 하단 치수 |
| **`js/scene3d.js`** | - `buildCabinetScene`, `buildDrawerScene`, `buildPantryScene`: 가구 형태별 3D 구축<br>- `buildStorageBoxMesh`: 수납함 3D 메쉬 생성 (`createFrustumGeometry`로 사다리꼴 렌더링 지원)<br>- `prepareGroupDrag`, `onPointerMove`: 수납함 드래그 이동 및 자동 적층 감지<br>- `captureSceneDataUrl`: 워터마크(`made by joshleeliving`) 및 여백 오버레이 사진 생성 |
| **`js/packer.js`** | - `getCompartmentsRaw`: 가구 치수 및 선반 위치로부터 3D 유효 공간(칸) 산출<br>- `autoPackCompartment`: 공간 채우기 알고리즘 (서랍형 바닥 우선 채우기 등 포함)<br>- `computeStackingY`: 특정 (X, Z) 위치에서 다른 상자 위에 올라탈 때의 지지 높이(Y) 계산 |
| **`js/app.js`** | - `state`: 전역 상태 관리 객체<br>- `initBoxPickerFilterPanel`: 형태/적층/크기범위/투명도 필터링 로직<br>- `exportPlan`: 내보내기 및 여백 치수 오버레이 토글 상태 제어 |

---

## 🧠 3. 전역 상태 (`state`) 구조

`js/app.js`의 `state` 객체가 모든 런타임 데이터를 보유합니다:

```javascript
state = {
  spaceConfig: {
    category: 'cabinet', // 'cabinet'(옷장), 'drawer'(슬라이딩 서랍), 'pantry'(ㄱ자 팬트리)
    cabinet: { w: 800, d: 600, h: 2000, frameD: 0, doorSide: 'both', shelves: [...] },
    drawer: { w: 800, d: 500, h: 200, exposedD: 450, clearanceH: 50, tiers: 2 },
    pantry: { innerW: 1200, sideW: 1000, cornerPos: 'left', depth: 400, tiers: 4, ... }
  },
  placedBoxes: [
    // 각 칸(shelfIndex)에 배치된 수납함 인스턴스 배열
    {
      id: "box_1730689999999",
      shelfIndex: 0,
      modelId: "daiso_drawer_wide_01",
      name: "층층이 서랍장 와이드",
      w: 260, d: 350, h: 140,
      x: 100, y: 0, z: 200,
      rot: 0, // 0 또는 90도 회전
      color: "#f5f5f5"
    }
  ],
  selectedShelfIndex: 0,
  selectedBoxIds: [],
  filterState: {
    types: ['drawer', 'basket', 'lid'],
    canStackOnly: false,
    widthRange: { min: 0, max: 1000 },
    depthRange: { min: 0, max: 1000 },
    heightRange: { min: 0, max: 1000 },
    transparency: ['opaque', 'translucent', 'transparent']
  }
};
```

---

## 🚨 4. Claude Code 우선 해결 작업 (Active Issues / Next Tasks)

아래 3가지 이슈는 최근 사용자 피드백을 통해 접수된 핵심 개선 과제입니다. Claude Code는 이어서 즉시 구현할 수 있습니다.

### Task 1. 여러 개 적층된 수납함 드래그 이동 시 스택 전체 묶음 이동 및 Y좌표 계산 버그 수정
- **증상 스크린샷:** `media_1793759119855_970b3298.png` (수납함들이 하늘 위로 치솟아 천장을 뚫고 나가는 현상)
- **발생 원인:**
  1. `js/scene3d.js`의 `prepareGroupDrag`에서 사용자가 맨 아래 상자를 잡고 드래그할 때, 그 상자 위에 얹혀 있는 상자들(위쪽 스택)이 `activeIds`에 포함되지 않아 바닥 상자만 분리되어 이동함.
  2. 만약 다중 선택되어 같이 이동하더라도, `onPointerMove`에서 각 상자마다 `computeStackingY`를 독립적으로 다시 계산하면서 자기 스택의 상자들을 지지면으로 잘못 인식하거나 Y좌표가 위로 누적 팽창함.
- **수정 가이드 (`js/scene3d.js`):**
  1. **스택 트리 자동 탐색:** `prepareGroupDrag(hitBoxId)` 시, `hitBoxId`의 윗면 영역에 올라타 있는 모든 상자(재귀적으로 그 위에 또 올라탄 상자들까지)를 찾아 `activeIds`에 자동으로 합류시킵니다.
  2. **상대 좌표 유지 (Relative Offset Drag):**
     - 맨 아래 기준 상자(Base Box)의 지지 Y 위치만 **"움직이는 스택 상자들을 제외한 외부 바닥/선반/외부 상자"** 기준으로 계산합니다.
     - 윗단 상자들은 독립적으로 재계산하지 않고, 드래그 시작 시점의 `relX, relY, relZ` 오프셋을 기준 상자의 새 위치에 그대로 더해 함께 평행 이동시킵니다.

### Task 2. 팝업창 외부(Backdrop) 터치/클릭 시 닫기
- **증상:** 모바일 화면에서 '장 설정'(`#mobile-setup-popup`), '선반 높이'(`#mobile-shelfh-popup`), '상세 조정' 등의 팝업을 연 후 닫기 버튼이 화면 상단에 있거나 멀어 한 손으로 닫기 어려움.
- **요구사항:** 팝업 외부의 반투명 배경 영역 또는 바깥 화면을 터치/클릭하면 열려있는 팝업이 부드럽게 닫히도록 개선.
- **수정 가이드 (`js/app.js` 및 `index.html`):**
  - 바텀시트/팝업 바깥 영역에 백드롭 오버레이 요소(`#popup-backdrop` 등)를 배치하거나, `document.addEventListener('pointerdown', ...)`에서 클릭 타겟이 `.mobile-popup` 내부가 아닐 때 `document.body.classList.remove('mobile-setup-open', 'mobile-shelfh-open')`을 수행하도록 연결.

### Task 3. 사다리꼴(Tapered) 수납함 3D 치수 및 사각뿔대 렌더링 보정
- **요구사항:**
  - `shapeType === 'tapered'` (사다리꼴 형태)로 등록된 수납함:
    1. `wBot`, `dBot` 치수가 상단 치수(`wTop`, `dTop`)와 다르게 명시되어 있으면 실제 치수 그대로 적용.
    2. 만약 `wBot` / `dBot` 치수 정보가 없거나 상단 치수와 같다면, **상단보다 전·후·좌·우 각 0.5cm (5mm) 작게** (즉, `wBot = wTop - 10mm`, `dBot = dTop - 10mm`) 기본 세팅하여 3D 화면상에서 확연한 사다리꼴로 보이게 렌더링.
- **수정 가이드 (`js/presets.js`, `js/scene3d.js`):**
  - `buildStorageBoxMesh` 및 치수 계산 함수에서 `m.shapeType === 'tapered'`일 때:
    ```javascript
    const wTop = m.w;
    const dTop = m.d;
    const wBot = (m.wBot && m.wBot < wTop) ? m.wBot : (wTop - 10);
    const dBot = (m.dBot && m.dBot < dTop) ? m.dBot : (dTop - 10);
    ```
    이 치수로 `createFrustumGeometry(wTop, dTop, wBot, dBot, h)`를 생성하여 사다리꼴 형태를 정확히 시각화.

---

## 🚀 5. 배포 및 테스트 절차

1. **로컬 테스트:**
   - 별도 빌드 명령 없이 브라우저에서 `index.html`을 열거나 VS Code Live Server (`http://127.0.0.1:5500`) 실행.
2. **캐시 버스팅 (Cache Busting):**
   - 코드를 수정하여 배포할 때는 `index.html`의 CSS/JS 호출 쿼리스트링 버전을 증가시킵니다:
     ```html
     <link rel="stylesheet" href="styles.css?v=1104c">
     <script src="js/presets.js?v=1104c"></script>
     <script src="js/scene3d.js?v=1104c"></script>
     <script src="js/app.js?v=1104c"></script>
     ```
3. **깃 커밋 & 배포:**
   - 반드시 변경 내역을 사용자와 확인/승인한 뒤 푸시합니다:
     ```bash
     git add .
     git commit -m "1104c: fix stack drag logic, outside popup close, tapered box default dims"
     git push origin gh-pages
     ```
   - 푸시 완료 후 약 30초 내에 Vercel([https://storage3dplanner.vercel.app](https://storage3dplanner.vercel.app))에 자동 반영됩니다.

---

## 💬 6. 사용자 커뮤니케이션 가이드

- **호칭 및 어조:** 정중하고 친절한 한국어, 전문적인 인테리어/개발 어시스턴트 어조.
- **보고 방식:** 작업 진행 도중 불필요한 중간 잡담을 생략하고, 기능 구현과 테스트가 완료된 후 한 번에 명확하게 요약하여 보고합니다.
- **기술적 용어 사용:** 사용자에게 보고할 때는 'three.js frustum geometry' 같은 내부 엔지니어링 용어 대신 "사다리꼴 수납함의 하단 치수를 상단보다 사방 0.5cm씩 좁혀 실제 제품처럼 보이도록 3D 표현을 다듬었습니다"처럼 직관적인 어휘를 사용합니다.
