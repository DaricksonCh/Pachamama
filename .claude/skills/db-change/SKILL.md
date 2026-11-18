---
name: db-change
description: Cambiar el esquema de la base de datos MySQL de Pachamama (crear o modificar tablas, índices, columnas) mediante migraciones. Usar siempre que una tarea necesite tocar la estructura de la BD.
---

# Cambio de base de datos

Requiere fase 3+ (capa de datos elegida y registrada en `docs/decisions/`). Si aún no hay ADR de capa de datos, **parar y preguntar**.

## Reglas

- Nunca modificar la BD a mano ni editar una migración ya aplicada: crear siempre una migración nueva.
- Un solo sistema de migraciones para todo (incluidas las tablas de Better Auth).
- MySQL 8, `utf8mb4`, fechas en UTC (`DATETIME`/`TIMESTAMP` en UTC).
- Nombres en inglés, `snake_case`, tablas en plural.
- Claves foráneas e índices explícitos para columnas de búsqueda o unión.
- Importes en `DECIMAL(10,2)`, nunca `FLOAT`.
- Datos personales: solo los necesarios (ver `docs/security-privacy.md`) y considerar su retención/anonimización.

## Pasos

1. Describir el cambio al usuario y esperar visto bueno si altera o borra datos existentes.
2. Crear la migración (subida y, si la herramienta lo permite, bajada).
3. Aplicarla en local y comprobar el esquema resultante.
4. Actualizar tipos/repositories afectados.
5. Ejecutar tests.
6. Mencionar la migración en el mensaje de commit.
