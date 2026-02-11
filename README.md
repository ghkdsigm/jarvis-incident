# DW-BRAIN (Desktop + Server) - Monorepo

Teams보다 가볍게, “항상 위(Always-on-top)”로 떠있는 데스크톱 채팅 클라이언트와 실시간 동기화 서버/AI 워커를 함께 제공합니다.

## 목표
- **Always-on-top 플로팅 데스크톱 채팅(Electron)**
- 같은 Room 참여자 간 **동일 메시지 스트림 실시간 동기화(WebSocket)**
- `자비스야 ...` 트리거(텍스트/음성 STT 결과)로 **AI가 채팅에 개입(Worker)**
- 서버는 REST + WebSocket, **DB는 Postgres**, 큐/프레즌스는 **Redis**

## 구성(모노레포)
- `apps/server`: Fastify(REST) + WebSocket, Prisma(Postgres), Redis Pub/Sub, BullMQ 큐
- `apps/worker`: AI Worker (BullMQ + Redis Pub/Sub)
- `apps/desktop`: Electron + Vue 3 + Vite + Tailwind (Always-on-top / Mini mode)
- `packages/shared`: 공통 타입/스키마(zod) — 각 앱 `predev`에서 자동 빌드

## 요구사항
- Node.js (npm) 설치
- Docker Desktop(또는 Docker Engine + Compose)
- (선택) Postgres/Redis를 로컬로 직접 띄우는 경우, 해당 서비스 설치

## 빠른 시작 (로컬 개발 권장 플로우)
기본값 기준 서버 포트는 **8080**, WebSocket 경로는 **`/ws`** 입니다.

### 0) 의존성 설치(워크스페이스)
레포 루트에서 1회만 설치합니다.

```bash
npm install
```

### 1) 인프라(Postgres/Redis) 실행
로컬 개발은 **DB/Redis만 도커로 띄우고**, 서버/워커/데스크톱은 로컬에서 실행하는 방식을 권장합니다.

macOS/Linux:

```bash
cd infra
docker compose up -d postgres redis
```


### 2) 서버 준비(Prisma) + 실행
`apps/server`의 `.env.example`을 복사해 `.env`를 만들고, Prisma를 생성/마이그레이션 후 개발 서버를 실행합니다.

macOS/Linux:

```bash
cd apps/server
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```


- API Base: `http://localhost:8080`
- WebSocket: `ws://localhost:8080/ws`

### 3) 워커 실행(AI)
`apps/worker`의 `.env.example`을 복사해 `.env`를 만든 뒤 실행합니다.

macOS/Linux:

```bash
cd apps/worker
npm run dev
```


### 4) 데스크톱 앱 실행
`apps/desktop`에서 `.env.example`을 복사해 `.env`를 만든 뒤 실행합니다.

macOS/Linux:

```bash
cd apps/desktop
npm run dev
```


## 환경변수 요약

### `infra/.env` (도커 인프라)
- `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD`: Postgres 초기 계정/DB
- `JWT_SECRET`: 서버 JWT 서명키(개발 기본값은 변경 권장)

### `apps/server/.env`
- `PORT` (기본 `8080`), `HOST` (기본 `0.0.0.0`)
- `DATABASE_URL`: 예) `postgresql://jarvis:jarvis@localhost:5432/jarvis_chat?schema=public`
- `REDIS_URL`: 예) `redis://localhost:6379`
- `JWT_SECRET`
- `AI_QUEUE_NAME` (기본 `jarvis_ai_jobs`)
- `PUBSUB_CHANNEL` (기본 `jarvis_room_events`)

### `apps/worker/.env`
- `DATABASE_URL`, `REDIS_URL`
- `AI_PROVIDER`: `mock`(기본) 또는 `openai`
- `OPENAI_API_KEY`: `AI_PROVIDER=openai`일 때 필수
- `OPENAI_MODEL`: 기본 `gpt-4o-mini`
- `AI_QUEUE_NAME`, `PUBSUB_CHANNEL` (서버와 동일하게 유지)

### `apps/desktop/.env`
- `VITE_API_BASE`: 기본 `http://localhost:8080`
- `VITE_WS_BASE`: 기본 `ws://localhost:8080/ws`

## OpenAI 키 없이도 동작
- 워커에서 `AI_PROVIDER=mock`이면 **가짜 스트리밍 답변**을 생성합니다.
- 실제 연결은 `AI_PROVIDER=openai` + `OPENAI_API_KEY=...`로 설정하세요.

## 전체를 도커로 실행(간단 배포/검증용)
`infra/docker-compose.yml`에는 **server/worker 서비스도 포함**되어 있습니다(컨테이너 내부는 `NODE_ENV=production`).

```bash
cd infra
docker compose up -d
```

## 운영/보안 메모
- 사내 SSO(OIDC/SAML)는 `apps/server/src/plugins/auth.ts`의 JWT 발급부를 교체하는 방식으로 붙이는 것을 전제로 합니다.
- 항상 듣기 마이크는 정책 이슈가 크므로 **Push-to-talk**를 권장합니다.
- AI 호출은 트리거 기반으로 제한하고, 레이트리밋/감사 로그를 유지하는 것을 권장합니다.

## DBeaver에서 로컬 Postgres(DB) 보기
`infra/docker-compose.yml` 기준으로 Postgres는 로컬에 **5432 포트로 노출**됩니다. (기본 계정/DB는 `jarvis/jarvis`, `jarvis_chat`)

### 연결 정보(기본값)
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `jarvis_chat`
- **Username**: `jarvis`
- **Password**: `jarvis`
- **Schema(선택)**: `public`
- **SSL**: Disable (로컬 기본)

### JDBC URL(필요 시)
- `jdbc:postgresql://localhost:5432/jarvis_chat`

> 참고: 값이 다르면 `infra/.env`의 `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD`를 우선 확인하세요.