# 1.7 기능 정의 가이드

## 목적

제품 기능을 체계적으로 정의하고 우선순위를 결정합니다.

---

## 입력

- `result/planning/04_user_journey.md`
- `result/planning/06_product.md`
- `form/intake_form.md`의 Section 3 (뭘 할 수 있어야 해요?)
  - 3.1 꼭 되어야 하는 것 3가지 (필수)
  - 3.2 있으면 좋겠지만 없어도 되는 것
  - 3.3 절대 필요 없는 것
  - 3.7 참고하고 싶은 앱

---

## 작업 항목

### 1. 기능 계층 구조 (Epic > Feature > User Story)

```markdown
## 기능 계층

📦 **Epic 1: [대분류명]**
├── 🔹 Feature 1.1: [기능명]
│   ├── US-001: [사용자 스토리]
│   ├── US-002: [사용자 스토리]
│   └── US-003: [사용자 스토리]
├── 🔹 Feature 1.2: [기능명]
│   ├── US-004: [사용자 스토리]
│   └── US-005: [사용자 스토리]
└── 🔹 Feature 1.3: [기능명]
    └── US-006: [사용자 스토리]

📦 **Epic 2: [대분류명]**
├── 🔹 Feature 2.1: [기능명]
│   └── ...
└── 🔹 Feature 2.2: [기능명]
    └── ...

📦 **Epic 3: [대분류명]**
└── ...
```

### 2. User Story 상세

```markdown
## User Story 상세

### US-001: [스토리 제목]

┌─────────────────────────────────────────────────────┐
│ As a [역할]                                          │
│ I want to [원하는 것]                                │
│ So that [이유/가치]                                  │
├─────────────────────────────────────────────────────┤
│ Acceptance Criteria:                                │
│ ✓ [조건 1]                                          │
│ ✓ [조건 2]                                          │
│ ✓ [조건 3]                                          │
├─────────────────────────────────────────────────────┤
│ Priority: P0 (Must) / P1 (Should) / P2 (Could)      │
│ Estimate: [X] points                                │
│ Epic: [Epic명]                                      │
│ Feature: [Feature명]                                │
└─────────────────────────────────────────────────────┘

### 예시

### US-001: 전체 로봇 현황 조회

┌─────────────────────────────────────────────────────┐
│ As a 운영 매니저                                     │
│ I want to 전체 로봇 상태를 한눈에 보고 싶다          │
│ So that 문제 있는 로봇을 빠르게 파악할 수 있다       │
├─────────────────────────────────────────────────────┤
│ Acceptance Criteria:                                │
│ ✓ 온라인/오프라인/장애 로봇 수가 표시된다           │
│ ✓ 전체 로봇 목록이 표시된다                         │
│ ✓ 상태별 필터링이 가능하다                          │
│ ✓ 로딩 시간이 3초 이내다                            │
├─────────────────────────────────────────────────────┤
│ Priority: P0 (Must)                                 │
│ Estimate: 3 points                                  │
│ Epic: 로봇 모니터링                                 │
│ Feature: 대시보드                                   │
└─────────────────────────────────────────────────────┘
```

### 3. 우선순위 매트릭스

```markdown
## 우선순위 매트릭스

### Value vs Effort 매트릭스

              높은 가치
                  │
     Quick Wins   │   Must Have
     (바로 하기)   │   (MVP 필수)
                  │
 낮은 노력 ───────┼─────── 높은 노력
                  │
     Fill Ins     │   Nice to Have
     (여유시)      │   (나중에)
                  │
              낮은 가치

### 기능별 분류

| 기능 | 가치 | 노력 | 분류 | MVP |
|------|------|------|------|-----|
| [기능 1] | 높음 | 낮음 | Quick Win | ✅ |
| [기능 2] | 높음 | 높음 | Must Have | ✅ |
| [기능 3] | 낮음 | 낮음 | Fill In | ✅ |
| [기능 4] | 높음 | 높음 | Nice to Have | ❌ |
| [기능 5] | 낮음 | 높음 | Won't Do | ❌ |
```

### 4. MoSCoW 우선순위

```markdown
## MoSCoW 우선순위

### Must Have (P0) - MVP 필수
없으면 제품이 의미 없는 기능
- [ ] [기능 1]
- [ ] [기능 2]
- [ ] [기능 3]

### Should Have (P1) - 중요
있으면 훨씬 좋지만 없어도 출시 가능
- [ ] [기능 4]
- [ ] [기능 5]

### Could Have (P2) - 있으면 좋음
시간이 되면 추가
- [ ] [기능 6]
- [ ] [기능 7]

### Won't Have (이번에 안함)
의도적으로 제외
- [ ] [기능 8] - 이유: [...]
```

### 5. 백로그 정리

```markdown
## Product Backlog

| ID | User Story | Epic | Priority | Estimate | Sprint |
|----|------------|------|----------|----------|--------|
| US-001 | 전체 로봇 현황 조회 | 모니터링 | P0 | 3 | 1 |
| US-002 | 로봇 상세 정보 조회 | 모니터링 | P0 | 3 | 1 |
| US-003 | 이상 알림 수신 | 알림 | P0 | 5 | 1 |
| US-004 | 알림 설정 | 알림 | P1 | 3 | 2 |
| ... | ... | ... | ... | ... | ... |

### Sprint 계획 (개략)

**Sprint 1** (MVP Core)
- US-001, US-002, US-003
- 목표: 핵심 모니터링 기능

**Sprint 2** (MVP Complete)
- US-004, US-005, US-006
- 목표: MVP 완성

**Sprint 3** (Polish)
- US-007, US-008
- 목표: 개선 및 버그 수정
```

---

## 산출물 템플릿

`result/planning/07_features.md`에 작성:

```markdown
# 기능 정의

## 기능 계층 구조

📦 **Epic 1: [이름]**
├── 🔹 Feature 1.1: [이름]
│   ├── US-001:
│   └── US-002:
└── 🔹 Feature 1.2: [이름]
    └── US-003:

📦 **Epic 2: [이름]**
└── ...

---

## User Story 상세

### US-001: [제목]
- **As a**: [역할]
- **I want to**: [원하는 것]
- **So that**: [이유]
- **Acceptance Criteria**:
  - [ ]
  - [ ]
- **Priority**: P0
- **Estimate**: 3pt

### US-002: [제목]
[동일 형식]

---

## 우선순위

### Must Have (P0)
- [ ] US-001:
- [ ] US-002:

### Should Have (P1)
- [ ] US-003:

### Could Have (P2)
- [ ] US-004:

---

## Backlog

| ID | Story | Priority | Estimate | Sprint |
|----|-------|----------|----------|--------|
| US-001 | | P0 | | 1 |
| US-002 | | P0 | | 1 |

---

## 다음 단계
→ 1.8 기술 검토
```

---

## 다이어그램 가이드

문서에 다음과 같은 mermaid 다이어그램을 포함하여 시각적으로 표현하세요:

### 기능 계층 트리 (flowchart)
```
\`\`\`mermaid
flowchart TD
    P[프로젝트명] --> E1[Epic 1: 핵심 기능]
    P --> E2[Epic 2: 사용자 관리]
    P --> E3[Epic 3: 알림/설정]
    E1 --> F1[Feature 1.1]
    E1 --> F2[Feature 1.2]
    E2 --> F3[Feature 2.1]
    E2 --> F4[Feature 2.2]
    E3 --> F5[Feature 3.1]
\`\`\`
```

### MoSCoW 우선순위 분포 (pie)
```
\`\`\`mermaid
pie title MoSCoW 우선순위 분포
    "Must Have" : 40
    "Should Have" : 30
    "Could Have" : 20
    "Won't Have" : 10
\`\`\`
```

---

## 체크리스트

- [ ] Epic 3개 이상 정의
- [ ] User Story 10개 이상 작성
- [ ] 각 Story에 Acceptance Criteria 있음
- [ ] MoSCoW 우선순위 분류 완료
- [ ] MVP 범위가 명확함
- [ ] mermaid 다이어그램으로 기능 계층/우선순위 시각화

---

## 다음 단계

→ `08_tech.md` (기술 검토)
