import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { features } from '../config/features';

/**
 * Valida el token y devuelve el usuario si está autenticado
 */
export const verifyAuth = (request) => {
  if (!features.auth) {
    // Si auth está deshabilitado, devolvemos un usuario de sistema
    return {
      id: 1,
      email: 'admin@americasis.bo',
      nombre_completo: 'Usuario Local (Auth Desactivado)',
      rol: 'ADMINISTRADOR',
      token_version: 1,
    };
  }

  const token = request.cookies.get('auth_token')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
};
