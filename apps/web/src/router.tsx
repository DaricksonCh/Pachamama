import { DEFAULT_LANGUAGE } from '@pachamama/shared';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { AdminLayout } from '@/layouts/admin-layout';
import { LanguageLayout } from '@/layouts/language-layout';
import { DashboardPage } from '@/pages/admin/dashboard-page';
import { LoginPage } from '@/pages/admin/login-page';
import { CategoriesPage, DishesPage } from '@/pages/admin/menu/placeholder-pages';
import { HomePage } from '@/pages/home-page';

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to={`/${DEFAULT_LANGUAGE}`} replace /> },
  // Panel del personal (sin prefijo de idioma; usa el idioma activo de i18n).
  { path: '/admin/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      // Marcadores: los listados y formularios reales llegan en las tareas siguientes de la fase 5.
      { path: 'menu/categories', element: <CategoriesPage /> },
      { path: 'menu/dishes', element: <DishesPage /> },
      { path: 'menu/dishes/new', element: <DishesPage /> },
    ],
  },
  {
    path: '/:lang',
    element: <LanguageLayout />,
    children: [{ index: true, element: <HomePage /> }],
  },
  { path: '*', element: <Navigate to={`/${DEFAULT_LANGUAGE}`} replace /> },
];

export const router = createBrowserRouter(routes);
