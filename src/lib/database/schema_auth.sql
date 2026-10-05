-- ====================================================================
-- SISTEMA AMÉRICA — RADIO SERVICE ERP
-- DDL DE AUTENTICACIÓN, ROLES (RBAC) Y CONTROL DE TRABAJADORES
-- ====================================================================

-- 1. Tipo ENUM para roles de usuario (Estrictamente 3 roles)
DO $$ BEGIN
  CREATE TYPE rol_usuario_enum AS ENUM (
    'RECEPCION',
    'TECNICO',
    'ADMINISTRADOR'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Tabla de usuarios/trabajadores
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  sucursal_id INTEGER NOT NULL DEFAULT 1,
  nombre_completo VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol rol_usuario_enum NOT NULL DEFAULT 'TECNICO',
  activo BOOLEAN NOT NULL DEFAULT true,
  token_version INTEGER NOT NULL DEFAULT 1,
  ultimo_login TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices de aceleración para login y búsqueda
CREATE INDEX IF NOT EXISTS idx_usuarios_email_lower ON usuarios(LOWER(TRIM(email)));
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);

-- 4. Inserción de usuarios iniciales de demostración
-- Contraseña por defecto: America2026! (Hash bcrypt 10 rounds)
INSERT INTO usuarios (id, sucursal_id, nombre_completo, email, password_hash, rol, activo, token_version)
VALUES 
  (1, 1, 'Administrador General', 'admin@americasis.bo', '$2b$10$0VYKfuMtSx.k6FGWQ.5mEu61FLzQCktOax6RQfXxdUcKfHeLB7h66', 'ADMINISTRADOR', true, 1),
  (2, 1, 'Roberto Gómez (Técnico RF)', 'tecnico@americasis.bo', '$2b$10$0VYKfuMtSx.k6FGWQ.5mEu61FLzQCktOax6RQfXxdUcKfHeLB7h66', 'TECNICO', true, 1),
  (3, 1, 'Ana Morales (Recepción)', 'recepcion@americasis.bo', '$2b$10$0VYKfuMtSx.k6FGWQ.5mEu61FLzQCktOax6RQfXxdUcKfHeLB7h66', 'RECEPCION', true, 1)
ON CONFLICT (email) DO NOTHING;

-- Ajustar secuencia del serial si es necesario
SELECT setval('usuarios_id_seq', (SELECT COALESCE(MAX(id), 1) FROM usuarios));
