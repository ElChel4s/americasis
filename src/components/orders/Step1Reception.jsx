"use client";

import React, { useState, useRef } from 'react';
import { User, ScanLine, Settings2, Camera, Upload, ImagePlus, X, Aperture, Plus, Radio, Trash2 } from 'lucide-react';
import QrMobileModal from '@/components/modals/QrMobileModal';
import EquipmentTabs from '@/components/orders/EquipmentTabs';

const MARCAS_RADIO = ['Motorola', 'Vertex Standard', 'Yaesu', 'Kenwood', 'Icom', 'Hytera', 'Baofeng', 'Otro'];
const MODELOS_COMUNES = ['DEP450', 'PRO5150', 'EP450', 'DGM4100', 'DGP8550', 'VX-2100', 'VX-2200', 'FT-2980R', 'EM200'];
const DEFAULT_CATALOGO = ['Antena', 'Batería', 'Cargador de Base', 'Clip de Cinturón', 'Micrófono de Palma', 'Manos Libres / PTT', 'Eliminador de Batería', 'Funda de Cuero', 'Otros'];

export default function Step1Reception({ 
  formData = { ordenServicio: '', cliente: '', equipos: [{ id: '1', accesoriosRecepcion: {} }] }, 
  updateForm, 
  updateEquipo, 
  addEquipo, 
  removeEquipo, 
  activeEquipoIndex = 0, 
  setActiveEquipoIndex,
  onNext
}) {
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [nuevoAccesorioRecepcion, setNuevoAccesorioRecepcion] = useState('');
  const [catalogoRecepcion, setCatalogoRecepcion] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('america_catalogo_accesorios');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_CATALOGO;
  });
  const fileInputRef = useRef(null);

  const equipo = formData.equipos[activeEquipoIndex] || {};

  const handleAgregarAccesorio = (e) => {
    if (e) e.preventDefault();
    const texto = nuevoAccesorioRecepcion.trim();
    if (!texto) return;
    if (!catalogoRecepcion.includes(texto)) {
      const nuevoCat = [...catalogoRecepcion, texto];
      setCatalogoRecepcion(nuevoCat);
      try {
        localStorage.setItem('america_catalogo_accesorios', JSON.stringify(nuevoCat));
      } catch (err) {}
    }
    setNuevoAccesorioRecepcion('');
  };

  const eliminarAccesorioRecepcion = (item) => {
    const nuevoCat = catalogoRecepcion.filter(a => a !== item);
    setCatalogoRecepcion(nuevoCat);
    try {
      localStorage.setItem('america_catalogo_accesorios', JSON.stringify(nuevoCat));
    } catch (err) {}
  };

  // Sincronizar evidencias recibidas en vivo desde el celular
  const handleSyncEvidencias = (syncedImages) => {
    if (!Array.isArray(syncedImages)) return;
    const currentImages = equipo.imagenes || [];
    const currentUrls = new Set(currentImages.map(img => img.url));
    const newItems = syncedImages.filter(img => !currentUrls.has(img.url));
    if (newItems.length > 0) {
      updateEquipo(activeEquipoIndex, {
        imagenes: [...currentImages, ...newItems]
      });
    }
  };

  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleImageSelect = async (files) => {
    if (!files || files.length === 0) return;
    
    setIsOptimizing(true);
    try {
      const { compressImage } = await import('@/lib/utils/imageCompressor');
      const currentImages = equipo.imagenes || [];
      const newPreviews = [...currentImages];
      
      const optimizations = Array.from(files).map(async (file) => {
        const optimizedFile = await compressImage(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.78,
          returnType: 'file'
        });
        const url = URL.createObjectURL(optimizedFile);
        return { url, name: optimizedFile.name, file: optimizedFile, etapa: 'RECEPCION' };
      });
      
      const compressedFiles = await Promise.all(optimizations);
      newPreviews.push(...compressedFiles);
      
      updateEquipo(activeEquipoIndex, { imagenes: newPreviews });
    } catch (err) {
      console.error('Error optimizando imágenes en Step 1:', err);
      alert('Hubo un error al optimizar las imágenes.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRemoveImage = (index) => {
    const updated = (equipo.imagenes || []).filter((_, i) => i !== index);
    updateEquipo(activeEquipoIndex, { imagenes: updated });
  };

  const imagePreviews = equipo.imagenes || [];

  return (
    <div className="space-y-6 animate-slideUp">
      {/* Title */}
      <div className="mb-2">
        <h2 className="section-title">
          Recepción del Equipo
        </h2>
        <p className="text-gray-400 text-sm sm:text-base">Registre los datos del equipo para iniciar la orden de servicio.</p>
      </div>

      {/* Cliente y Orden de Servicio */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="input-label">Número de Orden de Servicio (# O.S.)</label>
            <input 
              type="text" 
              placeholder="Ej. OS-00124"
              className="input-field text-lg font-bold text-primary-600 placeholder:font-normal placeholder:text-primary-300 bg-primary-50/50 border-primary-200 focus:border-primary-500 focus:ring-primary-500/20"
              value={formData.ordenServicio || ''}
              onChange={(e) => updateForm({ ordenServicio: e.target.value })}
            />
          </div>
          <div>
            <label className="input-label">
              <User size={14} className="text-muted-foreground"/> Cliente o Empresa
            </label>
            <input 
              type="text" 
              placeholder="Ej. MINERA SAN CRISTOBAL"
              className="input-field text-lg uppercase"
              value={formData.cliente || ''}
              onChange={(e) => updateForm({ cliente: e.target.value.toUpperCase() })}
            />
          </div>
        </div>
      </div>

      {/* Tabs de equipos */}
      <EquipmentTabs
        equipos={formData.equipos}
        activeIndex={activeEquipoIndex}
        onSelect={setActiveEquipoIndex}
        onAdd={addEquipo}
        onRemove={removeEquipo}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
        
        {/* Left Column: Main data */}
        <div className="lg:col-span-7 space-y-5">
          <div className="card space-y-5">
            {/* Marca + Modelo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Marca</label>
                <select 
                  className="input-field appearance-none cursor-pointer"
                  value={equipo.marca || ''}
                  onChange={(e) => updateEquipo(activeEquipoIndex, { marca: e.target.value })}
                >
                  <option value="" disabled>Seleccionar...</option>
                  {MARCAS_RADIO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Modelo</label>
                <input 
                  type="text" 
                  list="modelos-comunes-list"
                  placeholder="Ej. DEP450, VX-2100"
                  className="input-field uppercase"
                  value={equipo.modelo || ''}
                  onChange={(e) => updateEquipo(activeEquipoIndex, { modelo: e.target.value })}
                />
                <datalist id="modelos-comunes-list">
                  {MODELOS_COMUNES.map(m => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Serial Number y Banda */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="input-label mb-0">Número de Serie (S/N)</label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ScanLine size={11} className="text-emerald-600" />
                    Pistola / Escáner
                  </span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    id={`input-serie-equipo-${activeEquipoIndex}`}
                    placeholder="Dispare pistola o ingrese S/N..."
                    className="input-field flex-1 font-mono text-base sm:text-lg uppercase tracking-wider border-2 focus:border-red-500"
                    value={equipo.serie || ''}
                    onChange={(e) => updateEquipo(activeEquipoIndex, { serie: e.target.value.toUpperCase() })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = e.target.value.trim().toUpperCase();
                        if (val) {
                          updateEquipo(activeEquipoIndex, { serie: val });
                        }
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const input = document.getElementById(`input-serie-equipo-${activeEquipoIndex}`);
                      if (input) {
                        input.focus();
                        input.select();
                      }
                    }}
                    className="px-3.5 rounded-xl border-2 flex items-center justify-center transition-all bg-white border-slate-200 text-slate-600 hover:border-red-400 hover:text-red-600 hover:bg-red-50"
                    title="Enfocar campo para disparar con pistola lectora de código de barras"
                  >
                    <ScanLine size={20} />
                  </button>
                </div>
              </div>
              <div>
                <label className="input-label">Banda de Frecuencia</label>
                <div className="flex gap-2 h-[58px]">
                  <button
                    type="button"
                    onClick={() => updateEquipo(activeEquipoIndex, { banda: 'VHF' })}
                    className={`flex-1 rounded-xl border-2 font-bold text-sm transition-all ${
                      equipo.banda === 'VHF' 
                        ? 'bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-500/20' 
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    VHF
                  </button>
                  <button
                    type="button"
                    onClick={() => updateEquipo(activeEquipoIndex, { banda: 'UHF' })}
                    className={`flex-1 rounded-xl border-2 font-bold text-sm transition-all ${
                      equipo.banda === 'UHF' 
                        ? 'bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-500/20' 
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    UHF
                  </button>
                </div>
              </div>
            </div>

            {/* Falla declarada por el cliente */}
            <div>
              <label className="input-label">Falla declarada por el cliente</label>
              <textarea
                rows={3}
                placeholder="Ej. No transmite, se apaga al presionar PTT..."
                className="input-field resize-y min-h-[90px] text-sm"
                value={equipo.falla_declarada_cliente || ''}
                onChange={(e) => updateEquipo(activeEquipoIndex, { falla_declarada_cliente: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Accessories + Images */}
        <div className="lg:col-span-5 space-y-5">
          {/* Accessories Check-in */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Settings2 size={16} className="text-[#E30613]"/>
                <h3 className="text-gray-900 font-bold text-sm">
                  Inventario de Accesorios (Recepción)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {Object.values(equipo.accesoriosRecepcion || {}).filter(v => v === 'CON').length} con equipo
                </span>
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(true)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-slate-200/60 transition-colors"
                  title="Administrar opciones del catálogo de accesorios"
                >
                  <Settings2 size={15} />
                </button>
              </div>
            </div>

            {/* Lista de Accesorios con marcado CON / SIN */}
            <div className="p-4 space-y-2 max-h-[380px] overflow-y-auto scrollbar-thin">
              {catalogoRecepcion.map((item) => {
                const accesoriosObj = equipo.accesoriosRecepcion || {};
                const val = accesoriosObj[item] || 'SIN';
                const isOtros = item.toLowerCase() === 'otros';

                return (
                  <div 
                    key={item} 
                    className={`flex flex-col p-2.5 rounded-xl border transition-all ${
                      val === 'CON' 
                        ? 'border-emerald-300 bg-emerald-50/40 shadow-xs' 
                        : 'border-slate-200/80 bg-slate-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                          {item}
                        </span>
                        {!['Antena', 'Batería', 'Cargador de Base', 'Clip de Cinturón', 'Otros'].includes(item) && (
                          <button
                            type="button"
                            onClick={() => eliminarAccesorioRecepcion(item)}
                            className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors"
                            title="Eliminar del catálogo"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateEquipo(activeEquipoIndex, { 
                            accesoriosRecepcion: { 
                              ...accesoriosObj, 
                              [item]: 'CON' 
                            } 
                          })}
                          className={`px-3 py-1 text-xs font-black rounded-lg transition-all border cursor-pointer ${
                            val === 'CON' 
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/20' 
                              : 'bg-white text-gray-500 border-slate-200 hover:bg-slate-100 hover:text-gray-800'
                          }`}
                        >
                          CON
                        </button>
                        <button
                          type="button"
                          onClick={() => updateEquipo(activeEquipoIndex, { 
                            accesoriosRecepcion: { 
                              ...accesoriosObj, 
                              [item]: 'SIN' 
                            } 
                          })}
                          className={`px-3 py-1 text-xs font-black rounded-lg transition-all border cursor-pointer ${
                            val === 'SIN' 
                              ? 'bg-red-50 text-red-700 border-red-200' 
                              : 'bg-white text-gray-400 border-slate-200 hover:bg-slate-100 hover:text-gray-600'
                          }`}
                        >
                          SIN
                        </button>
                      </div>
                    </div>

                    {isOtros && val === 'CON' && (
                      <div className="mt-2 pt-2 border-t border-slate-200 w-full animate-slideUp">
                        <input
                          type="text"
                          placeholder="Especifique el accesorio extra recibido..."
                          className="w-full px-3 py-1.5 rounded-lg text-xs bg-white text-gray-900 border border-slate-300 focus:border-[#E30613] focus:ring-1 focus:ring-red-500/20 outline-none placeholder:text-gray-400 transition-all font-medium"
                          value={equipo.otrosDescripcion || ''}
                          onChange={(e) => updateEquipo(activeEquipoIndex, { otrosDescripcion: e.target.value })}
                        />
                      </div>
                    )}

                    {item === 'Antena' && val === 'CON' && (
                      <div className="mt-2 pt-2 border-t border-slate-200 w-full animate-slideUp">
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Estado Visual (Antena)</label>
                        <select
                          className="w-full px-3 py-1.5 rounded-lg text-xs bg-white text-gray-900 border border-slate-300 focus:border-[#E30613] outline-none font-medium"
                          value={accesoriosObj[`${item}_estado`] || 'Operativa'}
                          onChange={(e) => updateEquipo(activeEquipoIndex, { 
                            accesoriosRecepcion: { ...accesoriosObj, [`${item}_estado`]: e.target.value } 
                          })}
                        >
                          <option value="Operativa">Operativa</option>
                          <option value="Se sugiere reemplazo">Se sugiere reemplazo</option>
                        </select>
                      </div>
                    )}

                    {item === 'Batería' && val === 'CON' && (
                      <div className="mt-2 pt-2 border-t border-slate-200 w-full animate-slideUp grid grid-cols-1 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Modelo / N° Parte</label>
                          <input
                            type="text"
                            placeholder="Ej. PMNN4409AR"
                            className="w-full px-3 py-1.5 rounded-lg text-xs bg-white text-gray-900 border border-slate-300 focus:border-[#E30613] outline-none"
                            value={accesoriosObj[`${item}_modelo`] || ''}
                            onChange={(e) => updateEquipo(activeEquipoIndex, { 
                              accesoriosRecepcion: { ...accesoriosObj, [`${item}_modelo`]: e.target.value } 
                            })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Código Lote/Serie</label>
                          <input
                            type="text"
                            placeholder="Ej. 1745 o S/N"
                            className="w-full px-3 py-1.5 rounded-lg text-xs bg-white text-gray-900 border border-slate-300 focus:border-[#E30613] outline-none"
                            value={accesoriosObj[`${item}_lote`] || ''}
                            onChange={(e) => updateEquipo(activeEquipoIndex, { 
                              accesoriosRecepcion: { ...accesoriosObj, [`${item}_lote`]: e.target.value } 
                            })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Capacidad de Carga ({accesoriosObj[`${item}_carga`] || 50}%)</label>
                          <input
                            type="range"
                            min="0" max="100" step="5"
                            className="w-full accent-[#E30613]"
                            value={accesoriosObj[`${item}_carga`] || 50}
                            onChange={(e) => updateEquipo(activeEquipoIndex, { 
                              accesoriosRecepcion: { ...accesoriosObj, [`${item}_carga`]: e.target.value } 
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Añadir Accesorio Rápido */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 mt-auto">
              <form onSubmit={handleAgregarAccesorio} className="flex gap-2">
                <input
                  type="text"
                  placeholder="+ Añadir otro accesorio (ej. Funda)..."
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-white text-gray-900 border border-slate-200 focus:border-[#E30613] focus:ring-1 focus:ring-red-500/20 outline-none placeholder:text-gray-400 font-medium"
                  value={nuevoAccesorioRecepcion}
                  onChange={(e) => setNuevoAccesorioRecepcion(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!nuevoAccesorioRecepcion.trim()}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Añadir</span>
                </button>
              </form>
            </div>
          </div>

          {/* Evidencias Fotográficas con Celular (QR) y en Vivo */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-[#E30613]" />
                <h3 className="text-gray-900 font-bold text-sm">
                  Evidencias Fotográficas en Recepción
                </h3>
              </div>
              <span className="text-[11px] font-bold text-gray-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {imagePreviews.length} foto(s)
              </span>
            </div>

            {/* Dos Acciones: Escanear QR con Celular o Subir desde PC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setShowQRModal(true)}
                className="w-full border-2 border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-2xl p-3.5 flex items-center gap-3 text-emerald-800 transition-all group cursor-pointer text-left shadow-xs"
              >
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <Camera size={20} />
                </div>
                <div>
                  <p className="font-black text-xs sm:text-sm text-emerald-950 leading-tight">Tomar con Celular</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5 font-bold">Escanear Código QR</p>
                </div>
              </button>

              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isOptimizing}
                className="w-full border border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-100/60 rounded-2xl p-3.5 flex items-center gap-3 text-gray-700 transition-all group cursor-pointer text-left disabled:opacity-60"
              >
                <div className="w-10 h-10 bg-white border border-slate-200 text-navy rounded-xl flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                  {isOptimizing ? <Aperture className="animate-spin" size={18} /> : <ImagePlus size={18} />}
                </div>
                <div>
                  <p className="font-bold text-xs sm:text-sm text-gray-900 leading-tight">
                    {isOptimizing ? 'Optimizando...' : 'Subir desde PC'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {isOptimizing ? 'Procesando imágenes' : 'Explorar archivos'}
                  </p>
                </div>
              </button>
            </div>

            {/* Galería de fotos en vivo para este radio */}
            {imagePreviews.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic text-center py-2">
                Sin fotos aún. Escanee el QR con su celular para fotografiar el radio y sus placas al instante.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {imagePreviews.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
                    <img src={img.url} alt={img.name || `Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Eliminar foto"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Gestión de Catálogo de Accesorios */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings2 size={18} className="text-[#E30613]" />
                <h3 className="font-black text-gray-900 text-base">Catálogo de Accesorios</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Personalice la lista de accesorios estándar para la recepción de radios Motorola, Yaesu y Vertex:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {catalogoRecepcion.map((acc, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-gray-800">{acc}</span>
                  {!['Antena', 'Batería', 'Cargador de Base', 'Clip de Cinturón', 'Otros'].includes(acc) && (
                    <button
                      type="button"
                      onClick={() => eliminarAccesorioRecepcion(acc)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Eliminar del catálogo"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleAgregarAccesorio} className="flex gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                placeholder="Nuevo accesorio estándar..."
                className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#E30613] outline-none text-gray-900 font-medium"
                value={nuevoAccesorioRecepcion}
                onChange={(e) => setNuevoAccesorioRecepcion(e.target.value)}
              />
              <button
                type="submit"
                disabled={!nuevoAccesorioRecepcion.trim()}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                Añadir
              </button>
            </form>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal for Mobile Link con sincronización en vivo */}
      <QrMobileModal 
        isOpen={showQRModal} 
        onClose={() => setShowQRModal(false)} 
        ordenId={formData.ordenServicio || 'NUEVA'}
        equipoId={equipo.id || `eq-${activeEquipoIndex}`}
        equipoNombre={`${equipo.marca || 'Radio'} ${equipo.modelo || ''} (S/N: ${equipo.serie || 'Pendiente'})`}
        onImagesUpdated={handleSyncEvidencias}
      />

      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files.length > 0) {
            handleImageSelect(e.target.files);
            e.target.value = '';
          }
        }}
      />
    </div>
  );
}
