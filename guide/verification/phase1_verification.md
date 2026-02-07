# Phase 1 검증 가이드

## 목적

Phase 1 (기획) 산출물 9개 문서를 다각도로 검증합니다.
프로그램적 검증을 통과한 항목을 제외하고, 에이전트 판단이 필요한 항목만 검증합니다.

## 검증 대상

- `docs/planning/01_idea.md` — 아이디어 정의
- `docs/planning/02_market.md` — 시장 분석
- `docs/planning/03_persona.md` — 페르소나
- `docs/planning/04_user_journey.md` — 사용자 여정
- `docs/planning/05_business_model.md` — 비즈니스 모델
- `docs/planning/06_product.md` — 제품 정의
- `docs/planning/07_features.md` — 기능 정의
- `docs/planning/08_tech.md` — 기술 검토
- `docs/planning/09_roadmap.md` — 로드맵

---

## 검증 관점

### 1. 일관성 (Consistency)

#### P1_CONS_01: 페르소나 Pain Points ↔ 기능 User Story
- `03_persona.md`에서 정의된 Pain Points를 추출
- `07_features.md`의 User Story에서 각 Pain Point가 해결되는지 확인
- **통과 기준**: 모든 Primary Persona Pain Point가 최소 1개 User Story에 반영

#### P1_CONS_02: 기술 스택 ↔ 기능 요구사항
- `08_tech.md`의 기술 스택 확인
- `07_features.md`의 기능 요구사항이 해당 기술로 구현 가능한지 평가
- **통과 기준**: 명백히 지원 불가능한 기능이 없음

#### P1_CONS_03: 문제 정의 일관성
- `01_idea.md`의 핵심 문제 정의 추출
- 나머지 8개 문서에서 이 문제가 일관되게 참조되는지 확인
- **통과 기준**: 문제 정의의 핵심 키워드/개념이 최소 5개 문서에서 참조

### 2. 타당성 (Feasibility)

#### P1_FEAS_01: 비즈니스 모델 ↔ 시장 분석
- `05_business_model.md`의 수익 모델 확인
- `02_market.md`의 시장 규모, 경쟁사 분석과 비교
- **통과 기준**: 수익 모델이 시장 현실과 명백히 모순되지 않음

#### P1_FEAS_02: 로드맵 일정 ↔ MVP 범위
- `09_roadmap.md`의 일정과 마일스톤 확인
- `06_product.md`와 `07_features.md`의 MVP 범위와 비교
- **통과 기준**: MVP 기능 수 대비 일정이 비현실적이지 않음

---

## 검증 방법

모든 검증 대상 문서를 읽고, 위 기준 각각에 대해 판단하세요.

## 산출물 형식

**반드시** 아래 JSON 형식으로 결과를 출력하세요. JSON 블록 앞에 `=== VERIFICATION_RESULT ===` 마커를 붙이세요.

```
=== VERIFICATION_RESULT ===
```json
{
  "criteria": [
    {
      "id": "P1_CONS_01",
      "status": "passed" | "failed",
      "details": "판단 근거 설명",
      "suggestion": "개선 제안 (실패 시)",
      "affectedDocuments": ["영향받는 문서 경로"]
    }
  ]
}
```

**중요**: `status`는 반드시 `"passed"` 또는 `"failed"` 중 하나여야 합니다.
