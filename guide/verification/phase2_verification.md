# Phase 2 검증 가이드

## 목적

Phase 2 (설계) 산출물 5개 문서를 다각도로 검증합니다.
Phase 1 기획 문서와의 정합성을 중점적으로 확인합니다.

## 검증 대상

- `docs/design/01_screen.md` — 화면 설계
- `docs/design/02_data_model.md` — 데이터 모델
- `docs/design/03_task_flow.md` — 태스크 플로우
- `docs/design/04_api.md` — API 설계
- `docs/design/05_architecture.md` — 시스템 아키텍처

## 참조 문서 (Phase 1)

- `docs/planning/06_product.md` — 제품 정의 (Scope)
- `docs/planning/07_features.md` — 기능 정의
- `docs/planning/08_tech.md` — 기술 검토

---

## 검증 관점

### 1. 정합성 (Alignment)

#### P2_ALIGN_01: 화면 ↔ 기능 정의 커버리지
- `07_features.md`의 모든 Feature/Epic 추출
- `01_screen.md`의 화면 목록에서 각 Feature가 매핑되는지 확인
- **통과 기준**: 모든 P0 기능이 최소 1개 화면에 매핑됨

#### P2_ALIGN_02: 데이터 모델 ↔ 데이터 요구사항
- `07_features.md`의 기능에서 필요한 데이터 식별
- `02_data_model.md`의 엔티티/필드에서 해당 데이터가 존재하는지 확인
- **통과 기준**: 핵심 기능의 데이터 요구사항이 모델에 반영됨

### 2. 일관성 (Consistency)

#### P2_CONS_01: API ↔ 태스크 플로우
- `03_task_flow.md`의 유스케이스별 시스템 동작 추출
- `04_api.md`의 엔드포인트에서 해당 동작을 지원하는지 확인
- **통과 기준**: 주요 유스케이스의 시스템 동작이 API 엔드포인트로 커버됨

#### P2_CONS_02: 아키텍처 ↔ 기술 스택
- `08_tech.md`의 기술 스택 결정사항 확인
- `05_architecture.md`의 기술 스택이 일치하는지 확인
- **통과 기준**: 프레임워크, 데이터베이스, 주요 라이브러리가 일치

### 3. 품질 (Quality)

#### P2_QUAL_02: 네비게이션 흐름
- `01_screen.md`에서 화면 간 네비게이션/흐름이 명시되어 있는지 확인
- **통과 기준**: 사이트맵 또는 네비게이션 구조가 문서에 포함됨

---

## 검증 방법

Phase 1 기획 문서와 Phase 2 설계 문서를 모두 읽고, 위 기준 각각에 대해 판단하세요.

## 산출물 형식

**반드시** 아래 JSON 형식으로 결과를 출력하세요. JSON 블록 앞에 `=== VERIFICATION_RESULT ===` 마커를 붙이세요.

```
=== VERIFICATION_RESULT ===
```json
{
  "criteria": [
    {
      "id": "P2_ALIGN_01",
      "status": "passed" | "failed",
      "details": "판단 근거 설명",
      "suggestion": "개선 제안 (실패 시)",
      "affectedDocuments": ["영향받는 문서 경로"]
    }
  ]
}
```

**중요**: `status`는 반드시 `"passed"` 또는 `"failed"` 중 하나여야 합니다.
