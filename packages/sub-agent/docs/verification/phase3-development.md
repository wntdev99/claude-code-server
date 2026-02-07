# Phase 3 검증 기준 (Development)

## 개요

Phase 3 (개발) 완료 전 확인해야 할 품질 기준과 검증 방법을 설명합니다.

> **중요**: Phase 3는 **실제 동작하는 코드**를 생성해야 합니다.

## 필수 산출물

### 기본 파일 구조

```
✅ 필수 파일:
package.json          # 의존성 정의
README.md             # 프로젝트 문서
.env.example          # 환경 변수 템플릿
.gitignore            # Git ignore (.env 포함)
tsconfig.json         # TypeScript 설정 (TS 사용 시)

✅ 프레임워크별 필수:
Next.js:
  - next.config.js
  - app/layout.tsx
  - app/page.tsx

React:
  - src/App.tsx
  - public/index.html

Node.js API:
  - src/server.ts
  - src/routes/

❌ 불합격:
  - package.json 없음
  - README.md 없음
  - .env.example 없음
```

## 검증 항목

### 1. 프로젝트 초기화

```bash
# npm install이 성공해야 함
□ npm install 실행 성공
□ node_modules 생성됨
□ package-lock.json 생성됨
□ 의존성 충돌 없음
```

### 2. 개발 서버 실행

```bash
# 개발 서버가 정상 실행되어야 함
□ npm run dev 실행 성공
□ 포트 바인딩 성공 (3000, 5173 등)
□ 컴파일 에러 없음
□ 브라우저 접근 가능
```

### 3. 기본 기능 동작

```
□ 홈페이지 렌더링
□ Phase 1에서 정의한 Must Have 기능 동작
□ API 엔드포인트 응답 (200 또는 적절한 상태 코드)
□ 데이터베이스 연결 (사용 시)
```

### 4. 파일 품질

#### package.json

```json
□ name, version, description 존재
□ scripts 정의:
  - dev (개발 서버)
  - build (빌드)
  - start (프로덕션)
□ dependencies 적절
□ devDependencies 분리
```

**예시**:
```json
{
  "name": "ai-todo-app",
  "version": "0.1.0",
  "description": "AI-powered todo management app",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "openai": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.2.0"
  }
}
```

#### README.md

```markdown
□ 프로젝트 설명 (from Phase 1: 01_idea.md)
□ 주요 기능 목록 (from Phase 1: 07_features.md)
□ 기술 스택 (from Phase 1: 08_tech.md)
□ Getting Started:
  - Prerequisites
  - Installation 단계
  - 실행 방법
□ API 엔드포인트 (from Phase 2: 04_api.md)
□ 프로젝트 구조 설명
□ 최소 500자 이상
```

#### .env.example

```bash
□ 필요한 모든 환경 변수 나열
□ 플레이스홀더 값 사용 (your_*_here)
□ 주석으로 설명 추가
□ 실제 비밀 값 없음

# ✅ Good
OPENAI_API_KEY=your_openai_api_key_here  # Get from https://platform.openai.com
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# ❌ Bad
OPENAI_API_KEY=sk-1234567890abcdef...  # 실제 키
```

#### .gitignore

```bash
□ node_modules/ 포함
□ .env 포함
□ .env.local 포함
□ 빌드 파일 제외 (/build, /.next 등)
□ OS 파일 제외 (.DS_Store 등)
```

### 5. 코드 품질

#### TypeScript (사용 시)

```typescript
□ 타입 정의 명확
□ any 사용 최소화
□ Interface/Type 정의
□ tsconfig.json 적절한 설정
□ 컴파일 에러 없음
```

#### 컴포넌트/모듈

```
□ 적절한 파일 분리
□ 명확한 네이밍
□ Props 타입 정의 (React)
□ 에러 처리 포함
□ 주석 (복잡한 로직만)
```

#### API Routes

```typescript
□ 모든 엔드포인트 구현 (Phase 2: 04_api.md)
□ Request 검증
□ Response 형식 일관성
□ 에러 처리 (try-catch)
□ HTTP 상태 코드 적절

// ✅ Good
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 검증
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const task = await db.task.create({ data: body });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 6. 보안

```
□ .env에 비밀 정보 저장
□ .gitignore에 .env 포함
□ 코드에 API 키 하드코딩 없음
□ 환경 변수로 민감 정보 접근 (process.env.*)
□ SQL Injection 방지 (ORM 사용 또는 Prepared Statement)
```

**예시**:
```typescript
// ✅ Good
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ❌ Bad
const openai = new OpenAI({
  apiKey: 'sk-1234567890abcdef...',
});
```

### 7. 데이터베이스 (사용 시)

#### Prisma Schema

```prisma
□ 모델 정의 (Phase 2: 02_data_model.md 기반)
□ 관계 정의 (1:N, N:M)
□ 인덱스 설정
□ 기본값 설정
□ Cascade 설정

// ✅ Good
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tasks Task[]

  @@index([email])
}

model Task {
  id     String @id @default(uuid())
  title  String
  userId String

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

#### Migration

```bash
□ Prisma migrate 실행 가능
□ Migration 파일 생성됨
□ 데이터베이스 스키마 적용 성공
```

### 8. 테스트 (선택적)

```
□ 주요 컴포넌트 테스트
□ API 엔드포인트 테스트
□ 테스트 실행 가능 (npm test)
□ 테스트 통과
```

## 자동 검증 스크립트

### 기본 검증

```bash
#!/bin/bash

echo "=== Phase 3 Development 검증 ==="

# 1. 필수 파일 존재 확인
echo ""
echo "=== 필수 파일 확인 ==="
FILES=(
  "package.json"
  "README.md"
  ".env.example"
  ".gitignore"
)

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    echo "✅ $FILE exists"
  else
    echo "❌ $FILE missing"
    exit 1
  fi
done

# 2. .gitignore에 .env 포함 확인
echo ""
echo "=== .gitignore 검증 ==="
if grep -q "^\.env$" .gitignore; then
  echo "✅ .env in .gitignore"
else
  echo "❌ .env not in .gitignore"
  exit 1
fi

# 3. npm install 테스트
echo ""
echo "=== npm install 테스트 ==="
if npm install --dry-run > /dev/null 2>&1; then
  echo "✅ npm install successful"
else
  echo "❌ npm install failed"
  exit 1
fi

# 4. 하드코딩된 API 키 검사 (간단한 패턴)
echo ""
echo "=== 하드코딩 API 키 검사 ==="
PATTERNS=(
  "sk-[a-zA-Z0-9]{20,}"        # OpenAI
  "pk_live_[a-zA-Z0-9]{20,}"   # Stripe
  "AIza[a-zA-Z0-9_-]{35}"      # Google
)

FOUND=0
for PATTERN in "${PATTERNS[@]}"; do
  if grep -rE "$PATTERN" app/ lib/ src/ 2>/dev/null | grep -v ".env.example" | grep -v "node_modules"; then
    echo "⚠️  Possible hardcoded API key found: $PATTERN"
    FOUND=1
  fi
done

if [ $FOUND -eq 0 ]; then
  echo "✅ No hardcoded API keys detected"
fi

# 5. TypeScript 에러 확인 (TS 프로젝트인 경우)
if [ -f "tsconfig.json" ]; then
  echo ""
  echo "=== TypeScript 검증 ==="
  if npx tsc --noEmit > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
  else
    echo "❌ TypeScript compilation failed"
    npx tsc --noEmit
    exit 1
  fi
fi

echo ""
echo "✅ Phase 3 기본 검증 통과!"
```

### 심화 검증

```bash
#!/bin/bash

# README.md 길이 확인
README_LENGTH=$(wc -m < README.md)
if [ $README_LENGTH -ge 500 ]; then
  echo "✅ README.md: ${README_LENGTH} chars"
else
  echo "❌ README.md too short: ${README_LENGTH} chars (min 500)"
  exit 1
fi

# package.json scripts 확인
if grep -q '"dev":' package.json && grep -q '"build":' package.json; then
  echo "✅ package.json has required scripts"
else
  echo "❌ package.json missing required scripts (dev, build)"
  exit 1
fi

# .env.example에 실제 값 없는지 확인
if grep -qE "sk-[a-zA-Z0-9]{20,}" .env.example; then
  echo "❌ .env.example contains actual API key"
  exit 1
else
  echo "✅ .env.example uses placeholders"
fi
```

## 품질 기준

### 상 (Excellent)

```
✅ 모든 필수 항목 만족
✅ Must Have 기능 100% 구현
✅ Should Have 기능 50% 이상 구현
✅ 테스트 포함
✅ 에러 처리 완벽
✅ 코드 문서화 (주석)
✅ TypeScript 타입 완벽
✅ 성능 최적화
✅ README.md 1000자 이상
```

### 중 (Good)

```
✅ 모든 필수 항목 만족
✅ Must Have 기능 80% 이상 구현
✅ 기본 에러 처리
✅ TypeScript 사용 (타입 대부분 정의)
✅ README.md 500자 이상
```

### 하 (Poor) - 재작업 필요

```
❌ 필수 파일 누락
❌ npm install 실패
❌ npm run dev 실패
❌ 하드코딩된 비밀 정보
❌ Must Have 기능 50% 미만 구현
❌ TypeScript 에러
❌ README.md 500자 미만
```

## Phase 1, 2와의 일관성 검증

### 기능 구현 일치

```
□ Phase 1: 07_features.md의 Must Have 기능 모두 구현
□ Phase 2: 04_api.md의 모든 엔드포인트 구현
□ Phase 2: 02_data_model.md의 모든 엔티티 정의
□ Phase 1: 08_tech.md의 기술 스택 사용
```

### 예시 검증

Phase 1: 07_features.md에서:
```markdown
## Must Have
1. Todo CRUD
2. AI 자동 분류
3. 우선순위 제안
```

Phase 3 검증:
```
□ Todo CRUD API 구현 (/api/tasks - GET, POST, PUT, DELETE)
□ AI 분류 기능 구현 (lib/ai.ts, OpenAI API 사용)
□ 우선순위 제안 로직 구현
```

## 검증 실패 시 조치

### npm install 실패

```
원인: 의존성 충돌
조치: package.json 수정, 호환 버전 사용
```

### npm run dev 실패

```
원인: 컴파일 에러, 포트 충돌
조치: 에러 로그 확인 후 수정, 포트 변경
```

### 하드코딩된 API 키

```
원인: 코드에 직접 API 키 입력
조치:
  1. 코드에서 API 키 제거
  2. .env에 추가
  3. process.env.* 사용
  4. .env.example 업데이트
```

### TypeScript 에러

```
원인: 타입 불일치, 타입 미정의
조치: 타입 정의 추가, any 제거
```

### 기능 미구현

```
원인: Phase 1/2와 불일치
조치:
  1. Phase 1: 07_features.md 재확인
  2. 누락 기능 구현
  3. Phase 2: 04_api.md 기반 API 추가
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../deliverables/code.md`** - 코드 작성 규칙
2. **`../workflows/create-app.md`** - Phase 3 완료 조건
3. **`../protocols/phase-completion.md`** - 완료 신호 전 체크리스트
4. **`../../CLAUDE.md`** - 검증 기준 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - Verification 문서 목록
2. **`../../CLAUDE.md`** - 서브 에이전트 개요
3. **`../workflows/create-app.md`** - create_app 워크플로우
4. **`../protocols/phase-completion.md`** - Phase 완료 프로토콜

## 다음 단계

- **코드 작성 규칙**: `../deliverables/code.md` - 상세 코드 작성 가이드
- **워크플로우**: `../workflows/create-app.md` - 전체 작업 흐름
- **Phase 완료**: `../protocols/phase-completion.md` - 완료 신호 보내기

## 관련 문서

- **Deliverables - Code**: `../deliverables/code.md`
- **Workflows - Create App**: `../workflows/create-app.md`
- **Protocols - Phase Completion**: `../protocols/phase-completion.md`
- **Guides - Development**: `/guide/development/*.md`
