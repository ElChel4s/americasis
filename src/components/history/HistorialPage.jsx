"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Search, 
  Radio, 
  History, 
  Sparkles, 
  ArrowLeft,
  X,
  FileText,
  Printer
} from 'lucide-react';
import Link from 'next/link';
import SearchFiltersBar from '@/components/history/SearchFiltersBar';
import OrdersTable from '@/components/history/OrdersTable';
import SerialTimelineModal from '@/components/history/SerialTimelineModal';
import OrderDetailDrawer from '@/components/history/OrderDetailDrawer';
import Step4ReportPreview from '@/components/orders/Step4ReportPreview';

function HistorialContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Estados de filtros y búsqueda sincronizados
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedEstado, setSelectedEstado] = useState(searchParams.get('estado') || 'TODOS');
  const [marca, setMarca] = useState(searchParams.get('marca') || 'TODAS');
  const [banda, setBanda] = useState(searchParams.get('banda') || 'TODAS');
  const [fechaDesde, setFechaDesde] = useState(searchParams.get('desde') || '');
  const [fechaHasta, setFechaHasta] = useState(searchParams.get('hasta') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page'), 10) || 1);

  // Estados de datos
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Modales y Paneles
  const [selectedSerial, setSelectedSerial] = useState(searchParams.get('serie') || null);
  const [selectedOrderForDrawer, setSelectedOrderForDrawer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [printModalOrder, setPrintModalOrder] = useState(null);

  // Consulta de búsqueda
  const fetchSearchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedEstado !== 'TODOS') params.set('estado', selectedEstado);
      if (marca !== 'TODAS') params.set('marca', marca);
      if (banda !== 'TODAS') params.set('banda', banda);
      if (fechaDesde) params.set('desde', fechaDesde);
      if (fechaHasta) params.set('hasta', fechaHasta);
      params.set('page', String(page));
      params.set('limit', '15');

      const res = await fetch(`/api/search?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setOrders(json.data.orders || []);
        setPagination(json.data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      } else {
        setOrders([]);
        setPagination({ page: 1, limit: 15, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Error buscando órdenes:', err);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedEstado, marca, banda, fechaDesde, fechaHasta, page]);

  useEffect(() => {
    fetchSearchResults();
  }, [fetchSearchResults]);

  // Manejo de cambio de página
  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Restablecer filtros
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedEstado('TODOS');
    setMarca('TODAS');
    setBanda('TODAS');
    setFechaDesde('');
    setFechaHasta('');
    setPage(1);
    setSelectedSerial(null);
  };

  // Abrir detalle en drawer
  const handleOpenDrawer = (ord) => {
    setSelectedOrderForDrawer(ord);
    setIsDrawerOpen(true);
  };

  // Abrir reporte membretado en modal
  const handleOpenPrintModal = (ord) => {
    setPrintModalOrder(ord);
  };

  // Navegar al taller para continuar la orden
  const handleContinueInWizard = (ord) => {
    router.push(`/?orden=${ord.id}&paso=2`);
  };

  // Mapear orden para Step4ReportPreview
  const previewFormData = printModalOrder ? {
    ordenServicio: printModalOrder.numero_orden || `OS-${String(printModalOrder.id).padStart(5, '0')}`,
    cliente: printModalOrder.razon_social || 'Consumidor Final',
    nitCi: printModalOrder.nit_ci || '',
    moneda: printModalOrder.moneda || 'BOB',
    equipos: (printModalOrder.equipos || []).map((eq, i) => ({
      id: eq.id || i,
      marca: eq.marca || 'Motorola',
      modelo: eq.modelo || 'DEP450',
      serie: eq.numero_serie || '',
      numero_serie: eq.numero_serie || '',
      banda: eq.banda || 'VHF',
      reparacion_rechazada: eq.reparacion_rechazada || false,
      motivo_rechazo: eq.motivo_rechazo || '',
      falla_declarada_cliente: eq.falla_declarada_cliente || '',
      texto_diagnostico: eq.texto_diagnostico || '',
      descripcion_servicio: eq.descripcion_servicio || 'Mantenimiento preventivo y calibración RF',
      costo_servicio: parseFloat(eq.costo_servicio) || 150,
      accesoriosRecepcion: eq.accesorios 
        ? eq.accesorios.reduce((acc, a) => { acc[a.tipo_accesorio] = a.estado_ingreso; return acc; }, {}) 
        : { 'Antena': 'CON', 'Batería': 'CON', 'Cargador': 'SIN', 'Clip': 'SIN', 'Micrófono': 'SIN', 'Otros': 'SIN' },
      repuestos: eq.repuestos || [],
      fallas: eq.fallas || []
    }))
  } : null;

  return (
    <div className="space-y-6 animate-slideUp pb-12">
      
      {/* CABECERA DE LA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#E30613] bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              Auditoría & Trazabilidad
            </span>
            <span className="text-xs text-slate-400 font-bold">•</span>
            <span className="text-xs text-slate-500 font-bold">Laboratorio Motorola Solutions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-navy tracking-tight mt-1">
            Búsqueda e Historial de Órdenes
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Consulte expedientes técnicos, reimprima informes oficiales y examine la hoja de vida por número de serie.
          </p>
        </div>

        <Link
          href="/"
          className="btn-secondary py-2.5 px-4 text-xs font-bold self-start sm:self-auto flex items-center gap-2"
        >
          <ArrowLeft size={14} />
          <span>Volver al Inicio</span>
        </Link>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS OMNICANAL */}
      <SearchFiltersBar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        selectedEstado={selectedEstado}
        onEstadoChange={(est) => {
          setSelectedEstado(est);
          setPage(1);
        }}
        marca={marca}
        onMarcaChange={(m) => {
          setMarca(m);
          setPage(1);
        }}
        banda={banda}
        onBandaChange={(b) => {
          setBanda(b);
          setPage(1);
        }}
        fechaDesde={fechaDesde}
        fechaHasta={fechaHasta}
        onDateRangeChange={(d, h) => {
          setFechaDesde(d);
          setFechaHasta(h);
          setPage(1);
        }}
        onResetFilters={handleResetFilters}
        totalResults={pagination.total}
        isLoading={isLoading}
      />

      {/* TABLA DE RESULTADOS */}
      <OrdersTable
        orders={orders}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onSelectOrder={handleOpenDrawer}
        onSelectSerial={(ser) => setSelectedSerial(ser)}
        onPrintReport={handleOpenPrintModal}
      />

      {/* MODAL DE TRAZABILIDAD VITAL POR NÚMERO DE SERIE */}
      {selectedSerial && (
        <SerialTimelineModal
          serial={selectedSerial}
          onClose={() => setSelectedSerial(null)}
          onOpenOrder={(ord) => {
            setSelectedSerial(null);
            handleOpenDrawer(ord);
          }}
        />
      )}

      {/* DRAWER LATERAL DE DETALLE DE ORDEN */}
      <OrderDetailDrawer
        order={selectedOrderForDrawer}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedOrderForDrawer(null);
        }}
        onPrintReport={(ord) => {
          setIsDrawerOpen(false);
          handleOpenPrintModal(ord);
        }}
        onSelectSerial={(ser) => {
          setIsDrawerOpen(false);
          setSelectedSerial(ser);
        }}
        onContinueInWizard={handleContinueInWizard}
      />

      {/* MODAL DE REIMPRESIÓN OFICIAL (PDF / INFORME A4 MEMBRETADO) */}
      {printModalOrder && previewFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div 
            className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del modal de impresión */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-red-500" />
                <div>
                  <h3 className="text-base font-black tracking-tight text-white">
                    Re-generar Informe Técnico Oficial — #{previewFormData.ordenServicio}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {previewFormData.cliente} • Vista de impresión A4 membretada
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPrintModalOrder(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Vista previa A4 con membrete oficial */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
              <Step4ReportPreview
                formData={previewFormData}
              />
            </div>

            {/* Pie del modal */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPrintModalOrder(null)}
                className="btn-secondary py-2 px-5 text-xs font-bold"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function HistorialPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-slate-400">
        Cargando módulo de búsqueda e historial...
      </div>
    }>
      <HistorialContent />
    </Suspense>
  );
}
