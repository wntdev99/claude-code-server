# Sub-Agent 작업 수행 가이드

**역할**: 서브 에이전트 (Tier 3) - 실제 작업 수행

**목적**: 이 가이드는 서브 에이전트가 작업을 수행할 때 참조하는 전반적인 가이드입니다.

## 🎯 서브 에이전트의 책임

1. **작업 수행** - Phase 기반 워크플로우 따라 작업 실행
2. **가이드 참조** - `/guide/` 폴더의 문서 읽고 적용
3. **산출물 생성** - 고품질 문서 및 코드 생성
4. **프로토콜 사용** - 플랫폼과 통신
5. **자율 실행** - 독립적으로 의사결정

## 📂 작업 디렉토리 (Workspace)

**중요**: 당신의 현재 작업 디렉토리(`cwd`)는 다음 경로로 설정되어 있습니다:

```
/projects/{task-id}/
```

여기서 `{task-id}`는 당신의 고유한 작업 식별자입니다.

### 디렉토리 구조

작업 디렉토리는 이미 다음과 같은 구조로 생성되어 있습니다:

```
/projects/{task-id}/
├── docs/
│   ├── planning/      # Phase 1 산출물 위치
│   └── design/        # Phase 2 산출물 위치
├── src/               # Phase 3 코드 작성 위치
├── .metadata/         # 시스템 메타데이터 (건드리지 마세요)
├── .checkpoints/      # 체크포인트 (자동 생성)
└── .logs/             # 로그 (자동 생성)
```

### 파일 작성 예시

**Phase 1 기획 문서 작성**:
```bash
# 절대 경로 사용 (권장하지 않음)
/projects/{task-id}/docs/planning/01_idea.md

# 상대 경로 사용 (권장)
docs/planning/01_idea.md
```

**Phase 2 설계 문서 작성**:
```bash
docs/design/01_screen.md
docs/design/02_data_model.md
```

**Phase 3 코드 작성**:
```bash
src/index.js
src/components/Button.jsx
package.json
```

### 주의사항

1. **절대 경로 대신 상대 경로 사용**: 항상 현재 작업 디렉토리 기준 상대 경로 사용
2. **시스템 디렉토리 건드리지 않기**: `.metadata/`, `.checkpoints/`, `.logs/`는 자동 관리됨
3. **가이드 문서 참조**: `/guide/` 폴더의 문서는 읽기 전용 (수정 금지)

## 📚 문서 구조

**중요**: 패키지별 상세 문서는 현재 개발 중입니다. 대신 다음 문서들을 참조하세요:

**루트 `/docs/` (프로젝트 전체 문서)**:
```
/docs/  (루트)
├── WORKFLOWS.md         # 4가지 작업 타입 워크플로우
├── PROTOCOLS.md         # 플랫폼-에이전트 통신 프로토콜
├── ARCHITECTURE.md      # 3-tier 아키텍처 (Tier 3: Sub-Agent)
└── ... (기타 문서들)
```

**가이드 문서 `/guide/` (Sub-Agent 전용 가이드)**:
```
/guide/
├── planning/        # Phase 1 기획 가이드 (9개)
├── design/          # Phase 2 설계 가이드 (5개)
├── development/     # Phase 3 개발 가이드 (6개)
└── verification/    # 검증 기준 (3개)
```

**📖 시작하기**: 루트의 `/docs/WORKFLOWS.md`를 먼저 읽어보세요.

## 🚀 빠른 시작

### 1. 작업 받았을 때

```
1. 작업 타입 확인
   → create_app / modify_app / workflow / custom

2. 워크플로우 이해
   → /docs/WORKFLOWS.md (루트)

3. Phase 1 시작
   → /guide/[phase]/01_*.md 읽기
```

### 2. 작업 타입별 가이드

| 작업 타입 | 읽을 문서 (루트 `/docs/`) |
|----------|----------|
| create_app | `/docs/WORKFLOWS.md` (Phase-A 섹션) |
| modify_app | `/docs/WORKFLOWS.md` (Phase-B 섹션) |
| workflow | `/docs/WORKFLOWS.md` (Phase-C 섹션) |
| custom | `/docs/WORKFLOWS.md` (Type-D 섹션) |

### 3. 필요한 순간에 참조

| 필요한 것 | 읽을 문서 |
|----------|----------|
| Optional Integrations 활용 | 이 문서의 "🔌 Optional Integrations" 섹션<br>`/docs/SETTINGS_SYSTEM.md` (루트) |
| 사용자 질문 | `/docs/PROTOCOLS.md` (USER_QUESTION 섹션) |
| 문서/코드 작성 규칙 | `/docs/WORKFLOWS.md` (산출물 규칙) |
| 검증 기준 | `/guide/verification/phase[N]_verification.md` |
| Phase 완료 신호 | `/docs/PROTOCOLS.md` (PHASE_COMPLETE 섹션) |

## 🔍 일반적인 작업 흐름 (create_app 예시)

```
1. 작업 이해
   → /docs/WORKFLOWS.md (Phase-A 섹션) 읽기
   → 4 Phase 워크플로우 확인

2. Phase 1: Planning
   → /guide/planning/01_idea.md 읽기
   → docs/planning/01_idea.md 생성 (500자 이상)
   → ... 9개 문서 생성
   → /guide/verification/phase1_verification.md로 자체 검증
   → /docs/PROTOCOLS.md (PHASE_COMPLETE)로 완료 신호

3. 리뷰 대기
   → 사용자 승인 대기
   → /docs/WORKFLOWS.md (Review Gate System)

4. Phase 2: Design
   → /guide/design/01_screen.md 읽기
   → ... 5개 문서 생성
   → 완료 신호

5. Phase 3: Development
   → /guide/development/01_setup.md 읽기
   → 실제 코드 프로젝트 생성
   → 완료 신호

6. Phase 4: Testing
   → Verification Agent가 자동 검증
   → /docs/WORKFLOWS.md (Phase 4 섹션)
```

## 📋 4가지 작업 타입

### create_app - 새 앱 생성
```
워크플로우: 기획(9) → 설계(5) → 개발(6) → 테스트
산출물: 14개 문서 + 실제 코드 프로젝트
가이드: /guide/planning, design, development, verification
```

#### 가이드 문서 누락 처리 (Handling Missing Guide Documents)

**문제**: `/guide/` 폴더의 가이드 파일이 누락, 이동, 또는 손상된 경우

**처리 전략**:

1. **Agent Manager의 사전 검증**
   - Sub-agent 생성 전 필수 가이드 파일 존재 확인
   - 누락 시 사용자에게 에러 보고

2. **Critical 가이드 누락** (예: 9개 planning 가이드 전부)
   - ❌ **작업 중단**: 필수 가이드 없이는 진행 불가
   - 에러 메시지: `"Cannot proceed: Required guide documents are missing"`
   - 사용자에게 알림: `/guide/` 디렉토리 복구 필요

3. **Partial 가이드 누락** (예: 9개 중 2개 누락)
   - ⚠️ **계속 진행**: 사용 가능한 가이드로 작업
   - 경고 로그: `"Warning: 2 guides missing, proceeding with available guides"`
   - 일반 지식으로 부족한 부분 보완
   - 사용자에게 품질 저하 가능성 알림

4. **Optional 가이드 누락** (예: verification 가이드)
   - ✅ **계속 진행**: 기본 검증 규칙 사용
   - 경고 로그만 출력

**검증 코드 예시**:

```typescript
// Agent Manager의 사전 검증
const requiredGuides = [
  '/guide/planning/01_idea.md',
  '/guide/planning/02_market.md',
  // ... 9개 planning 가이드
];

const missingGuides = requiredGuides.filter(path => !fs.existsSync(path));

if (missingGuides.length > 3) {
  // Critical: 3개 초과 누락
  throw new Error(
    `Critical guides missing: ${missingGuides.join(', ')}\n` +
    `Cannot start create_app workflow. Please restore guide documents.`
  );
} else if (missingGuides.length > 0) {
  // Warning: 일부 누락
  console.warn(
    `⚠️  Warning: ${missingGuides.length} guides missing\n` +
    `Proceeding with degraded quality. Missing: ${missingGuides.join(', ')}`
  );

  await notifyUser({
    type: 'warning',
    message: `Some guide documents are missing. Quality may be affected.`,
  });
}
```

**Sub-agent 내부 처리**:

```typescript
// Sub-agent가 가이드 읽기 시도
async function readGuide(guidePath: string): Promise<string> {
  try {
    return await fs.readFile(guidePath, 'utf-8');
  } catch (error) {
    console.warn(`⚠️  Guide not found: ${guidePath}`);
    console.warn(`Falling back to general knowledge for this section.`);

    // 폴백: 일반 지식 사용
    return generateFallbackGuidance(guidePath);
  }
}

function generateFallbackGuidance(guidePath: string): string {
  // 파일명에서 주제 추출 (예: "01_idea.md" → "idea")
  const topic = path.basename(guidePath, '.md').split('_')[1];

  return `
⚠️  [Fallback Guidance - Guide file missing]

This section should cover: ${topic}

Please use your general knowledge to create comprehensive content for this topic.
Ensure the output meets the quality standards (500+ characters, no placeholders).
  `.trim();
}
```

**복구 권장사항**:

- `/guide/` 디렉토리 구조 확인
- 저장소에서 가이드 재설치
- 가이드 파일 권한 확인 (읽기 가능)
- 관리자에게 문의

### modify_app - 앱 수정
```
워크플로우: 분석(3) → 계획(4) → 구현(6) → 테스트
산출물: 분석 문서 + 수정된 코드
가이드: 기존 가이드 + 수정 전략
```

#### 코드베이스 부재 처리 (Handling Missing or Empty Codebase)

**문제**: 사용자가 modify_app을 선택했지만 코드베이스 경로를 제공하지 않았거나, 경로가 비어있는 경우

**처리 전략**:

1. **사전 검증** (Agent Manager의 Pre-flight Check)
   - Workspace 디렉토리 존재 확인
   - 최소한의 소스 파일 존재 확인 (*.js, *.ts, *.py 등)
   - 프로젝트 마커 확인 (package.json, requirements.txt 등)

2. **코드베이스 미제공**
   - ❌ **작업 중단**
   - 사용자 프롬프트: `"Please provide the path to the existing codebase"`
   - 제안: `"Did you mean to create a new app? Use create_app workflow instead."`

3. **빈 디렉토리**
   - ❌ **작업 중단**
   - 에러: `"Cannot modify empty project. Use create_app workflow instead."`
   - Workflow 타입 변환 제안: `create_app`

4. **불완전한 코드베이스** (예: 빌드 산출물만 존재, 소스 없음)
   - ⚠️ **경고 후 계속**
   - 경고: `"Codebase appears incomplete (no source files found)"`
   - Phase 1 (Analysis)로 진행하되 문제 보고

**검증 코드 예시**:

```typescript
// Agent Manager의 Pre-flight validation
class CodebaseValidator {
  async validate(workspacePath: string): Promise<ValidationResult> {
    // 1. 디렉토리 존재 확인
    if (!await this.dirExists(workspacePath)) {
      return {
        valid: false,
        error: 'DIRECTORY_NOT_FOUND',
        message: `Workspace directory not found: ${workspacePath}`,
        suggestion: 'Please verify the path or create a new task.',
      };
    }

    // 2. 디렉토리 비어있는지 확인
    const files = await fs.readdir(workspacePath);
    if (files.length === 0) {
      return {
        valid: false,
        error: 'EMPTY_DIRECTORY',
        message: 'Cannot modify empty project.',
        suggestion: 'Use create_app workflow to create a new application.',
        suggestedWorkflowType: 'create_app',
      };
    }

    // 3. 소스 파일 존재 확인
    const sourceFiles = await this.findSourceFiles(workspacePath);
    if (sourceFiles.length === 0) {
      return {
        valid: false,
        error: 'NO_SOURCE_FILES',
        message: 'No source code files found in workspace.',
        suggestion: 'Only build artifacts detected. Please provide source code directory.',
      };
    }

    // 4. 프로젝트 구조 확인 (선택 사항)
    const hasProjectMarker = await this.hasProjectMarker(workspacePath);
    if (!hasProjectMarker) {
      console.warn(`⚠️  No project markers (package.json, etc.) found`);
      // 경고만 출력, 계속 진행
    }

    return {
      valid: true,
      sourceFileCount: sourceFiles.length,
      projectType: await this.detectProjectType(workspacePath),
    };
  }

  private async findSourceFiles(dirPath: string): Promise<string[]> {
    const sourceExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs'];
    const files = await this.recursiveScan(dirPath);

    return files.filter(file =>
      sourceExtensions.some(ext => file.endsWith(ext))
    );
  }

  private async hasProjectMarker(dirPath: string): Promise<boolean> {
    const markers = [
      'package.json',
      'requirements.txt',
      'pom.xml',
      'Cargo.toml',
      'go.mod',
    ];

    for (const marker of markers) {
      const markerPath = path.join(dirPath, marker);
      if (await this.fileExists(markerPath)) {
        return true;
      }
    }

    return false;
  }

  private async detectProjectType(dirPath: string): Promise<string> {
    if (await this.fileExists(path.join(dirPath, 'package.json'))) {
      return 'Node.js';
    }
    if (await this.fileExists(path.join(dirPath, 'requirements.txt'))) {
      return 'Python';
    }
    if (await this.fileExists(path.join(dirPath, 'pom.xml'))) {
      return 'Java';
    }
    return 'Unknown';
  }
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  message?: string;
  suggestion?: string;
  suggestedWorkflowType?: string;
  sourceFileCount?: number;
  projectType?: string;
}
```

**Sub-agent 시작 전 검증**:

```typescript
// Agent Manager가 Sub-agent 생성 전 호출
async function startModifyAppTask(taskId: string, workspacePath: string) {
  const validator = new CodebaseValidator();
  const validation = await validator.validate(workspacePath);

  if (!validation.valid) {
    // 검증 실패 - 사용자에게 알림
    await notifyUser(taskId, {
      type: 'error',
      title: 'Cannot Start Task',
      message: validation.message,
      suggestion: validation.suggestion,
      actions: validation.suggestedWorkflowType
        ? [{
            label: `Convert to ${validation.suggestedWorkflowType}`,
            action: 'convert_workflow_type',
            newType: validation.suggestedWorkflowType,
          }]
        : [],
    });

    // Task 상태를 'failed'로 업데이트
    await updateTaskStatus(taskId, 'failed', validation.error);
    return;
  }

  // 검증 성공 - Sub-agent 시작
  console.log(`✅ Codebase validation passed:`);
  console.log(`   - Source files: ${validation.sourceFileCount}`);
  console.log(`   - Project type: ${validation.projectType}`);

  await spawnSubAgent(taskId, {
    workflowType: 'modify_app',
    workspacePath,
    codebaseInfo: {
      fileCount: validation.sourceFileCount,
      projectType: validation.projectType,
    },
  });
}
```

**에러 메시지 예시**:

```typescript
// 코드베이스 미제공
{
  error: "No codebase found at /path/to/project. Please verify the path.",
  suggestion: "Provide the path to your existing project directory."
}

// 빈 디렉토리
{
  error: "Codebase is empty. Did you mean to create a new app?",
  suggestion: "Use create_app workflow to create a new application.",
  action: "Convert to create_app"
}

// 소스 파일 없음
{
  error: "Only build artifacts found (no source files).",
  suggestion: "Please provide the source code directory, not the build output."
}
```

**Workflow 타입 자동 변환**:

사용자가 "Convert to create_app" 버튼을 클릭하면:

```typescript
async function convertWorkflowType(taskId: string, newType: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: {
      workflowType: newType,
      status: 'pending',
    },
  });

  console.log(`✅ Task ${taskId} converted from modify_app to ${newType}`);

  // 새로운 workflow로 재시작
  await startTask(taskId);
}
```

### workflow - 워크플로우 자동화
```
워크플로우: 기획(5) → 설계(4) → 개발(5) → 테스트
산출물: 워크플로우 정의 + 구현
가이드: 워크플로우 중심 가이드
```

### custom - 자유 형식
```
워크플로우: 없음 (자유)
산출물: 요청에 따라
가이드: 필요 시 참조
```

## 🗣️ 프로토콜 사용

### 사용자 질문
```
[USER_QUESTION]
category: business
question: What pricing model?
options: [Subscription, Freemium, Ad-based]
[/USER_QUESTION]
```
→ `/docs/PROTOCOLS.md` (USER_QUESTION 섹션) 참조

### Phase 완료
```
=== PHASE 1 COMPLETE ===
Completed: Phase 1 (Planning)
Documents created:
- docs/planning/01_idea.md
- ...
```
→ `/docs/PROTOCOLS.md` (PHASE_COMPLETE 섹션) 참조

## 📝 산출물 규칙

### 문서
- **최소 길이**: 500자 이상
- **형식**: Markdown (##, ###, ####)
- **금지**: 플레이스홀더 (`[TODO]`, `[Insert X]`)
- **필수**: 모든 섹션 완성

→ `/docs/WORKFLOWS.md` (산출물 규칙) 참조

### 코드
- **구조**: 표준 프로젝트 구조
- **보안**: 비밀 정보 하드코딩 금지
- **문서**: README.md 포함
- **테스트**: 주요 기능 테스트 포함

→ `/docs/WORKFLOWS.md` (산출물 규칙) 참조

## ✅ 검증 기준

### Phase 1 (기획)
- [ ] 9개 문서 모두 존재
- [ ] 각 문서 500자 이상
- [ ] 플레이스홀더 없음
- [ ] 일관된 정보

→ `/guide/verification/phase1_verification.md` 참조

### Phase 2 (설계)
- [ ] 5개 문서 모두 존재
- [ ] 데이터 모델 명확
- [ ] API 스펙 완전
- [ ] 아키텍처 문서화

→ `/guide/verification/phase2_verification.md` 참조

### Phase 3 (개발)
- [ ] 프로젝트 구조 올바름
- [ ] 필요 파일 존재
- [ ] 테스트 포함
- [ ] .env가 .gitignore에
- [ ] 비밀 정보 하드코딩 없음

→ `/guide/verification/phase3_verification.md` 참조

## 🔌 Optional Integrations 활용

플랫폼에 설정된 Optional Integrations를 조회하고 활용할 수 있습니다.

### Settings 조회 방법

**Phase 3 (Development) 시작 시**:
1. 플랫폼 Settings를 조회 (읽기 전용)
2. Optional integration이 설정되어 있는지 확인
3. 있으면 해당 기능 사용, 없으면 graceful degradation

### GitHub Integration

```
Settings 조회 → github_token 있음:
  ✅ GitHub repository 자동 생성
  ✅ 코드 자동 push
  ✅ README에 repo URL 추가

Settings 조회 → github_token 없음:
  ✅ 로컬에만 프로젝트 저장
  ✅ README에 "수동으로 GitHub 업로드" 안내 추가:
     ```bash
     # GitHub에 업로드하기
     git init
     git add .
     git commit -m "Initial commit"
     git remote add origin [your-repo-url]
     git push -u origin main
     ```
```

### Supabase Integration

```
Settings 조회 → supabase_url, supabase_key 있음:
  ✅ Supabase 프로젝트에 DB 스키마 자동 생성
  ✅ README에 "Supabase 연결됨" 안내

Settings 조회 → supabase credentials 없음:
  ✅ README에 Supabase 수동 설정 안내:
     1. Supabase 프로젝트 생성
     2. Database → SQL Editor에서 schema.sql 실행
     3. .env에 SUPABASE_URL, SUPABASE_KEY 추가
```

### Vercel Deployment

```
Settings 조회 → vercel_token 있음:
  ✅ Vercel에 자동 배포
  ✅ README에 배포 URL 추가

Settings 조회 → vercel_token 없음:
  ✅ README에 수동 배포 안내:
     ```bash
     npm install -g vercel
     vercel login
     vercel
     ```
```

### 중요 원칙

1. **절대 요청하지 않음**: Settings에 없어도 작업을 중단하거나 요청하지 않음
2. **Graceful degradation**: 기능이 없으면 문서화만 제공
3. **사용자 경험 최우선**: README에 명확한 수동 방법 제공

## 🤔 자율 실행 가이드라인

### 스스로 결정하세요
- ✅ 구현 세부사항 (파일 구조, 네이밍)
- ✅ 기술 선택 (합리적 범위 내)
- ✅ 디자인 선택 (현대적 표준 따름)
- ✅ 코드 구조 결정

### 질문하세요
- ❓ 비즈니스 로직 (가격, 기능 우선순위)
- ❓ 모호한 요구사항
- ❓ 중대한 아키텍처 결정
- ❓ 사용자 선호도

### 절대 질문하지 마세요
- ❌ 이미 제공된 정보
- ❌ 업계 표준 사항
- ❌ 당신의 전문 영역
- ❌ 명백한 선택

## 📖 전체 문서 목록

### 루트 문서 (Root `/docs/`)
**워크플로우 및 프로토콜**:
- `/docs/WORKFLOWS.md` - 4가지 작업 타입 워크플로우 (Phase-A/B/C/D)
- `/docs/PROTOCOLS.md` - 플랫폼-에이전트 통신 프로토콜
- `/docs/ARCHITECTURE.md` - 3-tier 아키텍처 (Tier 3: Sub-Agent)

**시스템 및 참조**:
- `/docs/SETTINGS_SYSTEM.md` - 설정 시스템 (Optional Integrations)
- `/docs/FEATURES.md` - 전체 기능 명세
- `/docs/QUICK_START.md` - 빠른 시작 가이드
- `/docs/GLOSSARY.md` - 용어 정의

### 가이드 문서 (Root `/guide/`)
**Phase 1 기획** (9개):
- `/guide/planning/01_idea.md` ~ `09_roadmap.md`

**Phase 2 설계** (5개):
- `/guide/design/01_screen.md` ~ `05_architecture.md`

**Phase 3 개발** (6개):
- `/guide/development/01_setup.md` ~ `06_deploy.md`

**검증 기준** (3개):
- `/guide/verification/phase1_verification.md`
- `/guide/verification/phase2_verification.md`
- `/guide/verification/phase3_verification.md`

### 패키지별 상세 문서 (계획 중)
패키지별 상세 구현 문서는 현재 개발 중입니다.
구현 시작 시 다음 구조로 작성될 예정:
- `packages/sub-agent/docs/workflows/`
- `packages/sub-agent/docs/protocols/`
- `packages/sub-agent/docs/deliverables/`

## 💡 효율적인 작업 방법

### ✅ 좋은 방법
```
1. 가이드 먼저 읽기
   → /guide/[phase]/[step].md

2. 예시 참고
   → 가이드의 예시 활용

3. 검증 기준 확인
   → 작업 전 요구사항 이해

4. 자체 검증
   → 완료 전 체크리스트 확인
```

### ❌ 피해야 할 실수
```
1. 가이드 건너뛰기
   → 항상 가이드 참조!

2. 플레이스홀더 남기기
   → [TODO] 금지

3. 짧은 문서
   → 최소 500자

4. 불필요한 질문
   → 스스로 결정 가능한 것은 결정
```

## 🆘 문제 해결

### "무엇을 해야 할지 모르겠어요"
→ `/docs/WORKFLOWS.md` (작업 타입별 워크플로우) 읽기

### "GitHub/Supabase 연동은 어떻게 하나요?"
→ 이 문서의 "🔌 Optional Integrations 활용" 섹션 참조
→ `/docs/SETTINGS_SYSTEM.md` 참조
→ Settings에 있으면 자동 사용, 없으면 README에 수동 방법 문서화

### "사용자에게 질문해야 해요"
→ `/docs/PROTOCOLS.md` (USER_QUESTION 섹션) 사용

### "검증을 통과 못할 것 같아요"
→ `/guide/verification/phase[N]_verification.md` 재확인

## 🔄 다음 단계

1. **`/docs/WORKFLOWS.md`** (루트) 읽기
2. **작업 타입에 맞는 워크플로우** 확인 (Phase-A/B/C/D)
3. **`/guide/` 폴더** 가이드 문서 참조
4. **작업 시작**

---

**기억하세요**: 이 CLAUDE.md는 Tier 3 (Sub-Agent) 개요입니다. 상세한 내용은 루트 `/docs/` 폴더와 `/guide/` 폴더를 참조하세요!

**문서 위치**:
- 이 파일: `/packages/sub-agent/CLAUDE.md`
- 프로젝트 문서: 루트 `/docs/` (WORKFLOWS.md, PROTOCOLS.md, SETTINGS_SYSTEM.md 등)
- 가이드 문서: 루트 `/guide/` (planning, design, development, verification)
