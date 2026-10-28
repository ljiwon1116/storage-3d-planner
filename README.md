# 🏡 StorageFit 3D - 옷장·서랍 3D 수납함 배치 시뮬레이터

> 우리 집 옷장이나 서랍의 실제 치수(문설주/경첩 사각지대, 서랍 노출 깊이 등)를 입력하고,  
> 브랜드별 수납함(무인양품, 이케아, 다이소, 루틴랩 등)의 3D 적층 및 배치 가능 여부를 사전에 검증·시뮬레이션하는 웹 애플리케이션입니다.

---

## 🛠️ 기술 스택 (Tech Stack)
- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+), Three.js (r128 CDN), OrbitControls
- **Backend / Serverless:** Vercel Serverless Functions (`api/*.js`)
- **Database:** Neon Serverless PostgreSQL (`@neondatabase/serverless`)
- **Deployment:** GitHub + Vercel (`https://[project-name].vercel.app`)
- **Zero-Build Architecture:** 별도의 Node 번들링 과정 없이 브라우저에서 `index.html`을 바로 열어도 동작하며, Vercel 배포 시 서버리스 API 및 Neon DB가 완전 자동 연동됩니다.

---

## 📁 프로젝트 폴더 구조 (Project Structure)

```
storage-3d-planner/
├── index.html            # 메인 UI 구조 (모바일/PC 스위처, 3D 스테이지, 모바일 하단 탭 바, 모달)
├── styles.css            # 웜톤 테마 및 모바일 상하 분할 뷰(ui-mode-mobile) / PC 플로팅 뷰(ui-mode-pc)
├── schema.sql            # Neon DB 테이블 스키마 정의 (storage_models, saved_combos, shared_plans)
├── package.json          # Vercel 배포 시 @neondatabase/serverless 의존성 설치용
├── vercel.json           # Vercel 정적 라우팅 및 서버리스 함수(api/) 설정
├── README.md             # 프로젝트 개요 및 KIRO 인수인계 문서
│
├── js/
│   ├── presets.js        # 브랜드 카탈로그(무인양품/이케아/다이소/루틴랩), 저장 조합 프리셋, SVG 썸네일 생성기
│   ├── packer.js         # 2D/3D 적층 계산 엔진 (computeStackingY, 간섭 검증, 자동 채우기 알고리즘)
│   ├── scene3d.js        # Three.js 3D 렌더러 (가구/선반/도어/경첩/수납함 렌더링, 레이캐스팅, 드래그 적층)
│   └── app.js            # 메인 앱 컨트롤러 (UI 모드 전환, 탭 네비게이션, Neon DB 동기화, 이벤트 바인딩)
│
└── api/
    ├── _db.js            # Neon PostgreSQL 연결 및 테이블 자동 생성(CREATE TABLE IF NOT EXISTS)
    ├── bootstrap.js      # 앱 구동 시 카탈로그 모델, 저장 조합, 공유 배치도를 일괄 조회하는 엔드포인트
    ├── models.js         # 커스텀 수납함 모델 조회/등록 (GET, POST)
    ├── combos.js         # 저장된 묶음 조합 조회/등록/삭제 (GET, POST, DELETE)
    └── plans.js          # 3D 배치도 단축 링크 공유 저장/불러오기 (GET, POST: ?plan=단축ID)
```

---

## ✨ 핵심 구현 기능 (Key Features)

### 1. 📱 모바일 최적화 Split View (기본값) & 🖥️ PC 뷰 스위처
- 상단 헤더 로고 옆 `[📱 모바일 | 🖥️ PC]` 버튼으로 언제든 인터페이스 즉시 전환.
- **모바일 모드 (`ui-mode-mobile`):**
  - **상단 50%:** 카드 겹침 없는 100% 온전한 3D 가구 뷰포트 (드래그, 줌, 회전, 미니 카메라 HUD).
  - **중앙 하단 탭 바:**
    1. `🚪 가구·치수` (기본 활성): 가구 종류(여닫이 장/슬라이딩 서랍), 내부 치수, 문틀·경첩 폭, 문 개방각도 조절.
    2. `📦 선반·수납함`: 선반 칸 전환, 수납함 추가, 배치 목록, 저장 조합, 자동 채우기.
    3. `📏 선반위치`: 중간 선반 높이 및 두께 조절.
    4. `⚠️ 에러(N)`: 문틀 간섭, 높이 초과 경고 목록 확인 및 3D 하이라이트.
    5. `🔽 접기`: 하단 패널을 접어 3D 전체 화면 모드로 전환.
- **PC 모드 (`ui-mode-pc`):**
  - 넓은 화면에 맞춘 3D 지시선(Leader line) 연결형 선반 콜아웃 및 다중 플로팅 카드.

### 2. 🧱 자동 적층 (Auto-Stacking)
- 수납함을 드래그하여 이미 배치된 다른 수납함 위로 가져가면 바닥에 겹치지 않고 `packer.js`의 `computeStackingY`가 작동해 자동으로 2단, 3단 위로 올라탑니다.
- 수납함 선택 시 뜨는 HUD에서 `➕ 위로 1단 더 쌓기` 버튼으로 동일 규격을 즉시 수직 적층 가능.

### 3. 🚪 여닫이 장 문짝 & 개방각도 시뮬레이션
- `양문형(좌+우)`, `좌여닫이`, `우여닫이` 옵션 지원.
- 문틀 없음(0) 설정 시에도 문 너비가 내부 너비와 같게 유지되며 3D 문짝/경첩/손잡이가 사라지지 않음.
- `🚪 문 개방각도` 버튼 및 슬라이더로 `0°(닫힘) ~ 120°(활짝)`까지 각도 실시간 회전.

### 4. 🗄️ 슬라이딩 서랍 인출 시뮬레이션
- 실제 내부 깊이 vs 최대로 열었을 때 노출되는 깊이(Exposed D) 구분.
- 슬라이더를 통해 서랍이 앞으로 열리는 애니메이션 및 안쪽 미노출 사각지대 시각화.

### 5. 📦 최신 수납함 카탈로그 및 2단계 자동 채우기
- **브랜드 라인업:**
  - 무인양품 (PP 서랍식 케이스, PP 파일박스, 소프트박스 등)
  - 이케아 (SKUBB, VARIERA, KUGGIS 등)
  - 다이소 (시스템 정리함, 모듈형 서랍장 등)
  - **루틴랩 (투명 서랍 3L, 6L, 9L)**
- **2단계 자동 채우기:** 1. 브랜드 선택 → 2. 해당 브랜드 상세 규격 선택 후 조건별 일괄 자동 채우기 실행.

### 6. 🌐 Vercel + Neon DB 클라우드 동기화 & 공유
- Vercel 배포 후 Neon DB 연결 시 상단 배지가 `🟢 Neon DB 연동됨`으로 표시.
- `🔗 링크 공유` 버튼 클릭 시 현재 3D 배치 상태가 Neon DB에 저장되고 단축 링크(`?plan=xxxxxxx`) 생성 및 클립보드 복사.
- 로컬 파일 환경에서도 URL 해시(`?state=...`) 기반 인코딩 공유 지원.

---

## 🤖 KIRO AI 개발 이어가기 가이드 (For KIRO AI Agent)

KIRO AI로 이 프로젝트를 이어서 작업할 때는 다음 원칙을 준수하세요:

1. **상태 관리 일원화:**
   - 전역 상태는 `js/app.js` 내부의 `state` 객체에서 일괄 관리됩니다.
   - 모바일 모드와 PC 모드는 동일한 DOM 요소(`input`, `select` 등)를 공유하며 CSS 클래스(`body.ui-mode-mobile` / `body.ui-mode-pc`)로 레이아웃만 변경됩니다.
2. **3D 렌더링 동기화:**
   - 뷰포트 크기 변경이나 레이아웃 전환 시 반드시 `window.Scene3DManager.resize()`를 호출해야 카메라 비율과 렌더러가 올바르게 업데이트됩니다.
3. **새 수납함 추가 시:**
   - 기본 모델은 `js/presets.js`의 `window.DEFAULT_STORAGE_MODELS`에 추가하세요.
   - 사용자 등록 커스텀 모델은 `localStorage` 및 `POST /api/models`를 통해 Neon DB에 영구 반영됩니다.
