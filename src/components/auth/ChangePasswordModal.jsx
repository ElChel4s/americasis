"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Lock, KeyRound, Eye, EyeOff, Check, X, ShieldAlert, CheckCircle2,
  AlertCircle, Loader2
} from 'lucide-react';

export default function ChangePasswordModal({ isOpen, onClose, onSuccess, user }) {
  const [mounted, setMounted] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!mounted || !isOpen) return null;

  // Validadores visuales
  const hasMinLength = newPassword.length >= 6;
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = currentPassword.trim().length > 0 && hasMinLength && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'No se pudo actualizar la contraseña');
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full my-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-red-50 text-red-600 rounded-xl shadow-sm">
              <KeyRound size={20} />
            </span>
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
                Cambiar Contraseña
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {user?.nombre_completo || 'Usuario del Sistema'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mensaje de éxito */}
        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-base font-bold text-gray-900">¡Contraseña Actualizada!</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Su clave se renovó exitosamente. Su sesión actual continuará activa con la nueva clave.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Contraseña Actual */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Contraseña Actual
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  id="input-current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingrese su clave actual"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#E30613] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Nueva Contraseña */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Nueva Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  id="input-new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#E30613] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Indicadores visuales de complejidad */}
              <div className="mt-2 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${hasMinLength ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {hasMinLength ? <Check size={13} className="stroke-[3]" /> : <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" />}
                  <span>Longitud mínima de 6 caracteres</span>
                </div>
                <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${hasNumberOrSymbol ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {hasNumberOrSymbol ? <Check size={13} className="stroke-[3]" /> : <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" />}
                  <span>Incluye números o caracteres especiales</span>
                </div>
              </div>
            </div>

            {/* Confirmar Nueva Contraseña */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  id="input-confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita la nueva contraseña"
                  className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none focus:bg-white transition-all ${
                    confirmPassword && !passwordsMatch
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-slate-200 focus:border-[#E30613]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-[11px] text-red-600 font-semibold mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            {/* Aviso de seguridad */}
            <div className="flex items-start gap-2 text-[11px] text-gray-500 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
              <ShieldAlert size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                Al cambiar su clave, todas sus sesiones en otros navegadores o dispositivos se cerrarán de forma automática.
              </span>
            </div>

            {/* Acciones */}
            <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-gray-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-confirm-change-password"
                disabled={!canSubmit || loading}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Actualizar Contraseña</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
