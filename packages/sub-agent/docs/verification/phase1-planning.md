# Phase 1 검증 기준 (Planning)

## 개요

Phase 1 (기획) 완료 전 확인해야 할 품질 기준과 검증 방법을 설명합니다.

> **중요**: Phase 완료 신호를 보내기 전 **반드시** 이 기준을 모두 만족해야 합니다.

## 필수 산출물

### 9개 문서 모두 존재

```
✅ 필수:
docs/planning/01_idea.md
docs/planning/02_market.md
docs/planning/03_persona.md
docs/planning/04_user_journey.md
docs/planning/05_business_model.md
docs/planning/06_product.md
docs/planning/07_features.md
docs/planning/08_tech.md
docs/planning/09_roadmap.md

❌ 8개 이하는 불합격
```

## 문서별 검증 기준

### 01_idea.md - 아이디어 정의

#### 필수 요구사항

```
□ 최소 길이: 500자 이상
□ 필수 섹션:
  - 문제 정의
  - 솔루션 개요
  - 핵심 가치 제안
  - 타겟 사용자
  - 차별화 요소
□ 모든 섹션 완성 (플레이스홀더 없음)
```

#### 품질 기준

**상 (Excellent)** - 1000자 이상:
- 구체적인 문제 상황 (실제 사례)
- 상세한 솔루션 설명
- 정량적 가치 제안 (예: "시간 80% 절감")
- 명확한 타겟 세그먼트 (인구통계 포함)
- 경쟁사 대비 차별화 요소 3개 이상

**중 (Good)** - 500-1000자:
- 문제와 솔루션 설명
- 가치 제안 포함
- 타겟 사용자 정의
- 차별화 요소 명시

**하 (Poor)** - 500자 미만 또는 플레이스홀더:
- 일반적인 설명만
- 플레이스홀더 포함 (`[TODO]`, `[Insert X]`)
- 섹션 누락
- **재작성 필요**

### 02_market.md - 시장 분석

#### 필수 요구사항

```
□ 최소 길이: 500자 이상
□ 필수 섹션:
  - 시장 크기 및 트렌드
  - 경쟁사 분석
  - 타겟 시장
  - 기회 요인
□ 경쟁사 최소 3개 분석
□ 구체적인 수치 포함 (시장 규모, 성장률)
```

#### 품질 기준

**상 (Excellent)**:
- TAM, SAM, SOM 구체적 수치
- 성장률 데이터 (출처 명시)
- 경쟁사 5개 이상 상세 분석
- SWOT 분석 포함

**중 (Good)**:
- 시장 규모 추정치
- 경쟁사 3-5개 분석
- 기본 트렌드 언급

**하 (Poor)**:
- 모호한 설명 ("큰 시장", "빠른 성장")
- 경쟁사 분석 없음 또는 2개 이하
- 수치 없음

### 03_persona.md - 페르소나 정의

#### 필수 요구사항

```
□ 최소 길이: 500자 이상
□ 페르소나 2-3개
□ 각 페르소나마다:
  - 인구통계 (나이, 직업, 소득, 거주지)
  - 목표
  - 고충 (Pain Points)
  - 사용 패턴
  - 선호 기능
```

#### 품질 기준

**상 (Excellent)**:
- 3개 페르소나
- 각 페르소나 300자 이상
- 가상의 이름, 직업, 구체적 스토리
- 실제 인터뷰 기반 (또는 리얼한 시나리오)

**중 (Good)**:
- 2개 페르소나
- 기본 정보 포함
- 목표와 고충 명시

**하 (Poor)**:
- 1개 페르소나만
- 일반적인 설명 ("사용자는 편리함을 원한다")
- 구체성 부족

### 04_user_journey.md - 사용자 여정

#### 필수 요구사항

```
□ 최소 길이: 500자 이상
□ 핵심 여정 2-3개
□ 각 여정마다:
  - 5단계 이상
  - 터치포인트 명시
  - 감정 곡선 (긍정/부정/중립)
  - 개선 기회
```

#### 품질 기준

**상 (Excellent)**:
- 3개 여정, 각 7단계 이상
- 시각화 (텍스트 또는 ASCII art)
- 감정 변화 상세 설명
- 구체적인 개선 방안

**중 (Good)**:
- 2개 여정, 각 5단계
- 터치포인트 및 감정 명시
- 개선 기회 언급

**하 (Poor)**:
- 1개 여정만
- 단계가 3개 이하
- 감정 또는 개선 기회 누락

### 05_business_model.md - 비즈니스 모델

#### 필수 요구사항

```
□ 최소 길이: 500자 이상
□ 필수 섹션:
  - 수익 모델
  - 가격 전략 (구체적 금액)
  - 비용 구조
  - 핵심 지표 (KPI) 5개 이상
□ 구체적인 가격 명시
```

#### 품질 기준

**상 (Excellent)**:
- 수익 모델 상세 설명
- 가격대 및 플랜 (Free, Pro, Enterprise 등)
- 비용 구조 상세 (인프라, 인건비, 마케팅)
- KPI 10개 이상 (정량적 목표 포함)

**중 (Good)**:
- 수익 모델 및 가격
- 주요 비용 항목
- KPI 5개 이상

**하 (Poor)**:
- 모호한 가격 ("저렴한 가격")
- KPI 5개 미만
- 비용 구조 누락

### 06_product.md - 제품 정의

#### 필수 요구사항

```
□ 최소 길이: 500자 이상
□ 필수 섹션:
  - 제품 범위 (MVP)
  - 핵심 기능 5-10개
  - 제외 사항 (명확히)
  - 성공 지표
□ MVP와 향후 기능 구분
```

#### 품질 기준

**상 (Excellent)**:
- MVP 범위 명확
- 핵심 기능 10개 이상
- 제외 사항 구체적 (이유 포함)
- 성공 지표 정량적

**중 (Good)**:
- MVP 범위 정의
- 핵심 기능 5-10개
- 제외 사항 명시

**하 (Poor)**:
- MVP 불명확
- 핵심 기능 5개 미만
- 제외 사항 없음 ("모든 것 포함")

### 07_features.md - 기능 명세

#### 필수 요구사항

```
□ 최소 길이: 500자 이상
□ Must Have 기능 5개 이상
□ 각 기능마다:
  - 사용자 스토리
  - 수용 기준
  - 우선순위
□ Should Have, Nice to Have 구분
```

#### 품질 기준

**상 (Excellent)**:
- Must Have 10개 이상
- 각 기능마다 상세한 사용자 스토리
- 수용 기준 구체적 (측정 가능)
- Should Have 5개 이상
- Nice to Have 5개 이상

**중 (Good)**:
- Must Have 5-10개
- 사용자 스토리 포함
- 우선순위 구분

**하 (Poor)**:
- Must Have 5개 미만
- 사용자 스토리 누락
- 우선순위 불명확

### 08_tech.md - 기술 검토

#### 필수 요구사항

```
□ 최소 길이: 500자 이상
□ 필수 섹션:
  - 프론트엔드 기술 스택
  - 백엔드 기술 스택
  - 데이터베이스 선택
  - 인프라 계획
  - 기술적 제약사항
□ 각 선택 이유 명시
```

#### 품질 기준

**상 (Excellent)**:
- 모든 레이어 기술 스택 상세
- 선택 이유 구체적 (장단점 비교)
- 대안 기술 검토 및 비교
- 마이그레이션 계획 포함

**중 (Good)**:
- 주요 기술 스택 명시
- 선택 이유 포함
- 기술적 제약사항 언급

**하 (Poor)**:
- 기술 스택만 나열
- 이유 없음
- 제약사항 누락

### 09_roadmap.md - 로드맵

#### 필수 요구사항

```
□ 최소 길이: 500자 이상
□ Phase 3개 이상
□ 각 Phase마다:
  - 주요 기능
  - 마일스톤
  - 상대적 타임라인 (1-2개월, 3-4개월 등)
  - 목표
□ 위험 요소 및 대응 방안
```

#### 품질 기준

**상 (Excellent)**:
- Phase 5개 이상
- 각 Phase별 구체적 마일스톤 (측정 가능)
- 상세한 타임라인
- 위험 요소 5개 이상 (대응 방안 포함)

**중 (Good)**:
- Phase 3개 이상
- 마일스톤 및 타임라인
- 위험 요소 언급

**하 (Poor)**:
- Phase 3개 미만
- 마일스톤 불명확
- 위험 요소 없음

## 전체 검증 체크리스트

### 필수 항목

```
□ 9개 문서 모두 존재
□ 각 문서 500자 이상
□ 플레이스홀더 없음 ([TODO], [Insert X] 등)
□ 모든 필수 섹션 작성 완료
□ Markdown 형식 올바름
```

### 일관성 검증

```
□ 01_idea.md의 타겟 사용자 = 03_persona.md의 페르소나
□ 01_idea.md의 핵심 기능 = 07_features.md의 Must Have
□ 05_business_model.md의 가격 = 06_product.md의 플랜과 일치
□ 07_features.md의 기능 = 08_tech.md의 기술 스택과 호환
□ 09_roadmap.md의 Phase 1 = 06_product.md의 MVP
```

### 품질 검증

```
□ 구체적인 내용 (일반론 금지)
□ 정량적 데이터 포함 (시장 규모, 가격, KPI 등)
□ 예시 포함 (페르소나, 사용자 스토리 등)
□ 맞춤법 정확
□ 논리적 일관성
```

## 자동 검증 스크립트

### 기본 검증

```bash
#!/bin/bash

# Phase 1 검증 스크립트

DOCS_DIR="docs/planning"
MIN_LENGTH=500

# 1. 문서 존재 확인
echo "=== 문서 존재 확인 ==="
for i in {01..09}; do
  FILE="${DOCS_DIR}/${i}_*.md"
  if ls $FILE 1> /dev/null 2>&1; then
    echo "✅ $FILE exists"
  else
    echo "❌ $FILE missing"
    exit 1
  fi
done

# 2. 최소 길이 확인
echo ""
echo "=== 최소 길이 확인 (${MIN_LENGTH}자) ==="
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
echo ""
echo "=== 플레이스홀더 확인 ==="
PLACEHOLDERS="TODO|Insert|Fill|Add details|TBD|Coming soon"
for FILE in ${DOCS_DIR}/*.md; do
  if grep -qiE "\[$PLACEHOLDERS\]|$PLACEHOLDERS" "$FILE"; then
    echo "❌ $FILE: 플레이스홀더 발견"
    grep -niE "\[$PLACEHOLDERS\]|$PLACEHOLDERS" "$FILE"
    exit 1
  else
    echo "✅ $FILE: 플레이스홀더 없음"
  fi
done

echo ""
echo "✅ Phase 1 검증 통과!"
```

## 검증 실패 시 조치

### 문서 부족

```
문제: 9개 중 8개만 작성
조치: 누락된 문서 작성 후 재검증
```

### 길이 부족

```
문제: 02_market.md가 350자
조치: 구체적인 내용 추가 (경쟁사 분석, 시장 데이터 등)
```

### 플레이스홀더 발견

```
문제: 05_business_model.md에 [TODO: Add pricing] 발견
조치: 실제 가격 정보로 교체
```

### 일관성 오류

```
문제: 01_idea.md의 타겟(직장인) ≠ 03_persona.md의 페르소나(학생)
조치: 페르소나를 직장인으로 수정 또는 타겟 확장
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../deliverables/documents.md`** - 문서 작성 규칙 (검증 기준 반영)
2. **`../workflows/create-app.md`** - Phase 1 완료 조건
3. **`../protocols/phase-completion.md`** - 완료 신호 전 체크리스트
4. **`../../CLAUDE.md`** - 검증 기준 개요
5. **`/guide/planning/*.md`** - 각 가이드의 요구사항

### 이 문서를 참조하는 문서

1. **`../README.md`** - Verification 문서 목록
2. **`../../CLAUDE.md`** - 서브 에이전트 개요
3. **`../workflows/create-app.md`** - create_app 워크플로우
4. **`../protocols/phase-completion.md`** - Phase 완료 프로토콜

## 다음 단계

- **Phase 2 검증**: `phase2-design.md` - Design Phase 검증 기준
- **Phase 3 검증**: `phase3-development.md` - Development Phase 검증 기준
- **문서 작성 규칙**: `../deliverables/documents.md` - 상세 작성 규칙

## 관련 문서

- **Deliverables - Documents**: `../deliverables/documents.md`
- **Workflows - Create App**: `../workflows/create-app.md`
- **Protocols - Phase Completion**: `../protocols/phase-completion.md`
- **Guides - Planning**: `/guide/planning/*.md`
