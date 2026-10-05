import { query } from '../config/database';

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
    console.error('Error guardando log de auditoría:', error);
    // No lanzamos error para no interrumpir el flujo principal
  }
};
