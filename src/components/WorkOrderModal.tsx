import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Camera,
  DollarSign,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  PenTool,
  ShieldCheck,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { WorkOrder, Client, Technician, ItemRow, PhotoRecord } from '../types';
import { VerticalCameraModal } from './VerticalCameraModal';
import { SignatureModal } from './SignatureModal';

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  orderToEdit?: WorkOrder | null;
}

export const WorkOrderModal: React.FC<WorkOrderModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  orderToEdit
}) => {
  const { user, activeCompany } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Signature States
  const [clientSignature, setClientSignature] = useState<string | undefined>(undefined);
  const [clientSignedAt, setClientSignedAt] = useState<string | undefined>(undefined);
  const [technicianSignature, setTechnicianSignature] = useState<string | undefined>(undefined);
  const [technicianSignedAt, setTechnicianSignedAt] = useState<string | undefined>(undefined);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [activeSignee, setActiveSignee] = useState<'client' | 'technician'>('client');

  // Form State
  const [clientId, setClientId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Aberta' | 'Em Andamento' | 'Concluída' | 'Cancelada'>('Aberta');
  const [serviceDescription, setServiceDescription] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Items State
  const [items, setItems] = useState<ItemRow[]>([
    {
      item_type: 'servico',
      description: 'Execução de serviços técnicos especializados em campo',
      quantity: 1,
      unit: 'UN',
      unit_price: 1800,
      total_price: 1800
    }
  ]);

  // Financials
  const [discount, setDiscount] = useState<number>(0);
  const [addition, setAddition] = useState<number>(0);

  // Photos
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadAuxiliaryData();
      if (orderToEdit) {
        initEditState(orderToEdit);
      } else {
        resetForm();
      }
    }
  }, [isOpen, orderToEdit]);

  const loadAuxiliaryData = async () => {
    try {
      const [cList, tList] = await Promise.all([
        api.getClients(activeCompany?.id, user?.role),
        api.getTechnicians(activeCompany?.id, user?.role)
      ]);
      setClients(cList);
      setTechnicians(tList);
      if (!orderToEdit && cList.length > 0) {
        setClientId(cList[0].id);
      }
      if (!orderToEdit && tList.length > 0) {
        setTechnicianId(tList[0].id);
      }
    } catch (err) {
      console.error('Failed to load auxiliary data:', err);
    }
  };

  const initEditState = async (o: WorkOrder) => {
    try {
      const full = await api.getWorkOrder(o.id);
      setClientId(full.client_id || '');
      setTechnicianId(full.technician_id || '');
      setDate(full.date || '');
      setStatus(full.status as any);
      setServiceDescription(full.service_description || '');
      setAddress(full.address || '');
      setNotes(full.notes || '');
      setDiscount(full.discount || 0);
      setAddition(full.addition || 0);
      setClientSignature(full.client_signature || undefined);
      setClientSignedAt(full.client_signed_at || undefined);
      setTechnicianSignature(full.technician_signature || undefined);
      setTechnicianSignedAt(full.technician_signed_at || undefined);

      if (full.items && full.items.length > 0) {
        setItems(full.items);
      }
      if (full.photos && full.photos.length > 0) {
        setPhotos(full.photos);
      }
    } catch (e) {
      console.error('Error fetching OS details:', e);
    }
  };

  const resetForm = () => {
    setClientId(clients[0]?.id || '');
    setTechnicianId(technicians[0]?.id || '');
    setDate(new Date().toISOString().split('T')[0]);
    setStatus('Aberta');
    setServiceDescription('');
    setAddress('');
    setNotes('Execução realizada de acordo com as normas técnicas de segurança.');
    setDiscount(0);
    setAddition(0);
    setClientSignature(undefined);
    setClientSignedAt(undefined);
    setTechnicianSignature(undefined);
    setTechnicianSignedAt(undefined);
    setItems([
      {
        item_type: 'servico',
        description: 'Execução de serviços técnicos especializados em campo',
        quantity: 1,
        unit: 'UN',
        unit_price: 1800,
        total_price: 1800
      }
    ]);
    setPhotos([]);
  };

  // Dynamic Item Calculations
  const handleItemChange = (index: number, field: keyof ItemRow, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    item.total_price = Number((qty * price).toFixed(2));

    updated[index] = item;
    setItems(updated);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        item_type: 'material',
        description: '',
        quantity: 1,
        unit: 'UN',
        unit_price: 0,
        total_price: 0
      }
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      alert('A Ordem de Serviço deve ter pelo menos um item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((acc, it) => acc + (Number(it.total_price) || 0), 0);
  const finalTotal = Math.max(0, subtotal - Number(discount || 0) + Number(addition || 0));

  const formatBrl = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert('Por favor, selecione um cliente.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        company_id: activeCompany?.id,
        client_id: clientId,
        technician_id: technicianId || null,
        created_by: user?.id,
        date,
        status,
        service_description: serviceDescription,
        address,
        subtotal,
        discount: Number(discount) || 0,
        addition: Number(addition) || 0,
        total: finalTotal,
        notes,
        client_signature: clientSignature || null,
        client_signed_at: clientSignedAt || (clientSignature ? new Date().toISOString() : null),
        technician_signature: technicianSignature || null,
        technician_signed_at: technicianSignedAt || (technicianSignature ? new Date().toISOString() : null),
        items,
        photos
      };

      if (orderToEdit) {
        await api.updateWorkOrder(orderToEdit.id, payload);
      } else {
        await api.createWorkOrder(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      alert('Erro ao salvar OS: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden my-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {orderToEdit ? `Editar OS #${orderToEdit.order_number}` : 'Nova Ordem de Serviço'}
                </h2>
                <p className="text-xs text-slate-400">
                  {activeCompany?.name} • Gestão de campo com fotos estritamente verticais
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cliente *</label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-600"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Técnico Designado</label>
                <select
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-600"
                >
                  <option value="">Selecione o técnico</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.role_title || 'Técnico'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data Execução *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição dos Serviços Executados *
                </label>
                <input
                  type="text"
                  required
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  placeholder="Ex: Instalação, testes e entrega técnica do sistema elétrico"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Endereço de Atendimento</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, Número, Bairro, Cidade"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Items Table with Real-Time Calculations */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Itens e Mão de Obra da OS (Cálculo Automático)
                  </h3>
                  <p className="text-[11px] text-slate-500">Materiais aplicados e horas de serviço</p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Item</span>
                </button>
              </div>

              {/* Desktop / Tablet Horizontal: Linha única por item com campos amplos e boa visualização */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-2 w-36">Tipo</th>
                      <th className="py-2.5 px-2 min-w-[220px]">Descrição dos Itens & Serviços</th>
                      <th className="py-2.5 px-2 w-24">Qtd</th>
                      <th className="py-2.5 px-2 w-20">Un</th>
                      <th className="py-2.5 px-2 w-32">Valor Unit. (R$)</th>
                      <th className="py-2.5 px-2 w-32 text-right">Total</th>
                      <th className="py-2.5 px-1 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-white/90 transition group">
                        <td className="py-2 px-2 align-middle">
                          <select
                            value={item.item_type}
                            onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                          >
                            <option value="servico">Serviço</option>
                            <option value="material">Material</option>
                          </select>
                        </td>

                        <td className="py-2 px-2 align-middle">
                          <input
                            type="text"
                            required
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Descrição do material ou serviço..."
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                          />
                        </td>

                        <td className="py-2 px-2 align-middle">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 text-center focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                          />
                        </td>

                        <td className="py-2 px-2 align-middle">
                          <input
                            type="text"
                            value={item.unit || 'UN'}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 text-center uppercase focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                          />
                        </td>

                        <td className="py-2 px-2 align-middle">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 text-right focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                          />
                        </td>

                        <td className="py-2 px-2 align-middle font-bold text-slate-900 text-right text-sm whitespace-nowrap">
                          {formatBrl(item.total_price)}
                        </td>

                        <td className="py-2 px-1 align-middle text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              title="Remover item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Celular / Modo Vertical: Quebra de linha responsiva com campos confortáveis e rótulos claros */}
              <div className="block md:hidden space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3"
                  >
                    {/* Cabeçalho do Card */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          {item.item_type === 'servico' ? 'Serviço' : 'Material'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-medium">Subtotal:</span>
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          {formatBrl(item.total_price)}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remover item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Campos com quebra de linha dinâmica (um após o outro) */}
                    <div className="flex flex-wrap gap-2.5">
                      {/* Tipo */}
                      <div className="w-full sm:w-auto min-w-[130px] flex-1">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Tipo de Item
                        </label>
                        <select
                          value={item.item_type}
                          onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                          className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm font-medium text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                        >
                          <option value="servico">🛠️ Serviço</option>
                          <option value="material">📦 Material</option>
                        </select>
                      </div>

                      {/* Descrição - Ocupa linha inteira para visualização ampla do que foi digitado */}
                      <div className="w-full">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Descrição do Item / Serviço
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Descreva detalhadamente o material aplicado ou serviço executado..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none"
                        />
                      </div>

                      {/* Quantidade, Unidade e Preço Unitário que se adaptam e quebram linha se não couberem */}
                      <div className="w-full flex flex-wrap items-end gap-2.5">
                        <div className="flex-1 min-w-[80px]">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Qtd
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 font-semibold text-center focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                          />
                        </div>

                        <div className="w-24 min-w-[75px]">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Unidade
                          </label>
                          <input
                            type="text"
                            value={item.unit || 'UN'}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            placeholder="UN"
                            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 py-2 text-sm text-slate-800 font-semibold text-center uppercase focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                          />
                        </div>

                        <div className="flex-1 min-w-[130px]">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Valor Unitário (R$)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 font-semibold text-right focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Totals Calculations Bar */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-end justify-between gap-4">
                <div className="w-full sm:w-1/2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Relatório Técnico / Observações da Execução
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Detalhes dos testes realizados, pendências ou recomendações..."
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800"
                  />
                </div>

                <div className="w-full sm:w-72 bg-white rounded-xl border border-slate-200 p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal da OS:</span>
                    <span className="font-semibold">{formatBrl(subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Desconto (-):</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                      className="w-24 rounded-lg border border-slate-200 p-1 text-xs text-right font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Acréscimo (+):</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={addition}
                      onChange={(e) => setAddition(Number(e.target.value) || 0)}
                      className="w-24 rounded-lg border border-slate-200 p-1 text-xs text-right font-medium"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-sm">Valor Total OS:</span>
                    <span className="font-extrabold text-emerald-700 text-base">{formatBrl(finalTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vertical Photos Section */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    Registro Fotográfico da OS ({photos.length} Fotos)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Regra mandatória: Apenas fotos VERTICAIS. No PDF serão renderizadas com tamanho fixo (até 5 por linha).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capturar Foto Vertical</span>
                </button>
              </div>

              {photos.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-300 rounded-xl bg-white text-slate-400 text-xs">
                  Nenhuma foto anexada. Use a câmera vertical para registrar o antes/depois da execução.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {photos.map((photo, pIdx) => (
                    <div
                      key={pIdx}
                      className="relative rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs group flex flex-col"
                    >
                      <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-slate-100">
                        <img
                          src={photo.url}
                          alt={photo.caption || `Foto OS #${pIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(pIdx)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-md transition"
                          title="Remover foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-emerald-600/90 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full">
                          VERTICAL
                        </div>
                      </div>
                      <input
                        type="text"
                        value={photo.caption || ''}
                        onChange={(e) => {
                          const updated = [...photos];
                          updated[pIdx].caption = e.target.value;
                          setPhotos(updated);
                        }}
                        placeholder="Legenda da foto..."
                        className="mt-1 w-full text-[10px] text-slate-700 border-0 border-b border-slate-200 px-1 py-0.5 focus:outline-hidden focus:border-emerald-600 bg-transparent"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assinatura Digital do Cliente & Aceite Section */}
            <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/40 to-slate-50/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-blue-600" />
                    Assinatura Digital do Cliente & Aceite no Local
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Coleta instantânea na tela do celular/tablet com tecnologia de suavização de curvas Bézier (120Hz).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSignee('client');
                      setIsSignatureModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition active:scale-95"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>{clientSignature ? 'Reassinar / Alterar' : 'Coletar Assinatura na Tela'}</span>
                  </button>
                </div>
              </div>

              {/* Signature Card Status */}
              {clientSignature ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 bg-white rounded-xl border border-blue-200 shadow-2xs">
                  <div className="h-20 w-48 sm:w-56 bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex items-center justify-center shrink-0">
                    <img
                      src={clientSignature}
                      alt="Assinatura do Cliente"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Assinatura Coletada e Autenticada</span>
                    </div>
                    <p className="text-xs font-medium text-slate-800">
                      Cliente: {clients.find((c) => c.id === clientId)?.name || 'Cliente'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {clientSignedAt
                        ? `Registrado em: ${new Date(clientSignedAt).toLocaleString('pt-BR')}`
                        : 'Pronta para gravação'}
                    </p>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSignee('client');
                        setIsSignatureModalOpen(true);
                      }}
                      className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClientSignature(undefined);
                        setClientSignedAt(undefined);
                      }}
                      className="px-3 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-blue-200 bg-white/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                      <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Nenhuma assinatura coletada ainda</p>
                      <p className="text-[11px] text-slate-500">
                        O cliente assina diretamente com o dedo na tela do celular ou tablet.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSignee('client');
                      setIsSignatureModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs whitespace-nowrap"
                  >
                    Coletar Agora
                  </button>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {loading ? 'Salvando...' : orderToEdit ? 'Salvar Alterações' : 'Criar Ordem de Serviço'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Vertical Camera Modal */}
      <VerticalCameraModal
        companyId={activeCompany?.id || 'comp-1'}
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoAdded={(newPhoto) => {
          setPhotos((prev) => [...prev, newPhoto]);
        }}
      />

      {/* Fluid Digital Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        documentType="OS"
        documentNumber={orderToEdit?.order_number || 'Nova'}
        clientName={clients.find((c) => c.id === clientId)?.name || 'Cliente'}
        signeeType={activeSignee}
        initialSignature={activeSignee === 'client' ? clientSignature : technicianSignature}
        onConfirm={(sigData) => {
          if (activeSignee === 'client') {
            setClientSignature(sigData);
            setClientSignedAt(new Date().toISOString());
          } else {
            setTechnicianSignature(sigData);
            setTechnicianSignedAt(new Date().toISOString());
          }
        }}
      />
    </>
  );
};
