import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminLanguageSwitcher } from '@/features/admin/admin-language';
import { AdminSidebar } from '@/features/admin/admin-sidebar';
import { useAdminLanguage } from '@/features/admin/use-admin-language';
import { currentUserQueryKey, useCurrentUser } from '@/features/auth/use-current-user';
import { authClient } from '@/lib/auth-client';

/** Zona privada /admin: exige sesión. Sin sesión → /admin/login?next=<ruta actual>. */
export function AdminLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: user, isPending, isError, refetch, isFetching } = useCurrentUser();
  const [signOutFailed, setSignOutFailed] = useState(false);
  useAdminLanguage();

  // Cada cambio de sección revalida la sesión: si caducó o se cerró en otra pestaña,
  // el usuario va al login enseguida, aunque la vista nueva no pida datos.
  const lastPath = useRef(location.pathname);
  useEffect(() => {
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;
    void queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
  }, [location.pathname, queryClient]);

  if (isPending) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6" role="status" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <span className="sr-only">{t('admin.loading')}</span>
      </div>
    );
  }

  // Un fallo al revalidar con sesión ya cargada no debe tirar el panel abajo.
  if (isError && !user) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 p-6">
        <p className="text-destructive" role="alert">
          {t('admin.errors.loadFailed')}
        </p>
        <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          {t('admin.retry')}
        </Button>
      </div>
    );
  }

  if (!user) {
    const here = location.pathname + location.search;
    const next = here === '/admin' ? '' : `?next=${encodeURIComponent(here)}`;
    return <Navigate to={`/admin/login${next}`} replace />;
  }

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
    <>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background px-4 py-2 text-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:outline-2 focus:outline-ring"
      >
        {t('admin.nav.skipToContent')}
      </a>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <header className="border-b bg-card">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <SidebarTrigger aria-label={t('admin.nav.open')} />
              <Separator orientation="vertical" className="hidden h-6 sm:block" />
              <span className="font-display text-lg font-semibold text-primary">
                {t('admin.title')}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
                <AdminLanguageSwitcher />
                <span>
                  {user.name}
                  {user.role ? ` (${t(`admin.roles.${user.role}`)})` : ''}
                </span>
                <Button variant="outline" size="sm" onClick={() => void signOut()}>
                  <LogOut aria-hidden="true" />
                  {t('admin.signOut')}
                </Button>
              </div>
            </div>
            {signOutFailed ? (
              <p className="bg-red-50 px-4 py-2 text-center text-sm text-red-800" role="alert">
                {t('admin.errors.signOutFailed')}
              </p>
            ) : null}
          </header>
          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-6xl px-4 py-8 outline-none"
          >
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </>
  );
}
