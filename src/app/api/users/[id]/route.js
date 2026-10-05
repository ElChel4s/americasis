import { z } from 'zod';
import { successResponse, errorResponse } from '@/lib/common/api-response';
import { verifyAuth } from '@/lib/common/auth-guard';
import { AuthService } from '@/modules/auth/auth.service';
import { features } from '@/lib/config/features';

const updateUserSchema = z.object({
  nombre_completo: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').optional(),
  rol: z.enum(['RECEPCION', 'TECNICO', 'ADMINISTRADOR']).optional(),
  activo: z.boolean().optional(),
  sucursal_id: z.coerce.number().int().positive().optional(),
  password: z.string().min(6, 'La contraseña restablecida debe tener al menos 6 caracteres').optional(),
});

export async function PATCH(request, context) {
  const user = verifyAuth(request);
  if (features.auth) {
    if (!user) return errorResponse('No autorizado', 401);
    if (user.rol !== 'ADMINISTRADOR') {
      return errorResponse('Acceso denegado: Solo el Administrador puede modificar datos o credenciales de personal', 403);
    }
  }

  try {
    const params = await context.params;
    const userId = Number(params.id);

    if (!userId || isNaN(userId)) {
      return errorResponse('Identificador de usuario inválido', 400);
    }

    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      const msg = validation.error.issues?.[0]?.message || 'Datos de actualización inválidos';
      return errorResponse(msg, 400);
    }

    const updatedUser = await AuthService.updateStaff(userId, validation.data);
    return successResponse(updatedUser, 'Datos de trabajador actualizados correctamente');
  } catch (error) {
    return errorResponse(error.message || 'Error al actualizar trabajador', 400);
  }
}
