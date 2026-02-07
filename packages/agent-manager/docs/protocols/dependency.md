# 의존성 프로토콜 처리

## 개요

서브 에이전트가 의존성을 요청할 때 감지하고 처리하는 방법을 설명합니다.

> **계층 구분**: 이 문서는 **에이전트 관리자 관점**에서 의존성 프로토콜 처리를 다룹니다.
> **서브 에이전트의 의존성 요청 방법**은 `../../../sub-agent/docs/protocols/dependency-request.md` 참조

## 프로토콜 형식

### 의존성 요청

서브 에이전트가 다음 형식으로 출력합니다:

```
[DEPENDENCY_REQUEST]
type: api_key
name: OPENAI_API_KEY
description: Required for OpenAI API integration
required: true
[/DEPENDENCY_REQUEST]
```

### 필드 정의

```typescript
// agent-manager/types/protocols.ts
export interface DependencyRequest {
  type: DependencyType;
  name: string;
  description: string;
  required: boolean;
}

export type DependencyType =
  | 'api_key'        // API 키
  | 'env_variable'   // 환경 변수
  | 'service'        // 외부 서비스 연결 정보
  | 'file'           // 파일 경로
  | 'permission'     // 권한
  | 'package';       // npm 패키지
```

## 감지 및 파싱

### 출력 감지

```typescript
// agent-manager/lib/protocols/detector.ts
export function detectProtocol(output: string): Protocol | null {
  // 의존성 요청 감지
  if (output.includes('[DEPENDENCY_REQUEST]')) {
    return parseDependencyRequest(output);
  }

  // 다른 프로토콜 감지
  // ...

  return null;
}
```

### 파싱 구현

```typescript
// agent-manager/lib/protocols/dependency.ts
export function parseDependencyRequest(output: string): DependencyRequest | null {
  const match = output.match(/\[DEPENDENCY_REQUEST\]([\s\S]*?)\[\/DEPENDENCY_REQUEST\]/);
  if (!match) {
    return null;
  }

  const content = match[1];

  try {
    const type = extractField(content, 'type');
    const name = extractField(content, 'name');
    const description = extractField(content, 'description');
    const required = extractField(content, 'required') === 'true';

    // 검증
    if (!type || !name || !description) {
      console.error('Invalid dependency request: missing required fields');
      return null;
    }

    const validTypes: DependencyType[] = [
      'api_key',
      'env_variable',
      'service',
      'file',
      'permission',
      'package',
    ];

    if (!validTypes.includes(type as DependencyType)) {
      console.error(`Invalid dependency type: ${type}`);
      return null;
    }

    return {
      type: type as DependencyType,
      name,
      description,
      required,
    };
  } catch (error) {
    console.error('Failed to parse dependency request:', error);
    return null;
  }
}

function extractField(content: string, fieldName: string): string {
  const regex = new RegExp(`${fieldName}:\\s*(.+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}
```

## 처리 흐름

### 핸들러

```typescript
// agent-manager/lib/protocols/dependency.ts
export async function handleDependencyRequest(
  taskId: string,
  request: DependencyRequest
): Promise<void> {
  console.log(`Dependency request for ${taskId}:`, request);

  try {
    // 1. 에이전트 일시 중지
    pauseAgentExecution(taskId, `Waiting for dependency: ${request.name}`);

    // 2. Checkpoint 생성
    await createCheckpoint(taskId, 'dependency_request', {
      dependency: request,
      timestamp: new Date().toISOString(),
    });

    // 3. 데이터베이스에 저장
    const dependency = await db.dependency.create({
      data: {
        taskId,
        type: request.type,
        name: request.name,
        description: request.description,
        required: request.required,
        status: 'pending',
        requestedAt: new Date(),
      },
    });

    // 4. 에이전트 상태 업데이트
    await updateAgentState(taskId, {
      status: 'waiting_dependency',
      blockedBy: 'dependency',
      blockedReason: `Waiting for: ${request.name}`,
      blockedAt: new Date(),
    });

    // 5. 웹 서버에 알림
    notifyWebServer(taskId, {
      type: 'dependency_request',
      data: {
        dependencyId: dependency.id,
        type: request.type,
        name: request.name,
        description: request.description,
        required: request.required,
      },
    });

    console.log(`Dependency request created: ${dependency.id}`);
  } catch (error) {
    console.error(`Failed to handle dependency request for ${taskId}:`, error);

    // 에러 처리
    await handleProtocolError(taskId, 'dependency_request', error);
  }
}
```

## 의존성 제공

### 웹 서버로부터 의존성 수신

```typescript
// agent-manager/lib/protocols/dependency.ts
export interface ProvideDependencyRequest {
  taskId: string;
  dependencyId: string;
  value: string;
}

export async function provideDependency(
  request: ProvideDependencyRequest
): Promise<boolean> {
  const { taskId, dependencyId, value } = request;

  try {
    // 1. Dependency 조회
    const dependency = await db.dependency.findUnique({
      where: { id: dependencyId },
    });

    if (!dependency || dependency.taskId !== taskId) {
      console.error(`Dependency not found: ${dependencyId}`);
      return false;
    }

    if (dependency.status !== 'pending') {
      console.error(`Dependency ${dependencyId} is not pending`);
      return false;
    }

    // 2. 값 검증
    const validationResult = validateDependencyValue(dependency.type, value);
    if (!validationResult.valid) {
      console.error(`Invalid dependency value: ${validationResult.error}`);
      return false;
    }

    // 3. 데이터베이스 업데이트
    await db.dependency.update({
      where: { id: dependencyId },
      data: {
        value,
        status: 'provided',
        providedAt: new Date(),
      },
    });

    // 4. 에이전트에 전달
    await injectDependency(taskId, dependency.name, value);

    // 5. 에이전트 상태 업데이트
    await updateAgentState(taskId, {
      status: 'running',
      blockedBy: null,
      blockedReason: null,
      blockedAt: null,
    });

    // 6. 에이전트 재개
    resumeAgentExecution({ taskId });

    console.log(`Dependency provided: ${dependencyId}`);
    return true;
  } catch (error) {
    console.error(`Failed to provide dependency ${dependencyId}:`, error);
    return false;
  }
}
```

### 의존성 주입

```typescript
// agent-manager/lib/protocols/dependency.ts
async function injectDependency(
  taskId: string,
  name: string,
  value: string
): Promise<void> {
  const state = getAgentState(taskId);
  if (!state || !state.process) {
    throw new Error(`Agent not found: ${taskId}`);
  }

  // 1. 환경 변수 형식으로 전달
  const message = `[DEPENDENCY_PROVIDED]\nname: ${name}\nvalue: ${value}\n[/DEPENDENCY_PROVIDED]\n`;

  // 2. stdin으로 전달
  state.process.stdin?.write(message);

  // 3. 로그 저장
  saveLog(taskId, `[DEPENDENCY] ${name} provided`);

  console.log(`Injected dependency ${name} to ${taskId}`);
}
```

## 검증

### 의존성 값 검증

```typescript
// agent-manager/lib/protocols/dependency.ts
interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateDependencyValue(
  type: DependencyType,
  value: string
): ValidationResult {
  // 1. 공통 검증: 빈 값
  if (!value || value.trim().length === 0) {
    return { valid: false, error: 'Value cannot be empty' };
  }

  // 2. 타입별 검증
  switch (type) {
    case 'api_key':
      return validateApiKey(value);

    case 'env_variable':
      return validateEnvVariable(value);

    case 'service':
      return validateServiceUrl(value);

    case 'file':
      return validateFilePath(value);

    case 'permission':
      return validatePermission(value);

    case 'package':
      return validatePackageName(value);

    default:
      return { valid: false, error: `Unknown dependency type: ${type}` };
  }
}

function validateApiKey(value: string): ValidationResult {
  // API 키는 일반적으로 영문, 숫자, 언더스코어, 하이픈
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    return { valid: false, error: 'Invalid API key format' };
  }

  // 최소 길이 체크
  if (value.length < 8) {
    return { valid: false, error: 'API key too short' };
  }

  return { valid: true };
}

function validateEnvVariable(value: string): ValidationResult {
  // 환경 변수는 모든 문자 허용하지만 길이 제한
  if (value.length > 10000) {
    return { valid: false, error: 'Environment variable too long' };
  }

  return { valid: true };
}

function validateServiceUrl(value: string): ValidationResult {
  // URL 형식 검증
  try {
    const url = new URL(value);

    // HTTP(S)만 허용
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP(S) protocols allowed' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

function validateFilePath(value: string): ValidationResult {
  // 절대 경로 또는 상대 경로
  // Path Traversal 방지
  if (value.includes('..')) {
    return { valid: false, error: 'Path traversal detected' };
  }

  // 경로 길이 제한
  if (value.length > 500) {
    return { valid: false, error: 'File path too long' };
  }

  return { valid: true };
}

function validatePermission(value: string): ValidationResult {
  // Permission은 boolean 형태
  if (!['true', 'false', 'yes', 'no'].includes(value.toLowerCase())) {
    return { valid: false, error: 'Permission must be true/false or yes/no' };
  }

  return { valid: true };
}

function validatePackageName(value: string): ValidationResult {
  // npm 패키지 이름 형식
  // @scope/package-name 또는 package-name
  if (!/^(@[a-z0-9-]+\/)?[a-z0-9-]+$/.test(value)) {
    return { valid: false, error: 'Invalid package name format' };
  }

  return { valid: true };
}
```

## 에러 처리

### 의존성 타임아웃

```typescript
// agent-manager/lib/protocols/dependency.ts
const DEPENDENCY_TIMEOUT = 3600000; // 1시간

export function setupDependencyTimeout(taskId: string, dependencyId: string) {
  setTimeout(async () => {
    // 1. Dependency 상태 확인
    const dependency = await db.dependency.findUnique({
      where: { id: dependencyId },
    });

    if (!dependency || dependency.status !== 'pending') {
      return; // 이미 제공되었거나 취소됨
    }

    // 2. 타임아웃 처리
    console.warn(`Dependency timeout: ${dependencyId}`);

    await db.dependency.update({
      where: { id: dependencyId },
      data: {
        status: 'timeout',
      },
    });

    // 3. Required 의존성인 경우 Task 실패
    if (dependency.required) {
      await updateAgentState(taskId, {
        status: 'failed',
        blockedBy: null,
        blockedReason: `Required dependency timeout: ${dependency.name}`,
      });

      await terminateAgent(taskId, false);

      notifyWebServer(taskId, {
        type: 'agent_failed',
        data: {
          taskId,
          reason: `Required dependency timeout: ${dependency.name}`,
        },
      });
    } else {
      // 4. Optional 의존성인 경우 null로 재개
      await provideDependency({
        taskId,
        dependencyId,
        value: '',
      });
    }
  }, DEPENDENCY_TIMEOUT);
}
```

### 의존성 거부

```typescript
// agent-manager/lib/protocols/dependency.ts
export async function rejectDependency(
  dependencyId: string,
  reason: string
): Promise<boolean> {
  try {
    // 1. Dependency 조회
    const dependency = await db.dependency.findUnique({
      where: { id: dependencyId },
    });

    if (!dependency) {
      console.error(`Dependency not found: ${dependencyId}`);
      return false;
    }

    const { taskId, required, name } = dependency;

    // 2. 데이터베이스 업데이트
    await db.dependency.update({
      where: { id: dependencyId },
      data: {
        status: 'rejected',
        rejectionReason: reason,
      },
    });

    // 3. Required 의존성인 경우 Task 실패
    if (required) {
      await updateAgentState(taskId, {
        status: 'failed',
        blockedBy: null,
        blockedReason: `Required dependency rejected: ${name}`,
      });

      await terminateAgent(taskId, false);

      notifyWebServer(taskId, {
        type: 'agent_failed',
        data: {
          taskId,
          reason: `Required dependency rejected: ${name}`,
        },
      });
    } else {
      // 4. Optional 의존성인 경우 빈 값으로 재개
      await provideDependency({
        taskId,
        dependencyId,
        value: '',
      });
    }

    console.log(`Dependency rejected: ${dependencyId}`);
    return true;
  } catch (error) {
    console.error(`Failed to reject dependency ${dependencyId}:`, error);
    return false;
  }
}
```

## 테스트

### 단위 테스트

```typescript
// __tests__/lib/protocols/dependency.test.ts
import { parseDependencyRequest, validateDependencyValue } from '@/lib/protocols/dependency';

describe('Dependency Protocol', () => {
  describe('parseDependencyRequest', () => {
    it('should parse valid dependency request', () => {
      const output = `
[DEPENDENCY_REQUEST]
type: api_key
name: OPENAI_API_KEY
description: Required for AI features
required: true
[/DEPENDENCY_REQUEST]
      `;

      const result = parseDependencyRequest(output);

      expect(result).toEqual({
        type: 'api_key',
        name: 'OPENAI_API_KEY',
        description: 'Required for AI features',
        required: true,
      });
    });

    it('should return null for invalid format', () => {
      const output = 'Just some regular text';
      const result = parseDependencyRequest(output);
      expect(result).toBeNull();
    });

    it('should return null for missing required fields', () => {
      const output = `
[DEPENDENCY_REQUEST]
type: api_key
name: OPENAI_API_KEY
[/DEPENDENCY_REQUEST]
      `;

      const result = parseDependencyRequest(output);
      expect(result).toBeNull();
    });
  });

  describe('validateDependencyValue', () => {
    it('should validate API key', () => {
      const result = validateDependencyValue('api_key', 'sk-1234567890abcdef');
      expect(result.valid).toBe(true);
    });

    it('should reject short API key', () => {
      const result = validateDependencyValue('api_key', 'short');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should validate service URL', () => {
      const result = validateDependencyValue('service', 'https://api.example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject non-HTTP URL', () => {
      const result = validateDependencyValue('service', 'ftp://example.com');
      expect(result.valid).toBe(false);
    });

    it('should reject path traversal', () => {
      const result = validateDependencyValue('file', '../../../etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('traversal');
    });
  });
});
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../lifecycle/execution.md`** - 의존성 제공 후 재개
2. **`../../../sub-agent/docs/protocols/dependency-request.md`** - 요청 형식 (양방향 동기화)
3. **`../../../claude-code-server/docs/features/protocol-parsing.md`** - 웹 서버의 파싱 로직
4. **`../../../claude-code-server/docs/api/dependencies-api.md`** - Dependencies API 명세

### 이 문서를 참조하는 문서

1. **`../README.md`** - Protocols 문서 목록
2. **`../../CLAUDE.md`** - 에이전트 관리자 개요
3. **`../lifecycle/execution.md`** - 실행 및 제어
4. **`../checkpoint/creation.md`** - Checkpoint 생성 시점

## 다음 단계

- **사용자 질문**: `question.md` - 사용자 질문 프로토콜 처리
- **Phase 완료**: `phase-completion.md` - Phase 완료 프로토콜 처리
- **에러 처리**: `error.md` - 에러 프로토콜 처리

## 관련 문서

- **Lifecycle - Execution**: `../lifecycle/execution.md`
- **Sub-Agent - Dependency Request**: `../../../sub-agent/docs/protocols/dependency-request.md`
- **Web Server - Protocol Parsing**: `../../../claude-code-server/docs/features/protocol-parsing.md`
- **Web Server - Dependencies API**: `../../../claude-code-server/docs/api/dependencies-api.md`
