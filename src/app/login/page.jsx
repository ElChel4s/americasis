"use client";

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Radio, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, Loader2, Sparkles, CheckCircle2
} from 'lucide-react';

const QUICK_TEST_USERS = [
  { role: 'Admin', email: 'admin', label: 'Administrador' },
  { role: 'Recepción', email: 'recepcion', label: 'Recepción' },
  { role: 'Técnico', email: 'tecnico', label: 'Soporte Técnico' },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = searchParams.get('from') || '/';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    urlError === 'session_expired'
      ? 'Su sesión ha expirado o fue cerrada en otro dispositivo. Por favor inicie sesión nuevamente.'
      : urlError === 'unauthorized_role'
      ? 'No tiene permisos para acceder al módulo solicitado.'
      : ''
  );
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor ingrese su usuario y contraseña');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      setSuccessMessage('¡Autenticación exitosa! Ingresando al sistema...');
      
      // Breve pausa para feedback visual
      setTimeout(() => {
        router.push(fromPath);
        router.refresh();
      }, 500);
    } catch (err) {
      setErrorMessage(err.message || 'Error al conectar con el servidor');
      setLoading(false);
    }
  };

  const handleQuickFill = (testEmail) => {
    setEmail(testEmail);
    setPassword('America2026!');
    setErrorMessage('');
  };

  return (
    <div className="w-full max-w-md relative z-10">
      {/* Cabecera / Identidad Corporativa */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl shadow-xl shadow-red-600/25 mb-3 text-white">
          <Radio size={32} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight">
          AMERICA<span className="text-[#E30613]">SIS</span>
        </h1>
        <p className="text-xs uppercase font-extrabold tracking-[0.25em] text-gray-400 mt-1">
          Radio Service ERP
        </p>
        <p className="text-sm text-gray-500 mt-2 font-medium">
          Sistema Integral de Telecomunicaciones y Laboratorio
        </p>
      </div>

      {/* Tarjeta Central de Inicio de Sesión */}
      <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-200/70 border border-slate-200/80">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900">Iniciar Sesión</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Ingrese con sus credenciales de trabajador autorizadas
          </p>
        </div>

        {/* Feedback de Error */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200">
            <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Feedback de Éxito */}
        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-700 text-xs font-bold animate-in fade-in duration-200">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input Correo */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail size={18} />
              </div>
              <input
                type="text"
                required
                id="input-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ej. admin"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#E30613] focus:ring-4 focus:ring-red-500/10 transition-all font-medium"
              />
            </div>
          </div>

          {/* Input Contraseña */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                id="input-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#E30613] focus:ring-4 focus:ring-red-500/10 transition-all font-medium"
              />
              <button
                type="button"
                id="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none cursor-pointer"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Botón de Ingreso */}
          <button
            type="submit"
            id="btn-submit-login"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Validando credenciales...</span>
              </>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Acceso Rápido para Pruebas / Demostración */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
            <Sparkles size={13} className="text-amber-500" />
            <span>Cuentas de Acceso Rápido (Taller):</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_TEST_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => handleQuickFill(u.email)}
                className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-red-50/60 hover:border-red-200 border border-slate-200/80 transition-all text-xs cursor-pointer"
              >
                <span className="font-bold text-gray-800 block truncate">{u.label}</span>
                <span className="text-[10px] text-gray-400 block truncate">{u.email}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2.5 font-medium">
            Contraseña por defecto: <span className="font-mono text-gray-600 font-bold">America2026!</span>
          </p>
        </div>
      </div>

      {/* Footer de Seguridad */}
      <div className="text-center mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 font-medium">
        <ShieldCheck size={16} className="text-emerald-600" />
        <span>Sesión encriptada con JWT HttpOnly • RFC 7519</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Elementos ambientales de fondo */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-navy/10 rounded-full blur-3xl pointer-events-none" />

      <Suspense fallback={
        <div className="text-center py-12 text-gray-400 flex items-center justify-center gap-2">
          <Loader2 size={24} className="animate-spin text-red-600" />
          <span>Cargando acceso al sistema...</span>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
