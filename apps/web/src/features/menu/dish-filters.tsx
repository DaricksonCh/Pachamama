import type { AdminCategory } from '@pachamama/shared';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import type { DishFilters as Filters } from './api';
import type { DishFilterKey } from './use-dish-filters';

const SEARCH_DELAY_MS = 300;

/** Búsqueda y filtros del listado de platos (el estado vive en la URL, ver `useDishFilters`). */
export function DishFilters({
  categories,
  filters,
  onChange,
  onReset,
}: {
  categories: AdminCategory[];
  filters: Filters;
  onChange: (patch: Partial<Record<DishFilterKey, string | undefined>>, replace?: boolean) => void;
  onReset: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState(filters.q ?? '');
  const currentQ = filters.q;

  // La búsqueda se aplica al dejar de escribir (sin llenar el historial con cada tecla).
  useEffect(() => {
    const next = text.trim() || undefined;
    if (next === currentQ) return;
    const timer = setTimeout(() => onChange({ q: next }, true), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, currentQ, onChange]);

  const active = Object.keys(filters).length > 0;

  return (
    <form
      role="search"
      aria-label={t('admin.menu.dishes.filters.label')}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        onChange({ q: text.trim() || undefined }, true);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="dish-filter-q">{t('admin.menu.dishes.filters.search')}</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-2.5 top-2.5 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="dish-filter-q"
            type="search"
            className="ps-8"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dish-filter-category">{t('admin.menu.dishes.filters.category')}</Label>
        <NativeSelect
          id="dish-filter-category"
          value={filters.categoryId ?? ''}
          onChange={(event) => onChange({ categoryId: event.target.value })}
        >
          <option value="">{t('admin.menu.dishes.filters.allCategories')}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {i18n.language === 'es' ? category.nameEs : category.nameDe}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dish-filter-status">{t('admin.menu.dishes.filters.status')}</Label>
        <NativeSelect
          id="dish-filter-status"
          value={filters.status ?? ''}
          onChange={(event) => onChange({ status: event.target.value })}
        >
          <option value="">{t('admin.menu.dishes.filters.statusActive')}</option>
          <option value="visible">{t('admin.menu.status.visible')}</option>
          <option value="hidden">{t('admin.menu.status.hidden')}</option>
          <option value="archived">{t('admin.menu.status.archived')}</option>
        </NativeSelect>
      </div>
      <div className="flex flex-col justify-end gap-2">
        {(['provisional', 'withoutImage'] as const).map((key) => (
          <div key={key} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`dish-filter-${key}`}
              className="size-4 accent-primary"
              checked={filters[key] === true}
              onChange={(event) => onChange({ [key]: event.target.checked ? 'true' : undefined })}
            />
            <label htmlFor={`dish-filter-${key}`} className="text-sm">
              {t(`admin.menu.dishes.filters.${key}`)}
            </label>
          </div>
        ))}
      </div>
      {active ? (
        <div className="sm:col-span-2 lg:col-span-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setText('');
              onReset();
            }}
          >
            {t('admin.menu.dishes.filters.reset')}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
