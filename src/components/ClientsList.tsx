import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Client } from '../types';

export const ClientsList: React.FC = () => {
  const { user, activeCompany, companies, isDev, isSupervisor, isAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // Form inputs
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClients();
  }, [activeCompany?.id, user?.role]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await api.getClients(activeCompany?.id, user?.role);
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setClientToEdit(null);
    setSelectedCompanyId(activeCompany?.id || companies[0]?.id || '');
    setName('');
    setDocument('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setState('SP');
    setNotes('');
    setModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setClientToEdit(client);
    setSelectedCompanyId(client.company_id || activeCompany?.id || companies[0]?.id || '');
    setName(client.name);
    setDocument(client.document || '');
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setAddress(client.address || '');
    setCity(client.city || '');
    setState(client.state || 'SP');
    setNotes(client.notes || '');
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
        document,
        email,
        phone,
        address,
        city,
        state,
        notes
      };
      if (clientToEdit) {
        await api.updateClient(clientToEdit.id, payload);
      } else {
        await api.createClient(payload);
      }
      setModalOpen(false);
      loadClients();
    } catch (err: any) {
      alert('Erro ao salvar cliente: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Deseja excluir o cliente "${client.name}"?`)) return;
    try {
      await api.deleteClient(client.id);
      loadClients();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.document && c.document.includes(searchTerm)) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Clientes Cadastrados
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Base de clientes vinculada à empresa {activeCompany?.name}
          </p>
        </div>

        {isSupervisor && (
          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por nome, CPF/CNPJ ou e-mail..."
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-600"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
          <p className="text-xs font-semibold">Carregando clientes...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="p-12 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200">
          <Users className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Nenhum cliente cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:shadow-md transition space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{c.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {c.document && (
                        <span className="text-[11px] font-medium text-slate-500">
                          Doc: {c.document}
                        </span>
                      )}
                      {isDev && !activeCompany && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold">
                          <Building className="w-3 h-3 text-purple-600" />
                          <span>{c.company_name || 'Empresa Geral'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(c)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-none" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-none" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-none" />
                      <span className="truncate">
                        {c.address} {c.city ? `- ${c.city}/${c.state}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {c.notes && (
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 italic">
                  "{c.notes}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              {clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
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
                <label className="block font-semibold text-slate-700 mb-1">Nome / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do cliente ou empresa..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CPF ou CNPJ</label>
                  <input
                    type="text"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="000.000.000-00"
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
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@cliente.com.br"
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, complemento..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="São Paulo"
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">UF</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="SP"
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-800 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações adicionais sobre o cliente..."
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
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
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
