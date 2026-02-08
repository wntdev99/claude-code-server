# Sub-Agent 작업 수행 가이드

**역할**: 서브 에이전트 (Tier 3) - 실제 작업 수행

**목적**: 이 가이드는 서브 에이전트가 작업을 수행할 때 참조하는 전반적인 가이드입니다.

## 🎯 서브 에이전트의 책임

1. **작업 수행** - Phase 기반 워크플로우 따라 작업 실행
2. **가이드 참조** - `/guide/` 폴더의 문서 읽고 적용
3. **산출물 생성** - 고품질 문서 및 코드 생성
4. **프로토콜 사용** - 플랫폼과 통신
5. **자율 실행** - 독립적으로 의사결정

## 📂 작업 디렉토리 (Workspace)

**중요**: 당신의 현재 작업 디렉토리(`cwd`)는 다음 경로로 설정되어 있습니다:

```
/projects/{task-id}/
```

여기서 `{task-id}`는 당신의 고유한 작업 식별자입니다.

### 디렉토리 구조

작업 디렉토리는 이미 다음과 같은 구조로 생성되어 있습니다:

```
/projects/{task-id}/
├── docs/
│   ├── planning/      # Phase 1 산출물 위치
│   └── design/        # Phase 2 산출물 위치
├── src/               # Phase 3 코드 작성 위치
├── .metadata/         # 시스템 메타데이터 (건드리지 마세요)
├── .checkpoints/      # 체크포인트 (자동 생성)
└── .logs/             # 로그 (자동 생성)
```

### 파일 작성 예시

**Phase 1 기획 문서 작성**:
```bash
# 절대 경로 사용 (권장하지 않음)
/projects/{task-id}/docs/planning/01_idea.md

# 상대 경로 사용 (권장)
docs/planning/01_idea.md
```

**Phase 2 설계 문서 작성**:
```bash
docs/design/01_screen.md
docs/design/02_data_model.md
```

**Phase 3 코드 작성**:
```bash
src/index.js
src/components/Button.jsx
package.json
```

### 주의사항

1. **절대 경로 대신 상대 경로 사용**: 항상 현재 작업 디렉토리 기준 상대 경로 사용
2. **시스템 디렉토리 건드리지 않기**: `.metadata/`, `.checkpoints/`, `.logs/`는 자동 관리됨
3. **가이드 문서 참조**: `/guide/` 폴더의 문서는 읽기 전용 (수정 금지)

## 📚 문서 구조

모든 상세 문서는 `docs/` 폴더에 주제별로 정리되어 있습니다:

```
docs/
├── workflows/       # 작업 타입별 워크플로우
├── protocols/       # 통신 프로토콜
├── deliverables/    # 산출물 생성 규칙
└── verification/    # 검증 기준
```

**📖 시작하기**: `docs/README.md`를 먼저 읽어보세요.

## 🚀 빠른 시작

### 1. 작업 받았을 때

```
1. 작업 타입 확인
   → create_app / modify_app / workflow / custom

2. 워크플로우 이해
   → docs/workflows/[작업타입].md

3. Phase 1 시작
   → /guide/[phase]/01_*.md 읽기
```

### 2. 작업 타입별 가이드

| 작업 타입 | 읽을 문서 |
|----------|----------|
| create_app | `docs/workflows/create-app.md` |
| modify_app | `docs/workflows/modify-app.md` |
| workflow | `docs/workflows/workflow.md` |
| custom | `docs/workflows/custom.md` |

### 3. 필요한 순간에 참조

| 필요한 것 | 읽을 문서 |
|----------|----------|
| Optional Integrations 활용 | 이 문서의 "🔌 Optional Integrations" 섹션 |
| 사용자 질문 | `docs/protocols/user-question.md` |
| 문서 작성 규칙 | `docs/deliverables/documents.md` |
| 코드 작성 규칙 | `docs/deliverables/code.md` |
| 검증 기준 | `docs/verification/phase[N]-*.md` |

## 🔍 일반적인 작업 흐름 (create_app 예시)

```
1. 작업 이해
   → docs/workflows/create-app.md 읽기
   → 4 Phase 워크플로우 확인

2. Phase 1: Planning
   → /guide/planning/01_idea.md 읽기
   → docs/planning/01_idea.md 생성 (500자 이상)
   → ... 9개 문서 생성
   → docs/verification/phase1-planning.md로 자체 검증
   → docs/protocols/phase-completion.md로 완료 신호

3. 리뷰 대기
   → 사용자 승인 대기

4. Phase 2: Design
   → /guide/design/01_screen.md 읽기
   → ... 5개 문서 생성
   → 완료 신호

5. Phase 3: Development
   → /guide/development/01_setup.md 읽기
   → 실제 코드 프로젝트 생성
   → 완료 신호

6. Phase 4: Testing
   → 최종 검증
   → 완료
```

## 📋 4가지 작업 타입

### create_app - 새 앱 생성
```
워크플로우: 기획(9) → 설계(5) → 개발(6) → 테스트
산출물: 14개 문서 + 실제 코드 프로젝트
가이드: /guide/planning, design, development, verification
```

### modify_app - 앱 수정
```
워크플로우: 분석(3) → 계획(4) → 구현(6) → 테스트
산출물: 분석 문서 + 수정된 코드
가이드: 기존 가이드 + 수정 전략
```

### workflow - 워크플로우 자동화
```
워크플로우: 기획(5) → 설계(4) → 개발(5) → 테스트
산출물: 워크플로우 정의 + 구현
가이드: 워크플로우 중심 가이드
```

### custom - 자유 형식
```
워크플로우: 없음 (자유)
산출물: 요청에 따라
가이드: 필요 시 참조
```

## 🗣️ 프로토콜 사용

### 사용자 질문
```
[USER_QUESTION]
category: business
question: What pricing model?
options: [Subscription, Freemium, Ad-based]
[/USER_QUESTION]
```
→ `docs/protocols/user-question.md` 참조

### Phase 완료
```
=== PHASE 1 COMPLETE ===
Completed: Phase 1 (Planning)
Documents created:
- docs/planning/01_idea.md
- ...
```
→ `docs/protocols/phase-completion.md` 참조

## 📝 산출물 규칙

### 문서
- **최소 길이**: 500자 이상
- **형식**: Markdown (##, ###, ####)
- **금지**: 플레이스홀더 (`[TODO]`, `[Insert X]`)
- **필수**: 모든 섹션 완성

→ `docs/deliverables/documents.md` 참조

### 코드
- **구조**: 표준 프로젝트 구조
- **보안**: 비밀 정보 하드코딩 금지
- **문서**: README.md 포함
- **테스트**: 주요 기능 테스트 포함

→ `docs/deliverables/code.md` 참조

## ✅ 검증 기준

### Phase 1 (기획)
- [ ] 9개 문서 모두 존재
- [ ] 각 문서 500자 이상
- [ ] 플레이스홀더 없음
- [ ] 일관된 정보

→ `docs/verification/phase1-planning.md` 참조

### Phase 2 (설계)
- [ ] 5개 문서 모두 존재
- [ ] 데이터 모델 명확
- [ ] API 스펙 완전
- [ ] 아키텍처 문서화

→ `docs/verification/phase2-design.md` 참조

### Phase 3 (개발)
- [ ] 프로젝트 구조 올바름
- [ ] 필요 파일 존재
- [ ] 테스트 포함
- [ ] .env가 .gitignore에
- [ ] 비밀 정보 하드코딩 없음

→ `docs/verification/phase3-development.md` 참조

## 🔌 Optional Integrations 활용

플랫폼에 설정된 Optional Integrations를 조회하고 활용할 수 있습니다.

### Settings 조회 방법

**Phase 3 (Development) 시작 시**:
1. 플랫폼 Settings를 조회 (읽기 전용)
2. Optional integration이 설정되어 있는지 확인
3. 있으면 해당 기능 사용, 없으면 graceful degradation

### GitHub Integration

```
Settings 조회 → github_token 있음:
  ✅ GitHub repository 자동 생성
  ✅ 코드 자동 push
  ✅ README에 repo URL 추가

Settings 조회 → github_token 없음:
  ✅ 로컬에만 프로젝트 저장
  ✅ README에 "수동으로 GitHub 업로드" 안내 추가:
     ```bash
     # GitHub에 업로드하기
     git init
     git add .
     git commit -m "Initial commit"
     git remote add origin [your-repo-url]
     git push -u origin main
     ```
```

### Supabase Integration

```
Settings 조회 → supabase_url, supabase_key 있음:
  ✅ Supabase 프로젝트에 DB 스키마 자동 생성
  ✅ README에 "Supabase 연결됨" 안내

Settings 조회 → supabase credentials 없음:
  ✅ README에 Supabase 수동 설정 안내:
     1. Supabase 프로젝트 생성
     2. Database → SQL Editor에서 schema.sql 실행
     3. .env에 SUPABASE_URL, SUPABASE_KEY 추가
```

### Vercel Deployment

```
Settings 조회 → vercel_token 있음:
  ✅ Vercel에 자동 배포
  ✅ README에 배포 URL 추가

Settings 조회 → vercel_token 없음:
  ✅ README에 수동 배포 안내:
     ```bash
     npm install -g vercel
     vercel login
     vercel
     ```
```

### 중요 원칙

1. **절대 요청하지 않음**: Settings에 없어도 작업을 중단하거나 요청하지 않음
2. **Graceful degradation**: 기능이 없으면 문서화만 제공
3. **사용자 경험 최우선**: README에 명확한 수동 방법 제공

## 🤔 자율 실행 가이드라인

### 스스로 결정하세요
- ✅ 구현 세부사항 (파일 구조, 네이밍)
- ✅ 기술 선택 (합리적 범위 내)
- ✅ 디자인 선택 (현대적 표준 따름)
- ✅ 코드 구조 결정

### 질문하세요
- ❓ 비즈니스 로직 (가격, 기능 우선순위)
- ❓ 모호한 요구사항
- ❓ 중대한 아키텍처 결정
- ❓ 사용자 선호도

### 절대 질문하지 마세요
- ❌ 이미 제공된 정보
- ❌ 업계 표준 사항
- ❌ 당신의 전문 영역
- ❌ 명백한 선택

## 📖 전체 문서 목록

### Workflows (워크플로우)
- `docs/workflows/README.md` - 워크플로우 개요
- `docs/workflows/create-app.md` - 앱 생성
- `docs/workflows/modify-app.md` - 앱 수정
- `docs/workflows/workflow.md` - 워크플로우 자동화
- `docs/workflows/custom.md` - 자유 형식

### Protocols (프로토콜)
- `docs/protocols/README.md` - 프로토콜 개요
- `docs/protocols/user-question.md` - 사용자 질문
- `docs/protocols/phase-completion.md` - Phase 완료
- `docs/protocols/error-reporting.md` - 에러 보고

### Deliverables (산출물)
- `docs/deliverables/README.md` - 산출물 개요
- `docs/deliverables/documents.md` - 문서 작성 규칙
- `docs/deliverables/code.md` - 코드 작성 규칙
- `docs/deliverables/requirements.md` - 품질 요구사항

### Verification (검증)
- `docs/verification/README.md` - 검증 개요
- `docs/verification/phase1-planning.md` - Phase 1 기준
- `docs/verification/phase2-design.md` - Phase 2 기준
- `docs/verification/phase3-development.md` - Phase 3 기준

## 💡 효율적인 작업 방법

### ✅ 좋은 방법
```
1. 가이드 먼저 읽기
   → /guide/[phase]/[step].md

2. 예시 참고
   → 가이드의 예시 활용

3. 검증 기준 확인
   → 작업 전 요구사항 이해

4. 자체 검증
   → 완료 전 체크리스트 확인
```

### ❌ 피해야 할 실수
```
1. 가이드 건너뛰기
   → 항상 가이드 참조!

2. 플레이스홀더 남기기
   → [TODO] 금지

3. 짧은 문서
   → 최소 500자

4. 불필요한 질문
   → 스스로 결정 가능한 것은 결정
```

## 🆘 문제 해결

### "무엇을 해야 할지 모르겠어요"
→ `docs/workflows/[작업타입].md` 읽기

### "GitHub/Supabase 연동은 어떻게 하나요?"
→ 이 문서의 "🔌 Optional Integrations 활용" 섹션 참조
→ Settings에 있으면 자동 사용, 없으면 README에 수동 방법 문서화

### "사용자에게 질문해야 해요"
→ `docs/protocols/user-question.md` 사용

### "검증을 통과 못할 것 같아요"
→ `docs/verification/phase[N]-*.md` 재확인

## 🔄 다음 단계

1. **`docs/README.md`** 읽기
2. **`docs/workflows/README.md`** 읽기
3. **작업 타입에 맞는 워크플로우** 읽기
4. **가이드 문서** 참조하며 작업 시작

---

**기억하세요**: 이 CLAUDE.md는 전체 개요입니다. 상세한 내용은 `docs/` 폴더와 `/guide/` 폴더를 참조하세요!

**문서 위치**:
- 패키지 문서: `/packages/sub-agent/docs/`
- 가이드 문서: `/guide/`
