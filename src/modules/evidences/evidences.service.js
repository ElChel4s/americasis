import { EvidencesRepository } from './evidences.repository';
import { uploadFile } from '../../lib/config/storage';
import { logAudit } from '../../lib/common/audit-logger';

export const EvidencesService = {
  /**
   * Sube el archivo y registra la evidencia en la base de datos y auditoría
   */
  async uploadEvidence({
    fileBuffer,
    fileName,
    mimeType,
    equipoId,
    ordenId = null,
    etapa = 'DIAGNOSTICO',
    user = null,
    ipOrigen = null
  }) {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Archivo de imagen vacío o no proporcionado');
    }

    if (!equipoId) {
      throw new Error('equipo_id es obligatorio para registrar la evidencia');
    }

    // 1. Guardar archivo mediante el adaptador agnóstico
    const uploadResult = await uploadFile(fileBuffer, fileName, mimeType);

    // 2. Persistir en la tabla equipo_evidencias
    const evidence = await EvidencesRepository.saveEvidence({
      equipo_id: parseInt(equipoId, 10),
      storage_driver: uploadResult.driver,
      nombre_archivo: uploadResult.fileName,
      url_archivo: uploadResult.url,
      etapa: etapa || 'DIAGNOSTICO',
      tamano_bytes: uploadResult.sizeBytes,
      mime_type: uploadResult.mimeType,
      subido_por_usuario_id: user?.id || null
    });

    // 3. Registrar en auditoria_logs
    await logAudit({
      ordenId: ordenId ? parseInt(ordenId, 10) : null,
      equipoId: parseInt(equipoId, 10),
      usuarioId: user?.id || null,
      usuarioNombre: user?.nombre_completo || 'Técnico / Celular QR',
      usuarioRol: user?.rol || 'TECNICO',
      accion: 'SUBIR_EVIDENCIA',
      estadoAnterior: null,
      estadoNuevo: null,
      detalleCambio: `Foto subida (${etapa}): ${uploadResult.fileName} [${uploadResult.driver}] - ${(uploadResult.sizeBytes / 1024).toFixed(1)} KB`,
      ipOrigen
    });

    return evidence;
  },

  async getEvidencesByEquipo(equipoId) {
    if (!equipoId) return [];
    return await EvidencesRepository.getEvidencesByEquipoId(parseInt(equipoId, 10));
  },

  async removeEvidence(id, user = null) {
    const deleted = await EvidencesRepository.deleteEvidence(id);
    if (deleted) {
      await logAudit({
        equipoId: deleted.equipo_id,
        usuarioId: user?.id || null,
        usuarioNombre: user?.nombre_completo || 'Usuario',
        usuarioRol: user?.rol || 'SISTEMA',
        accion: 'ELIMINAR_EVIDENCIA',
        detalleCambio: `Evidencia eliminada: ${deleted.nombre_archivo}`
      });
    }
    return deleted;
  }
};
