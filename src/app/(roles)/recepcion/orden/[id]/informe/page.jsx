"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Printer, FileDown, Wrench, Calculator,
  Loader2, AlertCircle, Sparkles, CheckCircle2
} from 'lucide-react';
import { OrdersService } from '@/lib/services/orders.service';
import Step4ReportPreview from '@/components/orders/Step4ReportPreview';
import OrderPhaseNav from '@/components/orders/OrderPhaseNav';
import { generateDocxBlob } from '@/lib/utils/docxExport';
import { normalizeCurrency } from '@/lib/utils/currencyFormat';

function InformeOficialContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params.id;
  const autoPrint = searchParams.get('print') === '1';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('america_user_role');
      if (cached) setUserRole(cached);
    } catch {}

    fetch('/api/auth/me')
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.rol) {
          setUserRole(j.data.rol);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let isMounted = true;
    OrdersService.getOrderById(orderId)
      .then(data => {
        if (!isMounted) return;
        if (data) {
          setOrder(data);
          if (autoPrint) {
            setTimeout(() => {
              window.print();
            }, 600);
          }
          setLoading(false);
        } else {
          OrdersService.removeOrderFromLocalCache(orderId);
          setLoading(false);
          alert("La orden solicitada ya no existe o fue eliminada.");
          const role = userRole || (typeof window !== 'undefined' ? localStorage.getItem('america_user_role') : '');
          const redirectPath = role === 'ADMINISTRADOR' ? '/admin/inicio' : (role === 'TECNICO' ? '/tecnico/inicio' : '/recepcion/inicio');
          router.replace(redirectPath);
        }
      })
      .catch(err => {
        console.error('Error cargando orden en informe:', err);
        if (!isMounted) return;
        OrdersService.removeOrderFromLocalCache(orderId);
        setLoading(false);
        alert("La orden solicitada ya no existe o fue eliminada.");
        const role = userRole || (typeof window !== 'undefined' ? localStorage.getItem('america_user_role') : '');
        const redirectPath = role === 'ADMINISTRADOR' ? '/admin/inicio' : (role === 'TECNICO' ? '/tecnico/inicio' : '/recepcion/inicio');
        router.replace(redirectPath);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId, autoPrint, router, userRole]);

  const updateForm = (updates) => {
    setOrder(prev => ({ ...prev, ...updates }));
  };

  const handleDownloadDocx = async () => {
    if (!order) return;
    try {
      setIsExportingDocx(true);
      const clienteNombre = order.razon_social || order.cliente || 'CLIENTE MOSTRADOR';
      const ordenNumero = order.numero_orden || (order.id ? `OS-${String(order.id).padStart(5, '0')}` : 'PROV');
      const docxPayload = {
        ...order,
        cliente: clienteNombre,
        ordenServicio: ordenNumero
      };
      const blob = await generateDocxBlob(docxPayload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const osName = ordenNumero.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `Informe_Tecnico_${osName}_${order.moneda || 'BOB'}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generando archivo Word:', err);
      alert('No se pudo generar el archivo Word.');
    } finally {
      setIsExportingDocx(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#E30613]" />
        <span className="text-sm font-bold">Cargando Informe Oficial A4...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-lg mx-auto space-y-4 my-12">
        <AlertCircle size={36} className="text-red-600 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Orden de Servicio No Encontrada</h2>
        <p className="text-xs text-gray-500">
          No se encontró la orden solicitada (#{orderId}).
        </p>
        <button
          onClick={() => router.push(userRole === 'ADMINISTRADOR' ? '/admin/inicio' : '/recepcion/inicio')}
          className="px-5 py-2.5 bg-navy text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          <span suppressHydrationWarning>{userRole === 'ADMINISTRADOR' ? 'Volver al Panel de Gerencia' : 'Volver al Inicio'}</span>
        </button>
      </div>
    );
  }

  const normalizedOrder = {
    ...order,
    cliente: order.razon_social || order.cliente || 'Consumidor Final',
    ordenServicio: order.numero_orden || (order.id ? `OS-${String(order.id).padStart(5, '0')}` : 'PROV'),
    nitCi: order.nit_ci || order.nitCi || ''
  };

  return (
    <div className="space-y-6 pb-24 font-sans max-w-6xl mx-auto">
      {/* 1. Barra Superior de Retorno y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4 print:hidden">
        <button
          type="button"
          onClick={() => router.push(userRole === 'ADMINISTRADOR' ? '/admin/inicio' : '/recepcion/inicio')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-all cursor-pointer self-start"
        >
          <ArrowLeft size={15} />
          <span suppressHydrationWarning>
            {userRole === 'ADMINISTRADOR' ? 'Volver al Panel de Gerencia' : 'Volver al Tablero de Recepción'}
          </span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Acceso rápido a Fase 3 Presupuesto */}
          <button
            type="button"
            onClick={() => router.push(`/recepcion/orden/${order.id}/presupuesto`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-gray-700 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all"
            title="Ir a Fase 3: Ajustar precios y repuestos"
          >
            <Calculator size={14} className="text-purple-600" />
            <span>Editar Presupuesto (Fase 3)</span>
          </button>

          {/* Acceso rápido a Fase 2 Diagnóstico */}
          <button
            type="button"
            onClick={() => router.push(`/tecnico/diagnostico/${order.id}`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-gray-700 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all"
            title="Ir a Fase 2: Ver mesa de diagnóstico técnico"
          >
            <Wrench size={14} className="text-[#E30613]" />
            <span>Ver Diagnóstico (Fase 2)</span>
          </button>
        </div>
      </div>

      {/* 2. Barra de Navegación de Fases Independientes */}
      <OrderPhaseNav
        orderId={order.id}
        currentPhase={4}
        orderNumber={order.numero_orden}
        clientName={order.razon_social}
        status={order.estado}
        userRole={userRole}
      />

      {/* 3. PANTALLA PRINCIPAL: DOCUMENTO A4 OFICIAL (FASE 4) */}
      <Step4ReportPreview
        formData={normalizedOrder}
        updateForm={updateForm}
        userRole={userRole}
      />
    </div>
  );
}

export default function InformeOficialPage() {
  return (
    <Suspense fallback={
      <div className="py-24 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin text-[#E30613]" />
        <span className="text-sm font-bold">Cargando Informe Oficial A4...</span>
      </div>
    }>
      <InformeOficialContent />
    </Suspense>
  );
}
