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

## 폴더 구조(요약) + 역할
> 아래 트리는 **git에 추적되는 소스 기준**으로 정리했습니다. (`node_modules/`, `dist/` 같은 의존성/빌드 산출물은 제외)

```text
.
├─ apps/
│  ├─ server/                     # REST + WebSocket API 서버
│  │  ├─ src/
│  │  │  ├─ routes/               # REST API 라우트 (calendar, devAuth, holidays, insights, news, rooms, speech, translate, users)
│  │  │  ├─ ws/                   # WebSocket 허브 (hub.ts)
│  │  │  ├─ plugins/              # Fastify 플러그인 (auth.ts)
│  │  │  ├─ lib/                   # 공통 라이브러리 (env, prisma, queues, redis)
│  │  │  └─ index.ts               # 서버 엔트리포인트
│  │  ├─ prisma/                  # Prisma schema + migrations
│  │  ├─ Dockerfile               # 서버 컨테이너 이미지 빌드
│  │  ├─ docker-entrypoint.sh     # 컨테이너 엔트리포인트
│  │  └─ env.example              # 환경변수 예제
│  ├─ worker/                     # AI 워커(BullMQ consumer)
│  │  ├─ src/
│  │  │  ├─ lib/                  # 워커 라이브러리 (agentAi, agentTools, aiProvider, embeddings, env, prisma, redis)
│  │  │  └─ index.ts              # 워커 엔트리포인트
│  │  ├─ Dockerfile               # 워커 컨테이너 이미지 빌드
│  │  └─ env.example              # 환경변수 예제
│  └─ desktop/                    # Electron 데스크톱 앱(UI)
│     ├─ electron/                # Electron main/preload 프로세스 (main.cjs, main.ts, preload.cjs)
│     ├─ src/
│     │  ├─ api/                  # 서버 통신 (http.ts, ws.ts)
│     │  ├─ components/           # Vue 컴포넌트 (CalendarView, ChatPanel, LoginView, RoomList, TopBar, ui/)
│     │  ├─ stores/               # 상태관리 (calendar, session, theme, window)
│     │  ├─ utils/                # 유틸리티 (pulseToSpec/)
│     │  ├─ assets/               # 정적 자산 (fonts, video)
│     │  ├─ App.vue               # 루트 컴포넌트
│     │  └─ main.ts               # 앱 엔트리포인트
│     ├─ electron-builder.json    # Electron 빌드 설정
│     ├─ vite.config.ts           # Vite 설정
│     ├─ tailwind.config.js       # Tailwind CSS 설정
│     └─ package.json
├─ packages/
│  └─ shared/                     # 공통 타입/유틸(앱들에서 공용 import)
│     ├─ src/
│     │  └─ index.ts              # 공통 타입/스키마 정의
│     └─ package.json
├─ infra/                         # 로컬/배포용 인프라
│  ├─ docker-compose.yml          # 로컬 개발용 docker compose
│  ├─ docker-compose.coolify.yml  # Coolify 배포용 docker compose
│  └─ env.example                 # 인프라 환경변수 예제
├─ docs/                          # 개발/배포 문서
│  ├─ AWS_DEPLOYMENT.md
│  ├─ COOLIFY_AWS_EC2_GITHUB_CICD.md
│  └─ LOCAL_AND_DEPLOY.md
├─ package.json                   # npm workspaces + 루트 스크립트
├─ PRODUCTION_CHECKLIST.md        # 프로덕션 체크리스트
└─ README.md
```

### 디렉터리 역할 상세
- **`apps/server`**: 메인 백엔드
  - **REST API**: `apps/server/src/routes/*`
  - **WebSocket 허브/브로드캐스트**: `apps/server/src/ws/hub.ts`
  - **인증/토큰(JWT) 플러그인**: `apps/server/src/plugins/auth.ts`
  - **DB(Prisma)**: `apps/server/prisma/schema.prisma` (+ `migrations/`)
- **`apps/worker`**: AI/백그라운드 작업 처리
  - **큐 컨슈머(BullMQ)**로 작업을 받아 처리하고, **Redis Pub/Sub** 등으로 이벤트를 퍼블리시
  - **AI Provider 추상화**: `apps/worker/src/lib/aiProvider.ts`
- **`apps/desktop`**: Always-on-top 데스크톱 클라이언트
  - **Electron 메인/프리로드**: `apps/desktop/electron/*`
  - **Vue 화면/컴포넌트**: `apps/desktop/src/components/*`
  - **서버 통신(HTTP/WS)**: `apps/desktop/src/api/*`
  - **상태관리**: `apps/desktop/src/stores/*`
- **`packages/shared`**: 공통 코드(타입/스키마/유틸) 모음 — 여러 앱에서 동일하게 import
- **`infra`**: Postgres/Redis 및(옵션) server/worker까지 포함한 docker compose 실행 스펙
- **`docs`**: 로컬 개발/배포 관련 문서 (예: `docs/LOCAL_AND_DEPLOY.md`)

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
npm run prisma:generate
npm run prisma:migrate
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

## 빌드 (CI/CD 및 로컬 검증)

### Desktop 앱 빌드
Desktop 앱을 빌드하기 전에 shared 패키지를 먼저 빌드해야 합니다.

```bash
# 루트 디렉토리에서
npm ci
npm run -w @jarvis/shared build
npm run -w @jarvis/desktop build
```

빌드 결과물은 `apps/desktop/release/` 디렉토리에 생성됩니다.

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


#EC2 접속 (터미널로 들어가기)
Windows PowerShell에서 접속
ssh -i "C:\Users\ghkdsigm\Desktop\jarvis-key.pem" ubuntu@54.66.155.158

#빌드 결과물을 EC2로 업로드 (scp)
#공백 문제 피하려고 파일명 먼저 바꾸는 걸 추천.
Rename-Item "G:\workspace1\jarvis-incident\apps\desktop\release\JarvisChat Setup 0.1.0.exe" "JarvisChat-Setup-0.1.0.exe"

#업로드:
scp -i "C:\Users\ghkdsigm\Desktop\jarvis-key.pem" `
  "G:\workspace1\jarvis-incident\apps\desktop\release\JarvisChat-Setup-0.1.0.exe" `
  ubuntu@54.66.155.158:/home/ubuntu/

#EC2에서 다운로드 폴더로 이동
sudo mkdir -p /var/www/download
sudo mv /home/ubuntu/JarvisChat-Setup-0.1.0.exe /var/www/download/
sudo ls -lh /var/www/download



############################
A. 로컬 빌드 → EC2에 올려서 배포 (가장 빠른 현실 플로우)
1) Windows에서 exe 빌드
cd G:\workspace1\jarvis-incident\apps\desktop
npm ci
npm run build


결과물:
apps\desktop\release\JarvisChat Setup 0.1.0.exe

2) 빌드 결과물을 EC2로 업로드 (scp)

공백 문제 피하려고 파일명 먼저 바꾸는 걸 추천.

Rename-Item "G:\workspace1\jarvis-incident\apps\desktop\release\JarvisChat Setup 0.1.0.exe" "JarvisChat-Setup-0.1.1.exe"


업로드:

scp -i "C:\Users\ghkdsigm\Desktop\jarvis-key.pem" `
  "G:\workspace1\jarvis-incident\apps\desktop\release\JarvisChat-Setup-0.1.1.exe" `
  ubuntu@54.66.155.158:/home/ubuntu/

3) EC2 접속 (터미널로 들어가기)
Windows PowerShell에서 접속
ssh -i "C:\Users\ghkdsigm\Desktop\jarvis-key.pem" ubuntu@54.66.155.158

4) EC2에서 다운로드 폴더로 이동
sudo mkdir -p /var/www/download
sudo mv /home/ubuntu/JarvisChat-Setup-0.1.1.exe /var/www/download/
sudo ls -lh /var/www/download

5) sudo rm /var/www/download/JarvisChat-Setup-0.1.0.exe

이렇게 기존 0.1.0 버전은 지우면된다.

### 여기 위까지가 일렉트론 새배포

5) 9000 포트 다운로드 서버(nginx) “항상 켜두기”

너 지금은 nginx로 9000 리슨 중이니까, systemd에 의해 자동으로 올라옴(=항상 켜짐).

확인:

sudo systemctl enable nginx
sudo systemctl restart nginx
sudo ss -lntp | grep :9000

6) 다운로드 링크

보안그룹에서 9000 TCP 인바운드 허용된 상태면:

http://54.66.155.158:9000/JarvisChat-Setup-0.1.0.exe



#### 일렉트론 개발모드
컨트롤 시프트 i










### 신규

✅ 최종 구조 (가장 단순 + 안정적)

다운로드 페이지 버튼은 항상:

http://54.66.155.158:9000/DW-BRAIN-Setup.exe


버전 번호는 파일명에 안 넣는다.
항상 같은 파일명으로 덮어쓰기 한다.

📦 매번 빌드/배포 루틴 (Latest 덮어쓰기 방식)
1️⃣ 로컬 빌드
cd G:\workspace1\jarvis-incident\apps\desktop
npm run build


생성 파일:

JarvisChat Setup 0.1.0.exe

2️⃣ 파일명을 “고정 이름”으로 변경 (버전 제거)
Rename-Item `
"G:\workspace1\jarvis-incident\apps\desktop\release\JarvisChat Setup 0.1.0.exe" `
"DW-BRAIN-Setup.exe"


👉 앞으로는 항상 이 이름 사용

3️⃣ EC2로 업로드 (덮어쓰기)
scp -i "C:\Users\ghkdsigm\Desktop\jarvis-key.pem" `
"G:\workspace1\jarvis-incident\apps\desktop\release\DW-BRAIN-Setup.exe" `
ubuntu@54.66.155.158:/home/ubuntu/

4️⃣ EC2에서 다운로드 폴더로 이동 (덮어쓰기)
sudo mv -f /home/ubuntu/DW-BRAIN-Setup.exe /var/www/download/DW-BRAIN-Setup.exe


-f 옵션 = 기존 파일 있으면 강제로 덮어쓰기

5️⃣ 끝

다운로드 페이지 버튼은 항상:

http://54.66.155.158:9000/DW-BRAIN-Setup.exe



### 맥용 배포
방법 A (추천): GitHub에 “비밀값 5개”만 등록하면 끝
1) GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret
2) 아래 5개를 그대로 이름 맞춰서 추가:
CSC_LINK: DeveloperID.p12를 base64로 만든 문자열
CSC_KEY_PASSWORD: 그 p12 비번
APPLE_ID: 애플 로그인 이메일
APPLE_APP_SPECIFIC_PASSWORD: 애플 “앱 전용 비번”
APPLE_TEAM_ID: 팀 ID
3) 그 다음 태그만 푸시:
desktop-v0.1.0 같은 태그를 만들고 푸시하면 CI가 돌아가고,
결과로 mac용 .dmg/.app가 아티팩트로 생성돼.