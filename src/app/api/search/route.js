import { SearchService } from '@/modules/search/search.service';
import { successResponse, errorResponse } from '@/lib/common/api-response';
import { verifyAuth } from '@/lib/common/auth-guard';

export async function GET(request) {
  try {
    const user = verifyAuth(request);
    if (!user) {
      return errorResponse('No autorizado', 401);
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const estado = searchParams.get('estado') || '';
    const desde = searchParams.get('desde') || '';
    const hasta = searchParams.get('hasta') || '';
    const marca = searchParams.get('marca') || '';
    const banda = searchParams.get('banda') || '';
    const serie = searchParams.get('serie') || '';
    const limit = searchParams.get('limit') || '15';
    const page = searchParams.get('page') || '1';

    const filters = {
      q,
      estado,
      desde,
      hasta,
      marca,
      banda,
      serie,
      limit: parseInt(limit, 10),
      page: parseInt(page, 10)
    };

    const result = await SearchService.searchOrders(filters);
    return successResponse(result, 'Búsqueda completada exitosamente');
  } catch (error) {
    console.error('Error en GET /api/search:', error);
    return errorResponse(error?.message || String(error), 500);
  }
}
