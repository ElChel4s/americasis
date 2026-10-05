import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export default async function RootPage() {
  const enableAuth = process.env.ENABLE_AUTH === 'true';

  if (!enableAuth) {
    redirect('/admin/inicio');
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    redirect('/login');
  }

  let targetPath = '/admin/inicio';
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev-only-change-me';
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const rol = payload?.rol;

    if (rol === 'ADMINISTRADOR') {
      targetPath = '/admin/inicio';
    } else if (rol === 'RECEPCION') {
      targetPath = '/recepcion/inicio';
    } else if (rol === 'TECNICO') {
      targetPath = '/tecnico/inicio';
    } else {
      targetPath = '/login';
    }
  } catch {
    targetPath = '/login';
  }

  redirect(targetPath);
}
