"use client";

import FrontDeskDashboard from '@/components/dashboard/FrontDeskDashboard';
import { useRouter } from 'next/navigation';

export default function RecepcionInicioPage() {
  const router = useRouter();

  return (
    <FrontDeskDashboard 
      onNewOrder={() => router.push('/recepcion/nueva-recepcion?nuevo=1')}
      onNewFleet={() => router.push('/recepcion/nueva-recepcion?flota=1')}
      onOpenOrder={(id) => router.push(`/recepcion/nueva-recepcion?orden=${id}`)}
    />
  );
}
