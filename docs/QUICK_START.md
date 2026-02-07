# Quick Start Guide (5분 시작 가이드)

이 가이드는 Claude Code Server를 5분 안에 설정하고 첫 번째 Task를 실행하는 방법을 안내합니다.

---

## 📋 사전 준비

### 필수 소프트웨어

```bash
# 1. Node.js 18 이상 확인
node --version  # v18.x 이상

# 2. npm 확인
npm --version   # 9.x 이상

# 3. Git 확인
git --version   # 2.x 이상
```

### Claude Code CLI 설치

```bash
# Claude Code CLI 전역 설치
npm install -g @anthropic-ai/claude-code

# 설치 확인
claude --version

# 인증 (브라우저에서 로그인)
claude login
```

✅ **인증 성공**: "Successfully authenticated" 메시지 확인

---

## 🚀 프로젝트 설정 (2분)

### 1. 저장소 클론

```bash
git clone https://github.com/wntdev99/claude-code-server.git
cd claude-code-server
```

### 2. 의존성 설치

```bash
# 프로젝트 루트에서
npm install
```

### 3. 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env
```

**`.env` 파일 편집**:
```env
# Database
DATABASE_URL=file:./dev.db

# Server
PORT=3000
NODE_ENV=development

# Output
OUTPUT_DIRECTORY=./projects

# Security
ENCRYPTION_KEY=<32바이트 키 생성>
```

**암호화 키 생성**:
```bash
# macOS/Linux
openssl rand -hex 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

생성된 키를 `ENCRYPTION_KEY`에 복사하세요.

### 4. 데이터베이스 초기화

```bash
# Prisma 마이그레이션 실행
npx prisma migrate dev --name init

# Prisma 클라이언트 생성
npx prisma generate
```

✅ **성공**: "Your database is now in sync with your schema" 메시지 확인

---

## 🎯 첫 실행 (1분)

### 1. 개발 서버 시작

```bash
npm run dev
```

### 2. 브라우저에서 접속

```
http://localhost:3000
```

✅ **성공**: 웹 UI가 표시되면 준비 완료!

---

## 📝 첫 Task 실행 (2분)

### 1. Task 생성

웹 UI에서:

1. **"New Task"** 버튼 클릭
2. 다음 정보 입력:

```
Title: My First Todo App
Type: create_app
Description:
Create a simple todo application with:
- Add new tasks
- Mark tasks as complete
- Delete tasks
- Filter by status (all/active/completed)

Tech stack: React + TypeScript
```

3. **"Create Task"** 버튼 클릭

### 2. Task 실행

1. Task 카드에서 **"Execute"** 버튼 클릭
2. 실시간 로그 확인 (SSE 스트리밍)

```
[Agent Starting...]
Phase 1: Planning
Reading guide: guide/planning/01_idea.md
Creating: docs/planning/01_idea.md
...
=== PHASE 1 COMPLETE ===
```

### 3. Review 승인

Phase 1 완료 후:

1. **"Review"** 탭으로 이동
2. 생성된 9개 기획 문서 확인:
   - `01_idea.md` - 아이디어 정의
   - `02_market.md` - 시장 분석
   - `03_users.md` - 사용자 페르소나
   - ... (9개 문서)
3. **"Approve"** 버튼 클릭

### 4. Phase 2-3 진행

동일한 방식으로:
- **Phase 2 (설계)**: 화면 설계, 데이터 모델 등 5개 문서
- **Phase 3 (개발)**: 실제 코드 프로젝트

### 5. 완료된 프로젝트 확인

모든 Phase 완료 후:

```bash
# 생성된 프로젝트 확인
ls projects/task_abc123/

# 코드 확인
cd projects/task_abc123/src
ls
```

✅ **성공**: 실행 가능한 Todo 앱이 생성되었습니다!

---

## 🎉 축하합니다!

첫 번째 Task를 성공적으로 완료했습니다!

### 생성된 결과물

```
projects/task_abc123/
├── docs/
│   ├── planning/   # 9개 기획 문서
│   └── design/     # 5개 설계 문서
├── src/            # React + TypeScript 코드
├── package.json
├── README.md
└── ...
```

---

## 🔍 다음 단계

### 1. 아키텍처 이해

```bash
# 3-tier 아키텍처 학습
cat docs/ARCHITECTURE.md
```

**핵심 개념**:
- **Tier 1**: Web Server (Next.js)
- **Tier 2**: Agent Manager (프로세스 관리)
- **Tier 3**: Sub-Agent (작업 수행)

### 2. 다른 Task 타입 시도

#### modify_app (기존 앱 수정)
```
Title: Add login to existing app
Type: modify_app
Description: Add authentication using Supabase Auth
```

#### workflow (워크플로우 자동화)
```
Title: Deploy to Vercel on push
Type: workflow
Description: Create GitHub Action to deploy on main branch push
```

#### custom (자유 형식)
```
Title: Code review
Type: custom
Description: Review my React component for performance issues
```

### 3. 주요 문서 읽기

| 문서 | 목적 | 소요 시간 |
|------|------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 전체 아키텍처 이해 | 10분 |
| [WORKFLOWS.md](./WORKFLOWS.md) | Phase 기반 워크플로우 | 15분 |
| [PROTOCOLS.md](./PROTOCOLS.md) | 통신 프로토콜 | 10분 |
| [API.md](./API.md) | REST API 참조 | 20분 |
| [GLOSSARY.md](./GLOSSARY.md) | 용어 정의 | 5분 |

### 4. 개발 환경 설정

#### Prisma Studio (데이터베이스 GUI)
```bash
npx prisma studio
```

브라우저에서 `http://localhost:5555`로 접속하여 데이터 확인

#### 로그 모니터링
```bash
# 특정 Task 로그 실시간 확인
tail -f logs/task_abc123.jsonl

# JSON 형식으로 보기
tail -f logs/task_abc123.jsonl | jq .
```

#### Agent 상태 확인
```bash
# API로 Agent 상태 조회
curl http://localhost:3000/api/tasks/task_abc123/agent | jq .
```

---

## 💡 유용한 팁

### 1. Checkpoint 복구

시스템이 중단되어도 걱정하지 마세요:

```bash
# 시스템 재시작
npm run dev

# 자동으로 중단된 Task 복구됨
# Workspace에서 최신 Checkpoint 로드
```

### 2. 의존성 요청

Agent가 API 키나 환경 변수를 요청하면:

1. 웹 UI에 팝업 표시
2. 값 입력
3. 자동으로 암호화되어 저장
4. Agent에 주입되어 재개

### 3. 사용자 질문

Agent가 불명확한 부분을 질문하면:

1. 웹 UI에 질문 표시
2. 선택지 중 선택 또는 텍스트 입력
3. Agent 자동 재개

### 4. Phase 재작업

Review에서 변경 요청 시:

1. 피드백 작성
2. "Request Changes" 클릭
3. Agent가 피드백 반영하여 재작업
4. 재검증 및 재리뷰

---

## 🐛 문제 해결

### Agent가 시작되지 않음

```bash
# Claude Code CLI 인증 확인
claude login

# 버전 확인
claude --version

# 권한 확인
ls -la projects/
```

### Port 이미 사용 중

```bash
# 3000 포트 사용 프로세스 확인
lsof -ti:3000

# 프로세스 종료
lsof -ti:3000 | xargs kill -9
```

### 데이터베이스 Lock

```bash
# SQLite 데이터베이스 리셋
rm prisma/dev.db
npx prisma migrate dev
```

### SSE 연결 끊김

- 브라우저 개발자 도구 > Network 탭 확인
- Reverse proxy 타임아웃 설정 확인
- 클라이언트 재연결 로직 확인

---

## 📚 추가 리소스

### 프로젝트 문서
- [README.md](../README.md) - 프로젝트 개요
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 아키텍처 상세
- [FEATURES.md](./FEATURES.md) - 기능 명세 (982줄)
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 개발 가이드

### 컴포넌트별 가이드
- [Web Server CLAUDE.md](../packages/claude-code-server/CLAUDE.md)
- [Agent Manager CLAUDE.md](../packages/agent-manager/CLAUDE.md)
- [Sub-Agent CLAUDE.md](../packages/sub-agent/CLAUDE.md)

### 가이드 문서
- [Planning Guides](../guide/planning/) - 기획 가이드 (9개)
- [Design Guides](../guide/design/) - 설계 가이드 (5개)
- [Development Guides](../guide/development/) - 개발 가이드 (6개)

### 외부 문서
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Claude API Documentation](https://docs.anthropic.com)

---

## 🤝 도움 받기

### 이슈 보고
- GitHub Issues: [github.com/wntdev99/claude-code-server/issues](https://github.com/wntdev99/claude-code-server/issues)

### 문서 확인
- 프로젝트 문서: `/docs` 디렉토리
- 컴포넌트 가이드: 각 `package/*/CLAUDE.md`

---

**Happy Coding!** 🚀

이제 Claude Code Server로 자동화된 개발을 시작할 준비가 되었습니다!

---

**최종 업데이트**: 2024-02-15
**버전**: 1.0
