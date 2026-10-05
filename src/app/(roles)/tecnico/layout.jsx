import React from 'react';
import RoleHeader from '@/components/layout/RoleHeader';

const TECNICO_NAV = [
  { href: '/tecnico/inicio', label: 'Inicio', short: 'Lotes', icon: 'home' },
  { href: '/tecnico/historial-personal', label: 'Historial Técnico', short: 'Historial', icon: 'clipboard' },
];

export default function TecnicoLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <RoleHeader navItems={TECNICO_NAV} roleTitle="Laboratorio RF" />
      <main className="flex-grow mx-auto w-full px-3 sm:px-4 lg:px-6 py-6 sm:py-8 max-w-7xl">
        {children}
      </main>
    </div>
  );
}
