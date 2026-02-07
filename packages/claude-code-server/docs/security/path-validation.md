# 경로 검증 및 Path Traversal 방지

## 개요

사용자 입력 경로를 검증하여 Path Traversal 공격을 방지하는 방법을 설명합니다.

> **중요**: 모든 파일 경로는 **반드시 검증**해야 합니다.

## Path Traversal 공격이란?

### 공격 예시

```
❌ 악의적인 입력:
/api/files?path=../../../etc/passwd
/api/files?path=../../.env
/api/files?path=..%2f..%2f..%2fsecret.key
```

### 위험성

```
1. 시스템 파일 접근
   → /etc/passwd, /etc/shadow 등

2. 환경 변수 노출
   → .env, credentials.json 등

3. 소스 코드 노출
   → 민감한 로직, API 키 등

4. 다른 사용자 데이터 접근
   → 권한 없는 프로젝트 파일
```

## 검증 전략

### 1. 기본 검증 함수

```typescript
// lib/utils/path-validation.ts
import path from 'path';

export interface PathValidationResult {
  valid: boolean;
  resolvedPath?: string;
  error?: string;
}

export function validatePath(
  userPath: string,
  baseDir: string
): PathValidationResult {
  try {
    // 1. 절대 경로로 변환
    const resolved = path.resolve(baseDir, userPath);

    // 2. baseDir 내부에 있는지 확인
    if (!resolved.startsWith(baseDir)) {
      return {
        valid: false,
        error: 'Path traversal detected: path is outside base directory',
      };
    }

    // 3. 추가 검증
    const additionalChecks = performAdditionalChecks(resolved);
    if (!additionalChecks.valid) {
      return additionalChecks;
    }

    return {
      valid: true,
      resolvedPath: resolved,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid path: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function performAdditionalChecks(resolvedPath: string): PathValidationResult {
  // 1. 경로 길이 제한
  if (resolvedPath.length > 1000) {
    return {
      valid: false,
      error: 'Path too long',
    };
  }

  // 2. 널 바이트 검사
  if (resolvedPath.includes('\0')) {
    return {
      valid: false,
      error: 'Null byte detected in path',
    };
  }

  // 3. 민감한 파일 패턴 차단
  const sensitivePatterns = [
    /\/\.env$/i,
    /\/\.git\//i,
    /\/node_modules\//i,
    /\/\.ssh\//i,
    /\/etc\/passwd$/i,
    /\/etc\/shadow$/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(resolvedPath)) {
      return {
        valid: false,
        error: 'Access to sensitive file denied',
      };
    }
  }

  return { valid: true };
}
```

### 2. 작업 디렉토리 검증

```typescript
// lib/utils/path-validation.ts
export function validateWorkingDirectory(
  taskId: string,
  baseProjectsDir: string = '/projects'
): PathValidationResult {
  // Task ID 검증
  if (!/^[a-zA-Z0-9_-]+$/.test(taskId)) {
    return {
      valid: false,
      error: 'Invalid task ID format',
    };
  }

  // 작업 디렉토리 경로 생성
  const workingDir = path.join(baseProjectsDir, taskId);

  // baseProjectsDir 내부인지 확인
  if (!workingDir.startsWith(baseProjectsDir)) {
    return {
      valid: false,
      error: 'Working directory is outside projects base directory',
    };
  }

  return {
    valid: true,
    resolvedPath: workingDir,
  };
}
```

### 3. 파일 읽기 검증

```typescript
// lib/utils/path-validation.ts
import fs from 'fs/promises';

export async function validateAndReadFile(
  filePath: string,
  baseDir: string
): Promise<{ success: boolean; content?: string; error?: string }> {
  // 1. 경로 검증
  const validation = validatePath(filePath, baseDir);
  if (!validation.valid || !validation.resolvedPath) {
    return {
      success: false,
      error: validation.error,
    };
  }

  try {
    // 2. 파일 존재 확인
    const stats = await fs.stat(validation.resolvedPath);

    // 3. 디렉토리가 아닌지 확인
    if (stats.isDirectory()) {
      return {
        success: false,
        error: 'Path is a directory, not a file',
      };
    }

    // 4. 파일 크기 제한 (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (stats.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'File too large (max 10MB)',
      };
    }

    // 5. 파일 읽기
    const content = await fs.readFile(validation.resolvedPath, 'utf-8');

    return {
      success: true,
      content,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
```

## API 적용

### File Read API

```typescript
// app/api/tasks/[id]/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAndReadFile } from '@/lib/utils/path-validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  // 1. Query parameter에서 경로 가져오기
  const filePath = request.nextUrl.searchParams.get('path');
  if (!filePath) {
    return NextResponse.json(
      { error: 'Missing path parameter' },
      { status: 400 }
    );
  }

  // 2. 작업 디렉토리 검증
  const baseDir = `/projects/${taskId}`;
  const workingDirValidation = validateWorkingDirectory(taskId);
  if (!workingDirValidation.valid) {
    return NextResponse.json(
      { error: workingDirValidation.error },
      { status: 403 }
    );
  }

  // 3. 파일 읽기 (검증 포함)
  const result = await validateAndReadFile(filePath, baseDir);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 403 }
    );
  }

  // 4. 성공 응답
  return NextResponse.json({
    content: result.content,
    path: filePath,
  });
}
```

### File Write API

```typescript
// app/api/tasks/[id]/files/route.ts
import { validatePath } from '@/lib/utils/path-validation';
import fs from 'fs/promises';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  // 1. Request body 파싱
  const body = await request.json();
  const { path: filePath, content } = body;

  if (!filePath || content === undefined) {
    return NextResponse.json(
      { error: 'Missing path or content' },
      { status: 400 }
    );
  }

  // 2. 경로 검증
  const baseDir = `/projects/${taskId}`;
  const validation = validatePath(filePath, baseDir);

  if (!validation.valid || !validation.resolvedPath) {
    return NextResponse.json(
      { error: validation.error },
      { status: 403 }
    );
  }

  try {
    // 3. 디렉토리 생성 (필요 시)
    const dir = path.dirname(validation.resolvedPath);
    await fs.mkdir(dir, { recursive: true });

    // 4. 파일 쓰기
    await fs.writeFile(validation.resolvedPath, content, 'utf-8');

    return NextResponse.json({
      success: true,
      path: filePath,
    });
  } catch (error) {
    console.error('Failed to write file:', error);
    return NextResponse.json(
      { error: 'Failed to write file' },
      { status: 500 }
    );
  }
}
```

### File Delete API

```typescript
// app/api/tasks/[id]/files/route.ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  // 1. Query parameter에서 경로 가져오기
  const filePath = request.nextUrl.searchParams.get('path');
  if (!filePath) {
    return NextResponse.json(
      { error: 'Missing path parameter' },
      { status: 400 }
    );
  }

  // 2. 경로 검증
  const baseDir = `/projects/${taskId}`;
  const validation = validatePath(filePath, baseDir);

  if (!validation.valid || !validation.resolvedPath) {
    return NextResponse.json(
      { error: validation.error },
      { status: 403 }
    );
  }

  // 3. 중요 파일 삭제 방지
  const protectedFiles = [
    'package.json',
    '.env',
    '.env.production',
  ];

  const fileName = path.basename(validation.resolvedPath);
  if (protectedFiles.includes(fileName)) {
    return NextResponse.json(
      { error: 'Cannot delete protected file' },
      { status: 403 }
    );
  }

  try {
    // 4. 파일 삭제
    await fs.unlink(validation.resolvedPath);

    return NextResponse.json({
      success: true,
      path: filePath,
    });
  } catch (error) {
    console.error('Failed to delete file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
```

## 에이전트 프로세스 생성 시 적용

### Working Directory 검증

```typescript
// lib/agent/executor.ts
import { validateWorkingDirectory } from '@/lib/utils/path-validation';

export async function createAgent(config: AgentConfig): Promise<ChildProcess | null> {
  const { taskId, workingDir } = config;

  // 1. Working Directory 검증
  const validation = validateWorkingDirectory(taskId);
  if (!validation.valid || !validation.resolvedPath) {
    console.error(`Invalid working directory for ${taskId}:`, validation.error);
    return null;
  }

  // 2. 검증된 경로 사용
  const safeWorkingDir = validation.resolvedPath;

  try {
    // 3. 디렉토리 생성
    await fs.mkdir(safeWorkingDir, { recursive: true });

    // 4. 프로세스 spawn
    const agent = spawn('claude', [
      '--yes',
      '--output-dir', safeWorkingDir,
      '--context', claudeGuidePath,
    ], {
      cwd: safeWorkingDir,
      env: buildEnvironment(config),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return agent;
  } catch (error) {
    console.error(`Failed to create agent for ${taskId}:`, error);
    return null;
  }
}
```

## 추가 보안 조치

### 1. Symlink 차단

```typescript
// lib/utils/path-validation.ts
export async function validateNoSymlink(filePath: string): Promise<PathValidationResult> {
  try {
    const stats = await fs.lstat(filePath);

    if (stats.isSymbolicLink()) {
      return {
        valid: false,
        error: 'Symbolic links are not allowed',
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to check symlink: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
```

### 2. MIME Type 검증

```typescript
// lib/utils/path-validation.ts
import { fileTypeFromFile } from 'file-type';

const ALLOWED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/json',
  'text/javascript',
  'application/javascript',
  'text/typescript',
];

export async function validateFileType(filePath: string): Promise<PathValidationResult> {
  try {
    const fileType = await fileTypeFromFile(filePath);

    // 텍스트 파일은 MIME type이 없을 수 있음
    if (!fileType) {
      // 확장자로 검증
      const ext = path.extname(filePath).toLowerCase();
      const textExtensions = ['.md', '.txt', '.js', '.ts', '.tsx', '.jsx', '.json', '.yaml', '.yml'];

      if (!textExtensions.includes(ext)) {
        return {
          valid: false,
          error: 'Unsupported file type',
        };
      }

      return { valid: true };
    }

    // MIME type 검증
    if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
      return {
        valid: false,
        error: `File type not allowed: ${fileType.mime}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate file type: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
```

### 3. Rate Limiting (경로별)

```typescript
// lib/utils/rate-limit.ts
import { RateLimiter } from 'limiter';

const pathAccessLimiters = new Map<string, RateLimiter>();

export function checkPathAccessLimit(userId: string, path: string): boolean {
  const key = `${userId}:${path}`;

  let limiter = pathAccessLimiters.get(key);
  if (!limiter) {
    // 1분에 10회
    limiter = new RateLimiter({ tokensPerInterval: 10, interval: 'minute' });
    pathAccessLimiters.set(key, limiter);
  }

  return limiter.tryRemoveTokens(1);
}
```

## 테스트

### 단위 테스트

```typescript
// __tests__/lib/utils/path-validation.test.ts
import { validatePath, validateWorkingDirectory } from '@/lib/utils/path-validation';

describe('Path Validation', () => {
  const baseDir = '/projects/test-task';

  describe('validatePath', () => {
    it('should allow valid paths within base directory', () => {
      const result = validatePath('docs/planning/01_idea.md', baseDir);
      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe('/projects/test-task/docs/planning/01_idea.md');
    });

    it('should reject path traversal attempts', () => {
      const result = validatePath('../../../etc/passwd', baseDir);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('traversal');
    });

    it('should reject paths with null bytes', () => {
      const result = validatePath('file\0.txt', baseDir);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Null byte');
    });

    it('should reject access to .env files', () => {
      const result = validatePath('.env', baseDir);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('sensitive');
    });

    it('should reject very long paths', () => {
      const longPath = 'a'.repeat(1001);
      const result = validatePath(longPath, baseDir);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('validateWorkingDirectory', () => {
    it('should allow valid task IDs', () => {
      const result = validateWorkingDirectory('task_123');
      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe('/projects/task_123');
    });

    it('should reject task IDs with special characters', () => {
      const result = validateWorkingDirectory('task/../admin');
      expect(result.valid).toBe(false);
    });

    it('should reject task IDs with path traversal', () => {
      const result = validateWorkingDirectory('../root');
      expect(result.valid).toBe(false);
    });
  });
});
```

### Integration Test

```typescript
// __tests__/api/tasks/files.test.ts
import { GET, POST, DELETE } from '@/app/api/tasks/[id]/files/route';

describe('Files API - Security', () => {
  it('should reject path traversal in GET', async () => {
    const request = new NextRequest('http://localhost/api/tasks/task_123/files?path=../../../etc/passwd');
    const response = await GET(request, { params: { id: 'task_123' } });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('traversal');
  });

  it('should reject path traversal in POST', async () => {
    const request = new NextRequest('http://localhost/api/tasks/task_123/files', {
      method: 'POST',
      body: JSON.stringify({
        path: '../../secret.txt',
        content: 'malicious',
      }),
    });

    const response = await POST(request, { params: { id: 'task_123' } });

    expect(response.status).toBe(403);
  });

  it('should reject deletion of protected files', async () => {
    const request = new NextRequest('http://localhost/api/tasks/task_123/files?path=.env');
    const response = await DELETE(request, { params: { id: 'task_123' } });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('protected');
  });
});
```

## 모니터링 및 알림

### 의심스러운 접근 로깅

```typescript
// lib/utils/security-logger.ts
export function logSuspiciousPathAccess(userId: string, taskId: string, path: string, reason: string) {
  console.warn('[SECURITY] Suspicious path access detected', {
    userId,
    taskId,
    path,
    reason,
    timestamp: new Date().toISOString(),
  });

  // 추가: 데이터베이스에 로그 저장
  db.securityLog.create({
    data: {
      userId,
      taskId,
      path,
      reason,
      type: 'path_traversal_attempt',
      timestamp: new Date(),
    },
  });

  // 심각한 경우 관리자에게 알림
  if (reason.includes('passwd') || reason.includes('shadow')) {
    notifyAdmin({
      type: 'critical_security_event',
      userId,
      taskId,
      path,
      reason,
    });
  }
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../features/process-management.md`** - Working directory 설정
2. **`../api/tasks-api.md`** - File 관련 API 명세
3. **`../../agent-manager/docs/lifecycle/creation.md`** - 작업 디렉토리 준비
4. **`../development/testing.md`** - 보안 테스트 케이스

### 이 문서를 참조하는 문서

1. **`../README.md`** - Security 문서 목록
2. **`../../CLAUDE.md`** - 웹 서버 보안 개요
3. **`../features/process-management.md`** - 프로세스 생성
4. **`input-sanitization.md`** - 입력 검증 (상호 보완)

## 다음 단계

- **암호화**: `encryption.md` - API 키 및 민감 정보 암호화
- **Rate Limiting**: `rate-limiting.md` - API 요청 제한
- **입력 검증**: `input-sanitization.md` - 모든 사용자 입력 검증

## 관련 문서

- **Encryption**: `encryption.md`
- **Rate Limiting**: `rate-limiting.md`
- **Input Sanitization**: `input-sanitization.md`
- **Process Management**: `../features/process-management.md`
- **Tasks API**: `../api/tasks-api.md`
