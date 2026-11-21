import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useNavigate } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminLanguageSwitcher } from '@/features/admin/admin-language';
import { useAdminLanguage } from '@/features/admin/use-admin-language';
import { currentUserQueryKey, useCurrentUser } from '@/features/auth/use-current-user';
import { authClient } from '@/lib/auth-client';

/** Zona privada /admin: exige sesión. Sin sesión → /admin/login. */
export function AdminLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isPending, isError, refetch, isFetching } = useCurrentUser();
  const [signOutFailed, setSignOutFailed] = useState(false);
  useAdminLanguage();

  if (isPending) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6" role="status" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <span className="sr-only">{t('admin.loading')}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 p-6">
        <p className="text-red-800" role="alert">
          {t('admin.errors.loadFailed')}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="rounded-md border border-gray-400 px-3 py-1.5 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-brand-700"
        >
          {t('admin.retry')}
        </button>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;

  const signOut = async () => {
    setSignOutFailed(false);
    let failed: boolean;
    try {
      failed = Boolean((await authClient.signOut()).error);
    } catch {
      failed = true;
    }
    if (failed) {
      // En un equipo compartido es clave saber que la sesión NO se ha cerrado.
      setSignOutFailed(true);
      return;
    }
    queryClient.setQueryData(currentUserQueryKey, null);
    await navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <span className="font-display text-lg font-semibold text-brand-700">
            {t('app.name')} · {t('admin.title')}
          </span>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <AdminLanguageSwitcher />
            <span>
              {user.name}
              {user.role ? ` (${t(`admin.roles.${user.role}`)})` : ''}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md border border-gray-400 px-3 py-1.5 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-brand-700"
            >
              {t('admin.signOut')}
            </button>
          </div>
        </div>
        {signOutFailed ? (
          <p className="bg-red-50 px-4 py-2 text-center text-sm text-red-800" role="alert">
            {t('admin.errors.signOutFailed')}
          </p>
        ) : null}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
