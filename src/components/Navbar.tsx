import React, { useState } from 'react';
import {
  FileText,
  Wrench,
  Users,
  Building2,
  UserCheck,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Plus,
  Bell,
  ShieldAlert,
  Building,
  Presentation,
  Palette,
  Check,
  Sliders,
  Sparkles,
  Globe,
  RotateCcw,
  Settings,
  Cloud
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import { BrandingSettingsModal } from './BrandingSettingsModal';
import { BRAND_COLOR_PRESETS } from '../utils/brandTheme';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onNewQuote: () => void;
  onNewWorkOrder: () => void;
  onOpenPresentation?: () => void;
  onOpenDriveSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onNewQuote,
  onNewWorkOrder,
  onOpenPresentation,
  onOpenDriveSettings
}) => {
  const {
    user,
    activeCompany,
    companies,
    switchCompany,
    logout,
    isDev,
    isDevIndependent,
    isAdmin,
    isManager,
    isSupervisor,
    brandColor,
    updateBrandColor
  } = useAuth();
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [colorSaveFeedback, setColorSaveFeedback] = useState(false);

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
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

  const canSeeClientsAndTechs = user?.role === 'GERENTE' || user?.role === 'ADM';
  const canSeeUsers = user?.role === 'GERENTE' || user?.role === 'ADM';
  const canSeeCompanies = user?.role === 'DEV';

  return (
    <>
      <OfflineIndicator />
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-xs">
        {/* Main Bar */}
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand & Active Company */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => onSelectTab(isDev ? 'companies' : 'dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md transition overflow-hidden"
                style={{
                  backgroundColor: activeCompany?.logo_url ? '#0f172a' : brandColor
                }}
              >
                {activeCompany?.logo_url ? (
                  <img
                    src={activeCompany.logo_url}
                    alt={activeCompany.name}
                    className="max-w-full max-h-full object-contain p-1"
                  />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                  CAST <span style={{ color: brandColor }}>QUOTE</span>
                </span>
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Sistemas & Orçamentos
                </span>
              </div>
            </div>

            {/* Active Company Selector */}
            <div className="relative hidden md:block">
              {isDev ? (
                <div className="relative flex items-center gap-1.5">
                  <button
                    id="btn-switch-company"
                    onClick={() => setShowCompanyMenu(!showCompanyMenu)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition shadow-2xs ${
                      !activeCompany
                        ? 'border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {!activeCompany ? (
                      <Globe className="w-3.5 h-3.5 text-purple-700" />
                    ) : activeCompany.logo_url ? (
                      <img src={activeCompany.logo_url} alt="" className="w-4 h-4 rounded object-contain" />
                    ) : (
                      <Building className="w-3.5 h-3.5 text-purple-700" />
                    )}
                    <span className="max-w-[180px] truncate">
                      {!activeCompany ? '🌐 DEV Independente (Global)' : activeCompany.name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {activeCompany && (
                    <button
                      type="button"
                      onClick={() => switchCompany(null)}
                      title="Voltar ao Modo Independente (Sem Vínculo)"
                      className="flex items-center gap-1 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1.5 text-[11px] font-bold text-purple-800 transition"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Modo Global</span>
                    </button>
                  )}

                  {showCompanyMenu && (
                    <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-white p-1.5 shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <span className="text-[11px] font-extrabold text-purple-900 uppercase tracking-wider block">
                          Escopo de Atuação (DEV)
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          O DEV pode atuar totalmente independente ou focar em uma empresa específica.
                        </p>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            switchCompany(null);
                            setShowCompanyMenu(false);
                          }}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-left transition ${
                            !activeCompany
                              ? 'bg-purple-100/80 text-purple-950 font-bold border border-purple-200'
                              : 'text-purple-900 hover:bg-purple-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-purple-700 flex-none" />
                            <span>🌐 Visão Global Independente</span>
                          </span>
                          {!activeCompany && <Check className="w-4 h-4 text-purple-700 flex-none" />}
                        </button>
                      </div>

                      <div className="my-1 border-t border-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Filtro Específico por Empresa (Opcional)
                      </div>

                      <div className="max-h-60 overflow-y-auto py-0.5 space-y-0.5">
                        {companies.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              switchCompany(c.id);
                              setShowCompanyMenu(false);
                            }}
                            className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-left transition ${
                              activeCompany?.id === c.id
                                ? 'bg-purple-50 text-purple-800 font-semibold border border-purple-100'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="truncate">{c.name}</span>
                            {activeCompany?.id === c.id && <Check className="w-3.5 h-3.5 text-purple-700 flex-none" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  {activeCompany?.logo_url ? (
                    <img src={activeCompany.logo_url} alt="" className="w-4 h-4 rounded object-contain" />
                  ) : (
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span className="max-w-[180px] truncate">{activeCompany?.name || 'Minha Empresa'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & User Profile */}
          <div className="flex items-center gap-2.5">
            <PWAInstallButton />

            {onOpenPresentation && (
              <button
                id="btn-nav-presentation"
                type="button"
                onClick={onOpenPresentation}
                className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 px-2.5 sm:px-3 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95"
                title="Apresentação Comercial em PDF para Clientes"
              >
                <Presentation className="w-3.5 h-3.5 text-purple-700" />
                <span className="hidden md:inline">Apresentação (PDF)</span>
                <span className="md:hidden">Apresentação</span>
              </button>
            )}

            {/* Quick Create Buttons */}
            {!isDev && isSupervisor && (
              <button
                id="btn-nav-new-quote"
                onClick={onNewQuote}
                className="hidden sm:flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:brightness-90 transition active:scale-95"
                style={{ backgroundColor: brandColor }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Orçamento</span>
              </button>
            )}

            {!isDev && (
              <button
                id="btn-nav-new-wo"
                onClick={onNewWorkOrder}
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova OS</span>
              </button>
            )}

            {/* User Profile & Settings Menu */}
            <div className="relative">
              <button
                id="btn-user-profile"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 hover:bg-slate-50 transition"
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white font-bold text-xs shadow-2xs transition-colors"
                  style={{ backgroundColor: brandColor }}
                >
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden lg:block text-left pr-1">
                  <span className="block text-xs font-bold text-slate-800 leading-tight">
                    {user?.name || 'Usuário'}
                  </span>
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded-sm text-[9px] font-bold border ${getRoleBadgeColor(
                      user?.role
                    )}`}
                  >
                    {user?.role}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {showUserMenu && (
                <div
                  id="user-settings-dropdown-menu"
                  className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white p-3 shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95"
                >
                  {/* User Profile Header */}
                  <div className="flex items-center gap-2.5 p-2 border-b border-slate-100">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-xs flex-none transition-colors"
                      style={{ backgroundColor: brandColor }}
                    >
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded-sm text-[9px] font-bold border ${getRoleBadgeColor(
                            user?.role
                          )}`}
                        >
                          {user?.role}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">
                          {isDev && !activeCompany ? '🌐 Independente (Todas as Empresas)' : (activeCompany?.name || 'CAST')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* BRAND COLOR SELECTOR SECTION */}
                  <div className="py-2.5 px-2 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-slate-700" />
                        <span className="text-xs font-bold text-slate-800">
                          Cor Primária da Marca
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {brandColor}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2 leading-tight">
                      Personalize a cor principal dos botões, destaques e relatórios da empresa.
                    </p>

                    {/* Quick Swatches & Native Color Picker */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {BRAND_COLOR_PRESETS.slice(0, 8).map((preset) => {
                        const isCurrent = brandColor.toLowerCase() === preset.hex.toLowerCase();
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={async () => {
                              await updateBrandColor(preset.hex);
                              setColorSaveFeedback(true);
                              setTimeout(() => setColorSaveFeedback(false), 2000);
                            }}
                            title={`${preset.name} (${preset.hex})`}
                            className={`w-6 h-6 rounded-lg transition-transform hover:scale-110 flex items-center justify-center relative shadow-2xs ${
                              isCurrent ? 'ring-2 ring-slate-800 ring-offset-1 scale-105' : ''
                            }`}
                            style={{ backgroundColor: preset.hex }}
                          >
                            {isCurrent && <Check className="w-3 h-3 text-white" />}
                          </button>
                        );
                      })}

                      {/* Custom Color Input */}
                      <label
                        title="Escolha uma cor personalizada"
                        className="w-6 h-6 rounded-lg border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 flex items-center justify-center cursor-pointer transition relative group"
                      >
                        <input
                          type="color"
                          id="menu-custom-color-picker"
                          value={brandColor}
                          onChange={(e) => {
                            updateBrandColor(e.target.value);
                            setColorSaveFeedback(true);
                            setTimeout(() => setColorSaveFeedback(false), 2000);
                          }}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                        <Sliders className="w-3 h-3 text-slate-500 group-hover:text-slate-800" />
                      </label>
                    </div>

                    {/* Feedback message */}
                    {colorSaveFeedback && (
                      <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 font-semibold flex items-center gap-1 mb-2 animate-in fade-in">
                        <Check className="w-3 h-3 text-emerald-600 flex-none" />
                        <span>Identidade de marca atualizada!</span>
                      </div>
                    )}

                    {/* Company Settings & Logo Upload Button */}
                    <button
                      type="button"
                      id="btn-open-branding-modal"
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowBrandingModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl py-2 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold border border-blue-200 transition shadow-2xs"
                    >
                      <Settings className="w-4 h-4 text-blue-600" />
                      <span>Configurações & Logomarca</span>
                    </button>

                    {/* Google Drive Designated Account (DEV ONLY) */}
                    {isDev && onOpenDriveSettings && (
                      <button
                        type="button"
                        id="btn-open-drive-settings-menu"
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenDriveSettings();
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl py-2 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold border border-purple-200 transition shadow-2xs mt-1.5"
                      >
                        <Cloud className="w-4 h-4 text-purple-600" />
                        <span>Definir Google Drive (DEV)</span>
                      </button>
                    )}
                  </div>

                  {/* Actions / Logout */}
                  <div className="pt-1.5 px-1">
                    {onOpenPresentation && (
                      <button
                        type="button"
                        id="btn-menu-presentation"
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenPresentation();
                        }}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition mb-1.5 shadow-2xs"
                      >
                        <Presentation className="w-4 h-4 text-purple-700" />
                        <span>Apresentação Comercial (PDF)</span>
                      </button>
                    )}

                    <button
                      id="btn-logout"
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair do Sistema</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="border-t border-slate-100 bg-slate-50/70 px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
          <div className="mx-auto flex max-w-7xl gap-1.5 py-1.5">
            {isDev ? (
              <>
                <button
                  id="nav-tab-companies"
                  onClick={() => onSelectTab('companies')}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                    currentTab === 'companies'
                      ? 'bg-purple-700 text-white shadow-xs font-bold'
                      : 'text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Gerenciar Empresas</span>
                </button>

                <button
                  id="nav-tab-demo"
                  onClick={() => onSelectTab('demo')}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                    currentTab === 'demo'
                      ? 'bg-purple-700 text-white shadow-xs font-bold'
                      : 'text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <Presentation className="w-3.5 h-3.5" />
                  <span>Demonstração</span>
                </button>

                <button
                  id="nav-tab-branding-dev"
                  onClick={() => setShowBrandingModal(true)}
                  className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Configurações & Logo</span>
                </button>

                {onOpenDriveSettings && (
                  <button
                    id="nav-tab-drive-settings-dev"
                    onClick={onOpenDriveSettings}
                    className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition"
                    title="Defina qual conta do Google Drive armazenará os arquivos e fotos do sistema"
                  >
                    <Cloud className="w-3.5 h-3.5 text-purple-600" />
                    <span>Definir Google Drive</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => onSelectTab('dashboard')}
                  style={currentTab === 'dashboard' ? { color: brandColor } : undefined}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                    currentTab === 'dashboard'
                      ? 'bg-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Painel</span>
                </button>

                <button
                  onClick={() => onSelectTab('quotes')}
                  style={currentTab === 'quotes' ? { color: brandColor } : undefined}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                    currentTab === 'quotes'
                      ? 'bg-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Orçamentos</span>
                </button>

                <button
                  onClick={() => onSelectTab('work-orders')}
                  style={currentTab === 'work-orders' ? { color: brandColor } : undefined}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                    currentTab === 'work-orders'
                      ? 'bg-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Ordens de Serviço</span>
                </button>

                {canSeeClientsAndTechs && (
                  <button
                    onClick={() => onSelectTab('clients')}
                    style={currentTab === 'clients' ? { color: brandColor } : undefined}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                      currentTab === 'clients'
                        ? 'bg-white shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Clientes</span>
                  </button>
                )}

                {canSeeClientsAndTechs && (
                  <button
                    onClick={() => onSelectTab('technicians')}
                    style={currentTab === 'technicians' ? { color: brandColor } : undefined}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                      currentTab === 'technicians'
                        ? 'bg-white shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Técnicos</span>
                  </button>
                )}

                {canSeeUsers && (
                  <button
                    onClick={() => onSelectTab('users')}
                    style={currentTab === 'users' ? { color: brandColor } : undefined}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                      currentTab === 'users'
                        ? 'bg-white shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Usuários</span>
                  </button>
                )}

                {(isAdmin || isManager) && (
                  <button
                    id="nav-tab-company-settings"
                    type="button"
                    onClick={() => setShowBrandingModal(true)}
                    title="Configurações da Empresa, Logomarca e Branding"
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-600 hover:text-slate-900 hover:bg-white/60 transition"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Configurações</span>
                  </button>
                )}
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Brand & Theme Customization Modal */}
      <BrandingSettingsModal
        isOpen={showBrandingModal}
        onClose={() => setShowBrandingModal(false)}
      />
    </>
  );
};
