import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Camera,
  DollarSign,
  Calendar,
  User,
  Wrench,
  FileText,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Quote, Client, Technician, ItemRow, PhotoRecord } from '../types';
import { VerticalCameraModal } from './VerticalCameraModal';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  quoteToEdit?: Quote | null;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  quoteToEdit
}) => {
  const { user, activeCompany } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Form State
  const [clientId, setClientId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDate, setValidityDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<'Rascunho' | 'Enviado' | 'Aprovado' | 'Rejeitado' | 'Cancelado'>('Rascunho');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Items State
  const [items, setItems] = useState<ItemRow[]>([
    {
      item_type: 'servico',
      description: 'Mão de obra e execução técnica especializada',
      quantity: 1,
      unit: 'UN',
      unit_price: 1500,
      total_price: 1500
    }
  ]);

  // Financials
  const [discount, setDiscount] = useState<number>(0);
  const [addition, setAddition] = useState<number>(0);

  // Photos
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);

  // Load auxiliary data
  useEffect(() => {
    if (isOpen) {
      loadAuxiliaryData();
      if (quoteToEdit) {
        initEditState(quoteToEdit);
      } else {
        resetForm();
      }
    }
  }, [isOpen, quoteToEdit]);

  const loadAuxiliaryData = async () => {
    try {
      const [cList, tList] = await Promise.all([
        api.getClients(activeCompany?.id, user?.role),
        api.getTechnicians(activeCompany?.id, user?.role)
      ]);
      setClients(cList);
      setTechnicians(tList);
      if (!quoteToEdit && cList.length > 0) {
        setClientId(cList[0].id);
      }
      if (!quoteToEdit && tList.length > 0) {
        setTechnicianId(tList[0].id);
      }
    } catch (err) {
      console.error('Failed to load clients/technicians:', err);
    }
  };

  const initEditState = async (q: Quote) => {
    try {
      // Fetch fresh full record with items and photos
      const full = await api.getQuote(q.id);
      setClientId(full.client_id || '');
      setTechnicianId(full.technician_id || '');
      setDate(full.date || '');
      setValidityDate(full.validity_date || '');
      setStatus(full.status as any);
      setDescription(full.description || '');
      setAddress(full.address || '');
      setNotes(full.notes || '');
      setDiscount(full.discount || 0);
      setAddition(full.addition || 0);

      if (full.items && full.items.length > 0) {
        setItems(full.items);
      }
      if (full.photos && full.photos.length > 0) {
        setPhotos(full.photos);
      }
    } catch (e) {
      console.error('Error fetching quote details:', e);
    }
  };

  const resetForm = () => {
    setClientId(clients[0]?.id || '');
    setTechnicianId(technicians[0]?.id || '');
    setDate(new Date().toISOString().split('T')[0]);
    setValidityDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setStatus('Rascunho');
    setDescription('');
    setAddress('');
    setNotes('Garantia de 12 meses nos equipamentos e 90 dias nos serviços.');
    setDiscount(0);
    setAddition(0);
    setItems([
      {
        item_type: 'servico',
        description: 'Mão de obra e execução técnica especializada',
        quantity: 1,
        unit: 'UN',
        unit_price: 1200,
        total_price: 1200
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
      alert('O orçamento deve ter pelo menos um item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Computed Totals
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
        validity_date: validityDate,
        status,
        description,
        address,
        subtotal,
        discount: Number(discount) || 0,
        addition: Number(addition) || 0,
        total: finalTotal,
        notes,
        items,
        photos
      };

      if (quoteToEdit) {
        await api.updateQuote(quoteToEdit.id, payload);
      } else {
        await api.createQuote(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      alert('Erro ao salvar orçamento: ' + err.message);
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
              <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {quoteToEdit ? `Editar Orçamento #${quoteToEdit.quote_number}` : 'Novo Orçamento'}
                </h2>
                <p className="text-xs text-slate-400">
                  {activeCompany?.name} • Edição completa com fotos verticais e cálculo dinâmico
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

          {/* Form Body */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Step 1: Base Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cliente *</label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Técnico Responsável</label>
                <select
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600"
                >
                  <option value="">Selecione um técnico</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.role_title || 'Técnico'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data Emissão *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Validade Proposta</label>
                <input
                  type="date"
                  value={validityDate}
                  onChange={(e) => setValidityDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Escopo / Descrição do Serviço *
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Instalação de CFTV IP com 8 câmeras e configuração de NVR"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600"
              />
            </div>

            {/* Step 2: Items Table with Real-Time Auto Calculation */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                    Itens e Serviços (Cálculo Automático)
                  </h3>
                  <p className="text-[11px] text-slate-500">Adicione materiais e mão de obra</p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
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
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
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
                            placeholder="Descrição detalhada do item ou serviço..."
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
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
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                          />
                        </td>

                        <td className="py-2 px-2 align-middle">
                          <input
                            type="text"
                            value={item.unit || 'UN'}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 text-center uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
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
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
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
                              title="Remover linha"
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
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          {item.item_type === 'servico' ? 'Serviço' : 'Material'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-medium">Subtotal:</span>
                        <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
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
                          className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
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
                          placeholder="Descreva detalhadamente o que está sendo orçado..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition resize-none"
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
                            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 font-semibold text-center focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
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
                            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 py-2 text-sm text-slate-800 font-semibold text-center uppercase focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
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
                            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 font-semibold text-right focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
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
                    Condições Comerciais / Observações
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Garantia, formas de pagamento, prazos de entrega..."
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800"
                  />
                </div>

                <div className="w-full sm:w-72 bg-white rounded-xl border border-slate-200 p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal dos Itens:</span>
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
                    <span className="font-bold text-slate-900 text-sm">Valor Final:</span>
                    <span className="font-extrabold text-blue-600 text-base">{formatBrl(finalTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Vertical Photos Section */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    Fotos do Orçamento ({photos.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Regra mandatória: Apenas fotos VERTICAIS são aceitas e diagramadas no PDF
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
                  Nenhuma foto anexada. Fotos adicionadas aparecerão no PDF diagramadas em até 5 por linha em formato vertical.
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
                          alt={photo.caption || `Foto #${pIdx + 1}`}
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
                        className="mt-1 w-full text-[10px] text-slate-700 border-0 border-b border-slate-200 px-1 py-0.5 focus:outline-hidden focus:border-blue-600 bg-transparent"
                      />
                    </div>
                  ))}
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
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {loading ? 'Salvando...' : quoteToEdit ? 'Salvar Alterações' : 'Criar Orçamento'}
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
    </>
  );
};
