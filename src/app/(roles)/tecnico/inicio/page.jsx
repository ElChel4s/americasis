"use client";

import TechnicianDashboard from '@/components/dashboard/TechnicianDashboard';
import { useRouter } from 'next/navigation';

export default function TecnicoInicioPage() {
  const router = useRouter();

  return (
    <TechnicianDashboard 
      onNewOrder={() => router.push('/tecnico/diagnostico/nuevo?nuevo=1')}
      onNewFleet={() => router.push('/tecnico/diagnostico/nuevo?flota=1')}
      onOpenOrder={(id) => router.push(`/tecnico/diagnostico/${id}?orden=${id}&paso=2`)}
    />
  );
}
