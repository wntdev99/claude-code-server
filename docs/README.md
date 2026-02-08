# Documentation Index (문서 목록)

Welcome to the Claude Code Server documentation! This guide will help you navigate all available documentation.

Claude Code Server 문서에 오신 것을 환영합니다! 이 가이드는 모든 문서를 쉽게 탐색할 수 있도록 도와줍니다.

---

## 📍 Quick Navigation (빠른 탐색)

### New to Claude Code Server? Start Here!
**처음 사용하시나요? 여기서 시작하세요!**

1. **[QUICK_START.md](QUICK_START.md)** - 5-minute setup guide (5분 설정 가이드)
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Understand the system (시스템 이해하기)
3. **[WORKFLOWS.md](WORKFLOWS.md)** - Learn how tasks execute (작업 실행 방식 배우기)

### Working on the Project? Read These!
**프로젝트 작업 중이신가요? 이 문서들을 읽어보세요!**

1. **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development environment setup (개발 환경 설정)
2. **[FEATURES.md](FEATURES.md)** - Complete feature specification (완전한 기능 명세)
3. **[API.md](API.md)** - REST API reference (REST API 레퍼런스)

### Need Help? Check Here!
**도움이 필요하신가요? 여기를 확인하세요!**

1. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions (일반적인 문제 해결)
2. **[GLOSSARY.md](GLOSSARY.md)** - Terms and definitions (용어 정의)

---

## 📚 Documentation Structure (문서 구조)

### ⭐ Start Here

| Document | Description | When to Read |
|----------|-------------|--------------|
| **[QUICK_START.md](QUICK_START.md)** | Fast onboarding guide - get running in 5 minutes<br/>5분 안에 시작할 수 있는 빠른 온보딩 가이드 | First time setup<br/>처음 설치할 때 |

### 📖 Core Documentation (Essential Reading)
**핵심 문서 (필수 읽기)**

| Document | Description | When to Read |
|----------|-------------|--------------|
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | 3-tier system architecture, component responsibilities, data flow<br/>3계층 시스템 아키텍처, 컴포넌트 역할, 데이터 흐름 | Understanding system design<br/>시스템 설계 이해가 필요할 때 |
| **[WORKFLOWS.md](WORKFLOWS.md)** | Phase-based workflow details for all 4 task types (Phase-A/B/C, Type-D)<br/>4가지 작업 유형의 Phase-based 워크플로우 상세 정보 | Implementing workflows, understanding phases<br/>워크플로우 구현, Phase 이해가 필요할 때 |
| **[FEATURES.md](FEATURES.md)** | Complete feature specification, requirements, acceptance criteria<br/>완전한 기능 명세, 요구사항, 승인 기준 | Feature implementation, requirements clarification<br/>기능 구현, 요구사항 명확화가 필요할 때 |
| **[API.md](API.md)** | REST API reference, endpoints, request/response formats<br/>REST API 레퍼런스, 엔드포인트, 요청/응답 형식 | API integration, building clients<br/>API 통합, 클라이언트 개발 시 |
| **[DEVELOPMENT.md](DEVELOPMENT.md)** | Development environment setup, project structure, coding conventions<br/>개발 환경 설정, 프로젝트 구조, 코딩 규칙 | Initial setup, contributing to codebase<br/>초기 설정, 코드베이스에 기여할 때 |

### 🔍 Reference Documentation (Use as Needed)
**참조 문서 (필요시 사용)**

| Document | Description | When to Read |
|----------|-------------|--------------|
| **[GLOSSARY.md](GLOSSARY.md)** | Terminology and definitions used throughout the project<br/>프로젝트에서 사용되는 용어 및 정의 | Clarifying terms, onboarding new members<br/>용어 명확화, 신규 멤버 온보딩 시 |
| **[PROTOCOLS.md](PROTOCOLS.md)** | Platform-Agent communication protocols (USER_QUESTION, PHASE_COMPLETE, ERROR, etc.)<br/>Platform-Agent 통신 프로토콜 상세 정보 | Implementing agent communication, debugging protocols<br/>에이전트 통신 구현, 프로토콜 디버깅 시 |
| **[STATE_MACHINE.md](STATE_MACHINE.md)** | Agent state transitions, state lifecycle management<br/>에이전트 상태 전이, 상태 생명주기 관리 | Understanding state flow, debugging state issues<br/>상태 흐름 이해, 상태 관련 문제 디버깅 시 |
| **[DIAGRAMS.md](DIAGRAMS.md)** | System diagrams and flows (sequence diagrams, architecture diagrams)<br/>시스템 다이어그램 및 플로우 차트 | Visual understanding of system flows<br/>시스템 흐름의 시각적 이해가 필요할 때 |

### 🔧 System-Specific Documentation (Deep Dives)
**시스템별 상세 문서 (심화 학습)**

| Document | Description | When to Read |
|----------|-------------|--------------|
| **[SETTINGS_SYSTEM.md](SETTINGS_SYSTEM.md)** | ✅ **RECOMMENDED** - Settings and optional integrations, upfront configuration<br/>✅ **권장** - 설정 및 선택적 통합, 사전 구성 방식 | Configuring platform settings, optional integrations (GitHub, Vercel, etc.)<br/>플랫폼 설정 구성, 선택적 통합 (GitHub, Vercel 등) |
| **[CHECKPOINT_SYSTEM.md](CHECKPOINT_SYSTEM.md)** | Session save/restore mechanisms, checkpoint triggers, recovery process<br/>세션 저장/복원 메커니즘, 체크포인트 트리거, 복구 프로세스 | Implementing checkpoint features, debugging recovery<br/>체크포인트 기능 구현, 복구 디버깅 시 |
| **[RATE_LIMITING.md](RATE_LIMITING.md)** | Rate limit detection, auto-pause/resume, cooldown strategies<br/>Rate limit 감지, 자동 일시중지/재개, 쿨다운 전략 | Handling Claude API rate limits, optimizing token usage<br/>Claude API rate limit 처리, 토큰 사용량 최적화 시 |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** | Common issues and solutions, debugging tips, FAQ<br/>일반적인 문제 해결, 디버깅 팁, FAQ | Encountering errors, debugging issues<br/>에러 발생, 문제 디버깅 시 |
| **[DEPENDENCY_SYSTEM.md](DEPENDENCY_SYSTEM.md)** | ⚠️ **DEPRECATED** - Dependency management (use Settings system instead)<br/>⚠️ **사용 중단** - 의존성 관리 (Settings 시스템 사용 권장) | Historical reference only - DO NOT implement<br/>히스토리 참조용 - 구현하지 마세요 |

---

## 🎯 Reading Paths by Role (역할별 읽기 경로)

### For First-Time Users (처음 사용하는 사용자)
```
1. QUICK_START.md     → Fast setup
2. ARCHITECTURE.md    → Understand the system
3. WORKFLOWS.md       → Learn task execution
```

### For Developers (개발자)
```
1. DEVELOPMENT.md     → Environment setup
2. ARCHITECTURE.md    → System design
3. API.md             → API reference
4. PROTOCOLS.md       → Communication protocols
5. FEATURES.md        → Feature specifications
```

### For Contributors (기여자)
```
1. DEVELOPMENT.md     → Coding conventions
2. WORKFLOWS.md       → Phase-based execution
3. STATE_MACHINE.md   → State management
4. TROUBLESHOOTING.md → Debugging
```

### For System Architects (시스템 설계자)
```
1. ARCHITECTURE.md       → 3-tier design
2. WORKFLOWS.md          → Workflow patterns
3. DIAGRAMS.md           → Visual representations
4. CHECKPOINT_SYSTEM.md  → Persistence strategy
5. RATE_LIMITING.md      → API optimization
```

---

## 🚨 Important Notes (중요 사항)

### Deprecated Documentation (사용 중단된 문서)

**⚠️ DEPENDENCY_SYSTEM.md is DEPRECATED**
- **Status**: No longer recommended for new implementations
- **Replacement**: Use Settings system (documented in FEATURES.md "Optional Integrations" section)
- **Reason**: Settings system provides better user experience and clearer architecture
- **Action**: Do NOT implement features using DEPENDENCY_REQUEST protocol

**⚠️ DEPENDENCY_SYSTEM.md는 사용 중단되었습니다**
- **상태**: 신규 구현에 권장되지 않음
- **대체**: Settings 시스템 사용 (FEATURES.md "Optional Integrations" 섹션 참조)
- **이유**: Settings 시스템이 더 나은 사용자 경험과 명확한 아키텍처 제공
- **조치**: DEPENDENCY_REQUEST 프로토콜을 사용한 기능 구현 금지

---

## 📝 Documentation Conventions (문서 작성 규칙)

### Language Usage (언어 사용)
- **Primary Language**: English (주요 언어: 영어)
- **Secondary Language**: Korean for user-facing docs (사용자 대상 문서는 한글 병기)
- **Code Examples**: Always in English (코드 예제는 항상 영어)

### File Naming (파일 명명)
- **Format**: `UPPERCASE_WITH_UNDERSCORES.md`
- **Example**: `CHECKPOINT_SYSTEM.md`, `API.md`

### Section Structure (섹션 구조)
All major documents follow this structure:
모든 주요 문서는 다음 구조를 따릅니다:

1. **Title** - Clear, descriptive title
2. **Overview** - High-level summary (1-2 paragraphs)
3. **Detailed Content** - Organized by topic with clear headings
4. **Examples** - Code examples where applicable
5. **References** - Links to related documents

---

## 🔗 Related Resources (관련 리소스)

### External Documentation
- [Claude Code CLI Documentation](https://github.com/anthropics/claude-code)
- [Claude API Documentation](https://docs.anthropic.com/claude/reference)
- [Next.js Documentation](https://nextjs.org/docs)

### Internal Resources
- **Root CLAUDE.md**: Project-level guidance for Claude Code
- **Package-Specific CLAUDE.md**:
  - `packages/claude-code-server/CLAUDE.md` - Web server development
  - `packages/agent-manager/CLAUDE.md` - Agent orchestration
  - `packages/sub-agent/CLAUDE.md` - Task execution
- **Guide Documents**: `/guide/` directory with 24 workflow guides

---

## 📊 Documentation Coverage (문서 커버리지)

| Category | Files | Completeness | Notes |
|----------|-------|--------------|-------|
| **Core** | 5 files | ✅ 100% | All essential topics covered |
| **Reference** | 4 files | ✅ 100% | Complete reference material |
| **System-Specific** | 5 files | ✅ 100% | SETTINGS_SYSTEM.md added (recommended), DEPENDENCY_SYSTEM.md deprecated |
| **Quick Start** | 1 file | ✅ 100% | Fast onboarding complete |

**Total Documentation**: 15 files (~16,000 lines)

---

## ❓ Getting Help (도움 받기)

### Documentation Questions
1. Check [GLOSSARY.md](GLOSSARY.md) for term definitions
2. Search [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
3. Review relevant system-specific documentation

### Technical Issues
1. Consult [TROUBLESHOOTING.md](TROUBLESHOOTING.md) first
2. Check [DEVELOPMENT.md](DEVELOPMENT.md) for environment issues
3. Review [RATE_LIMITING.md](RATE_LIMITING.md) for API issues

### Feature Clarifications
1. Check [FEATURES.md](FEATURES.md) for specifications
2. Review [WORKFLOWS.md](WORKFLOWS.md) for phase requirements
3. Consult [API.md](API.md) for endpoint details

---

## 🎓 Learning Path (학습 경로)

### Beginner (초급)
**Goal**: Understand what Claude Code Server does and how to use it
**목표**: Claude Code Server가 무엇이고 어떻게 사용하는지 이해

```
Day 1: QUICK_START.md → Set up and run first task
Day 2: ARCHITECTURE.md → Understand system components
Day 3: WORKFLOWS.md → Learn Phase-A workflow
Day 4: FEATURES.md → Explore available features
Day 5: TROUBLESHOOTING.md → Learn common issues
```

### Intermediate (중급)
**Goal**: Contribute to the codebase and implement features
**목표**: 코드베이스에 기여하고 기능 구현

```
Week 1: DEVELOPMENT.md + ARCHITECTURE.md → Setup dev environment
Week 2: API.md + PROTOCOLS.md → Understand communication
Week 3: STATE_MACHINE.md + WORKFLOWS.md → Deep dive into execution
Week 4: CHECKPOINT_SYSTEM.md + RATE_LIMITING.md → Advanced features
```

### Advanced (고급)
**Goal**: Design and architect new features, optimize system
**목표**: 새로운 기능 설계 및 아키텍처 구축, 시스템 최적화

```
All Core Documentation → Master fundamentals
All System-Specific Documentation → Deep technical understanding
DIAGRAMS.md → Visual system modeling
Package-Specific CLAUDE.md files → Tier-specific implementation
```

---

## 📅 Last Updated (최종 업데이트)

**Date**: 2025-02-07
**Version**: 1.0.0
**Status**: ✅ Complete and up-to-date

---

## 📌 Quick Reference Card (빠른 참조 카드)

| I want to... | Read this |
|--------------|-----------|
| Get started quickly | [QUICK_START.md](QUICK_START.md) |
| Understand the architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Learn about workflows | [WORKFLOWS.md](WORKFLOWS.md) |
| Implement a feature | [FEATURES.md](FEATURES.md) |
| Use the API | [API.md](API.md) |
| Set up my dev environment | [DEVELOPMENT.md](DEVELOPMENT.md) |
| Look up a term | [GLOSSARY.md](GLOSSARY.md) |
| Debug a protocol issue | [PROTOCOLS.md](PROTOCOLS.md) |
| Understand state transitions | [STATE_MACHINE.md](STATE_MACHINE.md) |
| See visual diagrams | [DIAGRAMS.md](DIAGRAMS.md) |
| Implement checkpoints | [CHECKPOINT_SYSTEM.md](CHECKPOINT_SYSTEM.md) |
| Handle rate limits | [RATE_LIMITING.md](RATE_LIMITING.md) |
| Solve a problem | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |

---

**Happy Reading! 즐거운 학습 되세요!** 📚✨
