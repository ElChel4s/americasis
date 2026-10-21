/**
 * Servicio Centralizado de Gestión y Persistencia de Usuarios y Técnicos
 * América Sistemas de Comunicación
 */

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
    id: 'b0000000-0000-0000-0000-000000000005',
    legacy_id: 'usr-ramiro-condori',
    nombre_completo: 'Ramiro Condori',
    email: 'tecnico1@americasis.com',
    username: 'tecnico1',
    rol: 'TECNICO',
    activo: true,
    cargo: 'Técnico Especialista RF'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    nombre_completo: 'Roberto Gómez',
    email: 'tecnico@americasis.com',
    username: 'tecnico',
    rol: 'TECNICO',
    activo: true,
    cargo: 'Técnico RF'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000004',
    nombre_completo: 'Carlos Mamani',
    email: 'cmamani@americasis.com',
    username: 'cmamani',
    rol: 'TECNICO',
    activo: true,
    cargo: 'Laboratorio RF'
  },
  {
    id: 'b0000000-0000-0000-0000-000000000003',
    nombre_completo: 'Ana Morales',
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
   * Inicializa y asegura que los usuarios esenciales (incluyendo a Ramiro Condori)
   * estén presentes en localStorage['americasis_users']
   */
  initStorage: () => {
    if (typeof window === 'undefined') return DEFAULT_USERS;
    try {
      const local = UsersService.getLocalUsers();
      let modified = false;
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

      // Asegurar específicamente a Ramiro Condori
      const ramiroNorm = normalizeEmail('tecnico1@americasis.com');
      if (!map.has(ramiroNorm) || map.get(ramiroNorm).rol !== 'TECNICO') {
        map.set(ramiroNorm, {
          id: 'b0000000-0000-0000-0000-000000000005',
          legacy_id: 'usr-ramiro-condori',
          nombre_completo: 'Ramiro Condori',
          email: 'tecnico1@americasis.com',
          username: 'tecnico1',
          rol: 'TECNICO',
          activo: true,
          cargo: 'Técnico Especialista RF'
        });
        modified = true;
      }

      const combined = Array.from(map.values());
      if (modified || local.length === 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      }
      return combined;
    } catch (e) {
      console.warn('Error inicializando americasis_users:', e);
      return DEFAULT_USERS;
    }
  },

  /**
   * Obtiene todos los usuarios disponibles (por defecto + locales)
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

    // Garantizar que Ramiro Condori siempre figure
    const ramiroNorm = normalizeEmail('tecnico1@americasis.com');
    if (!map.has(ramiroNorm)) {
      map.set(ramiroNorm, {
        id: 'b0000000-0000-0000-0000-000000000005',
        legacy_id: 'usr-ramiro-condori',
        nombre_completo: 'Ramiro Condori',
        email: 'tecnico1@americasis.com',
        username: 'tecnico1',
        rol: 'TECNICO',
        activo: true,
        cargo: 'Técnico Especialista RF'
      });
    }

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
   * Busca un usuario por ID o por coincidencia de email / nombre
   */
  findUserByIdOrEmail: (identifier) => {
    if (!identifier) return null;
    const clean = String(identifier).trim().toLowerCase();
    const cleanNorm = normalizeEmail(clean);
    const all = UsersService.getAllUsers();

    return all.find(u => 
      String(u.id) === String(identifier) ||
      normalizeEmail(u.email) === cleanNorm ||
      (u.username && u.username.toLowerCase() === clean) ||
      (u.email && u.email.toLowerCase().startsWith(clean + '@')) ||
      (u.nombre_completo && u.nombre_completo.toLowerCase() === clean)
    ) || null;
  },

  /**
   * Guarda o actualiza un usuario en localStorage['americasis_users'] y notifica globalmente
   */
  saveLocalUser: (userData) => {
    if (typeof window === 'undefined' || !userData) return null;

    try {
      const currentList = UsersService.getAllUsers();
      const normEmail = normalizeEmail(userData.email);
      
      const cleanUser = {
        id: userData.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nombre_completo: (userData.nombre_completo || 'Nuevo Colaborador').trim(),
        email: normEmail || (userData.email || '').trim().toLowerCase(),
        rol: userData.rol || 'TECNICO',
        activo: userData.activo !== false,
        sucursal_id: userData.sucursal_id || 1,
        cargo: userData.cargo || (userData.rol === 'TECNICO' ? 'Técnico Especialista RF' : (userData.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Recepción')),
        actualizado_en: new Date().toISOString()
      };

      // Si existe por id o por email normalizado, actualizar; de lo contrario añadir
      let updated = false;
      const newList = currentList.map(u => {
        if (String(u.id) === String(cleanUser.id) || (normEmail && normalizeEmail(u.email) === normEmail)) {
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
