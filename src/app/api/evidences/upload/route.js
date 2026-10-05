import { EvidencesService } from '@/modules/evidences/evidences.service';
import { successResponse, errorResponse } from '@/lib/common/api-response';
import { verifyAuth } from '@/lib/common/auth-guard';

export async function POST(request) {
  try {
    const user = verifyAuth(request);
    const formData = await request.formData();

    const file = formData.get('file');
    const equipoId = formData.get('equipo_id');
    const ordenId = formData.get('orden_id');
    const etapa = formData.get('etapa') || 'DIAGNOSTICO';

    if (!file || typeof file === 'string') {
      return errorResponse('No se proporcionó ningún archivo de imagen válido', 400);
    }

    if (!equipoId) {
      return errorResponse('El campo equipo_id es requerido', 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

    const evidence = await EvidencesService.uploadEvidence({
      fileBuffer,
      fileName: file.name || 'evidencia.jpg',
      mimeType: file.type || 'image/jpeg',
      equipoId,
      ordenId,
      etapa,
      user,
      ipOrigen: clientIp
    });

    return successResponse(evidence, 'Evidencia fotográfica subida con éxito', 201);
  } catch (error) {
    console.error('Error al subir evidencia:', error);
    return errorResponse(error.message || 'Error interno al procesar la imagen', 500);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const equipoId = searchParams.get('equipo_id');

    if (!equipoId) {
      return errorResponse('Se requiere el parámetro equipo_id', 400);
    }

    const evidences = await EvidencesService.getEvidencesByEquipo(equipoId);
    return successResponse(evidences, 'Evidencias obtenidas con éxito');
  } catch (error) {
    console.error('Error al obtener evidencias:', error);
    return errorResponse(error.message || 'Error al obtener evidencias', 500);
  }
}
