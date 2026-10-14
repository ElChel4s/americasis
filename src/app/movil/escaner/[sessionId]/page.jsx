"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { 
  ScanLine, CheckCircle2, RotateCcw, Flashlight, 
  Smartphone, Keyboard, Send, ShieldCheck, AlertCircle, RefreshCw
} from 'lucide-react';

export default function MobileBarcodeScannerPage() {
  const params = useParams();
  const sessionId = params?.sessionId;

  const [scannedCode, setScannedCode] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [scannerStarted, setScannerStarted] = useState(false);

  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Reproducir sonido de confirmación estilo escáner láser físico (Beep)
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}

    // Vibración háptica en smartphones
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
  };

  // Iniciar lector de cámara con html5-qrcode
  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;

    async function initScanner() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

        if (!isMounted) return;

        // Limpiar instancia previa si existía
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop();
            html5QrCodeRef.current.clear();
          } catch (e) {}
        }

        const scanner = new Html5Qrcode("barcode-reader-viewport", {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.ITF
          ],
          verbose: false
        });

        html5QrCodeRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.0,
        };

        await scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText, decodedResult) => {
            if (isMounted) {
              handleCodeDetected(decodedText, decodedResult?.result?.format?.formatName || 'BARCODE');
            }
          },
          () => {} // Ignorar errores de frame sin código
        );

        if (isMounted) {
          setScannerStarted(true);
          setScannerError(null);

          // Verificar si tiene linterna/flash
          try {
            const capabilities = scanner.getRunningTrackCapabilities();
            if (capabilities && 'torch' in capabilities) {
              setHasTorch(true);
            }
          } catch (e) {}
        }
      } catch (err) {
        console.error('Error al inicializar cámara para código de barras:', err);
        if (isMounted) {
          setScannerError(
            err.message?.includes('Permission') 
              ? 'Permiso de cámara denegado. Permita el acceso a la cámara en su navegador móvil.'
              : 'No se pudo acceder a la cámara. Verifique que no esté en uso por otra app.'
          );
        }
      }
    }

    initScanner();

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current.clear();
          }).catch(() => {});
        } catch (e) {}
      }
    };
  }, [sessionId]);

  // Manejar detección del código
  const handleCodeDetected = async (codeText, formatName = 'BARCODE') => {
    if (!codeText || !isScanning) return;

    const clean = String(codeText).trim().toUpperCase();
    if (!clean) return;

    playBeep();
    setIsScanning(false);
    setScannedCode(clean);
    await sendCodeToLaptop(clean, formatName);
  };

  // Enviar código a la laptop vía API
  const sendCodeToLaptop = async (codeToSend, format = 'BARCODE') => {
    setIsSending(true);
    setSendSuccess(false);

    try {
      const res = await fetch('/api/barcode-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          code: codeToSend,
          format
        })
      });

      const json = await res.json();
      if (json.success) {
        setSendSuccess(true);
      } else {
        alert(json.message || 'Error al enviar código a la laptop');
      }
    } catch (err) {
      console.error('Error enviando código:', err);
      alert('Error de conexión al enviar el código a la laptop');
    } finally {
      setIsSending(false);
    }
  };

  // Reanudar escaneo para el siguiente equipo
  const handleScanNext = () => {
    setScannedCode(null);
    setSendSuccess(false);
    setIsScanning(true);
  };

  // Alternar linterna
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextState = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchOn(nextState);
    } catch (e) {
      console.warn('Error alternando linterna:', e);
    }
  };

  // Enviar entrada manual
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const clean = manualCode.trim().toUpperCase();
    setScannedCode(clean);
    setIsScanning(false);
    await sendCodeToLaptop(clean, 'MANUAL');
    setManualCode('');
    setShowManualInput(false);
  };

  return (
    <div className="min-h-screen bg-[#0b141a] text-white flex flex-col justify-between font-sans select-none">
      {/* Barra Superior */}
      <header className="px-4 py-3 bg-[#111b21] border-b border-[#222e35] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
            <ScanLine size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>Lector Móvil</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono font-semibold">
                ENLACE ACTIVO
              </span>
            </h1>
            <p className="text-[11px] text-gray-400">AMERICA Sistemas de Comunicación</p>
          </div>
        </div>

        {hasTorch && (
          <button
            type="button"
            onClick={toggleTorch}
            className={`p-2.5 rounded-full transition-all ${
              torchOn 
                ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/40' 
                : 'bg-white/10 text-gray-300 hover:text-white'
            }`}
            title="Linterna / Flash"
          >
            <Flashlight size={18} />
          </button>
        )}
      </header>

      {/* Cuerpo Principal */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Viewport del Escáner */}
        <div className="w-full max-w-sm aspect-square relative rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
          <div 
            id="barcode-reader-viewport" 
            ref={scannerRef}
            className="w-full h-full object-cover"
          />

          {/* Cuadro Guía y Línea Láser Animada */}
          {isScanning && scannerStarted && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Recuadro de Enfoque */}
              <div className="w-64 h-36 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Esquinas destacadas */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-emerald-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-emerald-400" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-emerald-400" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-emerald-400" />

                {/* Línea Láser Roja Animada */}
                <div className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse"
                     style={{
                       top: '50%',
                       transform: 'translateY(-50%)',
                     }} 
                />
              </div>
            </div>
          )}

          {/* Estado de error de cámara */}
          {scannerError && (
            <div className="absolute inset-0 bg-[#0b141a]/95 p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
              <AlertCircle size={40} className="text-amber-400" />
              <p className="text-sm font-semibold text-gray-200">{scannerError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <RefreshCw size={14} /> Reintentar Cámara
              </button>
            </div>
          )}
        </div>

        {/* Instrucciones de Escaneo */}
        <div className="mt-4 text-center px-4">
          <p className="text-xs text-gray-300 font-medium">
            Apunta la cámara al código de barras o número de serie del radio handy.
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Compatible con Code 128, Code 39, EAN y QR de Motorola / Hytera.
          </p>
        </div>

        {/* Modal / Card de Código Escaneado con Éxito */}
        {scannedCode && (
          <div className="fixed inset-x-4 bottom-24 bg-[#111b21] border border-emerald-500/40 rounded-2xl p-4 shadow-2xl shadow-emerald-950/50 animate-in slide-in-from-bottom-4 duration-200 z-40">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  {sendSuccess ? '¡Enviado a tu laptop con éxito!' : 'Procesando envío...'}
                </p>
                <p className="text-xl font-black font-mono tracking-wider text-white truncate mt-0.5">
                  {scannedCode}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Se agregó automáticamente al formulario en tu laptop.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#222e35] flex gap-2">
              <button
                type="button"
                onClick={handleScanNext}
                className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
              >
                <RotateCcw size={15} />
                Escanear Siguiente Radio
              </button>
            </div>
          </div>
        )}

        {/* Modal de Ingreso Manual por si la etiqueta está rota */}
        {showManualInput && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-[#111b21] border border-[#222e35] w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Keyboard size={16} className="text-red-500" />
                  Ingreso Manual de Serie
                </h3>
                <button
                  type="button"
                  onClick={() => setShowManualInput(false)}
                  className="text-gray-400 hover:text-white text-xs font-bold"
                >
                  Cerrar
                </button>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Ej: 482TQA0192"
                  autoFocus
                  className="w-full bg-[#0b141a] border border-[#222e35] focus:border-red-500 text-white font-mono text-lg rounded-xl px-4 py-3 uppercase tracking-wider focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim() || isSending}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Send size={15} />
                  Enviar a Laptop
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Barra Inferior */}
      <footer className="px-4 py-3 bg-[#111b21] border-t border-[#222e35] flex items-center justify-between text-xs text-gray-400">
        <button
          type="button"
          onClick={() => setShowManualInput(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-semibold transition-colors"
        >
          <Keyboard size={15} />
          <span>Escribir manual</span>
        </button>

        <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono">
          <Smartphone size={13} className="text-emerald-400" />
          <span>ID: {sessionId ? sessionId.slice(-6) : '---'}</span>
        </div>
      </footer>
    </div>
  );
}
