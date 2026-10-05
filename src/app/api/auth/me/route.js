import { successResponse, errorResponse } from '@/lib/common/api-response';
import { verifyAuthToken, getAuthCookieOptions } from '@/lib/common/jwt';
import { AuthService } from '@/modules/auth/auth.service';
import { features } from '@/lib/config/features';

export async function GET(request) {
  // Si auth está deshabilitado por variable de entorno, devolver usuario de sistema
  if (!features.auth) {
    return successResponse({
      id: 1,
      email: 'admin@americasis.bo',
      nombre_completo: 'Usuario Local (Auth Desactivado)',
      rol: 'ADMINISTRADOR',
      sucursal_id: 1,
      activo: true,
    }, 'Sesión activa (Modo dev sin login)');
  }

  const token = request.cookies.get('auth_token')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return errorResponse('No se ha iniciado sesión', 401);
  }

  const payload = await verifyAuthToken(token);
  if (!payload) {
    const res = errorResponse('Token inválido o expirado', 401);
    res.cookies.set('auth_token', '', { ...getAuthCookieOptions(0), maxAge: 0 });
    return res;
  }

  // Consultar estado actual del usuario en la base de datos y verificar token_version
  const currentUser = await AuthService.getMe(payload);
  if (!currentUser) {
    const res = errorResponse('Sesión invalidada o cuenta desactivada', 401);
    res.cookies.set('auth_token', '', { ...getAuthCookieOptions(0), maxAge: 0 });
    return res;
  }

  return successResponse(currentUser, 'Usuario autenticado');
}
