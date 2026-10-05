import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  // Si no hay token, la vista por defecto obligatoria es el login
  if (!token) {
    redirect('/login');
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_america_erp_2026_dev';
  const secretKey = new TextEncoder().encode(JWT_SECRET);

  try {
    const { payload } = await jwtVerify(token, secretKey);
    const rol = payload?.rol;

    if (rol === 'ADMINISTRADOR') {
      redirect('/admin/inicio');
    } else if (rol === 'RECEPCION') {
      redirect('/recepcion/inicio');
    } else if (rol === 'TECNICO') {
      redirect('/tecnico/inicio');
    } else {
      redirect('/login');
    }
  } catch {
    redirect('/login');
  }
}
