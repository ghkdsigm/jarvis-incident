# 프로덕션 배포 전 체크리스트

생성일: 2025-01-XX
검토 대상: 전체 프로젝트 (DB, 백엔드, 워커, 인프라)

## ✅ 완료된 항목

### 1. 데이터베이스 (PostgreSQL)
- ✅ Prisma 스키마 정의 완료 (`apps/server/prisma/schema.prisma`)
- ✅ 마이그레이션 파일 모두 존재:
  - `20260130043944_init` - 초기 스키마
  - `20260208111110_user_presence` - 사용자 온라인 상태
  - `20260209051500_message_attachments` - 메시지 첨부파일
  - `20260210090000_idea_cards` - 아이디어 카드
  - `20260211100000_add_pulse_report` - Pulse 리포트
  - `20260212132104_add_vector_embeddings` - 벡터 임베딩
  - `20260213000000_add_message_index` - 메시지 인덱스
  - `20260215145606_add_calendar_events` - 캘린더 이벤트
- ✅ Docker entrypoint에서 자동 마이그레이션 실행 (`docker-entrypoint.sh`)
- ✅ 인덱스 최적화: Message, IdeaCard, CalendarEvent에 적절한 인덱스 설정

### 2. 백엔드 API (Fastify)
- ✅ 모든 라우트 구현 완료:
  - `/auth/dev` - 개발용 인증
  - `/rooms` - 방 관리 (CRUD, 멤버, 메시지)
  - `/users` - 사용자 조회
  - `/calendar/events` - 캘린더 이벤트 (CRUD)
  - `/rooms/:roomId/news` - 네이버 뉴스 검색
  - `/rooms/:roomId/cards` - 아이디어 카드
  - `/rooms/:roomId/pulse-report` - Pulse 리포트
  - `/rooms/:roomId/graph` - 지식 그래프
  - `/translate` - 번역
  - `/speech/transcribe` - 음성 인식
  - `/holidays` - 공휴일 조회
  - `/insights` - 인사이트
- ✅ WebSocket Hub 구현 완료 (`apps/server/src/ws/hub.ts`)
  - 실시간 메시지 전송/수정/삭제
  - 방 참가/나가기
  - RTC 시그널링
  - Presence (온라인/오프라인)
- ✅ JWT 인증 플러그인 구현 (`apps/server/src/plugins/auth.ts`)
- ✅ Health check 엔드포인트 (`/health`) - DB/Redis 연결 확인
- ✅ 전역 에러 핸들러 구현
- ✅ Graceful shutdown 구현
- ✅ CORS 설정 (운영 환경에서 특정 도메인만 허용)

### 3. 워커 (AI Worker)
- ✅ BullMQ 큐 컨슈머 구현
- ✅ AI Provider 추상화 (mock/openai)
- ✅ 스트리밍 응답 지원
- ✅ 개인 요청 및 공개 요청 처리
- ✅ 회의록 요약 기능
- ✅ Graceful shutdown 구현

### 4. 인프라 (Docker)
- ✅ Docker Compose 설정 완료
- ✅ Postgres 16-alpine 이미지
- ✅ Redis 7-alpine 이미지
- ✅ Server Dockerfile (Prisma 마이그레이션 포함)
- ✅ Worker Dockerfile
- ✅ Health check 설정 (Postgres)
- ✅ 의존성 관리 (depends_on)

### 5. 환경 변수 관리
- ✅ `apps/server/env.example` - 서버 환경 변수 예시
- ✅ `apps/worker/env.example` - 워커 환경 변수 예시
- ✅ `infra/env.example` - 인프라 환경 변수 예시
- ✅ 환경 변수 검증 로직 (`apps/server/src/lib/env.ts`)
  - 운영 환경에서 JWT_SECRET 최소 32자 검증
  - 필수 환경 변수 체크

### 6. 에러 핸들링
- ✅ Prisma 에러 처리 (P2002 중복 에러)
- ✅ OpenAI API 에러 처리
- ✅ 네이버 API 에러 처리
- ✅ Redis 연결 에러 핸들링
- ✅ DB 연결 에러 핸들링

## ⚠️ 운영 배포 전 필수 확인 사항

### 1. 환경 변수 설정 (CRITICAL)

#### `infra/.env` (Docker Compose)
```bash
# 필수: 운영 환경에서 반드시 변경
POSTGRES_PASSWORD=강력한-비밀번호-설정
JWT_SECRET=최소-32자-이상-매우-강력한-시크릿-키

# 필수: 운영 도메인 설정
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

#### `apps/server/.env` (또는 Docker 환경 변수)
```bash
# 필수
NODE_ENV=production
DATABASE_URL=postgresql://jarvis:비밀번호@postgres:5432/jarvis_chat?schema=public
REDIS_URL=redis://redis:6379
JWT_SECRET=최소-32자-이상-매우-강력한-시크릿-키

# 필수: 운영 도메인 설정
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# 선택: OpenAI API (AI 기능 사용 시)
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TRANSLATE_MODEL=gpt-4o-mini
OPENAI_IDEA_MODEL=gpt-4o-mini

# 선택: 네이버 뉴스 API
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...

# 선택: 공휴일 API
HOLIDAY_API_KEY=...
```

#### `apps/worker/.env` (또는 Docker 환경 변수)
```bash
# 필수
NODE_ENV=production
DATABASE_URL=postgresql://jarvis:비밀번호@postgres:5432/jarvis_chat?schema=public
REDIS_URL=redis://redis:6379

# 필수: AI 기능 사용 시
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# 큐 설정 (서버와 동일하게)
AI_QUEUE_NAME=jarvis_ai_jobs
PUBSUB_CHANNEL=jarvis_room_events
```

### 2. 보안 체크리스트

- [ ] **JWT_SECRET**: 운영 환경에서 최소 32자 이상의 강력한 랜덤 문자열 사용
- [ ] **POSTGRES_PASSWORD**: 강력한 비밀번호 설정
- [ ] **CORS_ORIGIN**: 운영 도메인만 허용 (와일드카드 금지)
- [ ] **개발용 인증 엔드포인트**: `/auth/dev`는 운영 환경에서 비활성화 고려
- [ ] **HTTPS**: 운영 환경에서는 반드시 HTTPS 사용 (Nginx/Cloudflare 등)
- [ ] **방화벽**: 필요한 포트만 개방 (80, 443, 8080)

### 3. 데이터베이스 백업

- [ ] **백업 전략 수립**: 정기적인 DB 백업 설정
- [ ] **백업 복원 테스트**: 백업 파일로 복원 테스트 수행
- [ ] **마이그레이션 롤백 계획**: 문제 발생 시 롤백 절차 준비

### 4. 모니터링 및 로깅

- [ ] **Health Check**: `/health` 엔드포인트 모니터링 설정
- [ ] **로그 수집**: Docker 로그 또는 외부 로그 수집 시스템 연동
- [ ] **에러 알림**: 심각한 에러 발생 시 알림 설정
- [ ] **리소스 모니터링**: CPU, 메모리, 디스크 사용량 모니터링

### 5. 성능 최적화

- [ ] **DB 연결 풀**: Prisma 연결 풀 설정 확인
- [ ] **Redis 연결**: Redis 연결 풀 최적화
- [ ] **캐싱 전략**: 번역 API 캐싱 확인 (이미 구현됨)
- [ ] **Rate Limiting**: API Rate Limiting 고려 (현재 미구현)

### 6. 선택적 기능 설정

다음 기능들은 선택사항이지만, 사용하려면 API 키가 필요합니다:

- [ ] **OpenAI API**: AI 채팅, 번역, 음성 인식, Pulse 리포트, 아이디어 카드 생성
- [ ] **네이버 뉴스 API**: 뉴스 검색 기능
- [ ] **공휴일 API**: 공휴일 조회 기능

## 📋 배포 전 최종 체크리스트

### 사전 준비
- [ ] 모든 환경 변수 설정 완료
- [ ] Docker 이미지 빌드 테스트
- [ ] 로컬에서 Docker Compose로 전체 스택 테스트
- [ ] Health check 엔드포인트 동작 확인

### 배포 시
- [ ] `infra/.env` 파일 생성 및 설정
- [ ] `docker compose up -d` 실행
- [ ] 서비스 상태 확인: `docker compose ps`
- [ ] 로그 확인: `docker compose logs -f`
- [ ] Health check 확인: `curl http://localhost:8080/health`

### 배포 후
- [ ] API 엔드포인트 동작 확인
- [ ] WebSocket 연결 테스트
- [ ] AI 워커 동작 확인 (큐 처리)
- [ ] DB 마이그레이션 상태 확인
- [ ] Redis 연결 확인

## 🔍 발견된 사소한 이슈 (비중요)

### 프론트엔드 TODO
- `apps/desktop/src/components/CalendarView.vue`: 에러 메시지 표시 TODO (기능 동작에는 영향 없음)
- `apps/desktop/src/components/LoginView.vue`: MS360 OAuth 인증 플로우 TODO (현재는 devAuth 사용)

이 항목들은 운영 배포에 필수는 아니지만, 향후 개선 사항으로 고려할 수 있습니다.

## 📝 권장 사항

1. **Rate Limiting 추가**: API 엔드포인트에 Rate Limiting 적용 고려
2. **로깅 강화**: 구조화된 로깅 (JSON 형식) 고려
3. **메트릭 수집**: Prometheus/Grafana 등 메트릭 수집 시스템 연동 고려
4. **알림 시스템**: 에러 발생 시 Slack/Email 알림 연동 고려
5. **백업 자동화**: 정기적인 DB 백업 스크립트 작성

## ✅ 결론

**전체적으로 프로덕션 배포 준비가 잘 되어 있습니다.**

주요 기능들이 모두 구현되어 있고, 에러 핸들링과 Graceful shutdown도 잘 구현되어 있습니다. 
운영 배포 전에 **환경 변수 설정**과 **보안 설정**만 확실히 하면 됩니다.

특히 다음 사항을 반드시 확인하세요:
1. ✅ JWT_SECRET: 최소 32자 이상
2. ✅ POSTGRES_PASSWORD: 강력한 비밀번호
3. ✅ CORS_ORIGIN: 운영 도메인만 허용
4. ✅ NODE_ENV=production 설정

