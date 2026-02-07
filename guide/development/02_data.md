# 3.2 데이터 레이어 가이드

## 목적

데이터 모델, API 클라이언트, 데이터 저장소를 구현합니다.

---

## 입력

- `result/design/02_data_model.md`
- `result/design/04_api.md`

---

## 작업 항목

### 1. 타입 정의

```typescript
// src/types/robot.ts
export type RobotStatus = 'online' | 'offline' | 'charging' | 'error';

export interface Robot {
  id: string;
  userId: string;
  name: string;
  model: string;
  status: RobotStatus;
  battery?: number;
  location?: Location;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  x: number;
  y: number;
  zone?: string;
}

// Request/Response 타입
export interface CreateRobotRequest {
  name: string;
  model: string;
}

export interface UpdateRobotRequest {
  name?: string;
  status?: RobotStatus;
}

export interface RobotListParams {
  status?: RobotStatus;
  search?: string;
  page?: number;
  limit?: number;
}
```

```typescript
// src/types/index.ts
export * from './robot';

// 공통 타입
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

### 2. API 클라이언트 구현

```typescript
// src/lib/api/robots.ts
import { supabase } from './supabase';
import type {
  Robot,
  RobotListParams,
  CreateRobotRequest,
  UpdateRobotRequest,
} from '@/types';

export const robotsApi = {
  // 로봇 목록 조회
  async getList(params?: RobotListParams): Promise<Robot[]> {
    const { status, search, page = 1, limit = 20 } = params || {};

    let query = supabase
      .from('robots')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error } = await query;

    if (error) {
      throw new ApiException(error.code, error.message);
    }

    return data as Robot[];
  },

  // 로봇 상세 조회
  async getById(id: string): Promise<Robot> {
    const { data, error } = await supabase
      .from('robots')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new ApiException(error.code, error.message);
    }

    return data as Robot;
  },

  // 로봇 생성
  async create(request: CreateRobotRequest): Promise<Robot> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new ApiException('UNAUTHORIZED', '로그인이 필요합니다.');
    }

    const { data, error } = await supabase
      .from('robots')
      .insert({
        user_id: user.id,
        ...request,
      })
      .select()
      .single();

    if (error) {
      throw new ApiException(error.code, error.message);
    }

    return data as Robot;
  },

  // 로봇 수정
  async update(id: string, request: UpdateRobotRequest): Promise<Robot> {
    const { data, error } = await supabase
      .from('robots')
      .update(request)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiException(error.code, error.message);
    }

    return data as Robot;
  },

  // 로봇 삭제
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('robots')
      .delete()
      .eq('id', id);

    if (error) {
      throw new ApiException(error.code, error.message);
    }
  },

  // 실시간 구독
  subscribeToChanges(
    userId: string,
    callback: (robots: Robot[]) => void
  ) {
    const channel = supabase
      .channel('robots-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'robots',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          // 변경 시 전체 목록 다시 조회
          const robots = await this.getList();
          callback(robots);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
```

### 3. 에러 처리

```typescript
// src/lib/utils/api-exception.ts
export class ApiException extends Error {
  code: string;
  statusCode?: number;

  constructor(code: string, message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiException';
    this.code = code;
    this.statusCode = statusCode;
  }

  static fromSupabase(error: { code: string; message: string }) {
    const message = mapErrorMessage(error.code);
    return new ApiException(error.code, message);
  }
}

function mapErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    '23505': '이미 존재하는 데이터입니다.',
    '23503': '참조하는 데이터가 존재하지 않습니다.',
    'PGRST116': '데이터를 찾을 수 없습니다.',
    'UNAUTHORIZED': '로그인이 필요합니다.',
  };

  return messages[code] || '오류가 발생했습니다. 다시 시도해주세요.';
}
```

### 4. Zustand 스토어

```typescript
// src/lib/stores/robotStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Robot, RobotStatus, RobotListParams } from '@/types';
import { robotsApi } from '@/lib/api/robots';

interface RobotState {
  // State
  robots: Robot[];
  isLoading: boolean;
  error: string | null;
  filter: RobotStatus | null;
  searchQuery: string;

  // Actions
  fetchRobots: (params?: RobotListParams) => Promise<void>;
  setFilter: (filter: RobotStatus | null) => void;
  setSearch: (query: string) => void;
  deleteRobot: (id: string) => Promise<boolean>;
  reset: () => void;
}

const initialState = {
  robots: [],
  isLoading: false,
  error: null,
  filter: null,
  searchQuery: '',
};

export const useRobotStore = create<RobotState>()(
  immer((set, get) => ({
    ...initialState,

    fetchRobots: async (params) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const { filter, searchQuery } = get();
        const robots = await robotsApi.getList({
          ...params,
          status: filter || undefined,
          search: searchQuery || undefined,
        });

        set((state) => {
          state.robots = robots;
          state.isLoading = false;
        });
      } catch (error) {
        set((state) => {
          state.isLoading = false;
          state.error = error instanceof Error ? error.message : '오류가 발생했습니다.';
        });
      }
    },

    setFilter: (filter) => {
      set((state) => {
        state.filter = filter;
      });
      get().fetchRobots();
    },

    setSearch: (query) => {
      set((state) => {
        state.searchQuery = query;
      });
      get().fetchRobots();
    },

    deleteRobot: async (id) => {
      try {
        await robotsApi.delete(id);
        set((state) => {
          state.robots = state.robots.filter((r) => r.id !== id);
        });
        return true;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : '삭제에 실패했습니다.';
        });
        return false;
      }
    },

    reset: () => {
      set(initialState);
    },
  }))
);

// 선택자 (Selectors)
export const selectFilteredRobots = (state: RobotState) => {
  const { robots, filter, searchQuery } = state;
  let filtered = robots;

  if (filter) {
    filtered = filtered.filter((r) => r.status === filter);
  }
  if (searchQuery) {
    filtered = filtered.filter((r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return filtered;
};

export const selectRobotStats = (state: RobotState) => {
  const { robots } = state;
  return {
    total: robots.length,
    online: robots.filter((r) => r.status === 'online').length,
    offline: robots.filter((r) => r.status === 'offline').length,
    charging: robots.filter((r) => r.status === 'charging').length,
    error: robots.filter((r) => r.status === 'error').length,
  };
};
```

### 5. 커스텀 훅

```typescript
// src/lib/hooks/useRobots.ts
'use client';

import { useEffect } from 'react';
import { useRobotStore, selectFilteredRobots, selectRobotStats } from '@/lib/stores/robotStore';

export function useRobots() {
  const {
    isLoading,
    error,
    filter,
    searchQuery,
    fetchRobots,
    setFilter,
    setSearch,
    deleteRobot,
  } = useRobotStore();

  const robots = useRobotStore(selectFilteredRobots);
  const stats = useRobotStore(selectRobotStats);

  useEffect(() => {
    fetchRobots();
  }, [fetchRobots]);

  return {
    robots,
    stats,
    isLoading,
    error,
    filter,
    searchQuery,
    setFilter,
    setSearch,
    deleteRobot,
    refresh: fetchRobots,
  };
}
```

```typescript
// src/lib/hooks/useRobot.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { robotsApi } from '@/lib/api/robots';
import type { Robot } from '@/types';

export function useRobot(id: string) {
  const [robot, setRobot] = useState<Robot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRobot = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await robotsApi.getById(id);
      setRobot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로봇 정보를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRobot();
  }, [fetchRobot]);

  return {
    robot,
    isLoading,
    error,
    refresh: fetchRobot,
  };
}
```

### 6. API Route Handler (Server)

```typescript
// src/app/api/robots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase.from('robots').select('*');

    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('robots')
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
```

---

## 산출물 템플릿

`result/development/02_data.md`에 작성:

```markdown
# 데이터 레이어

## 구현 완료

### 타입 정의
- [x] Robot
- [x] User
- [x] Alert
- [x] Request/Response 타입

### API 클라이언트
- [x] robotsApi
- [x] authApi
- [x] 에러 처리

### Zustand 스토어
- [x] useRobotStore
- [x] useAuthStore

### 커스텀 훅
- [x] useRobots
- [x] useRobot

## 테스트

```bash
pnpm test src/lib/
```

- [x] API 클라이언트 단위 테스트
- [x] 스토어 테스트

---

## 다음 단계
→ 3.3 비즈니스 로직
```

---

## 체크리스트

- [ ] 모든 타입 정의 완료
- [ ] API 클라이언트 구현
- [ ] Zustand 스토어 설정
- [ ] 커스텀 훅 구현
- [ ] 에러 처리 통합

---

## 다음 단계

→ `03_logic.md` (비즈니스 로직)
