import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Download,
  Share2,
  Cloud,
  FileSpreadsheet,
  Edit2,
  Copy,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  PenTool,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { WorkOrder } from '../types';
import { exportWorkOrdersToExcel } from '../utils/excelExporter';
import { SignatureModal } from './SignatureModal';

interface WorkOrdersListProps {
  onNewWorkOrder: () => void;
  onEditWorkOrder: (order: WorkOrder) => void;
  onViewWorkOrder: (order: WorkOrder) => void;
  onOpenPdf: (order: WorkOrder) => void;
  onOpenShare: (order: WorkOrder) => void;
  onOpenDrive?: (order: WorkOrder) => void;
}

export const WorkOrdersList: React.FC<WorkOrdersListProps> = ({
  onNewWorkOrder,
  onEditWorkOrder,
  onViewWorkOrder,
  onOpenPdf,
  onOpenShare,
  onOpenDrive
}) => {
  const { user, activeCompany, isDev, isAdmin } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [signingOrder, setSigningOrder] = useState<WorkOrder | null>(null);
  const [isTrainerOpen, setIsTrainerOpen] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [activeCompany?.id, user?.role, statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getWorkOrders({
        companyId: activeCompany?.id,
        userRole: user?.role,
        status: statusFilter,
        search: searchTerm
      });
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const handleDuplicate = async (order: WorkOrder) => {
    if (!confirm(`Deseja duplicar a OS #${order.order_number}?`)) return;
    try {
      const res = await api.duplicateWorkOrder(order.id);
      alert(res.message);
      loadOrders();
    } catch (err: any) {
      alert('Erro ao duplicar OS: ' + err.message);
    }
  };

  const handleDelete = async (order: WorkOrder) => {
    if (!confirm(`Atenção: tem certeza que deseja excluir a OS #${order.order_number}?`)) return;
    try {
      await api.deleteWorkOrder(order.id);
      loadOrders();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const formatBrl = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Concluída':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Em Andamento':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Cancelada':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-emerald-600" />
            Ordens de Serviço (OS)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Execução em campo, alocação técnica, fotos verticais e fechamento de serviços
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTrainerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold text-amber-900 shadow-2xs transition"
            title="Calibrador e Treinador de Fluidez de Assinatura"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Treinador de Assinatura</span>
          </button>

          <button
            onClick={() => exportWorkOrdersToExcel(orders, activeCompany?.name)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
            title="Exportar listagem para Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">Exportar Excel</span>
          </button>

          <button
            onClick={onNewWorkOrder}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Ordem de Serviço</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por número da OS, cliente ou descrição..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            Filtrar
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-emerald-600"
          >
            <option value="ALL">Todos os Status</option>
            <option value="Aberta">Aberta</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluída">Concluída</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2" />
            <p className="text-xs font-semibold">Carregando ordens de serviço...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Wrench className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma ordem de serviço encontrada</p>
            <p className="text-xs text-slate-500">Crie uma nova OS ou converta um orçamento aprovado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Nº OS</th>
                  {isDev && !activeCompany && <th className="px-5 py-3.5">Empresa</th>}
                  <th className="px-5 py-3.5">Cliente</th>
                  <th className="px-5 py-3.5">Data</th>
                  <th className="px-5 py-3.5">Técnico</th>
                  <th className="px-5 py-3.5">Total</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-4 font-bold text-emerald-700 whitespace-nowrap">
                      #{o.order_number}
                    </td>

                    {isDev && !activeCompany && (
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 text-[11px] font-bold">
                          <Building className="w-3 h-3 text-purple-600" />
                          {o.company_name || 'Geral'}
                        </span>
                      </td>
                    )}

                    <td className="px-5 py-4 font-medium text-slate-900 max-w-[200px]">
                      <div className="truncate font-semibold">{o.client_name || 'Cliente'}</div>
                      <div className="text-[10px] text-slate-400 truncate">{o.service_description}</div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">{o.date}</td>

                    <td className="px-5 py-4 whitespace-nowrap text-slate-700">
                      {o.technician_name || 'Não informado'}
                    </td>

                    <td className="px-5 py-4 font-extrabold text-slate-900 whitespace-nowrap">
                      {formatBrl(o.total)}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          o.status
                        )}`}
                      >
                        {o.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSigningOrder(o)}
                          className={`p-1.5 rounded-lg transition ${
                            o.client_signature
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                          title={
                            o.client_signature
                              ? 'Assinatura Coletada • Clique para visualizar ou alterar'
                              : 'Coletar Assinatura do Cliente no Local'
                          }
                        >
                          <PenTool className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onOpenPdf(o)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                          title="Visualizar e Baixar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onOpenShare(o)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                          title="Enviar WhatsApp e E-mail"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        {isDev && onOpenDrive && (
                          <button
                            onClick={() => onOpenDrive(o)}
                            className="p-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
                            title="Sincronizar Google Drive (DEV)"
                          >
                            <Cloud className="w-4 h-4 text-purple-600" />
                          </button>
                        )}

                        <button
                          onClick={() => onEditWorkOrder(o)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-slate-100 transition"
                          title="Editar Ordem de Serviço"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDuplicate(o)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                          title="Duplicar OS"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(o)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Excluir OS"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signature Modal for Work Order */}
      {signingOrder && (
        <SignatureModal
          isOpen={!!signingOrder}
          onClose={() => setSigningOrder(null)}
          documentType="OS"
          documentNumber={signingOrder.order_number}
          clientName={signingOrder.client_name || 'Cliente'}
          signeeType="client"
          initialSignature={signingOrder.client_signature}
          onConfirm={async (sigData) => {
            await api.saveWorkOrderSignature(signingOrder.id, {
              client_signature: sigData,
              client_signed_at: new Date().toISOString()
            });
            await loadOrders();
            setSigningOrder(null);
          }}
        />
      )}

      {/* Standalone Signature Trainer Modal */}
      {isTrainerOpen && (
        <SignatureModal
          isOpen={isTrainerOpen}
          onClose={() => setIsTrainerOpen(false)}
          documentType="OS"
          documentNumber="Treinamento"
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
