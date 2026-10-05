"use client";

import AdminDashboard from '@/components/dashboard/AdminDashboard';
import { useRouter } from 'next/navigation';

export default function AdminInicioPage() {
  const router = useRouter();

  return (
    <AdminDashboard 
      onNewOrder={() => router.push('/recepcion/nueva-recepcion')} 
      onNewFleet={() => router.push('/recepcion/nueva-recepcion')} 
      onOpenOrder={(id) => router.push(`/admin/flujos?orden=${id}`)} 
    />
  );
}
