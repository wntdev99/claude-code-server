# 아키텍처 문서

웹 서버의 구조와 아키텍처 패턴에 관한 문서 모음입니다.

## 📄 문서 목록

### `nextjs-structure.md`
**언제 읽나요?** 프로젝트 구조를 처음 이해할 때

**내용**:
- Next.js 14 App Router 디렉토리 구조
- 파일 기반 라우팅 규칙
- Server Component vs Client Component
- 폴더 구조 컨벤션

### `api-routes.md`
**언제 읽나요?** API 엔드포인트를 구현할 때

**내용**:
- API Routes 파일 구조
- RESTful 패턴
- Request/Response 처리
- 에러 핸들링
- 미들웨어 사용

### `state-management.md`
**언제 읽나요?** 클라이언트 상태 관리가 필요할 때

**내용**:
- Zustand 스토어 구조
- Task 상태 관리
- Agent 상태 관리
- Settings 상태 관리
- 상태 업데이트 패턴

### `ui-components.md`
**언제 읽나요?** UI 컴포넌트를 만들거나 수정할 때

**내용**:
- shadcn/ui 사용법
- 컴포넌트 구조 패턴
- Props 네이밍 컨벤션
- 스타일링 (Tailwind CSS)
- 재사용 가능한 컴포넌트 작성

## 🎯 사용 시나리오

### "새 API 엔드포인트 만들기"
```
1. api-routes.md - API 구조 이해
2. ../../api/[관련API].md - 구체적인 API 명세
3. ../../security/[관련보안].md - 보안 적용
```

### "새 페이지 추가하기"
```
1. nextjs-structure.md - 파일 위치 확인
2. ui-components.md - 사용할 컴포넌트 확인
3. state-management.md - 필요한 상태 관리
```

### "클라이언트 상태 추가하기"
```
1. state-management.md - 스토어 구조 패턴
2. ui-components.md - 상태 사용 방법
```

## 📊 문서 간 관계

```
nextjs-structure.md
    ├─→ api-routes.md (API 폴더 구조)
    └─→ ui-components.md (컴포넌트 폴더 구조)

state-management.md
    └─→ ui-components.md (상태 사용)

api-routes.md
    └─→ ../../security/ (보안 적용)
```

## 🔗 관련 문서

- **기능 구현**: `../features/` - 구체적인 기능 구현 방법
- **개발 환경**: `../development/` - 개발 도구 및 환경
- **API 설계**: `../api/` - API 상세 명세
