import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_america_erp_2026_dev';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // En caso de querer desactivar auth explícitamente en desarrollo
  if (process.env.ENABLE_AUTH === 'false') {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/admin/inicio', request.url));
    }
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;

  // 1. Ruta /login: Si ya cuenta con sesión válida, redirigir al panel correspondiente
  if (pathname === '/login') {
    if (token) {
      try {
        const { payload } = await jwtVerify(token, secretKey);
        const rol = payload?.rol;
        if (rol === 'ADMINISTRADOR') return NextResponse.redirect(new URL('/admin/inicio', request.url));
        if (rol === 'RECEPCION') return NextResponse.redirect(new URL('/recepcion/inicio', request.url));
        if (rol === 'TECNICO') return NextResponse.redirect(new URL('/tecnico/inicio', request.url));
        return NextResponse.redirect(new URL('/admin/inicio', request.url));
      } catch (err) {
        // Token vencido o corrupto, limpiar cookie y mostrar login
        const response = NextResponse.next();
        response.cookies.delete('auth_token');
        return response;
      }
    }
    return NextResponse.next();
  }

  // 2. Si no hay token de autenticación: Bloquear y redirigir inmediatamente a /login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 3. Verificación criptográfica de JWT y Control de Acceso basado en Roles (RBAC)
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

    // Proteger /admin/*
    if (pathname.startsWith('/admin')) {
      if (rol !== 'ADMINISTRADOR') {
        const target = rol === 'RECEPCION' ? '/recepcion/inicio' : '/tecnico/inicio';
        return NextResponse.redirect(new URL(target, request.url));
      }
    }

    // Proteger /recepcion/*
    if (pathname.startsWith('/recepcion')) {
      if (rol !== 'RECEPCION' && rol !== 'ADMINISTRADOR') {
        const target = rol === 'TECNICO' ? '/tecnico/inicio' : '/admin/inicio';
        return NextResponse.redirect(new URL(target, request.url));
      }
    }

    // Proteger /tecnico/*
    if (pathname.startsWith('/tecnico')) {
      if (rol !== 'TECNICO' && rol !== 'ADMINISTRADOR') {
        const target = rol === 'RECEPCION' ? '/recepcion/inicio' : '/admin/inicio';
        return NextResponse.redirect(new URL(target, request.url));
      }
    }

    return NextResponse.next();
  } catch (error) {
    // Sesión expirada o manipulada
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname);
    }
    loginUrl.searchParams.set('error', 'session_expired');
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Protege todas las rutas de la aplicación omitiendo:
     * - api (endpoints REST)
     * - _next/static, _next/image (estáticos de Next.js)
     * - favicon.ico y archivos con extensión (imágenes, fuentes, etc.)
     * - movil
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|uploads|.*\\..*|movil).*)',
  ],
};
