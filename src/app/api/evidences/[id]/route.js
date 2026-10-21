import { NextResponse } from 'next/server';
import { EvidencesService } from '@/modules/evidences/evidences.service';
import { successResponse, errorResponse } from '@/lib/common/api-response';
import { verifyAuth } from '@/lib/common/auth-guard';

/**
 * DELETE /api/evidences/[id]
 * Elimina una evidencia fotográfica de public.equipo_evidencias y su archivo físico
 * (bucket 'evidencias-radios' o disco local).
 */
export async function DELETE(request, { params }) {
  try {
    const user = verifyAuth(request);
    const { id } = await params;

    if (!id || id === 'undefined' || id === 'null') {
      return errorResponse('ID de evidencia no especificado', 400);
    }

    const deleted = await EvidencesService.removeEvidence(id, user);
    if (!deleted) {
      // Ya no existe: para el cliente el resultado es idéntico (la foto no debe volver).
      return NextResponse.json({ success: true, data: { id }, message: 'La evidencia ya no existía' }, { status: 200 });
    }

    return successResponse(deleted, 'Evidencia eliminada correctamente');
  } catch (error) {
    console.error('Error al eliminar evidencia:', error);
    return errorResponse(error.message || 'Error al eliminar la evidencia', 500);
  }
}
