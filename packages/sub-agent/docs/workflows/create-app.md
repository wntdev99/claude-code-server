# create_app 워크플로우

## 개요

새로운 앱/웹 프로젝트를 처음부터 만드는 워크플로우입니다.

> **대상**: 서브 에이전트가 `create_app` 타입 작업을 수행할 때 참조

## 워크플로우 구조

```
Phase 1: Planning (기획) - 9 Steps
    ↓ 리뷰 게이트
Phase 2: Design (설계) - 5 Steps
    ↓ 리뷰 게이트
Phase 3: Development (개발) - 6 Steps
    ↓ 리뷰 게이트
Phase 4: Testing (테스트) - 검증
    ↓
완료
```

## Phase 1: Planning (기획)

### 목표
프로젝트의 기본 방향과 요구사항을 정의합니다.

### Steps (9단계)

#### Step 1: 아이디어 정의

**가이드**: `/guide/planning/01_idea.md`

**산출물**: `docs/planning/01_idea.md`

**내용**:
- 문제 정의
- 솔루션 개요
- 핵심 가치 제안
- 타겟 사용자
- 차별화 요소

**최소 요구사항**:
- 500자 이상
- 모든 섹션 작성
- 구체적인 내용 (일반적인 설명 금지)

**작업 순서**:
```
1. /guide/planning/01_idea.md 읽기
2. Task 설명에서 핵심 아이디어 파악
3. 템플릿 구조 따라 작성
4. docs/planning/01_idea.md 생성
5. 500자 이상 확인
```

#### Step 2: 시장 분석

**가이드**: `/guide/planning/02_market.md`

**산출물**: `docs/planning/02_market.md`

**내용**:
- 시장 크기 및 트렌드
- 경쟁사 분석
- 타겟 시장
- 기회 요인

#### Step 3: 페르소나 정의

**가이드**: `/guide/planning/03_persona.md`

**산출물**: `docs/planning/03_persona.md`

**내용**:
- 주요 페르소나 (2-3개)
- 인구통계 정보
- 니즈와 고충
- 사용 패턴

#### Step 4: 사용자 여정

**가이드**: `/guide/planning/04_user_journey.md`

**산출물**: `docs/planning/04_user_journey.md`

**내용**:
- 핵심 사용자 여정 (2-3개)
- 터치포인트
- 감정 곡선
- 개선 기회

#### Step 5: 비즈니스 모델

**가이드**: `/guide/planning/05_business_model.md`

**산출물**: `docs/planning/05_business_model.md`

**내용**:
- 수익 모델
- 가격 전략
- 비용 구조
- 핵심 지표 (KPI)

**질문 사용 예시**:
```
[USER_QUESTION]
category: business
question: 어떤 수익 모델을 선호하시나요?
options:
  - 구독 (월/연간)
  - 프리미엄 (무료 + 유료 기능)
  - 광고 기반
default: 프리미엄
required: false
[/USER_QUESTION]
```

#### Step 6: 제품 정의

**가이드**: `/guide/planning/06_product.md`

**산출물**: `docs/planning/06_product.md`

**내용**:
- 제품 범위
- 핵심 기능
- 제외 사항
- 성공 지표

#### Step 7: 기능 명세

**가이드**: `/guide/planning/07_features.md`

**산출물**: `docs/planning/07_features.md`

**내용**:
- 기능 목록 (우선순위별)
- Must Have / Should Have / Nice to Have
- 사용자 스토리
- 수용 기준

#### Step 8: 기술 검토

**가이드**: `/guide/planning/08_tech.md`

**산출물**: `docs/planning/08_tech.md`

**내용**:
- 기술 스택 선택
- 프레임워크 및 라이브러리
- 인프라 계획
- 기술적 제약사항

**자율 결정**:
- 현대적이고 검증된 기술 스택 선택
- 예: React, Next.js, TypeScript, Tailwind CSS 등
- 사용자가 특정 기술을 명시하지 않았다면 업계 표준 선택

#### Step 9: 로드맵

**가이드**: `/guide/planning/09_roadmap.md`

**산출물**: `docs/planning/09_roadmap.md`

**내용**:
- 개발 단계 (Phase별)
- 마일스톤
- 일정 (상대적 타임라인)
- 위험 요소

### Phase 1 완료

모든 9개 문서 작성 후:

```
1. 자체 검증
   → docs/verification/phase1-planning.md 기준 확인
   → 9개 문서 존재 확인
   → 각 문서 500자 이상 확인
   → 플레이스홀더 없는지 확인

2. 완료 신호 전송
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

3. 리뷰 대기
   → 사용자 승인 대기
```

## Phase 2: Design (설계)

### 목표
시스템 설계 및 아키텍처를 정의합니다.

### Steps (5단계)

#### Step 1: 화면 설계

**가이드**: `/guide/design/01_screen.md`

**산출물**: `docs/design/01_screen.md`

**내용**:
- 주요 화면 목록
- 와이어프레임 (텍스트 설명)
- 화면 흐름
- UI 컴포넌트

#### Step 2: 데이터 모델

**가이드**: `/guide/design/02_data_model.md`

**산출물**: `docs/design/02_data_model.md`

**내용**:
- 엔티티 정의
- 속성 및 타입
- 관계 (1:N, N:M)
- 인덱스 및 제약조건

**예시**:
```markdown
## User 엔티티

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | UUID | Yes | 고유 ID |
| email | String | Yes | 이메일 (unique) |
| name | String | Yes | 사용자 이름 |
| createdAt | DateTime | Yes | 생성 시간 |

## 관계
- User 1:N Task (한 사용자는 여러 Task 생성)
```

#### Step 3: 작업 흐름

**가이드**: `/guide/design/03_task_flow.md`

**산출물**: `docs/design/03_task_flow.md`

**내용**:
- 핵심 업무 흐름 (2-3개)
- 시퀀스 다이어그램 (텍스트)
- 상태 전이
- 예외 처리

#### Step 4: API 설계

**가이드**: `/guide/design/04_api.md`

**산출물**: `docs/design/04_api.md`

**내용**:
- API 엔드포인트 목록
- Request/Response 형식
- 인증/인가
- 에러 코드

**예시**:
```markdown
### POST /api/tasks

**설명**: 새 Task 생성

**Request**:
```json
{
  "title": "Todo App",
  "type": "create_app",
  "description": "..."
}
```

**Response** (201):
```json
{
  "id": "task_123",
  "title": "Todo App",
  ...
}
```
```

#### Step 5: 아키텍처

**가이드**: `/guide/design/05_architecture.md`

**산출물**: `docs/design/05_architecture.md`

**내용**:
- 시스템 아키텍처
- 계층 구조
- 기술 스택 상세
- 배포 구조

### Phase 2 완료

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

## Phase 3: Development (개발)

### 목표
실제 동작하는 코드 프로젝트를 생성합니다.

### Steps (6단계)

#### Step 1: 프로젝트 초기화

**가이드**: `/guide/development/01_setup.md`

**작업**:
```bash
# 1. 프로젝트 초기화
npm create next-app@latest . --typescript --tailwind --app --src-dir

# 2. 필요 패키지 설치
npm install [필요한 패키지들]

# 3. 설정 파일 생성
# - .env.example
# - .gitignore
# - tsconfig.json (조정)
```

**산출물**:
- `package.json`
- `next.config.js`
- `.env.example`
- `.gitignore`
- `tsconfig.json`

#### Step 2-6: 코드 구현

자세한 내용은 `/guide/development/` 참조

### Phase 3 완료

```
=== PHASE 3 COMPLETE ===
Completed: Phase 3 (Development)
Project structure created with working code.

Ready for review.
```

## Phase 4: Testing (테스트)

자동 검증 수행 후 완료

## 의존성 요청 타이밍

### 언제 요청하나?

```
✅ API 키가 실제로 필요한 시점
   → Phase 3 (개발) 중 API 통합 시

✅ 데이터베이스 연결 정보
   → Phase 3 (개발) 중 데이터 계층 구현 시

❌ 미리 요청하지 말 것
   → Phase 1, 2에서는 일반적으로 불필요
```

## 사용자 질문 타이밍

### 언제 질문하나?

```
✅ 비즈니스 결정이 필요한 시점
   → Phase 1: 수익 모델, 가격 정책 등

✅ 모호한 요구사항 명확화
   → 어느 Phase에서든 필요 시

❌ 기술적 결정
   → 스스로 판단 (현대적 표준 선택)
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../README.md`** - Workflows 목록
2. **`../../CLAUDE.md`** - 서브 에이전트 개요
3. **`../deliverables/documents.md`** - 산출물 규칙 (문서 수 변경 시)
4. **`../verification/phase1-planning.md`** - Phase 1 검증 기준

### 이 문서를 참조하는 문서

1. **`../README.md`** - Workflows 문서 목록
2. **`../../CLAUDE.md`** - 서브 에이전트 개요
3. **`modify-app.md`** - 비교 참조
4. **`../protocols/phase-completion.md`** - 완료 신호

## 다음 단계

- **산출물 규칙**: `../deliverables/documents.md` - 문서 작성 상세 규칙
- **검증 기준**: `../verification/phase1-planning.md` - Phase별 검증 기준
- **프로토콜**: `../protocols/` - 통신 프로토콜 사용법

## 관련 문서

- **Deliverables**: `../deliverables/documents.md`, `../deliverables/code.md`
- **Verification**: `../verification/phase1-planning.md`, `phase2-design.md`, `phase3-development.md`
- **Protocols**: `../protocols/dependency-request.md`, `phase-completion.md`
- **Guides**: `/guide/planning/`, `/guide/design/`, `/guide/development/`
