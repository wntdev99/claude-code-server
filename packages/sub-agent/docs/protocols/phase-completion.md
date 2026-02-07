# Phase 완료 신호

## 개요

Phase 작업을 완료한 후 플랫폼에 완료 신호를 보내는 방법을 설명합니다.

> **중요**: Phase 완료 후 **항상** 완료 신호를 보내야 합니다.

## 언제 보내나?

### ✅ 완료 신호를 보내야 할 때

```
✅ Phase의 모든 Step 완료 후
   → 모든 문서/코드 생성 완료
   → 자체 검증 통과

✅ 산출물이 품질 기준을 만족할 때
   → 500자 이상 문서
   → 플레이스홀더 없음
   → 모든 섹션 완성

✅ 다음 Phase로 진행 준비가 되었을 때
   → 현재 Phase 작업 100% 완료
```

### ❌ 완료 신호를 보내지 말아야 할 때

```
❌ 일부 작업만 완료
   → 모든 Step 완료 필수

❌ 품질 기준 미달
   → 짧은 문서, 플레이스홀더 포함

❌ 에러 발생
   → 에러 해결 후 재시도
```

## 프로토콜 형식

### 기본 구조

```
=== PHASE [N] COMPLETE ===
Completed: Phase [N] ([Phase 이름])
Documents created:
- [파일1]
- [파일2]
- ...

Ready for review.
```

### Phase별 예시

#### Phase 1: Planning (create_app)

```
=== PHASE 1 COMPLETE ===
Completed: Phase 1 (Planning)
Documents created:
- docs/planning/01_idea.md
- docs/planning/02_market.md
- docs/planning/03_persona.md
- docs/planning/04_user_journey.md
- docs/planning/05_business_model.md
- docs/planning/06_product.md
- docs/planning/07_features.md
- docs/planning/08_tech.md
- docs/planning/09_roadmap.md

Ready for review.
```

#### Phase 2: Design (create_app)

```
=== PHASE 2 COMPLETE ===
Completed: Phase 2 (Design)
Documents created:
- docs/design/01_screen.md
- docs/design/02_data_model.md
- docs/design/03_task_flow.md
- docs/design/04_api.md
- docs/design/05_architecture.md

Ready for review.
```

#### Phase 3: Development (create_app)

```
=== PHASE 3 COMPLETE ===
Completed: Phase 3 (Development)
Files created:
- package.json
- next.config.js
- tsconfig.json
- .env.example
- .gitignore
- app/layout.tsx
- app/page.tsx
- components/TaskList.tsx
- lib/db.ts
- README.md

Project structure created with working code.

Ready for review.
```

## 완료 전 체크리스트

### Phase 1 (Planning) - 9개 문서

```
자체 검증:
□ 01_idea.md - 500자 이상, 모든 섹션 완성
□ 02_market.md - 500자 이상, 경쟁사 분석 포함
□ 03_persona.md - 500자 이상, 2-3개 페르소나
□ 04_user_journey.md - 500자 이상, 2-3개 여정
□ 05_business_model.md - 500자 이상, 구체적 가격
□ 06_product.md - 500자 이상, MVP 범위 명확
□ 07_features.md - 500자 이상, Must Have 5개 이상
□ 08_tech.md - 500자 이상, 기술 스택 선택 이유
□ 09_roadmap.md - 500자 이상, 3개 Phase 이상

□ 플레이스홀더 없음
□ 일관된 정보 (문서 간 모순 없음)
```

**상세 검증**: `../verification/phase1-planning.md` 참조

### Phase 2 (Design) - 5개 문서

```
자체 검증:
□ 01_screen.md - 주요 화면 5개 이상
□ 02_data_model.md - 엔티티 3개 이상, 관계 명시
□ 03_task_flow.md - 핵심 흐름 2-3개, 시퀀스 다이어그램
□ 04_api.md - API 엔드포인트 10개 이상
□ 05_architecture.md - 시스템 구조, 기술 스택 상세

□ 플레이스홀더 없음
□ Phase 1 문서와 일관성
```

**상세 검증**: `../verification/phase2-design.md` 참조

### Phase 3 (Development) - 코드 프로젝트

```
자체 검증:
□ 프로젝트 구조 올바름 (Next.js, React 등)
□ package.json 존재 및 의존성 포함
□ README.md 존재 및 상세 설명
□ .env.example 존재 (하드코딩 없음)
□ .gitignore 존재 (.env 포함)
□ 주요 기능 구현 완료
□ 기본 테스트 포함 (선택)

□ 비밀 정보 하드코딩 없음
□ 코드 품질 기준 만족
```

**상세 검증**: `../verification/phase3-development.md` 참조

## 워크플로우

### 1. 완료 신호 출력

```
서브 에이전트
    ↓
자체 검증 통과
    ↓
완료 신호 출력 (stdout)
    ↓
에이전트 관리자 감지
```

### 2. 에이전트 일시 중지

```
에이전트 관리자
    ↓
완료 신호 감지
    ↓
에이전트 일시 중지 (SIGTSTP)
    ↓
산출물 수집
```

### 3. 리뷰 생성

```
에이전트 관리자
    ↓
웹 서버에 리뷰 요청
    ↓
리뷰 생성
    ↓
사용자에게 알림
```

### 4. 리뷰 대기

```
서브 에이전트
    ↓
일시 중지 상태
    ↓
사용자 리뷰 대기
    ↓
승인 or 거부
```

### 5. 승인 시 다음 Phase

```
사용자 승인
    ↓
에이전트 관리자
    ↓
서브 에이전트에 승인 전달
    ↓
에이전트 재개 (SIGCONT)
    ↓
다음 Phase 시작
```

### 6. 거부 시 재작업

```
사용자 거부 + 피드백
    ↓
에이전트 관리자
    ↓
서브 에이전트에 피드백 전달
    ↓
에이전트 재개
    ↓
현재 Phase 재작업
```

## 작성 예시

### 정상 완료 (create_app Phase 1)

```markdown
# Phase 1 완료 보고

Phase 1의 모든 9개 문서를 작성 완료하였습니다.

## 생성된 문서

1. **docs/planning/01_idea.md** (1,245자)
   - 문제 정의: Todo 관리 앱의 비효율성
   - 솔루션: AI 기반 자동 분류 및 우선순위 제안
   - 타겟: 25-40세 직장인

2. **docs/planning/02_market.md** (1,103자)
   - 시장 규모: TAM $2B, SAM $500M
   - 주요 경쟁사: Todoist, Microsoft To Do, Notion
   - 차별화: AI 자동 분류

3. **docs/planning/03_persona.md** (987자)
   - 페르소나 1: IT 업계 직장인 (김철수, 32세)
   - 페르소나 2: 프리랜서 (이영희, 28세)

4. **docs/planning/04_user_journey.md** (1,056자)
   - 여정 1: 신규 가입 → 첫 Todo 입력 → AI 분류 경험
   - 여정 2: 일일 Todo 관리 → 우선순위 확인 → 완료

5. **docs/planning/05_business_model.md** (923자)
   - 수익 모델: 프리미엄 (무료 + 유료 $4.99/월)
   - KPI: MAU, 전환율, Churn Rate

6. **docs/planning/06_product.md** (1,012자)
   - MVP 범위: Todo CRUD, AI 분류, 기본 캘린더 연동

7. **docs/planning/07_features.md** (1,234자)
   - Must Have: Todo CRUD, AI 분류, 우선순위 제안
   - Should Have: 캘린더 연동, 알림
   - Nice to Have: Slack 연동, 음성 입력

8. **docs/planning/08_tech.md** (1,145자)
   - 프론트: Next.js 14, React 18, Tailwind CSS
   - 백엔드: Next.js API Routes, Prisma
   - AI: OpenAI GPT-4 API
   - 인프라: Vercel, PostgreSQL

9. **docs/planning/09_roadmap.md** (1,089자)
   - Phase 1 (1-2월): MVP 개발
   - Phase 2 (3-4월): 캘린더 연동, 알림
   - Phase 3 (5-6월): 외부 서비스 연동

## 자체 검증 결과

✅ 모든 문서 500자 이상
✅ 플레이스홀더 없음
✅ 모든 섹션 완성
✅ 일관된 정보
✅ 구체적인 내용

=== PHASE 1 COMPLETE ===
Completed: Phase 1 (Planning)
Documents created:
- docs/planning/01_idea.md
- docs/planning/02_market.md
- docs/planning/03_persona.md
- docs/planning/04_user_journey.md
- docs/planning/05_business_model.md
- docs/planning/06_product.md
- docs/planning/07_features.md
- docs/planning/08_tech.md
- docs/planning/09_roadmap.md

Ready for review.
```

### 정상 완료 (create_app Phase 3)

```markdown
# Phase 3 완료 보고

Next.js 14 기반 Todo 관리 앱을 성공적으로 구현하였습니다.

## 프로젝트 구조

```
todo-app/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── tasks/
│   │   └── page.tsx        # Tasks list page
│   └── api/
│       ├── tasks/
│       │   ├── route.ts    # Tasks API
│       │   └── [id]/
│       │       └── route.ts
│       └── ai/
│           └── categorize/
│               └── route.ts # AI categorization
├── components/
│   ├── TaskList.tsx        # Task list component
│   ├── TaskItem.tsx        # Task item component
│   └── TaskForm.tsx        # Task form component
├── lib/
│   ├── db.ts               # Prisma client
│   ├── ai.ts               # OpenAI integration
│   └── utils.ts            # Utilities
├── prisma/
│   └── schema.prisma       # Database schema
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.example
├── .gitignore
└── README.md
```

## 주요 기능 구현

1. **Task CRUD**
   - Create, Read, Update, Delete
   - API: /api/tasks

2. **AI 자동 분류**
   - OpenAI GPT-4 API 연동
   - 카테고리 자동 할당
   - API: /api/ai/categorize

3. **데이터베이스**
   - Prisma + SQLite (개발)
   - User, Task, Category 모델

4. **UI 컴포넌트**
   - TaskList, TaskItem, TaskForm
   - Tailwind CSS 스타일링

## 자체 검증 결과

✅ npm install 성공
✅ npm run dev 실행 가능
✅ 모든 API 엔드포인트 동작
✅ UI 정상 렌더링
✅ .env.example 제공
✅ README.md 상세 설명
✅ 비밀 정보 하드코딩 없음

=== PHASE 3 COMPLETE ===
Completed: Phase 3 (Development)
Files created:
- package.json
- next.config.js
- tsconfig.json
- .env.example
- .gitignore
- app/layout.tsx
- app/page.tsx
- app/tasks/page.tsx
- app/api/tasks/route.ts
- app/api/tasks/[id]/route.ts
- app/api/ai/categorize/route.ts
- components/TaskList.tsx
- components/TaskItem.tsx
- components/TaskForm.tsx
- lib/db.ts
- lib/ai.ts
- lib/utils.ts
- prisma/schema.prisma
- README.md

Project structure created with working code.

Ready for review.
```

## 리뷰 승인/거부 처리

### 승인 메시지 수신

```
[REVIEW_APPROVED]
reviewId: review_123
feedback: Great work! The planning documents are comprehensive and well-structured.
[/REVIEW_APPROVED]
```

**다음 동작**:
```markdown
리뷰가 승인되었습니다. Phase 2 (Design)를 시작합니다.

# Phase 2: Design

## Step 1: 화면 설계

/guide/design/01_screen.md를 참조하여 주요 화면을 설계합니다...
```

### 거부 메시지 수신

```
[REVIEW_REJECTED]
reviewId: review_123
reason: The market analysis (02_market.md) needs more specific data on market size and growth rate. Please add concrete numbers and sources.
[/REVIEW_REJECTED]
```

**다음 동작**:
```markdown
리뷰가 거부되었습니다. 피드백을 반영하여 수정합니다.

## 피드백
"The market analysis (02_market.md) needs more specific data on market size and growth rate. Please add concrete numbers and sources."

## 수정 계획
docs/planning/02_market.md를 다시 작성합니다:
1. 시장 규모 구체적 수치 추가 (TAM, SAM, SOM)
2. 성장률 데이터 추가 (출처 명시)
3. 신뢰할 수 있는 소스 인용

수정 중...
```

## Best Practices

### ✅ 좋은 습관

```
1. 완료 전 자체 검증
   → 체크리스트 확인

2. 명확한 완료 신호
   → 정확한 형식 사용

3. 산출물 목록 명시
   → 모든 파일 나열

4. 완료 요약 제공
   → 간단한 보고서 작성
```

### ❌ 피해야 할 실수

```
1. 일부만 완료하고 신호
   → 모든 Step 완료 필수

2. 품질 미달 상태로 완료
   → 검증 기준 만족 필수

3. 완료 신호 형식 오류
   → 정확한 형식 사용

4. 산출물 목록 누락
   → 모든 파일 명시
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../../../agent-manager/docs/protocols/phase-completion.md`** - Phase 완료 처리 (양방향 동기화)
2. **`../workflows/create-app.md`** - Phase 완료 신호 예시
3. **`../verification/*.md`** - 검증 기준
4. **`../../CLAUDE.md`** - 프로토콜 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - Protocols 문서 목록
2. **`../../CLAUDE.md`** - 서브 에이전트 개요
3. **`../workflows/create-app.md`** - create_app 워크플로우
4. **`../workflows/modify-app.md`** - modify_app 워크플로우

## 다음 단계

- **검증 기준**: `../verification/phase1-planning.md` - Phase 1 상세 검증
- **검증 기준**: `../verification/phase2-design.md` - Phase 2 상세 검증
- **검증 기준**: `../verification/phase3-development.md` - Phase 3 상세 검증
- **에러 보고**: `error-reporting.md` - 에러 발생 시 보고 방법

## 관련 문서

- **Agent Manager - Phase Completion**: `../../../agent-manager/docs/protocols/phase-completion.md`
- **Workflows - Create App**: `../workflows/create-app.md`
- **Verification - Phase 1**: `../verification/phase1-planning.md`
- **Verification - Phase 2**: `../verification/phase2-design.md`
- **Verification - Phase 3**: `../verification/phase3-development.md`
