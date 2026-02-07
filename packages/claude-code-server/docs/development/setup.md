# 개발 환경 설정

## 개요

Claude Code Server 개발을 시작하기 위한 환경 설정 가이드입니다.

## 사전 요구사항

### 필수 소프트웨어

```bash
# Node.js 18+ 설치 확인
node --version  # v18.0.0 이상

# npm 확인
npm --version   # 9.0.0 이상

# Claude Code CLI 설치 및 인증
claude --version
claude login
```

### 선택 사항

- **PostgreSQL**: 프로덕션 데이터베이스 (개발은 SQLite 사용)
- **Redis**: 분산 큐 (선택사항)
- **Docker**: 컨테이너 개발

## 프로젝트 설정

### 1. 저장소 클론

```bash
git clone https://github.com/yourusername/claude-code-server.git
cd claude-code-server
```

### 2. 의존성 설치

```bash
# 모든 패키지 의존성 설치 (monorepo)
npm install
```

### 3. 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env
```

**`.env` 파일 편집**:

```env
# Claude Code CLI 설정 (CLI가 자체 인증 관리)
CLAUDE_MODEL=claude-sonnet-4-5
CLAUDE_MAX_TOKENS=8000
CLAUDE_AUTO_ACCEPT=true

# 데이터베이스 (개발용)
DATABASE_URL=file:./dev.db

# 서버 설정
NODE_ENV=development
PORT=3000

# 암호화 키 (32 bytes hex)
ENCRYPTION_KEY=<32바이트 hex 키>

# 작업 디렉토리
PROJECTS_DIR=/tmp/claude-projects

# 선택: 외부 통합
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
GITHUB_TOKEN=ghp_...
```

**암호화 키 생성**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 데이터베이스 초기화

```bash
# Prisma 마이그레이션 실행
npx prisma migrate dev --name init

# Prisma Client 생성
npx prisma generate
```

### 5. 개발 서버 시작

```bash
# 개발 모드 실행 (hot reload)
npm run dev
```

서버가 http://localhost:3000 에서 실행됩니다.

## IDE 설정

### VS Code

**추천 확장 프로그램**:
- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- Prisma

**`.vscode/settings.json`**:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

**`.vscode/extensions.json`**:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma"
  ]
}
```

### 타입 체크

```bash
# TypeScript 타입 체크
npx tsc --noEmit

# Watch 모드
npx tsc --noEmit --watch
```

## 패키지 구조

```
packages/
├── claude-code-server/    # 웹 서버 (Tier 1)
│   ├── app/              # Next.js App Router
│   ├── components/       # React 컴포넌트
│   ├── lib/              # 비즈니스 로직
│   └── docs/             # 문서
│
├── agent-manager/        # 에이전트 관리자 (Tier 2)
│   ├── src/
│   ├── tests/
│   └── docs/
│
├── sub-agent/           # 서브 에이전트 (Tier 3)
│   ├── src/
│   └── docs/
│
├── core/                # 공유 도메인 로직
└── shared/              # 공통 유틸리티
```

## 개발 워크플로우

### 1. 브랜치 생성

```bash
git checkout -b feature/your-feature-name
```

### 2. 코드 작성

```bash
# 코드 작성
# ...

# 린트 확인
npm run lint

# 포맷팅
npm run format

# 타입 체크
npx tsc --noEmit
```

### 3. 테스트 실행

```bash
# 모든 테스트 실행
npm test

# Watch 모드
npm test -- --watch

# 특정 파일 테스트
npm test -- path/to/test.ts
```

### 4. 커밋

```bash
git add .
git commit -m "feat: add feature description"
```

### 5. 푸시 및 PR

```bash
git push origin feature/your-feature-name
# GitHub에서 Pull Request 생성
```

## 데이터베이스 관리

### Prisma Studio

```bash
# Prisma Studio 실행 (데이터베이스 GUI)
npx prisma studio
```

http://localhost:5555 에서 접속

### 마이그레이션

```bash
# 새 마이그레이션 생성
npx prisma migrate dev --name add_new_field

# 마이그레이션 적용
npx prisma migrate deploy

# 스키마 리셋 (개발용)
npx prisma migrate reset
```

## 트러블슈팅

### 포트 충돌

```bash
# 3000 포트 사용 중인 프로세스 찾기
lsof -i :3000

# 프로세스 종료
kill -9 <PID>

# 또는 다른 포트 사용
PORT=3001 npm run dev
```

### 데이터베이스 잠금 (SQLite)

```bash
# 데이터베이스 리셋
rm prisma/dev.db
npx prisma migrate dev
```

### Node 모듈 문제

```bash
# node_modules 재설치
rm -rf node_modules package-lock.json
npm install
```

### Claude Code CLI 인증

```bash
# 로그인 상태 확인
claude auth status

# 재인증
claude login
```

## 핫 팁

### 빠른 재시작

```bash
# 개발 서버만 재시작 (의존성 재설치 없이)
npm run dev
```

### 데이터베이스 시드

```bash
# 테스트 데이터 생성
npx prisma db seed
```

**`prisma/seed.ts`**:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 테스트 Task 생성
  await prisma.task.create({
    data: {
      title: 'Test Task',
      type: 'custom',
      description: 'This is a test task',
      status: 'pending',
    },
  });

  console.log('Database seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 환경 변수 검증

```bash
# 환경 변수 확인
node -e "console.log(process.env.DATABASE_URL)"
```

## 다음 단계

- **테스트**: `testing.md` - 테스트 작성 및 실행
- **디버깅**: `debugging.md` - 디버깅 방법
- **컨벤션**: `conventions.md` - 코딩 규칙

## 관련 문서

- **Architecture**: `../../docs/ARCHITECTURE.md`
- **API**: `../api/*.md`
- **Features**: `../features/*.md`
