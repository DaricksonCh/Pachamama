import { CalendarDays, ExternalLink, FileText, House, Tags, UtensilsCrossed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { usePendingCount } from '@/features/reservations/admin/api';
import { menuPdfUrl } from '@/features/menu/pdf-url';

/** Navegación lateral del panel. Los módulos futuros se añaden aquí cuando existan. */
export function AdminSidebar() {
  const { t, i18n } = useTranslation();
  const { isMobile, setOpenMobile } = useSidebar();
  const pending = usePendingCount().data ?? 0;
  // En móvil el menú es un Sheet: se cierra al elegir una sección.
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar>
      <SidebarContent>
        <nav aria-label={t('admin.nav.label')} className="flex flex-col gap-2">
          {/* El nombre va dentro del <nav>: así todo el lateral está dentro de un landmark. */}
          <span className="px-4 pt-3 font-display text-lg font-semibold">{t('app.name')}</span>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/admin" end onClick={closeOnMobile}>
                    <House aria-hidden="true" />
                    <span>{t('admin.nav.home')}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>{t('admin.nav.menu')}</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/admin/menu/categories" onClick={closeOnMobile}>
                    <Tags aria-hidden="true" />
                    <span>{t('admin.nav.categories')}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/admin/menu/dishes" onClick={closeOnMobile}>
                    <UtensilsCrossed aria-hidden="true" />
                    <span>{t('admin.nav.dishes')}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href={menuPdfUrl(i18n.language)} target="_blank" rel="noopener noreferrer">
                    <FileText aria-hidden="true" />
                    <span>{t('admin.nav.pdf')}</span>
                    <ExternalLink aria-hidden="true" className="ml-auto" />
                    <span className="sr-only">{t('admin.nav.opensInNewTab')}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>{t('admin.nav.reservationsGroup')}</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/admin/reservations" onClick={closeOnMobile}>
                    <CalendarDays aria-hidden="true" />
                    <span>{t('admin.nav.reservations')}</span>
                    {pending > 0 ? (
                      <>
                        <span aria-hidden="true" className="ml-auto text-xs font-semibold">
                          {pending}
                        </span>
                        <span className="sr-only">
                          {t('admin.nav.pending', { count: pending })}
                        </span>
                      </>
                    ) : null}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </nav>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
