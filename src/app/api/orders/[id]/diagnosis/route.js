import { OrdersService } from '@/modules/orders/orders.service';
import { successResponse, errorResponse } from '@/lib/common/api-response';
import { verifyAuth } from '@/lib/common/auth-guard';

export async function POST(request, { params }) {
  try {
    const user = verifyAuth(request);
    const { id } = params;
    const body = await request.json();

    const { equipoId, diagnosis } = body;

    if (!equipoId || !diagnosis) {
      return errorResponse('Se requieren equipoId y diagnosis en el cuerpo de la petición', 400);
    }

    const result = await OrdersService.saveDiagnosis(id, equipoId, diagnosis, user);
    return successResponse(result, 'Diagnóstico y subtotales guardados correctamente', 200);
  } catch (error) {
    console.error(`Error en POST /api/orders/${params?.id}/diagnosis:`, error);
    return errorResponse(error.message || 'Error al guardar el diagnóstico', 500);
  }
}
