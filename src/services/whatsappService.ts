import { Quote, WorkOrder, Company } from '../types';

export interface WhatsAppSettings {
  id?: string;
  company_id: string;
  mode: 'wa_me' | 'api';
  api_url?: string;
  api_key?: string;
  instance_name?: string;
}

export interface SendWhatsAppPayload {
  company_id?: string;
  phone: string;
  message: string;
  document_type?: 'ORÇAMENTO' | 'ORDEM DE SERVIÇO';
  document_number?: string | number;
  mode?: 'wa_me' | 'api';
  api_url?: string;
  api_key?: string;
  instance_name?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  mode: 'wa_me' | 'api';
  api_sent: boolean;
  api_error?: string | null;
  wa_url: string;
  formatted_phone: string;
  api_response?: any;
  message: string;
}

const formatCurrency = (val: number) =>
  (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (dStr: string) => {
  if (!dStr) return '';
  const [year, month, day] = dStr.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Gera um resumo profissional e estruturado para envio via WhatsApp
 */
export function buildWhatsAppSummary(params: {
  type: 'ORÇAMENTO' | 'ORDEM DE SERVIÇO';
  data: Quote | WorkOrder;
  company?: Company | null;
  customNotes?: string;
}): string {
  const { type, data, company, customNotes } = params;
  const isQuote = type === 'ORÇAMENTO';
  const docNumber = isQuote ? (data as Quote).quote_number : (data as WorkOrder).order_number;
  const compName = company?.name || (data as any).company?.name || 'CAST Quote';
  const clientName = data.client_name || 'Cliente';

  let msg = `Olá, *${clientName}*! 👋\n\n`;
  msg += `Segue o resumo do seu *${type} #${docNumber}* gerado por *${compName}*:\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;

  // Detalhes Principais
  msg += `📅 *Data de Emissão:* ${formatDate(data.date)}\n`;
  if (isQuote && (data as Quote).validity_date) {
    msg += `⏳ *Validade da Proposta:* ${formatDate((data as Quote).validity_date!)}\n`;
  }
  if (data.technician_name) {
    msg += `👷 *Técnico Responsável:* ${data.technician_name}\n`;
  }

  // Escopo
  const scopeDesc = isQuote ? (data as Quote).description : (data as WorkOrder).service_description;
  if (scopeDesc) {
    msg += `📝 *Escopo/Serviço:* ${scopeDesc}\n`;
  }

  // Resumo dos Itens e Serviços
  if (data.items && data.items.length > 0) {
    msg += `\n📦 *Itens & Serviços:*\n`;
    data.items.forEach((item, index) => {
      const typeTag = item.item_type === 'servico' ? '🛠️' : '📦';
      msg += `  ${typeTag} *${item.quantity} ${item.unit || 'UN'}* × ${item.description}: ${formatCurrency(item.total_price)}\n`;
    });
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;

  // Valores Financeiros
  if (data.discount && data.discount > 0) {
    msg += `🔻 *Desconto:* -${formatCurrency(data.discount)}\n`;
  }
  if (data.addition && data.addition > 0) {
    msg += `🔺 *Acréscimo:* +${formatCurrency(data.addition)}\n`;
  }
  msg += `💰 *VALOR TOTAL: ${formatCurrency(data.total)}*\n`;

  // Observações Customizadas
  if (customNotes && customNotes.trim()) {
    msg += `\n📌 *Observações:* ${customNotes.trim()}\n`;
  }

  // Rodapé e Contatos
  msg += `\nEstamos à disposição para esclarecer quaisquer dúvidas!\n`;
  if (company?.phone) {
    msg += `📞 *Contato:* ${company.phone}\n`;
  }
  if (company?.email) {
    msg += `✉️ *E-mail:* ${company.email}\n`;
  }
  msg += `\n*${compName}*`;

  return msg;
}

/**
 * Busca configurações salvas de WhatsApp da empresa
 */
export async function getWhatsAppSettings(companyId: string): Promise<WhatsAppSettings> {
  const res = await fetch(`/api/whatsapp/settings?companyId=${encodeURIComponent(companyId)}`);
  if (!res.ok) {
    throw new Error('Falha ao carregar configurações de WhatsApp');
  }
  return res.json();
}

/**
 * Salva configurações de WhatsApp da empresa
 */
export async function saveWhatsAppSettings(settings: WhatsAppSettings): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/whatsapp/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao salvar configurações de WhatsApp');
  }
  return res.json();
}

/**
 * Envia mensagem via WhatsApp (chamando API externa ou gerando link wa.me)
 */
export async function sendWhatsAppMessage(payload: SendWhatsAppPayload): Promise<SendWhatsAppResult> {
  const res = await fetch('/api/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao processar envio para WhatsApp');
  }

  return data as SendWhatsAppResult;
}
