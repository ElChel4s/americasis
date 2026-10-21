/**
 * Servicio Centralizado de Gestión y Persistencia Dinámica de Usuarios y Técnicos
 * Conectado a Supabase con fallback a LocalStorage
 * América Sistemas de Comunicación
 */

import { supabase } from '@/lib/config/supabase-client';

export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const DEFAULT_USERS = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    nombre_completo: 'Administrador General',
    email: 'admin@americasis.com',
    username: 'admin',
    rol: 'ADMINISTRADOR',
    activo: true,
    cargo: 'Gerencia General'
  },
  {
    id: '1f578df4-aa7b-4924-81a7-fc08b0961d1a',
    legacy_id: 'usr-ramiro-condori',
    alias_id: 'b0000000-0000-0000-0000-000000000005',
    nombre_completo: 'Ramiro Condori',
    email: 'tecnico1@americasis.com',
    username: 'tecnico1',
    rol: 'TECNICO',
    activo: true,
    cargo: 'Técnico Especialista RF'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    nombre_completo: 'Roberto Gómez (Técnico RF)',
    email: 'tecnico@americasis.com',
    username: 'tecnico',
    rol: 'TECNICO',
    activo: true,
    cargo: 'Técnico RF'
  },
  {
    id: '53593940-1ee9-47b9-8139-3f57b267cf92',
    nombre_completo: 'Carlos Mamani',
    email: 'cmamani@americasis.com',
    username: 'cmamani',
    rol: 'TECNICO',
    activo: true,
    cargo: 'Laboratorio RF'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    nombre_completo: 'Ana Morales (Recepción)',
    email: 'recepcion@americasis.com',
    username: 'recepcion',
    rol: 'RECEPCION',
    activo: true,
    cargo: 'Atención al Cliente y Recepción'
  }
];

const STORAGE_KEY = 'americasis_users';

export const UsersService = {
  /**
   * Obtiene los usuarios locales guardados en localStorage
   */
  getLocalUsers: () => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Error leyendo americasis_users de localStorage:', e);
      return [];
    }
  },

  /**
   * Consulta dinámica a la tabla 'usuarios' de Supabase
   * Sincroniza automáticamente en localStorage y notifica globalmente
   */
  getUsuarios: async ({ soloActivos = true } = {}) => {
    if (supabase) {
      try {
        let query = supabase
          .from('usuarios')
          .select('id, nombre_completo, email, rol, activo, cargo_titulo, firma_digital_url');

        if (soloActivos) {
          query = query.eq('activo', true);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped = data.map(u => ({
            id: u.id,
            nombre_completo: u.nombre_completo,
            email: u.email,
            username: (u.email || '').split('@')[0],
            rol: u.rol,
            activo: u.activo,
            cargo: u.cargo_titulo || (u.rol === 'TECNICO' ? 'Técnico Especialista RF' : u.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Recepción'),
            firma_digital_url: u.firma_digital_url
          }));

          // Sincronizar en localStorage para fallback offline
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
              window.dispatchEvent(new CustomEvent('americasis_users_updated', {
                detail: { users: mapped }
              }));
            } catch (e) {}
          }
          return mapped;
        }
      } catch (err) {
        console.warn('Error consultando usuarios en Supabase:', err);
      }
    }

    // Fallback a localStorage si Supabase falla o no está conectado
    return UsersService.getAllUsers();
  },

  /**
   * Inicializa y asegura que los usuarios esenciales estén presentes en localStorage
   * y lanza sincronización asíncrona en segundo plano con Supabase
   */
  initStorage: () => {
    if (typeof window === 'undefined') return DEFAULT_USERS;
    try {
      const local = UsersService.getLocalUsers();
      const map = new Map();

      // Precargar los default
      DEFAULT_USERS.forEach(u => {
        map.set(normalizeEmail(u.email), { ...u });
      });

      // Sobrescribir o añadir con los locales existentes
      local.forEach(u => {
        const norm = normalizeEmail(u.email);
        if (norm) {
          map.set(norm, { ...map.get(norm), ...u });
        } else if (u.id) {
          map.set(String(u.id), u);
        }
      });

      const combined = Array.from(map.values());
      if (local.length === 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      }

      // Sincronizar asíncronamente con Supabase en segundo plano
      if (typeof window !== 'undefined' && supabase) {
        UsersService.getUsuarios().catch(() => {});
      }

      return combined;
    } catch (e) {
      console.warn('Error inicializando americasis_users:', e);
      return DEFAULT_USERS;
    }
  },

  /**
   * Obtiene todos los usuarios disponibles de forma síncrona (localStorage + defaults)
   */
  getAllUsers: () => {
    if (typeof window === 'undefined') return DEFAULT_USERS;
    const local = UsersService.getLocalUsers();
    const map = new Map();

    DEFAULT_USERS.forEach(u => {
      map.set(normalizeEmail(u.email), { ...u });
    });

    local.forEach(u => {
      const norm = normalizeEmail(u.email);
      if (norm) {
        map.set(norm, { ...map.get(norm), ...u });
      } else if (u.id) {
        map.set(String(u.id), u);
      }
    });

    return Array.from(map.values());
  },

  /**
   * Obtiene la lista activa de Técnicos RF para asignación y firmas
   */
  getTecnicos: () => {
    const all = UsersService.getAllUsers();
    return all.filter(u => u.rol === 'TECNICO' && u.activo !== false);
  },

  /**
   * Busca un usuario por ID o por coincidencia de email / username / nombre
   */
  findUserByIdOrEmail: (identifier) => {
    if (!identifier) return null;
    const clean = String(identifier).trim().toLowerCase();
    const cleanNorm = normalizeEmail(clean);
    const all = UsersService.getAllUsers();

    return all.find(u => 
      String(u.id) === String(identifier) ||
      (u.legacy_id && String(u.legacy_id) === String(identifier)) ||
      (u.alias_id && String(u.alias_id) === String(identifier)) ||
      normalizeEmail(u.email) === cleanNorm ||
      (u.username && u.username.toLowerCase() === clean) ||
      (u.email && u.email.toLowerCase().startsWith(clean + '@')) ||
      (u.nombre_completo && u.nombre_completo.toLowerCase() === clean)
    ) || null;
  },

  /**
   * Crea un usuario insertándolo en Supabase y guardándolo en localStorage
   */
  createUsuario: async (userData) => {
    if (!userData) return null;
    let cleanEmail = normalizeEmail(userData.email) || (userData.email || '').trim().toLowerCase();
    if (cleanEmail && !cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail}@americasis.com`;
    }

    const payload = {
      nombre_completo: (userData.nombre_completo || 'Nuevo Colaborador').trim(),
      email: cleanEmail,
      rol: userData.rol || 'TECNICO',
      activo: userData.activo !== false,
      cargo_titulo: userData.cargo || (userData.rol === 'TECNICO' ? 'Técnico Especialista RF' : userData.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Recepción'),
      sucursal_id: 'a0000000-0000-0000-0000-000000000001',
      password_hash: userData.password_hash || '$2b$10$0VYKfuMtSx.k6FGWQ.5mEu61FLzQCktOax6RQfXxdUcKfHeLB7h66'
    };

    let createdUser = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .insert(payload)
          .select('id, nombre_completo, email, rol, activo, cargo_titulo, firma_digital_url')
          .single();

        if (!error && data) {
          createdUser = {
            id: data.id,
            nombre_completo: data.nombre_completo,
            email: data.email,
            username: (data.email || '').split('@')[0],
            rol: data.rol,
            activo: data.activo,
            cargo: data.cargo_titulo
          };
        }
      } catch (err) {
        console.warn('Error insertando usuario en Supabase:', err);
      }
    }

    const finalUser = createdUser || {
      id: userData.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...payload,
      username: cleanEmail.split('@')[0],
      cargo: payload.cargo_titulo
    };

    UsersService.saveLocalUser(finalUser);
    return finalUser;
  },

  /**
   * Guarda o actualiza un usuario en localStorage['americasis_users'] y notifica globalmente
   */
  saveLocalUser: (userData) => {
    if (typeof window === 'undefined' || !userData) return null;

    try {
      const currentList = UsersService.getAllUsers();
      let normEmail = normalizeEmail(userData.email);
      if (normEmail && !normEmail.includes('@')) {
        normEmail = `${normEmail}@americasis.com`;
      }
      
      const cleanUser = {
        id: userData.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        legacy_id: userData.legacy_id,
        alias_id: userData.alias_id,
        nombre_completo: (userData.nombre_completo || 'Nuevo Colaborador').trim(),
        email: normEmail || (userData.email || '').trim().toLowerCase(),
        username: (normEmail || userData.email || '').split('@')[0],
        rol: userData.rol || 'TECNICO',
        activo: userData.activo !== false,
        sucursal_id: userData.sucursal_id || 'a0000000-0000-0000-0000-000000000001',
        cargo: userData.cargo || (userData.rol === 'TECNICO' ? 'Técnico Especialista RF' : (userData.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Recepción')),
        actualizado_en: new Date().toISOString()
      };

      let updated = false;
      const newList = currentList.map(u => {
        if (
          String(u.id) === String(cleanUser.id) || 
          (cleanUser.legacy_id && String(u.legacy_id) === String(cleanUser.legacy_id)) ||
          (normEmail && normalizeEmail(u.email) === normEmail)
        ) {
          updated = true;
          return { ...u, ...cleanUser };
        }
        return u;
      });

      if (!updated) {
        newList.unshift(cleanUser);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));

      // Notificar a todos los componentes escuchando el evento
      window.dispatchEvent(new CustomEvent('americasis_users_updated', {
        detail: { users: newList, savedUser: cleanUser }
      }));

      return cleanUser;
    } catch (err) {
      console.error('Error guardando usuario local:', err);
      return null;
    }
  }
};
