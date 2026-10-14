import { query } from '../config/database';
import { supabase } from '../config/supabase-client';

/**
 * Registra una acción en la tabla auditoria_logs
 */
export const logAudit = async ({
  ordenId = null,
  equipoId = null,
  usuarioId = null,
  usuarioNombre = 'Sistema',
  usuarioRol = 'SISTEMA',
  accion,
  estadoAnterior = null,
  estadoNuevo = null,
  detalleCambio = null,
  ipOrigen = null
}) => {
  if (supabase) {
    try {
      const payload = {
        usuario_id: usuarioId,
        usuario_nombre: usuarioNombre,
        usuario_rol: usuarioRol,
        accion,
        estado_anterior: estadoAnterior,
        estado_nuevo: estadoNuevo,
        detalle_cambio: detalleCambio,
        ip_origen: ipOrigen
      };
      if (ordenId && typeof ordenId === 'string' && ordenId.length > 20) {
        payload.orden_id = ordenId;
      }
      if (equipoId && typeof equipoId === 'string' && equipoId.length > 20) {
        payload.equipo_id = equipoId;
      }
      await supabase.from('auditoria_logs').insert(payload);
      return;
    } catch (sbErr) {}
  }

  try {
    const text = `
      INSERT INTO auditoria_logs 
      (orden_id, equipo_id, usuario_id, usuario_nombre, usuario_rol, accion, estado_anterior, estado_nuevo, detalle_cambio, ip_origen)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    const values = [
      ordenId, equipoId, usuarioId, usuarioNombre, usuarioRol, 
      accion, estadoAnterior, estadoNuevo, detalleCambio, ipOrigen
    ];
    await query(text, values);
  } catch (error) {
    // Silencioso para no interrumpir el flujo principal
  }
};

