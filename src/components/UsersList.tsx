import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Shield, Mail, Building, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { User, UserRole, Company } from '../types';

export const UsersList: React.FC = () => {
  const { user: currentUser, activeCompany, companies, isDev, isAdmin, isManager } = useAuth();
  const canManage = isDev || isAdmin || isManager;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('SUPERVISOR');
  const [targetCompanyId, setTargetCompanyId] = useState(activeCompany?.id || '');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [activeCompany?.id, currentUser?.role]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers(activeCompany?.id, currentUser?.role);
      setUsers(data.filter((u: User) => u.role !== 'DEV'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setUserToEdit(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('SUPERVISOR');
    setTargetCompanyId(activeCompany?.id || (companies[0]?.id || ''));
    setActive(true);
    setModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setUserToEdit(u);
    setName(u.name);
    setEmail(u.email);
    setPassword(''); // leave blank if unchanged
    setRole(u.role);
    setTargetCompanyId(u.company_id || activeCompany?.id || '');
    setActive(u.active === 1);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setSaving(true);
    try {
      const payload: any = {
        name,
        email,
        role,
        company_id: isDev ? targetCompanyId : activeCompany?.id,
        active: active ? 1 : 0
      };
      if (password) {
        payload.password = password;
      }
      if (userToEdit) {
        await api.updateUser(userToEdit.id, payload);
      } else {
        if (!password) {
          alert('Por favor, defina uma senha para o novo usuário.');
          setSaving(false);
          return;
        }
        await api.createUser(payload);
      }
      setModalOpen(false);
      loadUsers();
    } catch (err: any) {
      alert('Erro ao salvar usuário: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (u.id === currentUser?.id) {
      alert('Você não pode excluir o seu próprio usuário logado.');
      return;
    }
    if (!confirm(`Deseja excluir o usuário "${u.name}" (${u.email})?`)) return;
    try {
      await api.deleteUser(u.id);
      loadUsers();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'DEV':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADM':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'GERENTE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SUPERVISOR':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'TÉCNICO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Gestão de Usuários & Permissões
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Controle de perfis (DEV, ADM, GERENTE, SUPERVISOR, TÉCNICO) vinculados às empresas
          </p>
        </div>

        {canManage && (
          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, e-mail ou perfil..."
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-600"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
          <p className="text-xs font-semibold">Carregando usuários...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((u) => (
            <div
              key={u.id}
              className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:shadow-md transition space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{u.name}</h3>
                    <span
                      className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-bold border mt-0.5 ${getRoleBadge(
                        u.role
                      )}`}
                    >
                      {u.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(u)}
                    className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {canManage && u.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDelete(u)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-none" />
                  <span className="truncate">{u.email}</span>
                </div>
                {u.company_name && (
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-400 flex-none" />
                    <span className="truncate">{u.company_name}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-between items-center text-[10px]">
                <span
                  className={`px-2 py-0.5 rounded-full font-bold ${
                    u.active === 1
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {u.active === 1 ? 'Acesso Ativo' : 'Bloqueado'}
                </span>
                <span className="text-slate-400">ID: {u.id.slice(-6)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              {userToEdit ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do usuário..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-mail de Login *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com.br"
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {userToEdit ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha de Acesso *'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Perfil de Permissão *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-800 font-semibold"
                  >
                    <option value="ADM">ADM (Administrador da Empresa)</option>
                    <option value="GERENTE">GERENTE (Gestor)</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="TÉCNICO">TÉCNICO (Campo)</option>
                  </select>
                </div>

                {isDev && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Empresa Vinculada</label>
                    <select
                      value={targetCompanyId}
                      onChange={(e) => setTargetCompanyId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                    >
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="user-active-check"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="user-active-check" className="font-semibold text-slate-700">
                  Usuário Ativo (acesso liberado ao sistema)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
                >
                  {saving ? 'Salvando...' : 'Salvar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
