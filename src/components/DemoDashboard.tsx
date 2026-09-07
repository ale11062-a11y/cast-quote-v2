import React, { useState, useEffect } from 'react';
import {
  Presentation,
  Plus,
  FileText,
  Wrench,
  BarChart3,
  Users,
  Shield,
  Briefcase,
  Smartphone,
  Layers,
  ArrowRight,
  CheckCircle2,
  Download,
  Copy,
  Check,
  Building2,
  TrendingUp,
  DollarSign,
  Calendar,
  Sparkles,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Quote, WorkOrder, DashboardStats } from '../types';

interface DemoDashboardProps {
  onNewQuote: () => void;
  onNewWorkOrder: () => void;
  onSelectTab: (tab: string) => void;
  onOpenPresentation?: () => void;
}

interface DemoProfile {
  role: 'DEV' | 'ADM' | 'GERENTE' | 'SUPERVISOR' | 'TÉCNICO';
  name: string;
  email: string;
  pass: string;
  badgeColor: string;
  cardBorder: string;
  icon: React.ReactNode;
  tagline: string;
  visibleTabs: string[];
  keyHighlights: string[];
  clientPitch: string;
}

export const DemoDashboard: React.FC<DemoDashboardProps> = ({
  onNewQuote,
  onNewWorkOrder,
  onSelectTab,
  onOpenPresentation
}) => {
  const { user, login, activeCompany } = useAuth();
  const [switchingEmail, setSwitchingEmail] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadDemoData();
  }, [activeCompany?.id]);

  const loadDemoData = async () => {
    setLoadingStats(true);
    try {
      const [statsData, quotesData, ordersData] = await Promise.all([
        api.getDashboardStats(activeCompany?.id, 'DEV'),
        api.getQuotes({ companyId: activeCompany?.id, userRole: 'DEV' }),
        api.getWorkOrders({ companyId: activeCompany?.id, userRole: 'DEV' })
      ]);
      setStats(statsData);
      setQuotes(quotesData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Erro ao carregar dados de demonstração:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const demoProfiles: DemoProfile[] = [
    {
      role: 'DEV',
      name: 'Desenvolvedor Master (Ale)',
      email: 'ale11062@gmail.com',
      pass: 'cast.2468',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      cardBorder: 'border-purple-300 hover:border-purple-500 hover:shadow-purple-100',
      icon: <Layers className="w-5 h-5 text-purple-700" />,
      tagline: 'Visão Global e Governança Multiempresa',
      visibleTabs: ['Gerenciar Empresas', 'Demonstração'],
      keyHighlights: [
        'Acesso irrestrito a todas as empresas cadastradas no ecossistema',
        'Console exclusivo de gestão corporativa e auditoria de usuários',
        'Alternância dinâmica do contexto ativo da empresa',
        'Ativação/desativação de contas e redefinição de senhas'
      ],
      clientPitch: 'Destaque a segurança, arquitetura multi-tenant e controle total para a diretoria.'
    },
    {
      role: 'ADM',
      name: 'Administrador da Empresa',
      email: 'adm@castengenharia.com.br',
      pass: 'adm123',
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
      cardBorder: 'border-red-200 hover:border-red-400 hover:shadow-red-50',
      icon: <Shield className="w-5 h-5 text-red-700" />,
      tagline: 'Gestão da Unidade de Negócio e Financeiro',
      visibleTabs: ['Painel', 'Orçamentos', 'Ordens de Serviço', 'Clientes', 'Técnicos'],
      keyHighlights: [
        'Visão financeira consolidada de orçamentos e ordens faturadas',
        'Gestão de técnicos internos e parceiros terceirizados',
        'Cadastro completo de clientes (Pessoa Física e Jurídica)',
        'Exportação de relatórios gerenciais e orçamentos em PDF com logo'
      ],
      clientPitch: 'Ideal para proprietários e gestores que precisam de controle financeiro e operacional consolidado.'
    },
    {
      role: 'GERENTE',
      name: 'Gerente Operacional',
      email: 'gerente@castengenharia.com.br',
      pass: 'gerente123',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      cardBorder: 'border-blue-200 hover:border-blue-400 hover:shadow-blue-50',
      icon: <Briefcase className="w-5 h-5 text-blue-700" />,
      tagline: 'Fluxo de Propostas, Prazos e Alocação de Equipes',
      visibleTabs: ['Painel', 'Orçamentos', 'Ordens de Serviço', 'Clientes', 'Técnicos'],
      keyHighlights: [
        'Acompanhamento de orçamentos pendentes de aprovação e prazos de validade',
        'Alocação rápida de ordens de serviço para técnicos disponíveis',
        'Monitoramento de execução e SLA das ordens abertas',
        'Cadastro e auditoria de clientes e contatos'
      ],
      clientPitch: 'Mostre o ganho de produtividade ao eliminar papéis e planilhas descentralizadas.'
    },
    {
      role: 'SUPERVISOR',
      name: 'Supervisor de Serviços',
      email: 'supervisor@castengenharia.com.br',
      pass: 'super123',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      cardBorder: 'border-amber-200 hover:border-amber-400 hover:shadow-amber-50',
      icon: <Users className="w-5 h-5 text-amber-700" />,
      tagline: 'Emissão Rápida de Propostas e Ordens de Serviço',
      visibleTabs: ['Painel', 'Orçamentos', 'Ordens de Serviço'],
      keyHighlights: [
        'Criação de cotações com cálculo automático de descontos e acréscimos',
        'Conversão instantânea de orçamento aprovado em ordem de serviço',
        'Interface limpa e focada exclusivamente na execução de serviços',
        'Acompanhamento de status de ordens (Pendente, Em Andamento, Concluída)'
      ],
      clientPitch: 'Demonstre a simplicidade e foco para quem atua na linha de frente com o cliente.'
    },
    {
      role: 'TÉCNICO',
      name: 'Técnico de Campo (Mobile / PWA)',
      email: 'tecnico@castengenharia.com.br',
      pass: 'tec123',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      cardBorder: 'border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-50',
      icon: <Smartphone className="w-5 h-5 text-emerald-700" />,
      tagline: 'Execução Mobile: Fotos Verticais 3:4 e Assinatura Digital',
      visibleTabs: ['Painel', 'Orçamentos', 'Ordens de Serviço'],
      keyHighlights: [
        'Registro de fotos técnicas exclusivamente no padrão vertical regulamentar (3:4)',
        'Checklist e acompanhamento de itens da ordem de serviço',
        'Coleta de assinatura digital do cliente diretamente na tela do smartphone/tablet',
        'Geração instantânea do comprovante da OS com fotos e assinatura embutidas'
      ],
      clientPitch: 'O maior diferencial competitivo: aplicativo móvel ágil em campo com relatório fotográfico padronizado.'
    }
  ];

  const handleSimulateProfile = async (profile: DemoProfile) => {
    try {
      setSwitchingEmail(profile.email);
      localStorage.setItem('cast_demo_mode', 'true');
      await login(profile.email, profile.pass);
    } catch (err: any) {
      alert('Erro ao autenticar no perfil selecionado: ' + err.message);
    } finally {
      setSwitchingEmail(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Tipo', 'Número', 'Cliente', 'Valor (R$)', 'Status', 'Data'],
      ...quotes.map((q) => [
        'Orçamento',
        String(q.quote_number),
        q.client_name || 'N/I',
        q.total.toFixed(2),
        q.status,
        q.date
      ]),
      ...orders.map((o) => [
        'Ordem de Serviço',
        String(o.order_number),
        o.client_name || 'N/I',
        o.total.toFixed(2),
        o.status,
        o.date
      ])
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio-demonstracao-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-purple-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-purple-800/40">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-400/30">
              <Presentation className="w-3.5 h-3.5 text-purple-400" />
              Console Comercial DEV • Demonstração para Clientes
            </span>
            <span className="text-xs text-purple-200/70 font-medium">Modo Interativo</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3">
            Painel de Demonstração & Ações Rápidas
          </h1>

          <p className="text-xs sm:text-sm text-purple-200 mt-2 leading-relaxed">
            Central exclusiva para demonstração do sistema a novos clientes. Utilize os botões de ação rápida para simular a criação de propostas e ordens de serviço, gere relatórios executivos e alterne entre todos os perfis do sistema com 1 clique.
          </p>
        </div>

        {/* Quick Highlights Counter */}
        <div className="mt-6 pt-5 border-t border-purple-800/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-purple-200">
          <div>
            <span className="block text-[10px] text-purple-400 uppercase font-bold">Empresa Atual</span>
            <span className="text-base font-extrabold text-white truncate block">{activeCompany?.name || 'Todas'}</span>
          </div>
          <div>
            <span className="block text-[10px] text-purple-400 uppercase font-bold">Total em Cotações</span>
            <span className="text-base font-extrabold text-white">
              {stats?.quotesTotal ? `R$ ${stats.quotesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-purple-400 uppercase font-bold">Total em OS</span>
            <span className="text-base font-extrabold text-white">
              {stats?.ordersTotal ? `R$ ${stats.ordersTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-purple-400 uppercase font-bold">Perfis Disponíveis</span>
            <span className="text-base font-extrabold text-white">5 Cargos Diferenciados</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: BOTÕES DE AÇÃO RÁPIDA (NOVA COTAÇÃO, NOVA OS, RELATÓRIOS) */}
      <div className="rounded-3xl bg-white p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-700" />
              Ações Rápidas do Sistema
            </h2>
            <p className="text-xs text-slate-500">
              Dispare os fluxos operacionais em tempo real durante a apresentação com clientes
            </p>
          </div>
          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
            Acesso Rápido DEV
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* 1. Nova Cotação / Orçamento */}
          <button
            type="button"
            onClick={onNewQuote}
            className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30 p-5 text-left hover:border-blue-400 hover:shadow-md transition active:scale-[0.99] group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider">
                  Comercial / Vendas
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Nova Cotação / Orçamento
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Crie propostas personalizadas com itens, descontos automáticos, fotos prévias e cálculo dinâmico de margens.
                </p>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-blue-100 flex items-center justify-between text-xs font-bold text-blue-700">
              <span>Abrir Formulário de Cotação</span>
              <Plus className="w-4 h-4" />
            </div>
          </button>

          {/* 2. Nova OS / Ordem de Serviço */}
          <button
            type="button"
            onClick={onNewWorkOrder}
            className="rounded-2xl border border-slate-300 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-5 text-left text-white hover:border-slate-500 hover:shadow-lg transition active:scale-[0.99] group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-white/10 text-white border border-white/20 flex items-center justify-center shadow-md group-hover:scale-105 transition">
                <Wrench className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-purple-300 uppercase tracking-wider">
                  Operacional / Campo
                </span>
                <h3 className="text-base font-extrabold text-white mt-0.5">
                  Nova Ordem de Serviço (OS)
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Inicie ordens com checklist de equipamentos, atribuição ao técnico de campo e registro de fotos verticais regulamentares (3:4).
                </p>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-700 flex items-center justify-between text-xs font-bold text-purple-300">
              <span>Emitir Nova Ordem de Serviço</span>
              <Plus className="w-4 h-4" />
            </div>
          </button>

          {/* 3. Apresentação Comercial Executiva (PDF) */}
          <button
            type="button"
            id="btn-demo-presentation-pdf"
            onClick={onOpenPresentation}
            className="rounded-2xl border border-purple-300 bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-950 p-5 text-left text-white hover:border-purple-400 hover:shadow-xl transition active:scale-[0.99] group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition border border-purple-400/30">
                <Presentation className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-purple-300 uppercase tracking-wider">
                  Material de Vendas
                </span>
                <h3 className="text-base font-extrabold text-white mt-0.5">
                  Apresentação em PDF
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Gere o slide deck corporativo em PDF (A4 Paisagem) com 4 slides: Proposta, Dores vs. Solução, Módulos e ROI com métricas comprovadas.
                </p>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-purple-800/80 flex items-center justify-between text-xs font-bold text-purple-200">
              <span>Abrir Apresentação (PDF)</span>
              <Download className="w-4 h-4" />
            </div>
          </button>

          {/* 4. Relatórios Gerenciais */}
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 p-5 text-left hover:border-purple-400 hover:shadow-md transition active:scale-[0.99] group flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-purple-700 uppercase tracking-wider">
                  Auditoria & Métricas
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Relatórios Gerenciais
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Visualize indicadores consolidados de faturamento, status de aprovação, exportação em CSV e resumo executivo de desempenho.
                </p>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-purple-100 flex items-center justify-between text-xs font-bold text-purple-700">
              <span>Visualizar Relatórios e Métricas</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>

      {/* SECTION 2: DEMONSTRAÇÃO DOS PERFIS DE ACESSO (REMOVIDOS DO LOGIN) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-700" />
              Simulação de Perfis de Usuário para Clientes
            </h2>
            <p className="text-xs text-slate-500">
              Clique em qualquer cargo para entrar instantaneamente com suas respectivas permissões e demonstrar as abas exclusivas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {demoProfiles.map((p) => {
            const isCurrentProfile = user?.role === p.role;
            const isSwitching = switchingEmail === p.email;

            return (
              <div
                key={p.role}
                className={`rounded-3xl bg-white p-5 border shadow-sm transition flex flex-col justify-between ${p.cardBorder} ${
                  isCurrentProfile ? 'ring-2 ring-purple-600/30 bg-purple-50/20' : ''
                }`}
              >
                <div className="space-y-4">
                  {/* Header Profile */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-2xs">
                        {p.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${p.badgeColor}`}>
                            {p.role}
                          </span>
                          {isCurrentProfile && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                              <Check className="w-2.5 h-2.5" /> Atual
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-extrabold text-slate-900 mt-0.5">{p.name}</h3>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 font-medium leading-snug">
                    {p.tagline}
                  </p>

                  {/* Visible Tabs Pills */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Abas Acessíveis no Menu:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {p.visibleTabs.map((tab) => (
                        <span
                          key={tab}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold"
                        >
                          {tab}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="border-t border-slate-100 pt-3 space-y-1.5">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Recursos em Destaque:
                    </span>
                    {p.keyHighlights.map((hl, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 flex-none mt-0.5" />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>

                  {/* Sales Pitch for Clients */}
                  <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80 text-[11px] text-slate-600 italic">
                    <strong>Dica de Demonstração:</strong> "{p.clientPitch}"
                  </div>

                  {/* Credentials Box */}
                  <div className="rounded-xl bg-slate-900 text-white p-2.5 text-xs font-mono flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="text-slate-400 text-[10px] block">Login:</span>
                      <span className="truncate block font-semibold">{p.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${p.email} / ${p.pass}`, p.role)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex-none"
                      title="Copiar dados de acesso"
                    >
                      {copiedKey === p.role ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    disabled={isSwitching || isCurrentProfile}
                    onClick={() => handleSimulateProfile(p)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold shadow-sm transition flex items-center justify-center gap-2 ${
                      isCurrentProfile
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : 'bg-purple-700 hover:bg-purple-800 text-white active:scale-95'
                    }`}
                  >
                    {isSwitching ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Alternando Perfil...</span>
                      </>
                    ) : isCurrentProfile ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Perfil Atualmente em Exibição</span>
                      </>
                    ) : (
                      <>
                        <span>Demonstrar como {p.role}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE RELATÓRIOS GERENCIAIS */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                  Módulo de Relatórios & BI
                </span>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-700" />
                  Relatório Consolidado de Demonstração
                </h2>
              </div>
              <button
                onClick={() => setReportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 text-xs">
              {/* Stats overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-700 uppercase">Cotações Emitidas</span>
                  <div className="text-lg font-extrabold text-blue-950 mt-0.5">{quotes.length}</div>
                  <span className="text-[10px] text-blue-600">Total: R$ {(stats?.quotesTotal || 0).toFixed(2)}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-700 uppercase">Ordens de Serviço</span>
                  <div className="text-lg font-extrabold text-slate-900 mt-0.5">{orders.length}</div>
                  <span className="text-[10px] text-slate-600">Total: R$ {(stats?.ordersTotal || 0).toFixed(2)}</span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Clientes Ativos</span>
                  <div className="text-lg font-extrabold text-emerald-950 mt-0.5">{stats?.clientsCount || 0}</div>
                  <span className="text-[10px] text-emerald-600">Base cadastrada</span>
                </div>

                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100">
                  <span className="text-[10px] font-bold text-purple-700 uppercase">Técnicos Alocados</span>
                  <div className="text-lg font-extrabold text-purple-950 mt-0.5">{stats?.techniciansCount || 0}</div>
                  <span className="text-[10px] text-purple-600">Em operação</span>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50 space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">Resumo de Status dos Orçamentos e Ordens</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">Status Cotações:</span>
                    {quotes.length === 0 ? (
                      <span className="text-slate-400 italic text-[11px]">Nenhuma cotação registrada</span>
                    ) : (
                      quotes.map((q) => (
                        <div key={q.id} className="flex justify-between py-0.5 border-b border-slate-100 text-[11px]">
                          <span>#{q.quote_number} - {q.client_name}</span>
                          <span className="font-bold text-slate-700">{q.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">Status Ordens de Serviço:</span>
                    {orders.length === 0 ? (
                      <span className="text-slate-400 italic text-[11px]">Nenhuma ordem registrada</span>
                    ) : (
                      orders.map((o) => (
                        <div key={o.id} className="flex justify-between py-0.5 border-b border-slate-100 text-[11px]">
                          <span>#{o.order_number} - {o.client_name}</span>
                          <span className="font-bold text-slate-700">{o.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition text-xs shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Exportar Dados em CSV</span>
                </button>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold transition text-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold transition text-xs"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
