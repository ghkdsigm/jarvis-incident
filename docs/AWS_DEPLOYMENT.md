# AWS 운영 배포 가이드 (Cloudflare + EC2)

이 문서는 Jarvis Incident Chat 시스템을 AWS EC2와 Cloudflare를 사용하여 비용 효율적으로 운영 배포하는 방법을 설명합니다.

## 목차
1. [아키텍처 개요](#아키텍처-개요)
2. [비용 최적화 전략](#비용-최적화-전략)
3. [사전 준비사항](#사전-준비사항)
4. [AWS 리소스 설정](#aws-리소스-설정)
5. [EC2 인스턴스 설정](#ec2-인스턴스-설정)
6. [애플리케이션 배포](#애플리케이션-배포)
7. [Cloudflare 설정](#cloudflare-설정)
8. [모니터링 및 유지보수](#모니터링-및-유지보수)
9. [예상 비용](#예상-비용)

---

## 아키텍처 개요

```
[사용자] 
  ↓
[Cloudflare] (DNS, SSL, CDN, DDoS 보호)
  ↓
[EC2 Instance] (t3.micro 또는 t3.small)
  ├─ Server (Fastify + WebSocket)
  ├─ Worker (BullMQ + AI)
  ├─ PostgreSQL (Docker)
  └─ Redis (Docker)
```

**단일 EC2 인스턴스 구성**:
- 모든 서비스를 한 대의 EC2에서 실행 (비용 절감)
- Docker Compose로 서비스 관리
- Cloudflare로 SSL/TLS 및 보안 처리

---

## 비용 최적화 전략

### 1. EC2 인스턴스 선택
- **권장**: `t3.micro` (1 vCPU, 1GB RAM) 또는 `t3.small` (2 vCPU, 2GB RAM)
  - **t3.micro**: 월 약 $7.5 (750시간 기준)
  - **t3.small**: 월 약 $15 (750시간 기준)
- **예약 인스턴스**: 1년 약정 시 30-40% 할인 가능

### 2. 스토리지
- **EBS 볼륨**: gp3 (최신) 또는 gp2
  - 20GB gp3: 월 약 $1.6
  - 20GB gp2: 월 약 $2

### 3. 네트워크
- **Elastic IP**: 무료 (인스턴스에 연결된 경우)
- **데이터 전송**: 
  - Cloudflare 사용 시 대부분 무료 (Cloudflare → EC2는 무료)
  - EC2 → 인터넷: 1GB당 $0.09

### 4. Cloudflare
- **무료 플랜**: DNS, SSL, 기본 DDoS 보호 무료
- **Pro 플랜** ($20/월): 고급 보안 기능 (선택사항)

### 5. 데이터베이스
- **옵션 A**: EC2 내부 Docker로 PostgreSQL 실행 (권장, 비용 절감)
- **옵션 B**: AWS RDS (월 $15+ 시작, 더 안정적이지만 비용 증가)

### 6. Redis
- **옵션 A**: EC2 내부 Docker로 Redis 실행 (권장, 비용 절감)
- **옵션 B**: AWS ElastiCache (월 $15+ 시작)

**예상 총 비용 (t3.micro + EC2 내부 DB/Redis)**:
- EC2: $7.5/월
- EBS: $2/월
- 데이터 전송: $1-2/월
- **총계: 약 $10-12/월**

---

## 사전 준비사항

1. **AWS 계정** 생성 및 IAM 사용자 설정
2. **도메인** 구매 (예: example.com)
3. **Cloudflare 계정** 생성
4. **SSH 키 페어** 생성 (EC2 접속용)
5. **환경 변수 값** 준비:
   - `JWT_SECRET` (최소 32자)
   - `OPENAI_API_KEY` (선택사항)
   - `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` (선택사항)
   - `HOLIDAY_API_KEY` (선택사항)

---

## AWS 리소스 설정

### 1. VPC 및 보안 그룹 생성

#### VPC (기본 VPC 사용 가능)
기본 VPC를 사용하거나 새로 생성:
- CIDR: `10.0.0.0/16` (기본값)

#### 보안 그룹 생성
1. **EC2 보안 그룹** (`jarvis-sg`)
   - **인바운드 규칙**:
     - SSH (22): 내 IP만 허용
     - HTTP (80): Cloudflare IP만 허용 (또는 임시로 0.0.0.0/0)
     - HTTPS (443): Cloudflare IP만 허용 (또는 임시로 0.0.0.0/0)
   - **아웃바운드 규칙**: 모두 허용

2. **Cloudflare IP 범위 확인**
   ```bash
   # Cloudflare IPv4 IP 범위 다운로드
   curl https://www.cloudflare.com/ips-v4
   ```
   이 IP 범위를 보안 그룹에 추가 (또는 Cloudflare 프록시 사용 시 자동 처리)

### 2. EC2 인스턴스 생성

1. **AMI 선택**: Amazon Linux 2023 또는 Ubuntu 22.04 LTS
2. **인스턴스 타입**: `t3.micro` 또는 `t3.small`
3. **키 페어**: 기존 키 페어 선택 또는 새로 생성
4. **네트워크 설정**:
   - VPC: 기본 VPC 또는 생성한 VPC
   - 서브넷: 퍼블릭 서브넷
   - 자동 할당 퍼블릭 IP: 활성화
   - 보안 그룹: `jarvis-sg` 선택
5. **스토리지**: 20GB gp3
6. **태그**: `Name: jarvis-server`
7. **인스턴스 시작**

### 3. Elastic IP 할당 (선택사항)

1. Elastic IP 생성
2. EC2 인스턴스에 연결
3. 이 IP를 Cloudflare DNS에 등록

---

## EC2 인스턴스 설정

### 1. SSH 접속

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
# 또는 Ubuntu의 경우
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 2. 시스템 업데이트

**Amazon Linux 2023**:
```bash
sudo dnf update -y
```

**Ubuntu**:
```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Docker 및 Docker Compose 설치

**Amazon Linux 2023**:
```bash
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
# 재로그인 필요

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**Ubuntu**:
```bash
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
# 재로그인 필요
```

### 4. Git 설치 및 코드 클론

```bash
# Amazon Linux
sudo dnf install -y git

# Ubuntu
sudo apt install -y git

# 프로젝트 클론
cd /opt
sudo git clone https://github.com/your-org/jarvis-incident.git
sudo chown -R ec2-user:ec2-user jarvis-incident  # 또는 ubuntu:ubuntu
cd jarvis-incident
```

### 5. 환경 변수 설정

```bash
cd /opt/jarvis-incident/infra
cp env.example .env
nano .env  # 또는 vi .env
```

`.env` 파일 내용:
```bash
# PostgreSQL
POSTGRES_DB=jarvis_chat
POSTGRES_USER=jarvis
POSTGRES_PASSWORD=your-secure-password-here

# JWT
JWT_SECRET=your-very-long-and-secure-jwt-secret-minimum-32-characters

# OpenAI (선택사항)
OPENAI_API_KEY=sk-...

# Naver API (선택사항)
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...

# Holiday API (선택사항)
HOLIDAY_API_KEY=...

# CORS (운영 환경)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# NODE_ENV
NODE_ENV=production
```

### 6. Docker Compose로 서비스 시작

```bash
cd /opt/jarvis-incident/infra
docker compose up -d
```

서비스 상태 확인:
```bash
docker compose ps
docker compose logs -f
```

### 7. 방화벽 설정 (필요 시)

**Amazon Linux 2023 (firewalld)**:
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

**Ubuntu (ufw)**:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 애플리케이션 배포

### 1. 자동 배포 스크립트 생성

`/opt/jarvis-incident/deploy.sh` 생성:

```bash
#!/bin/bash
set -e

cd /opt/jarvis-incident

echo "Pulling latest code..."
git pull origin main

echo "Rebuilding Docker images..."
cd infra
docker compose build --no-cache

echo "Restarting services..."
docker compose down
docker compose up -d

echo "Waiting for services to be ready..."
sleep 10

echo "Checking service health..."
curl -f http://localhost:8080/health || exit 1

echo "Deployment complete!"
```

실행 권한 부여:
```bash
chmod +x /opt/jarvis-incident/deploy.sh
```

### 2. 수동 배포

```bash
cd /opt/jarvis-incident
git pull
cd infra
docker compose build
docker compose up -d
```

### 3. 로그 확인

```bash
# 모든 서비스 로그
docker compose logs -f

# 특정 서비스 로그
docker compose logs -f server
docker compose logs -f worker
docker compose logs -f postgres
docker compose logs -f redis
```

---

## Cloudflare 설정

### 1. DNS 설정

1. Cloudflare 대시보드 → DNS → Records
2. **A 레코드** 추가:
   - Name: `@` (루트 도메인) 또는 `api` (서브도메인)
   - IPv4 address: EC2 Elastic IP 또는 퍼블릭 IP
   - Proxy: **프록시됨** (주황색 구름 아이콘) ✅
   - TTL: Auto

3. **CNAME 레코드** (선택사항):
   - Name: `www`
   - Target: `@` 또는 루트 도메인
   - Proxy: **프록시됨**

### 2. SSL/TLS 설정

1. Cloudflare 대시보드 → SSL/TLS
2. **암호화 모드**: "전체 (엄격)" 선택
3. **항상 HTTPS 사용**: 활성화
4. **자동 HTTPS 재작성**: 활성화

### 3. 페이지 규칙 (선택사항)

WebSocket 지원을 위해:
1. Cloudflare 대시보드 → 규칙 → 페이지 규칙
2. 규칙 추가:
   - URL: `yourdomain.com/ws`
   - 설정:
     - SSL: Full
     - WebSocket: On

### 4. 보안 설정

1. **보안** → **WAF** (무료 플랜에서도 기본 보호)
2. **보안** → **DDoS**: 자동 보호 활성화
3. **속도 제한** (Pro 플랜): API 엔드포인트에 Rate Limiting 설정

### 5. Cloudflare 터널 (선택사항, 더 안전)

EC2를 인터넷에 직접 노출하지 않고 Cloudflare Tunnel 사용:

```bash
# EC2에서 Cloudflare Tunnel 설치
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Tunnel 생성 및 실행
cloudflared tunnel create jarvis
cloudflared tunnel route dns jarvis yourdomain.com
cloudflared tunnel run jarvis
```

이 경우 보안 그룹에서 80/443 포트를 닫고, Cloudflare Tunnel만 사용.

---

## 모니터링 및 유지보수

### 1. 시스템 모니터링

**CloudWatch (AWS 기본)**:
- EC2 인스턴스 메트릭 자동 수집
- CPU, 메모리, 네트워크 사용량 모니터링

**애플리케이션 로그**:
```bash
# 실시간 로그 확인
docker compose logs -f server

# 로그 파일로 저장
docker compose logs server > /var/log/jarvis-server.log 2>&1
```

### 2. 백업 전략

#### PostgreSQL 백업

**자동 백업 스크립트** (`/opt/jarvis-incident/backup.sh`):

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# PostgreSQL 백업
docker compose exec -T postgres pg_dump -U jarvis jarvis_chat > $BACKUP_DIR/postgres_$DATE.sql

# 오래된 백업 삭제 (7일 이상)
find $BACKUP_DIR -name "postgres_*.sql" -mtime +7 -delete

# S3에 업로드 (선택사항)
# aws s3 cp $BACKUP_DIR/postgres_$DATE.sql s3://your-backup-bucket/
```

**Cron 설정** (매일 새벽 2시):
```bash
crontab -e
# 추가:
0 2 * * * /opt/jarvis-incident/backup.sh
```

#### Redis 백업 (선택사항)

Redis는 주로 캐시용이므로 백업이 필수는 아니지만, 필요 시:
```bash
docker compose exec redis redis-cli BGSAVE
```

### 3. 업데이트 프로세스

1. **코드 업데이트**:
   ```bash
   cd /opt/jarvis-incident
   git pull
   ./deploy.sh
   ```

2. **시스템 업데이트**:
   ```bash
   sudo dnf update -y  # Amazon Linux
   # 또는
   sudo apt update && sudo apt upgrade -y  # Ubuntu
   ```

3. **Docker 이미지 업데이트**:
   ```bash
   docker compose pull
   docker compose up -d
   ```

### 4. 성능 최적화

#### 메모리 모니터링
```bash
free -h
docker stats
```

#### PostgreSQL 튜닝
`infra/docker-compose.yml`에 PostgreSQL 설정 추가:
```yaml
postgres:
  environment:
    POSTGRES_INITDB_ARGS: "-E UTF8 --locale=C"
  command: postgres -c shared_buffers=256MB -c max_connections=100
```

#### Redis 메모리 제한
```yaml
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### 5. 장애 대응

**서비스 재시작**:
```bash
docker compose restart server
docker compose restart worker
```

**전체 재시작**:
```bash
docker compose down
docker compose up -d
```

**인스턴스 재부팅**:
```bash
sudo reboot
```

---

## 예상 비용

### 월간 비용 (t3.micro 기준)

| 항목 | 비용 |
|------|------|
| EC2 t3.micro (750시간) | $7.50 |
| EBS 20GB gp3 | $1.60 |
| 데이터 전송 (10GB) | $0.90 |
| **총계** | **약 $10/월** |

### 월간 비용 (t3.small 기준)

| 항목 | 비용 |
|------|------|
| EC2 t3.small (750시간) | $15.00 |
| EBS 20GB gp3 | $1.60 |
| 데이터 전송 (10GB) | $0.90 |
| **총계** | **약 $17.50/월** |

### 추가 비용 (선택사항)

- **도메인**: $10-15/년
- **Cloudflare Pro**: $20/월 (고급 기능 필요 시)
- **AWS RDS**: $15+/월 (EC2 내부 대신 사용 시)
- **AWS ElastiCache**: $15+/월 (EC2 내부 대신 사용 시)

---

## 보안 체크리스트

- [ ] JWT_SECRET이 32자 이상인 강력한 값으로 설정
- [ ] PostgreSQL 비밀번호 강력하게 설정
- [ ] 보안 그룹에서 SSH는 내 IP만 허용
- [ ] Cloudflare 프록시 활성화 (IP 숨김)
- [ ] SSL/TLS "전체 (엄격)" 모드 사용
- [ ] 환경 변수 파일 권한 제한 (`chmod 600 .env`)
- [ ] 정기적인 시스템 업데이트
- [ ] 백업 자동화 설정
- [ ] 로그 모니터링 설정

---

## 문제 해결

### 서비스가 시작되지 않음
```bash
docker compose logs
docker compose ps
```

### 데이터베이스 연결 실패
```bash
docker compose exec postgres psql -U jarvis -d jarvis_chat -c "SELECT 1;"
```

### Redis 연결 실패
```bash
docker compose exec redis redis-cli ping
```

### 메모리 부족
- 인스턴스 타입을 `t3.small`로 업그레이드
- 또는 Docker 컨테이너 메모리 제한 설정

### 디스크 공간 부족
```bash
df -h
docker system prune -a  # 사용하지 않는 이미지/컨테이너 삭제
```

---

## 다음 단계

1. **모니터링 강화**: CloudWatch 알람 설정, 로그 집계
2. **자동 스케일링**: 트래픽 증가 시 인스턴스 자동 확장 (필요 시)
3. **CDN 최적화**: Cloudflare 캐싱 규칙 설정
4. **백업 자동화**: S3에 자동 백업 업로드
5. **CI/CD 파이프라인**: GitHub Actions로 자동 배포 설정

---

## 참고 자료

- [AWS EC2 가격](https://aws.amazon.com/ec2/pricing/)
- [Cloudflare 문서](https://developers.cloudflare.com/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [Fastify 문서](https://www.fastify.io/)

---

**문의사항이나 문제가 있으면 이슈를 등록해주세요.**

