import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Mail,
  CheckCircle2,
  MessageSquare,
  ExternalLink,
  Settings,
  AlertCircle,
  Copy,
  Check,
  Radio,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Quote, WorkOrder, Company } from '../types';
import { api } from '../services/api';
import {
  buildWhatsAppSummary,
  sendWhatsAppMessage,
  getWhatsAppSettings,
  saveWhatsAppSettings,
  WhatsAppSettings
} from '../services/whatsappService';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'ORÇAMENTO' | 'ORDEM DE SERVIÇO';
  data: Quote | WorkOrder | null;
  company?: Company | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  type,
  data,
  company
}) => {
  const [phone, setPhone] = useState(data?.client_phone || '');
  const [email, setEmail] = useState(data?.client_email || '');
  const [customNotes, setCustomNotes] = useState('');
  const [sentSuccess, setSentSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // WhatsApp Integration Mode & Settings
  const [sendMode, setSendMode] = useState<'wa_me' | 'api'>('wa_me');
  const [showConfig, setShowConfig] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [instanceName, setInstanceName] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSavedNotice, setConfigSavedNotice] = useState(false);

  // Load company's saved WhatsApp settings on open
  useEffect(() => {
    if (isOpen && data) {
      setPhone(data.client_phone || '');
      setEmail(data.client_email || '');
      setSentSuccess(null);
      setErrorMessage(null);

      const compId = data.company_id || company?.id;
      if (compId) {
        getWhatsAppSettings(compId)
          .then((settings) => {
            if (settings) {
              setSendMode(settings.mode || 'wa_me');
              setApiUrl(settings.api_url || '');
              setApiKey(settings.api_key || '');
              setInstanceName(settings.instance_name || '');
            }
          })
          .catch((err) => console.warn('Could not load whatsapp settings:', err));
      }
    }
  }, [isOpen, data, company]);

  if (!isOpen || !data) return null;

  const isQuote = type === 'ORÇAMENTO';
  const docNumber = isQuote ? (data as Quote).quote_number : (data as WorkOrder).order_number;
  const compName = company?.name || (data as any).company?.name || 'CAST Quote';

  const formatCurrency = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Generate the formatted summary for WhatsApp
  const whatsappMessage = buildWhatsAppSummary({
    type,
    data,
    company,
    customNotes
  });

  const defaultEmailSubject = `${type} #${docNumber} - ${compName}`;
  const defaultEmailBody =
    `Prezado(a) ${data.client_name || 'Cliente'},\n\n` +
    `Esperamos que este e-mail o encontre bem.\n\n` +
    `Encaminhamos em anexo os detalhes do seu ${type} #${docNumber}.\n` +
    `Valor total: ${formatCurrency(data.total)}\n\n` +
    (customNotes ? `Observação: ${customNotes}\n\n` : '') +
    `Atenciosamente,\n${compName}\n${company?.phone || ''}`;

  const cleanPhone = (p: string) => p.replace(/\D/g, '');

  const handleSaveSettings = async () => {
    const compId = data.company_id || company?.id;
    if (!compId) return;

    setSavingConfig(true);
    try {
      await saveWhatsAppSettings({
        company_id: compId,
        mode: sendMode,
        api_url: apiUrl,
        api_key: apiKey,
        instance_name: instanceName
      });
      setConfigSavedNotice(true);
      setTimeout(() => setConfigSavedNotice(false), 3000);
    } catch (err: any) {
      alert('Erro ao salvar configurações de WhatsApp: ' + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSendWhatsApp = async () => {
    const rawNumber = cleanPhone(phone);
    if (!rawNumber) {
      setErrorMessage('Por favor, informe o telefone do cliente com DDD.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSentSuccess(null);

    try {
      const compId = data.company_id || company?.id;
      const result = await sendWhatsAppMessage({
        company_id: compId,
        phone: rawNumber,
        message: whatsappMessage,
        document_type: type,
        document_number: docNumber,
        mode: sendMode,
        api_url: apiUrl,
        api_key: apiKey,
        instance_name: instanceName
      });

      if (sendMode === 'api' && result.api_sent) {
        setSentSuccess(`Resumo enviado automaticamente com sucesso para +${result.formatted_phone} via API de Mensageria!`);
      } else if (sendMode === 'api' && result.api_error) {
        setErrorMessage(`${result.api_error}. Você pode utilizar o link wa.me abaixo para envio direto.`);
        window.open(result.wa_url, '_blank');
      } else {
        // Standard wa.me mode
        setSentSuccess('Resumo gerado! Abrindo conversa oficial do WhatsApp via wa.me...');
        window.open(result.wa_url, '_blank');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Erro no envio: ' + (err.message || 'Falha na comunicação.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email) {
      setErrorMessage('Por favor, informe o e-mail do cliente.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSentSuccess(null);

    try {
      await api.sendNotification({
        company_id: data.company_id,
        title: `${type} #${docNumber} enviado por E-mail`,
        message: defaultEmailBody,
        channel: 'email',
        recipient: email
      });

      setSentSuccess('Notificação de E-mail registrada! Abrindo cliente de e-mail...');
      const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(defaultEmailSubject)}&body=${encodeURIComponent(defaultEmailBody)}`;
      window.location.href = mailtoUrl;
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Erro ao registrar notificação: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl my-6 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 flex-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Enviar {type} #{docNumber}</h3>
              <p className="text-xs text-slate-400">Integração de mensagens WhatsApp & E-mail</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {sentSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-none" />
              <span>{sentSuccess}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-none" />
              <div className="flex-1">
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* WhatsApp Sending Method Selector */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                Método de Envio do WhatsApp:
              </span>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
              >
                <Settings className="w-3 h-3" />
                <span>Configurar Gateway API</span>
                {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSendMode('wa_me')}
                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  sendMode === 'wa_me'
                    ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="mt-0.5">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    sendMode === 'wa_me' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'
                  }`}>
                    {sendMode === 'wa_me' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold">Link Direto (wa.me)</div>
                  <div className="text-[10px] text-slate-500">Abre no WhatsApp Web ou app</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSendMode('api')}
                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  sendMode === 'api'
                    ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="mt-0.5">
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    sendMode === 'api' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'
                  }`}>
                    {sendMode === 'api' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold">API de Mensageria</div>
                  <div className="text-[10px] text-slate-500">Envio automático via Gateway</div>
                </div>
              </button>
            </div>

            {/* Collapsible API Gateway Settings */}
            {showConfig && (
              <div className="mt-2 pt-3 border-t border-slate-200 space-y-3 bg-white p-3 rounded-lg text-xs">
                <div className="text-[11px] font-bold text-slate-700">
                  Configuração da API Externa de WhatsApp (Evolution, Z-API, Webhook)
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    URL do Endpoint de Envio (POST)
                  </label>
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://api.gateway.com/message/sendText"
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Chave de API / Token
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Bearer token / apikey"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Instância / Sessão (opcional)
                    </label>
                    <input
                      type="text"
                      value={instanceName}
                      onChange={(e) => setInstanceName(e.target.value)}
                      placeholder="minha-instancia"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  {configSavedNotice && (
                    <span className="text-[11px] text-emerald-700 font-medium self-center flex items-center gap-1">
                      <Check className="w-3 h-3" /> Configuração salva!
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={savingConfig}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition disabled:opacity-50"
                  >
                    {savingConfig ? 'Salvando...' : 'Salvar Configurações da Empresa'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Client WhatsApp Number Input & Action */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp / Celular do Cliente (com DDD)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                <span>
                  {sendMode === 'api' ? 'Enviar via API' : 'Enviar WhatsApp'}
                </span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {sendMode === 'api'
                ? 'Dispara o resumo automaticamente em segundo plano pelo Gateway de Mensagens.'
                : 'Abre o link oficial wa.me pronto para envio imediato para o cliente.'}
            </p>
          </div>

          {/* Client Email Input & Action */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              E-mail do Cliente (opcional)
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@empresa.com.br"
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs disabled:opacity-50"
              >
                <Mail className="w-4 h-4" />
                <span>E-mail</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mensagem Adicional / Condição Especial (opcional)
            </label>
            <textarea
              rows={2}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Ex: Condição de pagamento em até 3x sem juros até sexta-feira..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Live Message Preview */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-800">
                Prévia do Resumo Estruturado (WhatsApp):
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-slate-300 transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] leading-relaxed text-slate-700 max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
              {whatsappMessage}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end flex-none">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
