# 3.3 비즈니스 로직 가이드

## 목적

핵심 비즈니스 로직, 인증, 폼 유효성 검사를 구현합니다.

---

## 입력

- `result/design/03_task_flow.md`
- `result/development/02_data.md`

---

## 작업 항목

### 1. 인증 스토어

```typescript
// src/lib/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/api/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      error: null,

      initialize: async () => {
        set({ isLoading: true });

        // 현재 세션 확인
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          set({
            user: session.user,
            session,
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }

        // 인증 상태 변경 리스너
        supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            set({ user: session.user, session });
          } else {
            set({ user: null, session: null });
          }
        });
      },

      signIn: async (email, password) => {
        set({ isLoading: true, error: null });

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          set({
            isLoading: false,
            error: mapAuthError(error.message),
          });
          return false;
        }

        set({
          user: data.user,
          session: data.session,
          isLoading: false,
        });
        return true;
      },

      signUp: async (email, password, name) => {
        set({ isLoading: true, error: null });

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
          },
        });

        if (error) {
          set({
            isLoading: false,
            error: mapAuthError(error.message),
          });
          return false;
        }

        set({ isLoading: false });
        return true;
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
);

function mapAuthError(message: string): string {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'Email not confirmed': '이메일 인증이 필요합니다.',
    'User already registered': '이미 등록된 이메일입니다.',
    'Password should be at least 6 characters': '비밀번호는 6자 이상이어야 합니다.',
  };

  return errorMap[message] || '오류가 발생했습니다. 다시 시도해주세요.';
}
```

### 2. 폼 유효성 검사 (Zod)

```typescript
// src/lib/validators/auth.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요.')
    .email('올바른 이메일 형식이 아닙니다.'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요.')
    .min(6, '비밀번호는 6자 이상이어야 합니다.'),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, '이름을 입력해주세요.')
    .min(2, '이름은 2자 이상이어야 합니다.'),
  email: z
    .string()
    .min(1, '이메일을 입력해주세요.')
    .email('올바른 이메일 형식이 아닙니다.'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요.')
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)/,
      '비밀번호는 영문자와 숫자를 포함해야 합니다.'
    ),
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다.',
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
```

```typescript
// src/lib/validators/robot.ts
import { z } from 'zod';

export const createRobotSchema = z.object({
  name: z
    .string()
    .min(1, '로봇 이름을 입력해주세요.')
    .max(50, '로봇 이름은 50자 이하여야 합니다.'),
  model: z
    .string()
    .min(1, '모델명을 입력해주세요.'),
});

export const updateRobotSchema = z.object({
  name: z
    .string()
    .min(1, '로봇 이름을 입력해주세요.')
    .max(50, '로봇 이름은 50자 이하여야 합니다.')
    .optional(),
  status: z
    .enum(['online', 'offline', 'charging', 'error'])
    .optional(),
});

export type CreateRobotInput = z.infer<typeof createRobotSchema>;
export type UpdateRobotInput = z.infer<typeof updateRobotSchema>;
```

### 3. 폼 컴포넌트 (React Hook Form + Zod)

```typescript
// src/components/features/auth/LoginForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { loginSchema, type LoginInput } from '@/lib/validators/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginForm() {
  const router = useRouter();
  const { signIn, isLoading, error, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    const success = await signIn(data.email, data.password);
    if (success) {
      router.push('/dashboard');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="이메일"
        type="email"
        {...register('email')}
        error={errors.email?.message}
        onChange={() => error && clearError()}
      />

      <Input
        label="비밀번호"
        type="password"
        {...register('password')}
        error={errors.password?.message}
        onChange={() => error && clearError()}
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Button
        type="submit"
        isLoading={isLoading}
        className="w-full"
      >
        로그인
      </Button>
    </form>
  );
}
```

### 4. 인증 보호 (Middleware)

```typescript
// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/register', '/forgot-password'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isPublicPath = publicPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  // 로그인하지 않은 사용자가 보호된 페이지 접근
  if (!session && !isPublicPath) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 로그인한 사용자가 로그인 페이지 접근
  if (session && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 5. 인증 컨텍스트 (클라이언트)

```typescript
// src/components/providers/AuthProvider.tsx
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
```

### 6. 비즈니스 로직 훅

```typescript
// src/lib/hooks/useCreateRobot.ts
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { robotsApi } from '@/lib/api/robots';
import { useRobotStore } from '@/lib/stores/robotStore';
import type { CreateRobotInput } from '@/lib/validators/robot';

export function useCreateRobot() {
  const router = useRouter();
  const fetchRobots = useRobotStore((state) => state.fetchRobots);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRobot = async (data: CreateRobotInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const robot = await robotsApi.create(data);
      await fetchRobots(); // 목록 새로고침
      router.push(`/robots/${robot.id}`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '로봇 생성에 실패했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createRobot,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}
```

```typescript
// src/lib/hooks/useUpdateRobot.ts
'use client';

import { useState } from 'react';
import { robotsApi } from '@/lib/api/robots';
import type { UpdateRobotInput } from '@/lib/validators/robot';

export function useUpdateRobot(id: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRobot = async (data: UpdateRobotInput) => {
    setIsLoading(true);
    setError(null);

    try {
      await robotsApi.update(id, data);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '로봇 수정에 실패했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateRobot,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}
```

### 7. 서버 액션 (Server Actions)

```typescript
// src/app/actions/robots.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function createRobotAction(formData: FormData) {
  const name = formData.get('name') as string;
  const model = formData.get('model') as string;

  const { data, error } = await supabase
    .from('robots')
    .insert({ name, model })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/robots');
  return { success: true, data };
}

export async function deleteRobotAction(id: string) {
  const { error } = await supabase
    .from('robots')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/robots');
  return { success: true };
}
```

---

## 산출물 템플릿

`result/development/03_logic.md`에 작성:

```markdown
# 비즈니스 로직

## 구현 완료

### 인증
- [x] useAuthStore
- [x] AuthProvider
- [x] Middleware (인증 보호)
- [x] 로그인/회원가입 폼

### 유효성 검사
- [x] loginSchema
- [x] registerSchema
- [x] createRobotSchema
- [x] updateRobotSchema

### 비즈니스 훅
- [x] useCreateRobot
- [x] useUpdateRobot

### 서버 액션
- [x] createRobotAction
- [x] deleteRobotAction

## 로직 플로우 확인

- [x] 로그인 → 대시보드 이동
- [x] 로봇 생성 → 목록 갱신 → 상세 이동
- [x] 폼 유효성 검사 동작

---

## 다음 단계
→ 3.4 UI 구현
```

---

## 체크리스트

- [ ] 인증 스토어 구현
- [ ] Zod 스키마 정의
- [ ] 폼 컴포넌트 구현
- [ ] 인증 미들웨어 설정
- [ ] 비즈니스 훅 구현
- [ ] 서버 액션 구현

---

## 다음 단계

→ `04_ui.md` (UI 구현)
