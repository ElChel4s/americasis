import { SearchService } from '@/modules/search/search.service';
import { successResponse, errorResponse } from '@/lib/common/api-response';
import { verifyAuth } from '@/lib/common/auth-guard';

export async function GET(request, { params }) {
  try {
    const user = verifyAuth(request);
    if (!user) {
      return errorResponse('No autorizado', 401);
    }

    const resolvedParams = await Promise.resolve(params);
    const serial = resolvedParams?.serial;

    if (!serial) {
      return errorResponse('Número de serie requerido', 400);
    }

    const timeline = await SearchService.getSerialTimeline(serial);

    if (!timeline) {
      return errorResponse(`No se encontraron registros para la serie "${serial}"`, 404);
    }

    return successResponse(timeline, 'Cronología de serie obtenida exitosamente');
  } catch (error) {
    console.error(`Error en GET /api/search/serial:`, error);
    return errorResponse(error.message || 'Error al consultar número de serie', 500);
  }
}
