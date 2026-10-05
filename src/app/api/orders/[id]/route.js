import { OrdersService } from '@/modules/orders/orders.service';
import { successResponse, errorResponse } from '@/lib/common/api-response';
import { verifyAuth } from '@/lib/common/auth-guard';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    const order = await OrdersService.getOrderById(id);
    return successResponse(order, 'Orden obtenida exitosamente');
  } catch (error) {
    console.error(`Error en GET /api/orders:`, error);
    return errorResponse(error.message || 'Error al obtener la orden', 404);
  }
}

export async function PUT(request, { params }) {
  try {
    const user = verifyAuth(request);
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    const body = await request.json();

    // Si viene una acción de diagnóstico específica
    if (body.equipoId && body.diagnosis) {
      const result = await OrdersService.saveDiagnosis(id, body.equipoId, body.diagnosis, user);
      return successResponse(result, 'Diagnóstico actualizado exitosamente');
    }

    return errorResponse('Acción o cuerpo no soportado', 400);
  } catch (error) {
    console.error(`Error en PUT /api/orders/${params?.id}:`, error);
    return errorResponse(error.message || 'Error al actualizar la orden', 500);
  }
}
