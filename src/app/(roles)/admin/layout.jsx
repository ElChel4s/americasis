import React from 'react';
import RoleHeader from '@/components/layout/RoleHeader';

const ADMIN_NAV = [
  { href: '/admin/inicio', label: 'Inicio', short: 'Inicio', icon: 'home' },
  { href: '/admin/flujos', label: 'Flujos Actuales', short: 'Flujos', icon: 'list' },
  { href: '/recepcion/catalogos', label: 'Catálogos & Fallas', short: 'Catálogos', icon: 'clipboard' },
  { href: '/admin/personal', label: 'Personal', short: 'Personal', icon: 'users' },
  { href: '/admin/historial', label: 'Historial', short: 'Historial', icon: 'search' },
];

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <RoleHeader navItems={ADMIN_NAV} roleTitle="Gerencia General" />
      <main className="flex-grow mx-auto w-full px-3 sm:px-4 lg:px-6 py-6 sm:py-8 max-w-7xl">
        {children}
      </main>
    </div>
  );
}
