# DW-BRAIN 로컬 테스트 & 배포 가이드

## 1. 프로젝트 분석 요약

### 1.1 프로젝트 개요
- **이름**: DW-BRAIN (Jarvis Incident Chat)
- **역할**: Always-on-top 데스크톱 채팅 + 실시간 동기화 + "자비스야" 트리거 AI 개입
- **구성**: 모노레포 (server / worker / desktop / shared)

### 1.2 앱별 역할

| 앱 | 기술 스택 | 역할 |
|----|-----------|------|
| **server** | Fastify, Prisma(Postgres), Redis, BullMQ, WebSocket | REST API, JWT 인증, 방/메시지/멤버 CRUD, WebSocket 실시간 동기화, AI 작업 큐 적재 |
| **worker** | BullMQ, Redis, (Mock/OpenAI) | 큐에서 AI 작업 소비, 스트리밍 응답 생성 후 Redis Pub/Sub로 방에 전파 |
| **desktop** | Electron, Vue 3, Vite, Tailwind | 플로팅 채팅 UI, 로그인(개발용 `/auth/dev`), 방 목록/채팅/멤버, WebSocket 구독 |
| **shared** | TypeScript, Zod | 공통 타입/스키마, 각 앱에서 import |

### 1.3 데이터 흐름
1. **데스크톱** → `POST /auth/dev` 로 개발 로그인 → JWT 발급
2. **데스크톱** → `GET /rooms`, `POST /rooms` 로 방 목록/생성
3. **데스크톱** → WebSocket `/ws` 연결 → 같은 방 참여자와 메시지 실시간 동기화
4. **채팅에서 "자비스야 ..."** → 서버가 AI 작업을 BullMQ 큐에 넣음 → **워커**가 처리 후 Redis Pub/Sub로 방에 이벤트 → 데스크톱이 WebSocket으로 수신해 메시지 표시

### 1.4 DB 스키마 요약
- **User**: id, email, name, isOnline, lastSeenAt
- **Room** / **RoomMember**: 방 생성·멤버 관리
- **Message**: roomId, senderType, senderUserId, content
- **AiRequest**: AI 호출 이력
- **IdeaCard**: 방별 아이디어 카드(수동/주간 AI), 그래프 등

---

## 2. 로컬에서 채팅 테스트하기 (DB 포함)

### 2.0 사전 요구사항
- **Node.js** (v18+ 권장) 및 **npm**
- **Docker Desktop** (또는 Docker Engine + Docker Compose) — Postgres/Redis용

### 2.1 1단계: 의존성 설치 (한 번만)
레포 **루트**에서:

```powershell
cd <repo-root>\jarvis-incident
npm install
```

### 2.2 2단계: DB·Redis 띄우기 (Docker)
로컬에서 서버/워커/데스크톱은 직접 실행하고, **Postgres와 Redis만 Docker**로 띄우는 방식을 권장합니다.

```powershell
cd <repo-root>\jarvis-incident\infra
copy .env.example .env
docker compose up -d postgres redis
```

- Postgres: `localhost:5432`, 기본 계정 `jarvis` / 비밀번호 `jarvis`, DB `jarvis_chat`
- Redis: `localhost:6379`

DB가 준비될 때까지 몇 초 기다린 뒤 다음 단계로 진행합니다.

### 2.3 3단계: 서버 설정 및 DB 마이그레이션
```powershell
cd <repo-root>\jarvis-incident\apps\server
copy .env.example .env
npx prisma generate
npx prisma migrate deploy
```

- `prisma migrate deploy`: 기존 마이그레이션(init, user_presence, idea_cards)을 DB에 적용해 테이블을 최신 상태로 맞춥니다.
- 이미 같은 DB를 쓰고 있었다면 `migrate dev` 대신 `migrate deploy`로 적용만 해도 됩니다.

서버 실행:

```powershell
npm run dev
```

- API: `http://localhost:8080`
- WebSocket: `ws://localhost:8080/ws`
- `GET http://localhost:8080/health` 로 서버 상태 확인 가능

### 2.4 4단계: 워커 실행 (AI 응답용)
다른 터미널에서:

```powershell
cd <repo-root>\jarvis-incident\apps\worker
copy .env.example .env
npm run dev
```

- `.env`에서 `AI_PROVIDER=mock` 이면 **OpenAI 키 없이** 가짜 스트리밍 응답으로 동작합니다.
- 실제 GPT 쓰려면 `AI_PROVIDER=openai`, `OPENAI_API_KEY=sk-...` 설정.

### 2.5 5단계: 데스크톱 실행
또 다른 터미널에서:

```powershell
cd <repo-root>\jarvis-incident\apps\desktop
copy .env.example .env
npm run dev
```

- `.env` 기본값: `VITE_API_BASE=http://localhost:8080`, `VITE_WS_BASE=ws://localhost:8080/ws`
- 데스크톱 앱이 뜨면 **개발 로그인**(이메일/이름 입력) 후 방 생성·채팅 테스트 가능

### 2.6 채팅 테스트 체크리스트
1. 데스크톱에서 로그인 → 방 목록 보임
2. 방 생성 또는 기존 방 입장
3. 메시지 입력 후 전송 → 같은 방에서 메시지가 보임 (WebSocket 동기화)
4. **"자비스야 [질문]"** 형태로 입력 → 워커가 처리 후 봇 메시지로 응답이 오는지 확인

### 2.7 DB가 “제대로 안 되어 있다”고 느껴질 때
- **증상**: 서버 기동 시 Prisma/DB 관련 에러
  - **해결**: `apps/server`에서 `npx prisma migrate deploy` 한 번 더 실행. 그래도 실패하면 `npx prisma migrate status`로 마이그레이션 상태 확인.
- **증상**: 테이블/컬럼 없다는 에러
  - **해결**: 마이그레이션 파일은 있는데 적용이 안 된 경우. `migrate deploy` 또는 (개발 DB 리셋 가능할 때만) `npx prisma migrate reset` 후 다시 `migrate deploy`.
- **증상**: Redis 연결 실패
  - **해결**: `infra`에서 `docker compose up -d redis` 확인, 서버/워커 `.env`의 `REDIS_URL=redis://localhost:6379` 확인.

---

## 3. 배포 방법

### 3.1 옵션 A: Docker Compose로 전체 실행 (가장 간단)
서버·워커·Postgres·Redis를 한 번에 띄워서 “실서버와 비슷한 환경”으로 검증할 때 적합합니다.

```powershell
cd <repo-root>\jarvis-incident\infra
copy .env.example .env
docker compose up -d
```

- **postgres**, **redis**, **server**, **worker** 가 모두 컨테이너로 실행됩니다.
- API/WS: `http://localhost:8080`, `ws://localhost:8080/ws`
- 데스크톱만 로컬에서 띄우고, `.env`에 `VITE_API_BASE=http://localhost:8080`, `VITE_WS_BASE=ws://localhost:8080/ws` 로 접속해 테스트할 수 있습니다.

**주의**: Docker Compose의 **server** 서비스는 올릴 때 이미지 빌드하면서 Prisma generate·빌드를 하므로, **DB 마이그레이션**은 보통 다음 중 하나로 처리합니다.

1. **서버 컨테이너 안에서 한 번 실행**  
   예: `docker compose run --rm server npx prisma migrate deploy` (실제 서비스 이름과 경로는 `docker-compose.yml` 기준으로 조정)
2. 또는 **컨테이너 시작 시 스크립트**에서 `prisma migrate deploy` 실행하도록 Dockerfile/entrypoint 수정

현재 `apps/server/Dockerfile`은 `CMD ["node", "apps/server/dist/index.js"]` 만 있으므로, **첫 배포 전에** 수동으로 한 번 마이그레이션을 적용해 두거나, Dockerfile에 `RUN npx prisma migrate deploy` 또는 entrypoint 스크립트를 추가하는 편이 안전합니다.

### 3.2 옵션 B: 서버/워커만 배포 (DB/Redis는 별도)
- **Postgres / Redis**는 클라우드 매니지드 서비스(AWS RDS, ElastiCache, 또는 VM에 직접 설치)에 두고,
- **server** / **worker**만 VM이나 컨테이너로 배포하는 방식입니다.

절차 요약:

1. **DB**: Postgres 생성 후 접속 URL 확보. (선택) 마이그레이션은 로컬에서 `DATABASE_URL`만 원격으로 바꿔서 `npx prisma migrate deploy` 실행.
2. **Redis**: 인스턴스 생성 후 `REDIS_URL` 확보.
3. **서버**: `apps/server`에서 `npm run build` → `node dist/index.js` 또는 Docker 이미지로 실행. 환경변수에 `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` 등 설정.
4. **워커**: `apps/worker`에서 빌드 후 동일한 `DATABASE_URL`, `REDIS_URL`, `AI_QUEUE_NAME`, `PUBSUB_CHANNEL` 설정하고 실행.
5. **데스크톱**:  
   - 배포된 서버 URL에 맞게 `VITE_API_BASE`, `VITE_WS_BASE` 설정 후  
   - `npm run build` → `electron-builder` 등으로 설치용 패키지(exe 등) 생성해 배포.

### 3.3 데스크톱 앱 배포 (Electron)
- **대상**: 사내 사용자에게 exe(Windows) 등 설치 파일 배포
- **방법**: `apps/desktop`에서 `npm run build` (Vite 빌드 + electron-builder 실행).  
- **주의**: 빌드 시점의 `VITE_API_BASE` / `VITE_WS_BASE`가 설치된 앱에 박히므로, 배포 서버 주소를 **빌드 전** `.env` 또는 빌드 스크립트에서 지정해야 합니다.

---

## 4. 요약

| 목적 | 작업 |
|------|------|
| **로컬에서 채팅 테스트** | infra에서 Docker로 postgres+redis → server에서 prisma generate + migrate deploy + npm run dev → worker/desktop 각각 npm run dev |
| **DB “안 되어 있음”** | `apps/server`에서 `npx prisma migrate deploy` 실행해 마이그레이션 적용 |
| **간단한 전체 배포/검증** | infra에서 `docker compose up -d` (필요 시 server 기동 전/후에 migrate deploy 한 번 실행) |
| **실제 운영 배포** | DB/Redis는 매니지드 또는 VM, server/worker는 빌드 후 컨테이너/VM에서 실행, 데스크톱은 Electron 빌드로 exe 배포 |

추가로 **Jira Issue ID**가 있으면 커밋 메시지에 `Related to: #TEPR-xx` 형태로 넣으면 됩니다.
