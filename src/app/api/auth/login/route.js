import { z } from 'zod';
import { AuthService } from '@/modules/auth/auth.service';
import { getAuthCookieOptions } from '@/lib/common/jwt';
import { successResponse, errorResponse } from '@/lib/common/api-response';

const loginSchema = z.object({
  email: z.string().min(1, 'El usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      const errorMsg = validation.error.issues?.[0]?.message || 'Datos de inicio de sesión inválidos';
      return errorResponse(errorMsg, 400);
    }

    const { email, password } = validation.data;
    const { token, user } = await AuthService.login({ email, password });

    const response = successResponse({ user }, 'Inicio de sesión exitoso');

    // Seteo de Cookie segura httpOnly
    response.cookies.set('auth_token', token, getAuthCookieOptions());

    return response;
  } catch (error) {
    const status = error.message.includes('desactivada') ? 403 : 401;
    return errorResponse(error.message || 'Error en autenticación', status);
  }
}
