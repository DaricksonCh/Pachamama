-- Base de datos SOLO para tests (se vacía y se recrea en cada ejecución de los tests de integración).
-- Ejecutar UNA vez como root en MySQL 8.4 (Workbench → conexión 127.0.0.1:3307).
-- No contiene secretos: da permisos al usuario `pachamama` ya existente.

CREATE DATABASE IF NOT EXISTS pachamama_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES,
      CREATE TEMPORARY TABLES, LOCK TABLES
  ON pachamama_test.* TO 'pachamama'@'localhost';

FLUSH PRIVILEGES;

SHOW GRANTS FOR 'pachamama'@'localhost';
