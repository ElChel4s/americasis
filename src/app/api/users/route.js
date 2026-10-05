import { z } from 'zod';
import { successResponse, errorResponse } from '@/lib/common/api-response';
import { verifyAuth } from '@/lib/common/auth-guard';
import { AuthService } from '@/modules/auth/auth.service';
import { features } from '@/lib/config/features';

const createUserSchema = z.object({
  nombre_completo: z.string().min(3, 'El nombre completo debe tener al menos 3 caracteres'),
  email: z.string().email('Debe proporcionar un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña temporal debe tener al menos 6 caracteres'),
  rol: z.enum(['RECEPCION', 'TECNICO', 'ADMINISTRADOR'], {
    errorMap: () => ({ message: 'Rol inválido. Opciones: RECEPCION, TECNICO, ADMINISTRADOR' }),
  }),
  sucursal_id: z.coerce.number().int().positive().default(1),
  activo: z.boolean().default(true),
});

/**
 * GET /api/users: Lista todos los trabajadores (Solo Admin)
 */
export async function GET(request) {
  const user = verifyAuth(request);
  if (features.auth) {
    if (!user) return errorResponse('No autorizado', 401);
    if (user.rol !== 'ADMINISTRADOR') {
      return errorResponse('Acceso denegado: Se requieren privilegios de administración', 403);
    }
  }

  try {
    const users = await AuthService.listStaff();
    return successResponse(users, 'Directorio de trabajadores obtenido');
  } catch (error) {
    return errorResponse(error.message || 'Error al obtener personal', 500);
  }
}

/**
 * POST /api/users: Registra un nuevo trabajador (Solo Admin)
 */
export async function POST(request) {
  const user = verifyAuth(request);
  if (features.auth) {
    if (!user) return errorResponse('No autorizado', 401);
    if (user.rol !== 'ADMINISTRADOR') {
      return errorResponse('Acceso denegado: Solo el Administrador puede registrar personal', 403);
    }
  }

  try {
    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      const msg = validation.error.issues?.[0]?.message || 'Datos de usuario inválidos';
      return errorResponse(msg, 400);
    }

    const newUser = await AuthService.createStaff(validation.data);
    return successResponse(newUser, 'Trabajador registrado exitosamente', 201);
  } catch (error) {
    const status = error.message.includes('ya está registrado') ? 409 : 400;
    return errorResponse(error.message || 'Error al crear trabajador', status);
  }
}
