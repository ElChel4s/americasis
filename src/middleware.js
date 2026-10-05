import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev-only-change-me';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Omitir validación si la autenticación está desactivada en variables de entorno
  const enableAuth = process.env.ENABLE_AUTH === 'true';
  if (!enableAuth) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/admin/inicio', request.url));
    }
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;

  // 2. Ruta de inicio de sesión: si ya cuenta con sesión válida, redirigir al inicio
  if (pathname === '/login') {
    if (token) {
      try {
        await jwtVerify(token, secretKey);
        return NextResponse.redirect(new URL('/', request.url));
      } catch (err) {
        // Token vencido o corrupto, permitir mostrar formulario de login
      }
    }
    return NextResponse.next();
  }

  // 3. Protección de rutas: Si no hay token, redirigir a /login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Verificación de firma JWT y Control de Acceso basado en Roles (RBAC)
  try {
    const { payload } = await jwtVerify(token, secretKey);
    const rol = payload.rol;

    // Redirección de la raíz (/) al inicio correspondiente según el rol
    if (pathname === '/') {
      if (rol === 'ADMINISTRADOR') return NextResponse.redirect(new URL('/admin/inicio', request.url));
      if (rol === 'RECEPCION') return NextResponse.redirect(new URL('/recepcion/inicio', request.url));
      if (rol === 'TECNICO') return NextResponse.redirect(new URL('/tecnico/inicio', request.url));
      return NextResponse.redirect(new URL('/admin/inicio', request.url));
    }

    // Proteger las rutas de /admin/*
    if (pathname.startsWith('/admin')) {
      if (rol !== 'ADMINISTRADOR') {
        return NextResponse.redirect(new URL(`/${rol.toLowerCase()}/inicio`, request.url));
      }
    }

    // Proteger las rutas de /recepcion/*
    if (pathname.startsWith('/recepcion')) {
      if (rol !== 'RECEPCION' && rol !== 'ADMINISTRADOR') {
        return NextResponse.redirect(new URL(`/${rol.toLowerCase()}/inicio`, request.url));
      }
    }

    // Proteger las rutas de /tecnico/*
    if (pathname.startsWith('/tecnico')) {
      if (rol !== 'TECNICO' && rol !== 'ADMINISTRADOR') {
        return NextResponse.redirect(new URL(`/${rol.toLowerCase()}/inicio`, request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    // Sesión expirada o manipulada
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    loginUrl.searchParams.set('error', 'session_expired');
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Protege todas las páginas del workspace omitiendo:
     * - api (todos los endpoints REST)
     * - _next/static, _next/image (archivos estáticos compilados)
     * - favicon.ico
     * - movil (flujo de toma de fotos de celular)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|movil).*)',
  ],
};
