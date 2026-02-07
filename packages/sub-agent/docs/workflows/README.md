# 워크플로우 가이드

작업 타입별 Phase 기반 워크플로우를 설명합니다.

## 📄 문서 목록

### `create-app.md`
**언제 읽나요?** `create_app` 타입 작업을 할 때

**워크플로우**: Planning (9) → Design (5) → Development (6) → Testing

**내용**:
- Phase 1: 기획 - 9개 문서 생성
- Phase 2: 설계 - 5개 문서 생성
- Phase 3: 개발 - 실제 코드 프로젝트
- Phase 4: 테스트 - 검증

**가이드 참조**:
- `/guide/planning/*.md` (9개)
- `/guide/design/*.md` (5개)
- `/guide/development/*.md` (6개)
- `/guide/verification/*.md` (3개)

### `modify-app.md`
**언제 읽나요?** `modify_app` 타입 작업을 할 때

**워크플로우**: Analysis (3) → Planning (4) → Implementation (6) → Testing

**내용**:
- Phase 1: 분석 - 기존 코드 이해
- Phase 2: 계획 - 수정 계획 수립
- Phase 3: 구현 - 코드 수정
- Phase 4: 테스트 - 회귀 테스트

### `workflow.md`
**언제 읽나요?** `workflow` 타입 작업을 할 때

**워크플로우**: Planning (5) → Design (4) → Development (5) → Testing

**내용**:
- 워크플로우 자동화에 특화
- 트리거, 스텝, 통합 중심

### `custom.md`
**언제 읽나요?** `custom` 타입 작업을 할 때

**워크플로우**: 자유 형식

**내용**:
- 고정된 Phase 없음
- 사용자 프롬프트에 자유롭게 응답
- 필요시 질문 사용

## 🎯 작업 타입 선택 가이드

### create_app
```
✅ 새로운 앱/웹 프로젝트 만들기
✅ 처음부터 전체 시스템 설계
✅ 완전한 제품 개발

❌ 기존 코드 수정
❌ 단순 질문 답변
```

### modify_app
```
✅ 기존 프로젝트 수정
✅ 기능 추가/제거
✅ 버그 수정

❌ 새 프로젝트 생성
❌ 전체 재설계
```

### workflow
```
✅ 자동화 워크플로우 생성
✅ 반복 작업 자동화
✅ 통합 시스템 구축

❌ 일반 앱 개발
❌ 단순 스크립트
```

### custom
```
✅ 특정 질문 답변
✅ 문서 작성
✅ 코드 리뷰
✅ 컨설팅

❌ 체계적인 프로젝트 개발
```

## 📊 워크플로우 비교

| 작업 타입 | Phase 수 | 총 Step | 산출물 |
|----------|----------|---------|--------|
| create_app | 4 | 20 | 14 문서 + 코드 |
| modify_app | 4 | 13 | 분석 문서 + 수정 코드 |
| workflow | 4 | 14 | 워크플로우 정의 + 구현 |
| custom | 1 | 가변 | 요청에 따라 |

## 🔍 빠른 참조

### "앱을 만들어야 해"
→ `create-app.md`

### "기존 코드를 수정해야 해"
→ `modify-app.md`

### "자동화를 만들어야 해"
→ `workflow.md`

### "질문에 답해야 해"
→ `custom.md`

## 💡 공통 패턴

모든 워크플로우 (custom 제외)는:

1. **가이드 참조** - `/guide/` 폴더의 문서 읽기
2. **산출물 생성** - Phase별 요구사항 충족
3. **검증** - 자동 검증 통과
4. **완료 신호** - `=== PHASE N COMPLETE ===`
5. **리뷰 대기** - 사용자 승인 대기
6. **다음 Phase** - 승인 시 진행

## 🔗 관련 문서

- **프로토콜**: `../protocols/` - 통신 방법
- **산출물**: `../deliverables/` - 생성 규칙
- **검증**: `../verification/` - 통과 기준
- **가이드**: `/guide/` - 상세 가이드 (24개)
