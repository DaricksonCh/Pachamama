import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@pachamama/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import type { z } from 'zod';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminLanguageSwitcher } from '@/features/admin/admin-language';
import { useAdminLanguage } from '@/features/admin/use-admin-language';
import { safeNext } from '@/features/auth/safe-next';
import { currentUserQueryKey, useCurrentUser } from '@/features/auth/use-current-user';
import { authClient } from '@/lib/auth-client';

type LoginFormInput = z.input<typeof loginSchema>;
type LoginFormOutput = z.output<typeof loginSchema>;

/** Traduce el error de Better Auth a una clave i18n (sin revelar si el email existe). */
function loginErrorKey(error: { status?: number; code?: string }) {
  if (error.status === 429) return 'admin.login.errors.tooManyAttempts';
  if (error.code === 'BANNED_USER') return 'admin.login.errors.blocked';
  if (error.status === 401 || error.status === 400) return 'admin.login.errors.invalidCredentials';
  return 'admin.login.errors.unexpected';
}

const inputClass =
  'w-full rounded-md border border-input px-3 py-2 focus-visible:outline-2 focus-visible:outline-ring';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const next = safeNext(useSearchParams()[0].get('next'));
  const { data: user, isPending } = useCurrentUser();
  useAdminLanguage();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput, unknown, LoginFormOutput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (isPending) {
    return (
      <div className="grid min-h-dvh place-items-center" role="status" aria-busy="true">
        <Skeleton className="h-64 w-full max-w-sm" />
        <span className="sr-only">{t('admin.loading')}</span>
      </div>
    );
  }
  if (user) return <Navigate to={next} replace />;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { error } = await authClient.signIn.email(values);
      if (error) {
        setError('root', { message: loginErrorKey(error) });
        return;
      }
    } catch {
      // Sin conexión o respuesta inesperada: el usuario debe saber que no ha entrado.
      setError('root', { message: 'admin.login.errors.unexpected' });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
    await navigate(next, { replace: true });
  });

  const fieldError = (id: string, key?: string) =>
    key ? (
      <p id={id} className="text-sm text-red-700" role="alert">
        {t(key)}
      </p>
    ) : null;

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="w-full max-w-sm space-y-3">
        <div className="flex justify-end">
          <AdminLanguageSwitcher />
        </div>
        <form
          onSubmit={onSubmit}
          noValidate
          className="space-y-5 rounded-xl bg-white p-6 shadow-sm"
          aria-labelledby="login-title"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary">{t('app.name')}</p>
            <h1 id="login-title" className="font-display text-2xl font-bold">
              {t('admin.login.title')}
            </h1>
          </div>

          {errors.root?.message ? (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
              {t(errors.root.message)}
            </p>
          ) : null}

          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium">
              {t('admin.login.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={inputClass}
              {...register('email')}
            />
            {fieldError('email-error', errors.email?.message)}
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium">
              {t('admin.login.password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={inputClass}
              {...register('password')}
            />
            {fieldError('password-error', errors.password?.message)}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-selva-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          >
            {isSubmitting ? t('admin.login.submitting') : t('admin.login.submit')}
          </button>
        </form>
      </div>
    </main>
  );
}
