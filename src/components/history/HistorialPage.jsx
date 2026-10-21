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
  Printer,
  Trash2,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import SearchFiltersBar from '@/components/history/SearchFiltersBar';
import OrdersTable from '@/components/history/OrdersTable';
import SerialTimelineModal from '@/components/history/SerialTimelineModal';
import OrderDetailDrawer from '@/components/history/OrderDetailDrawer';
import { OrdersService } from '@/lib/services/orders.service';

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

  // Eliminación de órdenes (Rol Administrador)
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const r = (localStorage.getItem('america_user_role') || '').toUpperCase();
      const u = JSON.parse(localStorage.getItem('america_user') || '{}');
      const rol = (u?.rol || r || '').toUpperCase();
      setIsAdmin(rol === 'ADMINISTRADOR' || rol === 'ADMIN' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')));
    } catch {
      setIsAdmin(false);
    }
  }, []);

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

  // Navegar a la pantalla oficial e independiente de Fase 4 (Informe A4 / PDF)
  const handleOpenPrintModal = (ord) => {
    if (ord?.id) {
      router.push(`/recepcion/orden/${ord.id}/informe`);
    }
  };

  // Navegar al taller para continuar la orden
  const handleContinueInWizard = (ord) => {
    router.push(`/?orden=${ord.id}&paso=2`);
  };

  // Manejador de eliminación definitiva para Administrador
  const handleConfirmDelete = async () => {
    if (!orderToDelete?.id) return;
    try {
      setIsDeleting(true);
      await OrdersService.deleteOrder(orderToDelete.id);
      setOrders(prev => prev.filter(o => o.id !== orderToDelete.id && o.numero_orden !== orderToDelete.numero_orden));
      fetchSearchResults();
    } catch (err) {
      console.error('Error al eliminar orden de servicio:', err);
    } finally {
      setIsDeleting(false);
      setOrderToDelete(null);
    }
  };

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
        isAdmin={isAdmin}
        onDeleteOrder={(ord) => setOrderToDelete(ord)}
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

      {/* MODAL: CONFIRMACIÓN DE ELIMINACIÓN DE ORDEN (SOLO ADMINISTRADOR) */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <span className="p-2.5 bg-red-100 text-red-600 rounded-xl">
                <Trash2 size={20} />
              </span>
              <div>
                <h3 className="font-black text-gray-900 text-base">Eliminar Orden de Servicio</h3>
                <p className="text-xs text-slate-500 font-medium">Acción irreversible para Administradores</p>
              </div>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed">
              ¿Estás seguro de eliminar la orden{' '}
              <strong className="text-navy font-mono font-black">
                {orderToDelete.numero_orden || (orderToDelete.id ? `OS-${String(orderToDelete.id).padStart(5, '0')}` : 'S/N')}
              </strong>{' '}
              del cliente{' '}
              <strong className="text-navy font-bold">
                {orderToDelete.razon_social || orderToDelete.cliente || 'Consumidor Final'}
              </strong>? Esta acción no se puede deshacer.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Eliminar Definitivamente</span>
                  </>
                )}
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
