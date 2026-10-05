import { query } from '../../lib/config/database';

// Cache en memoria para cuando Supabase / PostgreSQL no esté conectado en desarrollo
const LOCAL_EVIDENCES_CACHE = new Map();

export const EvidencesRepository = {
  /**
   * Guarda un nuevo registro de evidencia fotográfica en equipo_evidencias
   */
  async saveEvidence({
    equipo_id,
    storage_driver,
    nombre_archivo,
    url_archivo,
    etapa = 'DIAGNOSTICO',
    tamano_bytes = 0,
    mime_type = 'image/jpeg',
    subido_por_usuario_id = null
  }) {
    try {
      const { rows } = await query(`
        INSERT INTO equipo_evidencias 
        (equipo_id, storage_driver, nombre_archivo, url_archivo, etapa, tamano_bytes, mime_type, subido_por_usuario_id, fecha_subida)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *
      `, [
        equipo_id,
        storage_driver,
        nombre_archivo,
        url_archivo,
        etapa,
        tamano_bytes,
        mime_type,
        subido_por_usuario_id
      ]);

      return rows[0];
    } catch (err) {
      console.warn('[EvidencesRepository] Supabase/PostgreSQL offline. Guardando evidencia en cache local.', err.message);
      
      const newEvidence = {
        id: Date.now(),
        equipo_id: parseInt(equipo_id, 10),
        storage_driver,
        nombre_archivo,
        url_archivo,
        etapa,
        tamano_bytes,
        mime_type,
        subido_por_usuario_id,
        subido_por_nombre: 'Técnico Móvil / QR',
        fecha_subida: new Date().toISOString()
      };

      const key = String(equipo_id);
      const currentList = LOCAL_EVIDENCES_CACHE.get(key) || [];
      LOCAL_EVIDENCES_CACHE.set(key, [newEvidence, ...currentList]);

      return newEvidence;
    }
  },

  /**
   * Obtiene todas las evidencias asociadas a un equipo
   */
  async getEvidencesByEquipoId(equipoId) {
    try {
      const { rows } = await query(`
        SELECT e.*, u.nombre_completo AS subido_por_nombre
        FROM equipo_evidencias e
        LEFT JOIN usuarios u ON e.subido_por_usuario_id = u.id
        WHERE e.equipo_id = $1
        ORDER BY e.fecha_subida DESC
      `, [equipoId]);

      return rows;
    } catch (err) {
      console.warn('[EvidencesRepository] Supabase/PostgreSQL offline. Obteniendo evidencias de cache local.', err.message);
      return LOCAL_EVIDENCES_CACHE.get(String(equipoId)) || [];
    }
  },

  /**
   * Elimina una evidencia por su ID
   */
  async deleteEvidence(id) {
    try {
      const { rows } = await query(`
        DELETE FROM equipo_evidencias
        WHERE id = $1
        RETURNING *
      `, [id]);

      return rows[0] || null;
    } catch (err) {
      for (const [eqId, list] of LOCAL_EVIDENCES_CACHE.entries()) {
        const filtered = list.filter(item => item.id !== parseInt(id, 10));
        LOCAL_EVIDENCES_CACHE.set(eqId, filtered);
      }
      return { id: parseInt(id, 10) };
    }
  }
};
