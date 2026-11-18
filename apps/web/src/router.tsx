import { DEFAULT_LANGUAGE } from '@pachamama/shared';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { LanguageLayout } from '@/layouts/language-layout';
import { HomePage } from '@/pages/home-page';

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to={`/${DEFAULT_LANGUAGE}`} replace /> },
  {
    path: '/:lang',
    element: <LanguageLayout />,
    children: [{ index: true, element: <HomePage /> }],
  },
  { path: '*', element: <Navigate to={`/${DEFAULT_LANGUAGE}`} replace /> },
];

export const router = createBrowserRouter(routes);
