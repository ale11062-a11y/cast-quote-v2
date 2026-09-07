import React, { useState, useEffect } from 'react';
import {
  Download,
  Printer,
  Copy,
  Check,
  X,
  Presentation,
  Sparkles,
  FileText,
  ShieldCheck,
  TrendingUp,
  Smartphone,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { generateCommercialPresentationPdf } from '../utils/pdfGenerator';

interface CommercialPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommercialPresentationModal: React.FC<CommercialPresentationModalProps> = ({
  isOpen,
  onClose
}) => {
  const { activeCompany, user, brandColor } = useAuth();
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState<number>(1);
  const [copiedPitch, setCopiedPitch] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      generatePreview();
    } else {
      setPdfDataUri(null);
    }
  }, [isOpen, activeCompany?.id, activeCompany?.primary_color]);

  const generatePreview = () => {
    try {
      setIsGenerating(true);
      const doc = generateCommercialPresentationPdf({
        company: activeCompany,
        presenterName: user?.name,
        presenterRole: user?.role
      });
      const uri = doc.output('datauristring');
      setPdfDataUri(uri);
    } catch (err) {
      console.error('Erro ao gerar apresentação comercial:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const handleDownload = () => {
    const doc = generateCommercialPresentationPdf({
      company: activeCompany,
      presenterName: user?.name,
      presenterRole: user?.role
    });
    const filename = `Apresentacao_Comercial_${(activeCompany?.name || 'CAST_Quote').replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
  };

  const handlePrint = () => {
    const doc = generateCommercialPresentationPdf({
      company: activeCompany,
      presenterName: user?.name,
      presenterRole: user?.role
    });
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const commercialPitchScript = `Olá! Tudo bem?

Gostaria de apresentar a você o CAST QUOTE, a nossa plataforma integrada desenvolvida sob medida para empresas de serviços técnicos, engenharias e manutenção.

Principais benefícios para a sua empresa:
1. Emissão de Orçamentos em menos de 2 minutos: Acabe com planilhas manuais e propostas em papel. O sistema calcula materiais, mão de obra, margens e descontos com precisão e gera PDFs corporativos impecáveis.
2. Ordens de Serviço & Equipe de Campo: Controle o que cada técnico faz em tempo real, com checklists de execução e histórico completo.
3. Fotos Verticais (3:4) Regulamentares: Evidências fotográficas do antes e depois gravadas com data, hora e técnico responsável diretamente no laudo.
4. Assinatura Digital no Celular: O cliente assina na hora com o dedo na tela, eliminando contestações e atrasos de pagamento.
5. 100% White-Label: A plataforma opera com o seu logotipo, suas cores e seus dados fiscais.
6. Aplicativo Instalável (PWA) e Modo Offline: Seus técnicos conseguem trabalhar em subsolos ou áreas sem internet sem perder dados.

O resultado? Redução média de 75% no tempo operacional e aumento de até 35% na taxa de conversão de novos serviços.

Podemos agendar uma demonstração rápida de 15 minutos para você ver funcionando ao vivo?`;

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(commercialPitchScript);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-6xl h-[94vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: brandColor }}
            >
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  Material de Vendas & Apresentação
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  PDF 4 Slides A4
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-white leading-tight">
                Apresentação Comercial Executiva
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPitch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition border border-slate-700 active:scale-95"
              title="Copiar texto para enviar no WhatsApp ou e-mail"
            >
              {copiedPitch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              <span>{copiedPitch ? 'Copiado!' : 'Copiar Script'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition border border-slate-700 active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition active:scale-95 hover:brightness-110"
              style={{ backgroundColor: brandColor }}
            >
              <Download className="w-4 h-4" />
              <span>Baixar Apresentação (PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100">
          {/* Left Side: Interactive Slide Summary & Script */}
          <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col justify-between p-4 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Estrutura dos Slides no PDF:
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  Apresentação em formato A4 Paisagem, pronta para reuniões, envio por e-mail ou WhatsApp.
                </p>
              </div>

              <div className="space-y-2">
                <div
                  onClick={() => setActiveSlide(1)}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    activeSlide === 1
                      ? 'border-purple-300 bg-purple-50/50 shadow-2xs'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-900 text-white">
                      Slide 1
                    </span>
                    <span className="text-[11px] font-bold text-purple-700">Capa & Proposta</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1.5">
                    Visão Geral da Plataforma
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Apresentação institucional, credenciais da empresa e os 4 pilares tecnológicos.
                  </p>
                </div>

                <div
                  onClick={() => setActiveSlide(2)}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    activeSlide === 2
                      ? 'border-purple-300 bg-purple-50/50 shadow-2xs'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-900 text-white">
                      Slide 2
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">Dores vs. Solução</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1.5">
                    Por que Modernizar?
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Comparativo direto entre o modelo tradicional de papel/planilhas e o CAST Quote.
                  </p>
                </div>

                <div
                  onClick={() => setActiveSlide(3)}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    activeSlide === 3
                      ? 'border-purple-300 bg-purple-50/50 shadow-2xs'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-900 text-white">
                      Slide 3
                    </span>
                    <span className="text-[11px] font-bold text-blue-700">Recursos</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1.5">
                    Módulos de Ponta a Ponta
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Cotações, Ordens de Serviço, White-Label e Gestão de Usuários com 5 níveis de acesso.
                  </p>
                </div>

                <div
                  onClick={() => setActiveSlide(4)}
                  className={`p-3 rounded-2xl border transition cursor-pointer ${
                    activeSlide === 4
                      ? 'border-purple-300 bg-purple-50/50 shadow-2xs'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-900 text-white">
                      Slide 4
                    </span>
                    <span className="text-[11px] font-bold text-amber-700">ROI & Fechamento</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1.5">
                    Retorno do Investimento & CTA
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Métricas de ganhos (-75% tempo, +35% vendas), PWA offline e chamada para ação.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Pitch Box */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Roteiro de Abordagem Rápida
                </span>
                <button
                  type="button"
                  onClick={handleCopyPitch}
                  className="text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-0.5"
                >
                  {copiedPitch ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed max-h-32 overflow-y-auto">
                "Olá! Gostaria de apresentar o CAST Quote, nossa plataforma integrada para automação de orçamentos e ordens de serviço. Eliminamos papel, fotos soltas e contestações com laudos em PDF e assinatura na tela..."
              </div>
            </div>
          </div>

          {/* Right Side: Visual PDF Preview */}
          <div className="flex-1 p-3 sm:p-5 flex flex-col justify-center items-center overflow-hidden">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <div className="w-8 h-8 border-4 border-slate-300 border-t-purple-600 rounded-full animate-spin mb-3" />
                <p className="text-xs font-bold">Compilando apresentação em alta resolução...</p>
              </div>
            ) : pdfDataUri ? (
              <div className="w-full h-full rounded-2xl overflow-hidden shadow-lg border border-slate-300 bg-slate-800">
                <iframe
                  src={`${pdfDataUri}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="w-full h-full border-none"
                  title="Apresentação Comercial em PDF"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <p className="text-xs">Não foi possível carregar a prévia do documento.</p>
                <button
                  onClick={handleDownload}
                  className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold"
                >
                  Baixar PDF Diretamente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
