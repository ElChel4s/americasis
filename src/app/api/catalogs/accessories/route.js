import { CatalogsService } from '@/modules/catalogs/catalogs.service';
import { successResponse, errorResponse } from '@/lib/common/api-response';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === 'true';
    const accessories = await CatalogsService.getAccessories({ includeInactive });
    return successResponse(accessories, 'Accesorios obtenidos');
  } catch (error) {
    console.error('Error GET /api/catalogs/accessories:', error);
    return errorResponse(error.message, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await CatalogsService.createAccessory(body);
    return successResponse(result, 'Accesorio creado exitosamente', 201);
  } catch (error) {
    console.error('Error POST /api/catalogs/accessories:', error);
    return errorResponse(error.message || 'Error al crear accesorio', 400);
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const result = await CatalogsService.updateAccessory(id, data);
    return successResponse(result, 'Accesorio actualizado');
  } catch (error) {
    console.error('Error PUT /api/catalogs/accessories:', error);
    return errorResponse(error.message || 'Error al actualizar accesorio', 400);
  }
}
