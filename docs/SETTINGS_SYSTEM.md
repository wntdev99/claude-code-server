# Settings System (설정 시스템)

이 문서는 Claude Code Server의 Settings 시스템을 상세히 설명합니다.

---

## 📋 Overview (개요)

**Settings System**은 플랫폼 운영자가 사전에 설정을 구성하고, Sub-Agent가 실행 시 이를 읽어서 자동화된 기능을 활용하는 시스템입니다.

### 핵심 원칙

```
"Upfront Configuration, Graceful Degradation"

플랫폼 운영자가 사전에 설정을 구성하면,
Sub-Agent는 해당 기능을 자동으로 활용하고,
설정이 없으면 기능을 skip하고 수동 방법을 안내합니다.
```

### Settings vs Dependency System

| Aspect | Settings System ✅ | Dependency System ❌ (Deprecated) |
|--------|-------------------|-----------------------------------|
| **Configuration Timing** | Upfront (task 생성 전) | Just-in-Time (실행 중) |
| **User Experience** | 설정 한 번, 모든 task에 적용 | Task마다 반복 입력 |
| **Agent Execution** | 중단 없이 연속 실행 | 일시중지 → 입력 → 재개 |
| **Architecture** | 단순 (환경 변수 주입) | 복잡 (프로토콜, pause/resume) |
| **Missing Settings** | Graceful degradation | Agent 중단 및 대기 |
| **Status** | ✅ Recommended | ❌ Deprecated |

---

## 🏗️ Settings Structure (설정 구조)

### 1. Platform Settings (플랫폼 설정)

Core platform configuration that affects all tasks.

**모든 작업에 영향을 주는 핵심 플랫폼 설정입니다.**

```typescript
interface PlatformSettings {
  // Claude Code CLI Configuration
  // (CLI authentication via `claude login` separately)
  claude_model?: string;           // Default: "claude-sonnet-4-5"
  claude_max_tokens?: number;      // Default: 8000
  claude_auto_accept?: boolean;    // Auto-approve tool use (Default: false)

  // Project Storage
  output_directory: string;        // Where generated projects are saved
}
```

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `claude_model` | string | No | Claude model ID (e.g., "claude-sonnet-4-5", "claude-opus-4-6") |
| `claude_max_tokens` | number | No | Maximum tokens per request (Default: 8000) |
| `claude_auto_accept` | boolean | No | Auto-approve tool use without prompts (Default: false) |
| `output_directory` | string | **Yes** | Absolute path where projects are created |

### 2. Optional Integrations (선택적 통합)

Optional third-party integrations that Sub-Agents can automatically use if configured.

**Sub-Agent가 설정되어 있으면 자동으로 활용하는 선택적 외부 통합입니다.**

```typescript
interface OptionalIntegrations {
  // GitHub Integration
  github_token?: string;
  // When set: Sub-agent creates repository and pushes code
  // When missing: Code saved locally only, README shows manual upload instructions

  // Supabase Integration
  supabase_url?: string;
  supabase_anon_key?: string;
  // When set: Sub-agent creates DB schema automatically
  // When missing: README shows manual setup instructions

  // Vercel Deployment
  vercel_token?: string;
  // When set: Sub-agent deploys to Vercel automatically
  // When missing: README shows manual deployment instructions

  // Workflow Integrations (for workflow task type)
  notion_token?: string;
  slack_bot_token?: string;
  slack_default_channel?: string;
  // Used only in Phase-C (workflow) tasks
}
```

**Integration Details**:

| Integration | Settings Required | Auto-Enabled Feature | Fallback Behavior |
|-------------|-------------------|---------------------|-------------------|
| **GitHub** | `github_token` | Repo creation, code push, PR creation | Local save only, manual upload guide |
| **Supabase** | `supabase_url`<br/>`supabase_anon_key` | DB schema creation, migrations | Manual setup guide in README |
| **Vercel** | `vercel_token` | Automatic deployment | Manual deployment guide |
| **Notion** | `notion_token` | Notion API integration (workflow) | Skip Notion features |
| **Slack** | `slack_bot_token`<br/>`slack_default_channel` | Slack notifications (workflow) | Skip Slack features |

---

## 🔄 How Sub-Agents Use Settings (Sub-Agent의 Settings 사용)

### Execution Flow

```
1. Task Creation
   - User creates task via web UI
   - Platform settings already configured
   ↓
2. Agent Spawn
   - Agent Manager starts Sub-Agent
   - Settings injected as environment variables
   ↓
3. Phase Execution
   - Phase 1, 2: Settings not needed (planning/design only)
   - Phase 3 (Development): Agent reads settings
   ↓
4. Feature Detection
   - Check if optional integration is configured
   - If YES → Use automated feature
   - If NO → Graceful degradation
   ↓
5. Deliverable Generation
   - Use integrations if configured
   - Document manual steps in README if not
```

### Data Flow Diagram (데이터 흐름 다이어그램)

Settings가 Web Server에서 Sub-Agent까지 전달되는 전체 데이터 흐름:

```
┌─────────────────────────────────────────────────────────────────┐
│                   Web Server (Tier 1)                           │
│  - Settings stored in database (encrypted)                      │
│  - User configures settings via UI                              │
│  - Settings retrieved when creating task                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                          Settings Object
                      {platform, integrations}
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Agent Manager (Tier 2)                          │
│  - Receives settings from Web Server                            │
│  - Converts to environment variables                            │
│  - Injects into Sub-Agent process on spawn                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                       Environment Variables
                  (GITHUB_TOKEN, SUPABASE_URL, etc.)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Sub-Agent (Tier 3)                             │
│  - Reads environment variables (read-only)                      │
│  - Phase 3: Checks for optional integrations                    │
│  - If configured → Use automated feature                        │
│  - If missing → Graceful degradation                            │
└─────────────────────────────────────────────────────────────────┘
```

**데이터 전달 방식 상세**:

| Tier | Storage | Access Method | Notes |
|------|---------|---------------|-------|
| **Tier 1 (Web Server)** | Database (encrypted) | SQL queries | Settings encrypted at rest |
| **Tier 2 (Agent Manager)** | In-memory (during spawn) | Process spawn args | Settings decrypted and injected |
| **Tier 3 (Sub-Agent)** | Environment variables | `process.env.*` | Read-only access |

**보안 고려사항**:
- Web Server: Settings는 데이터베이스에 암호화되어 저장
- Agent Manager: 메모리에서만 복호화 (로그에 출력 금지)
- Sub-Agent: 환경 변수로 전달 (수정 불가)

### Read-Only Access (읽기 전용 접근)

Sub-Agents can **READ** settings but **CANNOT MODIFY** them.

**Sub-Agent는 설정을 읽을 수만 있고 수정할 수 없습니다.**

```typescript
// ✅ Allowed: Read settings
const githubToken = process.env.GITHUB_TOKEN;

// ❌ Not Allowed: Sub-Agent cannot change settings
// Settings are managed by platform operators only
```

### When Settings Are Used

| Phase | Settings Usage | Example |
|-------|----------------|---------|
| **Phase 1 (Planning)** | ❌ Not used | Planning documents don't need integrations |
| **Phase 2 (Design)** | ❌ Not used | Design documents are platform-agnostic |
| **Phase 3 (Development)** | ✅ **Used** | Deploy to Vercel, push to GitHub, create Supabase DB |
| **Phase 4 (Testing)** | ⚠️ Optional | May use integrations for E2E testing |

---

## 🎯 Graceful Degradation Pattern (우아한 성능 저하)

### Core Principle

**"설정이 없어도 작업은 계속 진행됩니다."**

**"Tasks proceed even when integrations are not configured."**

When an optional integration is missing, Sub-Agent:
1. **Skips** the automated feature
2. **Logs** a notice (e.g., "GitHub token not configured, skipping repo creation")
3. **Documents** manual steps in README.md

**선택적 통합이 설정되지 않았을 때, Sub-Agent는:**
1. 자동화 기능을 **Skip**
2. 로그에 알림 출력 (예: "GitHub 토큰이 설정되지 않아 저장소 생성을 건너뜁니다")
3. README.md에 수동 단계를 **문서화**

### Example: GitHub Integration

#### With GitHub Token ✅

```bash
# Sub-Agent behavior:
1. Create GitHub repository via API
2. Initialize git and add remote
3. Push code to repository
4. Add repository URL to README

# README.md output:
## 🚀 Deployment

Repository: https://github.com/user/my-app
```

#### Without GitHub Token ⚠️

```bash
# Sub-Agent behavior:
1. Skip repository creation
2. Save code locally only
3. Add manual upload instructions to README

# README.md output:
## 🚀 Deployment

### Manual GitHub Upload

This project is currently saved locally. To upload to GitHub:

1. Create a new repository: https://github.com/new
2. Initialize and push:
   ```bash
   git init
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```
```

### Example: Vercel Deployment

#### With Vercel Token ✅

```bash
# Sub-Agent behavior:
1. Deploy to Vercel via API
2. Configure environment variables
3. Add deployment URL to README

# Output:
✅ Deployed to Vercel: https://my-app.vercel.app
```

#### Without Vercel Token ⚠️

```bash
# Sub-Agent behavior:
1. Skip Vercel deployment
2. Add manual deployment guide to README

# README.md output:
## 🚀 Deployment

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```

3. Configure environment variables in Vercel dashboard
```

---

## 🔐 Security Considerations (보안 고려사항)

### Encryption at Rest

All sensitive settings (tokens, API keys) are **encrypted** before storage.

**모든 민감한 설정(토큰, API 키)은 저장 전 암호화됩니다.**

```typescript
// Example: Token encryption
import { encryptSecret } from '@/shared/encryption';

const encryptedToken = encryptSecret(githubToken);
await db.settings.upsert({
  key: 'github_token',
  value: encryptedToken  // ✅ Encrypted
});
```

### Environment Variable Injection

Settings are injected as environment variables to Sub-Agent process.

**설정은 환경 변수로 Sub-Agent 프로세스에 주입됩니다.**

```typescript
// Agent Manager injects settings
const agentProcess = spawn('claude', ['chat'], {
  env: {
    ...process.env,
    GITHUB_TOKEN: decryptedGithubToken,
    VERCEL_TOKEN: decryptedVercelToken,
    SUPABASE_URL: supabaseUrl,
    // ...other settings
  }
});
```

### Access Control

- **Platform Operators**: Can view and modify all settings
- **Sub-Agents**: Read-only access via environment variables
- **End Users**: Cannot access settings (managed by platform operators)

**플랫폼 운영자**: 모든 설정 조회 및 수정 가능
**Sub-Agent**: 환경 변수를 통한 읽기 전용 접근
**최종 사용자**: 설정 접근 불가 (플랫폼 운영자가 관리)

---

## 📡 API Reference (API 레퍼런스)

### Get Settings

**Endpoint**: `GET /api/settings`

**Description**: Retrieve all platform settings (tokens are masked in response)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "claude_model": "claude-sonnet-4-5",
    "claude_max_tokens": 8000,
    "claude_auto_accept": false,
    "output_directory": "/projects",
    "github_token": "ghp_***",       // Masked
    "vercel_token": "***",           // Masked
    "supabase_url": "https://...",
    "supabase_anon_key": "***"       // Masked
  }
}
```

**Note**: Sensitive values (tokens, keys) are masked with `***` in API responses. Full values are only available to Sub-Agents via environment variables.

### Update Settings

**Endpoint**: `PATCH /api/settings`

**Description**: Update one or more platform settings

**Request Body**:
```json
{
  "claude_model": "claude-opus-4-6",
  "output_directory": "/new/path",
  "github_token": "ghp_new_token_here"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "updated": ["claude_model", "output_directory", "github_token"],
    "message": "Settings updated successfully"
  }
}
```

**Validation**:
- `output_directory` must be an absolute path
- `claude_model` must be a valid Claude model ID
- `claude_max_tokens` must be between 1000 and 200000
- Token fields are automatically encrypted before storage

---

## 🛠️ Implementation Guide (구현 가이드)

### For Platform Developers (플랫폼 개발자용)

#### Step 1: Define Settings Schema

```typescript
// packages/core/src/entities/Settings.ts
export interface Settings {
  claude_model?: string;
  claude_max_tokens?: number;
  claude_auto_accept?: boolean;
  output_directory: string;

  // Optional Integrations
  github_token?: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  vercel_token?: string;
  notion_token?: string;
  slack_bot_token?: string;
  slack_default_channel?: string;
}
```

#### Step 2: Create Settings Repository

```typescript
// packages/core/src/repositories/SettingsRepository.ts
export class SettingsRepository {
  async get(): Promise<Settings> {
    const settings = await db.settings.findMany();
    return this.decryptSensitiveFields(settings);
  }

  async update(updates: Partial<Settings>): Promise<void> {
    const encrypted = this.encryptSensitiveFields(updates);
    await db.settings.upsert(encrypted);
  }

  private encryptSensitiveFields(settings: Partial<Settings>): any {
    const sensitiveKeys = [
      'github_token', 'vercel_token', 'supabase_anon_key',
      'notion_token', 'slack_bot_token'
    ];

    return Object.entries(settings).reduce((acc, [key, value]) => {
      acc[key] = sensitiveKeys.includes(key)
        ? encryptSecret(value)
        : value;
      return acc;
    }, {});
  }
}
```

#### Step 3: Inject Settings to Sub-Agent

```typescript
// packages/agent-manager/src/AgentManager.ts
export class AgentManager {
  async spawnAgent(task: Task): Promise<ChildProcess> {
    const settings = await this.settingsRepo.get();

    const agentProcess = spawn('claude', ['chat'], {
      cwd: task.workspace,
      env: {
        ...process.env,
        // Platform settings
        CLAUDE_MODEL: settings.claude_model,
        CLAUDE_MAX_TOKENS: String(settings.claude_max_tokens),
        OUTPUT_DIRECTORY: settings.output_directory,

        // Optional integrations (only if configured)
        ...(settings.github_token && { GITHUB_TOKEN: settings.github_token }),
        ...(settings.vercel_token && { VERCEL_TOKEN: settings.vercel_token }),
        ...(settings.supabase_url && { SUPABASE_URL: settings.supabase_url }),
        ...(settings.supabase_anon_key && { SUPABASE_ANON_KEY: settings.supabase_anon_key }),
      }
    });

    return agentProcess;
  }
}
```

### For Sub-Agent Developers (Sub-Agent 개발자용)

#### Reading Settings in Sub-Agent

```typescript
// Sub-Agent execution (runs in Claude Code CLI)
class SubAgent {
  async executePhase3_Development(): Promise<void> {
    // Read settings from environment variables
    const githubToken = process.env.GITHUB_TOKEN;
    const vercelToken = process.env.VERCEL_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;

    // Graceful degradation pattern
    if (githubToken) {
      await this.createGitHubRepo(githubToken);
      await this.pushCode(githubToken);
      this.readme.add('✅ Code pushed to GitHub');
    } else {
      console.log('[INFO] GitHub token not configured, skipping repo creation');
      this.readme.add('## Manual GitHub Upload\n\n[Instructions...]');
    }

    if (vercelToken) {
      const deploymentUrl = await this.deployToVercel(vercelToken);
      this.readme.add(`✅ Deployed to: ${deploymentUrl}`);
    } else {
      console.log('[INFO] Vercel token not configured, skipping deployment');
      this.readme.add('## Manual Vercel Deployment\n\n[Instructions...]');
    }

    if (supabaseUrl && process.env.SUPABASE_ANON_KEY) {
      await this.createSupabaseSchema(supabaseUrl, process.env.SUPABASE_ANON_KEY);
      this.readme.add('✅ Supabase schema created');
    } else {
      console.log('[INFO] Supabase not configured, skipping DB setup');
      this.readme.add('## Manual Supabase Setup\n\n[Instructions...]');
    }
  }
}
```

#### Best Practices

1. **Always check if setting exists before using**
   ```typescript
   if (process.env.GITHUB_TOKEN) {
     // Use GitHub integration
   } else {
     // Fallback: manual instructions
   }
   ```

2. **Log when skipping features**
   ```typescript
   console.log('[INFO] GitHub token not configured, skipping repo creation');
   ```

3. **Document manual steps in README**
   ```typescript
   if (!githubToken) {
     readme += `
       ## Manual GitHub Upload

       Create a repository and push code:
       \`\`\`bash
       git init
       git remote add origin <YOUR_REPO_URL>
       git push -u origin main
       \`\`\`
     `;
   }
   ```

4. **Never fail if optional integration is missing**
   ```typescript
   // ❌ Bad: Throws error
   if (!githubToken) throw new Error('GitHub token required');

   // ✅ Good: Graceful degradation
   if (!githubToken) {
     console.log('[INFO] Skipping GitHub integration');
     return;
   }
   ```

---

## 📚 Examples (예시)

### Example 1: Complete Settings Configuration

```json
{
  "claude_model": "claude-sonnet-4-5",
  "claude_max_tokens": 8000,
  "claude_auto_accept": false,
  "output_directory": "/home/user/projects",
  "github_token": "ghp_xxxxxxxxxxxx",
  "vercel_token": "xxxxxxxxxxxxxx",
  "supabase_url": "https://xxxxx.supabase.co",
  "supabase_anon_key": "xxxxxxxxxxxxx"
}
```

**Result**: Sub-Agent will automatically:
- Create GitHub repository
- Push code to GitHub
- Deploy to Vercel
- Create Supabase DB schema

### Example 2: Minimal Settings (No Integrations)

```json
{
  "output_directory": "/home/user/projects"
}
```

**Result**: Sub-Agent will:
- Save code locally only
- Add manual upload instructions to README
- Add manual deployment instructions to README
- Add manual DB setup instructions to README

### Example 3: Partial Integrations

```json
{
  "output_directory": "/home/user/projects",
  "github_token": "ghp_xxxxxxxxxxxx"
}
```

**Result**: Sub-Agent will:
- ✅ Create GitHub repository and push code
- ⚠️ Skip Vercel deployment (add manual instructions)
- ⚠️ Skip Supabase setup (add manual instructions)

---

## 🔧 Troubleshooting (문제 해결)

### Issue: Settings Not Available in Sub-Agent

**Symptoms**: `process.env.GITHUB_TOKEN` is `undefined`

**Possible Causes**:
1. Settings not configured in platform
2. Agent Manager not injecting environment variables
3. Environment variable name mismatch

**Solution**:
```bash
# 1. Check platform settings
curl http://localhost:3000/api/settings

# 2. Verify Agent Manager injection code
# packages/agent-manager/src/AgentManager.ts

# 3. Check environment variable naming consistency
```

### Issue: Encrypted Tokens Not Decrypting

**Symptoms**: Sub-Agent receives encrypted token string instead of plaintext

**Possible Causes**:
1. Agent Manager not decrypting before injection
2. Encryption key mismatch

**Solution**:
```typescript
// Ensure decryption in Agent Manager
const settings = await this.settingsRepo.get(); // Should auto-decrypt
```

### Issue: Graceful Degradation Not Working

**Symptoms**: Sub-Agent fails when optional integration is missing

**Possible Causes**:
1. Sub-Agent code throws error instead of skipping
2. Missing `if` check for setting existence

**Solution**:
```typescript
// ❌ Bad: Throws error
const repo = await createGitHubRepo(process.env.GITHUB_TOKEN); // undefined causes error

// ✅ Good: Check first
if (process.env.GITHUB_TOKEN) {
  const repo = await createGitHubRepo(process.env.GITHUB_TOKEN);
}
```

---

## 🎯 Key Takeaways (핵심 요약)

1. **Settings are configured upfront** by platform operators before task execution
   **설정은 작업 실행 전 플랫폼 운영자가 사전 구성**

2. **Sub-Agents have read-only access** via environment variables
   **Sub-Agent는 환경 변수를 통한 읽기 전용 접근**

3. **Graceful degradation** when optional integrations are missing
   **선택적 통합이 없을 때 우아한 성능 저하**

4. **Sensitive data is encrypted** at rest and decrypted only when injected to agents
   **민감한 데이터는 저장 시 암호화, Agent 주입 시에만 복호화**

5. **Settings replace deprecated Dependency System** for better UX and simpler architecture
   **Settings는 더 나은 UX와 단순한 아키텍처를 위해 deprecated된 Dependency System을 대체**

---

## 📖 Related Documentation (관련 문서)

- **[FEATURES.md](FEATURES.md)** - Settings specification (L. 설정 관리 섹션)
- **[API.md](API.md)** - Settings API endpoints
- **[DEPENDENCY_SYSTEM.md](DEPENDENCY_SYSTEM.md)** - ⚠️ Deprecated system (do not use)
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - How Settings fit into 3-tier architecture
- **[WORKFLOWS.md](WORKFLOWS.md)** - When settings are used in phase execution

---

**Last Updated**: 2025-02-07
**Status**: ✅ Active and Recommended
