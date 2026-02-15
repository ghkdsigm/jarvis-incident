# Coolify + AWS EC2 + GitHub 자동배포(CI/CD) — Jarvis Incident (최소비용)

이 레포는 **server/worker/postgres/redis**를 `infra/docker-compose.yml`로 한 번에 띄우는 구성이며, 운영에서도 **단일 EC2 1대**로 비용을 최소화할 수 있습니다.

## 0) 배포 대상/구성 요약
- **배포 대상**: `apps/server`(API+WS), `apps/worker`(BullMQ consumer)
- **인프라**: Postgres 16, Redis 7 (둘 다 컨테이너로 같은 EC2에서 실행)
- **중요**: 서버 컨테이너는 시작 시 DB 마이그레이션을 자동 실행합니다.
  - `apps/server/docker-entrypoint.sh`에서 `npx prisma migrate deploy` 수행

## 1) AWS에서 “가장 저렴한” EC2 구성(권장)
- **인스턴스**: t3a.small(amd64) 또는 t4g.small(arm64) 권장 (Coolify + DB + 빌드까지 1GB는 빡빡한 편)
- **스토리지(EBS)**: gp3 30GB (DB 볼륨/이미지/로그 고려)
- **보안그룹 Inbound**
  - 22(SSH): 내 IP만
  - 80/443: 0.0.0.0/0
  - (권장) 5432/6379는 열지 않기

## 2) EC2에 Coolify 설치
- Coolify는 Docker 기반이라 EC2에 Docker가 설치되어 있어야 합니다.
- 설치는 Coolify **공식 문서의 최신 설치 스크립트**를 따르세요. (버전별로 커맨드/포트가 달라질 수 있음)

## 3) Coolify에서 GitHub 연동(자동배포 트리거)
- Coolify → **Sources**에서 GitHub 연결
  - GitHub App 또는 Personal Access Token(PAT)로 연결
- 연결 후 프로젝트 생성 시 **Webhook**이 설정되어 `main`(또는 지정 브랜치) push마다 자동 배포됩니다.

## 4) Coolify에 Docker Compose 앱으로 올리기 (가장 간단/저렴)
### 옵션 A) 기존 compose 그대로 사용
- Compose 파일: `infra/docker-compose.yml`
- Base directory(작업 디렉터리): `infra/`
  - 이 레포 compose는 `build.context: ..` 를 사용하므로 base directory를 `infra/`로 잡는 게 안전합니다.

### 옵션 B) 운영용(권장) — DB/Redis 포트 미노출 compose 사용
- Compose 파일: `infra/docker-compose.coolify.yml`
- Base directory: `infra/`

## 5) Coolify에 환경변수(Secrets) 설정
Compose에서 사용하는 값(운영에서는 반드시 변경):
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `JWT_SECRET` (최소 32자 이상 강력한 랜덤)
- `CORS_ORIGIN` (운영 도메인만, 콤마로 여러 개 가능)

선택(기능 사용 시):
- `OPENAI_API_KEY` (+ 필요 시 모델/베이스 URL)
- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`
- `HOLIDAY_API_KEY`

## 6) 도메인/SSL
- Coolify에서 server 서비스에 **도메인**을 붙이고 **Let’s Encrypt**로 SSL을 켭니다.
- server는 내부적으로 `8080`을 사용합니다. (Compose의 `PORT=8080`)

## 7) 배포 후 확인(최소)
- `GET /health` 확인 (DB/Redis 연결)
- WebSocket: `wss://<domain>/ws` 연결 확인
- Worker: 큐 처리 로그 확인 (테스트는 채팅에 “자비스야 ...” 메시지)

## 8) 백업(최소비용)
- EC2 내부 Postgres를 쓰는 경우:
  - 주기적 `pg_dump`를 파일로 저장 후, (선택) S3로 업로드
  - 또는 EBS 스냅샷(단순하지만 복구 절차를 꼭 연습)


