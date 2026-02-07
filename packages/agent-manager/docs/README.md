# Agent Manager 문서

이 폴더는 에이전트 관리자 개발에 필요한 모든 문서를 포함합니다.

## 📂 폴더 구조

### `lifecycle/` - 에이전트 생명주기 관리
에이전트 프로세스의 생성, 시작, 일시중지, 재개, 종료 등 생명주기 관리

- **README.md** - 생명주기 문서 개요
- **creation.md** - 에이전트 생성
- **execution.md** - 에이전트 실행 및 제어
- **termination.md** - 에이전트 종료 및 정리

### `protocols/` - 프로토콜 처리
에이전트 출력에서 프로토콜 감지 및 처리

- **README.md** - 프로토콜 문서 개요
- **dependency.md** - 의존성 요청 처리
- **question.md** - 사용자 질문 처리
- **phase-completion.md** - Phase 완료 처리
- **error.md** - 에러 감지 및 처리

### `queue/` - 대기열 관리
Task 대기열 및 우선순위 관리

- **README.md** - 대기열 문서 개요
- **priority.md** - 우선순위 관리
- **dependency.md** - 의존성 기반 스케줄링

### `checkpoint/` - Checkpoint 시스템
에이전트 상태 저장 및 복구

- **README.md** - Checkpoint 문서 개요
- **creation.md** - Checkpoint 생성
- **restoration.md** - Checkpoint 복구

### `monitoring/` - 모니터링
상태 추적, 토큰 관리, Rate Limit 처리

- **README.md** - 모니터링 문서 개요
- **status-tracking.md` - 상태 추적
- **token-management.md** - 토큰 사용량 추적
- **rate-limit.md** - Rate Limit 처리

## 🎯 사용 방법

### 처음 시작할 때
```
1. lifecycle/README.md - 생명주기 관리 이해
2. protocols/README.md - 프로토콜 처리 이해
3. monitoring/status-tracking.md - 상태 추적 방법
```

### 특정 기능 구현할 때
| 구현할 기능 | 읽을 문서 |
|------------|----------|
| 에이전트 생성 | `lifecycle/creation.md` |
| 프로토콜 파싱 | `protocols/[해당프로토콜].md` |
| 토큰 추적 | `monitoring/token-management.md` |
| Checkpoint | `checkpoint/creation.md` |
| 대기열 관리 | `queue/priority.md` |

## 📚 참조 순서

일반적인 개발 흐름:

```
1. 에이전트 생명주기 이해
   → lifecycle/README.md

2. 프로토콜 처리 구현
   → protocols/README.md
   → protocols/[각 프로토콜].md

3. 모니터링 구현
   → monitoring/status-tracking.md
   → monitoring/token-management.md

4. Checkpoint 시스템
   → checkpoint/README.md

5. 대기열 관리
   → queue/README.md
```

## 🔗 관련 문서

- **패키지 루트**: `../README.md` - 패키지 전체 개요
- **개발 가이드**: `../CLAUDE.md` - 전반적인 개발 가이드
- **웹 서버**: `../../claude-code-server/docs/` - 웹 서버 문서
- **서브 에이전트**: `../../sub-agent/docs/` - 서브 에이전트 문서
