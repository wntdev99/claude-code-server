# Sub-Agent 문서

이 폴더는 서브 에이전트가 작업을 수행할 때 필요한 모든 문서를 포함합니다.

## 📂 폴더 구조

### `workflows/` - 작업 타입별 워크플로우
각 작업 타입의 Phase별 워크플로우 가이드

- **README.md** - 워크플로우 개요
- **create-app.md** - 앱 생성 (기획 → 설계 → 개발 → 테스트)
- **modify-app.md** - 앱 수정 (분석 → 계획 → 구현 → 테스트)
- **workflow.md** - 워크플로우 자동화
- **custom.md** - 자유 형식 대화

### `protocols/` - 통신 프로토콜 사용법
플랫폼과 통신하는 프로토콜 사용 방법

- **README.md** - 프로토콜 개요
- **dependency-request.md** - 의존성 요청 방법
- **user-question.md** - 사용자 질문 방법
- **phase-completion.md** - Phase 완료 신호
- **error-reporting.md** - 에러 보고 방법

### `deliverables/` - 산출물 생성 규칙
Phase별 산출물 생성 가이드

- **README.md** - 산출물 개요
- **documents.md` - 문서 작성 규칙 (최소 500자, 포맷 등)
- **code.md** - 코드 프로젝트 구조
- **requirements.md** - 품질 요구사항

### `verification/` - 검증 기준
Phase별 검증 통과 기준

- **README.md** - 검증 개요
- **phase1-planning.md` - Phase 1 검증 기준
- **phase2-design.md** - Phase 2 검증 기준
- **phase3-development.md** - Phase 3 검증 기준

## 🎯 사용 방법

### 처음 작업 받았을 때

```
1. workflows/README.md
   → 작업 타입 확인

2. workflows/[작업타입].md
   → 해당 워크플로우 이해

3. /guide/[phase]/*.md
   → Phase별 가이드 참조
```

### 의존성 필요할 때

```
protocols/dependency-request.md
→ 프로토콜 형식 확인 및 사용
```

### 사용자 질문 필요할 때

```
protocols/user-question.md
→ 질문 형식 및 사용 시점
```

### 산출물 생성할 때

```
1. deliverables/documents.md (문서인 경우)
2. deliverables/code.md (코드인 경우)
3. deliverables/requirements.md (품질 확인)
```

### Phase 완료 후

```
1. verification/phase[N]-*.md
   → 검증 기준 확인

2. protocols/phase-completion.md
   → 완료 신호 전송
```

## 📚 참조 순서

create_app 작업 예시:

```
1. 작업 이해
   → workflows/create-app.md

2. Phase 1 시작
   → /guide/planning/01_idea.md 읽기
   → deliverables/documents.md 참조
   → docs/planning/01_idea.md 생성
   ... (9개 문서 생성)

3. Phase 1 검증
   → verification/phase1-planning.md 확인

4. Phase 1 완료
   → protocols/phase-completion.md 사용

5. Phase 2-4 반복
   ...
```

## 🔗 관련 문서

- **패키지 루트**: `../README.md` - 패키지 전체 개요
- **실행 가이드**: `../CLAUDE.md` - 전반적인 실행 가이드
- **가이드 문서**: `/guide/` - 24개 상세 가이드
- **에이전트 관리자**: `../../agent-manager/docs/` - 관리자 문서
