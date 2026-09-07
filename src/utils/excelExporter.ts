import * as XLSX from 'xlsx';
import { Quote, WorkOrder } from '../types';

export function exportQuotesToExcel(quotes: Quote[], companyName?: string) {
  const rows = quotes.map((q) => ({
    'Nº Orçamento': q.quote_number,
    'Data': q.date,
    'Cliente': q.client_name || 'N/A',
    'Técnico': q.technician_name || 'N/A',
    'Status': q.status,
    'Descrição': q.description,
    'Subtotal (R$)': q.subtotal,
    'Desconto (R$)': q.discount,
    'Acréscimo (R$)': q.addition,
    'Total (R$)': q.total,
    'Itens': q.items?.length || 0,
    'Fotos': q.photos?.length || 0,
    'Observações': q.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orçamentos');

  const filename = `CAST_Orcamentos_${companyName ? companyName.replace(/\s+/g, '_') : 'Geral'}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export function exportWorkOrdersToExcel(orders: WorkOrder[], companyName?: string) {
  const rows = orders.map((o) => ({
    'Nº Ordem Serviço': o.order_number,
    'Data': o.date,
    'Cliente': o.client_name || 'N/A',
    'Técnico': o.technician_name || 'N/A',
    'Status': o.status,
    'Descrição dos Serviços': o.service_description,
    'Endereço': o.address || '',
    'Subtotal (R$)': o.subtotal,
    'Desconto (R$)': o.discount,
    'Acréscimo (R$)': o.addition,
    'Total (R$)': o.total,
    'Itens': o.items?.length || 0,
    'Fotos': o.photos?.length || 0,
    'Observações': o.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ordens_de_Servico');

  const filename = `CAST_Ordens_Servico_${companyName ? companyName.replace(/\s+/g, '_') : 'Geral'}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export function exportSingleDocumentToExcel(type: 'ORÇAMENTO' | 'ORDEM DE SERVIÇO', doc: Quote | WorkOrder) {
  const isQuote = type === 'ORÇAMENTO';
  const num = isQuote ? (doc as Quote).quote_number : (doc as WorkOrder).order_number;

  const headerData = [
    ['DOCUMENTO:', type, 'NÚMERO:', num],
    ['EMISSÃO:', doc.date, 'STATUS:', doc.status],
    ['CLIENTE:', doc.client_name || '', 'DOCUMENTO:', doc.client_document || ''],
    ['TÉCNICO:', doc.technician_name || '', 'TELEFONE:', doc.client_phone || ''],
    ['ENDEREÇO:', doc.address || '', '', ''],
    ['ESCOPO:', isQuote ? (doc as Quote).description : (doc as WorkOrder).service_description, '', ''],
    [],
    ['SUBTOTAL (R$)', 'DESCONTOS (R$)', 'ACRÉSCIMOS (R$)', 'VALOR TOTAL (R$)'],
    [doc.subtotal, doc.discount, doc.addition, doc.total],
    []
  ];

  const itemsHeader = ['#', 'TIPO', 'DESCRIÇÃO', 'QTD', 'UNIDADE', 'VALOR UNITÁRIO (R$)', 'VALOR TOTAL (R$)'];
  const itemsRows = (doc.items || []).map((item, idx) => [
    idx + 1,
    item.item_type.toUpperCase(),
    item.description,
    item.quantity,
    item.unit,
    item.unit_price,
    item.total_price
  ]);

  const worksheetData = [...headerData, itemsHeader, ...itemsRows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${type}_${num}`);

  const filename = `CAST_${type}_${num}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
