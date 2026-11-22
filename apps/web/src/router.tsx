import { DEFAULT_LANGUAGE } from '@pachamama/shared';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { AdminLayout } from '@/layouts/admin-layout';
import { LanguageLayout } from '@/layouts/language-layout';
import { DashboardPage } from '@/pages/admin/dashboard-page';
import { LoginPage } from '@/pages/admin/login-page';
import { CategoriesPage } from '@/pages/admin/menu/categories-page';
import { CategoryFormPage } from '@/pages/admin/menu/category-form-page';
import { DishFormPage } from '@/pages/admin/menu/dish-form-page';
import { DishesPage } from '@/pages/admin/menu/dishes-page';
import { ReservationDetailPage } from '@/pages/admin/reservations/reservation-detail-page';
import { ReservationsPage } from '@/pages/admin/reservations/reservations-page';
import { HomePage } from '@/pages/home-page';
import { PublicPageRoute } from '@/pages/public-page-route';

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to={`/${DEFAULT_LANGUAGE}`} replace /> },
  // Panel del personal (sin prefijo de idioma; usa el idioma activo de i18n).
  { path: '/admin/login', element: <LoginPage /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'menu/categories', element: <CategoriesPage /> },
      { path: 'menu/categories/new', element: <CategoryFormPage /> },
      { path: 'menu/categories/:id', element: <CategoryFormPage /> },
      { path: 'menu/dishes', element: <DishesPage /> },
      { path: 'menu/dishes/new', element: <DishFormPage /> },
      { path: 'menu/dishes/:id', element: <DishFormPage /> },
      { path: 'reservations', element: <ReservationsPage /> },
      { path: 'reservations/:id', element: <ReservationDetailPage /> },
    ],
  },
  {
    path: '/:lang',
    element: <LanguageLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: ':slug', element: <PublicPageRoute /> },
      // Unknown public page: back to the home page of the same language.
      { path: '*', element: <Navigate to=".." relative="path" replace /> },
    ],
  },
  { path: '*', element: <Navigate to={`/${DEFAULT_LANGUAGE}`} replace /> },
];

export const router = createBrowserRouter(routes);
