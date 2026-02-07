# 암호화 (Encryption)

## 개요

API 키, 환경 변수 등 민감 정보를 안전하게 저장하고 사용하는 방법을 설명합니다.

> **중요**: 모든 민감 정보는 **반드시 암호화**하여 저장해야 합니다.

## 왜 암호화가 필요한가?

### 보호해야 할 정보

```
✅ 암호화 필수
  - 외부 서비스 API 키 (OPENAI_API_KEY, GITHUB_TOKEN 등)
  - 데이터베이스 URL
  - JWT Secret
  - OAuth Client Secret
  - 사용자 제공 환경 변수

❌ 암호화 불필요
  - 공개 설정값
  - Task 제목/설명
  - 로그 (단, 민감 정보 제외)

📝 참고
  - Claude Code CLI는 자체 인증 사용 (별도 API key 저장 불필요)
```

### 위험성

```
평문 저장 시:
1. 데이터베이스 침해 → 모든 API 키 노출
2. 로그 파일 노출 → 키 유출
3. 백업 파일 유출 → 키 노출
4. 내부자 접근 → 무단 사용
```

## 암호화 방식

### 사용 알고리즘

```typescript
// lib/utils/encryption.ts
import crypto from 'crypto';

// AES-256-GCM (Galois/Counter Mode)
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const TAG_LENGTH = 16; // 128 bits
```

**선택 이유**:
- AES-256: 강력한 대칭키 암호화
- GCM 모드: 인증 및 암호화 동시 제공
- 표준: NIST 승인 알고리즘

## 암호화 키 관리

### 마스터 키 생성

```typescript
// lib/utils/encryption.ts

// 환경 변수에서 마스터 키 로드
const MASTER_KEY = process.env.ENCRYPTION_KEY;

if (!MASTER_KEY || MASTER_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
}

// Hex string을 Buffer로 변환
const masterKeyBuffer = Buffer.from(MASTER_KEY, 'hex');
```

### 마스터 키 생성 방법

```bash
# 안전한 랜덤 키 생성 (32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# .env 파일에 추가
echo "ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
```

**중요**:
- 마스터 키는 `.env` 파일에 저장
- `.env` 파일은 **절대** git에 커밋하지 않음
- 프로덕션에서는 AWS Secrets Manager, HashiCorp Vault 등 사용

## 암호화 구현

### 암호화 함수

```typescript
// lib/utils/encryption.ts

export interface EncryptedData {
  encrypted: string;  // Base64 encoded
  iv: string;         // Base64 encoded
  tag: string;        // Base64 encoded
}

export function encryptSecret(plaintext: string): EncryptedData {
  try {
    // 1. 랜덤 IV (Initialization Vector) 생성
    const iv = crypto.randomBytes(IV_LENGTH);

    // 2. Cipher 생성
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      masterKeyBuffer,
      iv
    );

    // 3. 암호화
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // 4. 인증 태그 가져오기 (GCM 모드)
    const tag = cipher.getAuthTag();

    // 5. 결과 반환
    return {
      encrypted,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt secret');
  }
}
```

### 복호화 함수

```typescript
// lib/utils/encryption.ts

export function decryptSecret(data: EncryptedData): string {
  try {
    // 1. Base64 디코딩
    const iv = Buffer.from(data.iv, 'base64');
    const tag = Buffer.from(data.tag, 'base64');
    const encrypted = data.encrypted;

    // 2. Decipher 생성
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      masterKeyBuffer,
      iv
    );

    // 3. 인증 태그 설정 (GCM 모드)
    decipher.setAuthTag(tag);

    // 4. 복호화
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt secret');
  }
}
```

## 데이터베이스 저장

### Prisma Schema

```prisma
// prisma/schema.prisma

model Dependency {
  id          String   @id @default(cuid())
  taskId      String
  type        String   // api_key, env_variable, etc.
  name        String
  description String?

  // 암호화된 값 (JSON)
  encryptedValue String  @db.Text

  provided    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  task        Task     @relation(fields: [taskId], references: [id])
}
```

### 저장 함수

```typescript
// lib/database/dependencies.ts
import { encryptSecret } from '@/lib/utils/encryption';

export async function storeDependencyValue(
  dependencyId: string,
  value: string
): Promise<void> {
  // 1. 암호화
  const encrypted = encryptSecret(value);

  // 2. JSON 직렬화
  const encryptedJson = JSON.stringify(encrypted);

  // 3. 데이터베이스 저장
  await db.dependency.update({
    where: { id: dependencyId },
    data: {
      encryptedValue: encryptedJson,
      provided: true,
      updatedAt: new Date(),
    },
  });
}
```

### 로드 함수

```typescript
// lib/database/dependencies.ts
import { decryptSecret } from '@/lib/utils/encryption';

export async function loadDependencyValue(
  dependencyId: string
): Promise<string | null> {
  // 1. 데이터베이스 조회
  const dependency = await db.dependency.findUnique({
    where: { id: dependencyId },
  });

  if (!dependency || !dependency.provided) {
    return null;
  }

  try {
    // 2. JSON 파싱
    const encrypted = JSON.parse(dependency.encryptedValue);

    // 3. 복호화
    const decrypted = decryptSecret(encrypted);

    return decrypted;
  } catch (error) {
    console.error(`Failed to decrypt dependency ${dependencyId}:`, error);
    return null;
  }
}
```

## API 적용

### Dependency Provision API

```typescript
// app/api/dependencies/[id]/provide/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { storeDependencyValue } from '@/lib/database/dependencies';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const dependencyId = params.id;

  // 1. Request body 파싱
  const body = await request.json();
  const { value } = body;

  if (!value) {
    return NextResponse.json(
      { error: 'Missing value' },
      { status: 400 }
    );
  }

  try {
    // 2. 암호화 및 저장
    await storeDependencyValue(dependencyId, value);

    // 3. 에이전트에 알림
    await notifyAgentManager({
      type: 'dependency_provided',
      dependencyId,
    });

    return NextResponse.json({
      success: true,
      message: 'Dependency value stored securely',
    });
  } catch (error) {
    console.error('Failed to store dependency:', error);
    return NextResponse.json(
      { error: 'Failed to store dependency value' },
      { status: 500 }
    );
  }
}
```

## 에이전트 프로세스에 환경 변수 주입

### 복호화 및 주입

```typescript
// lib/agent/environment.ts
import { loadDependencyValue } from '@/lib/database/dependencies';

export async function buildAgentEnvironment(
  taskId: string
): Promise<Record<string, string>> {
  // 1. Task의 모든 의존성 조회
  const dependencies = await db.dependency.findMany({
    where: {
      taskId,
      provided: true,
    },
  });

  const env: Record<string, string> = {};

  // 2. 각 의존성 복호화 및 환경 변수로 설정
  for (const dep of dependencies) {
    try {
      const value = await loadDependencyValue(dep.id);

      if (value) {
        env[dep.name] = value;
      }
    } catch (error) {
      console.error(`Failed to load dependency ${dep.name}:`, error);
    }
  }

  return env;
}
```

### 프로세스 생성 시 사용

```typescript
// lib/agent/executor.ts
import { spawn } from 'child_process';
import { buildAgentEnvironment } from './environment';

export async function createAgent(taskId: string): Promise<ChildProcess> {
  // 1. 환경 변수 빌드 (복호화)
  const agentEnv = await buildAgentEnvironment(taskId);

  // 2. 시스템 환경 변수와 병합
  const env = {
    ...process.env,
    ...agentEnv,
  };

  // 3. 프로세스 생성
  const agent = spawn('claude', ['--yes'], {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  return agent;
}
```

## 보안 고려사항

### 1. 메모리 관리

```typescript
// 복호화된 값은 사용 후 즉시 삭제
export function secureDelete(obj: any, key: string) {
  if (obj[key]) {
    // 메모리 덮어쓰기
    obj[key] = '\0'.repeat(obj[key].length);
    delete obj[key];
  }
}

// 사용 예시
const apiKey = await loadDependencyValue(depId);
// ... 사용 ...
secureDelete(process.env, 'OPENAI_API_KEY');
```

### 2. 로그에서 제외

```typescript
// lib/utils/logger.ts

const SENSITIVE_KEYS = [
  'OPENAI_API_KEY',
  'CLAUDE_API_KEY',
  'DATABASE_URL',
  'JWT_SECRET',
  'encryption',
  'encrypted',
  'password',
  'token',
  'secret',
];

export function sanitizeLog(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();

    // 민감한 키 마스킹
    if (SENSITIVE_KEYS.some(k => lowerKey.includes(k))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLog(sanitized[key]);
    }
  }

  return sanitized;
}

// 사용
console.log('Environment:', sanitizeLog(process.env));
```

### 3. 키 교체 (Key Rotation)

```typescript
// lib/utils/encryption.ts

export function reencryptWithNewKey(
  data: EncryptedData,
  oldKey: Buffer,
  newKey: Buffer
): EncryptedData {
  // 1. 기존 키로 복호화
  const plaintext = decryptSecretWithKey(data, oldKey);

  // 2. 새 키로 암호화
  return encryptSecretWithKey(plaintext, newKey);
}

// 마이그레이션 스크립트
async function rotateAllKeys() {
  const oldKey = Buffer.from(process.env.OLD_ENCRYPTION_KEY!, 'hex');
  const newKey = Buffer.from(process.env.NEW_ENCRYPTION_KEY!, 'hex');

  const dependencies = await db.dependency.findMany({
    where: { provided: true },
  });

  for (const dep of dependencies) {
    const encrypted = JSON.parse(dep.encryptedValue);
    const reencrypted = reencryptWithNewKey(encrypted, oldKey, newKey);

    await db.dependency.update({
      where: { id: dep.id },
      data: { encryptedValue: JSON.stringify(reencrypted) },
    });
  }
}
```

## 테스트

### 단위 테스트

```typescript
// __tests__/lib/utils/encryption.test.ts
import { encryptSecret, decryptSecret } from '@/lib/utils/encryption';

describe('Encryption', () => {
  it('should encrypt and decrypt correctly', () => {
    const plaintext = 'sk-test-1234567890abcdef';

    const encrypted = encryptSecret(plaintext);
    expect(encrypted.encrypted).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should fail with tampered data', () => {
    const plaintext = 'sk-test-1234567890abcdef';
    const encrypted = encryptSecret(plaintext);

    // 암호문 변조
    encrypted.encrypted = encrypted.encrypted.replace('A', 'B');

    expect(() => decryptSecret(encrypted)).toThrow();
  });

  it('should produce different ciphertext for same plaintext', () => {
    const plaintext = 'sk-test-1234567890abcdef';

    const enc1 = encryptSecret(plaintext);
    const enc2 = encryptSecret(plaintext);

    // IV가 다르므로 암호문도 다름
    expect(enc1.encrypted).not.toBe(enc2.encrypted);
    expect(enc1.iv).not.toBe(enc2.iv);

    // 하지만 복호화 결과는 같음
    expect(decryptSecret(enc1)).toBe(plaintext);
    expect(decryptSecret(enc2)).toBe(plaintext);
  });
});
```

### Integration Test

```typescript
// __tests__/lib/database/dependencies.test.ts
import { storeDependencyValue, loadDependencyValue } from '@/lib/database/dependencies';

describe('Dependency Encryption', () => {
  it('should store and load encrypted values', async () => {
    const depId = 'dep_test_123';
    const apiKey = 'sk-test-1234567890abcdef';

    // 저장
    await storeDependencyValue(depId, apiKey);

    // DB에서 직접 조회
    const dep = await db.dependency.findUnique({
      where: { id: depId },
    });

    // 평문이 아님을 확인
    expect(dep!.encryptedValue).not.toContain(apiKey);

    // 로드
    const loaded = await loadDependencyValue(depId);
    expect(loaded).toBe(apiKey);
  });
});
```

## 모니터링

### 복호화 실패 로깅

```typescript
// lib/utils/encryption.ts

export function decryptSecret(data: EncryptedData): string {
  try {
    // ... 복호화 로직 ...
  } catch (error) {
    // 복호화 실패 로깅
    console.error('[SECURITY] Decryption failed', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    // 데이터베이스에 로그
    db.securityLog.create({
      data: {
        type: 'decryption_failure',
        severity: 'high',
        details: { error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date(),
      },
    });

    throw new Error('Failed to decrypt secret');
  }
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../features/process-management.md`** - 환경 변수 주입
2. **`../api/dependencies-api.md`** - Dependency API 명세
3. **`../../agent-manager/docs/protocols/dependency.md`** - 의존성 처리
4. **`../../CLAUDE.md`** - 보안 개요

### 이 문서를 참조하는 문서

1. **`README.md`** - Security 문서 목록
2. **`../features/process-management.md`** - 프로세스 생성
3. **`../../agent-manager/docs/protocols/dependency.md`** - 의존성 요청

## 다음 단계

- **Rate Limiting**: `rate-limiting.md` - API 요청 제한
- **Input Sanitization**: `input-sanitization.md` - 입력 검증
- **Path Validation**: `path-validation.md` - 경로 검증

## 관련 문서

- **Path Validation**: `path-validation.md`
- **Rate Limiting**: `rate-limiting.md`
- **Input Sanitization**: `input-sanitization.md`
- **Process Management**: `../features/process-management.md`
- **Dependencies API**: `../api/dependencies-api.md`
