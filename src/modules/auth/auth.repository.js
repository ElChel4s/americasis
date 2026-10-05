import { pool } from '../../lib/config/database';

// Hash bcrypt de 'America2026!' generado con 10 rounds
const DEFAULT_PASSWORD_HASH = '$2b$10$0VYKfuMtSx.k6FGWQ.5mEu61FLzQCktOax6RQfXxdUcKfHeLB7h66';

// Memoria volátil para desarrollo offline (antes de conectar a Supabase/PostgreSQL)
let mockUsers = [
  {
    id: 1,
    sucursal_id: 1,
    nombre_completo: 'Administrador General',
    email: 'admin',
    password_hash: DEFAULT_PASSWORD_HASH,
    rol: 'ADMINISTRADOR',
    activo: true,
    token_version: 1,
    ultimo_login: new Date().toISOString(),
    creado_en: '2026-01-10T08:00:00Z',
  },
  {
    id: 2,
    sucursal_id: 1,
    nombre_completo: 'Roberto Gómez (Técnico RF)',
    email: 'tecnico',
    password_hash: DEFAULT_PASSWORD_HASH,
    rol: 'TECNICO',
    activo: true,
    token_version: 1,
    ultimo_login: new Date(Date.now() - 3600000 * 24).toISOString(),
    creado_en: '2026-02-01T10:00:00Z',
  },
  {
    id: 3,
    sucursal_id: 1,
    nombre_completo: 'Ana Morales (Recepción)',
    email: 'recepcion',
    password_hash: DEFAULT_PASSWORD_HASH,
    rol: 'RECEPCION',
    activo: true,
    token_version: 1,
    ultimo_login: new Date(Date.now() - 3600000 * 12).toISOString(),
    creado_en: '2026-02-10T11:00:00Z',
  },
];

export const AuthRepository = {
  /**
   * Busca un usuario por email (case-insensitive)
   */
  async findByEmail(email) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    try {
      const { rows } = await pool.query(
        `SELECT id, sucursal_id, nombre_completo, email, password_hash, rol, activo, token_version, ultimo_login, creado_en 
         FROM usuarios 
         WHERE LOWER(TRIM(email)) = $1 
         LIMIT 1`,
        [cleanEmail]
      );
      return rows[0] || null;
    } catch (err) {
      // Modo offline fallback
      const found = mockUsers.find(u => u.email.toLowerCase() === cleanEmail);
      return found ? { ...found } : null;
    }
  },

  /**
   * Busca un usuario por ID
   */
  async findById(id) {
    try {
      const { rows } = await pool.query(
        `SELECT id, sucursal_id, nombre_completo, email, password_hash, rol, activo, token_version, ultimo_login, creado_en 
         FROM usuarios 
         WHERE id = $1 
         LIMIT 1`,
        [id]
      );
      return rows[0] || null;
    } catch (err) {
      const found = mockUsers.find(u => String(u.id) === String(id));
      return found ? { ...found } : null;
    }
  },

  /**
   * Actualiza el timestamp de último login
   */
  async updateLastLogin(id) {
    try {
      const { rows } = await pool.query(
        `UPDATE usuarios 
         SET ultimo_login = NOW() 
         WHERE id = $1 
         RETURNING id, sucursal_id, nombre_completo, email, rol, activo, token_version, ultimo_login`,
        [id]
      );
      return rows[0] || null;
    } catch (err) {
      const idx = mockUsers.findIndex(u => String(u.id) === String(id));
      if (idx !== -1) {
        mockUsers[idx].ultimo_login = new Date().toISOString();
        return { ...mockUsers[idx] };
      }
      return null;
    }
  },

  /**
   * Actualiza la contraseña e incrementa el token_version para forzar invalidación de sesiones
   */
  async updatePassword(id, passwordHash) {
    try {
      const { rows } = await pool.query(
        `UPDATE usuarios 
         SET password_hash = $1, token_version = token_version + 1 
         WHERE id = $2 
         RETURNING id, sucursal_id, nombre_completo, email, rol, activo, token_version`,
        [passwordHash, id]
      );
      return rows[0] || null;
    } catch (err) {
      const idx = mockUsers.findIndex(u => String(u.id) === String(id));
      if (idx !== -1) {
        mockUsers[idx].password_hash = passwordHash;
        mockUsers[idx].token_version = (mockUsers[idx].token_version || 1) + 1;
        return { ...mockUsers[idx] };
      }
      return null;
    }
  },

  /**
   * Lista todos los usuarios para la vista administrativa
   */
  async listUsers() {
    try {
      const { rows } = await pool.query(
        `SELECT id, sucursal_id, nombre_completo, email, rol, activo, token_version, ultimo_login, creado_en 
         FROM usuarios 
         ORDER BY id ASC`
      );
      return rows;
    } catch (err) {
      return [...mockUsers].map(u => ({ ...u }));
    }
  },

  /**
   * Crea un nuevo usuario
   */
  async createUser({ sucursal_id = null, nombre_completo, email, password_hash, rol = 'TECNICO', activo = true }) {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const { rows } = await pool.query(
        `INSERT INTO usuarios (sucursal_id, nombre_completo, email, password_hash, rol, activo, token_version, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6, 1, NOW())
         RETURNING id, sucursal_id, nombre_completo, email, rol, activo, token_version, ultimo_login, creado_en`,
        [sucursal_id, nombre_completo.trim(), cleanEmail, password_hash, rol, activo]
      );
      return rows[0];
    } catch (err) {
      const newId = mockUsers.length > 0 ? Math.max(...mockUsers.map(u => Number(u.id) || 0)) + 1 : 1;
      const newUser = {
        id: newId,
        sucursal_id,
        nombre_completo: nombre_completo.trim(),
        email: cleanEmail,
        password_hash,
        rol,
        activo,
        token_version: 1,
        ultimo_login: null,
        creado_en: new Date().toISOString(),
      };
      mockUsers.push(newUser);
      return { ...newUser };
    }
  },

  /**
   * Actualiza datos de un usuario (rol, activo, sucursal, contraseña opcional)
   */
  async updateUser(id, { nombre_completo, rol, activo, sucursal_id, password_hash }) {
    try {
      const { rows } = await pool.query(
        `UPDATE usuarios
         SET 
           nombre_completo = COALESCE($1, nombre_completo),
           rol = COALESCE($2, rol),
           activo = COALESCE($3, activo),
           sucursal_id = COALESCE($4, sucursal_id),
           password_hash = COALESCE($5, password_hash),
           token_version = CASE 
             WHEN $5 IS NOT NULL OR ($3 IS NOT NULL AND $3 = false) THEN token_version + 1 
             ELSE token_version 
           END
         WHERE id = $6
         RETURNING id, sucursal_id, nombre_completo, email, rol, activo, token_version, ultimo_login, creado_en`,
        [
          nombre_completo ? nombre_completo.trim() : null,
          rol || null,
          activo !== undefined ? activo : null,
          sucursal_id || null,
          password_hash || null,
          id,
        ]
      );
      return rows[0] || null;
    } catch (err) {
      const idx = mockUsers.findIndex(u => String(u.id) === String(id));
      if (idx === -1) return null;

      const user = mockUsers[idx];
      if (nombre_completo !== undefined) user.nombre_completo = nombre_completo.trim();
      if (rol !== undefined) user.rol = rol;
      if (activo !== undefined) {
        if (user.activo && !activo) {
          // Desactivando cuenta -> invalidar sesiones
          user.token_version = (user.token_version || 1) + 1;
        }
        user.activo = activo;
      }
      if (sucursal_id !== undefined) user.sucursal_id = sucursal_id;
      if (password_hash) {
        user.password_hash = password_hash;
        user.token_version = (user.token_version || 1) + 1;
      }

      return { ...user };
    }
  },
};
