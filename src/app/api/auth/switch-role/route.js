import { NextResponse } from 'next/server';
import { signAuthToken, getAuthCookieOptions } from '@/lib/common/jwt';
import { successResponse, errorResponse } from '@/lib/common/api-response';

const PREDEFINED_USERS = {
  RECEPCION: {
    id: 'b0000000-0000-0000-0000-000000000003',
    sucursal_id: 'a0000000-0000-0000-0000-000000000001',
    nombre_completo: 'Ana Morales (Recepción)',
    email: 'recepcion@americasis.com',
    rol: 'RECEPCION',
    token_version: 1
  },
  TECNICO: {
    id: 'b0000000-0000-0000-0000-000000000002',
    sucursal_id: 'a0000000-0000-0000-0000-000000000001',
    nombre_completo: 'Roberto Gómez (Técnico RF)',
    email: 'tecnico@americasis.com',
    rol: 'TECNICO',
    token_version: 1
  },
  ADMINISTRADOR: {
    id: 'b0000000-0000-0000-0000-000000000001',
    sucursal_id: 'a0000000-0000-0000-0000-000000000001',
    nombre_completo: 'Administrador General',
    email: 'admin@americasis.com',
    rol: 'ADMINISTRADOR',
    token_version: 1
  }
};

export async function POST(request) {
  try {
    const body = await request.json();
    const roleKey = (body.role || body.rol || 'RECEPCION').toUpperCase().trim();
    const normalizedRole = roleKey === 'ADMIN' ? 'ADMINISTRADOR' : roleKey;
    const user = PREDEFINED_USERS[normalizedRole];

    if (!user) {
      return errorResponse(`Rol no válido: ${roleKey}. Debe ser RECEPCION, TECNICO o ADMINISTRADOR`, 400);
    }

    const token = await signAuthToken({
      sub: user.id,
      email: user.email,
      rol: user.rol,
      nombre_completo: user.nombre_completo,
      sucursal_id: user.sucursal_id,
      token_version: user.token_version
    });

    const response = successResponse({ user }, `Sesión cambiada a ${user.rol} exitosamente`);
    response.cookies.set('auth_token', token, getAuthCookieOptions());

    return response;
  } catch (error) {
    console.error('Error al cambiar de rol en modo pruebas:', error);
    return errorResponse(error.message || 'Error al cambiar de rol', 500);
  }
}
