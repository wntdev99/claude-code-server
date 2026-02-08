# ⚠️ DEPRECATED: Dependency System (의존성 시스템)

> **🚫 WARNING: This feature is DEPRECATED and should NOT be used for new implementations.**
>
> **⚠️ 경고: 이 기능은 사용 중단(DEPRECATED)되었으며 신규 구현에 사용하면 안 됩니다.**

---

## 🛑 Deprecation Notice (사용 중단 공지)

**Status**: ❌ DEPRECATED (Deprecated since: 2025-02-07)

**Replacement**: ✅ **Settings System** (see [FEATURES.md](FEATURES.md) - "Optional Integrations" section)

**Reason for Deprecation**:
- The DEPENDENCY_REQUEST protocol adds unnecessary complexity
- Settings system provides better user experience with upfront configuration
- Clearer architecture with settings managed in one place
- Avoids agent pause/resume cycles during execution

**이 시스템이 사용 중단된 이유**:
- DEPENDENCY_REQUEST 프로토콜이 불필요한 복잡성을 추가함
- Settings 시스템이 사전 구성을 통해 더 나은 사용자 경험 제공
- 한 곳에서 설정을 관리하는 더 명확한 아키텍처
- 실행 중 에이전트 일시중지/재개 사이클 방지

---

## ⛔ Do NOT Use This Documentation If:

- ❌ You are implementing **new features** → Use Settings system instead
- ❌ You are building **new integrations** → Use Settings system instead
- ❌ You are **learning** the system → Skip this document, read [FEATURES.md](FEATURES.md)

## ✅ Only Use This Documentation If:

- ✅ You are **maintaining legacy code** that still uses DEPENDENCY_REQUEST
- ✅ You are **migrating** from Dependency System to Settings System
- ✅ You are **debugging** existing dependency-related issues

---

## 🔄 Migration Guide

**For New Implementations**:
```
DO NOT implement DEPENDENCY_REQUEST protocol
→ Use Settings system (documented in FEATURES.md)
→ Configure optional integrations in task settings
→ Settings are injected before agent starts
```

**For Existing Code**:
```
1. Identify all DEPENDENCY_REQUEST usages
2. Replace with Settings configuration
3. Update agent code to read from environment variables (already injected)
4. Remove DEPENDENCY_REQUEST protocol code
5. Test with Settings system
```

---

## 📚 Historical Documentation (히스토리 문서)

**이하 내용은 히스토리 참조용입니다. 신규 구현에 사용하지 마세요.**

**The content below is for historical reference only. DO NOT use for new implementations.**

---

## 개요

**의존성 시스템**은 Sub-Agent가 실행 중 필요한 외부 리소스(API 키, 환경 변수, 파일 등)를 Platform에 요청하고, 사용자로부터 제공받아 Agent에 주입하는 메커니즘입니다.

### 핵심 원칙

```
"Just-in-Time 제공"

Agent는 실제로 필요한 시점에만 의존성을 요청하며,
사용자는 요청된 의존성만 제공하면 됨
```

---

## 의존성 생명주기

### 전체 흐름

```
1. Agent가 의존성 필요 인식
   ↓
2. [DEPENDENCY_REQUEST] 출력
   ↓
3. Agent Manager가 파싱
   ↓
4. Agent 일시중지 (SIGTSTP)
   ↓
5. Checkpoint 생성
   ↓
6. Web Server에 알림 (SSE)
   ↓
7. 웹 UI에 입력 폼 표시
   ↓
8. 사용자가 값 입력
   ↓
9. 값 암호화 및 저장
   ↓
10. 환경 변수로 Agent에 주입
   ↓
11. Agent 재개 (SIGCONT)
   ↓
12. Agent가 환경 변수 사용
```

---

## 의존성 타입

### 1. API Key (api_key)

**사용 사례**: 외부 API 호출

**프로토콜**:
```
[DEPENDENCY_REQUEST]
type: api_key
name: OPENAI_API_KEY
description: OpenAI API key for GPT-4 integration
required: true
[/DEPENDENCY_REQUEST]
```

**처리**:
1. 사용자에게 API 키 입력 요청
2. AES-256-GCM으로 암호화
3. DB에 저장
4. 환경 변수로 주입: `process.env.OPENAI_API_KEY`

**보안**:
- 평문 저장 금지
- 로그에 노출 금지
- 전송 시 HTTPS 필수

### 2. Environment Variable (env_variable)

**사용 사례**: 일반 설정값

**프로토콜**:
```
[DEPENDENCY_REQUEST]
type: env_variable
name: DATABASE_URL
description: PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/db)
required: true
[/DEPENDENCY_REQUEST]
```

**처리**:
1. 사용자에게 값 입력 요청
2. 값 검증 (형식 확인)
3. 암호화 저장 (민감한 경우)
4. 환경 변수로 주입: `process.env.DATABASE_URL`

### 3. Service (service)

**사용 사례**: 외부 서비스 연동

**프로토콜**:
```
[DEPENDENCY_REQUEST]
type: service
name: stripe
description: Payment processing via Stripe (requires API key)
required: true
[/DEPENDENCY_REQUEST]
```

**처리**:
1. 서비스별 연동 UI 표시
2. 사용자가 인증 완료
3. 관련 환경 변수 생성:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
4. 모든 변수를 Agent에 주입

**지원 서비스**:
- Stripe (결제)
- Supabase (백엔드)
- GitHub (저장소)
- Vercel (배포)

### 4. File (file)

**사용 사례**: 이미지, 문서 등

**프로토콜**:
```
[DEPENDENCY_REQUEST]
type: file
name: company_logo.png
description: Company logo for the app header
required: false
default: placeholder.png
[/DEPENDENCY_REQUEST]
```

**처리**:
1. 파일 업로드 UI 표시
2. 사용자가 파일 선택 및 업로드
3. Workspace의 `assets/` 디렉토리에 저장
4. 파일 경로를 환경 변수로 주입:
   - `COMPANY_LOGO_PATH=/projects/task_xyz/assets/company_logo.png`

**제한**:
- 최대 파일 크기: 10MB
- 허용 타입: 이미지 (png, jpg, svg), 문서 (pdf), 폰트 (ttf, woff)

### 5. Permission (permission)

**사용 사례**: 특수 권한 요청

**프로토콜**:
```
[DEPENDENCY_REQUEST]
type: permission
name: file_system_write
description: Permission to write files to the project directory
required: true
[/DEPENDENCY_REQUEST]
```

**처리**:
1. 권한 승인 UI 표시
2. 사용자가 승인/거부
3. 승인 여부를 환경 변수로 주입:
   - `PERMISSION_FILE_SYSTEM_WRITE=true`

### 6. Package (package)

**사용 사례**: NPM 패키지 설치

**프로토콜**:
```
[DEPENDENCY_REQUEST]
type: package
name: @supabase/supabase-js
description: Supabase client library for database access
required: true
[/DEPENDENCY_REQUEST]
```

**처리**:
1. 패키지 설치 확인 UI 표시
2. 사용자가 승인
3. `package.json`에 추가
4. `npm install` 실행
5. 설치 완료를 환경 변수로 알림:
   - `PACKAGE_SUPABASE_JS_INSTALLED=true`

---

## 의존성 요청 처리

### Agent Manager 구현

```typescript
import { EventEmitter } from 'events';

class DependencyHandler extends EventEmitter {
  private pendingDependencies: Map<string, DependencyRequest> = new Map();

  /**
   * stdout에서 DEPENDENCY_REQUEST 파싱
   */
  parseDependencyRequest(output: string): DependencyRequest | null {
    const match = output.match(/\[DEPENDENCY_REQUEST\]([\s\S]*?)\[\/DEPENDENCY_REQUEST\]/);
    if (!match) return null;

    const content = match[1];
    const lines = content.trim().split('\n');

    const request: Partial<DependencyRequest> = {};

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (key && value) {
        request[key.trim()] = value;
      }
    }

    // 필수 필드 검증
    if (!request.type || !request.name || !request.description) {
      throw new Error('Invalid DEPENDENCY_REQUEST: missing required fields');
    }

    return request as DependencyRequest;
  }

  /**
   * 의존성 요청 처리
   */
  async handleDependencyRequest(
    taskId: string,
    request: DependencyRequest
  ): Promise<void> {
    console.log(`📦 Dependency requested: ${request.name} (${request.type})`);

    // 1. Agent 일시중지
    await pauseAgent(taskId);

    // 2. Checkpoint 생성
    await createCheckpoint(taskId, 'dependency_request');

    // 3. 의존성 저장
    const dependencyId = await saveDependencyRequest(taskId, request);
    this.pendingDependencies.set(dependencyId, request);

    // 4. Web Server에 알림 (SSE)
    this.emit('dependency_requested', {
      taskId,
      dependencyId,
      request,
    });

    // 5. 사용자 입력 대기
    console.log(`⏸️  Waiting for dependency: ${request.name}`);
  }

  /**
   * 사용자가 의존성 제공
   */
  async provideDependency(
    taskId: string,
    dependencyId: string,
    value: string
  ): Promise<void> {
    const request = this.pendingDependencies.get(dependencyId);
    if (!request) {
      throw new Error(`Dependency not found: ${dependencyId}`);
    }

    console.log(`✅ Dependency provided: ${request.name}`);

    // 1. 값 검증
    await validateDependencyValue(request, value);

    // 2. 암호화 (민감한 타입인 경우)
    const encryptedValue = await encryptIfNeeded(request.type, value);

    // 3. DB에 저장
    await saveDependencyValue(taskId, dependencyId, encryptedValue);

    // 4. 환경 변수 준비
    const envVar = prepareDependencyEnvVar(request, value);

    // 5. Agent에 주입
    await injectEnvironmentVariable(taskId, envVar.name, envVar.value);

    // 6. Agent 재개
    await resumeAgent(taskId);

    // 7. 대기 목록에서 제거
    this.pendingDependencies.delete(dependencyId);

    console.log(`▶️  Agent resumed with dependency: ${request.name}`);
  }
}
```

### 환경 변수 주입

```typescript
interface EnvironmentVariable {
  name: string;
  value: string;
}

/**
 * Agent 프로세스에 환경 변수 주입
 */
async function injectEnvironmentVariable(
  taskId: string,
  name: string,
  value: string
): Promise<void> {
  const agent = await getAgent(taskId);

  // 방법 1: Process restart (권장)
  // Agent를 새로운 환경 변수와 함께 재시작

  // 1. 현재 프로세스 종료 (SIGTERM)
  agent.process.kill('SIGTERM');

  // 2. 최신 Checkpoint 로드
  const checkpoint = await loadLatestCheckpoint(taskId);

  // 3. 새 환경 변수 추가
  const newEnv = {
    ...checkpoint.environment.variables,
    [name]: value,
  };

  // 4. Agent 재생성 (새 환경 변수 포함)
  const newAgent = await createAgent({
    taskId,
    taskType: checkpoint.task.type,
    workingDir: checkpoint.workspace.path,
    env: newEnv,
  });

  // 5. 대화 히스토리 복원
  await restoreConversationHistory(newAgent, checkpoint.conversationHistory);

  // 6. 재개
  console.log(`✅ Environment variable injected: ${name}`);
}
```

---

## 의존성 저장

### DB 스키마

```prisma
model Dependency {
  id          String   @id @default(cuid())
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id])

  // 요청 정보
  type        String   // 'api_key', 'env_variable', etc.
  name        String   // 'OPENAI_API_KEY'
  description String
  required    Boolean  @default(true)
  default     String?

  // 제공 정보
  providedAt  DateTime?
  value       String?  // 암호화된 값
  providedBy  String?  // 사용자 ID

  // 상태
  status      String   @default("pending") // 'pending', 'provided', 'failed'

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([taskId])
  @@index([status])
}
```

### 암호화

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

/**
 * 값 암호화
 */
function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // IV + AuthTag + Encrypted 결합
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 값 복호화
 */
function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * 타입에 따라 암호화 필요 여부 판단
 */
function shouldEncrypt(type: string): boolean {
  return ['api_key', 'env_variable', 'service'].includes(type);
}
```

---

## 웹 UI 구현

### API 엔드포인트

#### GET /api/tasks/{id}/dependencies

**응답**:
```json
{
  "success": true,
  "data": {
    "dependencies": [
      {
        "id": "dep_abc123",
        "type": "api_key",
        "name": "OPENAI_API_KEY",
        "description": "OpenAI API key for GPT-4 integration",
        "required": true,
        "status": "pending",
        "createdAt": "2024-02-15T10:30:00Z"
      }
    ]
  }
}
```

#### POST /api/dependencies/{id}/provide

**요청**:
```json
{
  "value": "sk-..."
}
```

**응답**:
```json
{
  "success": true,
  "message": "Dependency provided successfully"
}
```

### React 컴포넌트

```typescript
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DependencyCardProps {
  dependency: Dependency;
  onProvide: (value: string) => Promise<void>;
}

export function DependencyCard({ dependency, onProvide }: DependencyCardProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      await onProvide(value);
      setValue('');
    } catch (error) {
      alert('Failed to provide dependency');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold">{dependency.name}</h3>
      <p className="text-sm text-gray-600">{dependency.description}</p>

      {dependency.type === 'api_key' && (
        <Input
          type="password"
          placeholder="Enter API key"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )}

      {dependency.type === 'file' && (
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              // 파일 업로드 처리
            }
          }}
        />
      )}

      <Button onClick={handleSubmit} disabled={loading || !value}>
        {loading ? 'Providing...' : 'Provide'}
      </Button>
    </div>
  );
}
```

---

## 검증

### 값 검증

```typescript
function validateDependencyValue(
  request: DependencyRequest,
  value: string
): void {
  // 1. 필수 값 확인
  if (request.required && !value) {
    throw new Error(`${request.name} is required`);
  }

  // 2. 타입별 검증
  switch (request.type) {
    case 'api_key':
      if (value.length < 20) {
        throw new Error('API key too short');
      }
      break;

    case 'env_variable':
      if (request.name === 'DATABASE_URL') {
        if (!value.startsWith('postgresql://') && !value.startsWith('mysql://')) {
          throw new Error('Invalid database URL format');
        }
      }
      break;

    case 'file':
      // 파일 크기 및 타입 검증
      break;
  }
}
```

---

## 에러 처리

### 의존성 제공 실패

```typescript
try {
  await provideDependency(taskId, dependencyId, value);
} catch (error) {
  // 1. 사용자에게 에러 알림
  await notifyUser({
    type: 'error',
    message: `Failed to provide dependency: ${error.message}`,
  });

  // 2. 로그 기록
  console.error('Dependency provision failed:', error);

  // 3. Agent는 계속 일시중지 상태 유지
  // 사용자가 재시도 가능
}
```

### 의존성 시간 초과

```typescript
const DEPENDENCY_TIMEOUT = 30 * 60 * 1000; // 30분

setTimeout(async () => {
  const dependency = await getDependency(dependencyId);

  if (dependency.status === 'pending') {
    // 30분 동안 제공되지 않음
    await notifyUser({
      type: 'warning',
      message: `Dependency ${dependency.name} not provided. Task will be paused.`,
    });

    // Task를 대기 상태로 변경
    await updateTaskStatus(taskId, 'pending');
  }
}, DEPENDENCY_TIMEOUT);
```

---

## 최적화

### 의존성 캐싱

동일한 의존성을 재사용:

```typescript
async function getDependencyValue(taskId: string, name: string): Promise<string | null> {
  // 1. 현재 Task에서 찾기
  const dep = await db.dependency.findFirst({
    where: { taskId, name, status: 'provided' },
  });

  if (dep) {
    return decrypt(dep.value!);
  }

  // 2. 동일 사용자의 다른 Task에서 찾기 (선택사항)
  const user = await getTaskOwner(taskId);
  const sharedDep = await db.dependency.findFirst({
    where: {
      task: { userId: user.id },
      name,
      status: 'provided',
    },
    orderBy: { providedAt: 'desc' },
  });

  if (sharedDep) {
    // 재사용 여부 확인
    const reuse = await confirmReuseDependency(name);
    if (reuse) {
      return decrypt(sharedDep.value!);
    }
  }

  return null;
}
```

---

## 관련 문서

- **프로토콜**: `/docs/PROTOCOLS.md`
- **보안**: `/packages/claude-code-server/docs/security/encryption.md`
- **워크플로우**: `/docs/WORKFLOWS.md`
- **용어집**: `/docs/GLOSSARY.md`

---

**최종 업데이트**: 2024-02-15
**버전**: 1.0
