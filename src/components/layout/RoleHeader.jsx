"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Radio, Bell, CheckCircle2, LogOut,
  Home, List, Users, Search, PlusSquare, ClipboardList, Settings, Package, Sliders
} from 'lucide-react';
import UserProfileModal from '@/components/auth/UserProfileModal';

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

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'US';

export default function RoleHeader({ navItems = [], roleTitle = 'Sistema ERP' }) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(j => j.success && setUser(j.data))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.push('/login');
  };

  const handlePasswordChanged = () => {
    setToastMessage('Contraseña cambiada con éxito');
    setTimeout(() => setToastMessage(''), 4000);
  };

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
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-gradient-to-br from-red-600 to-red-700 p-2 rounded-xl shadow-lg shadow-red-600/20">
            <Radio className="text-white" size={22} />
          </div>
          <div>
            <h1 className="font-black text-xl leading-none tracking-tight text-gray-900">
              AMERICA<span className="text-[#E30613]">SIS</span>
            </h1>
            <p className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-[0.25em] font-bold mt-0.5">
              {roleTitle}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
          {navItems.map(({ href, label, short, icon: Icon, iconName }) => {
            const ResolvedIcon = typeof Icon === 'string'
              ? ICON_MAP[Icon.toLowerCase()]
              : (Icon || (iconName ? ICON_MAP[iconName.toLowerCase()] : null));

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive(href)
                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-slate-200'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
                }`}
              >
                {ResolvedIcon && <ResolvedIcon size={16} className={isActive(href) ? 'text-[#E30613]' : ''} />}
                <span className="hidden lg:inline">{label}</span>
                <span className="lg:hidden">{short || label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
          </button>

          <div className="hidden sm:flex items-center gap-2.5 bg-gray-50 pl-1.5 pr-2 py-1.5 rounded-full border border-gray-200/80 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setIsProfileModalOpen(true)} title="Ver mi perfil">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-light to-navy flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {initials(user?.nombre_completo)}
            </div>
            <div className="leading-tight pr-1">
              <span className="text-xs font-bold text-gray-700 block max-w-[130px] truncate">
                {user?.nombre_completo || 'Cargando...'}
              </span>
              <span className="text-[10px] font-semibold text-gray-500">
                {user?.rol || 'Sesión'}
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
