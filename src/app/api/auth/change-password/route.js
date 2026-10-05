import { z } from 'zod';
import { successResponse, errorResponse } from '@/lib/common/api-response';
import { verifyAuthToken, getAuthCookieOptions } from '@/lib/common/jwt';
import { AuthService } from '@/modules/auth/auth.service';
import { features } from '@/lib/config/features';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Debe ingresar su contraseña actual'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener un mínimo de 6 caracteres'),
});

export async function PUT(request) {
  try {
    let userId = 1;

    if (features.auth) {
      const token = request.cookies.get('auth_token')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return errorResponse('No autorizado', 401);
      }

      const payload = await verifyAuthToken(token);
      if (!payload?.sub) {
        return errorResponse('Token inválido', 401);
      }
      userId = payload.sub;
    }

    const body = await request.json();
    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      const msg = validation.error.issues?.[0]?.message || 'Datos inválidos';
      return errorResponse(msg, 400);
    }

    const { currentPassword, newPassword } = validation.data;
    const { newToken, user } = await AuthService.changePassword(userId, {
      currentPassword,
      newPassword,
    });

    const response = successResponse(
      { user },
      'Contraseña actualizada exitosamente. Sus sesiones previas han sido cerradas.'
    );

    // Renovar la cookie con el nuevo token que contiene token_version incrementado
    response.cookies.set('auth_token', newToken, getAuthCookieOptions());

    return response;
  } catch (error) {
    return errorResponse(error.message || 'Error al cambiar contraseña', 400);
  }
}
