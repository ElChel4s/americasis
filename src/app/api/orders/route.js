import { NextResponse } from 'next/server';
import { OrdersService } from '../../../modules/orders/orders.service';
import { successResponse, errorResponse } from '../../../lib/common/api-response';
import { verifyAuth } from '../../../lib/common/auth-guard';

export async function POST(request) {
  try {
    const user = verifyAuth(request);
    if (!user) {
      return errorResponse('No autorizado', 401);
    }

    const data = await request.json();
    
    // Validar payload aquí con Zod (simplificado por brevedad)
    if (!data.order || !data.equipos || !Array.isArray(data.equipos)) {
      return errorResponse('Payload inválido. Se requiere order y equipos[].', 400);
    }

    const result = await OrdersService.createOrder(data, user);
    
    return successResponse(result, 'Orden creada exitosamente', 201);
  } catch (error) {
    console.error('Error en POST /api/orders:', error);
    return errorResponse(error.message || 'Error interno del servidor', 500);
  }
}

export async function GET(request) {
  try {
    const user = verifyAuth(request);
    if (!user) {
      return errorResponse('No autorizado', 401);
    }

    const { searchParams } = new URL(request.url);
    const estadoParam = searchParams.get('estado');
    const limitParam = searchParams.get('limit');
    const serieParam = searchParams.get('serie');

    const filters = {};
    if (estadoParam) {
      filters.estados = estadoParam.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (limitParam) {
      filters.limit = parseInt(limitParam, 10);
    }
    if (serieParam) {
      filters.serie = serieParam.trim();
    }

    const activeOrders = await OrdersService.getActiveOrders(filters);
    return successResponse(activeOrders, 'Órdenes activas obtenidas');
  } catch (error) {
    console.error('Error en GET /api/orders:', error);
    return errorResponse(error.message, 500);
  }
}
