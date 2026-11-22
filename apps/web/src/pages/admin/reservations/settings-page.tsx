import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentUser } from '@/features/auth/use-current-user';
import { LoadError, LoadingBlock } from '@/features/menu/load-states';
import { UnsavedChangesDialog } from '@/features/menu/unsaved-changes-dialog';
import { useUnsavedChanges } from '@/features/menu/use-unsaved-changes';
import { ClosuresList } from '@/features/reservations/admin/closures-list';
import { HoursForm } from '@/features/reservations/admin/hours-form';
import {
  useClosures,
  useHours,
  useReservationSettings,
  useTemplates,
} from '@/features/reservations/admin/settings-api';
import { SettingsForm } from '@/features/reservations/admin/settings-form';
import { TemplatesForm } from '@/features/reservations/admin/templates-form';

const TAB_IDS = ['hours', 'closures', 'settings', 'templates'] as const;
const LOADING_ROWS = ['h-10', 'h-10', 'h-10', 'h-10'];

type Query = { isPending: boolean; isError: boolean; refetch: () => unknown };

/** Esqueleto, error con reintento o el contenido de una pestaña. */
function QueryGate({ query, children }: { query: Query; children: React.ReactNode }) {
  if (query.isPending) return <LoadingBlock rows={LOADING_ROWS} />;
  if (query.isError) return <LoadError onRetry={() => void query.refetch()} />;
  return children;
}

function HoursTab({ onDirtyChange }: { onDirtyChange: (id: string, dirty: boolean) => void }) {
  const query = useHours();
  return (
    <QueryGate query={query}>
      {query.data ? (
        <HoursForm
          hours={query.data.hours}
          hoursConfirmed={query.data.hoursConfirmed}
          onDirtyChange={onDirtyChange}
        />
      ) : null}
    </QueryGate>
  );
}

function ClosuresTab() {
  const query = useClosures();
  return (
    <QueryGate query={query}>
      {query.data ? <ClosuresList closures={query.data} /> : null}
    </QueryGate>
  );
}

function SettingsTab({ onDirtyChange }: { onDirtyChange: (id: string, dirty: boolean) => void }) {
  const query = useReservationSettings();
  return (
    <QueryGate query={query}>
      {query.data ? <SettingsForm settings={query.data} onDirtyChange={onDirtyChange} /> : null}
    </QueryGate>
  );
}

function TemplatesTab({ onDirtyChange }: { onDirtyChange: (id: string, dirty: boolean) => void }) {
  const query = useTemplates();
  return (
    <QueryGate query={query}>
      {query.data ? <TemplatesForm templates={query.data} onDirtyChange={onDirtyChange} /> : null}
    </QueryGate>
  );
}

/** Ajustes de reservas (solo administradores): horario, cierres, reglas y textos de correo. */
export function ReservationSettingsPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const onDirtyChange = useCallback((id: string, value: boolean) => {
    setDirty((prev) =>
      prev[id] === value || (!value && !prev[id]) ? prev : { ...prev, [id]: value },
    );
  }, []);
  // Las pestañas siguen montadas al cambiar (no se pierde lo escrito), así que un solo
  // aviso cubre todas: se avisa si cualquiera tiene cambios sin guardar.
  const blocker = useUnsavedChanges(Object.values(dirty).some(Boolean));

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold">
          {t('admin.reservationSettings.title')}
        </h1>
        <p role="alert" className="font-medium text-destructive">
          {t('admin.reservationSettings.noPermission')}
        </p>
        <p className="text-muted-foreground">{t('admin.reservationSettings.noPermissionHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">
          {t('admin.reservationSettings.title')}
        </h1>
        <p className="text-muted-foreground">{t('admin.reservationSettings.intro')}</p>
      </div>
      <Tabs defaultValue="hours">
        <TabsList aria-label={t('admin.reservationSettings.tabsLabel')}>
          {TAB_IDS.map((id) => (
            <TabsTrigger key={id} value={id}>
              {t(`admin.reservationSettings.tabs.${id}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="hours" forceMount>
          <HoursTab onDirtyChange={onDirtyChange} />
        </TabsContent>
        <TabsContent value="closures" forceMount>
          <ClosuresTab />
        </TabsContent>
        <TabsContent value="settings" forceMount>
          <SettingsTab onDirtyChange={onDirtyChange} />
        </TabsContent>
        <TabsContent value="templates" forceMount>
          <TemplatesTab onDirtyChange={onDirtyChange} />
        </TabsContent>
      </Tabs>
      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}
