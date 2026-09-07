import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  XCircle,
  Key,
  Shield,
  ArrowLeft,
  Users,
  AlertTriangle,
  RefreshCw,
  Eye,
  Check,
  Building,
  Upload,
  Palette,
  Copy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Company, User, UserRole } from '../types';
import { CompanyLogoUploader } from './CompanyLogoUploader';
import { BRAND_COLOR_PRESETS } from '../utils/brandTheme';

export const CompaniesList: React.FC = () => {
  const { user: currentUser, isDev, refreshCompanies, switchCompany, activeCompany } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected company for detailed view
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Company Form Modal State
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [active, setActive] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);

  // Initial Manager State for New Company
  const [createManagerUser, setCreateManagerUser] = useState(true);
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('Cast123');
  const [copiedPassword, setCopiedPassword] = useState(false);

  // User Management State for Selected Company
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // New User in Company Modal
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('SUPERVISOR');
  const [savingUser, setSavingUser] = useState(false);

  // Password Recovery Modal State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [userForPassword, setUserForPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Delete User Confirmation Popup State
  const [deleteUserPopupOpen, setDeleteUserPopupOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.role]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [comps, users] = await Promise.all([
        api.getCompanies(currentUser?.role),
        api.getUsers(undefined, currentUser?.role)
      ]);
      setCompanies(comps);
      setAllUsers(users.filter((u) => u.role !== 'DEV'));

      // If a company is already selected, update it and its users
      if (selectedCompany) {
        const updated = comps.find((c) => c.id === selectedCompany.id);
        if (updated) {
          setSelectedCompany(updated);
          loadCompanyUsers(updated.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyUsers = async (companyId: string) => {
    setLoadingUsers(true);
    try {
      const users = await api.getUsers(companyId);
      setCompanyUsers(users.filter((u) => u.role !== 'DEV'));
    } catch (err) {
      console.error('Error loading company users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSelectCompany = (c: Company) => {
    setSelectedCompany(c);
    loadCompanyUsers(c.id);
  };

  // Company Form Openers
  const openNewCompanyModal = () => {
    setCompanyToEdit(null);
    setName('');
    setCnpj('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setState('SP');
    setLogoUrl('');
    setPrimaryColor('#2563eb');
    setActive(true);
    setCreateManagerUser(true);
    setManagerName('');
    setManagerEmail('');
    setManagerPassword('Cast123');
    setCompanyModalOpen(true);
  };

  const openEditCompanyModal = (c: Company, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompanyToEdit(c);
    setName(c.name);
    setCnpj(c.cnpj || '');
    setEmail(c.email || '');
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setCity(c.city || '');
    setState(c.state || 'SP');
    setLogoUrl(c.logo_url || '');
    setPrimaryColor(c.primary_color || '#2563eb');
    setActive(c.active === 1);
    setCompanyModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingCompany(true);
    try {
      const payload: any = {
        name,
        cnpj,
        email,
        phone,
        address,
        city,
        state,
        logo_url: logoUrl,
        primary_color: primaryColor,
        active: active ? 1 : 0
      };
      if (companyToEdit) {
        await api.updateCompany(companyToEdit.id, payload);
        showToast(`Empresa "${name}" atualizada com sucesso!`);
        setCompanyModalOpen(false);
        await refreshCompanies();
        await loadData();
      } else {
        if (createManagerUser && managerEmail.trim()) {
          payload.manager_name = managerName.trim() || `Gerente ${name}`;
          payload.manager_email = managerEmail.trim();
          payload.manager_password = managerPassword.trim() || 'Cast123';
        }
        const createdComp: any = await api.createCompany(payload);
        if (createManagerUser && managerEmail.trim()) {
          showToast(`Empresa "${name}" cadastrada com Gerente "${managerEmail.trim()}"!`);
        } else {
          showToast(`Empresa "${name}" cadastrada com sucesso!`);
        }
        setCompanyModalOpen(false);
        await refreshCompanies();
        await loadData();
        if (createdComp?.id) {
          handleSelectCompany(createdComp);
        }
      }
    } catch (err: any) {
      alert('Erro ao salvar empresa: ' + err.message);
    } finally {
      setSavingCompany(false);
    }
  };

  // Activate / Deactivate User Toggle
  const handleToggleUserActive = async (u: User) => {
    if (u.id === currentUser?.id) {
      alert('Você não pode alterar o status da sua própria conta de DEV em uso.');
      return;
    }
    const newActive = u.active !== 1;
    try {
      await api.toggleUserStatus(u.id, newActive);
      showToast(`Usuário ${u.name} agora está ${newActive ? 'ATIVO' : 'INATIVO'}.`);
      if (selectedCompany) {
        loadCompanyUsers(selectedCompany.id);
      }
      loadData();
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    }
  };

  // Open Password Recovery Modal
  const openPasswordModal = (u: User) => {
    setUserForPassword(u);
    setNewPassword('');
    setPasswordSuccess(null);
    setPasswordModalOpen(true);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let res = 'Cast@';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(res);
  };

  const copyPasswordToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForPassword || !newPassword.trim()) return;
    setSavingPassword(true);
    try {
      await api.resetUserPassword(userForPassword.id, newPassword.trim());
      setPasswordSuccess(`Senha de ${userForPassword.name} alterada com sucesso para: "${newPassword}"`);
      showToast(`Senha recuperada para o usuário ${userForPassword.name}!`);
      setTimeout(() => {
        setPasswordModalOpen(false);
      }, 1800);
    } catch (err: any) {
      alert('Erro ao recuperar senha: ' + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  // Open Delete User Confirmation Popup
  const openDeleteUserPopup = (u: User) => {
    if (u.id === currentUser?.id) {
      alert('Você não pode excluir o usuário DEV logado atualmente.');
      return;
    }
    setUserToDelete(u);
    setDeleteUserPopupOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      await api.deleteUser(userToDelete.id);
      showToast(`Usuário ${userToDelete.name} excluído com sucesso.`);
      setDeleteUserPopupOpen(false);
      setUserToDelete(null);
      if (selectedCompany) {
        loadCompanyUsers(selectedCompany.id);
      }
      loadData();
    } catch (err: any) {
      alert('Erro ao excluir usuário: ' + err.message);
    } finally {
      setDeletingUser(false);
    }
  };

  // Create User in Selected Company
  const openNewUserModal = (defaultRole: UserRole = 'GERENTE') => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('Cast123');
    setNewUserRole(defaultRole);
    setNewUserModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !newUserName || !newUserEmail || !newUserPassword) return;
    setSavingUser(true);
    try {
      await api.createUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        company_id: selectedCompany.id,
        active: 1
      });
      showToast(`Novo usuário ${newUserName} cadastrado na empresa!`);
      setNewUserModalOpen(false);
      loadCompanyUsers(selectedCompany.id);
      loadData();
    } catch (err: any) {
      alert('Erro ao criar usuário: ' + err.message);
    } finally {
      setSavingUser(false);
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

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.cnpj && c.cnpj.includes(searchTerm)) ||
      (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* VIEW 1: SELECTED COMPANY DETAIL & USERS MANAGEMENT */}
      {selectedCompany ? (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top Bar with Back Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedCompany(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar às Empresas</span>
              </button>
              <div>
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                  Gerenciamento de Empresa & Usuários
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  {selectedCompany.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {activeCompany?.id !== selectedCompany.id ? (
                <button
                  onClick={() => switchCompany(selectedCompany.id)}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold hover:bg-purple-100 transition shadow-2xs"
                >
                  Ativar como Contexto Atual
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Empresa Ativa no Sistema
                </span>
              )}

              <button
                onClick={() => openEditCompanyModal(selectedCompany)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5 text-purple-700" />
                <span>Editar Empresa / Mídia</span>
              </button>
            </div>
          </div>

          {/* Company Card Overview with Logo Upload Directly From Device */}
          <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              {/* Logo preview */}
              <div className="relative group">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center overflow-hidden shadow-2xs flex-none">
                  {selectedCompany.logo_url ? (
                    <img
                      src={selectedCompany.logo_url}
                      alt={selectedCompany.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <button
                  onClick={() => openEditCompanyModal(selectedCompany)}
                  className="absolute inset-0 bg-black/50 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-[10px] font-bold p-1"
                  title="Alterar logo da empresa através de mídia do dispositivo"
                >
                  <Upload className="w-4 h-4 mb-0.5" />
                  <span>Trocar Mídia</span>
                </button>
              </div>

              {/* Company Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{selectedCompany.name}</h2>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      selectedCompany.active === 1
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {selectedCompany.active === 1 ? 'EMPRESA ATIVA' : 'INATIVA'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                  {selectedCompany.cnpj && (
                    <span>
                      <strong className="text-slate-700">CNPJ:</strong> {selectedCompany.cnpj}
                    </span>
                  )}
                  {selectedCompany.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {selectedCompany.phone}
                    </span>
                  )}
                  {selectedCompany.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {selectedCompany.email}
                    </span>
                  )}
                  {selectedCompany.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {selectedCompany.city}/{selectedCompany.state}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap flex-none">
              <button
                onClick={() => openNewUserModal('GERENTE')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition active:scale-95"
              >
                <Users className="w-4 h-4" />
                <span>+ Cadastrar Gerente</span>
              </button>
              <button
                onClick={() => openNewUserModal('SUPERVISOR')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Novo Usuário</span>
              </button>
            </div>
          </div>

          {/* Users Section for this Company */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-700" />
                  Usuários Criados pela Empresa ({companyUsers.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Controle total do Dev: ative/desative o acesso, recupere senhas e adicione gerentes ou colaboradores
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openNewUserModal('GERENTE')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold transition border border-blue-200"
                >
                  <Users className="w-3.5 h-3.5 text-blue-700" />
                  <span>Cadastrar Gerente</span>
                </button>
                <button
                  onClick={() => openNewUserModal('SUPERVISOR')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold transition border border-purple-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Usuário</span>
                </button>
              </div>
            </div>

            {loadingUsers ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                <p className="text-xs">Carregando usuários da empresa...</p>
              </div>
            ) : companyUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <Users className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">
                  Nenhum usuário cadastrado especificamente para esta empresa.
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Crie supervisores, gerentes, técnicos ou administradores vinculados para que possam operar nesta empresa.
                </p>
                <button
                  onClick={openNewUserModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Primeiro Usuário</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Usuário / E-mail</th>
                      <th className="py-3 px-4">Perfil</th>
                      <th className="py-3 px-4 text-center">Status de Acesso</th>
                      <th className="py-3 px-4 text-center">Recuperar Senha</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {companyUsers.map((u) => {
                      const isActive = u.active === 1;
                      const isSelf = u.id === currentUser?.id;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition">
                          {/* Name & Email */}
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block leading-tight">
                                  {u.name} {isSelf && <span className="text-[10px] text-purple-700 font-extrabold">(Você)</span>}
                                </span>
                                <span className="text-[11px] text-slate-500">{u.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(
                                u.role
                              )}`}
                            >
                              {u.role}
                            </span>
                          </td>

                          {/* Activate / Deactivate Toggle */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleUserActive(u)}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? 'Você não pode desativar seu próprio acesso'
                                  : isActive
                                  ? 'Clique para desativar o usuário'
                                  : 'Clique para ativar o usuário'
                              }
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                                isSelf
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : isActive
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 cursor-pointer'
                                  : 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 cursor-pointer'
                              }`}
                            >
                              {isActive ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Ativo</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                                  <span>Inativo</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Reset Password Button */}
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => openPasswordModal(u)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition shadow-2xs"
                              title="Recuperar ou alterar senha do usuário"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-600" />
                              <span>Recuperar Senha</span>
                            </button>
                          </td>

                          {/* Delete User Button (triggers confirmation popup) */}
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => openDeleteUserPopup(u)}
                              disabled={isSelf}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                isSelf
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-red-600 hover:text-red-800 hover:bg-red-50 cursor-pointer'
                              }`}
                              title="Excluir usuário permanentemente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW 2: ALL REGISTERED COMPANIES OVERVIEW */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold border border-purple-200">
                  Console Exclusivo DEV
                </span>
                {!activeCompany ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[11px] font-bold">
                    🌐 Modo Independente (Sem Vínculo)
                  </span>
                ) : (
                  <button
                    onClick={() => switchCompany(null)}
                    className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition border border-slate-200"
                  >
                    Filtro em {activeCompany.name} (Clique para Desvincular)
                  </button>
                )}
                <span className="text-xs text-slate-500">• {companies.length} Empresas Cadastradas</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 mt-1">
                <Building2 className="w-6 h-6 text-purple-700" />
                Gerenciar Empresas Cadastradas
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                O Desenvolvedor opera de forma independente de qualquer empresa, com controle global unificado.
              </p>
            </div>

            <button
              onClick={openNewCompanyModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Empresa</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="rounded-2xl bg-white p-3.5 border border-slate-200 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar empresa por razão social, CNPJ ou cidade..."
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-700"
              />
            </div>
          </div>

          {/* Grid of Companies */}
          {loading ? (
            <div className="p-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-600" />
              <p className="text-xs font-semibold">Carregando empresas cadastradas...</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
              <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold">Nenhuma empresa encontrada com os termos buscados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCompanies.map((c) => {
                const companyUserCount = allUsers.filter((u) => u.company_id === c.id && u.role !== 'DEV').length;
                const isSelectedContext = activeCompany?.id === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCompany(c)}
                    className={`rounded-3xl bg-white border p-5 shadow-xs hover:shadow-lg hover:border-purple-300 hover:ring-2 hover:ring-purple-200/50 transition cursor-pointer flex flex-col justify-between group ${
                      isSelectedContext
                        ? 'border-purple-600 ring-2 ring-purple-600/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Top Row: Logo & Names */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 p-1 flex items-center justify-center overflow-hidden flex-none shadow-2xs">
                            {c.logo_url ? (
                              <img
                                src={c.logo_url}
                                alt={c.name}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <Building2 className="w-6 h-6 text-purple-700" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold text-slate-900 truncate leading-tight">
                              {c.name}
                            </h3>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {c.cnpj ? `CNPJ: ${c.cnpj}` : 'CNPJ não informado'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => openEditCompanyModal(c, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition"
                            title="Editar Dados da Empresa / Mídia do Logo"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                        {c.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 flex-none" />
                            <span className="truncate">{c.phone}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400 flex-none" />
                            <span className="truncate">{c.email}</span>
                          </div>
                        )}
                        {c.city && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-none" />
                            <span className="truncate">
                              {c.city}/{c.state}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* User Counter Badge */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                          <Users className="w-3 h-3 text-purple-700" />
                          {companyUserCount} {companyUserCount === 1 ? 'usuário' : 'usuários'}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.active === 1
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {c.active === 1 ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action: Click to Manage Users */}
                    <div className="pt-3 border-t border-slate-100 mt-3 space-y-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCompany(c);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition active:scale-95"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Ver Usuários da Empresa ({companyUserCount})</span>
                      </button>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        {isSelectedContext ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-purple-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Filtro Ativo
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                switchCompany(null);
                              }}
                              className="text-[10px] text-slate-500 hover:text-purple-700 underline font-semibold"
                            >
                              Desvincular
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              switchCompany(c.id);
                            }}
                            className="text-slate-500 hover:text-purple-700 font-semibold"
                          >
                            Filtrar por esta
                          </button>
                        )}
                        <span className="text-slate-400 font-mono text-[10px]">ID: {c.id}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: COMPANY FORM (CREATE / EDIT) WITH DIRECT DEVICE LOGO UPLOADER */}
      {companyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                  Módulo Multiempresa
                </span>
                <h2 className="text-base font-extrabold text-slate-900">
                  {companyToEdit ? 'Editar Dados da Empresa' : 'Cadastrar Nova Empresa'}
                </h2>
              </div>
              <button
                onClick={() => setCompanyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Razão Social / Nome Fantasia *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome da empresa..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 focus:border-purple-600 focus:outline-hidden font-medium"
                />
              </div>

              {/* DIRECT DEVICE LOGO UPLOADER */}
              <CompanyLogoUploader
                value={logoUrl}
                onChange={(val) => setLogoUrl(val)}
                companyName={name}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telefone Comercial</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 3333-0000"
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-mail Corporativo</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@empresa.com.br"
                  className="w-full rounded-xl border border-slate-300 p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Endereço da Sede</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Avenida, Rua, Número, Bairro..."
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
                  <label className="block font-semibold text-slate-700 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="SP"
                    className="w-full rounded-xl border border-slate-300 p-2 text-slate-800 uppercase"
                  />
                </div>
              </div>

              {/* Brand Primary Color */}
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-purple-700" />
                    <span>Cor Primária da Marca (Branding)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-5 h-5 rounded-md shadow-xs border border-white flex-none"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <span className="font-mono text-[11px] font-bold text-slate-700 uppercase">
                      {primaryColor}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 flex-wrap flex-1">
                    {BRAND_COLOR_PRESETS.slice(0, 7).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPrimaryColor(p.hex)}
                        title={`${p.name} (${p.hex})`}
                        className={`w-6 h-6 rounded-md transition hover:scale-105 shadow-2xs relative flex items-center justify-center ${
                          primaryColor.toLowerCase() === p.hex.toLowerCase()
                            ? 'ring-2 ring-slate-800 ring-offset-1'
                            : ''
                        }`}
                        style={{ backgroundColor: p.hex }}
                      >
                        {primaryColor.toLowerCase() === p.hex.toLowerCase() && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                      title="Seletor de cor personalizada"
                    />
                    <input
                      type="text"
                      value={primaryColor.toUpperCase()}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-18 rounded border border-slate-300 p-1 text-center font-mono text-[10px] font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Cadastro do Gerente Inicial da Empresa */}
              {!companyToEdit && (
                <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/60 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center flex-none shadow-xs">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-purple-950">Cadastrar Usuário Gerente Inicial</h4>
                        <p className="text-[11px] text-purple-700">
                          O Gerente cadastrado aqui terá acesso ao sistema para cadastrar os demais usuários desta empresa.
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-purple-900 bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={createManagerUser}
                        onChange={(e) => setCreateManagerUser(e.target.checked)}
                        className="rounded border-purple-300 text-purple-700 focus:ring-purple-500"
                      />
                      <span>Criar Gerente</span>
                    </label>
                  </div>

                  {createManagerUser && (
                    <div className="space-y-3 pt-2 border-t border-purple-200/70 animate-in fade-in">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                          Nome Completo do Gerente *
                        </label>
                        <input
                          type="text"
                          required={createManagerUser}
                          value={managerName}
                          onChange={(e) => setManagerName(e.target.value)}
                          placeholder="Ex: Carlos Mendes"
                          className="w-full rounded-xl border border-slate-300 bg-white p-2 text-slate-800 text-xs focus:border-purple-600 focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                            E-mail de Login do Gerente *
                          </label>
                          <input
                            type="email"
                            required={createManagerUser}
                            value={managerEmail}
                            onChange={(e) => setManagerEmail(e.target.value)}
                            placeholder="gerente@empresa.com"
                            className="w-full rounded-xl border border-slate-300 bg-white p-2 text-slate-800 text-xs focus:border-purple-600 focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-slate-700 text-[11px]">Senha Inicial *</label>
                            <button
                              type="button"
                              onClick={() => {
                                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
                                let res = 'Cast@';
                                for (let i = 0; i < 4; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
                                setManagerPassword(res);
                              }}
                              className="text-[10px] font-bold text-purple-700 hover:underline"
                            >
                              ⚡ Gerar Senha
                            </button>
                          </div>
                          <input
                            type="text"
                            required={createManagerUser}
                            value={managerPassword}
                            onChange={(e) => setManagerPassword(e.target.value)}
                            placeholder="Cast123"
                            className="w-full rounded-xl border border-slate-300 bg-white p-2 text-slate-800 font-mono text-xs focus:border-purple-600 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="comp-active-chk"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="comp-active-chk" className="font-semibold text-slate-700">
                  Empresa Ativa no Sistema
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCompanyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="px-5 py-2 rounded-xl bg-purple-700 text-white font-bold hover:bg-purple-800 transition"
                >
                  {savingCompany ? 'Salvando...' : 'Salvar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PASSWORD RECOVERY MODAL */}
      {passwordModalOpen && userForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-none">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Recuperar Senha de Acesso</h3>
                <p className="text-xs text-slate-500">
                  Defina uma nova senha para o usuário <strong>{userForPassword.name}</strong>
                </p>
              </div>
            </div>

            {passwordSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Senha Atualizada com Sucesso!</span>
                </div>
                <p>{passwordSuccess}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      copyPasswordToClipboard(
                        `*Dados de Acesso - ${selectedCompany?.name || 'Sistema'}*\nLogin: ${userForPassword.email}\nNova Senha: ${newPassword}`
                      )
                    }
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedPassword ? 'Copiado para a Área de Transferência!' : 'Copiar Credenciais (Login e Senha)'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveNewPassword} className="space-y-4 text-xs">
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-1">
                  <div className="text-[11px] text-slate-500">Usuário Selecionado:</div>
                  <div className="font-bold text-slate-800 text-sm">{userForPassword.name}</div>
                  <div className="text-slate-600">{userForPassword.email}</div>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(
                      userForPassword.role
                    )}`}
                  >
                    Perfil: {userForPassword.role}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Nova Senha *</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[11px] font-bold text-purple-700 hover:text-purple-900"
                    >
                      ⚡ Gerar Senha Segura
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite ou gere a nova senha..."
                      className="w-full rounded-xl border border-slate-300 p-2.5 pr-20 text-slate-800 font-mono text-sm focus:border-purple-600 focus:outline-hidden"
                    />
                    {newPassword && (
                      <button
                        type="button"
                        onClick={() => copyPasswordToClipboard(newPassword)}
                        className="absolute right-2 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedPassword ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingPassword || !newPassword.trim()}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition disabled:opacity-50"
                  >
                    {savingPassword ? 'Salvando...' : 'Salvar Nova Senha'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: STRICT DELETE USER CONFIRMATION POPUP */}
      {deleteUserPopupOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-red-200">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center flex-none">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Confirmar Exclusão de Usuário</h3>
                <p className="text-xs text-red-600 font-bold mt-0.5">
                  Atenção: esta ação é definitiva e não poderá ser desfeita.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-red-50/70 border border-red-200/80 p-3.5 text-xs text-slate-700 space-y-1.5 my-3">
              <p>
                Você tem certeza que deseja excluir permanentemente o seguinte usuário da empresa{' '}
                <strong>{selectedCompany?.name || 'cadastrada'}</strong>?
              </p>
              <div className="pt-2 border-t border-red-200/60 font-medium">
                <div>
                  <strong>Nome:</strong> {userToDelete.name}
                </div>
                <div>
                  <strong>E-mail:</strong> {userToDelete.email}
                </div>
                <div>
                  <strong>Perfil:</strong> {userToDelete.role}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteUserPopupOpen(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingUser}
                onClick={handleConfirmDeleteUser}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {deletingUser ? 'Excluindo...' : 'Sim, Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE NEW USER IN SELECTED COMPANY */}
      {newUserModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                  Vincular Usuário
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Novo Usuário para {selectedCompany.name}
                </h3>
              </div>
              <button
                onClick={() => setNewUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ex: Carlos Oliveira"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-mail de Acesso *</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="usuario@empresa.com.br"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Senha Inicial *</label>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Senha de acesso"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Perfil de Acesso *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 bg-white"
                >
                  <option value="TÉCNICO">TÉCNICO (Painel, Orçamento, Ordens de Serviço)</option>
                  <option value="SUPERVISOR">SUPERVISOR (Painel, Orçamento, Ordens de Serviço)</option>
                  <option value="GERENTE">GERENTE (Painel, Orçamentos, Ordens, Clientes, Técnicos)</option>
                  <option value="ADM">ADM (Painel, Orçamentos, Ordens, Clientes, Técnicos)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="px-5 py-2 rounded-xl bg-purple-700 text-white font-bold hover:bg-purple-800 transition"
                >
                  {savingUser ? 'Cadastrando...' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
