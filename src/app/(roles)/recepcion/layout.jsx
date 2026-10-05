import React from 'react';
import RoleHeader from '@/components/layout/RoleHeader';

const RECEPCION_NAV = [
  { href: '/recepcion/inicio', label: 'Inicio', short: 'Inicio', icon: 'home' },
  { href: '/recepcion/nueva-orden', label: 'Nueva Orden', short: 'Nueva', icon: 'plus' },
  { href: '/recepcion/catalogos', label: 'Catálogos & Fallas', short: 'Catálogos', icon: 'clipboard' },
  { href: '/recepcion/historial', label: 'Historial', short: 'Historial', icon: 'search' },
];

export default function RecepcionLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <RoleHeader navItems={RECEPCION_NAV} roleTitle="Mostrador & Recepción" />
      <main className="flex-grow mx-auto w-full px-3 sm:px-4 lg:px-6 py-6 sm:py-8 max-w-7xl">
        {children}
      </main>
    </div>
  );
}
