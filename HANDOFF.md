# 3D 수납 공간 계획 앱 (StorageFit 3D) 인수인계 문서
> **Claude Code 작업 가이드**  
> 최신 전체 상세 인수인계 내용은 [README.md](README.md)에 상세히 정리되어 있습니다.

## 요약 정보
- **브랜치:** `gh-pages`
- **배포 주소:** [https://storage3dplanner.vercel.app](https://storage3dplanner.vercel.app)
- **원격 저장소:** [https://github.com/ljiwon1116/storage-3d-planner.git](https://github.com/ljiwon1116/storage-3d-planner.git)
- **최신 버전:** `1104b` (2026-11-04)

## 현재 대기 중인 3대 핵심 작업
1. **적층 상자 드래그 버그 (`js/scene3d.js`):** 맨 아래 상자 드래그 시 위에 얹혀진 상자들을 자동으로 함께 묶어 상대 좌표 오프셋으로 이동, Y좌표 폭주 방지
2. **팝업 외부 터치 시 닫기 (`js/app.js`):** `#mobile-setup-popup`, `#mobile-shelfh-popup` 외부 영역 터치/클릭 시 닫힘 처리
3. **사다리꼴 수납함 치수 (`js/presets.js`, `js/scene3d.js`):** 하단 치수 미지정 시 상단 대비 전후좌우 0.5cm(10mm) 작게 자동 적용

자세한 아키텍처 및 상태 구조는 **[README.md](README.md)**를 참조하세요.
