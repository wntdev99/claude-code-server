# Phase 2 검증 기준 (Design)

## 개요

Phase 2 (설계) 완료 전 확인해야 할 품질 기준과 검증 방법을 설명합니다.

> **중요**: Phase 2는 Phase 1의 기획을 바탕으로 **구체적인 설계**를 작성합니다.

## 필수 산출물

### 5개 문서 모두 존재

```
✅ 필수:
docs/design/01_screen.md
docs/design/02_data_model.md
docs/design/03_task_flow.md
docs/design/04_api.md
docs/design/05_architecture.md

❌ 4개 이하는 불합격
```

## 문서별 검증 기준

### 01_screen.md - 화면 설계

#### 필수 요구사항

```
□ 최소 길이: 500자 이상
□ 주요 화면 최소 5개
□ 각 화면마다:
  - 화면 이름
  - 목적
  - 주요 UI 컴포넌트
  - 와이어프레임 (텍스트 또는 ASCII art)
□ 화면 흐름도
□ 플레이스홀더 없음
```

#### 품질 기준

**상 (Excellent)**:
- 주요 화면 10개 이상
- 상세한 와이어프레임 (ASCII art 또는 상세 텍스트)
- 화면 간 네비게이션 명확
- UI 컴포넌트 재사용 계획
- 반응형 디자인 고려

**중 (Good)**:
- 주요 화면 5-10개
- 기본 와이어프레임
- 화면 흐름 정의

**하 (Poor)**:
- 주요 화면 5개 미만
- 와이어프레임 없음
- 화면 흐름 불명확

**예시**:
```markdown
## 화면 1: 홈 / Task List

### 목적
사용자가 모든 Task를 한눈에 보고 관리할 수 있는 메인 화면

### UI 컴포넌트
- Header (앱 이름, 사용자 정보)
- Task 필터 (전체, 진행중, 완료)
- Task List (Task 카드)
- 새 Task 추가 버튼 (Floating Action Button)

### 와이어프레임
```
+------------------------------------------+
|  AI Todo App                    [User]   |
+------------------------------------------+
|  [All] [In Progress] [Completed]         |
+------------------------------------------+
|  +---------------------------------+     |
|  | ☐ 회의 준비           [Work]    |     |
|  | Due: 2024-01-15      Priority: High   |
|  +---------------------------------+     |
|  +---------------------------------+     |
|  | ☑ 보고서 작성        [Work]    |     |
|  | Completed: 2024-01-10              |  |
|  +---------------------------------+     |
|                                          |
|                            [+]           |
+------------------------------------------+
```

### 네비게이션
- Task 카드 클릭 → Task Detail 화면
- [+] 버튼 클릭 → New Task 화면
```

---

### 02_data_model.md - 데이터 모델

#### 필수 요구사항

```
□ 최소 길이: 500자 이상
□ 엔티티 최소 3개
□ 각 엔티티마다:
  - 필드 정의 (이름, 타입, 필수 여부)
  - 설명
  - 인덱스
  - 제약조건
□ 관계 정의 (1:N, N:M)
□ ERD (텍스트 또는 다이어그램)
```

#### 품질 기준

**상 (Excellent)**:
- 엔티티 5개 이상
- 모든 필드 타입 명확
- 인덱스 전략 구체적
- Cascade 규칙 정의
- 정규화 고려

**중 (Good)**:
- 엔티티 3-5개
- 주요 필드 정의
- 기본 관계 설정

**하 (Poor)**:
- 엔티티 3개 미만
- 필드 타입 불명확
- 관계 정의 없음

**예시**:
```markdown
## User 엔티티

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| id | UUID | Yes | uuid() | 고유 ID |
| email | String | Yes | - | 이메일 (unique) |
| name | String | Yes | - | 사용자 이름 |
| password | String | Yes | - | 암호화된 비밀번호 |
| createdAt | DateTime | Yes | now() | 생성 시간 |
| updatedAt | DateTime | Yes | now() | 수정 시간 |

### 인덱스
- `email` (unique) - 로그인 시 빠른 조회
- `createdAt` (desc) - 최신 사용자 조회

### 제약조건
- email: 유효한 이메일 형식
- password: 최소 8자 이상

### 관계
- User 1:N Task (한 사용자는 여러 Task 생성 가능)
- User 1:N Category (한 사용자는 여러 Category 생성 가능)

---

## Task 엔티티

### 필드

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| id | UUID | Yes | uuid() | 고유 ID |
| title | String | Yes | - | Task 제목 |
| description | String | No | - | Task 설명 |
| status | String | Yes | 'pending' | 상태: pending, in_progress, completed |
| priority | String | No | 'medium' | 우선순위: high, medium, low |
| categoryId | UUID | No | - | Category 참조 |
| userId | UUID | Yes | - | User 참조 |
| dueDate | DateTime | No | - | 마감일 |
| createdAt | DateTime | Yes | now() | 생성 시간 |
| updatedAt | DateTime | Yes | now() | 수정 시간 |

### 인덱스
- `userId` - 사용자별 Task 조회
- `status` - 상태별 필터링
- `categoryId` - 카테고리별 필터링
- `createdAt` (desc) - 최신 Task 조회

### 제약조건
- status: 'pending', 'in_progress', 'completed' 중 하나
- priority: 'high', 'medium', 'low' 중 하나

### 관계
- Task N:1 User (여러 Task는 한 사용자에 속함)
- Task N:1 Category (여러 Task는 한 카테고리에 속함)

---

## ERD

```
+------------+       1:N        +------------+
|   User     |----------------->|   Task     |
+------------+                  +------------+
| id         |                  | id         |
| email      |                  | title      |
| name       |                  | userId     |
| password   |                  | categoryId |
+------------+                  | status     |
      |                         +------------+
      | 1:N                            |
      |                                | N:1
      v                                v
+------------+                  +------------+
| Category   |                  | Category   |
+------------+                  +------------+
| id         |                  | id         |
| name       |                  | name       |
| userId     |                  | color      |
+------------+                  +------------+
```
```

---

### 03_task_flow.md - 작업 흐름

#### 필수 요구사항

```
□ 최소 길이: 500자 이상
□ 핵심 업무 흐름 2-3개
□ 각 흐름마다:
  - 시나리오 설명
  - 단계별 액션
  - 시퀀스 다이어그램 (텍스트)
  - 예외 처리
□ 상태 전이도 (Task, User 등)
```

#### 품질 기준

**상 (Excellent)**:
- 핵심 흐름 5개 이상
- 상세한 시퀀스 다이어그램
- 모든 예외 케이스 고려
- 상태 전이 명확

**중 (Good)**:
- 핵심 흐름 2-3개
- 기본 시퀀스 다이어그램
- 주요 예외 처리

**하 (Poor)**:
- 흐름 2개 미만
- 시퀀스 다이어그램 없음
- 예외 처리 없음

**예시**:
```markdown
## 흐름 1: Task 생성 및 AI 자동 분류

### 시나리오
사용자가 새로운 Task를 입력하면, AI가 자동으로 카테고리를 분류하고 우선순위를 제안한다.

### 시퀀스 다이어그램

```
User          UI          API         AI Service    DB
 |            |           |              |           |
 |--입력----->|           |              |           |
 |            |--POST---->|              |           |
 |            |           |--분류 요청--->|          |
 |            |           |              |--응답---->|
 |            |           |--Task 생성-------------->|
 |            |           |              |<--저장----|
 |            |<--201-----|              |           |
 |<--표시-----|           |              |           |
```

### 단계

1. 사용자가 Task 제목 및 설명 입력
2. UI가 POST /api/tasks 호출
3. API가 AI Service에 분류 요청
4. AI가 카테고리 및 우선순위 반환
5. API가 DB에 Task 저장
6. UI에 새 Task 표시

### 예외 처리

- AI Service 응답 실패 → 기본 카테고리("Other") 할당
- DB 저장 실패 → 사용자에게 에러 메시지, 재시도 유도
- 입력 검증 실패 → 400 에러, 오류 필드 표시
```

---

### 04_api.md - API 설계

#### 필수 요구사항

```
□ 최소 길이: 500자 이상
□ API 엔드포인트 최소 10개
□ 각 엔드포인트마다:
  - HTTP 메서드
  - 경로
  - Request 형식 (JSON)
  - Response 형식 (JSON)
  - 에러 코드
□ 인증/인가 방식
□ 에러 코드 정의
```

#### 품질 기준

**상 (Excellent)**:
- 엔드포인트 15개 이상
- 모든 CRUD 완비
- 상세한 Request/Response 스키마
- 에러 처리 완벽
- Rate Limiting 정의

**중 (Good)**:
- 엔드포인트 10-15개
- 주요 CRUD 포함
- 기본 에러 코드

**하 (Poor)**:
- 엔드포인트 10개 미만
- CRUD 불완전
- 에러 코드 없음

**예시**:
```markdown
### POST /api/tasks

**설명**: 새 Task 생성 및 AI 자동 분류

**Request**:
```json
{
  "title": "회의 준비",
  "description": "프로젝트 킥오프 미팅 자료 준비",
  "dueDate": "2024-01-15T10:00:00Z"
}
```

**Response** (201 Created):
```json
{
  "id": "task_123",
  "title": "회의 준비",
  "description": "프로젝트 킥오프 미팅 자료 준비",
  "status": "pending",
  "priority": "high",
  "categoryId": "cat_work",
  "category": {
    "id": "cat_work",
    "name": "Work"
  },
  "dueDate": "2024-01-15T10:00:00Z",
  "createdAt": "2024-01-10T09:00:00Z"
}
```

**Errors**:
- `400 Bad Request`: 제목 누락 또는 유효하지 않은 날짜
- `401 Unauthorized`: 인증 실패
- `500 Internal Server Error`: 서버 오류
```

---

### 05_architecture.md - 아키텍처

#### 필수 요구사항

```
□ 최소 길이: 500자 이상
□ 시스템 아키텍처 다이어그램
□ 계층 구조 (Presentation, Business, Data)
□ 기술 스택 상세 (Phase 1: 08_tech.md 기반)
□ 배포 구조
□ 보안 고려사항
```

#### 품질 기준

**상 (Excellent)**:
- 상세한 아키텍처 다이어그램
- 모든 레이어 설명
- 확장성 고려
- 성능 최적화 전략
- CI/CD 파이프라인

**중 (Good)**:
- 기본 아키텍처 다이어그램
- 주요 레이어 설명
- 배포 구조

**하 (Poor)**:
- 다이어그램 없음
- 레이어 불명확
- 배포 구조 없음

**예시**:
```markdown
## 시스템 아키텍처

```
┌─────────────────────────────────────────────┐
│           Client (Browser)                  │
│  Next.js 14 App Router + React 18           │
└───────────────┬─────────────────────────────┘
                │ HTTPS
                │
┌───────────────▼─────────────────────────────┐
│         Web Server (Next.js)                │
│  ┌─────────────────────────────────────┐   │
│  │  API Routes (Server Components)     │   │
│  │  - /api/tasks                        │   │
│  │  - /api/ai/categorize                │   │
│  └─────────────────────────────────────┘   │
└───────────────┬─────────────────────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌─────────────┐
│Database│ │AI API  │ │File Storage │
│Postgres│ │OpenAI  │ │Vercel Blob  │
└────────┘ └────────┘ └─────────────┘
```

## 계층 구조

### Presentation Layer
- **기술**: React 18, Next.js 14 App Router
- **역할**: UI 렌더링, 사용자 입력 처리
- **컴포넌트**: TaskList, TaskItem, TaskForm

### Business Layer
- **기술**: Next.js API Routes
- **역할**: 비즈니스 로직, AI 통합
- **모듈**: Task CRUD, AI 분류, 우선순위 계산

### Data Layer
- **기술**: Prisma + PostgreSQL
- **역할**: 데이터 영속성
- **모델**: User, Task, Category

## 배포 구조

- **Frontend + Backend**: Vercel (Edge Network)
- **Database**: Supabase (Managed PostgreSQL)
- **AI**: OpenAI API (외부 서비스)
- **CI/CD**: GitHub Actions → Vercel Auto Deploy
```

## 전체 검증 체크리스트

### 필수 항목

```
□ 5개 문서 모두 존재
□ 각 문서 500자 이상
□ 플레이스홀더 없음
□ 모든 필수 섹션 작성 완료
□ Markdown 형식 올바름
```

### Phase 1과의 일관성

```
□ 01_screen.md의 화면 = Phase 1: 07_features.md의 기능 반영
□ 02_data_model.md의 엔티티 = Phase 1: 06_product.md의 데이터 요구사항
□ 04_api.md의 엔드포인트 = Phase 1: 07_features.md의 기능 지원
□ 05_architecture.md의 기술 스택 = Phase 1: 08_tech.md와 일치
```

### 품질 검증

```
□ 구체적인 내용 (일반론 금지)
□ 다이어그램 포함 (텍스트 또는 ASCII art)
□ 예시 포함
□ 논리적 일관성
```

## 자동 검증 스크립트

```bash
#!/bin/bash

DOCS_DIR="docs/design"
MIN_LENGTH=500

echo "=== Phase 2 Design 검증 ==="

# 1. 문서 존재 확인
for i in {01..05}; do
  FILE="${DOCS_DIR}/${i}_*.md"
  if ls $FILE 1> /dev/null 2>&1; then
    echo "✅ $FILE exists"
  else
    echo "❌ $FILE missing"
    exit 1
  fi
done

# 2. 최소 길이 확인
for FILE in ${DOCS_DIR}/*.md; do
  LENGTH=$(wc -m < "$FILE")
  if [ $LENGTH -ge $MIN_LENGTH ]; then
    echo "✅ $FILE: ${LENGTH}자"
  else
    echo "❌ $FILE: ${LENGTH}자 (최소 ${MIN_LENGTH}자 필요)"
    exit 1
  fi
done

# 3. 플레이스홀더 확인
PLACEHOLDERS="TODO|Insert|Fill|Add details|TBD"
for FILE in ${DOCS_DIR}/*.md; do
  if grep -qiE "\[$PLACEHOLDERS\]|$PLACEHOLDERS" "$FILE"; then
    echo "❌ $FILE: 플레이스홀더 발견"
    exit 1
  else
    echo "✅ $FILE: 플레이스홀더 없음"
  fi
done

echo "✅ Phase 2 검증 통과!"
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../deliverables/documents.md`** - Phase 2 문서 작성 규칙
2. **`../workflows/create-app.md`** - Phase 2 완료 조건
3. **`../protocols/phase-completion.md`** - 완료 신호 전 체크리스트
4. **`../../CLAUDE.md`** - 검증 기준 개요

### 이 문서를 참조하는 문서

1. **`../README.md`** - Verification 문서 목록
2. **`../../CLAUDE.md`** - 서브 에이전트 개요
3. **`../workflows/create-app.md`** - create_app 워크플로우
4. **`../protocols/phase-completion.md`** - Phase 완료 프로토콜

## 다음 단계

- **Phase 1 검증**: `phase1-planning.md` - Planning Phase 검증
- **Phase 3 검증**: `phase3-development.md` - Development Phase 검증
- **문서 작성**: `../deliverables/documents.md` - 문서 작성 규칙

## 관련 문서

- **Deliverables - Documents**: `../deliverables/documents.md`
- **Workflows - Create App**: `../workflows/create-app.md`
- **Protocols - Phase Completion**: `../protocols/phase-completion.md`
- **Guides - Design**: `/guide/design/*.md`
