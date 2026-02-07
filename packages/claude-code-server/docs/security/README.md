# Security 문서

## 개요

웹 서버의 보안 관련 문서 목록입니다. 모든 보안 조치는 **필수**이며, 구현 시 반드시 준수해야 합니다.

## 보안 문서 목록

### 1. 경로 검증 (Path Validation)

**문서**: `path-validation.md`

**내용**:
- Path Traversal 공격 방지
- 파일 경로 검증
- 작업 디렉토리 검증
- 민감한 파일 접근 차단

**핵심 원칙**:
```typescript
// ✅ 항상 경로 검증
validatePath(userPath, baseDir)

// ❌ 절대 직접 사용 금지
fs.readFile(userPath) // 위험!
```

### 2. 암호화 (Encryption)

**문서**: `encryption.md`

**내용**:
- API 키 암호화
- 환경 변수 암호화
- 민감 정보 저장
- 복호화 및 사용

**핵심 원칙**:
```typescript
// ✅ API 키는 항상 암호화
const encrypted = encryptSecret(apiKey)

// ❌ 평문 저장 금지
db.save({ apiKey }) // 위험!
```

### 3. Rate Limiting

**문서**: `rate-limiting.md`

**내용**:
- API 엔드포인트 제한
- IP 기반 제한
- 사용자별 제한
- 동적 제한 조정

**핵심 원칙**:
```typescript
// ✅ 모든 API에 Rate Limiting 적용
export const config = {
  rateLimit: { tokensPerInterval: 10, interval: 'minute' }
}
```

### 4. 입력 검증 (Input Sanitization)

**문서**: `input-sanitization.md`

**내용**:
- 사용자 입력 검증
- Prompt Injection 방지
- XSS 방지
- SQL Injection 방지

**핵심 원칙**:
```typescript
// ✅ 모든 사용자 입력 검증
const safe = sanitizeInput(userInput)

// ❌ 직접 사용 금지
agent.stdin.write(userInput) // 위험!
```

## 보안 체크리스트

새로운 기능 구현 시 다음을 확인하세요:

### API 엔드포인트
- [ ] 경로 파라미터 검증 (`path-validation.md`)
- [ ] 요청 본문 검증 (`input-sanitization.md`)
- [ ] Rate Limiting 적용 (`rate-limiting.md`)
- [ ] 민감 정보 암호화 (`encryption.md`)
- [ ] 에러 메시지에 민감 정보 미포함

### 파일 작업
- [ ] 경로 검증 (`path-validation.md`)
- [ ] Symlink 차단
- [ ] 파일 타입 검증
- [ ] 크기 제한 (10MB)

### 에이전트 프로세스
- [ ] Working directory 검증
- [ ] 환경 변수 암호화
- [ ] 프롬프트 검증 (`input-sanitization.md`)
- [ ] 출력 파싱 시 안전 처리

### 데이터베이스
- [ ] API 키 암호화 저장
- [ ] 민감 로그 미저장
- [ ] SQL Injection 방지 (Prisma 사용)

## 보안 원칙

### 1. 최소 권한 (Least Privilege)
에이전트는 작업 디렉토리 내에서만 동작하며, 시스템 파일에 접근할 수 없습니다.

### 2. 다층 방어 (Defense in Depth)
- 입력 검증
- 경로 검증
- Rate Limiting
- 암호화
- 로깅 및 모니터링

### 3. 안전한 기본값 (Secure by Default)
모든 기능은 기본적으로 안전하게 구현되며, 명시적 허용만 가능합니다.

### 4. 실패 시 안전 (Fail Secure)
에러 발생 시 민감 정보를 노출하지 않고 안전하게 실패합니다.

## 보안 이슈 대응

### 발견 시
1. 즉시 로그 확인
2. 영향 범위 파악
3. 임시 조치 (해당 기능 비활성화)
4. 근본 원인 분석
5. 패치 적용
6. 사용자 알림 (필요 시)

### 보고
보안 이슈 발견 시 즉시 보고하세요:
- 이메일: security@example.com
- 슬랙: #security-alerts

## 참고 자료

### OWASP Top 10
- A01: Broken Access Control → `path-validation.md`
- A02: Cryptographic Failures → `encryption.md`
- A03: Injection → `input-sanitization.md`
- A04: Insecure Design → 모든 문서
- A05: Security Misconfiguration → `rate-limiting.md`

### 외부 링크
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)

## 다음 단계

1. 각 보안 문서 읽기
2. 체크리스트 확인
3. 구현 시 보안 조치 적용
4. 보안 테스트 실행

## 관련 문서

- **Path Validation**: `path-validation.md`
- **Encryption**: `encryption.md`
- **Rate Limiting**: `rate-limiting.md`
- **Input Sanitization**: `input-sanitization.md`
- **Process Management**: `../features/process-management.md`
- **API Routes**: `../api/*.md`
