import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env';

const getSecretKey = () => {
  const secret = env.JWT_SECRET || 'super_secret_jwt_key_america_erp_2026_dev';
  return new TextEncoder().encode(secret);
};

/**
 * Genera un token JWT firmado con algoritmo HS256
 * @param {Object} payload { sub: id, email, rol, nombre_completo, token_version }
 * @param {string} expiresIn Duración del token (default '7d')
 */
export async function signAuthToken(payload, expiresIn = '7d') {
  const secretKey = getSecretKey();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

/**
 * Valida y descifra un token JWT
 * @param {string} token
 * @returns {Promise<Object|null>} Payload o null si es inválido
 */
export async function verifyAuthToken(token) {
  if (!token) return null;
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Opciones seguras para la cookie de autenticación httpOnly
 * Soporta tanto dominios HTTP como HTTPS en producción sin ser rechazada por el navegador
 */
export function getAuthCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  const isSecure = process.env.COOKIE_SECURE === 'true';
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
