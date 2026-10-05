"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Wrench, ShieldAlert, Plus, Search, Edit3, CheckCircle2, 
  X, AlertCircle, RefreshCw, Eye, Tag, Sparkles, Filter, Check, Power
} from 'lucide-react';

const CATEGORIAS_FALLAS = [
  { id: 'TODAS', label: 'Todas las Categorías' },
  { id: 'TX', label: 'Transmisión (TX)', color: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'RX', label: 'Recepción (RX)', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'AUDIO', label: 'Audio & Micrófono', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'ALIMENTACION', label: 'Alimentación & Batería', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'LOGICA', label: 'Lógica & Firmware', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'CHASIS', label: 'Chasis & Conectores', color: 'bg-slate-100 text-slate-700 border-slate-300' },
];

const ESTADOS_CONDICION_GUIA = [
  {
    estado: 'Operativa',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    descripcion: 'El accesorio o componente responde a especificaciones de fábrica sin daños estructurales.',
    criterios: [
      'Antena con conector firme, rosca intacta y goma flexible sin rajaduras.',
      'Batería con retención de carga > 70% comprobada en analizador.',
      'Cuna de cargador con contactos limpios y fuente 13.8V estable.'
    ],
    accionRecepcion: 'Se registra como Operativo. No genera costo ni sugerencia de cambio al cliente.'
  },
  {
    estado: 'Degradado / Baja Capacidad',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    descripcion: 'Presenta desgaste por uso continuo o ciclos de recarga vencidos. Aún funciona pero con autonomía reducida.',
    criterios: [
      'Batería retiene entre 40% y 69% de carga nominal.',
      'Clip de cinturón con resorte vencido o holgura excesiva.',
      'Perilla de volumen con juego mecánico leve.'
    ],
    accionRecepcion: 'Informar al cliente en mostrador y sugerir reemplazo en cotización opcional.'
  },
  {
    estado: 'Dañado / Roto',
    badge: 'bg-red-100 text-red-800 border-red-300',
    descripcion: 'Inoperativo o con daño físico irreversible que compromete la comunicación o seguridad.',
    criterios: [
      'Antena con núcleo de cobre expuesto o conector SMA partido.',
      'Batería hinchada, sulfatada o con voltaje 0V (muerta).',
      'Cable de alimentación cortado o transformador quemado.'
    ],
    accionRecepcion: 'Marcar obligatoriamente para reemplazo y presupuestar pieza nueva original.'
  },
  {
    estado: 'Se sugiere reemplazo',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    descripcion: 'Recomendación preventiva de laboratorio para evitar fallas futuras en misiones críticas.',
    criterios: [
      'Batería de NiMH antigua con más de 2 años de servicio.',
      'Antena no calibrada para la banda de operación del handy.',
      'Micrófono con cable helicoidal estirado y falso contacto intermitente.'
    ],
    accionRecepcion: 'Incluir en el informe técnico presupuestario con observación explicativa al cliente.'
  }
];

export default function CatalogosRecepcionPage() {
  const [activeTab, setActiveTab] = useState('accesorios'); // 'accesorios' | 'fallas' | 'estados'
  const [accessories, setAccessories] = useState([]);
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('TODAS');
  const [toastMessage, setToastMessage] = useState('');

  // Modales
  const [accessoryModalOpen, setAccessoryModalOpen] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState(null);
  const [accessoryForm, setAccessoryForm] = useState({ nombre: '', repuesto_sugerido_defecto: '', orden_visual: 10 });

  const [faultModalOpen, setFaultModalOpen] = useState(false);
  const [editingFault, setEditingFault] = useState(null);
  const [faultForm, setFaultForm] = useState({ codigo: '', categoria: 'TX', label: '', descripcion: '' });

  // Carga inicial de datos
  const loadData = async () => {
    try {
      setLoading(true);
      const [accRes, faultRes] = await Promise.all([
        fetch('/api/catalogs/accessories?all=true').then(r => r.json()),
        fetch('/api/catalogs/faults?all=true').then(r => r.json()),
      ]);

      if (accRes.success) setAccessories(accRes.data || []);
      if (faultRes.success) setFaults(faultRes.data || []);
    } catch (err) {
      showToast('Error cargando catálogos: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Filtrado de accesorios
  const filteredAccessories = useMemo(() => {
    if (!searchTerm.trim()) return accessories;
    const q = searchTerm.toLowerCase();
    return accessories.filter(a => 
      a.nombre.toLowerCase().includes(q) || 
      (a.repuesto_sugerido_defecto || '').toLowerCase().includes(q)
    );
  }, [accessories, searchTerm]);

  // Filtrado de fallas
  const filteredFaults = useMemo(() => {
    return faults.filter(f => {
      const matchCat = categoriaFilter === 'TODAS' || f.categoria === categoriaFilter;
      if (!matchCat) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        f.label.toLowerCase().includes(q) ||
        f.codigo.toLowerCase().includes(q) ||
        (f.descripcion || '').toLowerCase().includes(q)
      );
    });
  }, [faults, categoriaFilter, searchTerm]);

  // Manejadores de Accesorio
  const openNewAccessoryModal = () => {
    setEditingAccessory(null);
    setAccessoryForm({ nombre: '', repuesto_sugerido_defecto: '', orden_visual: accessories.length + 1 });
    setAccessoryModalOpen(true);
  };

  const openEditAccessoryModal = (acc) => {
    setEditingAccessory(acc);
    setAccessoryForm({
      nombre: acc.nombre,
      repuesto_sugerido_defecto: acc.repuesto_sugerido_defecto || '',
      orden_visual: acc.orden_visual || 10
    });
    setAccessoryModalOpen(true);
  };

  const handleSaveAccessory = async (e) => {
    e.preventDefault();
    if (!accessoryForm.nombre.trim()) return;

    try {
      const isEdit = Boolean(editingAccessory);
      const url = '/api/catalogs/accessories';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit 
        ? { id: editingAccessory.id, ...accessoryForm }
        : accessoryForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error guardando accesorio');

      showToast(isEdit ? 'Accesorio actualizado correctamente' : '¡Accesorio agregado al catálogo!');
      setAccessoryModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const toggleAccessoryStatus = async (acc) => {
    try {
      const res = await fetch('/api/catalogs/accessories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: acc.id, activo: !acc.activo })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      showToast(`Accesorio ${!acc.activo ? 'activado' : 'desactivado'}`);
      loadData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Manejadores de Falla
  const openNewFaultModal = () => {
    setEditingFault(null);
    setFaultForm({ codigo: '', categoria: 'TX', label: '', descripcion: '' });
    setFaultModalOpen(true);
  };

  const openEditFaultModal = (falla) => {
    setEditingFault(falla);
    setFaultForm({
      codigo: falla.codigo,
      categoria: falla.categoria || 'TX',
      label: falla.label,
      descripcion: falla.descripcion || ''
    });
    setFaultModalOpen(true);
  };

  const handleSaveFault = async (e) => {
    e.preventDefault();
    if (!faultForm.label.trim()) return;

    try {
      const isEdit = Boolean(editingFault);
      const url = '/api/catalogs/faults';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit
        ? { codigo: editingFault.codigo, ...faultForm }
        : {
            ...faultForm,
            codigo: faultForm.codigo.trim() || faultForm.label.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error guardando falla');

      showToast(isEdit ? 'Falla actualizada' : '¡Falla agregada al catálogo!');
      setFaultModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const toggleFaultStatus = async (falla) => {
    try {
      const res = await fetch('/api/catalogs/faults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: falla.codigo, activo: !falla.activo })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      showToast(`Falla ${!falla.activo ? 'activada' : 'desactivada'}`);
      loadData();
    } catch (err) {
      showToast(err.message, true);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-3">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cabecera Principal */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-red-100 text-[#E30613] rounded-xl">
              <Package size={20} />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#E30613]">
              Catálogos Maestros de Recepción
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Accesorios, Fallas & Criterios de Ingreso
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
            Gestiona los accesorios recibidos en mostrador, el catálogo oficial de fallas de placa RF y la guía de evaluación física.
          </p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-3 shrink-0">
          {activeTab === 'accesorios' && (
            <button
              onClick={openNewAccessoryModal}
              className="px-4 py-2.5 bg-[#E30613] hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-red-600/20 cursor-pointer active:scale-95"
            >
              <Plus size={16} />
              <span>Nuevo Accesorio</span>
            </button>
          )}

          {activeTab === 'fallas' && (
            <button
              onClick={openNewFaultModal}
              className="px-4 py-2.5 bg-navy hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-slate-900/10 cursor-pointer active:scale-95"
            >
              <Plus size={16} />
              <span>Registrar Nueva Falla</span>
            </button>
          )}

          <button
            onClick={loadData}
            title="Recargar datos"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs Principales */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('accesorios'); setSearchTerm(''); }}
          className={`pb-3.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'accesorios'
              ? 'border-[#E30613] text-[#E30613]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Package size={17} />
          <span>Accesorios de Recepción ({accessories.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('fallas'); setSearchTerm(''); }}
          className={`pb-3.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'fallas'
              ? 'border-[#E30613] text-[#E30613]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Wrench size={17} />
          <span>Catálogo de Fallas RF ({faults.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('estados'); setSearchTerm(''); }}
          className={`pb-3.5 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'estados'
              ? 'border-[#E30613] text-[#E30613]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShieldAlert size={17} />
          <span>Guía de Estados & Criterios</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda (Excepto en pestaña de estados) */}
      {activeTab !== 'estados' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={`Buscar en ${activeTab === 'accesorios' ? 'accesorios...' : 'fallas...'}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#E30613] focus:ring-3 focus:ring-red-500/10 transition-all"
            />
          </div>

          {activeTab === 'fallas' && (
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Filter size={12} /> Criterio:
              </span>
              {CATEGORIAS_FALLAS.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    categoriaFilter === cat.id
                      ? 'bg-navy text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-gray-600'
                  }`}
                >
                  {cat.id}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: ACCESORIOS DE RECEPCIÓN */}
      {/* =================================================================== */}
      {activeTab === 'accesorios' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccessories.length === 0 ? (
            <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-200 text-center text-gray-400">
              <Package size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="font-bold text-sm">No se encontraron accesorios en el catálogo.</p>
              <button
                onClick={openNewAccessoryModal}
                className="mt-3 text-xs font-bold text-[#E30613] hover:underline cursor-pointer"
              >
                + Agregar el primer accesorio ahora
              </button>
            </div>
          ) : (
            filteredAccessories.map(acc => (
              <div 
                key={acc.id} 
                className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between group shadow-xs hover:shadow-md ${
                  acc.activo ? 'border-slate-200/80 hover:border-red-200' : 'border-slate-200 opacity-60 bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-red-50 text-[#E30613] font-bold text-xs flex items-center justify-center">
                        #{acc.orden_visual || '—'}
                      </span>
                      <h3 className="font-bold text-gray-900 text-sm">{acc.nombre}</h3>
                    </div>
                    
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      acc.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-gray-600'
                    }`}>
                      {acc.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                      Repuesto sugerido por defecto:
                    </span>
                    <p className="text-xs text-gray-700 font-semibold italic">
                      {acc.repuesto_sugerido_defecto || 'Sin sugerencia estándar'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEditAccessoryModal(acc)}
                    className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => toggleAccessoryStatus(acc)}
                    className={`text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                      acc.activo ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'
                    }`}
                  >
                    <Power size={13} />
                    <span>{acc.activo ? 'Desactivar' : 'Activar'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: CATÁLOGO DE FALLAS TÉCNICAS DE PLACA */}
      {/* =================================================================== */}
      {activeTab === 'fallas' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-gray-500 border-b border-slate-200">
                  <th className="py-3.5 px-4 sm:px-6">Categoría</th>
                  <th className="py-3.5 px-4">Código Técnico</th>
                  <th className="py-3.5 px-4">Denominación Oficial</th>
                  <th className="py-3.5 px-4">Descripción del Diagnóstico</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredFaults.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 font-bold">
                      No se encontraron fallas registradas con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filteredFaults.map(f => {
                    const catObj = CATEGORIAS_FALLAS.find(c => c.id === f.categoria) || CATEGORIAS_FALLAS[1];
                    return (
                      <tr key={f.codigo} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 sm:px-6">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${catObj.color || 'bg-slate-100 text-slate-700'}`}>
                            {f.categoria}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-gray-800">
                          {f.codigo}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900">
                          {f.label}
                        </td>
                        <td className="py-3 px-4 text-gray-500 max-w-xs truncate" title={f.descripcion}>
                          {f.descripcion || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            f.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-gray-600'
                          }`}>
                            {f.activo ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="py-3 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditFaultModal(f)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-gray-600 transition-colors cursor-pointer"
                              title="Editar falla"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => toggleFaultStatus(f)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                f.activo ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={f.activo ? 'Desactivar falla' : 'Activar falla'}
                            >
                              <Power size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: GUÍA DE EVALUACIÓN FÍSICA EN MOSTRADOR */}
      {/* =================================================================== */}
      {activeTab === 'estados' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 sm:p-7 rounded-3xl text-white shadow-lg shadow-red-600/15">
            <h2 className="text-xl sm:text-2xl font-black mb-1">
              Protocolo de Inspección Visual para Recepción
            </h2>
            <p className="text-xs sm:text-sm text-red-100 max-w-3xl leading-relaxed">
              Al momento de registrar un handy en mostrador, el personal de recepción debe calificar visualmente cada accesorio adjunto. Esta clasificación establece la expectativa del cliente y define qué piezas se cotizarán en el informe técnico.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ESTADOS_CONDICION_GUIA.map(est => (
              <div key={est.estado} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase border ${est.badge}`}>
                      {est.estado}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400">
                      Criterio Oficial
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 font-semibold mb-4 leading-relaxed">
                    {est.descripcion}
                  </p>

                  <div className="space-y-2 mb-5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                      Puntos de Verificación Visual:
                    </span>
                    {est.criterios.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-700 font-medium">
                        <Check size={14} className="text-[#E30613] shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-0.5">
                    Instrucción para el Recepcionista:
                  </span>
                  <p className="text-xs font-bold text-gray-800">
                    {est.accionRecepcion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: AGREGAR / EDITAR ACCESORIO */}
      {/* =================================================================== */}
      {accessoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-red-100 text-[#E30613] rounded-xl">
                  <Package size={18} />
                </span>
                <h3 className="font-black text-gray-900 text-lg">
                  {editingAccessory ? 'Editar Accesorio' : 'Nuevo Accesorio de Recepción'}
                </h3>
              </div>
              <button 
                onClick={() => setAccessoryModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAccessory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Nombre del Accesorio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Funda de Cuero con Correa"
                  value={accessoryForm.nombre}
                  onChange={(e) => setAccessoryForm({ ...accessoryForm, nombre: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#E30613] focus:ring-3 focus:ring-red-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Repuesto Sugerido por Defecto
                </label>
                <input
                  type="text"
                  placeholder="ej. Funda Original Motorola PMLN5842"
                  value={accessoryForm.repuesto_sugerido_defecto}
                  onChange={(e) => setAccessoryForm({ ...accessoryForm, repuesto_sugerido_defecto: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#E30613] focus:ring-3 focus:ring-red-500/10"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Se autocompletará en la cotización cuando el técnico sugiera reemplazo.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Posición / Orden Visual
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={accessoryForm.orden_visual}
                  onChange={(e) => setAccessoryForm({ ...accessoryForm, orden_visual: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#E30613]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAccessoryModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#E30613] hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20 cursor-pointer"
                >
                  {editingAccessory ? 'Guardar Cambios' : 'Registrar Accesorio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: AGREGAR / EDITAR FALLA DE PLACA */}
      {/* =================================================================== */}
      {faultModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-navy text-white rounded-xl">
                  <Wrench size={18} />
                </span>
                <h3 className="font-black text-gray-900 text-lg">
                  {editingFault ? 'Editar Falla Técnica' : 'Registrar Falla de Placa RF'}
                </h3>
              </div>
              <button 
                onClick={() => setFaultModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveFault} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Categoría RF *
                  </label>
                  <select
                    value={faultForm.categoria}
                    onChange={(e) => setFaultForm({ ...faultForm, categoria: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-[#E30613]"
                  >
                    {CATEGORIAS_FALLAS.filter(c => c.id !== 'TODAS').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Código Técnico {editingFault ? '(Fijo)' : '(Opcional)'}
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(editingFault)}
                    placeholder="ej. ETAPA_PA_FINAL"
                    value={faultForm.codigo}
                    onChange={(e) => setFaultForm({ ...faultForm, codigo: e.target.value.toUpperCase() })}
                    className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-[#E30613] ${
                      editingFault ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Denominación Oficial / Título *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Transistor Excitador Descalibrado"
                  value={faultForm.label}
                  onChange={(e) => setFaultForm({ ...faultForm, label: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#E30613] focus:ring-3 focus:ring-red-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Descripción Técnica para Informe
                </label>
                <textarea
                  rows={3}
                  placeholder="Explique el impacto técnico de la falla en la comunicación del radio..."
                  value={faultForm.descripcion}
                  onChange={(e) => setFaultForm({ ...faultForm, descripcion: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#E30613] focus:ring-3 focus:ring-red-500/10"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFaultModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-navy hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-900/10 cursor-pointer"
                >
                  {editingFault ? 'Actualizar Falla' : 'Registrar Falla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
