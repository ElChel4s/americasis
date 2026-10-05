"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, UserPlus, Shield, Wrench, Headphones, UserX, Search,
  KeyRound, Edit3, Check, X, RefreshCw, CheckCircle2, AlertCircle,
  Building, Clock, Lock, Sparkles, Filter, ChevronDown
} from 'lucide-react';

const ROL_CONFIG = {
  ADMINISTRADOR: {
    label: 'Administrador',
    badge: 'bg-navy text-white ring-1 ring-navy',
    icon: Shield,
  },
  TECNICO: {
    label: 'Técnico RF',
    badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    icon: Wrench,
  },
  RECEPCION: {
    label: 'Recepción',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    icon: Headphones,
  },
};

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'US';

export default function UsuariosPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);

  // Estados de carga y feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data || []);
      } else {
        showFeedback(data.message || 'Error al cargar usuarios', 'error');
      }
    } catch (err) {
      showFeedback('Error de comunicación con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          if (data.success) setUsers(data.data || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Métricas superiores (KPIs)
  const metrics = useMemo(() => {
    const total = users.length;
    const tecnicos = users.filter(u => u.rol === 'TECNICO' && u.activo).length;
    const recepcion = users.filter(u => u.rol === 'RECEPCION' && u.activo).length;
    const suspendidos = users.filter(u => !u.activo).length;
    return { total, tecnicos, recepcion, suspendidos };
  }, [users]);

  // Lista filtrada
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch =
        u.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = filterRole === 'ALL' || u.rol === filterRole;
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ACTIVE' && u.activo) ||
        (filterStatus === 'INACTIVE' && !u.activo);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  // Soft toggle de estado activo/inactivo
  const handleToggleActive = async (user) => {
    const newStatus = !user.activo;
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, activo: newStatus } : u)));
        showFeedback(
          `Cuenta de ${user.nombre_completo} ${newStatus ? 'activada' : 'desactivada (sesiones invalidadas)'}.`,
          'success'
        );
      } else {
        showFeedback(data.message || 'No se pudo cambiar el estado', 'error');
      }
    } catch (err) {
      showFeedback('Error al actualizar el estado del usuario', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans max-w-7xl mx-auto">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed top-20 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-semibold transition-all animate-in slide-in-from-top-4 duration-300 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-500/10'
              : 'bg-red-50 text-red-800 border-red-200 shadow-red-500/10'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-red-600" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Cabecera del Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Shield size={20} />
            </span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Gestión de Personal y Seguridad
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Directorio de trabajadores, asignación de roles RBAC y control de credenciales de taller.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-gray-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Recargar directorio"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-red-600' : ''} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            id="btn-nuevo-trabajador"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/20 active:scale-[0.99] transition-all cursor-pointer"
          >
            <UserPlus size={18} />
            <span>Registrar Nuevo Trabajador</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Usuarios</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{metrics.total}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-gray-700">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Técnicos Activos</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{metrics.tecnicos}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Wrench size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Recepción Taller</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{metrics.recepcion}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Headphones size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Suspendidas</p>
            <p className="text-2xl font-black text-red-600 mt-1">{metrics.suspendidos}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <UserX size={22} />
          </div>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#E30613] focus:ring-2 focus:ring-red-500/10 font-medium"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Filtro Rol */}
          <div className="relative flex-1 md:w-48">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:bg-white focus:border-[#E30613]"
            >
              <option value="ALL">Todos los Roles</option>
              <option value="ADMINISTRADOR">Administrador</option>
              <option value="TECNICO">Técnico RF</option>
              <option value="RECEPCION">Recepción</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Filtro Estado */}
          <div className="relative flex-1 md:w-36">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:bg-white focus:border-[#E30613]"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="ACTIVE">Solo Activos</option>
              <option value="INACTIVE">Solo Inactivos</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Tabla de Directorio */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-gray-500">
                <th className="py-3.5 px-4 sm:px-6">Colaborador</th>
                <th className="py-3.5 px-4">Correo Corporativo</th>
                <th className="py-3.5 px-4">Rol Asignado</th>
                <th className="py-3.5 px-4 text-center">Acceso (Activo)</th>
                <th className="py-3.5 px-4">Último Login</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto text-red-600 mb-2" />
                    <span>Cargando directorio de personal...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Users size={32} className="mx-auto text-gray-300 mb-2" />
                    <span>No se encontraron trabajadores que coincidan con la búsqueda.</span>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleInfo = ROL_CONFIG[user.rol] || { label: user.rol, badge: 'bg-gray-100 text-gray-700', icon: Shield };
                  const RoleIcon = roleInfo.icon;

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/70 transition-colors ${!user.activo ? 'bg-red-50/20 opacity-75' : ''}`}
                    >
                      {/* Colaborador */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                            user.rol === 'ADMINISTRADOR'
                              ? 'bg-navy text-white'
                              : user.rol === 'TECNICO'
                              ? 'bg-blue-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}>
                            {initials(user.nombre_completo)}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block leading-tight">
                              {user.nombre_completo}
                            </span>
                            <span className="text-[11px] text-gray-400 font-mono">
                              ID: #{user.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Correo */}
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-600">
                        {user.email}
                      </td>

                      {/* Rol */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${roleInfo.badge}`}>
                          <RoleIcon size={13} />
                          <span>{roleInfo.label}</span>
                        </span>
                      </td>

                      {/* Toggle Estado Activo */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user)}
                          title={user.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            user.activo ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              user.activo ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Último Login */}
                      <td className="py-3.5 px-4 text-xs text-gray-500">
                        {user.ultimo_login ? (
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-gray-400" />
                            <span>
                              {new Date(user.ultimo_login).toLocaleDateString('es-BO', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Nunca registrado</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-navy hover:bg-slate-100 transition-colors"
                            title="Editar datos y rol"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => setResettingUser(user)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Restablecer contraseña"
                          >
                            <KeyRound size={16} />
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

      {/* MODAL 1: REGISTRAR TRABAJADOR */}
      {showCreateModal && (
        <ModalRegistrarUsuario
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newUser) => {
            setUsers(prev => [newUser, ...prev]);
            setShowCreateModal(false);
            showFeedback(`Trabajador ${newUser.nombre_completo} creado con éxito`);
          }}
        />
      )}

      {/* MODAL 2: EDITAR TRABAJADOR */}
      {editingUser && (
        <ModalEditarUsuario
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={(updatedUser) => {
            setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
            setEditingUser(null);
            showFeedback(`Datos de ${updatedUser.nombre_completo} actualizados`);
          }}
        />
      )}

      {/* MODAL 3: RESTABLECER CONTRASEÑA */}
      {resettingUser && (
        <ModalResetPassword
          user={resettingUser}
          onClose={() => setResettingUser(null)}
          onSuccess={() => {
            setResettingUser(null);
            showFeedback(`Contraseña restablecida y sesiones invalidadas para ${resettingUser.nombre_completo}`);
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// SUB-COMPONENTE: MODAL REGISTRAR TRABAJADOR
// ----------------------------------------------------
function ModalRegistrarUsuario({ onClose, onSuccess }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('America2026!');
  const [rol, setRol] = useState('TECNICO');
  const [sucursalId, setSucursalId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let res = 'Am-';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || !password.trim()) {
      setError('Complete todos los campos obligatorios');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: nombre.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          rol,
          sucursal_id: Number(sucursalId),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al registrar trabajador');
      }

      onSuccess(data.data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-red-50 text-red-600 rounded-xl">
              <UserPlus size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Registrar Nuevo Trabajador</h2>
              <p className="text-xs text-gray-400">Creación de cuenta de acceso corporativo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre Completo</label>
            <input
              type="text"
              required
              placeholder="ej. Ing. Fernando Rojas"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#E30613] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              placeholder="ej. fernando.rojas@americasis.bo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#E30613] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Rol Operativo en la Empresa</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#E30613] focus:bg-white"
            >
              <option value="TECNICO">Técnico RF (Laboratorio & Diagnóstico)</option>
              <option value="RECEPCION">Recepción Mostrador (Atención & Despacho)</option>
              <option value="ADMINISTRADOR">Administrador / Gerencia General</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-gray-700 uppercase">Contraseña Temporal</label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Sparkles size={12} /> Generar segura
              </button>
            </div>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-gray-800 focus:outline-none focus:border-[#E30613] focus:bg-white"
            />
            <p className="text-[11px] text-gray-400 mt-1">El trabajador deberá cambiarla en su primer inicio de sesión.</p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-gray-600 font-bold text-xs hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/20 hover:from-red-500 hover:to-red-600 disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Creando...' : 'Crear Colaborador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// SUB-COMPONENTE: MODAL EDITAR TRABAJADOR
// ----------------------------------------------------
function ModalEditarUsuario({ user, onClose, onSuccess }) {
  const [nombre, setNombre] = useState(user.nombre_completo);
  const [rol, setRol] = useState(user.rol);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: nombre.trim(),
          rol,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al actualizar trabajador');
      }

      onSuccess(data.data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Edit3 size={18} className="text-navy" />
            <h2 className="text-lg font-bold text-gray-900">Editar Colaborador</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre Completo</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#E30613] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Correo Electrónico (No editable)</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono text-gray-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Rol Operativo</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#E30613] focus:bg-white"
            >
              <option value="TECNICO">Técnico RF</option>
              <option value="RECEPCION">Recepción Mostrador</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-gray-600 font-bold text-xs hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-navy hover:bg-navy-light text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// SUB-COMPONENTE: MODAL RESTABLECER CONTRASEÑA
// ----------------------------------------------------
function ModalResetPassword({ user, onClose, onSuccess }) {
  const [newPassword, setNewPassword] = useState('America2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let res = 'Sec-';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(res);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al restablecer contraseña');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-red-50 text-red-600 rounded-xl">
              <KeyRound size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Restablecer Contraseña</h2>
              <p className="text-xs text-gray-400">Usuario: {user.nombre_completo}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 leading-relaxed">
          <span className="font-bold">Aviso de Seguridad:</span> Al restablecer la contraseña, se incrementará el número de versión de sesión del trabajador y se cerrarán inmediatamente todas las sesiones que tenga activas en otros equipos.
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleReset} className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-gray-700 uppercase">Nueva Contraseña Temporal</label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Sparkles size={12} /> Generar aleatoria
              </button>
            </div>
            <input
              type="text"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-gray-800 focus:outline-none focus:border-[#E30613] focus:bg-white"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-gray-600 font-bold text-xs hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/20 hover:from-red-500 hover:to-red-600 cursor-pointer"
            >
              {loading ? 'Restableciendo...' : 'Confirmar y Restablecer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
