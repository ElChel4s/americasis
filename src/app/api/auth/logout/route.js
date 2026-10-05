import { successResponse } from '@/lib/common/api-response';
import { getAuthCookieOptions } from '@/lib/common/jwt';

export async function POST(request) {
  const response = successResponse(null, 'Sesión cerrada exitosamente');

  // Expirar la cookie inmediatamente
  response.cookies.set('auth_token', '', {
    ...getAuthCookieOptions(0),
    maxAge: 0,
  });

  return response;
}
