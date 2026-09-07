import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Share2, Cloud, X, Printer } from 'lucide-react';
import { Quote, WorkOrder, Company } from '../types';
import { generateDocumentPdf } from '../utils/pdfGenerator';
import { exportSingleDocumentToExcel } from '../utils/excelExporter';
import { useAuth } from '../context/AuthContext';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'ORÇAMENTO' | 'ORDEM DE SERVIÇO';
  data: Quote | WorkOrder | null;
  company?: Company | null;
  onOpenShare?: () => void;
  onOpenDrive?: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  type,
  data,
  company,
  onOpenShare,
  onOpenDrive
}) => {
  const { isDev } = useAuth();
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && data) {
      try {
        const doc = generateDocumentPdf({ type, data, company });
        const uri = doc.output('datauristring');
        setPdfDataUri(uri);
      } catch (err) {
        console.error('Failed to generate PDF preview:', err);
      }
    } else {
      setPdfDataUri(null);
    }
  }, [isOpen, data, type, company]);

  if (!isOpen || !data) return null;

  const isQuote = type === 'ORÇAMENTO';
  const docNumber = isQuote ? (data as Quote).quote_number : (data as WorkOrder).order_number;
  const filename = `CAST_${type.replace(/\s+/g, '_')}_${docNumber}.pdf`;

  const handleDownloadPdf = () => {
    const doc = generateDocumentPdf({ type, data, company });
    doc.save(filename);
  };

  const handlePrint = () => {
    const doc = generateDocumentPdf({ type, data, company });
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleExcelExport = () => {
    exportSingleDocumentToExcel(type, data);
  };

  const brandColor = company?.primary_color || '#2563eb';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl h-[94vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs"
                style={{ backgroundColor: brandColor }}
              >
                {type}
              </span>
              <h2 className="text-base font-bold">Nº {docNumber}</h2>
              <span className="text-xs text-slate-400">({data.client_name})</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Fotos com tamanho fixo regulamentar (até 5 por linha, estritamente verticais)
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-xs transition"
              title="Baixar PDF do documento"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar PDF</span>
            </button>

            <button
              onClick={handleExcelExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs transition"
              title="Exportar para Excel .xlsx"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            {isDev && onOpenDrive && (
              <button
                onClick={onOpenDrive}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900 text-purple-200 text-xs font-semibold hover:bg-purple-800 border border-purple-700 transition"
                title="Salvar no Google Drive (DEV)"
              >
                <Cloud className="w-3.5 h-3.5 text-purple-300" />
                <span>Drive (DEV)</span>
              </button>
            )}

            {onOpenShare && (
              <button
                onClick={onOpenShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition"
                title="Compartilhar via WhatsApp e Email"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Imprimir"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-2"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-slate-100 relative">
          {pdfDataUri ? (
            <iframe
              src={pdfDataUri}
              className="w-full h-full border-0"
              title={`Visualização de ${type} #${docNumber}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6 text-slate-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
                <p className="text-sm font-medium">Gerando PDF com diagramação profissional...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
