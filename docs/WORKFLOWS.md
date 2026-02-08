# 워크플로우 문서

## 개요

Claude Code Server는 **페이즈 기반 워크플로우**를 사용하여 태스크 실행을 구조화합니다. **중요: 각 태스크 타입은 완전히 다른 워크플로우**를 따르며, 각기 다른 페이즈, 단계, 산출물 및 에이전트 동작을 가집니다.

**네 가지 고유한 워크플로우 타입**:
- **Phase-A (create_app)**: 전체 앱 개발 사이클 - 기획 → 설계 → 개발 → 테스트
- **Phase-B (modify_app)**: 기존 코드 수정 - 분석 → 계획 → 구현 → 검증
- **Phase-C (workflow)**: 워크플로우 자동화 - 기획 → 설계 → 개발 → 테스트 (워크플로우 중심)
- **Type-D (custom)**: 자유 형식 대화 - 구조화된 페이즈 없음

**서브 에이전트는 태스크 타입을 식별하고 해당 워크플로우를 정확히 따라야 합니다.**

## 워크플로우 타입 비교

| 항목 | Phase-A (create_app) | Phase-B (modify_app) | Phase-C (workflow) | Type-D (custom) |
|--------|---------------------|---------------------|-------------------|----------------|
| **목적** | 새로운 앱을 처음부터 생성 | 기존 앱 수정 | 워크플로우 자동화 생성 | 자유 형식 태스크 |
| **Phase 1** | 기획 (9개 문서) | 분석 (1개 문서) | 기획 (워크플로우 요구사항) | N/A (단일 페이즈) |
| **Phase 2** | 설계 (5개 문서) | 계획 (1개 문서) | 설계 (워크플로우 로직) | N/A |
| **Phase 3** | 개발 (코드) | 구현 (코드) | 개발 (코드) | N/A |
| **Phase 4** | 검증 | 검증 | 검증 | N/A |
| **총 문서 수** | 14개 문서 | 2개 문서 | 2개 문서 | 없음 |
| **가이드 문서** | 전체 24개 가이드 | 자율적 (가이드 없음) | Phase-A 가이드 적용 | 없음 |
| **시작점** | 빈 슬레이트 | 기존 코드베이스 | 빈 슬레이트 | 사용자 프롬프트 |
| **코드 변경** | 새 코드베이스 생성 | 기존 코드 수정 | 워크플로우 코드 생성 | 다양함 |
| **검증** | 3개 검증 가이드 | 커스텀 검증 | 커스텀 검증 | 없음 |
| **리뷰 게이트** | 각 페이즈 후 (4개 게이트) | 각 페이즈 후 (4개 게이트) | 각 페이즈 후 (4개 게이트) | 없음 |
| **핵심 과제** | 완전한 기획 및 설계 | 기존 기능 보존 | 통합 및 트리거 | 사용자 만족 |
| **예시 태스크** | "React로 todo 앱 만들기" | "기존 앱에 다크 모드 추가" | "GitHub PR 시 Slack 메시지 전송" | "WebSocket 설명" |

## 태스크 타입별 워크플로우

### 1. create_app - 새 애플리케이션 개발

**목적**: 새로운 애플리케이션을 처음부터 생성

**워크플로우**: 4-Phase-A

```
Phase 1: 기획 (Planning) - 9단계
    ↓
Phase 2: 설계 (Design) - 5단계
    ↓
Phase 3: 개발 (Development) - 6단계
    ↓
Phase 4: 검증 (Testing) - 자동 검증
```

#### Phase 1: 기획 (9단계)

| 단계 | 가이드 문서 | 산출물 | 목적 |
|------|----------------|-------------|---------|
| 1 | `/guide/planning/01_idea.md` | `docs/planning/01_idea.md` | 핵심 아이디어, 문제, 해결책 정의 |
| 2 | `/guide/planning/02_market.md` | `docs/planning/02_market.md` | 시장, 경쟁자, 기회 분석 |
| 3 | `/guide/planning/03_persona.md` | `docs/planning/03_persona.md` | 타겟 사용자 페르소나 정의 |
| 4 | `/guide/planning/04_user_journey.md` | `docs/planning/04_user_journey.md` | 사용자 여정 및 접점 매핑 |
| 5 | `/guide/planning/05_business_model.md` | `docs/planning/05_business_model.md` | 비즈니스 모델 및 수익 정의 |
| 6 | `/guide/planning/06_product.md` | `docs/planning/06_product.md` | 제품 범위 및 요구사항 정의 |
| 7 | `/guide/planning/07_features.md` | `docs/planning/07_features.md` | 기능 및 우선순위 지정 |
| 8 | `/guide/planning/08_tech.md` | `docs/planning/08_tech.md` | 기술 스택 선택 |
| 9 | `/guide/planning/09_roadmap.md` | `docs/planning/09_roadmap.md` | 개발 로드맵 생성 |

**검증**: `/guide/verification/phase1_verification.md`

**기준**:
- ✅ 모든 9개 문서 존재
- ✅ 각 문서 ≥500자
- ✅ 플레이스홀더 없음
- ✅ 일관된 정보
- ✅ 적절한 포맷팅

#### Phase 2: 설계 (5단계)

| 단계 | 가이드 문서 | 산출물 | 목적 |
|------|----------------|-------------|---------|
| 1 | `/guide/design/01_screen.md` | `docs/design/01_screen.md` | 화면 및 와이어프레임 설계 |
| 2 | `/guide/design/02_data_model.md` | `docs/design/02_data_model.md` | 데이터 모델 및 스키마 정의 |
| 3 | `/guide/design/03_task_flow.md` | `docs/design/03_task_flow.md` | 작업 흐름 및 상호작용 매핑 |
| 4 | `/guide/design/04_api.md` | `docs/design/04_api.md` | API 엔드포인트 및 스펙 설계 |
| 5 | `/guide/design/05_architecture.md` | `docs/design/05_architecture.md` | 시스템 아키텍처 정의 |

**검증**: `/guide/verification/phase2_verification.md`

**기준**:
- ✅ 모든 5개 문서 존재
- ✅ 데이터 모델 명확히 정의
- ✅ API 스펙 완성
- ✅ 아키텍처 문서화
- ✅ 실현 가능한 설계

#### Phase 3: 개발 (6단계)

| 단계 | 가이드 문서 | 산출물 | 목적 |
|------|----------------|-------------|---------|
| 1 | `/guide/development/01_setup.md` | 프로젝트 구조 | 프로젝트 및 의존성 초기화 |
| 2 | `/guide/development/02_data.md` | 데이터베이스/모델 | 데이터 레이어 구현 |
| 3 | `/guide/development/03_logic.md` | 비즈니스 로직 | 핵심 기능 구현 |
| 4 | `/guide/development/04_ui.md` | UI 컴포넌트 | 사용자 인터페이스 구현 |
| 5 | `/guide/development/05_testing.md` | 테스트 | 테스트 작성 |
| 6 | `/guide/development/06_deploy.md` | 배포 설정 | 배포 준비 |

**검증**: `/guide/verification/phase3_verification.md`

**기준**:
- ✅ 올바른 프로젝트 구조
- ✅ 모든 필요한 파일 존재
- ✅ 테스트 포함
- ✅ 하드코딩된 시크릿 없음
- ✅ 지침이 포함된 README

#### Phase 4: 검증

**책임**: Verification Agent (자동 검증)

**Phase 4에서 수행되는 작업**:
1. **자동 검증**: Verification Agent가 각 Phase 산출물 검증
2. **품질 보증**: 검증 가이드 기준에 따른 자동 체크
3. **최종 검증**: 태스크 완료 전 최종 품질 확인

**중요**: Phase 4는 Sub-Agent가 아닌 **Verification Agent**가 수행합니다.
- Sub-Agent는 Phase 3에서 테스트 코드를 **작성**하고 실행 결과를 포함
- Verification Agent는 Phase 4에서 전체 산출물의 **품질을 검증**

**Verification Agent 실행 시점 및 사용 가이드**:

| Phase 완료 | 검증 가이드 | 검증 대상 |
|-----------|-----------|---------|
| Phase 1 완료 후 | `/guide/verification/phase1_verification.md` | 9개 기획 문서 일관성, 타당성 |
| Phase 2 완료 후 | `/guide/verification/phase2_verification.md` | 5개 설계 문서 정합성, 일관성 |
| Phase 3 완료 후 | `/guide/verification/phase3_verification.md` | 코드 vs 설계 정합성, 보안 |

**검증 프로세스**:
```
Sub-Agent: Phase N 완료 → "=== PHASE N COMPLETE ===" 출력
  ↓
Agent Manager: Phase 완료 신호 감지 → Sub-Agent 일시중지 (SIGTSTP)
  ↓
Agent Manager: Verification Agent 생성 및 실행
  ↓
Verification Agent: `/guide/verification/phaseN_verification.md` 읽기
  ↓
Verification Agent: 산출물 검증 (일관성, 정합성, 품질 기준)
  ↓
Verification Agent: 검증 결과 JSON 출력
  ↓
Agent Manager: 결과 파싱
  - 통과 → 리뷰 생성 → 사용자 승인 대기
  - 실패 → 피드백 전달 → Sub-Agent 재작업 (최대 3회)
```

**검증 실패 시 재작업 흐름**:
- **1차 실패**: Verification Agent 피드백 전달 → Sub-Agent 재작업 → 재검증
- **2차 실패**: 추가 피드백 전달 → Sub-Agent 재작업 → 재검증
- **3차 실패**: 사용자에게 알림 → 수동 검토 또는 작업 중단 결정

### create_app (Phase-A)를 위한 서브 에이전트 지침

**Phase 1: 기획 (9단계)**

**수행 사항**:
1. `/guide/planning/`의 모든 9개 기획 가이드를 읽기 (01_idea.md ~ 09_roadmap.md)
2. `docs/planning/`에 9개의 포괄적인 기획 문서 생성
3. 각 문서는 ≥500자이며 완전하고 구체적인 내용 포함
4. "TODO", "TBD", "[Insert X]", "Coming soon" 같은 플레이스홀더 금지
5. 모든 문서 간 일관성 보장 (예: 08_tech의 기술 스택이 Phase 2 아키텍처와 일치)

**필수 요구사항**:
- 모든 9개 파일이 존재해야 함: `docs/planning/01_idea.md` ~ `09_roadmap.md`
- 각 파일은 가이드 문서에 정의된 적절한 섹션을 가져야 함
- 일반적인 설명이 아닌 구체적인 예시 사용
- 명확한 타겟 사용자, 기능, 비즈니스 모델 정의

**Phase 2: 설계 (5단계)**

**수행 사항**:
1. `/guide/design/`의 모든 5개 설계 가이드를 읽기 (01_screen.md ~ 05_architecture.md)
2. `docs/design/`에 5개의 상세한 설계 문서 생성
3. 필드 타입이 포함된 구체적인 데이터 모델 생성 (엔티티 이름만이 아님)
4. 메서드, 경로, 요청/응답 스키마가 포함된 완전한 API 스펙 설계
5. 컴포넌트 및 데이터 흐름을 포함한 시스템 아키텍처 문서화

**필수 요구사항**:
- 모든 5개 파일이 존재해야 함: `docs/design/01_screen.md` ~ `05_architecture.md`
- 데이터 모델에는 엔티티 이름, 필드, 타입, 관계가 포함되어야 함
- API 스펙에는 HTTP 메서드, 경로, 요청 본문, 응답, 상태 코드가 포함되어야 함
- 아키텍처는 실현 가능하고 Phase 1의 기술 스택과 일치해야 함

**Phase 3: 개발 (6단계)**

**수행 사항**:
1. `/guide/development/`의 모든 6개 개발 가이드를 읽기 (01_setup.md ~ 06_deploy.md)
2. Phase 2의 설계를 따르는 완전하고 작동하는 코드베이스 생성
3. Phase 1 기획 문서에 정의된 모든 기능 구현
4. 테스트 작성 (유닛, 통합, 또는 e2e 적절히)
5. 배포 설정 생성
6. 설정 지침이 포함된 포괄적인 README.md 작성

**필수 요구사항**:
- 프로젝트 구조가 기술 스택과 일치 (예: Next.js 프로젝트의 경우 Next.js 구조)
- 모든 주요 파일 존재: package.json, .gitignore, README.md, 설정 파일
- 통과 상태의 테스트 포함
- 하드코딩된 시크릿 없음 (.env.example과 함께 .env 사용)
- .env 파일은 .gitignore에 포함되어야 함
- README에 포함: 설치 단계, 실행 방법, 테스트 방법

**Phase 4: 검증**

**수행 사항**:
1. 검증 에이전트가 자동 검사 실행
2. 검증 통과 시 사용자 리뷰 생성
3. 검증 실패 시 에이전트가 재작업 (최대 3회 시도)
4. 태스크 완료 전 최종 검증

---

### 2. modify_app - 기존 애플리케이션 수정

**목적**: 기존 애플리케이션 수정, 개선 또는 수정

**워크플로우**: 4-Phase-B

```
Phase 1: 분석 (Analysis) - 현재 상태 이해
    ↓
Phase 2: 계획 (Planning) - 수정 계획
    ↓
Phase 3: 구현 (Implementation) - 변경사항 실행
    ↓
Phase 4: 검증 (Testing) - 변경사항 확인
```

#### Phase 1: 분석 (3단계)

**목적**: 변경사항을 적용하기 전에 기존 코드베이스를 철저히 이해

| 단계 | 작업 | 세부사항 |
|------|------|---------|
| 1 | **코드베이스 분석** | 기존 코드 구조, 패턴, 아키텍처 읽고 이해 |
| 2 | **의존성 분석** | 의존성, 외부 서비스, 데이터베이스 스키마 식별 |
| 3 | **영향 분석** | 요청된 변경사항에 영향을 받을 컴포넌트 평가 |

**산출물**: `docs/analysis/current_state.md`

**문서에 포함되어야 할 내용**:
- 프로젝트 구조 개요
- 주요 컴포넌트 및 그 책임
- 데이터 모델 및 데이터베이스 스키마
- API 엔드포인트 (해당하는 경우)
- 외부 의존성 및 서비스
- 현재 구현 패턴
- 수정할 영역
- 다른 컴포넌트에 대한 잠재적 영향

**검증 기준**:
- ✅ 완전한 코드베이스 구조 문서화
- ✅ 모든 관련 파일 및 컴포넌트 식별
- ✅ 의존성 명확히 나열
- ✅ 영향 평가가 구체적이고 정확
- ✅ 문서 ≥1000자

#### Phase 2: 계획 (4단계)

**목적**: 위험 평가를 포함한 수정 상세 계획 생성

| 단계 | 작업 | 세부사항 |
|------|------|---------|
| 1 | **요구사항 정의** | 무엇을 변경해야 하고 왜 필요한지 정확히 정의 |
| 2 | **수정 계획** | 파일별 구체적인 코드 변경사항 계획 |
| 3 | **위험 평가** | 위험 식별 및 완화 전략 수립 |
| 4 | **테스트 전략** | 변경사항이 작동하고 기존 기능을 깨뜨리지 않는지 확인하는 방법 계획 |

**산출물**: `docs/planning/modification_plan.md`

**문서에 포함되어야 할 내용**:
- 명확한 요구사항 (추가/수정/제거할 내용)
- 상세한 수정 계획:
  - 생성할 파일
  - 수정할 파일 (구체적인 변경사항 포함)
  - 삭제할 파일
- 단계별 구현 접근 방식
- 위험 평가:
  - 호환성 파괴 위험
  - 성능 영향
  - 보안 고려사항
  - 하위 호환성
- 테스트 전략:
  - 통과해야 하는 기존 테스트
  - 작성할 새 테스트
  - 수동 테스트 시나리오

**검증 기준**:
- ✅ 요구사항 명확히 정의
- ✅ 파일 수준 변경 계획 제공
- ✅ 완화 전략이 포함된 위험 식별
- ✅ 테스트 전략이 포괄적
- ✅ 문서 ≥800자

#### Phase 3: 구현 (6단계)

**목적**: 기존 기능을 보존하면서 계획된 변경사항을 신중히 구현

| 단계 | 작업 | 세부사항 |
|------|------|---------|
| 1 | **코드 수정** | 기존 파일에 계획된 변경사항 구현 |
| 2 | **리팩토링** | 필요시 코드 품질 개선 (동작 변경 없이) |
| 3 | **문서 업데이트** | 인라인 주석, README 및 기타 문서 업데이트 |
| 4 | **의존성 업데이트** | 필요시 package.json, requirements.txt 등 업데이트 |
| 5 | **설정 업데이트** | 설정 파일 업데이트 (.env.example, configs 등) |
| 6 | **빌드 검증** | 프로젝트가 오류 없이 빌드되는지 확인 |

**산출물**: 수정된 코드베이스

**필수 요구사항**:
- 기존 기능 보존 (의도하지 않은 호환성 파괴 없음)
- 기존 코드 스타일 및 패턴 준수
- 영향을 받는 모든 import 및 참조 업데이트
- 기존 테스트 통과 유지 (의도적으로 변경하지 않은 경우)
- 새 기능에 대한 새 테스트 추가
- 변경사항을 반영하도록 문서 업데이트
- 새 의존성 추가 시 문서화
- 설정 변경 필요 시 .env.example 업데이트

**검증 기준**:
- ✅ 모든 계획된 변경사항 구현
- ✅ 기존 테스트 여전히 통과 (또는 적절히 업데이트)
- ✅ 새 기능에 대한 새 테스트 추가
- ✅ 코드가 오류 없이 빌드
- ✅ 문서 업데이트
- ✅ 하드코딩된 시크릿 추가 없음
- ✅ 코드 스타일이 기존 패턴과 일치

#### Phase 4: 검증 (3단계)

**책임**: Sub-Agent (테스트 실행 및 검증)

**목적**: 수정사항이 올바르게 작동하고 회귀를 도입하지 않는지 확인

| 단계 | 작업 | 세부사항 |
|------|------|---------|
| 1 | **기존 테스트 실행** | 모든 기존 테스트가 통과하는지 확인 (회귀 없음) |
| 2 | **새 테스트 추가** | 새 기능에 대한 테스트 작성 및 실행 |
| 3 | **수동 테스트** | 변경사항이 예상대로 작동하는지 수동 확인 |

**산출물**: 테스트 결과 및 검증 보고서

**중요**: Phase-B에서는 Sub-Agent가 직접 테스트를 실행하고 결과를 보고합니다.
- Phase-A와 달리 별도의 Verification Agent 없이 Sub-Agent가 검증 수행

**테스트 체크리스트**:
- [ ] 모든 기존 유닛 테스트 통과
- [ ] 모든 기존 통합 테스트 통과
- [ ] 모든 기존 e2e 테스트 통과 (해당하는 경우)
- [ ] 새 기능에 대한 새 테스트 작성
- [ ] 새 테스트 통과
- [ ] 수동 테스트 수행:
  - [ ] 새 기능 작동
  - [ ] 기존 기능 파괴되지 않음
  - [ ] 엣지 케이스 처리
  - [ ] 오류 처리 작동
- [ ] 콘솔 오류 없음
- [ ] 성능 허용 가능

**검증 기준**:
- ✅ 테스트 결과 문서화
- ✅ 모든 테스트 통과 (또는 실패 설명)
- ✅ 수동 테스트 시나리오 실행
- ✅ 회귀 식별 없음

### modify_app (Phase-B)를 위한 서브 에이전트 지침

**create_app와의 중요한 차이점**:
- 기존 코드베이스로 시작 (빈 슬레이트가 아님)
- 읽을 기획 가이드 없음 (자율적으로 분석)
- 기존 기능 보존에 초점
- 더 작고 집중된 산출물 (14개 대신 2개 문서)

**Phase 1: 분석 - 수행 사항**:
1. 기존 코드베이스에 대한 액세스 요청 (파일 액세스를 위한 의존성 요청 트리거 가능)
2. 전체 프로젝트 구조 읽고 이해
3. 주요 컴포넌트, 데이터 모델, API 식별
4. `docs/analysis/current_state.md`에 현재 상태 철저히 문서화
5. 수정이 필요한 부분 정확히 식별

**금지 사항**:
- 아직 코드 변경하지 않기
- 분석 페이즈 건너뛰지 않기
- 코드를 읽지 않고 작동 방식을 가정하지 않기

**Phase 2: 계획 - 수행 사항**:
1. 변경이 필요한 사항에 대한 명확한 요구사항 정의
2. 파일별 수정 계획 생성
3. 위험 평가 (호환성 파괴 변경, 의존성, 성능)
4. 테스트 전략 계획 (기존 테스트 + 새 테스트)
5. `docs/planning/modification_plan.md`에 모든 내용 문서화

**금지 사항**:
- 계획 없이 구현 시작하지 않기
- 위험 및 하위 호환성 무시하지 않기
- 테스트 계획 잊지 않기

### Filename Sanitization (파일명 정제)

#### 문제 상황

Agent가 특수 문자, 공백, 또는 OS 예약어가 포함된 파일명을 생성하려고 시도할 수 있습니다:

**문제가 있는 파일명 예시**:
- `my file.txt` (공백)
- `user/data.json` (경로 구분자)
- `../../etc/passwd` (경로 순회)
- `CON.txt` (Windows 예약어)
- `file<name>.txt` (허용되지 않는 문자)
- `very_long_filename_that_exceeds_255_bytes...` (길이 초과)

**문제점**:
- 크로스 플랫폼 호환성 문제 (Windows, Linux, macOS)
- 파일 시스템 에러 발생
- 보안 취약점 (경로 순회 공격)
- 백업/배포 시 문제 발생

#### 해결 방안

모든 파일 생성 전에 파일명을 정제하고 검증:

```typescript
// packages/shared/src/utils/filenameSanitizer.ts

/**
 * 파일명 정제 유틸리티
 *
 * 참고 표준:
 * - POSIX: IEEE Std 1003.1-2017
 * - Windows: https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file
 * - macOS: HFS+/APFS 제한사항
 */
export class FilenameSanitizer {
  // 최대 파일명 길이 (바이트 단위)
  private static readonly MAX_FILENAME_LENGTH = 255;

  // Windows 예약 파일명
  private static readonly WINDOWS_RESERVED_NAMES = new Set([
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
  ]);

  // 허용되지 않는 문자 (크로스 플랫폼)
  private static readonly INVALID_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;

  /**
   * 파일명 정제 (메인 함수)
   */
  static sanitize(filename: string, options?: SanitizeOptions): string {
    if (!filename || filename.trim().length === 0) {
      throw new FilenameError('Filename cannot be empty');
    }

    let sanitized = filename;

    // 1. 공백 처리
    if (options?.replaceSpaces !== false) {
      sanitized = sanitized.replace(/\s+/g, '_');
    }

    // 2. 허용되지 않는 문자 제거/교체
    sanitized = sanitized.replace(
      this.INVALID_CHARS,
      options?.replacementChar || '_'
    );

    // 3. 경로 구분자 제거 (보안)
    sanitized = sanitized.replace(/[\/\\]/g, '_');

    // 4. 연속된 점 제거 (..., .., etc.)
    sanitized = sanitized.replace(/\.{2,}/g, '.');

    // 5. 앞뒤 공백 및 점 제거
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

    // 6. OS 예약어 체크
    const baseName = this.getBaseName(sanitized);
    if (this.isReservedName(baseName)) {
      sanitized = `_${sanitized}`;
    }

    // 7. 길이 제한 (255 바이트)
    sanitized = this.truncateToByteLimit(sanitized, this.MAX_FILENAME_LENGTH);

    // 8. 최종 검증
    if (sanitized.length === 0) {
      throw new FilenameError('Sanitized filename is empty');
    }

    return sanitized;
  }

  /**
   * 파일명 검증 (생성 전 체크)
   */
  static validate(filename: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. 빈 파일명
    if (!filename || filename.trim().length === 0) {
      errors.push('Filename is empty');
      return { valid: false, errors, warnings };
    }

    // 2. 길이 체크
    const byteLength = Buffer.byteLength(filename, 'utf-8');
    if (byteLength > this.MAX_FILENAME_LENGTH) {
      errors.push(
        `Filename too long: ${byteLength} bytes (max: ${this.MAX_FILENAME_LENGTH})`
      );
    }

    // 3. 허용되지 않는 문자
    if (this.INVALID_CHARS.test(filename)) {
      errors.push('Filename contains invalid characters: < > : " / \\ | ? *');
    }

    // 4. 경로 구분자
    if (filename.includes('/') || filename.includes('\\')) {
      errors.push('Filename contains path separators');
    }

    // 5. 경로 순회 시도
    if (filename.includes('..')) {
      errors.push('Filename contains path traversal sequence (..)');
    }

    // 6. OS 예약어
    const baseName = this.getBaseName(filename);
    if (this.isReservedName(baseName)) {
      warnings.push(`Filename matches OS reserved name: ${baseName}`);
    }

    // 7. 공백
    if (/\s/.test(filename)) {
      warnings.push('Filename contains spaces (not recommended)');
    }

    // 8. 특수 문자
    if (/[^\w\-.]/.test(filename)) {
      warnings.push('Filename contains special characters');
    }

    // 9. 점으로 시작
    if (filename.startsWith('.')) {
      warnings.push('Filename starts with dot (hidden file on Unix)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * OS 예약어 체크
   */
  private static isReservedName(baseName: string): boolean {
    const upper = baseName.toUpperCase();
    return this.WINDOWS_RESERVED_NAMES.has(upper);
  }

  /**
   * 확장자를 제외한 파일명 추출
   */
  private static getBaseName(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === 0) {
      return filename;
    }
    return filename.substring(0, lastDot);
  }

  /**
   * 바이트 길이 제한으로 문자열 자르기
   */
  private static truncateToByteLimit(str: string, maxBytes: number): string {
    let truncated = str;

    while (Buffer.byteLength(truncated, 'utf-8') > maxBytes) {
      // 끝에서 한 글자씩 제거
      truncated = truncated.slice(0, -1);
    }

    return truncated;
  }

  /**
   * 안전한 파일명 생성 (타임스탬프 기반)
   */
  static generateSafeFilename(
    prefix: string = 'file',
    extension: string = 'txt'
  ): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const sanitizedPrefix = this.sanitize(prefix);

    return `${sanitizedPrefix}_${timestamp}_${random}.${extension}`;
  }
}

interface SanitizeOptions {
  replaceSpaces?: boolean;      // 공백을 언더스코어로 교체 (기본: true)
  replacementChar?: string;      // 유효하지 않은 문자를 교체할 문자 (기본: '_')
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

class FilenameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FilenameError';
  }
}
```

#### 안전한 파일 쓰기 래퍼

```typescript
// packages/shared/src/utils/safeFileOperations.ts

import fs from 'fs/promises';
import path from 'path';
import { FilenameSanitizer } from './filenameSanitizer';
import { validatePath } from './validatePath';

/**
 * 안전한 파일 쓰기 (파일명 정제 포함)
 */
export async function safeWriteFile(
  dirPath: string,
  filename: string,
  content: string,
  workspaceRoot: string
): Promise<string> {
  // 1. 파일명 검증
  const validation = FilenameSanitizer.validate(filename);

  if (!validation.valid) {
    throw new Error(
      `Invalid filename "${filename}": ${validation.errors.join(', ')}`
    );
  }

  // 2. 경고 로깅
  if (validation.warnings.length > 0) {
    console.warn(`⚠️  Filename warnings:`, validation.warnings);
  }

  // 3. 파일명 정제
  const sanitizedFilename = FilenameSanitizer.sanitize(filename);

  // 4. 전체 경로 생성
  const fullPath = path.join(dirPath, sanitizedFilename);

  // 5. 경로 검증 (경로 순회 방지)
  if (!validatePath(fullPath, workspaceRoot)) {
    throw new Error(`Access denied: Path outside workspace`);
  }

  // 6. 디렉토리 확인 및 생성
  await fs.mkdir(dirPath, { recursive: true });

  // 7. 파일 쓰기
  await fs.writeFile(fullPath, content, 'utf-8');

  console.log(`✅ File written safely: ${sanitizedFilename}`);

  // 8. 정제된 경로 반환
  return fullPath;
}

/**
 * 배치 파일 생성 (여러 파일 동시 생성)
 */
export async function safeWriteFiles(
  files: FileToWrite[],
  workspaceRoot: string
): Promise<WriteResult[]> {
  const results: WriteResult[] = [];

  for (const file of files) {
    try {
      const writtenPath = await safeWriteFile(
        file.dirPath,
        file.filename,
        file.content,
        workspaceRoot
      );

      results.push({
        success: true,
        originalFilename: file.filename,
        sanitizedPath: writtenPath,
      });
    } catch (error) {
      results.push({
        success: false,
        originalFilename: file.filename,
        error: error.message,
      });
    }
  }

  return results;
}

interface FileToWrite {
  dirPath: string;
  filename: string;
  content: string;
}

interface WriteResult {
  success: boolean;
  originalFilename: string;
  sanitizedPath?: string;
  error?: string;
}
```

#### Agent Manager 통합

```typescript
// packages/agent-manager/src/deliverables/DeliverableCollector.ts

import { safeWriteFile } from '@shared/utils/safeFileOperations';

/**
 * Agent 산출물 수집기 (파일명 정제 적용)
 */
export class DeliverableCollector {
  /**
   * Agent가 생성한 파일 수집
   */
  async collectDeliverables(
    taskId: string,
    workspacePath: string
  ): Promise<Deliverable[]> {
    const deliverables: Deliverable[] = [];

    // Workspace 스캔
    const files = await this.scanWorkspace(workspacePath);

    for (const file of files) {
      // 파일명 검증
      const validation = FilenameSanitizer.validate(file.filename);

      if (!validation.valid) {
        console.error(`❌ Invalid deliverable filename: ${file.filename}`, {
          errors: validation.errors,
        });

        // 에러 이벤트 발생
        eventBus.emit('deliverable_error', {
          taskId,
          filename: file.filename,
          errors: validation.errors,
        });

        continue; // 건너뛰기
      }

      // 경고 로깅
      if (validation.warnings.length > 0) {
        console.warn(`⚠️  Deliverable filename warnings:`, {
          filename: file.filename,
          warnings: validation.warnings,
        });
      }

      deliverables.push({
        path: file.path,
        filename: file.filename,
        size: file.size,
        createdAt: file.createdAt,
        validated: true,
      });
    }

    return deliverables;
  }

  /**
   * 파일명 자동 수정 (Agent에게 피드백)
   */
  async suggestFilenameFix(
    taskId: string,
    invalidFilename: string
  ): Promise<string> {
    const sanitized = FilenameSanitizer.sanitize(invalidFilename);

    // Agent에게 피드백 전송
    await this.sendFeedbackToAgent(taskId, {
      type: 'filename_invalid',
      message: `Invalid filename "${invalidFilename}" auto-corrected to "${sanitized}"`,
      originalFilename: invalidFilename,
      suggestedFilename: sanitized,
    });

    return sanitized;
  }
}

interface Deliverable {
  path: string;
  filename: string;
  size: number;
  createdAt: Date;
  validated: boolean;
}
```

#### Unit Tests

```typescript
// packages/shared/tests/filenameSanitizer.test.ts

import { FilenameSanitizer } from '../src/utils/filenameSanitizer';

describe('FilenameSanitizer', () => {
  describe('sanitize', () => {
    test('replaces spaces with underscores', () => {
      expect(FilenameSanitizer.sanitize('my file.txt')).toBe('my_file.txt');
    });

    test('removes invalid characters', () => {
      expect(FilenameSanitizer.sanitize('file<name>.txt')).toBe('file_name_.txt');
    });

    test('removes path separators', () => {
      expect(FilenameSanitizer.sanitize('user/data.json')).toBe('user_data.json');
    });

    test('prevents path traversal', () => {
      expect(FilenameSanitizer.sanitize('../../etc/passwd')).toBe('._._etc_passwd');
    });

    test('handles Windows reserved names', () => {
      expect(FilenameSanitizer.sanitize('CON.txt')).toBe('_CON.txt');
      expect(FilenameSanitizer.sanitize('PRN')).toBe('_PRN');
    });

    test('truncates long filenames', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = FilenameSanitizer.sanitize(longName);

      expect(Buffer.byteLength(sanitized, 'utf-8')).toBeLessThanOrEqual(255);
    });

    test('handles Unicode characters', () => {
      expect(FilenameSanitizer.sanitize('파일명.txt')).toBe('파일명.txt');
      expect(FilenameSanitizer.sanitize('emoji😀.txt')).toBe('emoji😀.txt');
    });

    test('throws on empty filename', () => {
      expect(() => FilenameSanitizer.sanitize('')).toThrow('Filename cannot be empty');
      expect(() => FilenameSanitizer.sanitize('   ')).toThrow('Filename cannot be empty');
    });
  });

  describe('validate', () => {
    test('accepts valid filename', () => {
      const result = FilenameSanitizer.validate('valid_file.txt');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects filename with invalid characters', () => {
      const result = FilenameSanitizer.validate('file<name>.txt');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('invalid characters');
    });

    test('rejects filename with path traversal', () => {
      const result = FilenameSanitizer.validate('../../../etc/passwd');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('path traversal'))).toBe(true);
    });

    test('warns on spaces', () => {
      const result = FilenameSanitizer.validate('my file.txt');

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('spaces'))).toBe(true);
    });

    test('warns on reserved names', () => {
      const result = FilenameSanitizer.validate('CON.txt');

      expect(result.warnings.some(w => w.includes('reserved name'))).toBe(true);
    });
  });

  describe('generateSafeFilename', () => {
    test('generates unique filename', () => {
      const name1 = FilenameSanitizer.generateSafeFilename('test', 'txt');
      const name2 = FilenameSanitizer.generateSafeFilename('test', 'txt');

      expect(name1).not.toBe(name2);
      expect(name1).toMatch(/^test_\d+_[a-z0-9]{6}\.txt$/);
    });

    test('sanitizes prefix', () => {
      const name = FilenameSanitizer.generateSafeFilename('my file!', 'json');

      expect(name).toMatch(/^my_file__\d+/);
    });
  });
});
```

#### 예시 시나리오

**시나리오 1: 공백 포함 파일명**

```typescript
// Agent 시도
const filename = "my file.txt";

// 정제 후
const sanitized = FilenameSanitizer.sanitize(filename);
// → "my_file.txt"
```

**시나리오 2: Windows 예약어**

```typescript
// Agent 시도
const filename = "CON.txt";

// 검증
const validation = FilenameSanitizer.validate(filename);
// → { valid: true, warnings: ["Filename matches OS reserved name: CON"] }

// 정제 후
const sanitized = FilenameSanitizer.sanitize(filename);
// → "_CON.txt"
```

**시나리오 3: 경로 순회 시도**

```typescript
// Agent 시도 (악의적 또는 실수)
const filename = "../../etc/passwd";

// 검증
const validation = FilenameSanitizer.validate(filename);
// → { valid: false, errors: ["Filename contains path traversal sequence (..)"] }

// 정제 후
const sanitized = FilenameSanitizer.sanitize(filename);
// → "._._etc_passwd"
```

**시나리오 4: 너무 긴 파일명**

```typescript
// Agent 시도
const filename = "very_long_filename_".repeat(20) + ".txt";
// → 300+ bytes

// 정제 후
const sanitized = FilenameSanitizer.sanitize(filename);
// → 255 bytes 이하로 자동 잘림
```

#### 모니터링 및 메트릭

```typescript
/**
 * 파일명 정제 메트릭
 */
class FilenameSanitizationMetrics {
  /**
   * 정제 이벤트 추적
   */
  trackSanitization(original: string, sanitized: string): void {
    if (original !== sanitized) {
      metrics.increment('filename.sanitized', {
        changed: 'yes',
      });

      // 상세 로그
      logger.info('Filename sanitized', {
        original,
        sanitized,
        diff: this.calculateDiff(original, sanitized),
      });
    }
  }

  /**
   * 검증 실패 추적
   */
  trackValidationFailure(filename: string, errors: string[]): void {
    metrics.increment('filename.validation.failed', {
      errorCount: errors.length,
    });

    logger.warn('Filename validation failed', {
      filename,
      errors,
    });
  }

  /**
   * OS 예약어 감지 추적
   */
  trackReservedName(filename: string): void {
    metrics.increment('filename.reserved_name_detected');

    logger.warn('OS reserved name detected', { filename });
  }
}
```

#### 권장 설정

**프로덕션**:
- 항상 파일명 정제 활성화
- 검증 실패 시 에러 발생 (생성 차단)
- 모든 정제 이벤트 로깅

**개발**:
- 검증 실패 시 경고만 출력 (생성 허용)
- 정제 전/후 비교 로깅

**OS별 추가 고려사항**:
- **Windows**: 예약어, 대소문자 무시
- **Linux**: 숨김 파일 (`.`로 시작)
- **macOS**: 정규화된 Unicode (NFC)

---

**Phase 3: 구현 - 수행 사항**:
1. 수정 계획 정확히 따르기
2. 점진적으로 변경 (한 번에 하나의 컴포넌트)
3. 기존 코드 스타일 및 패턴 보존
4. 모든 관련 파일 업데이트 (imports, configs, docs)
5. 각 변경 후 프로젝트 빌드 확인
6. 새 기능에 대한 테스트 작성

**금지 사항**:
- 계획에 없는 변경 하지 않기
- 기존 기능 깨뜨리지 않기
- 기존 코드 스타일 무시하지 않기
- 문서 업데이트 잊지 않기
- 하드코딩된 시크릿 추가하지 않기

**Phase 4: 검증 - 수행 사항**:
1. 모든 기존 테스트를 실행하고 통과하는지 확인
2. 새 기능에 대한 새 테스트 실행
3. 변경된 기능의 수동 테스트 수행
4. 테스트 결과 문서화
5. 회귀가 도입되지 않았는지 확인

**금지 사항**:
- 기존 기능 테스트 건너뛰지 않기
- 기존 테스트가 새 기능에 충분하다고 가정하지 않기
- 테스트 실패 무시하지 않기

---

### 3. workflow - 워크플로우 자동화

**목적**: 자동화된 워크플로우 및 통합 생성

**워크플로우**: 4-Phase-C

```
Phase 1: 기획 (Planning) - 워크플로우 요구사항 정의
    ↓
Phase 2: 설계 (Design) - 워크플로우 로직 설계
    ↓
Phase 3: 개발 (Development) - 워크플로우 구현
    ↓
Phase 4: 검증 (Testing) - 워크플로우 실행 검증
```

**워크플로우 특화 초점**:
- **트리거**: 스케줄 (cron), 웹훅, 수동, 이벤트 기반
- **단계**: 액션, 조건, 루프, 병렬 실행
- **통합**: 외부 서비스 (Slack, GitHub, email, databases)
- **오류 처리**: 재시도, 폴백, 알림
- **상태 관리**: 워크플로우 상태, 단계 간 데이터 전달

#### Phase 1: 기획 (워크플로우 요구사항)

**목적**: 트리거 및 통합을 포함한 포괄적인 워크플로우 요구사항 정의

**산출물**: `docs/planning/workflow_requirements.md`

**문서에 포함되어야 할 내용**:

1. **워크플로우 개요**:
   - 이름 및 목적
   - 해결하는 문제
   - 예상 결과

2. **트리거 정의**:
   - **타입**: schedule | webhook | manual | event
   - **설정**:
     - Schedule: Cron 표현식 (예: 평일 오전 9시를 위한 `0 9 * * 1-5`)
     - Webhook: 예상 페이로드 구조, 인증
     - Manual: 입력 매개변수
     - Event: 이벤트 소스 및 필터

3. **워크플로우 단계** (고수준):
   - 단계 1: 액션 이름 및 목적
   - 단계 2: 액션 이름 및 목적
   - ...
   - 조건 및 분기 로직
   - 루프/반복 요구사항

4. **외부 통합**:
   - 서비스 1: 목적, 사용된 API, 인증 방법
   - 서비스 2: 목적, 사용된 API, 인증 방법
   - ...

5. **데이터 요구사항**:
   - 입력 데이터 (트리거로부터)
   - 단계 간 전달되는 데이터
   - 출력 데이터 (결과)

6. **오류 처리 요구사항**:
   - 재시도 전략
   - 폴백 동작
   - 오류 알림

7. **성공 기준**:
   - 워크플로우 성공 여부 판단 방법
   - 예상 실행 시간
   - 성능 요구사항

**검증 기준**:
- ✅ 트리거 타입 및 설정 명확히 정의
- ✅ 모든 워크플로우 단계 나열
- ✅ 외부 통합 식별
- ✅ 오류 처리 전략 지정
- ✅ 문서 ≥800자

#### Phase 2: 설계 (워크플로우 로직)

**목적**: 단계별 실행 계획이 포함된 상세한 워크플로우 로직 설계

**산출물**: `docs/design/workflow_design.md`

**문서에 포함되어야 할 내용**:

1. **워크플로우 다이어그램** (텍스트 기반 또는 mermaid):
```
Trigger → Step 1 → Condition → Step 2A
                            └→ Step 2B → Step 3 → End
```

2. **단계 정의** (상세):

각 단계마다:
```
Step N: [이름]
  목적: 이 단계가 수행하는 작업
  입력: 이전 단계로부터 받은 데이터
  액션: 수행할 구체적인 액션
  통합: 외부 서비스 API 호출 (있는 경우)
  출력: 다음 단계를 위해 생성된 데이터
  오류 처리: 이 단계가 실패할 경우 발생하는 일
  재시도: 재시도 횟수 및 지연
```

3. **조건 로직**:
   - If/else 조건
   - Switch 케이스
   - 필터링 로직

4. **루프 로직** (해당하는 경우):
   - 배열 반복
   - While 루프 조건
   - Break/continue 기준

5. **데이터 흐름**:
   - 각 단계의 데이터 구조
   - 데이터 변환
   - 변수 및 상태

6. **통합 명세**:

각 통합마다:
```
서비스: [이름]
  API 엔드포인트: [URL]
  메서드: GET/POST/PUT/DELETE
  인증: API key / OAuth / Basic
  요청: [구조]
  응답: [구조]
  레이트 리미트: [제한]
  오류 코드: [코드 및 의미]
```

7. **상태 관리**:
   - 워크플로우 상태 구조
   - 상태 지속성 (필요한 경우)
   - 상태 정리

**검증 기준**:
- ✅ 워크플로우 다이어그램 제공
- ✅ 모든 단계 상세 정의
- ✅ 조건 및 루프 지정
- ✅ 데이터 흐름 문서화
- ✅ 통합 스펙 완성
- ✅ 문서 ≥1000자

#### Phase 3: 개발 (워크플로우 구현)

**목적**: 모든 트리거, 단계 및 통합이 포함된 워크플로우 구현

**산출물**: 완전한 워크플로우 코드베이스

**구현에 포함되어야 할 사항**:

1. **프로젝트 구조**:
```
workflow-project/
├── src/
│   ├── triggers/
│   │   ├── schedule.js       # 스케줄 트리거 핸들러
│   │   ├── webhook.js        # 웹훅 트리거 핸들러
│   │   └── manual.js         # 수동 트리거 핸들러
│   ├── steps/
│   │   ├── step1.js          # 각 워크플로우 단계
│   │   ├── step2.js
│   │   └── ...
│   ├── integrations/
│   │   ├── slack.js          # 외부 서비스 클라이언트
│   │   ├── github.js
│   │   └── ...
│   ├── utils/
│   │   ├── error-handler.js  # 오류 처리 유틸리티
│   │   └── retry.js          # 재시도 로직
│   └── workflow.js           # 메인 워크플로우 오케스트레이터
├── tests/
│   ├── unit/                 # 유닛 테스트
│   ├── integration/          # 통합 테스트
│   └── e2e/                  # 엔드투엔드 워크플로우 테스트
├── config/
│   ├── workflow.config.js    # 워크플로우 설정
│   └── integrations.config.js
├── .env.example              # 환경 변수 템플릿
├── package.json
└── README.md
```

2. **트리거 구현**:
   - Schedule: Cron 작업 설정
   - Webhook: 검증이 포함된 HTTP 엔드포인트
   - Manual: CLI 또는 API 엔드포인트
   - Event: 이벤트 리스너 및 핸들러

3. **단계 구현**:
   - 각 단계를 별도의 함수/클래스로
   - 입력 검증
   - 액션 실행
   - 출력 생성
   - 재시도가 포함된 오류 처리

4. **통합 클라이언트**:
   - 각 외부 서비스에 대한 API 클라이언트
   - 인증 처리
   - 요청/응답 변환
   - 오류 처리
   - 레이트 리미트 처리

5. **워크플로우 오케스트레이터**:
   - 올바른 순서로 단계 실행
   - 조건 및 분기 처리
   - 단계 간 데이터 흐름 관리
   - 오류 및 재시도 처리
   - 실행 진행 상황 로깅

6. **설정**:
   - 워크플로우 설정 (타임아웃, 재시도 등)
   - 통합 자격 증명 (환경 변수를 통해)
   - 환경별 설정

7. **테스트**:
   - 각 단계에 대한 유닛 테스트
   - 외부 서비스에 대한 통합 테스트 (모의 객체 포함)
   - 엔드투엔드 워크플로우 테스트
   - 오류 시나리오 테스트

**검증 기준**:
- ✅ 모든 트리거 구현
- ✅ 모든 단계 구현
- ✅ 모든 통합 작동
- ✅ 재시도가 포함된 오류 처리
- ✅ 테스트 포함 및 통과
- ✅ 환경 변수를 통한 설정
- ✅ 하드코딩된 자격 증명 없음
- ✅ 설정 및 사용 지침이 포함된 README

#### Phase 4: 검증 (워크플로우 실행)

**책임**: Sub-Agent (워크플로우 실행 및 검증)

**목적**: 모든 트리거 타입, 워크플로우 단계 및 오류 시나리오 테스트

**산출물**: 테스트 결과 및 실행 로그

**중요**: Phase-C에서는 Sub-Agent가 직접 워크플로우를 테스트하고 결과를 보고합니다.
- 모든 트리거 타입 실행 테스트
- 엔드투엔드 워크플로우 검증
- 오류 시나리오 처리 확인

**테스트 체크리스트**:

1. **트리거 테스트**:
   - [ ] 스케줄 트리거가 올바른 시간에 실행됨
   - [ ] 웹훅이 페이로드를 올바르게 수신하고 검증함
   - [ ] 수동 트리거가 올바른 입력을 수락함
   - [ ] 이벤트 트리거가 이벤트를 수신하고 응답함

2. **단계 테스트**:
   - [ ] 각 단계가 독립적으로 올바르게 실행됨
   - [ ] 단계가 입력을 올바르게 처리함
   - [ ] 단계가 예상된 출력을 생성함
   - [ ] 조건 및 분기가 올바르게 작동함
   - [ ] 루프가 올바르게 반복됨

3. **통합 테스트**:
   - [ ] 외부 서비스 호출 성공
   - [ ] 인증 작동
   - [ ] 요청/응답 처리 올바름
   - [ ] 레이트 리미트 준수
   - [ ] API 오류를 우아하게 처리

4. **엔드투엔드 테스트**:
   - [ ] 완전한 워크플로우가 성공적으로 실행됨
   - [ ] 데이터가 단계 간 올바르게 흐름
   - [ ] 최종 출력이 올바름
   - [ ] 실행 시간 허용 가능

5. **오류 시나리오 테스트**:
   - [ ] 단계 실패 시 재시도 트리거
   - [ ] 최대 재시도 초과 시 폴백 트리거
   - [ ] 네트워크 오류 처리
   - [ ] 잘못된 입력 거부
   - [ ] 오류 알림 전송

6. **성능 테스트**:
   - [ ] 워크플로우가 예상 시간 내에 완료됨
   - [ ] 메모리 누수 없음
   - [ ] 리소스 사용량 허용 가능

**검증 기준**:
- ✅ 모든 테스트 문서화 및 실행
- ✅ 모든 테스트 통과 (또는 실패 설명)
- ✅ 오류 시나리오 테스트
- ✅ 실행 로그 캡처
- ✅ 성능 허용 가능

### workflow (Phase-C)를 위한 서브 에이전트 지침

**create_app 및 modify_app와의 중요한 차이점**:
- **자동화 및 통합**에 초점 (전체 앱이 아님)
- 트리거 기반 실행 (사용자 기반 UI가 아님)
- 외부 서비스 통합이 매우 중요
- 오류 처리 및 재시도가 필수
- 코드베이스는 더 작지만 오케스트레이션이 더 복잡

**Phase 1: 기획 - 수행 사항**:
1. 워크플로우 트리거를 명확히 정의 (schedule/webhook/manual/event)
2. 워크플로우를 개별 단계로 분해
3. 필요한 모든 외부 서비스 식별
4. 오류 처리 및 재시도 전략 계획
5. `docs/planning/workflow_requirements.md`에 문서화

**금지 사항**:
- 모호한 단계 정의 생성하지 않기
- 트리거 설정 지정 잊지 않기
- 오류 처리 무시하지 않기
- 외부 서비스 요구사항 놓치지 않기

**Phase 2: 설계 - 수행 사항**:
1. 모든 단계 및 조건을 보여주는 워크플로우 다이어그램 생성
2. 각 단계를 상세히 정의 (입력, 액션, 출력, 오류)
3. 각 통합에 대한 API 호출 지정
4. 단계 간 데이터 흐름 설계
5. `docs/design/workflow_design.md`에 문서화

**금지 사항**:
- 워크플로우 다이어그램 건너뛰지 않기
- 통합 스펙을 불완전하게 남겨두지 않기
- 데이터 변환 요구사항 무시하지 않기
- 상태 관리를 잊지 않기

**Phase 3: 개발 - 수행 사항**:
1. 적절한 프로젝트 구조 생성 (트리거, 단계, 통합)
2. 트리거 핸들러 구현
3. 각 워크플로우 단계 구현
4. 오류 처리가 포함된 통합 클라이언트 생성
5. 워크플로우 오케스트레이터 구축
6. 포괄적인 테스트 작성
7. README에 설정 및 사용법 문서화

**금지 사항**:
- 자격 증명 하드코딩하지 않기 (환경 변수 사용)
- 오류 처리 및 재시도 건너뛰지 않기
- 통합 테스트 잊지 않기
- 외부 API에 대한 레이트 리미트 무시하지 않기
- 모놀리식 코드 생성하지 않기 (관심사 분리)

**Phase 4: 검증 - 수행 사항**:
1. 각 트리거 타입 테스트
2. 각 단계를 개별적으로 테스트
3. 모든 통합 테스트 (필요시 모의 객체 사용)
4. 엔드투엔드 워크플로우 테스트 실행
5. 오류 시나리오 및 재시도 테스트
6. 모든 테스트 결과 문서화

**금지 사항**:
- 오류 시나리오 테스트 건너뛰지 않기
- 모든 트리거 타입 테스트 잊지 않기
- 통합 테스트 무시하지 않기
- 외부 API가 항상 사용 가능하다고 가정하지 않기

---

### 4. custom - 자유 형식 대화

**목적**: 구조화된 워크플로우에 맞지 않는 다양한 태스크 처리

**워크플로우**: Type-D (구조화된 페이즈 없음)

```
사용자 프롬프트 → 에이전트 응답 → 반복적 대화 → 완료
```

**특징**:
- 고정된 페이즈 또는 산출물 없음
- 따를 가이드 문서 없음
- 공식 검증 또는 리뷰 게이트 없음
- 에이전트가 자율적 의사결정 사용
- 대화형, 반복적 접근 방식

**사용 사례**:
- Q&A 및 설명 ("WebSocket이 어떻게 작동하는지 설명")
- 코드 리뷰 ("이 코드의 보안 문제 검토")
- 디버깅 도움 ("이 오류가 왜 발생하는가?")
- 빠른 태스크 ("이메일 검증 regex 작성")
- 연구 ("React 상태 관리 모범 사례 찾기")
- 비교 ("REST vs GraphQL 비교")

**custom (Type-D)를 위한 서브 에이전트 지침**:

**수행 사항**:
1. 사용자의 요청 읽고 이해
2. 자연스럽고 도움이 되게 응답
3. 명확화가 필요하면 질문
4. 철저하고 정확한 답변 제공
5. 코드가 필요하면 생성
6. 연구가 필요하면 결과 설명
7. 태스크 완료 시 완료 신호

**금지 사항**:
- Phase-A/B/C 워크플로우를 따르려고 하지 않기
- 공식 산출물 문서 생성하지 않기
- 리뷰 게이트 기다리지 않기
- 진정으로 필요하지 않으면 의존성 요청하지 않기
- 응답을 과도하게 구조화하지 않기

**완료 신호 방법**:
- 단순히 "태스크 완료" 또는 유사한 문구 표현
- 공식 페이즈 완료 프로토콜 불필요
- 사용자가 후속 질문이 있으면 에이전트가 대화 계속 가능

**예시**:

예시 1: 설명 요청
```
사용자: "JWT 인증이 어떻게 작동하는지 설명해주세요"
에이전트: [상세한 설명 제공]
에이전트: "구조, 서명, 검증을 포함한 JWT 인증을 설명했습니다. 더 자세히 설명해드릴 부분이 있나요?"
```

예시 2: 코드 생성
```
사용자: "API 호출을 디바운스하는 함수 작성"
에이전트: [설명과 함께 디바운스 함수 생성]
에이전트: "디바운스 함수 구현입니다. 작동 방식을 설명하거나 특정 사용 사례에 맞게 수정해드릴까요?"
```

예시 3: 디버깅 도움
```
사용자: "'Cannot read property of undefined' 오류가 왜 발생하나요?"
에이전트: "이 오류는... [설명]"
에이전트: "이를 해결하려면... [해결책]"
에이전트: "정확한 원인을 파악하기 위해 코드를 검토해드릴까요?"
```

---

## 리뷰 게이트 시스템

각 페이즈 완료 후 (custom 태스크 제외), **리뷰 게이트**가 트리거됩니다:

```
페이즈 완료
    ↓
자동 산출물 수집
    ↓
검증 확인 (자동)
    ├─ 통과 → 리뷰 생성
    └─ 실패 → 자동 재작업 (최대 3회 시도)
           ├─ 성공 → 리뷰 생성
           └─ 여전히 실패 → 사용자에게 알림
    ↓
사용자 리뷰 (웹 UI)
    ├─ 승인 → 다음 페이즈
    └─ 변경 요청 → 재작업
           ↓
           재검증 → 재리뷰
```

### 리뷰 프로세스

1. **에이전트가 완료 신호**: `=== PHASE N COMPLETE ===`
2. **플랫폼이 에이전트 일시정지**
3. **검증 에이전트 실행** (별도의 Claude Code 인스턴스)
4. **검증 보고서 생성**
5. **실패 시**: 자동 재작업 (최대 3회 시도)
6. **통과 시**: 사용자를 위한 리뷰 생성
7. **사용자가 리뷰** 웹 UI를 통해 산출물 검토
8. **사용자가 승인 또는 변경 요청**
9. **승인 시**: 에이전트가 다음 페이즈로 진행
10. **변경 요청 시**: 에이전트가 피드백을 처리하고 재제출

### 리뷰 UI 기능

- 모든 산출물 보기 (문서, 코드 파일)
- 코드 구문 강조
- 문서 마크다운 렌더링
- 파일 수준 댓글
- 라인 수준 피드백
- 전체 승인/거부
- 피드백 제출

---

## 검증 시스템

### 자동 검증 (워크플로우별)

**중요**: 검증 기준은 워크플로우 타입에 따라 다릅니다. 검증 에이전트는 태스크 타입을 식별하고 올바른 기준을 적용해야 합니다.

### Phase-A (create_app)에 대한 검증

각 페이즈 완료 후, 검증 에이전트가 확인:

**Phase 1 (기획) - 9개 문서**:
- ✅ 모든 9개 파일 존재: `docs/planning/01_idea.md` ~ `09_roadmap.md`
- ✅ 각 문서 ≥500자
- ✅ 플레이스홀더 없음: `[TODO]`, `[TBD]`, `[Insert X]`, `Coming soon`, `To be defined`
- ✅ 섹션 완전성 (가이드의 모든 섹션 채워짐)
- ✅ 정보 일관성:
  - 08_tech.md와 향후 페이즈 간 기술 스택 일관성
  - 07_features.md의 기능이 06_product.md의 제품 범위와 일치
  - 03_persona.md와 다른 문서 간 타겟 사용자 일관성
- ✅ 적절한 마크다운 포맷팅
- ✅ 구체적인 내용 (일반적인 템플릿이 아님)

**Phase 2 (설계) - 5개 문서**:
- ✅ 모든 5개 파일 존재: `docs/design/01_screen.md` ~ `05_architecture.md`
- ✅ 각 문서 ≥500자
- ✅ 구체적인 데이터 모델 정의:
  - 엔티티 이름 나열
  - 타입이 포함된 필드 (string, number, boolean 등)
  - 관계 문서화
- ✅ API 스펙 완성:
  - HTTP 메서드 (GET, POST, PUT, DELETE)
  - 경로 (예: `/api/users/:id`)
  - 요청 본문 구조
  - 응답 구조
  - 상태 코드
- ✅ 아키텍처 다이어그램 또는 상세한 설명 존재
- ✅ 설계가 구체적이고 실현 가능 (모호하지 않음)
- ✅ Phase 1과의 일관성:
  - 기술 스택이 08_tech.md와 일치
  - 기능이 07_features.md와 일치

**Phase 3 (개발) - 코드베이스**:
- ✅ 선택한 기술 스택에 맞는 올바른 프로젝트 구조
- ✅ 주요 파일 존재:
  - `package.json` (Node.js) 또는 동등한 파일
  - `.gitignore`
  - `README.md`
  - 설정 파일
- ✅ 테스트 포함 (유닛, 통합, 또는 e2e)
- ✅ 테스트 통과
- ✅ `.env`가 `.gitignore`에 나열
- ✅ `.env.example` 제공 (환경 변수가 필요한 경우)
- ✅ 하드코딩된 시크릿 없음 (API 키, 비밀번호, 토큰)
- ✅ README 포함:
  - 프로젝트 설명
  - 설치 단계
  - 실행 방법
  - 테스트 방법
  - 필요한 환경 변수
- ✅ 코드 품질:
  - 구문 오류 없음
  - 명백한 버그 없음
  - 적절한 오류 처리
  - 필요한 곳에 주석

### Phase-B (modify_app)에 대한 검증

**Phase 1 (분석) - 1개 문서**:
- ✅ 파일 존재: `docs/analysis/current_state.md`
- ✅ 문서 ≥1000자
- ✅ 프로젝트 구조 문서화
- ✅ 주요 컴포넌트 식별
- ✅ 의존성 나열
- ✅ 영향 평가 제공
- ✅ 수정할 영역 명확히 식별
- ✅ 분석이 정확함 (실제 코드베이스와 검증)

**Phase 2 (계획) - 1개 문서**:
- ✅ 파일 존재: `docs/planning/modification_plan.md`
- ✅ 문서 ≥800자
- ✅ 요구사항 명확히 정의
- ✅ 파일 수준 변경 계획 제공:
  - 생성할 파일 (목적 포함)
  - 수정할 파일 (변경사항 포함)
  - 삭제할 파일 (이유 포함)
- ✅ 위험 평가 포함
- ✅ 테스트 전략 정의
- ✅ 계획이 현실적이고 구체적

**Phase 3 (구현) - 수정된 코드**:
- ✅ 모든 계획된 변경사항 구현
- ✅ 기존 기능 보존 (의도하지 않은 호환성 파괴 없음)
- ✅ 코드 스타일이 기존 패턴과 일치
- ✅ 모든 import 및 참조 업데이트
- ✅ 변경사항을 반영하도록 문서 업데이트
- ✅ 새 의존성 문서화 (있는 경우)
- ✅ 설정 파일 업데이트 (필요한 경우)
- ✅ `.env.example` 업데이트 (새 환경 변수 추가 시)
- ✅ 하드코딩된 시크릿 없음
- ✅ 프로젝트가 오류 없이 빌드

**Phase 4 (검증) - 검증 결과**:
- ✅ 테스트 결과 문서화
- ✅ 모든 기존 테스트 여전히 통과 (또는 적절히 업데이트)
- ✅ 새 기능에 대한 새 테스트 추가
- ✅ 새 테스트 통과
- ✅ 수동 테스트 문서화
- ✅ 회귀 식별 없음

### Phase-C (workflow)에 대한 검증

**Phase 1 (기획) - 워크플로우 요구사항**:
- ✅ 파일 존재: `docs/planning/workflow_requirements.md`
- ✅ 문서 ≥800자
- ✅ 워크플로우 개요 제공
- ✅ 트리거 타입 및 설정 정의
- ✅ 워크플로우 단계 나열 (고수준)
- ✅ 외부 통합 식별
- ✅ 오류 처리 전략 지정
- ✅ 성공 기준 정의
- ✅ 요구사항이 구체적이고 실행 가능

**Phase 2 (설계) - 워크플로우 로직**:
- ✅ 파일 존재: `docs/design/workflow_design.md`
- ✅ 문서 ≥1000자
- ✅ 워크플로우 다이어그램 제공 (텍스트 또는 mermaid)
- ✅ 모든 단계 상세 정의:
  - 입력, 액션, 출력
  - 오류 처리, 재시도
- ✅ 조건 및 분기 로직 지정
- ✅ 데이터 흐름 문서화
- ✅ 통합 명세 완성:
  - API 엔드포인트, 메서드
  - 인증 방법
  - 요청/응답 구조
- ✅ 상태 관리 정의 (필요한 경우)
- ✅ 설계가 실현 가능하고 완전함

**Phase 3 (개발) - 워크플로우 코드**:
- ✅ 워크플로우에 적합한 프로젝트 구조
- ✅ 트리거 핸들러 구현 (schedule/webhook/manual/event)
- ✅ 모든 워크플로우 단계 구현
- ✅ 통합 클라이언트 구현
- ✅ 재시도가 포함된 오류 처리
- ✅ 환경 변수를 통한 설정 (하드코딩된 자격 증명 없음)
- ✅ 테스트 포함:
  - 단계에 대한 유닛 테스트
  - 외부 서비스에 대한 통합 테스트
  - 엔드투엔드 워크플로우 테스트
- ✅ 테스트 통과
- ✅ 설정 및 사용 지침이 포함된 README
- ✅ `.env.example` 제공
- ✅ 코드가 오류 없이 빌드되고 실행됨

**Phase 4 (검증) - 워크플로우 실행**:
- ✅ 모든 트리거 타입 테스트
- ✅ 모든 단계 개별적으로 테스트
- ✅ 모든 통합 테스트
- ✅ 엔드투엔드 워크플로우 테스트
- ✅ 오류 시나리오 테스트
- ✅ 테스트 결과 문서화
- ✅ 모든 테스트 통과
- ✅ 성능 허용 가능

### Type-D (custom)에 대한 검증

**공식 검증 없음** - custom 태스크는 구조화된 산출물이나 페이즈가 없습니다.

#### 품질 평가 기준

Type-D 작업은 구조화된 Phase가 없으므로, 다음 5가지 차원에서 품질을 평가합니다:

1. **Relevance (관련성)**: 응답이 사용자의 질문/요청을 직접 다루는가?
2. **Completeness (완전성)**: 답변이 장황하지 않으면서도 충분히 상세한가?
3. **Accuracy (정확성)**: 제공된 정보가 기술적으로 정확한가?
4. **Clarity (명확성)**: 응답이 이해하기 쉬운가?
5. **Actionability (실행 가능성)**: 사용자가 응답을 바탕으로 행동을 취할 수 있는가?

#### 품질 평가 프로세스

- **자동 검증 없음**: Type-D는 검증 에이전트를 거치지 않음
- **사용자 만족도 중심**: 최종 품질 기준은 사용자 만족도
- **암묵적 신호 추적**: 플랫폼은 다음 신호를 모니터링
  - 후속 질문 발생 (불명확한 답변 지표)
  - 작업 중단율 (불만족 지표)
  - 대화 길이 (효율성 지표)

#### TypeScript 구현 예시

```typescript
// packages/core/src/evaluation/CustomTaskEvaluator.ts

/**
 * Type-D (custom) 작업의 품질 평가기
 */
export class CustomTaskEvaluator {
  /**
   * 응답 품질 점수 계산 (1-5)
   */
  calculateQualityScore(response: string, userPrompt: string): QualityScore {
    return {
      relevance: this.assessRelevance(response, userPrompt),
      completeness: this.assessCompleteness(response),
      accuracy: this.assessAccuracy(response),
      clarity: this.assessClarity(response),
      actionability: this.assessActionability(response),
      overall: 0, // 계산 후 채워짐
    };
  }

  /**
   * 관련성 평가 (키워드 매칭 기반)
   */
  private assessRelevance(response: string, userPrompt: string): number {
    const promptKeywords = this.extractKeywords(userPrompt);
    const responseKeywords = this.extractKeywords(response);

    const matchCount = promptKeywords.filter(kw =>
      responseKeywords.includes(kw)
    ).length;

    const relevanceRatio = matchCount / promptKeywords.length;
    return Math.min(5, Math.round(relevanceRatio * 5));
  }

  /**
   * 완전성 평가 (길이 및 구조 기반)
   */
  private assessCompleteness(response: string): number {
    const hasCodeExamples = /```/.test(response);
    const hasExplanation = response.length > 200;
    const hasSections = response.split('\n\n').length > 2;

    let score = 2; // 기본 점수
    if (hasCodeExamples) score += 1;
    if (hasExplanation) score += 1;
    if (hasSections) score += 1;

    return Math.min(5, score);
  }

  /**
   * 명확성 평가 (가독성 기반)
   */
  private assessClarity(response: string): number {
    // 문장 길이 분석 (짧을수록 명확)
    const sentences = response.split(/[.!?]+/).filter(s => s.trim());
    const avgSentenceLength = sentences.reduce((sum, s) =>
      sum + s.split(' ').length, 0
    ) / sentences.length;

    // 평균 문장 길이 15-25 단어가 이상적
    if (avgSentenceLength < 10) return 3; // 너무 짧음
    if (avgSentenceLength <= 25) return 5; // 이상적
    if (avgSentenceLength <= 35) return 4;
    return 3; // 너무 김
  }

  /**
   * 실행 가능성 평가 (행동 유도 요소)
   */
  private assessActionability(response: string): number {
    const hasSteps = /\d+\.|step \d+/i.test(response);
    const hasCommands = /```bash|```sh|npm |git /.test(response);
    const hasLinks = /https?:\/\//.test(response);

    let score = 2;
    if (hasSteps) score += 1;
    if (hasCommands) score += 1;
    if (hasLinks) score += 1;

    return Math.min(5, score);
  }

  private extractKeywords(text: string): string[] {
    // 간단한 키워드 추출 (불용어 제거)
    const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but']);
    return text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopwords.has(word));
  }
}

interface QualityScore {
  relevance: number;      // 1-5
  completeness: number;   // 1-5
  accuracy: number;       // 1-5
  clarity: number;        // 1-5
  actionability: number;  // 1-5
  overall: number;        // 평균
}
```

#### 사용자 피드백 수집

```typescript
// packages/claude-code-server/src/app/api/tasks/[id]/feedback/route.ts

/**
 * Type-D 작업에 대한 사용자 피드백 수집
 */
export async function POST(req: Request) {
  const { taskId } = await req.json();
  const { rating, comment } = await req.json();

  // 1-5 별점 저장
  await prisma.taskFeedback.create({
    data: {
      taskId,
      rating,        // 1-5
      comment,       // 선택 사항
      timestamp: new Date(),
    },
  });

  // 메트릭 업데이트
  await updateQualityMetrics(taskId, rating);

  return Response.json({ success: true });
}
```

#### 추적 메트릭

플랫폼은 다음 메트릭을 모니터링하여 Type-D 품질을 평가합니다:

```typescript
interface CustomTaskMetrics {
  // 사용자 만족도
  userRating: number;              // 1-5 평균 별점
  thumbsUpRate: number;            // 👍 비율 (0-1)

  // 암묵적 신호
  followUpQuestionRate: number;    // 후속 질문 발생 비율
  taskAbandonmentRate: number;     // 작업 중단 비율
  avgConversationLength: number;   // 평균 대화 턴 수

  // 응답 품질
  avgResponseLength: number;       // 평균 응답 길이 (chars)
  codeExampleRate: number;         // 코드 예제 포함 비율
  linkInclusionRate: number;       // 링크 포함 비율
}
```

#### 예시 시나리오

**좋은 응답 예시** ("Explain WebSockets"):
- ✅ WebSocket의 개념 설명
- ✅ HTTP와의 차이점 비교
- ✅ 코드 예제 포함
- ✅ 사용 사례 제시
- ✅ 추가 학습 자료 링크
- **Quality Score**: Relevance 5, Completeness 5, Clarity 5 → Overall 4.8

**나쁜 응답 예시** ("Debug this error"):
- ❌ 에러 메시지만 반복
- ❌ 구체적인 해결책 없음
- ❌ 후속 질문 3회 필요
- **Quality Score**: Relevance 3, Completeness 2, Actionability 1 → Overall 2.4

#### 품질 개선 권장사항

Type-D 작업의 품질을 높이기 위한 Sub-Agent 가이드라인:

1. **구체적인 답변**: 추상적인 설명보다 구체적인 예시 제공
2. **코드 포함**: 가능한 경우 실행 가능한 코드 예제 포함
3. **단계별 설명**: 복잡한 주제는 단계별로 분해
4. **관련 링크**: 공식 문서나 신뢰할 수 있는 자료 링크
5. **후속 질문 최소화**: 한 번의 응답으로 충분한 정보 제공

### 자동 재작업

검증 실패 시:

```
시도 1: 재작업
    ├─ 성공 → 통과
    └─ 실패 → 시도 2: 재작업
           ├─ 성공 → 통과
           └─ 실패 → 시도 3: 재작업
                  ├─ 성공 → 통과
                  └─ 실패 → 사용자에게 알림 (수동 개입)
```

각 재작업 시도:
1. 에이전트가 검증 보고서 수신
2. 에이전트가 실패한 기준 처리
3. 에이전트가 산출물 재생성/수정
4. 재검증 실행

---

## 질문 처리

에이전트가 명확화가 필요한 경우:

```
에이전트가 [USER_QUESTION] 출력
    ↓
플랫폼이 프로토콜 감지
    ↓
에이전트 일시정지
    ↓
사용자에게 알림
    ↓
사용자가 질문에 답변
    ↓
답변이 에이전트로 전송
    ↓
에이전트 재개
    ↓
에이전트가 답변을 사용하여 진행
```

### 질문 카테고리

- **business**: 비즈니스 결정 (가격, 기능, 타겟 시장)
- **clarification**: 불명확한 요구사항
- **choice**: 여러 유효한 접근 방식
- **confirmation**: 주요 결정 확인

---

## 체크포인트 시스템

체크포인트는 복구를 위해 에이전트 상태를 저장합니다:

### 체크포인트 트리거

1. **자동**: 주기적 (10분마다)
2. **레이트 리미트**: API 레이트 리미트 도달 시
3. **수동**: 사용자 시작 일시정지
4. **오류**: 오류 발생 시
5. **페이즈 완료**: 각 페이즈 후

### 체크포인트 내용

- 대화 기록 (전체 컨텍스트)
- 현재 페이즈 및 단계
- 진행률 백분율
- 환경 상태
- 대기 중인 액션
- 토큰 사용량

### 복구

재개 시:
1. 대화 기록 복원
2. 환경 변수 재주입
3. 마지막 체크포인트부터 재개
4. 실행 계속

---

## 진행 추적

진행률 계산:

```typescript
progress = (
  (completedPhases * 100 / totalPhases) +
  (currentStepProgress * 100 / totalSteps / totalPhases)
) / 100
```

**예시** (create_app Phase 2, 5단계 중 3단계):
```
Phase 1: 완료 (25%)
Phase 2: 진행 중 (3/5 단계 = 15%)
Phase 3: 대기 중 (0%)
Phase 4: 대기 중 (0%)

총계: 25% + 15% = 40%
```

### 실시간 업데이트

SSE를 통해 전송되는 진행 업데이트:
- 페이즈 시작/완료
- 단계 시작/완료
- 문서 생성
- 액션 수행

---

## 오류 처리

### 오류 타입

1. **실행 오류**: 실행 중 에이전트가 오류 발생
2. **검증 오류**: 산출물 검증 실패
3. **레이트 리미트 오류**: API 레이트 리미트 초과
4. **시스템 오류**: 플랫폼 또는 인프라 오류

### 오류 복구

```
오류 감지
    ↓
체크포인트 생성
    ↓
에이전트 일시정지
    ↓
오류 세부사항 로깅
    ↓
사용자에게 알림
    ↓
복구 시도 (가능한 경우)
    ├─ 성공 → 재개
    └─ 실패 → 수동 개입
```

---

## 상태 머신

### 태스크 상태

```
draft → pending → in_progress → review → completed
                      ↓
                   failed
```

### 에이전트 상태

```
idle → running → waiting_review → running → completed
         ↓            ↓
    waiting_*      paused
         ↓
     running
```

---

## 모범 사례

### 서브 에이전트를 위한 (워크플로우별)

#### Phase-A (create_app) 모범 사례

1. **각 페이즈 시작 전에 모든 가이드 읽기**
   - Phase 1: 모든 9개 기획 가이드 읽기
   - Phase 2: 모든 5개 설계 가이드 읽기
   - Phase 3: 모든 6개 개발 가이드 읽기

2. **완전하고 구체적인 내용 생성**
   - 플레이스홀더 금지: `[TODO]`, `[TBD]`, `[Insert X]`
   - 일반적인 설명이 아닌 구체적인 예시 사용
   - "다양한 기능"이 아닌 구체적인 기능 정의

3. **페이즈 간 일관성 유지**
   - Phase 1의 기술 스택이 Phase 2의 아키텍처 및 Phase 3의 코드와 일치해야 함
   - Phase 1에 정의된 기능이 Phase 2에 설계되고 Phase 3에 구현되어야 함

4. **검증 기준 준수**
   - 각 페이즈 완료 전 기준 검토
   - 기준에 대해 산출물 자체 확인
   - 완료 신호 전 문제 수정

5. **의존성 조기 요청**
   - 외부 서비스가 필요한 경우 Phase 1에서 API 키 요청
   - Phase 3까지 기다리지 말고 의존성 요청

#### Phase-B (modify_app) 모범 사례

1. **수정 전에 철저히 분석**
   - 변경 계획 전에 전체 코드베이스 읽기
   - 기존 패턴 및 아키텍처 이해
   - 영향을 받는 모든 컴포넌트 식별

2. **기존 기능 보존**
   - 기존 기능 깨뜨리지 않기
   - 가능한 경우 하위 호환성 유지
   - 기존 테스트 통과 유지

3. **기존 코드 스타일 준수**
   - 들여쓰기, 명명 규칙 일치
   - 동일한 라이브러리 및 패턴 사용
   - 일관되지 않은 패턴 도입하지 않기

4. **광범위한 테스트**
   - 변경 후 모든 기존 테스트 실행
   - 새 기능에 대한 새 테스트 추가
   - 엣지 케이스 및 오류 시나리오 테스트

5. **모든 변경사항 문서화**
   - 설정 변경 시 README 업데이트
   - 로직 변경 시 인라인 주석 업데이트
   - 중요한 변경 시 변경 로그 항목 추가

#### Phase-C (workflow) 모범 사례

1. **트리거 명확히 정의**
   - 스케줄 트리거에 대한 정확한 cron 표현식 지정
   - 완전한 웹훅 페이로드 구조 정의
   - 모든 트리거 설정 문서화

2. **실패를 위한 설계**
   - 지수 백오프를 사용한 재시도 구현
   - 중요한 단계에 대한 폴백 동작 추가
   - 실패 시 알림 전송

3. **레이트 리미트 처리**
   - 외부 API 레이트 리미트 준수
   - 필요시 큐잉 구현
   - 요청 간 지연 추가

4. **복원력 있는 통합 만들기**
   - 네트워크 타임아웃 처리
   - API 응답 검증
   - 의미 있는 오류 메시지 제공

5. **모든 시나리오 테스트**
   - 각 트리거 타입 테스트
   - 오류 시나리오 테스트 (API 다운, 타임아웃, 잘못된 데이터)
   - 엔드투엔드 워크플로우 실행 테스트

#### Type-D (custom) 모범 사례

1. **요청 이해**
   - 응답 전 신중히 읽기
   - 모호한 경우 명확화 질문
   - 복잡한 경우 이해 확인

2. **철저한 답변 제공**
   - 개념을 명확히 설명
   - 도움이 될 때 예시 제공
   - 관련 컨텍스트 포함

3. **품질 높은 코드 생성**
   - 복잡한 로직에 주석 포함
   - 엣지 케이스 처리
   - 모범 사례 준수

4. **대화형 되기**
   - 공식 산출물 불필요
   - 자연스럽고 도움이 되는 톤
   - 상세 설명 또는 명확화 제안

### 사용자를 위한

#### create_app 태스크 생성 시

1. **명확한 앱 설명 제공**
   - 앱이 수행해야 할 작업
   - 사용할 사람
   - 필요한 주요 기능

2. **기술 스택 선호도 지정** (선택사항)
   - 선호하는 프레임워크
   - 데이터베이스 선호도
   - 배포 대상

3. **제약사항 정의**
   - 예산 제약
   - 시간 제약
   - 기술적 제약

#### modify_app 태스크 생성 시

1. **코드베이스에 대한 액세스 제공**
   - 저장소 URL 또는 코드 파일 공유
   - 관련 문서 포함
   - 현재 기능 설명

2. **원하는 변경사항 명확히 설명**
   - 추가/수정/제거할 내용
   - 변경이 필요한 이유
   - 변경 후 예상 동작

3. **중요 영역 강조**
   - 깨져서는 안 되는 기능
   - 성능 요구사항
   - 보안 고려사항

#### workflow 태스크 생성 시

1. **자동화 목표 정의**
   - 자동화해야 할 내용
   - 워크플로우를 트리거하는 것
   - 예상 결과

2. **필요한 통합 나열**
   - 어떤 외부 서비스
   - 사용 가능한 API 액세스
   - 인증 방법

3. **오류 처리 요구사항 지정**
   - 실패 시 발생하는 일
   - 알림을 받을 사람
   - 재시도 요구사항

#### 일반 모범 사례

1. **요청에 신속히 응답**
   - 의존성 요청
   - 사용자 질문
   - 리뷰 피드백

2. **산출물 철저히 검토**
   - 모든 문서 확인
   - 제공된 경우 코드 테스트
   - 완전성 확인

3. **실행 가능한 피드백 제공**
   - 변경이 필요한 사항에 대해 구체적으로
   - 변경이 필요한 이유 설명
   - 도움이 되는 경우 예시 제공

4. **진행 상황 모니터링**
   - 업데이트를 위한 SSE 스트림 관찰
   - 페이즈 완료 확인
   - 필요시 체크포인트 검토

### 플랫폼 운영자를 위한

1. **토큰 사용량 모니터링**
   - 태스크별 사용량 추적
   - 예산 알림 설정
   - 장기 실행 태스크 최적화

2. **레이트 리미트를 우아하게 처리**
   - 제한 도달 시 에이전트 일시정지
   - 재설정 시간 후 재개
   - 지연에 대해 사용자에게 알림

3. **정기적으로 체크포인트 생성**
   - 10분마다
   - 페이즈 완료 시
   - 위험한 작업 전

4. **모든 이벤트 로깅**
   - 태스크 생성/완료
   - 페이즈 전환
   - 오류 및 복구
   - 사용자 상호작용

5. **리소스 정리**
   - 완료된 에이전트 프로세스 종료
   - 이전 산출물 아카이브
   - 임시 파일 정리

6. **산출물 아카이브**
   - 모든 문서 저장
   - 코드 출력 저장
   - 디버깅을 위한 로그 저장

---

## 워크플로우 타입 선택 가이드

**태스크에 적합한 워크플로우 타입을 선택하는 방법:**

### 의사결정 트리

```
코딩 태스크인가?
├─ 아니오 → Type-D (custom)
│         예시: Q&A, 설명, 연구, 비교
│
└─ 예 → 기존 코드 수정이 필요한가?
          ├─ 예 → Phase-B (modify_app)
          │         예시: "다크 모드 추가", "인증 버그 수정", "API 업데이트"
          │
          └─ 아니오 → 자동화/통합에 초점을 맞추는가?
                  ├─ 예 → Phase-C (workflow)
                  │         예시: "GitHub PR 시 Slack 전송", "일일 DB 백업"
                  │
                  └─ 아니오 → Phase-A (create_app)
                            예시: "todo 앱 만들기", "랜딩 페이지 생성"
```

### 상세 선택 기준

| Phase-A (create_app)를 선택하는 경우: | Phase-B (modify_app)를 선택하는 경우: |
|-----------------------------------|-----------------------------------|
| ✅ 새 앱을 처음부터 생성 | ✅ 기존 애플리케이션 수정 |
| ✅ 전체 기획 및 설계 필요 | ✅ 기존 코드베이스 제공됨 |
| ✅ 완전한 애플리케이션 구축 | ✅ 기존 앱에 기능 추가 |
| ✅ 빈 슬레이트로 시작 | ✅ 기존 코드의 버그 수정 |
| ✅ 포괄적인 문서 필요 | ✅ 기존 코드 리팩토링 |
| 예시: "블로그 플랫폼 만들기" | 예시: "내 블로그에 검색 추가" |

| Phase-C (workflow)를 선택하는 경우: | Type-D (custom)를 선택하는 경우: |
|---------------------------------|------------------------------|
| ✅ 자동화 생성 | ✅ Q&A 또는 설명 필요 |
| ✅ 외부 서비스 통합 | ✅ 빠른 코드 스니펫 필요 |
| ✅ 트리거 기반 실행 | ✅ 코드 리뷰 요청 |
| ✅ 예약된 태스크 | ✅ 디버깅 도움 필요 |
| ✅ 이벤트 기반 처리 | ✅ 연구 태스크 |
| 예시: "push 시 자동 배포" | 예시: "async/await 설명" |

### 일반적인 실수

❌ **Phase-A를 사용하지 말아야 할 경우**:
- 기존 앱 수정 (Phase-B 사용)
- 간단한 자동화 (Phase-C 사용)
- Q&A 태스크 (Type-D 사용)

❌ **Phase-B를 사용하지 말아야 할 경우**:
- 새 앱 (Phase-A 사용)
- 워크플로우 자동화 (Phase-C 사용)
- 기존 코드가 없는 태스크 (Phase-A 또는 Phase-C 사용)

❌ **Phase-C를 사용하지 말아야 할 경우**:
- 전체 애플리케이션 (Phase-A 사용)
- 앱 수정 (Phase-B 사용)
- 자동화가 아닌 태스크 (Phase-A, Phase-B, 또는 Type-D 사용)

❌ **Type-D를 사용하지 말아야 할 경우**:
- 구조화된 산출물이 필요한 태스크 (Phase-A/B/C 사용)
- 복잡한 코딩 프로젝트 (Phase-A/B/C 사용)
- 리뷰 게이트가 유익한 태스크 (Phase-A/B/C 사용)

### 실제 예시

**Phase-A (create_app)**:
- "React와 Firebase로 todo 앱 만들기"
- "블로그 플랫폼을 위한 REST API 생성"
- "SaaS 제품을 위한 랜딩 페이지 개발"
- "파일 관리를 위한 CLI 도구 만들기"
- "전자상거래 스토어프론트 생성"

**Phase-B (modify_app)**:
- "기존 React 앱에 다크 모드 추가"
- "로그인 흐름의 인증 버그 수정"
- "사용자 목록에 페이지네이션 추가"
- "async/await를 사용하도록 API 리팩토링"
- "의존성을 최신 버전으로 업데이트"
- "기존 앱에 이메일 알림 추가"

**Phase-C (workflow)**:
- "GitHub PR이 병합되면 Slack 알림 전송"
- "PostgreSQL 데이터베이스를 S3로 일일 백업"
- "main 브랜치 push 시 프로덕션에 자동 배포"
- "주간 분석 보고서 생성 및 이메일 전송"
- "Stripe와 내부 데이터베이스 간 데이터 동기화"
- "웹사이트 가동 시간 모니터링 및 다운타임 시 알림"

**Type-D (custom)**:
- "JWT 인증이 어떻게 작동하는지 설명"
- "이메일 주소를 검증하는 regex 작성"
- "이 코드의 보안 취약점 검토"
- "이 오류 메시지가 왜 발생하나요?"
- "내 사용 사례에 대해 REST vs GraphQL 비교"
- "React를 위한 최고의 상태 관리는 무엇인가요?"

---

## 참조 문서

- **프로젝트 개요**: `../README.md`
- **아키텍처**: `ARCHITECTURE.md`
- **API 참조**: `API.md`
- **개발 가이드**: `DEVELOPMENT.md`
- **기획 가이드**: `/guide/planning/*.md` (Phase-A용)
- **설계 가이드**: `/guide/design/*.md` (Phase-A용)
- **개발 가이드**: `/guide/development/*.md` (Phase-A용)
- **검증 가이드**: `/guide/verification/*.md` (Phase-A용, Phase-B/C에 적용)

---

## 요약

**핵심 내용**:

1. **네 가지 고유한 워크플로우** - 각각 완전히 다른 페이즈 및 요구사항
2. **Phase-A (create_app)**: 가장 포괄적 - 14개 문서 + 코드베이스, 모든 24개 가이드 사용
3. **Phase-B (modify_app)**: 수정에 초점 - 2개 문서 + 수정된 코드, 가이드 없음
4. **Phase-C (workflow)**: 자동화에 초점 - 2개 문서 + 워크플로우 코드, 적용된 가이드
5. **Type-D (custom)**: 구조 없음 - 대화형, 산출물 없음, 가이드 없음
6. **리뷰 게이트**는 Phase-A/B/C에서 각 페이즈 후, Type-D에는 없음
7. **검증**은 워크플로우별로 각 타입에 대해 다른 기준 적용
8. **서브 에이전트는 태스크 타입을 식별**하고 올바른 워크플로우를 따라야 함

**서브 에이전트를 위한**: 항상 태스크 타입을 확인하고 해당 워크플로우를 정확히 따르세요. 워크플로우를 혼합하지 마세요!

**사용자를 위한**: 최상의 결과를 얻기 위해 태스크에 적합한 워크플로우 타입을 선택하세요.

---

## 동시성 관리 (Concurrency Management)

### 동시 파일 쓰기 방지 (Concurrent File Write Prevention)

여러 Sub-Agent가 동시에 실행될 때 파일 시스템 충돌을 방지하는 전략입니다.

#### 문제 상황

```
Agent A: docs/planning/01_idea.md 작성 중
Agent B: docs/planning/01_idea.md 작성 중
→ Race condition: 마지막 쓰기가 이전 쓰기를 덮어씀
```

#### 방어 전략

**1. Workspace 격리 (권장)**

각 Task는 독립된 workspace에서 실행:

```typescript
// packages/agent-manager/src/WorkspaceManager.ts
export class WorkspaceManager {
  /**
   * Task별 독립된 workspace 생성
   */
  async createWorkspace(taskId: string): Promise<string> {
    const workspaceRoot = path.join(
      config.outputDirectory,
      taskId  // ← Task ID별로 디렉토리 분리
    );

    await fs.mkdir(workspaceRoot, { recursive: true });
    await fs.chmod(workspaceRoot, 0o755);

    return workspaceRoot;
  }

  /**
   * Agent 프로세스에 workspace 제한
   */
  async spawnAgentWithWorkspace(taskId: string): Promise<ChildProcess> {
    const workspaceRoot = await this.createWorkspace(taskId);

    const agentProcess = spawn('claude', ['chat'], {
      cwd: workspaceRoot,  // ← 작업 디렉토리 제한
      env: {
        ...process.env,
        WORKSPACE_ROOT: workspaceRoot,
        ALLOWED_PATHS: workspaceRoot,  // ← 접근 가능 경로
      },
    });

    return agentProcess;
  }
}
```

**장점**: 완전한 격리, 구현 간단, 안전한 병렬 실행
**단점**: 디스크 공간 사용량 증가

**2. 파일 잠금 (File Locking)**

```typescript
import lockfile from 'proper-lockfile';

export class FileLockManager {
  async safeWriteFile(
    filePath: string,
    content: string,
    taskId: string
  ): Promise<void> {
    let release: (() => Promise<void>) | null = null;

    try {
      // 1. 잠금 획득
      release = await lockfile.lock(filePath, {
        retries: { retries: 10, minTimeout: 100, maxTimeout: 1000 },
      });

      // 2. 파일 쓰기
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`✅ File written by ${taskId}: ${filePath}`);
    } finally {
      // 3. 잠금 해제
      if (release) await release();
    }
  }
}
```

**3. 원자적 쓰기 (Atomic Write)**

```typescript
export async function atomicWriteFile(
  filePath: string,
  content: string
): Promise<void> {
  const tempPath = `${filePath}.${uuidv4()}.tmp`;

  try {
    // 1. 임시 파일에 쓰기
    await fs.writeFile(tempPath, content, 'utf-8');

    // 2. 원자적으로 rename (POSIX 보장)
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => {});
    throw error;
  }
}
```

**권장 조합**: Workspace 격리 + 원자적 쓰기

### 동시 리뷰 생성 및 승인 처리

여러 Agent가 동시에 Phase를 완료할 때 리뷰 생성 및 승인 프로세스를 순차적으로 처리합니다.

#### 문제 상황

```
Task A: Phase 1 완료 → 리뷰 생성 요청
Task B: Phase 1 완료 → 리뷰 생성 요청
→ 동시에 Verification Agent 실행 → 리소스 경쟁
```

#### 해결 전략

**1. 리뷰 생성 큐**

```typescript
// packages/agent-manager/src/ReviewQueue.ts
import PQueue from 'p-queue';

export class ReviewQueueManager {
  private verificationQueue = new PQueue({ concurrency: 2 }); // 최대 2개 동시 검증
  private reviewCreationQueue = new PQueue({ concurrency: 1 }); // 리뷰 생성은 순차

  /**
   * Phase 완료 처리 (큐 기반)
   */
  async handlePhaseComplete(
    taskId: string,
    phase: number
  ): Promise<void> {
    console.log(`📋 Queueing review for Task ${taskId} Phase ${phase}`);

    return this.verificationQueue.add(async () => {
      try {
        // 1. Verification Agent 실행
        const verificationResult = await this.runVerification(taskId, phase);

        if (verificationResult.passed) {
          // 2. 리뷰 생성 (순차 처리)
          await this.reviewCreationQueue.add(async () => {
            await this.createReview(taskId, phase, verificationResult);
          });
        } else {
          // 3. 재작업 처리
          await this.handleRework(taskId, phase, verificationResult);
        }
      } catch (error) {
        console.error(`❌ Review processing failed:`, error);
        throw error;
      }
    });
  }

  /**
   * Verification Agent 실행
   */
  private async runVerification(
    taskId: string,
    phase: number
  ): Promise<VerificationResult> {
    console.log(`🔍 Running verification for Task ${taskId} Phase ${phase}`);

    // Verification Agent 생성 (별도 프로세스)
    const verifier = await this.spawnVerificationAgent(taskId, phase);

    return new Promise((resolve, reject) => {
      let output = '';

      verifier.stdout.on('data', (data) => {
        output += data.toString();
      });

      verifier.on('close', (code) => {
        if (code === 0) {
          resolve(this.parseVerificationOutput(output));
        } else {
          reject(new Error(`Verification failed with code ${code}`));
        }
      });
    });
  }

  /**
   * 리뷰 생성 (DB 트랜잭션)
   */
  private async createReview(
    taskId: string,
    phase: number,
    verification: VerificationResult
  ): Promise<Review> {
    return await db.$transaction(async (tx) => {
      // 1. 기존 리뷰 확인 (중복 방지)
      const existing = await tx.review.findFirst({
        where: { taskId, phase, status: 'pending' },
      });

      if (existing) {
        console.warn(`⚠️  Review already exists for Task ${taskId} Phase ${phase}`);
        return existing;
      }

      // 2. 산출물 수집
      const deliverables = await this.collectDeliverables(taskId, phase);

      // 3. 리뷰 생성
      const review = await tx.review.create({
        data: {
          taskId,
          phase,
          status: 'pending',
          deliverables,
          verificationReport: verification.report,
          createdAt: new Date(),
        },
      });

      // 4. Task 상태 업데이트
      await tx.task.update({
        where: { id: taskId },
        data: { status: 'review' },
      });

      console.log(`✅ Review created: ${review.id}`);
      return review;
    });
  }
}
```

**2. 리뷰 승인 처리 (Optimistic Locking)**

```typescript
export class ReviewApprovalManager {
  /**
   * 리뷰 승인 (낙관적 잠금)
   */
  async approveReview(
    reviewId: string,
    userId: string,
    comment?: string
  ): Promise<Review> {
    return await db.$transaction(async (tx) => {
      // 1. 버전 체크하며 리뷰 조회
      const review = await tx.review.findUnique({
        where: { id: reviewId },
        select: { id: true, status: true, version: true, taskId: true, phase: true },
      });

      if (!review) {
        throw new Error(`Review not found: ${reviewId}`);
      }

      if (review.status !== 'pending') {
        throw new Error(`Review already ${review.status}`);
      }

      // 2. 승인 처리 (버전 증가)
      const updated = await tx.review.update({
        where: {
          id: reviewId,
          version: review.version, // ← 낙관적 잠금
        },
        data: {
          status: 'approved',
          approvedBy: userId,
          approvedAt: new Date(),
          comment,
          version: { increment: 1 },
        },
      });

      // 3. 다음 Phase 시작
      await this.startNextPhase(review.taskId, review.phase + 1);

      return updated;
    });
  }

  /**
   * 변경 요청 처리
   */
  async requestChanges(
    reviewId: string,
    userId: string,
    feedback: string
  ): Promise<Review> {
    return await db.$transaction(async (tx) => {
      const review = await tx.review.findUnique({
        where: { id: reviewId },
        select: { id: true, status: true, version: true, taskId: true, phase: true },
      });

      if (!review || review.status !== 'pending') {
        throw new Error('Invalid review state');
      }

      // 버전 체크하며 업데이트
      const updated = await tx.review.update({
        where: {
          id: reviewId,
          version: review.version,
        },
        data: {
          status: 'changes_requested',
          reviewedBy: userId,
          reviewedAt: new Date(),
          feedback,
          version: { increment: 1 },
        },
      });

      // Agent에 피드백 전달 및 재작업 시작
      await this.resumeAgentWithFeedback(review.taskId, feedback);

      return updated;
    });
  }
}
```

**3. 동시 승인 충돌 처리**

```typescript
// 여러 사용자가 동시에 승인하려는 경우
try {
  await approveReview(reviewId, userId, comment);
} catch (error) {
  if (error.code === 'P2025') {
    // Prisma: Record not found or version mismatch
    throw new ConflictError('Review was already processed by another user');
  }
  throw error;
}
```

**실행 흐름**:

```
Task A Phase 1 완료
  → Verification Queue에 추가 (위치 1)
  → Verification Agent 실행 (2개 동시 가능)
  → 검증 통과
  → Review Creation Queue에 추가 (순차 처리)
  → DB 트랜잭션으로 리뷰 생성
  → 사용자에게 알림

Task B Phase 1 완료 (동시 발생)
  → Verification Queue에 추가 (위치 2)
  → Task A 검증과 병렬 실행
  → 검증 통과
  → Review Creation Queue 대기 (Task A 완료 후)
  → DB 트랜잭션으로 리뷰 생성
  → 사용자에게 알림
```

**성능 최적화**:
- Verification Agent는 병렬 실행 (concurrency: 2)
- Review 생성은 순차 실행 (DB 충돌 방지)
- 낙관적 잠금으로 동시 승인 방지

---

## 리뷰 타임아웃 정책

### 개요

리뷰가 장기간 승인되지 않고 대기 상태로 남아있는 경우, 자동 리마인더 및 에스컬레이션 정책을 통해 워크플로우 정체를 방지합니다.

### 타임아웃 단계

| 경과 시간 | 액션 | 실행 주체 | 설명 |
|----------|------|----------|------|
| 24시간 | 첫 번째 리마인더 | 시스템 자동 | 이메일/알림: "리뷰 대기 중" |
| 48시간 | 두 번째 리마인더 | 시스템 자동 | 이메일/알림: "긴급 - 리뷰 필요" |
| 72시간 | 에스컬레이션 | 시스템 자동 | 관리자에게 알림, 대체 검토자 배정 옵션 |
| 168시간 (7일) | 자동 승인 옵션 | 관리자 선택 | 설정 활성화 시 자동 승인 |

### 구현

#### 1. 리뷰 생성 시 타이머 등록

```typescript
// packages/agent-manager/src/ReviewQueue.ts

export class ReviewTimeoutManager {
  private timeouts = new Map<string, NodeJS.Timeout>();

  /**
   * 리뷰 생성 시 타임아웃 타이머 등록
   */
  registerReviewTimeout(reviewId: string, createdAt: Date): void {
    const now = Date.now();
    const created = createdAt.getTime();

    // 24시간 후 첫 번째 리마인더
    const reminder1Delay = Math.max(0, created + 24 * 60 * 60 * 1000 - now);
    setTimeout(() => this.sendReminder(reviewId, 1), reminder1Delay);

    // 48시간 후 두 번째 리마인더
    const reminder2Delay = Math.max(0, created + 48 * 60 * 60 * 1000 - now);
    setTimeout(() => this.sendReminder(reviewId, 2), reminder2Delay);

    // 72시간 후 에스컬레이션
    const escalationDelay = Math.max(0, created + 72 * 60 * 60 * 1000 - now);
    setTimeout(() => this.escalateReview(reviewId), escalationDelay);

    // 7일 후 자동 승인 (설정 활성화 시)
    const autoApproveDelay = Math.max(0, created + 7 * 24 * 60 * 60 * 1000 - now);
    const timeout = setTimeout(() => this.autoApproveIfEnabled(reviewId), autoApproveDelay);

    this.timeouts.set(reviewId, timeout);

    console.log(`⏰ Review timeout timers registered for ${reviewId}`);
  }

  /**
   * 리마인더 전송
   */
  private async sendReminder(reviewId: string, attempt: number): Promise<void> {
    const review = await db.review.findUnique({
      where: { id: reviewId },
      include: { task: true },
    });

    if (!review || review.status !== 'pending') {
      return; // 이미 승인/거부됨
    }

    const urgency = attempt === 1 ? 'normal' : 'high';
    const message = attempt === 1
      ? `리뷰가 ${attempt * 24}시간 동안 대기 중입니다.`
      : `긴급: 리뷰가 ${attempt * 24}시간 동안 대기 중입니다!`;

    await this.notificationService.send({
      type: 'review_reminder',
      reviewId,
      taskId: review.taskId,
      phase: review.phase,
      urgency,
      message,
      recipients: [review.task.createdBy], // 태스크 생성자
    });

    // DB에 리마인더 기록
    await db.reviewReminder.create({
      data: {
        reviewId,
        attempt,
        sentAt: new Date(),
      },
    });

    console.log(`📧 Review reminder #${attempt} sent for ${reviewId}`);
  }

  /**
   * 에스컬레이션 (관리자에게 알림)
   */
  private async escalateReview(reviewId: string): Promise<void> {
    const review = await db.review.findUnique({
      where: { id: reviewId },
      include: { task: true },
    });

    if (!review || review.status !== 'pending') {
      return;
    }

    // 관리자에게 알림
    await this.notificationService.send({
      type: 'review_escalation',
      reviewId,
      taskId: review.taskId,
      phase: review.phase,
      urgency: 'critical',
      message: `리뷰가 72시간 동안 대기 중입니다. 에스컬레이션 필요.`,
      recipients: await this.getAdminUsers(),
    });

    // 대체 검토자 옵션 제공
    await db.review.update({
      where: { id: reviewId },
      data: {
        escalated: true,
        escalatedAt: new Date(),
      },
    });

    console.log(`🚨 Review escalated: ${reviewId}`);
  }

  /**
   * 자동 승인 (설정 활성화 시)
   */
  private async autoApproveIfEnabled(reviewId: string): Promise<void> {
    const settings = await db.settings.findFirst({
      where: { key: 'review_auto_approve_after_7_days' },
    });

    if (settings?.value !== 'true') {
      console.log(`⏭️  Auto-approve disabled for ${reviewId}`);
      return;
    }

    const review = await db.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.status !== 'pending') {
      return;
    }

    // 자동 승인 실행
    await db.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewId },
        data: {
          status: 'approved',
          approvedBy: 'system',
          approvedAt: new Date(),
          comment: '7일 타임아웃 후 자동 승인됨',
          autoApproved: true,
        },
      });

      // 다음 Phase 시작
      await this.startNextPhase(review.taskId, review.phase + 1);
    });

    // 사용자에게 알림
    await this.notificationService.send({
      type: 'review_auto_approved',
      reviewId,
      taskId: review.taskId,
      phase: review.phase,
      message: '리뷰가 7일 타임아웃으로 인해 자동 승인되었습니다.',
    });

    console.log(`✅ Review auto-approved after 7 days: ${reviewId}`);
  }

  /**
   * 리뷰 승인/거부 시 타임아웃 취소
   */
  cancelTimeout(reviewId: string): void {
    const timeout = this.timeouts.get(reviewId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(reviewId);
      console.log(`⏹️  Timeout cancelled for ${reviewId}`);
    }
  }
}
```

#### 2. API 엔드포인트

```typescript
// app/api/reviews/[id]/route.ts

/**
 * PATCH /api/reviews/:id/approve
 * 리뷰 승인 시 타임아웃 취소
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { action, comment } = await request.json();
  const reviewId = params.id;

  if (action === 'approve') {
    await reviewApprovalManager.approveReview(reviewId, userId, comment);

    // 타임아웃 타이머 취소
    reviewTimeoutManager.cancelTimeout(reviewId);

    return Response.json({ success: true });
  }

  if (action === 'reject') {
    await reviewApprovalManager.requestChanges(reviewId, userId, comment);

    // 타임아웃 타이머 취소
    reviewTimeoutManager.cancelTimeout(reviewId);

    return Response.json({ success: true });
  }
}
```

#### 3. 웹 UI 설정

```typescript
// app/settings/page.tsx

export default function SettingsPage() {
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);

  return (
    <div>
      <h2>리뷰 타임아웃 설정</h2>

      <label>
        <input
          type="checkbox"
          checked={autoApproveEnabled}
          onChange={(e) => {
            setAutoApproveEnabled(e.target.checked);
            updateSettings('review_auto_approve_after_7_days', e.target.checked);
          }}
        />
        7일 후 자동 승인 활성화
      </label>

      <p className="text-sm text-gray-600">
        활성화 시, 7일 동안 승인되지 않은 리뷰가 자동으로 승인됩니다.
        비활성화 시, 무한정 대기합니다.
      </p>
    </div>
  );
}
```

### 모니터링

```typescript
// 리뷰 타임아웃 통계 조회
export async function getReviewTimeoutStats() {
  const stats = await db.review.groupBy({
    by: ['status'],
    _count: true,
    where: {
      createdAt: {
        lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24시간 이상
      },
    },
  });

  return {
    pendingOver24h: stats.find(s => s.status === 'pending')?._count || 0,
    autoApproved: await db.review.count({
      where: { autoApproved: true },
    }),
  };
}
```

### 주의사항

**타임아웃 타이머 복구**:
- 서버 재시작 시 타이머가 사라지므로, 시작 시 pending 상태의 리뷰에 대해 타이머 재등록 필요

```typescript
// packages/agent-manager/src/index.ts

async function restoreReviewTimeouts() {
  const pendingReviews = await db.review.findMany({
    where: { status: 'pending' },
  });

  for (const review of pendingReviews) {
    reviewTimeoutManager.registerReviewTimeout(review.id, review.createdAt);
  }

  console.log(`✅ Restored ${pendingReviews.length} review timeout timers`);
}

// 서버 시작 시 실행
await restoreReviewTimeouts();
```

---

**최종 업데이트**: 2024-02-15
**버전**: 1.1
