# workflow 워크플로우

## 개요

워크플로우 자동화 스크립트나 자동화 시스템을 만드는 워크플로우입니다.

> **대상**: 서브 에이전트가 `workflow` 타입 작업을 수행할 때 참조

> **예시**: CI/CD 파이프라인, 데이터 처리 워크플로우, 크론 작업, 자동화 스크립트

## 워크플로우 구조

```
Phase 1: Planning (기획) - 워크플로우 설계
    ↓ 리뷰 게이트
Phase 2: Design (설계) - 상세 설계
    ↓ 리뷰 게이트
Phase 3: Development (개발) - 구현
    ↓ 리뷰 게이트
Phase 4: Testing (테스트) - 검증
    ↓
완료
```

## Phase 1: Planning (기획)

### 목표
워크플로우의 목적과 요구사항을 정의합니다.

### Steps (5단계)

#### Step 1: 워크플로우 목적 정의

**산출물**: `docs/planning/01_purpose.md`

**내용**:
- 워크플로우가 해결하는 문제
- 자동화 대상 작업
- 예상 효과 (시간 절약, 오류 감소 등)
- 실행 빈도 (매일, 매주, 이벤트 기반 등)

**예시**:
```markdown
# 워크플로우 목적

## 문제 정의
매주 월요일 아침마다 지난 주 데이터를 수집하고 보고서를 생성하는 작업이 수동으로 이루어지고 있음.
- 시간 소요: 약 2시간
- 오류 발생률: 높음 (수동 복사/붙여넣기)

## 자동화 목표
- 매주 월요일 오전 9시에 자동 실행
- 데이터베이스에서 데이터 수집
- Excel 보고서 생성
- 이메일로 발송

## 예상 효과
- 시간 절약: 주당 2시간 → 0시간
- 정확도 향상: 수동 오류 제거
- 일관성: 항상 같은 형식의 보고서
```

#### Step 2: 트리거 정의

**산출물**: `docs/planning/02_triggers.md`

**내용**:
- 트리거 타입 (스케줄, 웹훅, 파일 변경, 수동 등)
- 트리거 조건
- 트리거 빈도

**트리거 타입**:
```markdown
1. **스케줄 기반**
   - Cron 표현식: `0 9 * * 1` (매주 월요일 9시)

2. **이벤트 기반**
   - GitHub webhook (push, PR 생성)
   - 파일 시스템 변경 감지
   - API 호출

3. **수동 실행**
   - CLI 커맨드
   - 웹 UI 버튼
```

#### Step 3: 워크플로우 단계 정의

**산출물**: `docs/planning/03_steps.md`

**내용**:
- 각 단계 목록
- 단계별 입력/출력
- 단계 간 의존성
- 에러 처리 전략

#### Step 4: 통합 대상 정의

**산출물**: `docs/planning/04_integrations.md`

**내용**:
- 연동할 외부 서비스 (API, 데이터베이스 등)
- 필요한 인증 정보
- 데이터 포맷

#### Step 5: 성공 기준

**산출물**: `docs/planning/05_success.md`

**내용**:
- 성공 조건
- 실패 조건
- 알림 방법
- 로깅 전략

## Phase 2: Design (설계)

### 목표
워크플로우의 상세 설계를 작성합니다.

### Steps (4단계)

#### Step 1: 플로우 다이어그램

**산출물**: `docs/design/01_flowchart.md`

**내용**:
- 텍스트 기반 플로우차트
- 각 단계의 흐름
- 조건 분기
- 에러 처리 경로

**예시**:
```markdown
# 워크플로우 플로우차트

```
START
  │
  ├─ [트리거] 매주 월요일 09:00
  │
  ├─ [Step 1] 데이터베이스 연결
  │    ├─ 성공 → Step 2
  │    └─ 실패 → 재시도 (최대 3회) → 실패 시 알림 → END
  │
  ├─ [Step 2] 지난 주 데이터 조회
  │    ├─ 데이터 있음 → Step 3
  │    └─ 데이터 없음 → 경고 알림 → END
  │
  ├─ [Step 3] 데이터 변환 및 집계
  │    └─ Step 4
  │
  ├─ [Step 4] Excel 파일 생성
  │    ├─ 성공 → Step 5
  │    └─ 실패 → 에러 로그 → 알림 → END
  │
  ├─ [Step 5] 이메일 발송
  │    ├─ 성공 → 성공 로그 → END
  │    └─ 실패 → 재시도 (최대 2회) → 알림 → END
```
```

#### Step 2: 데이터 스키마

**산출물**: `docs/design/02_data_schema.md`

**내용**:
- 입력 데이터 구조
- 중간 데이터 구조
- 출력 데이터 구조

#### Step 3: 에러 처리 설계

**산출물**: `docs/design/03_error_handling.md`

**내용**:
- 에러 타입별 처리 방법
- 재시도 로직
- 폴백(fallback) 전략
- 알림 전략

#### Step 4: 모니터링 설계

**산출물**: `docs/design/04_monitoring.md`

**내용**:
- 로그 포맷
- 메트릭 수집
- 알림 규칙
- 대시보드 설계

## Phase 3: Development (개발)

### 목표
워크플로우를 실제로 구현합니다.

### Steps (5단계)

#### Step 1: 프로젝트 설정

**작업**:
- 프로젝트 구조 생성
- 의존성 설치
- 환경 변수 설정

**예시 구조**:
```
workflow-project/
├── src/
│   ├── steps/
│   │   ├── fetchData.ts
│   │   ├── transformData.ts
│   │   ├── generateReport.ts
│   │   └── sendEmail.ts
│   ├── utils/
│   │   ├── database.ts
│   │   ├── logger.ts
│   │   └── retry.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── tests/
├── .env.example
├── package.json
└── README.md
```

#### Step 2: 유틸리티 함수 구현

```typescript
// src/utils/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// src/utils/logger.ts
export function logInfo(message: string, meta?: any) {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
}

export function logError(message: string, error: Error) {
  console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
}
```

#### Step 3: 워크플로우 단계 구현

```typescript
// src/steps/fetchData.ts
import { db } from '../utils/database';
import { logInfo } from '../utils/logger';

export async function fetchData() {
  logInfo('Fetching data from database...');

  const startDate = getLastWeekStart();
  const endDate = getLastWeekEnd();

  const data = await db.query(`
    SELECT * FROM sales
    WHERE created_at BETWEEN $1 AND $2
  `, [startDate, endDate]);

  logInfo(`Fetched ${data.rows.length} records`);
  return data.rows;
}

// src/steps/generateReport.ts
import ExcelJS from 'exceljs';

export async function generateReport(data: any[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Weekly Report');

  // 헤더
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Product', key: 'product', width: 30 },
    { header: 'Sales', key: 'sales', width: 15 },
  ];

  // 데이터 추가
  data.forEach(row => {
    worksheet.addRow(row);
  });

  // 파일 저장
  const fileName = `report_${new Date().toISOString().split('T')[0]}.xlsx`;
  await workbook.xlsx.writeFile(fileName);

  return fileName;
}
```

#### Step 4: 메인 워크플로우 조합

```typescript
// src/index.ts
import { fetchData } from './steps/fetchData';
import { transformData } from './steps/transformData';
import { generateReport } from './steps/generateReport';
import { sendEmail } from './steps/sendEmail';
import { withRetry } from './utils/retry';
import { logInfo, logError } from './utils/logger';

export async function runWorkflow() {
  try {
    logInfo('Starting workflow...');

    // Step 1: 데이터 조회 (재시도 포함)
    const rawData = await withRetry(() => fetchData(), 3);

    if (rawData.length === 0) {
      logInfo('No data found, skipping workflow');
      return;
    }

    // Step 2: 데이터 변환
    const transformedData = await transformData(rawData);

    // Step 3: 보고서 생성
    const reportFile = await generateReport(transformedData);
    logInfo(`Report generated: ${reportFile}`);

    // Step 4: 이메일 발송 (재시도 포함)
    await withRetry(() => sendEmail(reportFile), 2);

    logInfo('Workflow completed successfully');
  } catch (error) {
    logError('Workflow failed', error as Error);

    // 실패 알림
    await notifyFailure(error as Error);

    process.exit(1);
  }
}

// 스케줄러 설정 (cron)
if (require.main === module) {
  runWorkflow();
}
```

#### Step 5: 스케줄러 설정

```typescript
// src/scheduler.ts
import cron from 'node-cron';
import { runWorkflow } from './index';

// 매주 월요일 오전 9시 실행
cron.schedule('0 9 * * 1', () => {
  console.log('Scheduled workflow starting...');
  runWorkflow();
});

console.log('Workflow scheduler started');
```

**또는 GitHub Actions**:
```yaml
# .github/workflows/weekly-report.yml
name: Weekly Report

on:
  schedule:
    - cron: '0 9 * * 1'  # 매주 월요일 09:00 UTC
  workflow_dispatch:  # 수동 실행 가능

jobs:
  generate-report:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run workflow
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          SMTP_HOST: ${{ secrets.SMTP_HOST }}
          SMTP_USER: ${{ secrets.SMTP_USER }}
          SMTP_PASS: ${{ secrets.SMTP_PASS }}
        run: npm run workflow
```

## Phase 4: Testing (테스트)

### 목표
워크플로우가 예상대로 동작하는지 검증합니다.

### Steps (3단계)

#### Step 1: 단위 테스트

각 단계별 함수 테스트

#### Step 2: 통합 테스트

전체 워크플로우 테스트 (테스트 데이터 사용)

#### Step 3: 수동 실행 테스트

실제 환경에서 수동 실행하여 검증

## 의존성 요청 예시

```
[DEPENDENCY_REQUEST]
type: env_variable
name: DATABASE_URL
description: PostgreSQL database connection string
required: true
[/DEPENDENCY_REQUEST]

[DEPENDENCY_REQUEST]
type: env_variable
name: SMTP_HOST
description: SMTP server for sending emails
required: true
[/DEPENDENCY_REQUEST]
```

## 완료 신호

```
=== PHASE 4 COMPLETE ===
Completed: workflow automation
Workflow created: Weekly Sales Report Generator

Features:
- Scheduled execution (every Monday 9 AM)
- Automatic data collection from database
- Excel report generation
- Email delivery with retry logic
- Error handling and notifications

Files:
- src/index.ts (main workflow)
- src/scheduler.ts (cron setup)
- src/steps/* (individual steps)
- tests/* (unit and integration tests)
- README.md (usage instructions)

Ready to deploy ✅
```

## 관련 문서

- **Create App**: `create-app.md`
- **Modify App**: `modify-app.md`
- **Custom**: `custom.md`
- **Deliverables**: `../deliverables/code.md`
