import { ExternalLink, FileText, House, Tags, UtensilsCrossed } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { menuPdfUrl } from '@/features/menu/pdf-url';

/** Navegación lateral del panel. Los módulos futuros se añaden aquí cuando existan. */
export function AdminSidebar() {
  const { t, i18n } = useTranslation();
  const { isMobile, setOpenMobile } = useSidebar();
  // En móvil el menú es un Sheet: se cierra al elegir una sección.
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <span className="px-2 py-1 font-display text-lg font-semibold">{t('app.name')}</span>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label={t('admin.nav.label')} className="flex flex-col gap-2">
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
        </nav>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
