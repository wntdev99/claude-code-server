# 3.5 테스트 가이드

## 목적

구현된 기능의 품질을 검증합니다.

---

## 입력

- `result/development/02_data.md` ~ `04_ui.md`

---

## 작업 항목

### 1. Jest 설정

```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

```javascript
// jest.setup.js
import '@testing-library/jest-dom';
```

### 2. 단위 테스트

```typescript
// src/lib/utils/__tests__/cn.test.ts
import { cn } from '../cn';

describe('cn', () => {
  it('단일 클래스 반환', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('여러 클래스 병합', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('조건부 클래스 처리', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('Tailwind 충돌 클래스 병합', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
```

```typescript
// src/lib/validators/__tests__/auth.test.ts
import { loginSchema, registerSchema } from '../auth';

describe('loginSchema', () => {
  it('유효한 데이터 통과', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('빈 이메일 거부', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 이메일 형식 거부', () => {
    const result = loginSchema.safeParse({
      email: 'invalid-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('짧은 비밀번호 거부', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '123',
    });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('유효한 데이터 통과', () => {
    const result = registerSchema.safeParse({
      name: '홍길동',
      email: 'test@example.com',
      password: 'password1',
      confirmPassword: 'password1',
    });
    expect(result.success).toBe(true);
  });

  it('비밀번호 불일치 거부', () => {
    const result = registerSchema.safeParse({
      name: '홍길동',
      email: 'test@example.com',
      password: 'password1',
      confirmPassword: 'password2',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('confirmPassword');
    }
  });
});
```

### 3. API 클라이언트 테스트

```typescript
// src/lib/api/__tests__/robots.test.ts
import { robotsApi } from '../robots';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('robotsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getList', () => {
    it('로봇 목록 반환', async () => {
      const mockRobots = [
        { id: '1', name: 'Robot-001', status: 'online' },
        { id: '2', name: 'Robot-002', status: 'offline' },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockRobots, error: null }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      const result = await robotsApi.getList();

      expect(result).toEqual(mockRobots);
      expect(supabase.from).toHaveBeenCalledWith('robots');
    });

    it('에러 시 예외 발생', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'ERROR', message: 'Failed' },
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await expect(robotsApi.getList()).rejects.toThrow();
    });
  });
});
```

### 4. Zustand 스토어 테스트

```typescript
// src/lib/stores/__tests__/robotStore.test.ts
import { act, renderHook } from '@testing-library/react';
import { useRobotStore } from '../robotStore';
import { robotsApi } from '@/lib/api/robots';

jest.mock('@/lib/api/robots');

describe('useRobotStore', () => {
  beforeEach(() => {
    // 스토어 초기화
    useRobotStore.setState({
      robots: [],
      isLoading: false,
      error: null,
      filter: null,
      searchQuery: '',
    });
    jest.clearAllMocks();
  });

  it('fetchRobots 성공 시 robots 업데이트', async () => {
    const mockRobots = [
      { id: '1', name: 'Robot-001', status: 'online' },
    ];
    (robotsApi.getList as jest.Mock).mockResolvedValue(mockRobots);

    const { result } = renderHook(() => useRobotStore());

    await act(async () => {
      await result.current.fetchRobots();
    });

    expect(result.current.robots).toEqual(mockRobots);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetchRobots 실패 시 error 설정', async () => {
    (robotsApi.getList as jest.Mock).mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useRobotStore());

    await act(async () => {
      await result.current.fetchRobots();
    });

    expect(result.current.error).toBe('Failed');
    expect(result.current.isLoading).toBe(false);
  });

  it('setFilter로 필터 변경', async () => {
    (robotsApi.getList as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useRobotStore());

    await act(async () => {
      result.current.setFilter('online');
    });

    expect(result.current.filter).toBe('online');
  });
});
```

### 5. 컴포넌트 테스트

```typescript
// src/components/ui/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('텍스트 렌더링', () => {
    render(<Button>클릭</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('클릭');
  });

  it('클릭 이벤트 호출', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>클릭</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('로딩 중 비활성화', () => {
    render(<Button isLoading>클릭</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('variant에 따른 스타일 적용', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary-600');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });
});
```

```typescript
// src/components/features/robots/__tests__/RobotCard.test.tsx
import { render, screen } from '@testing-library/react';
import { RobotCard } from '../RobotCard';
import type { Robot } from '@/types';

const mockRobot: Robot = {
  id: '1',
  userId: 'user-1',
  name: 'Robot-001',
  model: 'Model-X',
  status: 'online',
  battery: 85,
  location: { x: 10, y: 20, zone: 'Zone-A' },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('RobotCard', () => {
  it('로봇 정보 표시', () => {
    render(<RobotCard robot={mockRobot} />);

    expect(screen.getByText('Robot-001')).toBeInTheDocument();
    expect(screen.getByText('Model-X')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Zone-A')).toBeInTheDocument();
    expect(screen.getByText('온라인')).toBeInTheDocument();
  });

  it('상세 페이지 링크', () => {
    render(<RobotCard robot={mockRobot} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/robots/1');
  });

  it('배터리 부족 시 경고 스타일', () => {
    const lowBatteryRobot = { ...mockRobot, battery: 15 };
    render(<RobotCard robot={lowBatteryRobot} />);

    const batteryText = screen.getByText('15%');
    expect(batteryText).toHaveClass('text-red-500');
  });
});
```

### 6. 페이지 통합 테스트

```typescript
// src/app/(main)/dashboard/__tests__/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '../page';
import { useRobots } from '@/lib/hooks/useRobots';

jest.mock('@/lib/hooks/useRobots');

describe('DashboardPage', () => {
  const mockUseRobots = useRobots as jest.Mock;

  beforeEach(() => {
    mockUseRobots.mockReturnValue({
      robots: [],
      stats: { total: 0, online: 0, offline: 0, charging: 0, error: 0 },
      isLoading: false,
      error: null,
      filter: null,
      setFilter: jest.fn(),
      setSearch: jest.fn(),
      refresh: jest.fn(),
    });
  });

  it('로딩 상태 표시', () => {
    mockUseRobots.mockReturnValue({
      ...mockUseRobots(),
      isLoading: true,
    });

    render(<DashboardPage />);
    // LoadingSpinner가 있는지 확인
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('에러 상태 표시', () => {
    mockUseRobots.mockReturnValue({
      ...mockUseRobots(),
      error: '로드 실패',
    });

    render(<DashboardPage />);
    expect(screen.getByText('로드 실패')).toBeInTheDocument();
    expect(screen.getByText('다시 시도')).toBeInTheDocument();
  });

  it('빈 상태 표시', () => {
    render(<DashboardPage />);
    expect(screen.getByText('등록된 로봇이 없습니다')).toBeInTheDocument();
  });

  it('로봇 목록 표시', async () => {
    mockUseRobots.mockReturnValue({
      ...mockUseRobots(),
      robots: [
        { id: '1', name: 'Robot-001', model: 'Model-X', status: 'online' },
      ],
      stats: { total: 1, online: 1, offline: 0, charging: 0, error: 0 },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Robot-001')).toBeInTheDocument();
    });
  });
});
```

### 7. 테스트 실행

```bash
# 모든 테스트 실행
pnpm test

# 특정 파일 테스트
pnpm test src/lib/validators/

# 감시 모드
pnpm test:watch

# 커버리지 리포트
pnpm test --coverage
```

### 8. 수동 테스트 체크리스트

```markdown
## 수동 테스트 체크리스트

### 인증
- [ ] 로그인 성공
- [ ] 로그인 실패 (잘못된 비밀번호)
- [ ] 회원가입 성공
- [ ] 로그아웃

### 대시보드
- [ ] 로봇 목록 로드
- [ ] 상태별 필터링
- [ ] 검색 기능

### 로봇 상세
- [ ] 상세 정보 표시
- [ ] 수정 기능

### 에러 처리
- [ ] 네트워크 오류 시 메시지 표시
- [ ] 다시 시도 동작

### UI/UX
- [ ] 로딩 인디케이터 표시
- [ ] 빈 상태 표시
- [ ] 반응형 레이아웃
- [ ] 다크 모드 (해당시)
```

---

## 산출물 템플릿

`result/development/05_testing.md`에 작성:

```markdown
# 테스트

## 테스트 결과

```bash
pnpm test
# 결과: All tests passed
```

## 커버리지

```bash
pnpm test --coverage
# 커버리지: XX%
```

## 테스트 요약

| 구분 | 테스트 수 | 통과 | 실패 |
|------|----------|------|------|
| Unit | XX | XX | 0 |
| Component | XX | XX | 0 |
| Integration | XX | XX | 0 |

## 빌드 결과

```bash
pnpm build
# ✓ Compiled successfully
```

## 수동 테스트

- [x] 모든 체크리스트 통과

---

## 다음 단계
→ 3.6 배포 준비
```

---

## 체크리스트

- [ ] Jest 설정 완료
- [ ] 단위 테스트 통과
- [ ] 컴포넌트 테스트 통과
- [ ] 빌드 성공
- [ ] 수동 테스트 완료

---

## 다음 단계

→ `06_deploy.md` (배포 준비)
