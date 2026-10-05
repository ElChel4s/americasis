"use client";

import React, { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  User, Mail, Shield, Building, Clock, KeyRound, Lock, Eye, EyeOff,
  Check, X, ShieldCheck, CheckCircle2, AlertCircle, Loader2, ArrowLeft,
  Wrench, Headphones, LogOut
} from 'lucide-react';

const emptySubscribe = () => () => {};

const ROL_CONFIG = {
  ADMINISTRADOR: {
    label: 'Administrador General',
    badge: 'bg-navy text-white ring-1 ring-navy',
    icon: Shield,
  },
  TECNICO: {
    label: 'Técnico RF y Banco de Trabajo',
    badge: 'bg-blue-600 text-white ring-1 ring-blue-700',
    icon: Wrench,
  },
  RECEPCION: {
    label: 'Recepción y Atención de Mostrador',
    badge: 'bg-emerald-600 text-white ring-1 ring-emerald-700',
    icon: Headphones,
  },
};

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'US';

function ModalDialog({ onClose, user, onPasswordChanged, onLogout }) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password'

  // Estados para cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validadores visuales
  const hasMinLength = newPassword.length >= 6;
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = currentPassword.trim().length > 0 && hasMinLength && passwordsMatch;

  const handleChangePassword = async (e) => {
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
      if (onPasswordChanged) onPasswordChanged();

      setTimeout(() => {
        setSuccess(false);
        setActiveTab('profile');
      }, 1800);
    } catch (err) {
      setError(err.message || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const roleInfo = ROL_CONFIG[user?.rol] || {
    label: user?.rol || 'Personal',
    badge: 'bg-gray-100 text-gray-700',
    icon: Shield,
  };
  const RoleIcon = roleInfo.icon;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/90 overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <User size={15} className={activeTab === 'profile' ? 'text-[#E30613]' : ''} />
              <span>Mi Perfil</span>
            </button>

            <button
              onClick={() => setActiveTab('password')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'password'
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-slate-200'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <KeyRound size={15} className={activeTab === 'password' ? 'text-[#E30613]' : ''} />
              <span>Cambiar Contraseña</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-6">
          {/* ======================================================== */}
          {/* PESTAÑA 1: VISTA DE PERFIL DE USUARIO                     */}
          {/* ======================================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Tarjeta de Identidad Superior */}
              <div className="flex items-center gap-4 bg-gradient-to-br from-slate-50 to-red-50/20 p-5 rounded-2xl border border-slate-200/80">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-light to-navy flex items-center justify-center text-white font-black text-2xl shadow-md ring-4 ring-white shrink-0">
                  {initials(user?.nombre_completo)}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-black text-gray-900 truncate leading-snug">
                    {user?.nombre_completo || 'Usuario del Sistema'}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold ${roleInfo.badge}`}>
                      <RoleIcon size={12} />
                      <span>{roleInfo.label}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Activo
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid de Metadatos de la Cuenta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <Mail size={14} className="text-gray-500" />
                    <span>Correo Corporativo</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 font-mono truncate">
                    {user?.email || 'admin@americasis.bo'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <Building size={14} className="text-gray-500" />
                    <span>Sede de Operaciones</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                    AMERICA Sistemas de Comunicación (Sede Principal)
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <Clock size={14} className="text-gray-500" />
                    <span>Último Inicio de Sesión</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-700">
                    {user?.ultimo_login ? (
                      new Date(user.ultimo_login).toLocaleDateString('es-BO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    ) : (
                      'Sesión actual activa'
                    )}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>Seguridad de Sesión</span>
                  </div>
                  <p className="text-xs font-semibold text-emerald-800">
                    JWT HttpOnly Cifrado
                  </p>
                </div>
              </div>

              {/* Banner de Acción Rápida: Cambiar Contraseña */}
              <div className="bg-red-50/50 border border-red-200/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-100/80 text-red-600 rounded-xl shrink-0">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Seguridad y Credenciales</h4>
                    <p className="text-xs text-gray-500">¿Deseas cambiar tu contraseña de acceso al taller?</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('password')}
                  id="btn-tab-cambiar-password"
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20 active:scale-[0.98] transition-all shrink-0 cursor-pointer"
                >
                  Cambiar Clave
                </button>
              </div>

              {/* Banner de Acción Rápida: Cerrar Sesión */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-200/80 text-slate-600 rounded-xl shrink-0">
                    <LogOut size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Finalizar Sesión</h4>
                    <p className="text-xs text-gray-500">Cierra tu sesión de forma segura al terminar tu jornada.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onLogout) onLogout();
                    onClose();
                  }}
                  id="btn-modal-logout"
                  className="px-4 py-2 bg-white hover:bg-red-50 text-red-600 font-bold text-xs rounded-xl border border-red-200 hover:border-red-300 shadow-sm active:scale-[0.98] transition-all shrink-0 cursor-pointer flex items-center gap-2"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PESTAÑA 2: FORMULARIO DE CAMBIO DE CONTRASEÑA             */}
          {/* ======================================================== */}
          {activeTab === 'password' && (
            <div>
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
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Actualizar Contraseña</h3>
                      <p className="text-xs text-gray-500">Ingrese su clave actual y defina una nueva.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <ArrowLeft size={14} /> Volver a perfil
                    </button>
                  </div>

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
                        id="modal-input-current-password"
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
                        id="modal-input-new-password"
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

                    {/* Indicadores visuales */}
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
                        id="modal-input-confirm-password"
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

                  {/* Botones de acción */}
                  <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-gray-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      id="btn-guardar-nueva-password"
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
          )}
        </div>

        {/* Footer del Modal */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-gray-400 shrink-0">
          <span className="flex items-center gap-1.5 font-medium">
            <Shield size={13} className="text-gray-400" /> Sistema América ERP
          </span>
          <button
            onClick={onClose}
            className="text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserProfileModal({ isOpen, onClose, user, onPasswordChanged, onLogout }) {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!isMounted || !isOpen) return null;

  return createPortal(
    <ModalDialog
      key={String(user?.id || 'default') + '-' + String(isOpen)}
      onClose={onClose}
      user={user}
      onPasswordChanged={onPasswordChanged}
      onLogout={onLogout}
    />,
    document.body
  );
}
