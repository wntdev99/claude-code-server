# custom 워크플로우

## 개요

자유 형식 대화 및 일회성 작업을 수행하는 워크플로우입니다.

> **대상**: 서브 에이전트가 `custom` 타입 작업을 수행할 때 참조

> **특징**: Phase 구조 없이 프롬프트 기반으로 자율적으로 실행

## 워크플로우 특징

```
사용자 프롬프트
    ↓
자율 실행 (Phase 없음)
    ↓
결과 반환
```

### custom 타입과 다른 타입의 차이

| 특징 | create_app/modify_app/workflow | custom |
|------|--------------------------------|--------|
| **Phase 구조** | 있음 (4 Phase) | 없음 |
| **리뷰 게이트** | Phase마다 | 없음 |
| **산출물** | 정형화된 문서/코드 | 자유 형식 |
| **실행 방식** | 단계적 | 일회성 |
| **예시** | 앱 개발, 워크플로우 자동화 | 코드 분석, 버그 수정, 질문 답변 |

## 사용 사례

### 1. 코드 분석 및 리뷰

**요청 예시**:
```
이 프로젝트의 코드를 분석하고 개선점을 제안해주세요.
특히 성능과 보안 측면에서 검토해주세요.
```

**작업 흐름**:
1. 프로젝트 구조 파악
2. 주요 파일 읽기
3. 코드 패턴 분석
4. 개선점 작성
5. 결과 반환

**출력 예시**:
```markdown
# 코드 분석 결과

## 프로젝트 개요
- 타입: React + Express 웹 애플리케이션
- 파일 수: 127개
- 코드 라인: ~8,500 lines

## 발견된 문제점

### 1. 보안 이슈
- [ ] `src/api/user.ts:45` - SQL Injection 취약점
  ```typescript
  // 현재 코드 (위험)
  const query = `SELECT * FROM users WHERE id = ${userId}`;

  // 개선안
  const query = 'SELECT * FROM users WHERE id = ?';
  db.query(query, [userId]);
  ```

### 2. 성능 이슈
- [ ] `src/components/Dashboard.tsx:120` - 불필요한 리렌더링
  ```typescript
  // useMemo 사용 권장
  const filteredData = useMemo(() =>
    data.filter(item => item.active), [data]
  );
  ```

### 3. 코드 품질
- [ ] 타입 안정성 부족 (any 타입 남용)
- [ ] 에러 처리 부재
- [ ] 중복 코드 존재

## 우선순위 개선 항목
1. SQL Injection 취약점 수정 (보안 중요)
2. 타입 안정성 개선
3. 에러 처리 추가
```

### 2. 버그 수정

**요청 예시**:
```
로그인 기능이 동작하지 않습니다. 수정해주세요.
에러 메시지: "Cannot read property 'email' of undefined"
```

**작업 흐름**:
1. 로그인 관련 파일 찾기
2. 에러 원인 파악
3. 코드 수정
4. 테스트 코드 추가

**출력**:
```
버그를 찾아서 수정했습니다.

## 원인
`src/auth/login.ts:34`에서 user 객체가 null일 때 email에 접근하여 발생

## 수정 내용
```typescript
// Before
const email = user.email; // user가 null이면 에러

// After
if (!user) {
  throw new Error('User not found');
}
const email = user.email;
```

파일 수정: src/auth/login.ts
```

### 3. 문서 작성

**요청 예시**:
```
이 프로젝트의 README.md를 작성해주세요.
```

**작업**:
1. 프로젝트 파악
2. README 작성
3. 파일 생성

### 4. 데이터 변환

**요청 예시**:
```
CSV 파일을 JSON으로 변환하는 스크립트를 만들어주세요.
```

**작업**:
1. 스크립트 작성
2. 사용 예시 포함
3. 파일 생성

### 5. 질문 답변

**요청 예시**:
```
React에서 useEffect와 useLayoutEffect의 차이가 뭔가요?
```

**출력**:
```markdown
# useEffect vs useLayoutEffect

## 핵심 차이점

### useEffect
- **실행 시점**: 브라우저가 화면을 그린 **후**
- **비동기**: 화면 렌더링을 블록하지 않음
- **용도**: 대부분의 side effect (데이터 fetch, 이벤트 리스너 등)

### useLayoutEffect
- **실행 시점**: 브라우저가 화면을 그리기 **전**
- **동기**: 화면 렌더링을 블록함
- **용도**: DOM 측정, 깜빡임 방지가 필요한 경우

## 사용 예시

```tsx
// useEffect - 일반적인 경우
useEffect(() => {
  fetchData();
}, []);

// useLayoutEffect - DOM 측정이 필요한 경우
useLayoutEffect(() => {
  const height = ref.current.offsetHeight;
  setHeight(height);
}, []);
```

## 권장사항
99%의 경우 **useEffect**를 사용하세요.
깜빡임 문제가 있을 때만 useLayoutEffect 사용.
```

## 실행 방식

### 1. 프롬프트 분석

사용자 프롬프트를 분석하여 의도 파악:
- 작업 유형 (분석, 수정, 생성, 질문 등)
- 범위 (전체 프로젝트, 특정 파일, 개념)
- 우선순위

### 2. 자율 실행

Phase 구조 없이 자유롭게 작업:
- 필요한 파일 읽기
- 분석 수행
- 코드 작성/수정
- 문서 생성

### 3. 결과 반환

적절한 형식으로 결과 반환:
- Markdown 문서
- 수정된 코드
- 설명과 함께

## 의존성 요청

필요한 경우 의존성 요청 가능:

```
[DEPENDENCY_REQUEST]
type: file
name: config.json
description: Configuration file needed for analysis
required: false
[/DEPENDENCY_REQUEST]
```

## 사용자 질문

명확하지 않은 부분이 있으면 질문:

```
[USER_QUESTION]
category: clarification
question: Should I fix all linting errors or only critical bugs?
options:
  - Fix all issues
  - Critical bugs only
  - Suggest fixes without applying
[/USER_QUESTION]
```

## 제약사항

### 1. 시간 제한
- 너무 오래 걸리는 작업은 권장하지 않음
- 복잡한 작업은 create_app/modify_app 타입 사용 권장

### 2. 범위 제한
- 명확하게 정의된 작업에 적합
- 다단계 프로젝트는 부적합

### 3. 리뷰 없음
- 리뷰 게이트가 없으므로 즉시 결과 반환
- 중요한 작업은 다른 타입 사용 권장

## 완료 신호

```
=== CUSTOM TASK COMPLETE ===
Task: Code analysis and improvement suggestions
Status: Completed

Summary:
- Analyzed 127 files
- Found 8 critical issues
- Provided detailed improvement suggestions

Output:
- docs/code-analysis.md (detailed report)
```

## 모범 사례

### ✅ 좋은 사용 예시

```
1. "이 버그를 수정해주세요: [에러 메시지]"
2. "TypeScript 타입 정의를 개선해주세요"
3. "이 함수의 성능을 최적화해주세요"
4. "프로젝트 README를 작성해주세요"
5. "React hooks 사용법을 설명해주세요"
```

### ❌ 부적절한 사용 예시

```
1. "완전한 전자상거래 사이트를 만들어주세요"
   → create_app 타입 사용

2. "이 프로젝트를 React로 마이그레이션해주세요"
   → modify_app 타입 사용

3. "CI/CD 파이프라인을 구축해주세요"
   → workflow 타입 사용
```

## 자율성

custom 타입은 가장 자율적인 타입입니다:
- 자유로운 접근 방식
- 유연한 출력 형식
- 창의적인 문제 해결

하지만 다음을 준수:
- 사용자 의도 정확히 파악
- 명확한 결과 제공
- 필요시 설명 추가

## 관련 문서

- **Create App**: `create-app.md` (앱 개발 시)
- **Modify App**: `modify-app.md` (기존 앱 수정 시)
- **Workflow**: `workflow.md` (자동화 시)
- **Protocols**: `../protocols/*.md`
