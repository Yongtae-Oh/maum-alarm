# maum-alarm — 생체신호 기반 감정 평형 회복 앱

MAUM = 마음상태: 감시(Monitor) · 알림(Alert) · 이해(Understand) · 관리(Manage)
태그라인: "마음이 보내는 첫 번째 신호"

## Run & Operate

- Expo 모바일 앱: `pnpm --filter @workspace/biosense-mobile run dev` (workflow: `artifacts/biosense-mobile: expo`)
- API 서버: `pnpm --filter @workspace/api-server run dev` (workflow: `artifacts/api-server: API Server`, port 8080, path `/api`)
- 피치덱: `pnpm --filter @workspace/mind-alarm-pitch run dev` (workflow: `artifacts/mind-alarm-pitch: web`)
- `pnpm run typecheck` — 전체 타입 검사
- `pnpm --filter @workspace/api-spec run codegen` — OpenAPI → React Query hooks + Zod 스키마 재생성
- `pnpm --filter @workspace/db run push` — DB 스키마 적용 (dev only)
- Required env: `SESSION_SECRET`, `DATABASE_URL`

## Stack

- **Monorepo**: pnpm workspaces, Node.js 24, TypeScript 5.9
- **Mobile**: Expo SDK 53 + Expo Router v6 (`artifacts/biosense-mobile`)
- **API**: Express 5 + Drizzle ORM + PostgreSQL (`artifacts/api-server`)
- **Pitch deck**: React + Vite 17-slide deck (`artifacts/mind-alarm-pitch`)
- **Validation**: Zod v4, drizzle-zod
- **BLE**: react-native-ble-plx (Polar H10 전용, 네이티브 빌드 전용)

## Where things live

```
artifacts/
  biosense-mobile/
    app/
      (tabs)/index.tsx      # 메인 모니터 화면 + DetectionBanner
      (tabs)/log.tsx        # 이벤트 기록
      (tabs)/settings.tsx   # 시나리오 선택 + 임계값 조정
      (tabs)/_layout.tsx    # 탭 바 (native-only 패키지 safe require)
      connect.tsx           # BLE 기기 연결 / 데모 모드 선택
      scenarios.tsx         # 데모 시나리오 전환 모달 (8가지)
      recover.tsx           # 호흡/그라운딩 회복 운동
    context/BLEContext.tsx  # BLE + 데모 시뮬레이션 + 상태 분류
    components/HeartECGAnimation.tsx
    assets/images/icon.png  # 1024×1024 생성됨
  api-server/
    src/routes/             # biosignals, events, recovery, user, insights, simulation
    src/lib/biosignal-simulator.ts  # 핵심 분류 알고리즘
  mind-alarm-pitch/
    src/pages/slides/       # Slide01~17 (DM Sans, #0d0f14 bg, #22d3ee accent)
lib/
  api-spec/openapi.yaml     # API 계약 원본
  db/schema.ts              # Drizzle 스키마
```

## Architecture decisions

- **Expo Go 호환성**: `expo-glass-effect`, `expo-router/unstable-native-tabs`, `expo-symbols`, `react-native-ble-plx`, `react-native-keyboard-controller` 모두 동적 `require` + try-catch 로 안전 폴백 처리 → Expo Go에서 크래시 없이 데모 모드 작동
- **bleAvailable state**: BLE 모듈 import 성공 여부가 아닌 `new BleManager()` 초기화 성공 여부로 결정 (`useState` + try-catch in useEffect)
- **분류 알고리즘**: motion 임계값으로 운동(HR↑ + Motion↑)과 감정 불안(HR↑ + HRV↓ + Motion 낮음) 자동 구별
- **데모 시나리오**: calm / stress / exercise / anxiety_spike / panic_attack / fatigue / sleep / meeting / obsession (9종)
- **DetectionBanner**: 상태 변화 시 spring 애니메이션 배너 + Haptics (네이티브 전용), 3초 후 자동 해제

## Product

- Polar H10 BLE 연결 또는 데모 모드로 HR·HRV·활동량 실시간 모니터링
- stress / anxiety / crisis / obsession(집착) 감지 시 진동 알림 + 배너 표시 + 로컬 알림
- 호흡·그라운딩 회복 운동 제공
- 이벤트 기록 및 피드백 저장
- 17슬라이드 제품 피치덱 (maum-alarm 브랜딩)

## User preferences

- 앱 이름: **maum-alarm** (slug: biosense-mobile)
- Polar H10 구매 후 실기기 테스트 예정 → 이후 추가 개발 논의
- 한국어 UI

## Gotchas

- Expo Go에서 BLE / 푸시알림 / 진동 일부 기능 미지원 → 데모 모드로 모든 UI 체험 가능
- `(tabs)/_layout.tsx`: native-only import는 반드시 try-catch require 사용 (정적 import 금지)
- 아이콘 경로: `assets/images/icon.png` (splash, notification, favicon 모두 동일 파일 참조)
- Metro 번들 에러 시 Expo Go 앱 완전 종료 후 QR 재스캔

## Pointers

- `.local/skills/expo` — Expo 모바일 앱 개발 가이드
- `.local/skills/pnpm-workspace` — 모노레포 구조 및 TypeScript 설정
