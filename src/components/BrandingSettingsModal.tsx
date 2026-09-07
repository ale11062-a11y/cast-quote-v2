import React, { useState, useEffect } from 'react';
import {
  Palette,
  Check,
  RotateCcw,
  Sparkles,
  Building2,
  FileText,
  Wrench,
  Eye,
  Sliders,
  CheckCircle2,
  Info,
  Image as ImageIcon,
  ShieldCheck,
  Upload,
  Cloud,
  Database,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Loader2,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BRAND_COLOR_PRESETS, getContrastTextColor } from '../utils/brandTheme';
import { CompanyLogoUploader } from './CompanyLogoUploader';
import { firebaseService } from '../services/firebase';

interface BrandingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrandingSettingsModal: React.FC<BrandingSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { activeCompany, brandColor, updateCompanyBranding, user, isAdmin, isManager, isDev } = useAuth();
  const [selectedColor, setSelectedColor] = useState<string>(brandColor || '#2563eb');
  const [logoUrl, setLogoUrl] = useState<string>(activeCompany?.logo_url || '');
  const [storagePath, setStoragePath] = useState<string>(activeCompany?.logo_storage_path || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Form states
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading_storage' | 'saving_firestore' | 'success'>('idle');
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if current user has administrative permissions for company settings
  const canEditCompany = isAdmin || isManager || isDev;

  useEffect(() => {
    if (isOpen) {
      setSelectedColor(activeCompany?.primary_color || brandColor || '#2563eb');
      setLogoUrl(activeCompany?.logo_url || '');
      setStoragePath(activeCompany?.logo_storage_path || '');
      setSelectedFile(null);
      setUploadStep('idle');
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [
    isOpen,
    activeCompany?.id,
    activeCompany?.primary_color,
    activeCompany?.logo_url,
    activeCompany?.logo_storage_path,
    brandColor
  ]);

  if (!isOpen) return null;

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
  };

  const handleResetDefault = async () => {
    const defaultColor = '#2563eb';
    setSelectedColor(defaultColor);
    setSuccessMessage('Cor restaurada para o padrão clássico CAST! Clique em Salvar para confirmar.');
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  /**
   * Formulário dedicado para upload da logomarca no Firebase Storage
   * e vínculo direto ao documento da empresa no Firestore.
   */
  const handleUploadLogoFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditCompany) {
      setErrorMessage('Você não possui permissão de administrador para alterar a logomarca da empresa.');
      return;
    }

    if (!activeCompany?.id) {
      setErrorMessage('Nenhuma empresa ativa selecionada no sistema.');
      return;
    }

    if (!selectedFile && !logoUrl) {
      setErrorMessage('Por favor, selecione uma imagem para fazer o upload.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let finalDownloadUrl = logoUrl;
      let finalStoragePath = storagePath;

      // 1. Upload to Firebase Storage if a new file is chosen
      if (selectedFile) {
        setUploadStep('uploading_storage');
        const uploadResult = await firebaseService.media.uploadCompanyLogo(
          activeCompany.id,
          selectedFile,
          `logo_${Date.now()}`
        );
        finalDownloadUrl = uploadResult.downloadUrl;
        finalStoragePath = uploadResult.storagePath;
      }

      // 2. Link directly to company document in Cloud Firestore
      setUploadStep('saving_firestore');
      await firebaseService.companies.updateCompanyLogo(
        activeCompany.id,
        finalDownloadUrl,
        finalStoragePath
      );

      // 3. Update active company state & theme in AuthContext
      await updateCompanyBranding(selectedColor, finalDownloadUrl, finalStoragePath);

      setLogoUrl(finalDownloadUrl);
      setStoragePath(finalStoragePath);
      setSelectedFile(null);
      setUploadStep('success');
      setSuccessMessage('Logomarca salva com sucesso no Firebase Storage e vinculada ao documento da empresa no Firestore!');

      setTimeout(() => {
        setUploadStep('idle');
      }, 3500);
    } catch (err: any) {
      console.error('Erro no upload ou salvamento no Firestore:', err);
      setErrorMessage('Falha ao processar logomarca no Firebase: ' + (err.message || 'Erro desconhecido'));
      setUploadStep('idle');
    }
  };

  /**
   * Remove a logomarca da empresa no Firestore
   */
  const handleRemoveLogo = async () => {
    if (!canEditCompany || !activeCompany?.id) return;
    if (!confirm('Deseja realmente remover a logomarca oficial da empresa?')) return;

    try {
      setUploadStep('saving_firestore');
      await firebaseService.companies.updateCompanyLogo(activeCompany.id, '', '');
      await updateCompanyBranding(selectedColor, '', '');
      setLogoUrl('');
      setStoragePath('');
      setSelectedFile(null);
      setUploadStep('idle');
      setSuccessMessage('Logomarca removida do documento da empresa no Firestore.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage('Erro ao remover logomarca: ' + err.message);
      setUploadStep('idle');
    }
  };

  /**
   * Salva todas as alterações gerais (Cor + Logo)
   */
  const handleSaveGeneral = async () => {
    if (!canEditCompany) {
      setErrorMessage('Apenas administradores podem salvar alterações da empresa.');
      return;
    }

    setSavingGeneral(true);
    setErrorMessage(null);
    try {
      let finalDownloadUrl = logoUrl;
      let finalStoragePath = storagePath;

      if (selectedFile && activeCompany?.id) {
        const uploadResult = await firebaseService.media.uploadCompanyLogo(activeCompany.id, selectedFile);
        finalDownloadUrl = uploadResult.downloadUrl;
        finalStoragePath = uploadResult.storagePath;
      }

      if (activeCompany?.id) {
        await firebaseService.companies.updateBranding(
          activeCompany.id,
          selectedColor,
          finalDownloadUrl,
          finalStoragePath
        );
      }

      await updateCompanyBranding(selectedColor, finalDownloadUrl, finalStoragePath);
      setSuccessMessage('Configurações e identidade visual atualizadas no Firestore com sucesso!');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorMessage('Erro ao salvar customização: ' + err.message);
    } finally {
      setSavingGeneral(false);
    }
  };

  const textColor = getContrastTextColor(selectedColor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm transition-colors flex-none"
              style={{ backgroundColor: selectedColor }}
            >
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  Configurações da Empresa & Identidade Visual
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Painel Administrativo
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload de logomarca no <strong className="text-slate-700">Firebase Storage</strong> e sincronização direta no documento da empresa no <strong className="text-slate-700">Cloud Firestore</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Notification Banners */}
          {successMessage && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center gap-2.5 text-emerald-800 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-none" />
              <span className="font-bold text-xs">{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 flex items-center gap-2.5 text-red-800 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-none" />
              <span className="font-bold text-xs">{errorMessage}</span>
            </div>
          )}

          {/* Active Company Metadata Card */}
          <div className="rounded-2xl bg-slate-50/80 border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 font-extrabold text-sm shadow-2xs">
                {activeCompany?.name?.charAt(0).toUpperCase() || 'E'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-slate-900 text-xs">
                    {activeCompany?.name || 'CAST Quote Sistemas'}
                  </h4>
                  <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Empresa Ativa
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                  {activeCompany?.cnpj && <span>CNPJ: {activeCompany.cnpj}</span>}
                  <span>•</span>
                  <span>ID Firestore: <code className="font-mono text-[10px] bg-slate-200/80 px-1 rounded">{activeCompany?.id || 'master'}</code></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] self-end sm:self-center">
              <span className="text-slate-500 font-medium">Perfil:</span>
              <span className="px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-200 text-[10px]">
                {user?.role || 'ADM'}
              </span>
              {canEditCompany ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[10px]">
                  <ShieldCheck className="w-3.5 h-3.5" /> Administrador Autorizado
                </span>
              ) : (
                <span className="text-amber-700 font-semibold flex items-center gap-1 text-[10px]">
                  <AlertTriangle className="w-3.5 h-3.5" /> Modo Visualização
                </span>
              )}
            </div>
          </div>

          {!canEditCompany && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-amber-800 flex items-start gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-none mt-0.5" />
              <div>
                <p className="font-bold">Acesso Administrativo Restrito</p>
                <p className="text-[11px] mt-0.5">
                  Apenas usuários com perfil <strong>Administrador (ADM)</strong> ou <strong>Gerente (GERENTE)</strong> têm autorização para salvar e atualizar a logomarca e cores corporativas da empresa no Firestore.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FORMULÁRIO DE UPLOAD DE LOGOMARCA NO FIREBASE STORAGE & FIRESTORE */}
          {/* ========================================================================= */}
          <form
            id="company-logo-upload-form"
            onSubmit={handleUploadLogoFormSubmit}
            className="rounded-2xl border border-slate-200 p-5 bg-white space-y-4 shadow-2xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  <span>Upload da Logomarca Oficial da Empresa</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Faça o upload do logotipo oficial da empresa para salvar no Google Cloud Firebase Storage e vincular ao documento corporativo no Cloud Firestore
                </p>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <Database className="w-3 h-3 text-blue-600" />
                  Firestore Sync
                </span>
              </div>
            </div>

            {/* Storage Info Details Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px]">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-500 flex-none" />
                <div className="min-w-0">
                  <span className="block font-bold text-slate-700">Firebase Storage Bucket:</span>
                  <span className="block font-mono text-[10px] text-slate-500 truncate">
                    mega-alpha-djkjx.firebasestorage.app
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-500 flex-none" />
                <div className="min-w-0">
                  <span className="block font-bold text-slate-700">Documento no Firestore:</span>
                  <span className="block font-mono text-[10px] text-slate-500 truncate">
                    companies/{activeCompany?.id || 'empresa_ativa'}
                  </span>
                </div>
              </div>
            </div>

            {/* Upload Component */}
            <CompanyLogoUploader
              value={logoUrl}
              storagePath={storagePath}
              companyName={activeCompany?.name}
              companyId={activeCompany?.id}
              disabled={!canEditCompany || uploadStep !== 'idle'}
              onFileSelect={(file) => setSelectedFile(file)}
              onChange={(newUrl, newStoragePath) => {
                setLogoUrl(newUrl);
                if (newStoragePath !== undefined) {
                  setStoragePath(newStoragePath);
                }
              }}
            />

            {/* Form Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-500">
                {selectedFile ? (
                  <span className="text-blue-700 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Arquivo pronto para upload: <strong>{selectedFile.name}</strong>
                  </span>
                ) : logoUrl ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Logomarca vinculada à empresa no Firestore
                  </span>
                ) : (
                  <span>Nenhuma imagem selecionada ainda</span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {logoUrl && canEditCompany && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={uploadStep !== 'idle'}
                    className="px-3 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
                    title="Desvincular e remover logomarca do documento da empresa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover Logo</span>
                  </button>
                )}

                <button
                  type="submit"
                  id="btn-submit-logo-firebase"
                  disabled={!canEditCompany || uploadStep !== 'idle' || (!selectedFile && !logoUrl)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {uploadStep === 'uploading_storage' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>1/2 Enviando para Firebase Storage...</span>
                    </>
                  ) : uploadStep === 'saving_firestore' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>2/2 Vinculando no Cloud Firestore...</span>
                    </>
                  ) : uploadStep === 'success' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvo com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Salvar Logomarca no Firebase Storage & Firestore</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* ========================================================================= */}
          {/* SEÇÃO 2: SELETOR DE COR PRIMÁRIA & PALETA INSTITUCIONAL */}
          {/* ========================================================================= */}
          <div className="rounded-2xl border border-slate-200 p-5 bg-white space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-slate-700" />
                  <span>Cor Primária e Identidade da Marca</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Personalize a cor oficial dos botões, destaques, orçamentos e relatórios PDF gerados pela empresa
                </p>
              </div>

              {/* Custom Color Input */}
              <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 pl-1">Cor Primária:</span>
                <div className="relative flex items-center">
                  <input
                    type="color"
                    id="brand-color-custom-input"
                    value={selectedColor}
                    disabled={!canEditCompany}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0 overflow-hidden"
                    title="Escolha qualquer cor personalizada"
                  />
                </div>
                <input
                  type="text"
                  value={selectedColor.toUpperCase()}
                  disabled={!canEditCompany}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('#') && val.length <= 7) {
                      setSelectedColor(val);
                      if (val.length === 7) handleColorChange(val);
                    }
                  }}
                  className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-center font-mono text-[11px] font-bold uppercase text-slate-800 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
              {BRAND_COLOR_PRESETS.map((preset) => {
                const isSelected = selectedColor.toLowerCase() === preset.hex.toLowerCase();
                const presetContrast = getContrastTextColor(preset.hex);

                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={!canEditCompany}
                    onClick={() => handleColorChange(preset.hex)}
                    className={`rounded-xl p-2.5 text-left border transition relative flex flex-col justify-between group ${
                      isSelected
                        ? 'border-slate-900 ring-2 ring-slate-900/20 bg-slate-50/80 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    } ${!canEditCompany ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <div
                        className="w-7 h-7 rounded-lg shadow-xs flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{ backgroundColor: preset.hex }}
                      >
                        {isSelected && <Check className="w-4 h-4" style={{ color: presetContrast }} />}
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 font-semibold">
                        {preset.hex}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-bold text-slate-800 truncate">
                        {preset.name}
                      </span>
                      <span className="block text-[9px] text-slate-500 truncate">
                        {preset.category}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SEÇÃO 3: PRÉ-VISUALIZAÇÃO EM TEMPO REAL DO PDF E SISTEMA */}
          {/* ========================================================================= */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-700" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Pré-visualização em Tempo Real (Documentos e PDFs)
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shadow-2xs">
                Simulação A4
              </span>
            </div>

            {/* Cabeçalho do PDF Simulado com a Logo */}
            <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Cabeçalho Oficial do Relatório PDF (Orçamentos & Ordens de Serviço)
                </span>
                <span className="text-[10px] font-bold text-slate-400">Padrão A4</span>
              </div>

              <div className="rounded-xl bg-slate-900 p-4 text-white flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-xl bg-white p-1.5 flex items-center justify-center overflow-hidden flex-none shadow-sm">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={activeCompany?.name || 'Logomarca'}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <Building2 className="w-7 h-7 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white tracking-wide">
                      {activeCompany?.name || 'CAST QUOTE SISTEMAS'}
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      {activeCompany?.cnpj ? `CNPJ: ${activeCompany.cnpj} | ` : ''}
                      {activeCompany?.phone ? `Tel: ${activeCompany.phone} | ` : ''}
                      {activeCompany?.email || 'contato@empresa.com'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {activeCompany?.address ? `${activeCompany.address} - ` : ''}
                      {activeCompany?.city || 'Brasil'}
                    </p>
                  </div>
                </div>

                <div
                  className="px-3.5 py-2 rounded-xl text-center shadow-xs flex-none"
                  style={{ backgroundColor: selectedColor }}
                >
                  <span className="block text-[9px] font-bold uppercase text-white tracking-wider">ORÇAMENTO</span>
                  <span className="block text-sm font-extrabold text-white">#0042</span>
                </div>
              </div>
            </div>

            {/* Grid with Navbar and Action Buttons Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preview 1: Header / Navbar mock */}
              <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Barra de Navegação do Sistema
                </span>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs overflow-hidden bg-slate-900 text-white p-0.5"
                      style={{
                        backgroundColor: logoUrl ? '#0f172a' : selectedColor
                      }}
                    >
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt=""
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <FileText className="w-4 h-4" style={{ color: textColor }} />
                      )}
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 text-xs">
                        CAST <span style={{ color: selectedColor }}>QUOTE</span>
                      </span>
                      <span className="block text-[9px] text-slate-500 truncate max-w-[140px]">
                        {activeCompany?.name || 'Sua Empresa'}
                      </span>
                    </div>
                  </div>

                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                    style={{
                      backgroundColor: `${selectedColor}18`,
                      color: selectedColor
                    }}
                  >
                    Ativa
                  </span>
                </div>
              </div>

              {/* Preview 2: Buttons & Propostas */}
              <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Botões de Ação e Propostas
                </span>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 py-2 px-3 rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                      style={{
                        backgroundColor: selectedColor,
                        color: textColor
                      }}
                    >
                      <span>Novo Orçamento</span>
                    </button>

                    <button
                      type="button"
                      className="py-2 px-3 rounded-xl font-bold text-xs border transition"
                      style={{
                        borderColor: selectedColor,
                        color: selectedColor,
                        backgroundColor: `${selectedColor}0A`
                      }}
                    >
                      <span>Visualizar PDF</span>
                    </button>
                  </div>

                  <div
                    className="p-2.5 rounded-xl border flex items-center justify-between"
                    style={{
                      borderColor: `${selectedColor}30`,
                      backgroundColor: `${selectedColor}0D`
                    }}
                  >
                    <div>
                      <span className="text-[10px] font-bold block" style={{ color: selectedColor }}>
                        PROPOSTA Nº #1002
                      </span>
                      <span className="text-xs font-extrabold text-slate-900">Total: R$ 8.450,00</span>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs"
                      style={{ backgroundColor: selectedColor }}
                    >
                      Aprovado
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-3 flex items-start gap-2 text-blue-900">
              <Info className="w-4 h-4 text-blue-600 flex-none mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                A <strong>logomarca</strong> e as <strong>cores primárias</strong> são armazenadas permanentemente no <strong>Firebase Storage</strong> e no <strong>Cloud Firestore</strong>, sendo aplicadas de imediato em toda a interface do sistema e nos arquivos PDF gerados.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefault}
            disabled={!canEditCompany}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition text-xs shadow-2xs disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Restaurar Padrão CAST</span>
          </button>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition text-xs"
            >
              Fechar
            </button>
            <button
              type="button"
              disabled={!canEditCompany || savingGeneral}
              onClick={handleSaveGeneral}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-white font-bold transition text-xs shadow-sm active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: selectedColor }}
            >
              {savingGeneral ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando no Firestore...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" style={{ color: textColor }} />
                  <span style={{ color: textColor }}>Salvar Alterações Globais</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
