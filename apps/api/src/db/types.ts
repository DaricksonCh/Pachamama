import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

/**
 * Tipos de las tablas de la BD (fuente única, en sincronía con las migraciones).
 * Columnas en camelCase: el CamelCasePlugin las traduce a snake_case en MySQL.
 * Las tablas de autenticación siguen el esquema de Better Auth + plugin admin.
 */

/** Fecha con valor por defecto en BD: opcional al insertar. */
type DefaultDate = ColumnType<Date, Date | undefined, Date>;

export interface UsersTable {
  id: string;
  name: string;
  email: string;
  emailVerified: ColumnType<boolean, boolean | undefined, boolean>;
  image: string | null;
  createdAt: DefaultDate;
  updatedAt: DefaultDate;
  role: string | null;
  banned: ColumnType<boolean | null, boolean | null | undefined, boolean | null>;
  banReason: string | null;
  banExpires: Date | null;
}

export interface SessionsTable {
  id: string;
  expiresAt: Date;
  token: string;
  createdAt: DefaultDate;
  updatedAt: DefaultDate;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
  impersonatedBy: string | null;
}

export interface AccountsTable {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  password: string | null;
  createdAt: DefaultDate;
  updatedAt: DefaultDate;
}

export interface VerificationsTable {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: DefaultDate;
  updatedAt: DefaultDate;
}

export type MenuStatus = 'visible' | 'hidden' | 'archived';

/** Columna con valor por defecto en BD: opcional al insertar. */
type WithDefault<T> = ColumnType<T, T | undefined, T>;

export interface MenuCategoriesTable {
  id: AutoId;
  nameDe: string;
  nameEs: string;
  descriptionDe: string | null;
  descriptionEs: string | null;
  sortOrder: WithDefault<number>;
  status: WithDefault<MenuStatus>;
  createdAt: DefaultDate;
  updatedAt: DefaultDate;
}

export interface DishesTable {
  id: AutoId;
  categoryId: number;
  nameDe: string;
  nameEs: string;
  descriptionDe: string | null;
  descriptionEs: string | null;
  /** DECIMAL(10,2): mysql2 lo devuelve como string ("12.50"). */
  price: string;
  diet: 'vegan' | 'vegetarian' | null;
  /** SET('A'..'N'): cadena separada por comas ("A,G"), vacía si no hay alérgenos. */
  allergens: WithDefault<string>;
  imageKey: string | null;
  imageAltDe: string | null;
  imageAltEs: string | null;
  sortOrder: WithDefault<number>;
  status: WithDefault<MenuStatus>;
  isProvisional: WithDefault<boolean>;
  provisionalNote: string | null;
  createdAt: DefaultDate;
  updatedAt: DefaultDate;
}

export interface Database {
  users: UsersTable;
  sessions: SessionsTable;
  accounts: AccountsTable;
  verifications: VerificationsTable;
  menuCategories: MenuCategoriesTable;
  dishes: DishesTable;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

/** Para columnas autoincrementales de tablas de negocio (fases siguientes). */
export type AutoId = Generated<number>;
