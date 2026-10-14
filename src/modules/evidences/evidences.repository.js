import { query } from '../../lib/config/database';
import { supabase } from '../../lib/config/supabase-client';

// Cache en memoria para cuando Supabase / PostgreSQL no esté conectado en desarrollo
const LOCAL_EVIDENCES_CACHE = new Map();

export const EvidencesRepository = {
  /**
   * Guarda un nuevo registro de evidencia fotográfica en equipo_evidencias
   */
  async saveEvidence({
    equipo_id,
    orden_id = null,
    storage_driver = 'SUPABASE',
    nombre_archivo,
    url_archivo,
    etapa = 'DIAGNOSTICO',
    tamano_bytes = 0,
    mime_type = 'image/jpeg',
    subido_por_usuario_id = null
  }) {
    // 1. Prioridad: Supabase Cloud directo
    if (supabase) {
      try {
        const payload = {
          equipo_id,
          storage_driver,
          nombre_archivo,
          url_archivo,
          etapa,
          tamano_bytes,
          mime_type,
          subido_por_usuario_id
        };
        if (orden_id) payload.orden_id = orden_id;

        const { data, error } = await supabase
          .from('equipo_evidencias')
          .insert(payload)
          .select()
          .single();

        if (!error && data) {
          return data;
        }
        if (error) {
          console.warn('[EvidencesRepository] Supabase insert warning:', error.message);
        }
      } catch (err) {
        console.warn('[EvidencesRepository] Supabase insert exception:', err.message);
      }
    }

    // 2. Fallback PostgreSQL Pool
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
        equipo_id: typeof equipo_id === 'string' && equipo_id.length > 20 ? equipo_id : parseInt(equipo_id, 10),
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
    // 1. Supabase Cloud directo
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('equipo_evidencias')
          .select('*')
          .eq('equipo_id', equipoId)
          .order('fecha_subida', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map(item => ({
            ...item,
            subido_por_nombre: item.subido_por_nombre || 'Técnico Especialista'
          }));
        }
      } catch (err) {
        console.warn('[EvidencesRepository] Supabase get exception:', err.message);
      }
    }

    // 2. Fallback PostgreSQL Pool
    try {
      const { rows } = await query(`
        SELECT e.*, u.nombre_completo AS subido_por_nombre
        FROM equipo_evidencias e
        LEFT JOIN usuarios u ON e.subido_por_usuario_id = u.id
        WHERE e.equipo_id = $1
        ORDER BY e.fecha_subida DESC
      `, [equipoId]);

      if (rows && rows.length > 0) return rows;
      return LOCAL_EVIDENCES_CACHE.get(String(equipoId)) || [];
    } catch (err) {
      return LOCAL_EVIDENCES_CACHE.get(String(equipoId)) || [];
    }
  },

  /**
   * Elimina una evidencia por su ID
   */
  async deleteEvidence(id) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('equipo_evidencias')
          .delete()
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error && data) {
          return data;
        }
      } catch (err) {}
    }

    try {
      const { rows } = await query(`
        DELETE FROM equipo_evidencias
        WHERE id = $1
        RETURNING *
      `, [id]);

      return rows[0] || null;
    } catch (err) {
      for (const [eqId, list] of LOCAL_EVIDENCES_CACHE.entries()) {
        const filtered = list.filter(item => String(item.id) !== String(id));
        LOCAL_EVIDENCES_CACHE.set(eqId, filtered);
      }
      return { id };
    }
  }
};

