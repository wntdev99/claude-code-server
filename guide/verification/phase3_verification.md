# Phase 3 검증 가이드

## 목적

Phase 3 (개발) 산출물을 검증합니다.
코드의 기능성, 보안, Phase 2 설계 문서와의 정합성을 확인합니다.

## 검증 대상

- 프로젝트 루트의 코드 파일 (`package.json`, `src/` 등)
- `.gitignore` 파일

## 참조 문서

- `docs/design/01_screen.md` — 화면 설계
- `docs/design/05_architecture.md` — 시스템 아키텍처

---

## 검증 관점

### 1. 정합성 (Alignment)

#### P3_ALIGN_01: 구현 페이지 ↔ 화면 설계
- `docs/design/01_screen.md`의 화면 목록 추출
- `src/` 내의 페이지/라우트 파일에서 각 화면이 구현되었는지 확인
- **통과 기준**: 주요 화면(P0 기능 관련)이 코드에 대응하는 파일/컴포넌트 존재

---

## 검증 방법

Phase 2 설계 문서와 구현 코드를 비교하여 위 기준에 대해 판단하세요.

## 산출물 형식

**반드시** 아래 JSON 형식으로 결과를 출력하세요. JSON 블록 앞에 `=== VERIFICATION_RESULT ===` 마커를 붙이세요.

```
=== VERIFICATION_RESULT ===
```json
{
  "criteria": [
    {
      "id": "P3_ALIGN_01",
      "status": "passed" | "failed",
      "details": "판단 근거 설명",
      "suggestion": "개선 제안 (실패 시)",
      "affectedDocuments": ["영향받는 문서/파일 경로"]
    }
  ]
}
```

**중요**: `status`는 반드시 `"passed"` 또는 `"failed"` 중 하나여야 합니다.
