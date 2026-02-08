# System Diagrams (시스템 다이어그램)

이 문서는 Claude Code Server의 주요 워크플로우를 시각적으로 표현합니다.

## 포함된 다이어그램 (12개)

1. **Task 실행 전체 흐름** - 작업 생성부터 완료까지의 전체 프로세스
2. **Review Gate 프로세스** - Phase 완료 후 검증 및 리뷰 절차
3. **Settings 시스템** - 설정 사전 구성 및 환경 변수 주입 (✨ NEW)
4. **Checkpoint 생성 및 복구** - 상태 저장 및 복원 메커니즘
5. **Rate Limit 처리** - API 사용량 제한 감지 및 자동 재개
6. **3-Tier 아키텍처** - 시스템 계층 구조 및 컴포넌트
7. **Task 상태 전이** - 작업의 생명주기 상태 변화
8. **Agent 상태 전이** - 에이전트의 실행 상태 변화
9. **사용자 질문 처리** - 에이전트의 질문 및 응답 흐름
10. **검증 프로세스** - 산출물 품질 검사 절차
11. **시스템 부트스트랩** - 재시작 시 복구 프로세스
12. **SSE 스트리밍** - 실시간 로그 스트리밍

---

## 1. Task 실행 전체 흐름

```mermaid
sequenceDiagram
    actor User
    participant UI as Web UI
    participant Server as Web Server
    participant Manager as Agent Manager
    participant Agent as Sub-Agent
    participant Files as Workspace

    User->>UI: Create Task
    UI->>Server: POST /api/tasks
    Server->>Files: Create /projects/{id}/
    Server->>Manager: Assign Task
    Manager->>Agent: Spawn Process
    Agent->>Files: Read /guide/planning/
    Agent->>Files: Write docs/planning/*.md
    Agent->>Manager: === PHASE 1 COMPLETE ===
    Manager->>Manager: Pause Agent (SIGTSTP)
    Manager->>Manager: Create Checkpoint
    Manager->>Manager: Run Verification
    Manager->>Server: Phase Complete Event
    Server->>UI: SSE: phase_complete
    UI->>User: Show Review UI
    User->>UI: Approve
    UI->>Server: POST /api/reviews/{id}/approve
    Server->>Manager: Resume Agent
    Manager->>Agent: Signal (SIGCONT)
    Agent->>Files: Read /guide/design/
    Note over Agent,Files: Phase 2-4 반복...
    Agent->>Manager: All Phases Complete
    Manager->>Server: Task Complete
    Server->>UI: SSE: task_complete
    UI->>User: Show Results
```

---

## 2. Review Gate 프로세스

```mermaid
flowchart TD
    A[Agent: Phase Complete] --> B{Pause Agent}
    B --> C[Create Checkpoint]
    C --> D[Collect Deliverables]
    D --> E[Run Verification Agent]
    E --> F{Verification Pass?}
    F -->|No| G[Auto-Rework Attempt 1]
    G --> H[Agent Regenerates]
    H --> I[Re-verify]
    I --> J{Pass?}
    J -->|No| K[Auto-Rework Attempt 2]
    K --> L[Agent Regenerates]
    L --> M[Re-verify]
    M --> N{Pass?}
    N -->|No| O[Auto-Rework Attempt 3]
    O --> P[Agent Regenerates]
    P --> Q[Re-verify]
    Q --> R{Pass?}
    R -->|No| S[Notify User - Manual Intervention]
    R -->|Yes| T[Create Review]
    F -->|Yes| T
    J -->|Yes| T
    N -->|Yes| T
    T --> U[User Reviews]
    U --> V{User Decision}
    V -->|Approve| W[Resume Agent - Next Phase]
    V -->|Request Changes| X[Agent Reworks with Feedback]
    X --> Y[Re-verify]
    Y --> Z{Pass?}
    Z -->|Yes| U
    Z -->|No| S
```

---

## 3. Settings 시스템 (설정 사전 구성)

```mermaid
sequenceDiagram
    participant User as Platform Operator
    participant UI as Web UI
    participant Server as Web Server
    participant DB as Database
    participant Manager as Agent Manager
    participant Agent as Sub-Agent

    User->>UI: Configure Settings
    UI->>UI: Open Settings Page
    User->>UI: Enter Optional Integrations<br/>(github_token, vercel_token, etc.)
    UI->>Server: PATCH /api/settings
    Server->>Server: Encrypt Sensitive Values
    Server->>DB: Save Settings
    DB-->>Server: Settings Saved
    Server-->>UI: Success
    UI-->>User: Settings Updated ✅

    Note over User,Agent: Later: Task Execution

    User->>UI: Create Task
    UI->>Server: POST /api/tasks
    Server->>DB: Fetch Settings
    DB-->>Server: Return Settings
    Server->>Manager: Spawn Agent with Settings
    Manager->>Manager: Decrypt Settings
    Manager->>Agent: Create Process<br/>(env vars injected)
    Note over Agent: process.env.GITHUB_TOKEN<br/>process.env.VERCEL_TOKEN<br/>already available
    Agent->>Agent: Read Settings via env vars

    alt GitHub Token Configured
        Agent->>Agent: Create GitHub Repo
        Agent->>Agent: Push Code
    else No GitHub Token
        Agent->>Agent: Skip GitHub Integration
        Agent->>Agent: Add Manual Instructions to README
    end

    Note over Agent: Graceful degradation<br/>작업은 계속 진행
```

> **⚠️ 참고**: 이전에 사용되던 DEPENDENCY_REQUEST 프로토콜은 deprecated되었습니다. 현재는 Settings 시스템을 통해 사전에 설정을 구성합니다. 자세한 내용은 [SETTINGS_SYSTEM.md](SETTINGS_SYSTEM.md)와 [DEPENDENCY_SYSTEM.md](DEPENDENCY_SYSTEM.md) (deprecated) 참조.

---

## 4. Checkpoint 생성 및 복구

```mermaid
flowchart LR
    subgraph Creation[Checkpoint 생성]
        A1[Trigger:<br/>10분 경과 /<br/>Rate Limit /<br/>Error /<br/>Phase Complete] --> A2[Collect Agent State]
        A2 --> A3[Collect Conversation History]
        A3 --> A4[Collect Environment Variables]
        A4 --> A5[Scan Workspace]
        A5 --> A6[Create Checkpoint JSON]
        A6 --> A7[Save to<br/>.checkpoints/]
    end

    subgraph Recovery[Checkpoint 복구]
        B1[System Restart /<br/>Rate Limit Reset /<br/>User Resume] --> B2[Load Latest Checkpoint]
        B2 --> B3[Validate Workspace]
        B3 --> B4[Create Agent Process]
        B4 --> B5[Inject Environment Variables]
        B5 --> B6[Restore Conversation History]
        B6 --> B7[Resume Agent<br/>(SIGCONT)]
    end

    Creation --> Recovery
```

---

## 5. Rate Limit 처리

```mermaid
sequenceDiagram
    participant Agent as Sub-Agent
    participant Manager as Agent Manager
    participant Tracker as Token Tracker
    participant Scheduler as Scheduler
    participant User

    Agent->>Manager: API Call Output
    Manager->>Tracker: Update Token Usage
    Tracker->>Tracker: Calculate TPM
    Tracker->>Tracker: Check Limit (80000 TPM)
    alt 90% Limit Reached
        Tracker->>User: Warning: Approaching Limit
    end
    alt 100% Limit Exceeded
        Tracker->>Manager: Rate Limit Event
        Manager->>Agent: Pause (SIGTSTP)
        Manager->>Manager: Create Checkpoint
        Manager->>Tracker: Calculate Reset Time
        Tracker->>Scheduler: Schedule Resume<br/>(in 60 seconds)
        Manager->>User: Notify: Paused for Rate Limit
        Note over Scheduler: Wait 60 seconds
        Scheduler->>Tracker: Reset Token Counter
        Scheduler->>Manager: Resume Task
        Manager->>Agent: Resume (SIGCONT)
        Manager->>User: Notify: Resumed
    end
```

---

## 6. 3-Tier 아키텍처

```mermaid
graph TB
    subgraph Tier1[Tier 1: Web Server]
        UI[Web UI<br/>React + Next.js]
        API[API Routes<br/>REST + SSE]
        UI <--> API
    end

    subgraph Tier2[Tier 2: Agent Manager]
        Lifecycle[Lifecycle Manager<br/>Create/Pause/Resume]
        Parser[Protocol Parser<br/>Parse stdout]
        Checkpoint[Checkpoint Manager<br/>Save/Restore]
        Queue[Task Queue<br/>Priority/Schedule]

        Lifecycle <--> Parser
        Lifecycle <--> Checkpoint
        Lifecycle <--> Queue
    end

    subgraph Tier3[Tier 3: Sub-Agent]
        Process[Claude Code Process<br/>child_process.spawn]
        Guides[Guide Documents<br/>/guide/*.md]
        Workspace[Workspace<br/>/projects/task-id/]

        Process --> Guides
        Process --> Workspace
    end

    Tier1 <-->|HTTP/SSE| Tier2
    Tier2 <-->|Process IPC<br/>stdin/stdout/signals| Tier3

    style Tier1 fill:#e1f5ff
    style Tier2 fill:#fff3e0
    style Tier3 fill:#f3e5f5
```

---

## 7. Task 상태 전이

```mermaid
stateDiagram-v2
    [*] --> draft: User Creates
    draft --> pending: User Submits
    pending --> in_progress: Agent Assigned

    in_progress --> review: Phase Complete
    review --> in_progress: User Approves<br/>(Next Phase)
    review --> in_progress: Changes Requested<br/>(Rework)

    in_progress --> completed: All Phases Done<br/>+ Final Approval
    in_progress --> failed: Fatal Error

    completed --> [*]
    failed --> [*]

    note right of in_progress
        Phase 1 → Phase 2 → Phase 3 → Phase 4
        각 Phase 완료 시 review 상태로 전환
    end note
```

---

## 8. Agent 상태 전이

```mermaid
stateDiagram-v2
    [*] --> idle: Agent Created
    idle --> running: Task Assigned

    running --> waiting_dependency: DEPENDENCY_REQUEST
    waiting_dependency --> running: Dependency Provided

    running --> waiting_question: USER_QUESTION
    waiting_question --> running: Question Answered

    running --> waiting_review: PHASE_COMPLETE
    waiting_review --> running: Review Approved

    running --> paused: User Pause /<br/>Rate Limit
    paused --> running: User Resume /<br/>Limit Reset

    running --> completed: Task Complete
    running --> failed: Fatal Error

    completed --> [*]
    failed --> [*]
```

---

## 9. 사용자 질문 처리

```mermaid
sequenceDiagram
    participant Agent as Sub-Agent
    participant Manager as Agent Manager
    participant Server as Web Server
    participant UI as Web UI
    participant User

    Agent->>Manager: [USER_QUESTION]<br/>question: What revenue model?<br/>options: [Subscription, Freemium, Ad-based]
    Manager->>Manager: Parse Protocol
    Manager->>Manager: Pause Agent (SIGTSTP)
    Manager->>Manager: Create Checkpoint
    Manager->>Server: Question Event
    Server->>UI: SSE: question_received
    UI->>User: Show Question with Options
    User->>UI: Select "Subscription"
    UI->>Server: POST /api/questions/{id}/answer
    Server->>Manager: Provide Answer
    Manager->>Agent: Write to stdin:<br/>{"answer": "Subscription"}
    Manager->>Manager: Resume Agent (SIGCONT)
    Agent->>Agent: Read from stdin
    Note over Agent: Uses answer in execution
    Agent->>Manager: Continue with answer
```

---

## 10. 검증 프로세스

```mermaid
flowchart TD
    A[Phase Complete] --> B[Collect Deliverables]
    B --> C[Spawn Verification Agent]
    C --> D[Verification Agent Reads:<br/>- Deliverables<br/>- Verification Guide<br/>- Criteria]

    D --> E{Check File Existence}
    E -->|Missing Files| F[FAIL: Files Missing]
    E -->|All Present| G{Check Minimum Length}

    G -->|Too Short| H[FAIL: Length < 500 chars]
    G -->|Pass| I{Check Placeholders}

    I -->|Found TODO/Insert/...| J[FAIL: Placeholders Exist]
    I -->|None| K{Check Completeness}

    K -->|Sections Missing| L[FAIL: Incomplete Sections]
    K -->|Pass| M{Check Consistency}

    M -->|Contradictions| N[FAIL: Inconsistent Info]
    M -->|Pass| O[PASS: All Checks OK]

    F --> P[Generate Report]
    H --> P
    J --> P
    L --> P
    N --> P
    O --> Q[Generate Success Report]

    P --> R[Return to Agent Manager]
    Q --> R
```

---

## 11. 시스템 부트스트랩 (재시작 복구)

```mermaid
sequenceDiagram
    participant System
    participant Manager as Agent Manager
    participant FS as File System
    participant DB as Database
    participant Agent as Sub-Agent

    System->>Manager: System Start
    Manager->>FS: Scan /projects/
    FS-->>Manager: List of task directories

    loop For each task
        Manager->>FS: Read .metadata/task.json
        FS-->>Manager: Task metadata

        alt Task status = in_progress or paused
            Manager->>FS: Load latest checkpoint
            FS-->>Manager: Checkpoint data
            Manager->>DB: Sync task state
            Manager->>Agent: Create Agent Process
            Manager->>Agent: Restore conversation
            Manager->>Agent: Inject environment
            alt Status was in_progress
                Manager->>Agent: Resume (SIGCONT)
            else Status was paused
                Note over Manager,Agent: Keep paused
            end
            Manager->>System: Task Restored ✅
        else Task completed or failed
            Note over Manager: Skip restoration
        end
    end

    Manager->>System: Bootstrap Complete
```

---

## 12. SSE 스트리밍

```mermaid
sequenceDiagram
    participant Browser
    participant Server as Next.js Server
    participant Manager as Agent Manager
    participant Agent as Sub-Agent

    Browser->>Server: GET /api/tasks/{id}/stream
    Server->>Browser: HTTP 200<br/>Content-Type: text/event-stream

    Note over Server,Browser: Connection established

    loop Agent Execution
        Agent->>Manager: stdout: log output
        Manager->>Server: Emit log event
        Server->>Browser: data: {"type":"log","content":"..."}<br/><br/>

        Agent->>Manager: [DEPENDENCY_REQUEST]
        Manager->>Server: Emit dependency event
        Server->>Browser: data: {"type":"dependency","..."}<br/><br/>

        Agent->>Manager: === PHASE 1 COMPLETE ===
        Manager->>Server: Emit phase_complete
        Server->>Browser: data: {"type":"phase_complete","..."}<br/><br/>
    end

    Note over Server,Browser: Heartbeat every 30s

    Server->>Browser: : heartbeat<br/><br/>

    alt Connection Lost
        Browser->>Browser: onerror triggered
        Browser->>Server: Reconnect
    end

    alt Task Complete
        Manager->>Server: Task complete event
        Server->>Browser: data: {"type":"complete"}<br/><br/>
        Server->>Browser: Close stream
    end
```

---

## 다이어그램 사용 가이드

### Mermaid 렌더링

이 문서의 다이어그램은 [Mermaid](https://mermaid.js.org/)로 작성되었습니다.

**지원 플랫폼**:
- GitHub (자동 렌더링)
- VS Code (Markdown Preview Mermaid Support 확장)
- Notion
- Obsidian

**로컬 렌더링**:
```bash
# Mermaid CLI 설치
npm install -g @mermaid-js/mermaid-cli

# PNG 생성
mmdc -i docs/DIAGRAMS.md -o docs/diagrams.png
```

---

## 관련 문서

- **워크플로우**: `/docs/WORKFLOWS.md`
- **상태 기계**: `/docs/STATE_MACHINE.md`
- **프로토콜**: `/docs/PROTOCOLS.md`
- **아키텍처**: `/docs/ARCHITECTURE.md`

---

**최종 업데이트**: 2025-02-07
**버전**: 2.0 (Settings 시스템 다이어그램 추가, Deprecated 시스템 제거)
