import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  PenTool,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Sliders,
  Award,
  Zap,
  Info
} from 'lucide-react';
import { FluidSignaturePad } from './FluidSignaturePad';

export interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (signatureDataUrl: string) => Promise<void> | void;
  documentType: 'OS' | 'Orçamento';
  documentNumber: number | string;
  clientName?: string;
  signeeType?: 'client' | 'technician';
  initialSignature?: string;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  documentType,
  documentNumber,
  clientName = 'Cliente',
  signeeType = 'client',
  initialSignature
}) => {
  const [signatureData, setSignatureData] = useState<string | null>(initialSignature || null);
  const [strokeCount, setStrokeCount] = useState<number>(initialSignature ? 1 : 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'sign' | 'trainer'>('sign');

  // Trainer metrics
  const [trainerStrokes, setTrainerStrokes] = useState<number>(0);
  const [engineMode, setEngineMode] = useState<'fluid' | 'comparison'>('fluid');

  if (!isOpen) return null;

  const handleSaveSignature = (dataUrl: string) => {
    setSignatureData(dataUrl);
  };

  const handleStrokeChange = (isEmpty: boolean, count: number) => {
    setStrokeCount(count);
    if (isEmpty) {
      setSignatureData(null);
    }
  };

  const handleSubmit = async () => {
    if (!signatureData || strokeCount === 0) {
      alert('Por favor, faça a assinatura antes de confirmar.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(signatureData);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar assinatura:', err);
      alert('Erro ao salvar assinatura. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isClient = signeeType === 'client';
  const title = isClient
    ? `Assinatura do Cliente • ${documentType} #${documentNumber}`
    : `Assinatura do Técnico • ${documentType} #${documentNumber}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                {title}
              </h3>
              <p className="text-[11px] text-blue-200/80">
                {isClient ? `Titular: ${clientName}` : 'Responsável Técnico Autorizado'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Coletar vs Treinador de Traços */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-5 pt-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('sign')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'sign'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Coletar Assinatura na Tela</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trainer')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'trainer'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>🎓 Treinador & Calibrador de Fluidez</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">Novo</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'sign' ? (
            <>
              {/* Instructions banner for mobile touchscreen use */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900">
                <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Coleta Direta na Tela com Toque Fluido</p>
                  <p className="text-blue-700 text-[11px] leading-relaxed">
                    Utilize o dedo ou caneta touch. Nosso novo motor de traço suaviza curvas Bézier em 120Hz para eliminar qualquer rigidez ou perda de traço.
                  </p>
                </div>
              </div>

              {/* The Fluid Signature Pad */}
              <div className="space-y-1.5">
                <FluidSignaturePad
                  height={260}
                  onSave={handleSaveSignature}
                  onStrokeChange={handleStrokeChange}
                  initialDataUrl={initialSignature}
                  clientName={clientName}
                />
              </div>

              {/* Formal Legal Acceptance Text */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Declaração de Aceite e Autenticidade Digital</span>
                </div>
                <p className="text-slate-500 leading-normal">
                  {isClient ? (
                    <>
                      Ao assinar acima, o cliente <strong>{clientName}</strong> confirma o recebimento e aprovação dos serviços discriminados no documento <strong>{documentType} #{documentNumber}</strong>, com valor jurídico e carimbo de data/hora no comprovante em PDF.
                    </>
                  ) : (
                    <>
                      Ao assinar acima, o técnico declara a conclusão técnica e conferência dos serviços listados no documento <strong>{documentType} #{documentNumber}</strong>.
                    </>
                  )}
                </p>
              </div>
            </>
          ) : (
            /* TRAINER TAB: specifically for testing and feeling stroke fluidity */
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Calibrador de Sensibilidade e Reconhecimento de Traços</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Aqui você pode treinar sua assinatura, testar a resposta ao toque de telas touch e celulares, e conferir a fluidez de cada laço e curva em tempo real.
                </p>
              </div>

              {/* Engine Comparison Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-900">Novo Motor Ativo: Bézier 120Hz</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Interpolação contínua entre pontos e cálculo de pressão por velocidade. Traço sedoso e natural.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-700">Captura Contínua (PointerCapture)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Mesmo se o dedo deslizar rápido ou sair da borda, o traçado não falha nem é cancelado pelo navegador.
                    </p>
                  </div>
                </div>
              </div>

              {/* Practice Pad */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-700">
                  Área Livre de Treino de Traço (Experimente rubricas rápidas):
                </p>
                <FluidSignaturePad
                  height={240}
                  onStrokeChange={(empty, count) => setTrainerStrokes(count)}
                  clientName="Área de Prática e Calibração"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span className="font-medium">Satisfeito com a calibração?</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('sign')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center gap-1.5"
                >
                  <PenTool className="w-3 h-3" />
                  <span>Ir para Coleta Oficial</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {strokeCount > 0 ? (
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Assinatura pronta para vincular à OS
              </span>
            ) : (
              <span className="text-slate-400">Nenhum traço coletado ainda</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={strokeCount === 0 || isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Gravando...' : 'Confirmar e Salvar Assinatura'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
