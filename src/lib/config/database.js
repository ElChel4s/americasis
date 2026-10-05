import { Pool } from 'pg';
import { env } from './env';

// Crear el Pool de conexiones a PostgreSQL
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Configuraciones recomendadas para producción y Supabase
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Ejecuta una consulta simple
 */
export const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // Puedes habilitar logs en desarrollo
  // console.log('Ejecutando query', { text, duration, rows: res.rowCount });
  return res;
};

/**
 * Helper para manejar transacciones (BEGIN, COMMIT, ROLLBACK)
 * @param {Function} callback Función que recibe el cliente para realizar las operaciones
 */
export const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
