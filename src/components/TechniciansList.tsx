import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, Edit2, Trash2, Phone, Mail, BadgeCheck, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Technician } from '../types';

export const TechniciansList: React.FC = () => {
  const { user, activeCompany, companies, isDev, isManager } = useAuth();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [techToEdit, setTechToEdit] = useState<Technician | null>(null);

  // Form State
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [roleTitle, setRoleTitle] = useState('Técnico Especialista');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTechnicians();
  }, [activeCompany?.id, user?.role]);

  const loadTechnicians = async () => {
    setLoading(true);
    try {
      const data = await api.getTechnicians(activeCompany?.id, user?.role);
      setTechnicians(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setTechToEdit(null);
    setSelectedCompanyId(activeCompany?.id || companies[0]?.id || '');
    setName('');
    setPhone('');
    setEmail('');
    setRoleTitle('Técnico Especialista');
    setActive(true);
    setModalOpen(true);
  };

  const openEditModal = (t: Technician) => {
    setTechToEdit(t);
    setSelectedCompanyId(t.company_id || activeCompany?.id || companies[0]?.id || '');
    setName(t.name);
    setPhone(t.phone || '');
    setEmail(t.email || '');
    setRoleTitle(t.role_title || 'Técnico Especialista');
    setActive(t.active === 1);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    try {
      const targetCompanyId = activeCompany?.id || selectedCompanyId || companies[0]?.id;
      const payload = {
        company_id: targetCompanyId,
        name,
        phone,
        email,
        role_title: roleTitle,
        active: active ? 1 : 0
      };
      if (techToEdit) {
        await api.updateTechnician(techToEdit.id, payload);
      } else {
        await api.createTechnician(payload);
      }
      setModalOpen(false);
      loadTechnicians();
    } catch (err: any) {
      alert('Erro ao salvar técnico: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: Technician) => {
    if (!confirm(`Deseja excluir o cadastro do técnico "${t.name}"?`)) return;
    try {
      await api.deleteTechnician(t.id);
      loadTechnicians();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const filtered = technicians.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.role_title && t.role_title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-600" />
            Corpo Técnico
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Técnicos habilitados para execução de orçamentos e ordens de serviço
          </p>
        </div>

        {isManager && (
          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Técnico</span>
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
            placeholder="Buscar técnico por nome ou especialidade..."
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2" />
          <p className="text-xs font-semibold">Carregando técnicos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
          <UserCheck className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Nenhum técnico cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:shadow-md transition space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{t.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="text-[11px] font-semibold text-emerald-700">
                        {t.role_title || 'Técnico'}
                      </span>
                      {isDev && !activeCompany && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold">
                          <Building className="w-3 h-3 text-purple-600" />
                          <span>{t.company_name || 'Empresa Geral'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isManager && (
                    <>
                      <button
                        onClick={() => openEditModal(t)}
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                {t.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-none" />
                    <span>{t.phone}</span>
                  </div>
                )}
                {t.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 flex-none" />
                    <span className="truncate">{t.email}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-between items-center text-[10px]">
                <span
                  className={`px-2 py-0.5 rounded-full font-bold ${
                    t.active === 1
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.active === 1 ? 'Ativo em Campo' : 'Inativo'}
                </span>
                <span className="text-slate-400">CAST Quote</span>
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
              {techToEdit ? 'Editar Técnico' : 'Cadastrar Técnico'}
            </h2>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              {isDev && !activeCompany && (
                <div>
                  <label className="block font-semibold text-purple-900 mb-1">
                    Empresa Vinculada (Modo DEV Independente) *
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full rounded-xl border border-purple-300 bg-purple-50/70 p-2.5 text-xs font-semibold text-purple-950"
                  >
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} {comp.cnpj ? `(${comp.cnpj})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do técnico..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cargo / Especialidade</label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="Ex: Eletricista Sênior / Técnico de Segurança"
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tecnico@empresa.com.br"
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="tech-active-check"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="tech-active-check" className="font-semibold text-slate-700">
                  Técnico Ativo (habilitado para atribuição em ordens de serviço)
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
                >
                  {saving ? 'Salvando...' : 'Salvar Técnico'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
