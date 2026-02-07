# 결과물 수집 (Deliverables Collection)

## 개요

Phase 완료 시 작업 디렉토리에서 결과물(문서, 코드)을 수집하여 사용자에게 제공하는 방법을 설명합니다.

## 결과물 타입

### Phase별 결과물

```typescript
// lib/deliverables/types.ts
export interface Deliverables {
  phase: number;
  type: DeliverablesType;
  files: DeliverableFile[];
  summary: string;
  createdAt: Date;
}

export type DeliverablesType = 'documents' | 'code' | 'mixed';

export interface DeliverableFile {
  path: string;           // 상대 경로
  absolutePath: string;   // 절대 경로
  name: string;
  type: FileType;
  size: number;
  content?: string;       // 텍스트 파일만
  createdAt: Date;
  modifiedAt: Date;
}

export type FileType =
  | 'markdown'
  | 'typescript'
  | 'javascript'
  | 'json'
  | 'css'
  | 'html'
  | 'image'
  | 'other';
```

### Phase 1-2: 문서

```
docs/
├── planning/
│   ├── 01_idea.md
│   ├── 02_market.md
│   └── ...
└── design/
    ├── 01_screen.md
    ├── 02_data_model.md
    └── ...
```

### Phase 3: 코드

```
src/
├── app/
├── components/
├── lib/
├── package.json
├── README.md
└── ...
```

## 수집 프로세스

### Phase 완료 감지

```typescript
// lib/deliverables/collector.ts
import fs from 'fs/promises';
import path from 'path';
import { Glob } from 'glob';

export async function collectDeliverables(
  taskId: string,
  phase: number
): Promise<Deliverables> {
  console.log(`Collecting deliverables for ${taskId}, Phase ${phase}`);

  const workingDir = getTaskWorkingDir(taskId);
  const files: DeliverableFile[] = [];

  // Phase별 수집 대상 디렉토리
  const targetDirs = getPhaseDeliverablesDirs(phase);

  for (const dir of targetDirs) {
    const dirPath = path.join(workingDir, dir);
    const dirFiles = await collectFilesFromDirectory(dirPath);
    files.push(...dirFiles);
  }

  const deliverables: Deliverables = {
    phase,
    type: getDeliverablesType(phase),
    files,
    summary: generateSummary(files),
    createdAt: new Date(),
  };

  // 데이터베이스에 저장
  await saveDeliverables(taskId, deliverables);

  console.log(`Collected ${files.length} files for Phase ${phase}`);
  return deliverables;
}
```

### 대상 디렉토리 결정

```typescript
// lib/deliverables/collector.ts
function getPhaseDeliverablesDirs(phase: number): string[] {
  switch (phase) {
    case 1:
      return ['docs/planning'];
    case 2:
      return ['docs/design'];
    case 3:
      return ['src', 'tests', 'public'];
    case 4:
      return ['tests', 'docs'];
    default:
      return [];
  }
}

function getDeliverablesType(phase: number): DeliverablesType {
  return phase <= 2 ? 'documents' : 'code';
}
```

### 파일 수집

```typescript
// lib/deliverables/collector.ts
async function collectFilesFromDirectory(
  dirPath: string
): Promise<DeliverableFile[]> {
  const files: DeliverableFile[] = [];

  try {
    await fs.access(dirPath);
  } catch {
    // 디렉토리 없음
    return files;
  }

  // Glob 패턴으로 파일 찾기
  const glob = new Glob('**/*', {
    cwd: dirPath,
    nodir: true,
    ignore: [
      'node_modules/**',
      '.git/**',
      '.next/**',
      'dist/**',
      '*.log',
    ],
  });

  for await (const file of glob) {
    const absolutePath = path.join(dirPath, file);
    const stats = await fs.stat(absolutePath);

    const deliverableFile: DeliverableFile = {
      path: file,
      absolutePath,
      name: path.basename(file),
      type: getFileType(file),
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    };

    // 텍스트 파일은 내용도 읽기 (크기 제한)
    if (isTextFile(deliverableFile.type) && stats.size < 1024 * 1024) {
      deliverableFile.content = await fs.readFile(absolutePath, 'utf-8');
    }

    files.push(deliverableFile);
  }

  return files;
}
```

### 파일 타입 결정

```typescript
// lib/deliverables/collector.ts
function getFileType(filePath: string): FileType {
  const ext = path.extname(filePath).toLowerCase();

  const typeMap: Record<string, FileType> = {
    '.md': 'markdown',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.json': 'json',
    '.css': 'css',
    '.html': 'html',
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.svg': 'image',
  };

  return typeMap[ext] || 'other';
}

function isTextFile(type: FileType): boolean {
  return [
    'markdown',
    'typescript',
    'javascript',
    'json',
    'css',
    'html',
  ].includes(type);
}
```

### 요약 생성

```typescript
// lib/deliverables/collector.ts
function generateSummary(files: DeliverableFile[]): string {
  const byType = files.reduce((acc, file) => {
    acc[file.type] = (acc[file.type] || 0) + 1;
    return acc;
  }, {} as Record<FileType, number>);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);

  const parts = [
    `Total: ${files.length} files (${sizeInMB} MB)`,
  ];

  for (const [type, count] of Object.entries(byType)) {
    parts.push(`${type}: ${count}`);
  }

  return parts.join(', ');
}
```

## 결과물 저장

### 데이터베이스 저장

```typescript
// lib/deliverables/storage.ts
export async function saveDeliverables(
  taskId: string,
  deliverables: Deliverables
): Promise<void> {
  await db.deliverables.create({
    data: {
      taskId,
      phase: deliverables.phase,
      type: deliverables.type,
      files: JSON.stringify(deliverables.files),
      summary: deliverables.summary,
      createdAt: deliverables.createdAt,
    },
  });

  console.log(`Deliverables saved to database for ${taskId}, Phase ${deliverables.phase}`);
}
```

### 압축 아카이브 생성

```typescript
// lib/deliverables/archive.ts
import archiver from 'archiver';
import { createWriteStream } from 'fs';

export async function createDeliverablesArchive(
  taskId: string,
  phase: number
): Promise<string> {
  const deliverables = await getDeliverables(taskId, phase);
  const archiveDir = path.join(process.env.OUTPUT_DIRECTORY!, taskId, 'archives');
  const archiveFile = path.join(archiveDir, `phase${phase}_deliverables.zip`);

  await fs.mkdir(archiveDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const output = createWriteStream(archiveFile);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Archive created: ${archiveFile} (${archive.pointer()} bytes)`);
      resolve(archiveFile);
    });

    archive.on('error', reject);

    archive.pipe(output);

    // 파일 추가
    for (const file of deliverables.files) {
      if (file.content) {
        // 텍스트 파일
        archive.append(file.content, { name: file.path });
      } else {
        // 바이너리 파일
        archive.file(file.absolutePath, { name: file.path });
      }
    }

    archive.finalize();
  });
}
```

## 결과물 조회

### 결과물 목록 조회

```typescript
// lib/deliverables/retrieval.ts
export async function getDeliverables(
  taskId: string,
  phase: number
): Promise<Deliverables> {
  const data = await db.deliverables.findFirst({
    where: { taskId, phase },
    orderBy: { createdAt: 'desc' },
  });

  if (!data) {
    throw new Error(`Deliverables not found for ${taskId}, Phase ${phase}`);
  }

  return {
    phase: data.phase,
    type: data.type as DeliverablesType,
    files: JSON.parse(data.files as string),
    summary: data.summary,
    createdAt: data.createdAt,
  };
}
```

### 특정 파일 읽기

```typescript
// lib/deliverables/retrieval.ts
export async function getDeliverableFile(
  taskId: string,
  phase: number,
  filePath: string
): Promise<DeliverableFile | null> {
  const deliverables = await getDeliverables(taskId, phase);

  const file = deliverables.files.find(f => f.path === filePath);

  if (!file) {
    return null;
  }

  // 내용이 없으면 파일에서 읽기
  if (!file.content && isTextFile(file.type)) {
    try {
      file.content = await fs.readFile(file.absolutePath, 'utf-8');
    } catch (error) {
      console.error(`Failed to read file ${file.absolutePath}:`, error);
    }
  }

  return file;
}
```

### 전체 Task 결과물

```typescript
// lib/deliverables/retrieval.ts
export async function getAllDeliverables(
  taskId: string
): Promise<Record<number, Deliverables>> {
  const data = await db.deliverables.findMany({
    where: { taskId },
    orderBy: { phase: 'asc' },
  });

  const result: Record<number, Deliverables> = {};

  for (const item of data) {
    result[item.phase] = {
      phase: item.phase,
      type: item.type as DeliverablesType,
      files: JSON.parse(item.files as string),
      summary: item.summary,
      createdAt: item.createdAt,
    };
  }

  return result;
}
```

## API 엔드포인트

### 결과물 목록 조회

```typescript
// app/api/tasks/[id]/deliverables/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllDeliverables } from '@/lib/deliverables/retrieval';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  try {
    const deliverables = await getAllDeliverables(taskId);

    return NextResponse.json({
      success: true,
      data: { deliverables },
    });
  } catch (error) {
    console.error('Failed to get deliverables:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get deliverables' },
      { status: 500 }
    );
  }
}
```

### 특정 Phase 결과물

```typescript
// app/api/tasks/[id]/deliverables/[phase]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; phase: string } }
) {
  const taskId = params.id;
  const phase = parseInt(params.phase);

  try {
    const deliverables = await getDeliverables(taskId, phase);

    return NextResponse.json({
      success: true,
      data: { deliverables },
    });
  } catch (error) {
    console.error('Failed to get deliverables:', error);
    return NextResponse.json(
      { success: false, error: 'Deliverables not found' },
      { status: 404 }
    );
  }
}
```

### 파일 다운로드

```typescript
// app/api/tasks/[id]/deliverables/[phase]/files/[...path]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; phase: string; path: string[] } }
) {
  const taskId = params.id;
  const phase = parseInt(params.phase);
  const filePath = params.path.join('/');

  try {
    const file = await getDeliverableFile(taskId, phase, filePath);

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    // 텍스트 파일
    if (file.content) {
      return new NextResponse(file.content, {
        headers: {
          'Content-Type': getContentType(file.type),
          'Content-Disposition': `attachment; filename="${file.name}"`,
        },
      });
    }

    // 바이너리 파일
    const fileStream = await fs.readFile(file.absolutePath);
    return new NextResponse(fileStream, {
      headers: {
        'Content-Type': getContentType(file.type),
        'Content-Disposition': `attachment; filename="${file.name}"`,
      },
    });
  } catch (error) {
    console.error('Failed to download file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download file' },
      { status: 500 }
    );
  }
}

function getContentType(type: FileType): string {
  const contentTypes: Record<FileType, string> = {
    markdown: 'text/markdown',
    typescript: 'text/typescript',
    javascript: 'text/javascript',
    json: 'application/json',
    css: 'text/css',
    html: 'text/html',
    image: 'image/*',
    other: 'application/octet-stream',
  };

  return contentTypes[type] || 'application/octet-stream';
}
```

### ZIP 아카이브 다운로드

```typescript
// app/api/tasks/[id]/deliverables/[phase]/download/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; phase: string } }
) {
  const taskId = params.id;
  const phase = parseInt(params.phase);

  try {
    const archiveFile = await createDeliverablesArchive(taskId, phase);
    const fileStream = await fs.readFile(archiveFile);

    return new NextResponse(fileStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="phase${phase}_deliverables.zip"`,
      },
    });
  } catch (error) {
    console.error('Failed to create archive:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create archive' },
      { status: 500 }
    );
  }
}
```

## UI 컴포넌트

### 결과물 목록

```tsx
// components/deliverables/DeliverablesList.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DeliverablesListProps {
  taskId: string;
}

export function DeliverablesList({ taskId }: DeliverablesListProps) {
  const [deliverables, setDeliverables] = useState<Record<number, Deliverables>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliverables();
  }, [taskId]);

  async function loadDeliverables() {
    const response = await fetch(`/api/tasks/${taskId}/deliverables`);
    const data = await response.json();

    if (data.success) {
      setDeliverables(data.data.deliverables);
    }

    setLoading(false);
  }

  async function downloadPhase(phase: number) {
    window.open(`/api/tasks/${taskId}/deliverables/${phase}/download`, '_blank');
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(deliverables).map(([phase, data]) => (
        <Card key={phase}>
          <CardHeader>
            <CardTitle>Phase {phase} Deliverables</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{data.summary}</p>

            <div className="space-y-2">
              {data.files.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div>
                    <div className="font-medium">{file.name}</div>
                    <div className="text-xs text-gray-500">{file.path}</div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => downloadPhase(parseInt(phase))}
              className="mt-4"
            >
              Download Phase {phase} (ZIP)
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## 문서 동기화

### 이 문서가 변경되면 업데이트해야 할 문서

1. **`../api/tasks-api.md`** - Tasks API 명세
2. **`../../agent-manager/docs/workspace/structure.md`** - 작업 공간 구조
3. **`../README.md`** - Features 문서 목록
4. **`../../CLAUDE.md`** - 웹 서버 개발 가이드

### 이 문서를 참조하는 문서

1. **`../README.md`** - Features 문서 목록
2. **`../../CLAUDE.md`** - 웹 서버 개발 가이드
3. **`review-system.md`** - 리뷰 시스템
4. **`../api/reviews-api.md`** - Reviews API

## 다음 단계

- **리뷰 시스템**: `review-system.md` - 결과물 리뷰 프로세스
- **작업 공간 구조**: `../../agent-manager/docs/workspace/structure.md` - 파일 구조
- **Tasks API**: `../api/tasks-api.md` - API 명세

## 관련 문서

- **Workspace Structure**: `../../agent-manager/docs/workspace/structure.md`
- **Review System**: `review-system.md`
- **Tasks API**: `../api/tasks-api.md`
- **Phase Completion**: `../../agent-manager/docs/protocols/phase-completion.md`
