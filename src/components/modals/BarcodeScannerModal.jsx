"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ScanLine, Smartphone, Check, Copy, ExternalLink, X, Wifi, 
  Sparkles, CheckCircle2, RotateCw
} from 'lucide-react';

/**
 * BarcodeScannerModal — Enlaza la laptop con el teléfono para usar la cámara del celular
 * como lector inalámbrico de códigos de barras y números de serie.
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onScan: (scannedCode: string) => void
 * - title?: string
 * - subtitle?: string
 */
export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Lector Inalámbrico con Celular",
  subtitle = "Escanea el código QR con tu smartphone para usarlo como pistola lectora"
}) {
  const [sessionId, setSessionId] = useState('');
  const [customHost, setCustomHost] = useState('');
  const [copied, setCopied] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [isWaiting, setIsWaiting] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCustomHost(window.location.origin);
    }
  }, []);

  // Generar ID de sesión único al abrir
  useEffect(() => {
    if (isOpen) {
      const id = 'scan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      setSessionId(id);
      setLastScanned(null);
      setIsWaiting(true);
    }
  }, [isOpen]);

  // URL para abrir en el celular
  const mobileUrl = useMemo(() => {
    if (!sessionId) return '';
    const host = customHost || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${host.replace(/\/$/, '')}/movil/escaner/${sessionId}`;
  }, [customHost, sessionId]);

  // Sonido de confirmación en la laptop
  const playLaptopChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Nota La
      osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.1); // Nota Mi agudo
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
  };

  // Polling para consultar si el teléfono envió un código de barras
  useEffect(() => {
    if (!isOpen || !sessionId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/barcode-session?sessionId=${sessionId}&clear=true`);
        const json = await res.json();

        if (isMounted && json.success && json.scanned && json.code) {
          playLaptopChime();
          setLastScanned(json.code);
          setIsWaiting(false);

          if (onScan) {
            onScan(json.code);
          }

          if (!keepOpen) {
            setTimeout(() => {
              if (isMounted) onClose();
            }, 1200);
          } else {
            // Reanudar espera de otro escaneo
            setTimeout(() => {
              if (isMounted) setIsWaiting(true);
            }, 1500);
          }
        }
      } catch (err) {
        // Silencioso en caso de micro-desconexión
      }
    }, 750);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, sessionId, onScan, onClose, keepOpen]);

  const copyToClipboard = () => {
    if (!mobileUrl) return;
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-600 flex items-center justify-center">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="p-6 flex flex-col items-center space-y-5 bg-background">
          {/* Badge de Estado en Vivo */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span>Esperando lectura desde tu smartphone...</span>
          </div>

          {/* Código QR Interactivo */}
          <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center justify-center relative group">
            {mobileUrl ? (
              <QRCodeSVG 
                value={mobileUrl} 
                size={200}
                level="M"
                includeMargin={false}
              />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-xs text-muted-foreground">
                Generando QR...
              </div>
            )}

            {/* Efecto visual de escaneo */}
            <div className="absolute inset-x-4 top-4 bottom-4 pointer-events-none overflow-hidden rounded-xl">
              <div className="w-full h-0.5 bg-red-500/80 shadow-[0_0_8px_#ef4444] animate-pulse" 
                   style={{
                     position: 'absolute',
                     top: '50%',
                     transform: 'translateY(-50%)'
                   }}
              />
            </div>
          </div>

          {/* Feedback de Último Código Recibido */}
          {lastScanned ? (
            <div className="w-full p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 animate-in bounce-in duration-300">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  ¡Código recibido correctamente!
                </p>
                <p className="text-base font-black font-mono text-foreground truncate">
                  {lastScanned}
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">
                1. Abre la cámara de tu celular y apunta al código QR de arriba.
              </p>
              <p>
                2. Apunta la cámara del celular al código de barras del radio.
              </p>
              <p className="text-[11px] text-primary-500 font-medium">
                ¡Se escribirá en tu laptop automáticamente al instante!
              </p>
            </div>
          )}

          {/* Host editable (en caso de pruebas en red Wi-Fi local) */}
          <div className="w-full pt-2 border-t border-border space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Dirección del enlace:</span>
              <span className="font-mono text-[10px] text-primary-500">Auto-detectado</span>
            </div>
            <input
              type="text"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="https://tudominio.com"
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors"
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
                title="Abrir en esta ventana para probar"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground">
            <input
              type="checkbox"
              checked={keepOpen}
              onChange={(e) => setKeepOpen(e.target.checked)}
              className="rounded border-border text-primary-500 focus:ring-primary-500"
            />
            <span className="text-[11.5px] font-medium">Mantener abierto para flota (varios radios)</span>
          </label>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
