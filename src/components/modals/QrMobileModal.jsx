"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  Smartphone, 
  Copy, 
  Check, 
  UploadCloud, 
  Image as ImageIcon, 
  RefreshCw, 
  Wifi, 
  ExternalLink,
  Layers
} from 'lucide-react';
import { supabase } from '@/lib/config/supabase-client';

export default function QrMobileModal({ 
  isOpen, 
  onClose, 
  ordenId = '1', 
  equipoId = '1', 
  equipoNombre = 'Radio',
  onImagesUpdated
}) {
  const [copied, setCopied] = useState(false);
  const [customHost, setCustomHost] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''));
  const [evidencias, setEvidencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingPc, setUploadingPc] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState('DIAGNOSTICO');
  const fileInputRef = useRef(null);

  const mobileUrl = useMemo(() => {
    const host = customHost || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${host.replace(/\/$/, '')}/movil/evidencias/${ordenId}/${equipoId}`;
  }, [customHost, ordenId, equipoId]);

  // Notificar al componente padre cuando se actualizan las evidencias
  useEffect(() => {
    if (evidencias.length > 0 && onImagesUpdated) {
      onImagesUpdated(evidencias.map(ev => ({
        url: ev.url_archivo,
        name: ev.nombre_archivo || 'Foto Evidencia',
        id: ev.id,
        etapa: ev.etapa
      })));
    }
  }, [evidencias, onImagesUpdated]);

  // Actualizar URL si el usuario ajusta el host (ej. cambia localhost por su IP 192.168.x.x para leer desde el celular)
  const handleHostChange = (newHost) => {
    setCustomHost(newHost);
  };

  // Cargar fotos existentes
  const fetchEvidencias = async () => {
    if (!equipoId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/evidences/upload?equipo_id=${equipoId}`);
      const json = await res.json();
      if (json.success) {
        setEvidencias(json.data || []);
      }
    } catch (err) {
      console.error('Error cargando evidencias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !equipoId) return;

    let isMounted = true;
    fetch(`/api/evidences/upload?equipo_id=${equipoId}`)
      .then(r => r.json())
      .then(json => {
        if (isMounted && json.success) {
          setEvidencias(json.data || []);
        }
      })
      .catch(() => {});

    // 1. Suscripción Supabase Realtime si está disponible
    let channel = null;
    if (supabase) {
      channel = supabase
        .channel(`realtime-evidencias-${equipoId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'equipo_evidencias',
            filter: `equipo_id=eq.${equipoId}`
          },
          (payload) => {
            if (payload.new && isMounted) {
              setEvidencias((prev) => [payload.new, ...prev]);
            }
          }
        )
        .subscribe();
    }

    // 2. Polling de respaldo cada 3.5 segundos para modo local o sin WebSockets
    const interval = setInterval(() => {
      fetch(`/api/evidences/upload?equipo_id=${equipoId}`)
        .then(r => r.json())
        .then(json => {
          if (isMounted && json.success) {
            setEvidencias(json.data || []);
          }
        })
        .catch(() => {});
    }, 3500);

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isOpen, equipoId]);

  // Subida directa desde PC
  const handlePcUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPc(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('equipo_id', equipoId);
        formData.append('orden_id', ordenId);
        formData.append('etapa', selectedEtapa);

        const res = await fetch('/api/evidences/upload', {
          method: 'POST',
          body: formData
        });
        const json = await res.json();
        if (json.success && json.data) {
          setEvidencias((prev) => [json.data, ...prev]);
        }
      }
    } catch (err) {
      console.error('Error subiendo desde PC:', err);
    } finally {
      setUploadingPc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-500 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Sincronización de Evidencias en Vivo
              </h2>
              <p className="text-xs text-muted-foreground">
                Orden #{ordenId} — {equipoNombre} (ID Equipo: #{equipoId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body dividido en dos columnas: QR a la izquierda y Galería en vivo a la derecha */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Columna Izquierda: Código QR y Enlace */}
          <div className="md:col-span-5 p-6 flex flex-col items-center justify-between space-y-5 bg-background/50">
            <div className="w-full text-center space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Wifi className="w-3 h-3 animate-pulse" /> Sincronización Realtime Activa
              </span>
              <p className="text-xs text-muted-foreground pt-1">
                Abre la cámara de tu smartphone y escanea el código para abrir la app móvil:
              </p>
            </div>

            {/* Código QR */}
            <div className="p-4 bg-white rounded-2xl shadow-xl border border-border/80 flex items-center justify-center transition-transform hover:scale-105 duration-300">
              {mobileUrl ? (
                <QRCodeSVG 
                  value={mobileUrl} 
                  size={190}
                  level="M"
                  includeMargin={false}
                />
              ) : (
                <div className="w-[190px] h-[190px] flex items-center justify-center text-xs text-muted-foreground">
                  Generando QR...
                </div>
              )}
            </div>

            {/* IP o Host editable para taller en red local */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Servidor / Red Wi-Fi:</span>
                <span className="text-[10px] text-primary-500 font-mono">Modificable para Wi-Fi local</span>
              </div>
              <input
                type="text"
                value={customHost}
                onChange={(e) => handleHostChange(e.target.value)}
                placeholder="http://192.168.1.100:3000"
                className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs font-mono text-foreground focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />

              {/* Botón copiar link o abrir en pestaña */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> ¡Enlace Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" /> Copiar Enlace
                    </>
                  )}
                </button>
                <a
                  href={mobileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                  title="Abrir vista móvil en navegador"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Subida alternativa desde la PC */}
            <div className="w-full pt-3 border-t border-border">
              <input
                type="file"
                multiple
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePcUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPc}
                className="w-full py-2.5 px-4 rounded-xl border border-dashed border-primary-500/40 hover:border-primary-500 bg-primary-500/5 hover:bg-primary-500/10 text-primary-500 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <UploadCloud className="w-4 h-4" />
                {uploadingPc ? 'Subiendo fotos...' : 'O subir fotos directamente desde esta PC'}
              </button>
            </div>
          </div>

          {/* Columna Derecha: Galería de Fotos en Vivo */}
          <div className="md:col-span-7 p-6 flex flex-col overflow-hidden bg-card/40">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary-500" />
                <h3 className="font-bold text-sm text-foreground">
                  Evidencias Recibidas en Vivo ({evidencias.length})
                </h3>
              </div>
              <button
                onClick={fetchEvidencias}
                disabled={loading}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Actualizar galería"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Galería */}
            <div className="flex-1 overflow-y-auto pr-1">
              {evidencias.length === 0 ? (
                <div className="h-64 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-muted-foreground p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 opacity-40" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Esperando fotos...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Las imágenes capturadas con el celular aparecerán aquí al instante sin recargar la página.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {evidencias.map((ev) => (
                    <div 
                      key={ev.id} 
                      className="group relative rounded-2xl overflow-hidden border border-border bg-background shadow-md flex flex-col aspect-square"
                    >
                      <img
                        src={ev.url_archivo}
                        alt={ev.nombre_archivo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      
                      {/* Badge de etapa */}
                      <span className={`absolute top-2 left-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-md ${
                        ev.etapa === 'RECEPCION' 
                          ? 'bg-amber-500 text-white' 
                          : ev.etapa === 'ENTREGA' 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-primary-600 text-white'
                      }`}>
                        {ev.etapa}
                      </span>

                      {/* Footer flotante con fecha y driver */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                        <span className="text-[10px] truncate max-w-[100px]">
                          {new Date(ev.fecha_subida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <a
                          href={ev.url_archivo}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] bg-white/20 hover:bg-white/40 px-2 py-0.5 rounded backdrop-blur-sm"
                        >
                          Ver
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
