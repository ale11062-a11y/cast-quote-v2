import React, { useEffect, useState } from 'react';
import {
  FileText,
  Wrench,
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  ArrowUpRight,
  Presentation,
  Sparkles,
  LayoutDashboard,
  ArrowLeft,
  Cloud,
  Database,
  ShieldCheck,
  PenTool
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardStats, Quote, WorkOrder } from '../types';
import { DemoDashboard } from './DemoDashboard';
import { SignatureModal } from './SignatureModal';

interface DashboardProps {
  onSelectTab: (tab: string) => void;
  onNewQuote: () => void;
  onNewWorkOrder: () => void;
  onViewQuote: (quote: Quote) => void;
  onViewWorkOrder: (order: WorkOrder) => void;
  onOpenPresentation?: () => void;
  onOpenDriveSettings?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectTab,
  onNewQuote,
  onNewWorkOrder,
  onViewQuote,
  onViewWorkOrder,
  onOpenPresentation,
  onOpenDriveSettings
}) => {
  const { user, activeCompany, isDev, isSupervisor } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentQuotes, setRecentQuotes] = useState<Quote[]>([]);
  const [recentOrders, setRecentOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDevSubView, setActiveDevSubView] = useState<'overview' | 'demo'>('overview');
  const [isTrainerOpen, setIsTrainerOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeCompany?.id, user?.role]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, quotesData, ordersData] = await Promise.all([
        api.getDashboardStats(activeCompany?.id, user?.role),
        api.getQuotes({ companyId: activeCompany?.id, userRole: user?.role }),
        api.getWorkOrders({ companyId: activeCompany?.id, userRole: user?.role })
      ]);
      setStats(statsData);
      setRecentQuotes(quotesData.slice(0, 5));
      setRecentOrders(ordersData.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatBrl = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
          <p className="text-sm font-medium">Carregando painel de controle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* DEV Subview Tab Switcher */}
      {isDev && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold border border-purple-200">
              Painel do Desenvolvedor
            </span>
            <span className="text-xs text-slate-500 font-medium">Controle e Demonstrações</span>
          </div>

          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActiveDevSubView('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeDevSubView === 'overview'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Indicadores Gerais</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDevSubView('demo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeDevSubView === 'demo'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-purple-900 hover:bg-purple-100/60'
              }`}
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Tela de DEMONSTRAÇÃO</span>
              <span className="bg-purple-400/30 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                Clientes
              </span>
            </button>
          </div>
        </div>
      )}

      {/* RENDER DEMO SCREEN IF IN DEMO SUBVIEW */}
      {isDev && activeDevSubView === 'demo' ? (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveDevSubView('overview')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar aos Indicadores do Painel</span>
            </button>
          </div>

          <DemoDashboard
            onSelectTab={onSelectTab}
            onNewQuote={onNewQuote}
            onNewWorkOrder={onNewWorkOrder}
            onOpenPresentation={onOpenPresentation}
          />
        </div>
      ) : (
        /* REGULAR DASHBOARD VIEW */
        <>
          {/* Welcome Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                isDev && !activeCompany
                  ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                  : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
              }`}>
                {isDev && !activeCompany ? '🌐 Modo Desenvolvedor Independente • Visão Global' : (activeCompany?.name || 'Sistema CAST Quote')}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
                Olá, {user?.name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                {isDev && !activeCompany
                  ? 'Você está no modo mestre independente com acesso global e irrestrito a todas as empresas, clientes, orçamentos e ordens de serviço.'
                  : 'Bem-vindo ao CAST Quote. Aqui você tem visão integrada dos seus orçamentos, ordens de serviço, relatórios e fotos verticais regulamentares.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {onOpenPresentation && (
                <button
                  type="button"
                  id="btn-dash-commercial-presentation"
                  onClick={onOpenPresentation}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-95 border border-purple-400/40"
                  title="Apresentação Comercial em PDF para Clientes"
                >
                  <Presentation className="w-4 h-4" />
                  <span>Apresentação Comercial (PDF)</span>
                </button>
              )}

              {isDev && (
                <button
                  type="button"
                  onClick={() => setActiveDevSubView('demo')}
                  className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-purple-300 border border-purple-500/30 shadow-md transition active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Console Demo</span>
                </button>
              )}

              {isDev && onOpenDriveSettings && (
                <button
                  type="button"
                  id="btn-dash-drive-settings"
                  onClick={onOpenDriveSettings}
                  className="flex items-center gap-2 rounded-xl bg-purple-900/90 hover:bg-purple-800 px-4 py-2.5 text-xs font-bold text-white border border-purple-400/40 shadow-md transition active:scale-95"
                  title="Configurar Conta Google Drive de Arquivamento"
                >
                  <Cloud className="w-4 h-4 text-purple-300" />
                  <span>Conta Google Drive (DEV)</span>
                </button>
              )}

              {isSupervisor && (
                <button
                  onClick={onNewQuote}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Orçamento</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsTrainerOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 px-4 py-2.5 text-xs font-bold text-amber-200 border border-amber-400/40 shadow-md transition active:scale-95"
                title="Calibrar e Treinar Assinatura na Tela Touch"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>🎓 Treinador de Assinatura</span>
              </button>

              <button
                onClick={onNewWorkOrder}
                className="flex items-center gap-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-white border border-slate-600 shadow-md transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Ordem de Serviço</span>
              </button>
            </div>
          </div>

          {/* DEV Quick Demo Shortcut Banner */}
          {isDev && (
            <div className="rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/60 to-purple-50 border border-purple-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-none shadow-xs">
                  <Presentation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    Central de Demonstração para Apresentação a Clientes
                    <span className="bg-purple-200 text-purple-800 text-[10px] px-2 py-0.2 rounded-full font-extrabold">
                      Comercial
                    </span>
                  </h3>
                  <p className="text-[11px] text-purple-700 mt-0.5">
                    Demonstre o sistema com 1 clique alternando entre as visões de ADM, Gerente, Supervisor e Técnico de Campo com fotos verticais.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDevSubView('demo')}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs flex-none active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Abrir Demonstração</span>
              </button>
            </div>
          )}

          {/* DEV Google Drive Repository Status Banner */}
          {isDev && onOpenDriveSettings && (
            <div className="rounded-2xl bg-white border border-purple-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-none border border-purple-200">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900">
                      Conta do Google Drive para Arquivamento Central
                    </h3>
                    <span className="px-2 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                      Armazenamento em Nuvem
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Defina ou troque qual conta Google (login/senha) receberá os arquivos PDF e fotos com códigos únicos de todos os clientes.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenDriveSettings}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs flex-none active:scale-95"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Definir / Trocar Conta Drive</span>
              </button>
            </div>
          )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orçamentos */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Orçamentos Emitidos
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">{stats?.total_quotes || 0}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Valor Total:</span>
            <span className="font-bold text-slate-800">{formatBrl(stats?.total_quotes_value || 0)}</span>
          </div>
        </div>

        {/* Total Ordens de Serviço */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ordens de Serviço
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">{stats?.total_orders || 0}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Valor Total OS:</span>
            <span className="font-bold text-slate-800">{formatBrl(stats?.total_orders_value || 0)}</span>
          </div>
        </div>

        {/* Clientes & Técnicos */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Clientes & Técnicos
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-extrabold text-slate-900">{stats?.total_clients || 0}</span>
              <span className="text-[11px] text-slate-500 ml-1">Clientes</span>
            </div>
            <span className="text-slate-300">•</span>
            <div>
              <span className="text-lg font-bold text-slate-700">{stats?.total_technicians || 0}</span>
              <span className="text-[11px] text-slate-500 ml-1">Técnicos</span>
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-500">Base cadastrada ativa</div>
        </div>

        {/* DEV Multiempresa or Approved Quotes */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isDev ? 'Empresas Ativas' : 'Orçamentos Aprovados'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              {isDev ? <Building2 className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-900">
              {isDev ? stats?.total_companies || 1 : stats?.quotes_by_status?.['Aprovado'] || 0}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {isDev ? 'Multiempresa habilitado' : 'Prontos para execução em OS'}
          </div>
        </div>
      </div>

      {/* Tables Row: Recent Quotes & Recent Work Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Orçamentos Recentes</h2>
            </div>
            <button
              onClick={() => onSelectTab('quotes')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentQuotes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhum orçamento cadastrado ainda.
              </div>
            ) : (
              recentQuotes.map((q) => (
                <div
                  key={q.id}
                  onClick={() => onViewQuote(q)}
                  className="p-4 hover:bg-slate-50/80 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600">#{q.quote_number}</span>
                      <span className="text-xs font-semibold text-slate-800">{q.client_name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs">{q.description}</p>
                    <span className="text-[10px] text-slate-400">Emissão: {q.date}</span>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="block text-xs font-extrabold text-slate-900">{formatBrl(q.total)}</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        q.status === 'Aprovado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : q.status === 'Rejeitado'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Work Orders */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Ordens de Serviço Recentes</h2>
            </div>
            <button
              onClick={() => onSelectTab('work-orders')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhuma ordem de serviço cadastrada ainda.
              </div>
            ) : (
              recentOrders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => onViewWorkOrder(o)}
                  className="p-4 hover:bg-slate-50/80 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-700">OS #{o.order_number}</span>
                      <span className="text-xs font-semibold text-slate-800">{o.client_name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs">{o.service_description}</p>
                    <span className="text-[10px] text-slate-400">Técnico: {o.technician_name}</span>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="block text-xs font-extrabold text-slate-900">{formatBrl(o.total)}</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        o.status === 'Concluída'
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.status === 'Em Andamento'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </>
      )}

      {/* Standalone Signature Trainer Modal */}
      {isTrainerOpen && (
        <SignatureModal
          isOpen={isTrainerOpen}
          onClose={() => setIsTrainerOpen(false)}
          documentType="OS"
          documentNumber="Treino"
          clientName="Calibração de Traços Touch"
          signeeType="technician"
          onConfirm={async () => {
            setIsTrainerOpen(false);
          }}
        />
      )}
    </div>
  );
};
