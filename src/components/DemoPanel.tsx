import React, { useState } from 'react';
import {
  Presentation,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Copy,
  Smartphone,
  Briefcase,
  Users,
  Shield,
  Layers,
  FileText,
  Camera,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

export const DemoPanel: React.FC = () => {
  const { user, login } = useAuth();
  const [switchingEmail, setSwitchingEmail] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
      visibleTabs: ['Painel', 'Orçamentos', 'Ordens de Serviço', 'Clientes', 'Técnicos', 'Usuários', 'Gerenciar Empresas (DEV)'],
      keyHighlights: [
        'Acesso irrestrito a todas as organizações cadastradas',
        'Console exclusivo de gestão de empresas e controle de usuários',
        'Alternância rápida de contexto ativo da empresa',
        'Redefinição de senhas e ativação/desativação de contas'
      ],
      clientPitch: 'Demonstre a arquitetura multi-tenant, auditoria completa e segurança corporativa.'
    },
    {
      role: 'ADM',
      name: 'Administrador da Empresa',
      email: 'adm@castengenharia.com.br',
      pass: 'adm123',
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
      cardBorder: 'border-red-200 hover:border-red-400 hover:shadow-red-50',
      icon: <Shield className="w-5 h-5 text-red-700" />,
      tagline: 'Gestão Completa da Unidade de Negócio',
      visibleTabs: ['Painel', 'Orçamentos', 'Ordens de Serviço', 'Clientes', 'Técnicos'],
      keyHighlights: [
        'Visão financeira consolidada de orçamentos e ordens de serviço',
        'Gestão de equipe técnica interna e terceirizada',
        'Cadastro completo de clientes (Pessoa Física e Jurídica)',
        'Geração e exportação de relatórios gerenciais e PDFs'
      ],
      clientPitch: 'Ideal para diretores e proprietários que necessitam de visão 360° da empresa.'
    },
    {
      role: 'GERENTE',
      name: 'Gerente Operacional',
      email: 'gerente@castengenharia.com.br',
      pass: 'gerente123',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      cardBorder: 'border-blue-200 hover:border-blue-400 hover:shadow-blue-50',
      icon: <Briefcase className="w-5 h-5 text-blue-700" />,
      tagline: 'Supervisão de Fluxo, Metas e Alocação',
      visibleTabs: ['Painel', 'Orçamentos', 'Ordens de Serviço', 'Clientes', 'Técnicos'],
      keyHighlights: [
        'Acompanhamento de orçamentos pendentes e aprovados',
        'Atribuição de ordens de serviço para técnicos disponíveis',
        'Controle de prazos de validade e faturamento',
        'Auditoria de clientes e contatos'
      ],
      clientPitch: 'Mostre aos gerentes o ganho de produtividade e eliminação de retrabalho na equipe.'
    },
    {
      role: 'SUPERVISOR',
      name: 'Supervisor de Serviços',
      email: 'supervisor@castengenharia.com.br',
      pass: 'super123',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      cardBorder: 'border-amber-200 hover:border-amber-400 hover:shadow-amber-50',
      icon: <Users className="w-5 h-5 text-amber-700" />,
      tagline: 'Foco Operacional: Propostas e Ordens',
      visibleTabs: ['Painel', 'Orçamentos', 'Ordens de Serviço'],
      keyHighlights: [
        'Elaboração rápida de orçamentos com precificação e itens',
        'Conversão de orçamento em ordem de serviço com 1 clique',
        'Supervisão do status das OS (Pendente, Em Andamento, Concluída)',
        'Interface limpa e objetiva, sem poluição de cadastros secundários'
      ],
      clientPitch: 'Demonstre a simplicidade e foco para quem atua na linha de frente operacional.'
    },
    {
      role: 'TÉCNICO',
      name: 'Técnico de Campo (Mobile / PWA)',
      email: 'tecnico@castengenharia.com.br',
      pass: 'tec123',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      cardBorder: 'border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-50',
      icon: <Smartphone className="w-5 h-5 text-emerald-700" />,
      tagline: 'Execução em Campo com Fotos Verticais e Assinatura',
      visibleTabs: ['Painel', 'Orçamentos', 'Ordens de Serviço'],
      keyHighlights: [
        'Registro de fotos técnicas exclusivamente no padrão vertical regulamentar (3:4)',
        'Check-in e acompanhamento de itens da ordem de serviço',
        'Coleta de assinatura digital do cliente na tela do celular/tablet',
        'Geração instantânea da via do cliente com fotos e assinatura embutidas'
      ],
      clientPitch: 'O grande diferencial para clientes: aplicativo ágil no celular com relatório fotográfico perfeito.'
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-purple-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-purple-800/40">
        <div className="absolute -top-10 -right-10 w-60 h-60 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-400/30">
              <Presentation className="w-3.5 h-3.5 text-purple-400" />
              Ambiente Comercial & Demonstração para Clientes
            </span>
            <span className="text-xs text-purple-200/80 font-medium">Modo Interativo</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3">
            Tela de DEMONSTRAÇÃO do Sistema
          </h2>

          <p className="text-xs sm:text-sm text-purple-200 mt-2 leading-relaxed">
            Alterne entre os perfis com <strong>1 clique</strong> durante apresentações comerciais para demonstrar exatamente o que cada usuário enxerga no sistema, com restrição de abas, regras de negócio e usabilidade personalizada para cada cargo.
          </p>
        </div>

        {/* Demo Quick Stats */}
        <div className="mt-6 pt-5 border-t border-purple-800/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-purple-200">
          <div>
            <span className="block text-[10px] text-purple-400 uppercase font-bold">Perfis Disponíveis</span>
            <span className="text-base font-extrabold text-white">5 Cargos Diferenciados</span>
          </div>
          <div>
            <span className="block text-[10px] text-purple-400 uppercase font-bold">Privacidade de Dados</span>
            <span className="text-base font-extrabold text-white">Multiempresa Isolado</span>
          </div>
          <div>
            <span className="block text-[10px] text-purple-400 uppercase font-bold">Relatório em Campo</span>
            <span className="text-base font-extrabold text-white">Fotos Verticais 3:4</span>
          </div>
          <div>
            <span className="block text-[10px] text-purple-400 uppercase font-bold">Assinatura Digital</span>
            <span className="text-base font-extrabold text-white">Na Tela do Dispositivo</span>
          </div>
        </div>
      </div>

      {/* Profile Cards Grid */}
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
  );
};
