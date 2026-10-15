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

    // 1. Si viene una acción de diagnóstico específica de equipo
    if (body.equipoId && body.diagnosis) {
      const result = await OrdersService.saveDiagnosis(id, body.equipoId, body.diagnosis, user);
      return successResponse(result, 'Diagnóstico actualizado exitosamente');
    }

    // 2. Si viene asignación de técnico, estado general, presupuesto o condiciones
    if (
      body.estado || 
      body.status || 
      body.condiciones || 
      body.sumatoria_total !== undefined || 
      body.moneda ||
      body.usuario_tecnico_id !== undefined ||
      body.tecnico_nombre_manual !== undefined ||
      body.condiciones_comerciales_json !== undefined
    ) {
      const result = await OrdersService.updateOrderGeneral(id, body, user);
      return successResponse(result, 'Orden actualizada exitosamente');
    }

    return errorResponse('Acción o cuerpo no soportado', 400);
  } catch (error) {
    console.error(`Error en PUT /api/orders/${params?.id}:`, error);
    return errorResponse(error.message || 'Error al actualizar la orden', 500);
  }
}

