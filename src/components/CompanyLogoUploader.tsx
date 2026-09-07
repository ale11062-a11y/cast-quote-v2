import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Cloud,
  FileCheck
} from 'lucide-react';

interface CompanyLogoUploaderProps {
  value: string;
  storagePath?: string;
  onChange: (url: string, storagePath?: string) => void;
  onFileSelect?: (file: File | null) => void;
  companyName?: string;
  companyId?: string;
  disabled?: boolean;
}

export const CompanyLogoUploader: React.FC<CompanyLogoUploaderProps> = ({
  value,
  storagePath,
  onChange,
  onFileSelect,
  companyName,
  companyId,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedFileSize, setSelectedFileSize] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG ou WebP).');
      return;
    }

    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 10MB.');
      return;
    }

    setError(null);
    setSelectedFileName(file.name);
    setSelectedFileSize(
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.round(file.size / 1024)} KB`
    );

    // Create local object preview
    const reader = new FileReader();
    reader.onload = () => {
      const previewDataUrl = reader.result as string;
      onChange(previewDataUrl, '');
      if (onFileSelect) {
        onFileSelect(file);
      }
    };
    reader.onerror = () => {
      setError('Erro ao ler a imagem do dispositivo.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
    setSelectedFileName('');
    setSelectedFileSize('');
    if (onFileSelect) {
      onFileSelect(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isFirebaseStorage =
    value && (value.includes('firebasestorage.googleapis.com') || value.includes('storage.googleapis.com'));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
          <span>Arquivo de Logomarca</span>
        </label>

        {value && (
          <div className="flex items-center gap-2">
            {isFirebaseStorage ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <Cloud className="w-3 h-3 text-emerald-600" />
                Firebase Storage
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <FileCheck className="w-3 h-3 text-amber-600" />
                Prévia Local Selecionada
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
        id="company-logo-device-file"
      />

      {value ? (
        /* Preview Card */
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden flex-none shadow-xs">
              <img
                src={value}
                alt={companyName || 'Logomarca da empresa'}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-extrabold text-slate-900 truncate">
                  {selectedFileName || (isFirebaseStorage ? 'Logomarca Oficial no Firebase' : 'Nova Imagem Selecionada')}
                </p>
                {selectedFileSize && (
                  <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-200/70 px-1.5 py-0.2 rounded">
                    {selectedFileSize}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {isFirebaseStorage
                  ? 'Armazenada no bucket Google Firebase Storage e vinculada ao Firestore'
                  : 'Pronta para upload no Firebase Storage'}
              </p>

              {storagePath && (
                <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  Ref: {storagePath}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center flex-none">
            {isFirebaseStorage && (
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center gap-1 transition shadow-2xs"
                title="Abrir URL do Firebase Storage em nova aba"
              >
                <ExternalLink className="w-3 h-3 text-slate-500" />
                <span className="hidden md:inline">Ver URL</span>
              </a>
            )}

            <button
              type="button"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center gap-1 transition shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              <span>Trocar</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={handleRemove}
              className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
              title="Remover imagem"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Drag & Drop / Device Upload Area */
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition ${
            disabled
              ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
              : isDragging
              ? 'border-blue-600 bg-blue-50/60 shadow-xs'
              : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/60'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <Upload className="w-5 h-5" />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800">
                Arraste e solte sua logomarca aqui, ou{' '}
                <span className="text-blue-600 underline underline-offset-2">procure no dispositivo</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Formatos suportados: PNG, JPG, JPEG, SVG ou WebP (Máximo 10MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-red-600 text-xs p-2 bg-red-50 rounded-xl border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 flex-none" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
