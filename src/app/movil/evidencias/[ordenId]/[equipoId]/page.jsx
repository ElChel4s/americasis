"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { 
  Camera, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon, 
  RefreshCw,
  Radio,
  ChevronLeft
} from 'lucide-react';

const ETAPAS = [
  { id: 'RECEPCION', label: 'Recepción', color: 'bg-amber-500' },
  { id: 'DIAGNOSTICO', label: 'Laboratorio / Diagnóstico', color: 'bg-primary-600' },
  { id: 'ENTREGA', label: 'Entrega Final', color: 'bg-emerald-600' },
];

export default function MobileEvidencesPage() {
  const params = useParams();
  const ordenId = params?.ordenId;
  const equipoId = params?.equipoId;

  const [etapa, setEtapa] = useState('DIAGNOSTICO');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [evidencias, setEvidencias] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const fileInputRef = useRef(null);

  // Cargar lista de evidencias existentes
  const fetchEvidencias = async () => {
    if (!equipoId) return;
    try {
      setLoadingList(true);
      const res = await fetch(`/api/evidences/upload?equipo_id=${equipoId}`);
      const json = await res.json();
      if (json.success) {
        setEvidencias(json.data || []);
      }
    } catch (err) {
      console.error('Error cargando lista de evidencias:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchEvidencias();
  }, [equipoId]);

  const [isOptimizing, setIsOptimizing] = useState(false);

  // Manejo de captura de foto desde la cámara
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOptimizing(true);
    setUploadSuccess(false);
    setErrorMessage(null);

    try {
      const { compressImage } = await import('@/lib/utils/imageCompressor');
      const optimizedFile = await compressImage(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.78,
        returnType: 'file'
      });

      setSelectedFile(optimizedFile);
      setPreviewUrl(URL.createObjectURL(optimizedFile));

      // Feedback táctil en móviles
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (err) {
      console.error('Error optimizando imagen:', err);
      setErrorMessage('Error al optimizar la imagen');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Subir la foto seleccionada
  const handleUpload = async () => {
    if (!selectedFile || !equipoId) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('equipo_id', equipoId);
      formData.append('orden_id', ordenId || '1');
      formData.append('etapa', etapa);

      const res = await fetch('/api/evidences/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (json.success) {
        setUploadSuccess(true);
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        // Vibración de éxito en el móvil
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }

        // Recargar fotos
        fetchEvidencias();
        setTimeout(() => setUploadSuccess(false), 4000);
      } else {
        throw new Error(json.message || 'Error al subir la fotografía');
      }
    } catch (err) {
      console.error('Error subiendo imagen:', err);
      setErrorMessage(err.message || 'Error de conexión con el taller.');
    } finally {
      setIsUploading(false);
    }
  };

  const cancelarCaptura = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-10">
      {/* Header móvil */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center font-black text-sm">
            A
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">
              AMERICA ERP Móvil
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Orden #{ordenId} • Equipo #{equipoId}
            </p>
          </div>
        </div>

        <button
          onClick={fetchEvidencias}
          className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-5">
        {/* Selector de Etapa */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Etapa de la Fotografía:
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {ETAPAS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setEtapa(item.id)}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                  etapa === item.id 
                    ? `${item.color} text-white shadow-md scale-[1.02]` 
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                }`}
              >
                {item.label.split(' / ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Input Oculto de Cámara Nativa */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Banner de Éxito */}
        {uploadSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-2xl p-3.5 flex items-center gap-3 animate-in zoom-in-95 text-xs font-semibold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>¡Foto subida con éxito! Ya se visualiza en la pantalla de la PC del taller.</span>
          </div>
        )}

        {/* Banner de Error */}
        {errorMessage && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl p-3.5 flex items-center gap-3 animate-in zoom-in-95 text-xs font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Zona de Captura / Preview */}
        {!previewUrl ? (
          <div className="bg-card border-2 border-dashed border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-500 flex items-center justify-center shadow-inner">
              <Camera className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-base font-bold text-foreground">Tomar Foto con el Teléfono</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Captura el número de serie, placa, accesorios o evidencias de daño para la orden.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isOptimizing}
              className="w-full py-4 px-6 rounded-2xl bg-primary-600 hover:bg-primary-500 active:scale-95 text-white font-extrabold text-sm shadow-xl shadow-primary-500/30 flex items-center justify-center gap-2.5 transition-all disabled:opacity-70 disabled:scale-100"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Optimizando imagen...
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" /> Abrir Cámara del Celular
                </>
              )}
            </button>
          </div>
        ) : (
          /* Preview de la Foto Recién Capturada */
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl space-y-4 p-4 animate-in fade-in">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Vista previa de evidencia"
                className="w-full h-full object-contain"
              />
              <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase">
                {etapa}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelarCaptura}
                disabled={isUploading}
                className="flex-1 py-3 px-4 rounded-xl border border-border bg-muted/60 text-muted-foreground font-bold text-xs active:scale-95 transition-all"
              >
                Volver a Tomar
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-[2] py-3 px-4 rounded-xl bg-primary-600 text-white font-extrabold text-xs shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Subiendo al Taller...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" /> Confirmar y Enviar al Taller
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Galería de fotos ya subidas */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-primary-500" /> Fotos Registradas ({evidencias.length})
            </h3>
            <span className="text-[11px] text-muted-foreground">Equipo #{equipoId}</span>
          </div>

          {evidencias.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 italic text-center py-4 bg-muted/20 rounded-2xl border border-border">
              Aún no hay fotos registradas para este equipo.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {evidencias.map((ev) => (
                <a
                  key={ev.id}
                  href={ev.url_archivo}
                  target="_blank"
                  rel="noreferrer"
                  className="relative aspect-square rounded-xl overflow-hidden border border-border group bg-muted"
                >
                  <img
                    src={ev.url_archivo}
                    alt={ev.nombre_archivo}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className={`absolute bottom-1 left-1 text-[8px] font-bold px-1.5 py-0.5 rounded text-white ${
                    ev.etapa === 'RECEPCION' 
                      ? 'bg-amber-500' 
                      : ev.etapa === 'ENTREGA' 
                      ? 'bg-emerald-600' 
                      : 'bg-primary-600'
                  }`}>
                    {ev.etapa}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
