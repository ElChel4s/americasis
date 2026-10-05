import { CatalogsService } from '@/modules/catalogs/catalogs.service';
import { successResponse, errorResponse } from '@/lib/common/api-response';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === 'true';
    const faults = await CatalogsService.getFaults({ includeInactive });
    return successResponse(faults, 'Fallas de placa obtenidas');
  } catch (error) {
    console.error('Error GET /api/catalogs/faults:', error);
    return errorResponse(error.message, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await CatalogsService.createFault(body);
    return successResponse(result, 'Falla registrada exitosamente', 201);
  } catch (error) {
    console.error('Error POST /api/catalogs/faults:', error);
    return errorResponse(error.message || 'Error al registrar falla', 400);
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { codigo, ...data } = body;
    const result = await CatalogsService.updateFault(codigo, data);
    return successResponse(result, 'Falla actualizada exitosamente');
  } catch (error) {
    console.error('Error PUT /api/catalogs/faults:', error);
    return errorResponse(error.message || 'Error al actualizar falla', 400);
  }
}
