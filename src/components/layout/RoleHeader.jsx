"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Radio, Bell, CheckCircle2, LogOut, ArrowLeft,
  Home, List, Users, Search, PlusSquare, ClipboardList, Settings, Package, Sliders
} from 'lucide-react';
import UserProfileModal from '@/components/auth/UserProfileModal';
import NotificationsBell from '@/components/layout/NotificationsBell';

const ICON_MAP = {
  home: Home,
  list: List,
  users: Users,
  search: Search,
  plus: PlusSquare,
  plussquare: PlusSquare,
  clipboard: ClipboardList,
  clipboardlist: ClipboardList,
  settings: Settings,
  package: Package,
  sliders: Sliders,
};

const ADMIN_NAV = [
  { href: '/admin/inicio', label: 'Inicio', short: 'Inicio', icon: 'home' },
  { href: '/admin/flujos', label: 'Flujos Actuales', short: 'Flujos', icon: 'list' },
  { href: '/recepcion/catalogos', label: 'Catálogos & Fallas', short: 'Catálogos', icon: 'clipboard' },
  { href: '/admin/personal', label: 'Personal', short: 'Personal', icon: 'users' },
  { href: '/admin/historial', label: 'Historial', short: 'Historial', icon: 'search' },
];

const RECEPCION_NAV = [
  { href: '/recepcion/inicio', label: 'Inicio', short: 'Inicio', icon: 'home' },
  { href: '/recepcion/nueva-orden', label: 'Nueva Orden', short: 'Nueva', icon: 'plus' },
  { href: '/recepcion/catalogos', label: 'Catálogos & Fallas', short: 'Catálogos', icon: 'clipboard' },
  { href: '/recepcion/historial', label: 'Historial', short: 'Historial', icon: 'search' },
];

const TECNICO_NAV = [
  { href: '/tecnico/inicio', label: 'Inicio', short: 'Lotes', icon: 'home' },
  { href: '/tecnico/historial-personal', label: 'Historial Técnico', short: 'Historial', icon: 'clipboard' },
];

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'US';

export default function RoleHeader({ navItems = [], roleTitle = 'Sistema ERP' }) {
  const pathname = usePathname();
  const router = useRouter();

  // Inicialización idéntica entre servidor y cliente para evitar Error de Hidratación #418
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    setMounted(true);
    try {
      const cached = localStorage.getItem('america_user');
      if (cached) setUser(JSON.parse(cached));
    } catch {}

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data) {
          setUser(j.data);
          try {
            localStorage.setItem('america_user', JSON.stringify(j.data));
            localStorage.setItem('america_user_role', j.data.rol || '');
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('america_user');
      localStorage.removeItem('america_user_role');
    } catch {}
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login';
  };

  const handlePasswordChanged = () => {
    setToastMessage('Contraseña cambiada con éxito');
    setTimeout(() => setToastMessage(''), 4000);
  };

  // En SSR e hidratación inicial se usan estrictamente los props del servidor
  const userRole = mounted ? user?.rol : null;
  let effectiveRoleTitle = roleTitle;
  let effectiveNavItems = navItems;
  let homeLink = roleTitle.includes('Gerencia') 
    ? '/admin/inicio' 
    : (roleTitle.includes('Mostrador') ? '/recepcion/inicio' : '/tecnico/inicio');

  // Una vez montado en el cliente, si el usuario autenticado es Administrador, aseguramos su rol
  if (mounted && userRole === 'ADMINISTRADOR') {
    effectiveRoleTitle = 'Gerencia General';
    effectiveNavItems = ADMIN_NAV;
    homeLink = '/admin/inicio';
  } else if (mounted && userRole === 'RECEPCION') {
    effectiveRoleTitle = 'Mostrador & Recepción';
    effectiveNavItems = RECEPCION_NAV;
    homeLink = '/recepcion/inicio';
  } else if (mounted && userRole === 'TECNICO') {
    effectiveRoleTitle = 'Laboratorio RF';
    effectiveNavItems = TECNICO_NAV;
    homeLink = '/tecnico/inicio';
  }

  const isActive = (href) => {
    if (href.endsWith('/inicio')) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 print:hidden">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-3">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="mx-auto px-4 sm:px-6 h-16 sm:h-[68px] flex items-center justify-between gap-4 max-w-7xl">
        {/* Logo & Identidad con enlace al inicio propio del rol */}
        <div className="flex items-center gap-3 shrink-0">
          <Link 
            href={homeLink}
            className="flex items-center gap-3 group hover:opacity-95 transition-opacity"
            title="Ir al inicio principal"
          >
            <div className="bg-gradient-to-br from-red-600 to-red-700 p-2 rounded-xl shadow-lg shadow-red-600/20 group-hover:scale-105 transition-transform">
              <Radio className="text-white" size={22} />
            </div>
            <div>
              <h1 className="font-black text-xl leading-none tracking-tight text-gray-900">
                AMERICA<span className="text-[#E30613]">SIS</span>
              </h1>
              <p suppressHydrationWarning className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-[0.25em] font-bold mt-0.5">
                {effectiveRoleTitle}
              </p>
            </div>
          </Link>

          {/* Botón de acceso directo al Panel de Gerencia cuando el Admin está en vistas operativas */}
          {mounted && userRole === 'ADMINISTRADOR' && !pathname.startsWith('/admin') && (
            <Link
              href="/admin/inicio"
              id="btn-header-back-to-admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 ml-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer animate-in fade-in"
              title="Regresar al panel ejecutivo de Gerencia General"
            >
              <ArrowLeft size={14} className="text-[#E30613]" />
              <span className="hidden sm:inline">Panel de Gerencia</span>
              <span className="sm:hidden">Gerencia</span>
            </Link>
          )}

          {/* Botón de acceso directo a Recepción cuando personal de recepción está en diagnósticos técnicos */}
          {mounted && userRole === 'RECEPCION' && pathname.startsWith('/tecnico') && (
            <Link
              href="/recepcion/inicio"
              id="btn-header-back-to-recepcion"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 ml-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer animate-in fade-in"
              title="Regresar al Tablero de Mostrador y Recepción"
            >
              <ArrowLeft size={14} className="text-[#E30613]" />
              <span className="hidden sm:inline">Volver a Recepción</span>
              <span className="sm:hidden">Recepción</span>
            </Link>
          )}
        </div>

        {/* Navigation adaptada al rol del usuario */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
          {effectiveNavItems.map(({ href, label, short, icon: Icon, iconName }) => {
            const ResolvedIcon = typeof Icon === 'string'
              ? ICON_MAP[Icon.toLowerCase()]
              : (Icon || (iconName ? ICON_MAP[iconName.toLowerCase()] : null));

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive(href)
                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-slate-200'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
                }`}
              >
                {ResolvedIcon && <ResolvedIcon size={16} className={isActive(href) ? 'text-[#E30613]' : ''} />}
                <span>{short || label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <NotificationsBell 
            userRole={userRole || user?.rol} 
            onActionToast={(msg) => {
              setToastMessage(msg);
              setTimeout(() => setToastMessage(''), 4000);
            }} 
          />
          <div className="hidden sm:flex items-center gap-2.5 bg-gray-50 pl-1.5 pr-2 py-1.5 rounded-full border border-gray-200/80 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setIsProfileModalOpen(true)} title="Ver mi perfil">
            <div suppressHydrationWarning className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-light to-navy flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {initials(user?.nombre_completo)}
            </div>
            <div className="leading-tight pr-1">
              <span suppressHydrationWarning className="text-xs font-bold text-gray-700 block max-w-[130px] truncate">
                {user?.nombre_completo || 'Cargando...'}
              </span>
              <span suppressHydrationWarning className="text-[10px] font-semibold text-gray-500">
                {userRole || 'Sesión'}
              </span>
            </div>
          </div>

          {/* Botón directo de Cerrar Sesión */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200/80 hover:border-red-600 transition-all duration-150 cursor-pointer shadow-xs active:scale-95"
            title="Cerrar sesión del sistema"
            id="btn-header-logout"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onLogout={handleLogout}
        onPasswordChanged={handlePasswordChanged}
      />
    </header>
  );
}
