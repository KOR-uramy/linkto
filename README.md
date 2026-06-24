# LinkTo

크리에이터용 링크인바이오 서비스. 유튜브·SNS·제휴 링크를 카드 형태로 모아 공개 페이지를 만듭니다.

**프로덕션:** https://linkto.nxnl.app

## 아키텍처

| 구분 | 호스팅 | 설명 |
|------|--------|------|
| 프론트 | S3 + CloudFront | Next.js 정적 export (`out/`) |
| API | EC2 + PM2 + nginx | Next.js API Routes (`/api/*`) |
| DB | SQLite | `data/linkto.db` (EC2 로컬) |

CloudFront가 `/api/*` 요청을 EC2로, 나머지 경로는 S3 정적 파일로 라우팅합니다.  
`/{slug}` 공개 페이지와 `/manage`, `/admin` 등은 CloudFront Function(`deploy/cloudfront/user-fallback-function.js`)이 `index.html`로 rewrite합니다.

## 주요 경로

| 경로 | 용도 |
|------|------|
| `/` | 랜딩 · 로그인 |
| `/manage` | 내 링크보드 편집 |
| `/admin` | 개발자 콘솔 (`DEVELOPER_EMAILS`만 접근) |
| `/{slug}` | 유저 공개 링크 페이지 |

## 로컬 개발

```bash
cp .env.example .env.local
# secrets/google-oauth-client.json 또는 .env.local에 Google OAuth 설정

npm ci
npm run dev
```

http://localhost:3000 에서 확인합니다.  
Google Console **Authorized JavaScript origins**에 `http://localhost:3000` 등록이 필요합니다.

### 환경 변수

`.env.example` 참고. 주요 항목:

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — Google OAuth (클라이언트)
- `GOOGLE_CLIENT_SECRET` — Google OAuth (서버, API 라우트용)
- `NEXT_PUBLIC_APP_URL` — 로컬: 생략 가능 / 프로덕션 빌드: `https://linkto.nxnl.app`
- `DEVELOPER_EMAILS` — `/admin` 접근 허용 이메일 (쉼표 구분)

## DB

```bash
npm run db:migrate        # JSON → SQLite 마이그레이션
npm run db:backfill-slugs # 기존 유저 slug 보정
```

## 배포 (linkto.nxnl.app)

프론트와 API는 **분리 배포**합니다. `deploy/deploy.sh`는 예전 EC2 단일 배포용이며, 현재 프로덕션에서는 사용하지 않습니다.

### 1. 프론트 (로컬 → S3 + CloudFront)

AWS CLI 프로필(`AWS_PROFILE`, 기본 `imuramy`) 설정 후:

```bash
bash deploy/deploy-static.sh
```

`NEXT_PUBLIC_APP_URL=https://linkto.nxnl.app` 로 정적 빌드 후 S3 업로드 · CloudFront invalidation을 수행합니다.

### 2. API (EC2)

EC2에서:

```bash
cd /home/ubuntu/linkto
git pull origin main
bash deploy/deploy-api.sh
```

PM2로 Next.js(포트 3003)를 재시작하고 nginx API 설정을 적용합니다.

## npm scripts

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | Next.js 빌드 (API 포함, EC2용) |
| `npm run build:static` | 정적 export (`out/`, S3 배포용) |
| `npm start` | 프로덕션 서버 (포트 3003) |
