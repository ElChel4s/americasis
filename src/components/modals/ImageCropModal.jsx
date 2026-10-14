"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCw, Check, X, RotateCcw, Crop } from 'lucide-react';

/**
 * ImageCropModal — Herramienta interactiva de recorte estilo WhatsApp
 * Diseñada para pantallas táctiles móviles y escritorio.
 * 
 * Props:
 * - isOpen: boolean
 * - imageSrc: string (object URL o data URL)
 * - onCropComplete: (croppedBlob: Blob, croppedUrl: string) => void
 * - onClose: () => void
 */
export default function ImageCropModal({
  isOpen,
  imageSrc,
  onCropComplete,
  onClose,
}) {
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Dimensiones del visor y de la imagen representada
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Coordenadas relativas del cuadro de recorte [0..1]
  // { x: 0..1, y: 0..1, width: 0..1, height: 0..1 }
  const [crop, setCrop] = useState({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });

  // Manejo de arrastre
  const dragRef = useRef({
    isDragging: false,
    dragType: null, // 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
    startX: 0,
    startY: 0,
    initialCrop: null,
  });

  // Reiniciar estado al abrir con nueva imagen
  useEffect(() => {
    if (isOpen && imageSrc) {
      setRotation(0);
      setImageLoaded(false);
      setCrop({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
    }
  }, [isOpen, imageSrc]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setCrop({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setCrop({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
  };

  const handleReset = () => {
    setRotation(0);
    setCrop({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 });
  };

  // Inicio de arrastre (touch o mouse)
  const startDrag = (e, dragType) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragRef.current = {
      isDragging: true,
      dragType,
      startX: clientX,
      startY: clientY,
      initialCrop: { ...crop },
    };
  };

  // Movimiento de arrastre
  const onDragMove = useCallback((e) => {
    if (!dragRef.current.isDragging || !imageRef.current) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const imgRect = imageRef.current.getBoundingClientRect();
    if (!imgRect.width || !imgRect.height) return;

    const deltaX = (clientX - dragRef.current.startX) / imgRect.width;
    const deltaY = (clientY - dragRef.current.startY) / imgRect.height;
    const { initialCrop, dragType } = dragRef.current;

    const minSize = 0.15; // Tamaño mínimo del recorte (15% del total)

    let newCrop = { ...initialCrop };

    if (dragType === 'move') {
      let nextX = initialCrop.x + deltaX;
      let nextY = initialCrop.y + deltaY;

      // Limitar dentro de [0, 1]
      nextX = Math.max(0, Math.min(nextX, 1 - initialCrop.width));
      nextY = Math.max(0, Math.min(nextY, 1 - initialCrop.height));

      newCrop.x = nextX;
      newCrop.y = nextY;
    } else {
      // Modificar esquinas o bordes
      let left = initialCrop.x;
      let top = initialCrop.y;
      let right = initialCrop.x + initialCrop.width;
      let bottom = initialCrop.y + initialCrop.height;

      if (dragType.includes('w')) {
        left = Math.min(right - minSize, Math.max(0, initialCrop.x + deltaX));
      }
      if (dragType.includes('e')) {
        right = Math.max(left + minSize, Math.min(1, initialCrop.x + initialCrop.width + deltaX));
      }
      if (dragType.includes('n')) {
        top = Math.min(bottom - minSize, Math.max(0, initialCrop.y + deltaY));
      }
      if (dragType.includes('s')) {
        bottom = Math.max(top + minSize, Math.min(1, initialCrop.y + initialCrop.height + deltaY));
      }

      newCrop = {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      };
    }

    setCrop(newCrop);
  }, [crop]);

  const endDrag = useCallback(() => {
    dragRef.current.isDragging = false;
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleTouchMove = (e) => onDragMove(e);
    const handleTouchEnd = () => endDrag();
    const handleMouseMove = (e) => onDragMove(e);
    const handleMouseUp = () => endDrag();

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, onDragMove, endDrag]);

  // Generar recorte final usando canvas
  const handleConfirmCrop = async () => {
    if (!imageRef.current) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Determinar dimensiones según rotación
      const isRotated90or270 = rotation === 90 || rotation === 270;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      const workingWidth = isRotated90or270 ? naturalHeight : naturalWidth;
      const workingHeight = isRotated90or270 ? naturalWidth : naturalHeight;

      // Tamaño y posición de recorte en píxeles reales
      const cropX = Math.round(crop.x * workingWidth);
      const cropY = Math.round(crop.y * workingHeight);
      const cropW = Math.round(crop.width * workingWidth);
      const cropH = Math.round(crop.height * workingHeight);

      canvas.width = cropW;
      canvas.height = cropH;

      // Transformación de rotación y traslación
      ctx.save();
      ctx.translate(-cropX, -cropY);

      if (rotation !== 0) {
        ctx.translate(workingWidth / 2, workingHeight / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(
          img,
          -naturalWidth / 2,
          -naturalHeight / 2,
          naturalWidth,
          naturalHeight
        );
      } else {
        ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
      }

      ctx.restore();

      // Exportar como Blob WebP optimizado
      canvas.toBlob(
        (blob) => {
          setIsProcessing(false);
          if (blob) {
            const croppedUrl = URL.createObjectURL(blob);
            onCropComplete(blob, croppedUrl);
          } else {
            alert('Error al generar recorte de imagen.');
          }
        },
        'image/webp',
        0.85
      );
    } catch (err) {
      console.error('Error al recortar imagen:', err);
      setIsProcessing(false);
      alert('No se pudo procesar el recorte de la imagen.');
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0b141a]/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200">
      {/* Barra superior de herramientas (estilo WhatsApp) */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111b21]/90 border-b border-[#222e35] z-10">
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-300 hover:text-white rounded-full hover:bg-white/10 active:scale-95 transition-all"
          title="Cancelar"
        >
          <X size={22} />
        </button>

        <div className="flex items-center gap-1.5 text-white font-semibold text-sm">
          <Crop size={16} className="text-emerald-400" />
          <span>Recortar y Rotar</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRotate}
            className="p-2 text-gray-300 hover:text-white rounded-full hover:bg-white/10 active:scale-95 transition-all"
            title="Rotar 90°"
          >
            <RotateCw size={20} />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-2 text-gray-300 hover:text-white rounded-full hover:bg-white/10 active:scale-95 transition-all"
            title="Restablecer"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Área central del visor de imagen con recuadro interactivo */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center p-4 overflow-hidden touch-none"
      >
        <div className="relative inline-block max-w-full max-h-[75vh]">
          {/* Imagen orientada con rotación CSS */}
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Para recortar"
            onLoad={handleImageLoad}
            style={{
              transform: `rotate(${rotation}deg)`,
              maxHeight: '72vh',
              maxWidth: '90vw',
              objectFit: 'contain',
              display: 'block',
            }}
            className="transition-transform duration-200 pointer-events-none select-none"
          />

          {/* Superposición del cuadro de recorte estilo WhatsApp */}
          {imageLoaded && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              {/* Recuadro de recorte activo */}
              <div
                className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-auto cursor-move transition-shadow"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.width * 100}%`,
                  height: `${crop.height * 100}%`,
                }}
                onMouseDown={(e) => startDrag(e, 'move')}
                onTouchStart={(e) => startDrag(e, 'move')}
              >
                {/* Cuadrícula de tercios (Líneas guía estilo WhatsApp) */}
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-r border-b border-white/30" />
                  <div className="border-b border-white/30" />
                  <div className="border-r border-white/30" />
                  <div className="border-r border-white/30" />
                  <div />
                </div>

                {/* Esquinas táctiles gruesas de ajuste (WhatsApp Handles) */}
                {/* Esquina superior izquierda */}
                <div
                  className="absolute -top-2 -left-2 w-5 h-5 border-t-4 border-l-4 border-white cursor-nw-resize pointer-events-auto"
                  onMouseDown={(e) => startDrag(e, 'nw')}
                  onTouchStart={(e) => startDrag(e, 'nw')}
                />
                {/* Esquina superior derecha */}
                <div
                  className="absolute -top-2 -right-2 w-5 h-5 border-t-4 border-r-4 border-white cursor-ne-resize pointer-events-auto"
                  onMouseDown={(e) => startDrag(e, 'ne')}
                  onTouchStart={(e) => startDrag(e, 'ne')}
                />
                {/* Esquina inferior izquierda */}
                <div
                  className="absolute -bottom-2 -left-2 w-5 h-5 border-b-4 border-l-4 border-white cursor-sw-resize pointer-events-auto"
                  onMouseDown={(e) => startDrag(e, 'sw')}
                  onTouchStart={(e) => startDrag(e, 'sw')}
                />
                {/* Esquina inferior derecha */}
                <div
                  className="absolute -bottom-2 -right-2 w-5 h-5 border-b-4 border-r-4 border-white cursor-se-resize pointer-events-auto"
                  onMouseDown={(e) => startDrag(e, 'se')}
                  onTouchStart={(e) => startDrag(e, 'se')}
                />

                {/* Manijas de bordes laterales para ajuste libre */}
                <div
                  className="absolute top-0 -left-1 w-2 h-full cursor-w-resize pointer-events-auto"
                  onMouseDown={(e) => startDrag(e, 'w')}
                  onTouchStart={(e) => startDrag(e, 'w')}
                />
                <div
                  className="absolute top-0 -right-1 w-2 h-full cursor-e-resize pointer-events-auto"
                  onMouseDown={(e) => startDrag(e, 'e')}
                  onTouchStart={(e) => startDrag(e, 'e')}
                />
                <div
                  className="absolute -top-1 left-0 w-full h-2 cursor-n-resize pointer-events-auto"
                  onMouseDown={(e) => startDrag(e, 'n')}
                  onTouchStart={(e) => startDrag(e, 'n')}
                />
                <div
                  className="absolute -bottom-1 left-0 w-full h-2 cursor-s-resize pointer-events-auto"
                  onMouseDown={(e) => startDrag(e, 's')}
                  onTouchStart={(e) => startDrag(e, 's')}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barra inferior de confirmación */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#111b21]/90 border-t border-[#222e35] z-10">
        <button
          type="button"
          onClick={onClose}
          className="text-gray-300 hover:text-white font-semibold text-sm px-4 py-2 rounded-xl hover:bg-white/10 active:scale-95 transition-all"
        >
          Cancelar
        </button>

        <span className="text-xs text-gray-400 font-medium hidden sm:inline">
          Arrastra las esquinas o el cuadro para ajustar el encuadre
        </span>

        {/* Botón flotante verde de confirmación estilo WhatsApp */}
        <button
          type="button"
          onClick={handleConfirmCrop}
          disabled={isProcessing}
          className="flex items-center justify-center w-12 h-12 bg-emerald-500 hover:bg-emerald-400 active:scale-90 text-white rounded-full shadow-lg shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
          title="Listo / Confirmar recorte"
        >
          <Check size={26} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
