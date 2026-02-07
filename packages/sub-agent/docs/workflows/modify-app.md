# modify_app 워크플로우

## 개요

기존 앱/웹 프로젝트를 수정, 개선, 버그 수정하는 워크플로우입니다.

> **대상**: 서브 에이전트가 `modify_app` 타입 작업을 수행할 때 참조

## 워크플로우 구조

```
Phase 1: Analysis (분석) - 현재 상태 파악
    ↓ 리뷰 게이트
Phase 2: Planning (계획) - 수정 계획 수립
    ↓ 리뷰 게이트
Phase 3: Implementation (구현) - 변경 사항 적용
    ↓ 리뷰 게이트
Phase 4: Testing (테스트) - 검증 및 테스트
    ↓
완료
```

## Phase 1: Analysis (분석)

### 목표
기존 프로젝트의 현재 상태를 파악하고 수정이 필요한 부분을 식별합니다.

### Steps (3단계)

#### Step 1: 코드베이스 분석

**산출물**: `docs/analysis/codebase.md`

**내용**:
- 프로젝트 구조 파악
- 주요 파일 및 디렉토리 목록
- 사용 기술 스택
- 아키텍처 패턴
- 코드 품질 평가

**작업 순서**:
```
1. 프로젝트 루트 탐색
2. package.json, requirements.txt 등 의존성 파일 확인
3. 주요 소스 파일 읽기
4. 아키텍처 파악
5. 문서 작성
```

**예시 구조**:
```markdown
# 코드베이스 분석

## 프로젝트 개요
- **이름**: MyApp
- **타입**: React + Node.js 웹 애플리케이션
- **버전**: 1.2.0

## 디렉토리 구조
```
project/
├── src/
│   ├── components/
│   ├── pages/
│   └── utils/
├── server/
│   ├── routes/
│   └── models/
└── tests/
```

## 기술 스택
- Frontend: React 18, TypeScript, Tailwind CSS
- Backend: Node.js, Express, PostgreSQL
- Testing: Jest, React Testing Library

## 아키텍처 패턴
- MVC 패턴 사용
- RESTful API
- 컴포넌트 기반 UI

## 코드 품질
- TypeScript 사용 ✅
- 테스트 커버리지: 65%
- ESLint 설정 있음
- 문서화 부족 ⚠️
```

#### Step 2: 요구사항 분석

**산출물**: `docs/analysis/requirements.md`

**내용**:
- 사용자 요청사항 정리
- 현재 문제점 식별
- 개선이 필요한 부분
- 제약사항 파악

**예시**:
```markdown
# 요구사항 분석

## 사용자 요청
> "로그인 기능에 OAuth 추가하고, 대시보드 UI 개선"

## 상세 요구사항

### 1. OAuth 인증 추가
- **현재 상태**: 이메일/비밀번호 로그인만 지원
- **요구사항**: Google, GitHub OAuth 추가
- **영향 범위**:
  - 인증 로직 수정
  - 데이터베이스 스키마 확장
  - UI 변경

### 2. 대시보드 UI 개선
- **현재 상태**: 정보 밀도 높음, 가독성 낮음
- **요구사항**:
  - 카드 레이아웃으로 변경
  - 차트 추가
  - 반응형 디자인 개선

## 제약사항
- 기존 사용자 데이터 유지
- API 호환성 보장
- 배포 다운타임 최소화
```

#### Step 3: 영향 분석

**산출물**: `docs/analysis/impact.md`

**내용**:
- 변경 영향 범위
- 영향 받는 파일/모듈 목록
- 리스크 평가
- 마이그레이션 필요사항

## Phase 2: Planning (계획)

### 목표
구체적인 수정 계획을 수립합니다.

### Steps (4단계)

#### Step 1: 변경 사항 정의

**산출물**: `docs/planning/changes.md`

**내용**:
- 파일별 변경 사항
- 새로 추가할 파일
- 삭제할 파일
- 수정할 코드 영역

#### Step 2: 기술 설계

**산출물**: `docs/planning/technical-design.md`

**내용**:
- 새로운 컴포넌트/모듈 설계
- API 변경 사항
- 데이터베이스 마이그레이션
- 의존성 업데이트

#### Step 3: 테스트 전략

**산출물**: `docs/planning/test-strategy.md`

**내용**:
- 단위 테스트 계획
- 통합 테스트 계획
- 회귀 테스트 항목
- 수동 테스트 체크리스트

#### Step 4: 배포 계획

**산출물**: `docs/planning/deployment.md`

**내용**:
- 배포 순서
- 롤백 계획
- 데이터 마이그레이션 스크립트
- 모니터링 포인트

## Phase 3: Implementation (구현)

### 목표
계획한 변경 사항을 실제로 코드에 적용합니다.

### Steps (6단계)

#### Step 1: 환경 준비

**작업**:
- 기존 프로젝트 의존성 설치
- 필요한 새 패키지 추가
- 개발 환경 설정

```bash
npm install
npm install passport passport-google-oauth20 passport-github2
```

#### Step 2: 데이터베이스 변경

**작업**:
- 스키마 수정
- 마이그레이션 스크립트 작성 및 실행

```sql
-- Add OAuth fields to users table
ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255);
ALTER TABLE users ADD COLUMN avatar_url TEXT;
```

#### Step 3: 백엔드 로직 수정

**작업**:
- 인증 로직 추가/수정
- API 엔드포인트 추가/수정
- 비즈니스 로직 개선

**예시**:
```typescript
// server/routes/auth.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  // 사용자 찾기 또는 생성
  const user = await findOrCreateUser({
    oauthProvider: 'google',
    oauthId: profile.id,
    email: profile.emails[0].value,
    name: profile.displayName,
    avatarUrl: profile.photos[0].value,
  });
  return done(null, user);
}));
```

#### Step 4: 프론트엔드 수정

**작업**:
- UI 컴포넌트 수정/추가
- 스타일 개선
- 상태 관리 로직 업데이트

**예시**:
```tsx
// src/components/LoginButton.tsx
export function LoginButton() {
  return (
    <div className="space-y-2">
      <button onClick={() => window.location.href = '/auth/email'}>
        Email Login
      </button>
      <button onClick={() => window.location.href = '/auth/google'}>
        <GoogleIcon /> Continue with Google
      </button>
      <button onClick={() => window.location.href = '/auth/github'}>
        <GitHubIcon /> Continue with GitHub
      </button>
    </div>
  );
}
```

#### Step 5: 테스트 작성

**작업**:
- 새 기능에 대한 단위 테스트
- 통합 테스트
- 기존 테스트 업데이트

#### Step 6: 문서 업데이트

**작업**:
- README 업데이트
- API 문서 업데이트
- 변경 사항 기록 (CHANGELOG)

## Phase 4: Testing (테스트)

### 목표
모든 변경 사항이 올바르게 동작하는지 검증합니다.

### Steps (4단계)

#### Step 1: 단위 테스트 실행

```bash
npm test
```

#### Step 2: 통합 테스트

전체 flow 테스트:
- OAuth 로그인 flow
- 기존 이메일 로그인 (호환성)
- 대시보드 렌더링

#### Step 3: 회귀 테스트

기존 기능이 여전히 작동하는지 확인

#### Step 4: 수동 테스트

- 브라우저에서 직접 테스트
- 다양한 환경에서 테스트 (모바일, 태블릿)
- Edge case 테스트

## 완료 신호

모든 Phase가 완료되면 다음과 같이 출력:

```
=== PHASE 4 COMPLETE ===
Completed: modify_app workflow
Changes applied:
- OAuth authentication added (Google, GitHub)
- Dashboard UI redesigned with card layout
- Tests updated and passing
- Documentation updated

Modified files:
- server/routes/auth.ts (new)
- src/components/LoginButton.tsx (modified)
- src/pages/Dashboard.tsx (modified)
- database/migrations/001_add_oauth.sql (new)
- README.md (updated)

All tests passing ✅
Ready for deployment
```

## 주의사항

### 기존 코드 존중
- 기존 코드 스타일 유지
- 불필요한 리팩토링 자제
- Breaking change 최소화

### 호환성 유지
- API 호환성 보장
- 데이터베이스 마이그레이션 안전하게
- 점진적 롤아웃

### 테스트 중요성
- 변경 사항에 대한 테스트 필수
- 회귀 테스트로 기존 기능 검증

## 의존성 요청 예시

```
[DEPENDENCY_REQUEST]
type: env_variable
name: GOOGLE_CLIENT_ID
description: Google OAuth Client ID
required: true
[/DEPENDENCY_REQUEST]

[DEPENDENCY_REQUEST]
type: env_variable
name: GOOGLE_CLIENT_SECRET
description: Google OAuth Client Secret
required: true
[/DEPENDENCY_REQUEST]
```

## 사용자 질문 예시

```
[USER_QUESTION]
category: choice
question: Should we deprecate the old email login or keep it alongside OAuth?
options:
  - Keep both (recommended for user choice)
  - Deprecate email login (OAuth only)
  - Make OAuth primary, email as fallback
[/USER_QUESTION]
```

## 관련 문서

- **Create App Workflow**: `create-app.md`
- **Workflow Automation**: `workflow.md`
- **Custom Tasks**: `custom.md`
- **Deliverables**: `../deliverables/code.md`
- **Verification**: `../verification/phase3-development.md`
