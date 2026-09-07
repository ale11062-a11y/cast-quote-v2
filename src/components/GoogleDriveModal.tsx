import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  Folder,
  FolderTree,
  ExternalLink,
  X,
  RefreshCw,
  Copy,
  Check,
  FileText,
  UserCheck,
  LogOut,
  AlertCircle,
  Image as ImageIcon,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Quote, WorkOrder, Company } from '../types';
import { api } from '../services/api';
import { generateDocumentPdf } from '../utils/pdfGenerator';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  uploadDocumentAndAssetsToDrive,
  DriveClientTreeResult,
  DriveUploadedPhoto,
  DocumentSyncProgress,
  sanitizeDriveName,
  auth
} from '../services/googleDriveService';
import { User } from 'firebase/auth';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'ORÇAMENTO' | 'ORDEM DE SERVIÇO';
  data: Quote | WorkOrder | null;
  company?: Company | null;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  type,
  data,
  company
}) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [hasToken, setHasToken] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<DocumentSyncProgress | null>(null);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    tree: DriveClientTreeResult;
    pdfFileId: string;
    pdfLink: string;
    photos: DriveUploadedPhoto[];
    message: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [configuredDriveEmail, setConfiguredDriveEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSyncResult(null);
      setErrorMessage(null);
      setCopied(false);
      setProgress(null);

      // Check configured backend account
      api.getDriveSettings().then((s) => {
        if (s?.account_email) {
          setConfiguredDriveEmail(s.account_email);
        }
      }).catch(() => {});

      // Listen to Firebase Auth state
      const unsubscribe = initAuth(
        (authedUser) => {
          setUser(authedUser);
          setHasToken(true);
        },
        () => {
          setUser(null);
          setHasToken(false);
        }
      );

      // Check current in-memory token
      getAccessToken().then((token) => {
        if (token) {
          setHasToken(true);
          setUser(auth.currentUser);
        }
      });

      return () => unsubscribe();
    }
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const isQuote = type === 'ORÇAMENTO';
  const docNumber = isQuote ? (data as Quote).quote_number : (data as WorkOrder).order_number;
  const docCode = isQuote
    ? `ORC-${String(docNumber).padStart(4, '0')}`
    : `OS-${String(docNumber).padStart(4, '0')}`;
  const compName = sanitizeDriveName(company?.name || (data as any).company?.name || 'CAST_Engenharia');
  const clientName = sanitizeDriveName(data.client_name?.trim() || 'Cliente_Geral');
  const folderCategory = isQuote ? 'Orcamentos' : 'Ordens_de_Servico';
  const photosCount = data.photos?.length || 0;

  const handleGoogleConnect = async () => {
    setAuthenticating(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn(true);
      setUser(result.user);
      setHasToken(true);
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      setErrorMessage(err.message || 'Falha ao autenticar com o Google Drive.');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await logout();
      setUser(null);
      setHasToken(false);
      setSyncResult(null);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const handleSyncToDrive = async () => {
    setLoading(true);
    setErrorMessage(null);
    setProgress({
      stage: 'AUTH',
      message: 'Iniciando autenticação com o Google Drive...',
      current: 0,
      total: 100
    });

    try {
      // 1. If not authenticated yet, prompt sign in
      let currentToken = await getAccessToken();
      if (!currentToken || !user) {
        const authRes = await googleSignIn();
        currentToken = authRes.accessToken;
        setUser(authRes.user);
        setHasToken(true);
      }

      // 2. Generate PDF
      setProgress({
        stage: 'PDF',
        message: 'Gerando documento em alta definição...',
        current: 10,
        total: 100
      });

      const doc = generateDocumentPdf({ type, data, company });
      const pdfBlob = doc.output('blob');

      // 3. Upload Tree, PDF and Individual Photos with Unique Codes
      const result = await uploadDocumentAndAssetsToDrive({
        type,
        data,
        companyName: compName,
        pdfBlob,
        onProgress: (p) => setProgress(p)
      });

      // 4. Log in App Backend Ledger
      await api.syncGoogleDrive({
        company_id: data.company_id,
        document_type: type,
        document_number: docNumber,
        title: `${type} #${docCode} - ${data.client_name}`,
        client_name: clientName,
        folder_path: result.tree.clientFolderPath,
        folder_url: result.tree.clientFolderUrl,
        file_id: result.pdf.fileId,
        file_url: result.pdf.webViewLink,
        photo_count: result.photos.length,
        photos: result.photos
      });

      setSyncResult({
        success: true,
        tree: result.tree,
        pdfFileId: result.pdf.fileId,
        pdfLink: result.pdf.webViewLink || `https://drive.google.com/file/d/${result.pdf.fileId}/view`,
        photos: result.photos,
        message: 'Árvore de arquivos e fotos organizadas com sucesso no Google Drive!'
      });
    } catch (err: any) {
      console.error('Erro na sincronização:', err);
      setErrorMessage(err.message || 'Erro ao sincronizar arquivos e fotos com o Google Drive.');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleCopyFolderLink = () => {
    if (syncResult?.tree.clientFolderUrl) {
      navigator.clipboard.writeText(syncResult.tree.clientFolderUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg my-6 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 flex-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Repositório Google Drive</h3>
              <p className="text-xs text-slate-400">Árvore de arquivos organizada por cliente e categoria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-none" />
              <div className="flex-1">
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* User Auth Status / Connect Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            {user && hasToken ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Google User'}
                      className="w-8 h-8 rounded-full border border-slate-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {user.displayName?.[0] || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{user.displayName || 'Conta Google'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                      {user.email}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  title="Desconectar conta Google"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-center py-2 space-y-2.5">
                {configuredDriveEmail && (
                  <div className="text-left p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 mb-2">
                    <div className="font-bold flex items-center gap-1.5 text-purple-950">
                      <Cloud className="w-3.5 h-3.5 text-purple-600" />
                      <span>Conta Oficial Configurada no Painel DEV</span>
                    </div>
                    <div className="font-mono text-[11px] text-purple-800 mt-0.5">
                      {configuredDriveEmail}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Faça login com esta conta Google abaixo para enviar os arquivos ao repositório oficial da empresa.
                    </div>
                  </div>
                )}
                <div className="text-xs text-slate-700 font-medium">
                  {configuredDriveEmail
                    ? 'Faça login com a conta do Google para gravar neste repositório'
                    : 'Conecte sua conta do Google para habilitar a gravação automática no Drive'}
                </div>
                <button
                  type="button"
                  onClick={handleGoogleConnect}
                  disabled={authenticating}
                  className="gsi-material-button w-full shadow-xs"
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        style={{ display: 'block' }}
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        ></path>
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        ></path>
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        ></path>
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        ></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents">
                      {authenticating ? 'Conectando...' : 'Sign in with Google'}
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Árvore de Diretórios Dinâmica */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900">
              <span className="flex items-center gap-1.5">
                <FolderTree className="w-4 h-4 text-blue-600" />
                Estrutura de Pastas no Google Drive
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px]">
                Organização Automática
              </span>
            </div>

            <div className="bg-slate-900 text-slate-200 rounded-xl p-3 font-mono text-[11px] leading-relaxed border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Folder className="w-3.5 h-3.5" />
                <span>CAST_Quote/</span>
                <span className="text-[10px] text-slate-400 font-normal">(Raiz do Sistema)</span>
              </div>
              <div className="pl-4 flex items-center gap-1.5 text-amber-300 font-semibold">
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <Folder className="w-3.5 h-3.5" />
                <span>{compName}/</span>
                <span className="text-[10px] text-slate-400 font-normal">(Empresa Prestadora)</span>
              </div>
              <div className="pl-8 flex items-center gap-1.5 text-emerald-300 font-semibold">
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <Folder className="w-3.5 h-3.5" />
                <span>{clientName}/</span>
                <span className="text-[10px] text-slate-400 font-normal">(Cliente Atendido)</span>
              </div>
              <div className="pl-12 space-y-1 pt-1 text-slate-300 text-[10px]">
                <div className={`flex items-center gap-1.5 ${isQuote ? 'text-white font-bold' : 'text-slate-400'}`}>
                  <FileText className="w-3 h-3 text-blue-400" />
                  <span>Orcamentos/ {isQuote ? `➔ [${docCode}_${clientName}.pdf]` : ''}</span>
                </div>
                <div className={`flex items-center gap-1.5 ${!isQuote ? 'text-white font-bold' : 'text-slate-400'}`}>
                  <FileText className="w-3 h-3 text-blue-400" />
                  <span>Ordens_de_Servico/ {!isQuote ? `➔ [${docCode}_${clientName}.pdf]` : ''}</span>
                </div>
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <ImageIcon className="w-3 h-3 text-cyan-400" />
                  <span>Fotos/ ➔ {photosCount} foto{photosCount !== 1 ? 's' : ''} com código único [FOTO_{docCode}_XX_ID.jpg]</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-normal">
              Cada cliente possui sua própria pasta isolada, com separadores para documentos em PDF e arquivos individuais das fotos vinculadas, preservando resolução original para consultas e edições futuras.
            </p>
          </div>

          {/* Loading Progress Bar */}
          {loading && (
            <div className="p-3.5 rounded-xl border border-blue-200 bg-white space-y-2 shadow-xs">
              <div className="flex items-center justify-between text-xs text-blue-900 font-semibold">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  {progress?.message || 'Processando envio para o Google Drive...'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: progress?.total ? `${Math.round((progress.current / progress.total) * 100)}%` : '60%'
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* Result Card */}
          {syncResult ? (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-none" />
                <span>{syncResult.message}</span>
              </div>

              <div className="text-[11px] text-slate-700 space-y-1.5 bg-white p-3 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Arquivos salvos na pasta:</span>
                </div>
                <div className="font-mono text-[10px] bg-slate-50 p-1.5 rounded-md border border-slate-200 text-slate-800 break-all">
                  {syncResult.tree.clientFolderPath}
                </div>
                <div className="text-slate-600 pt-1 space-y-1">
                  <p>• <strong>Documento PDF:</strong> Enviado para a pasta <code>{folderCategory}/</code></p>
                  <p>• <strong>Fotos com Código Único:</strong> {syncResult.photos.length} foto(s) salvas individualmente na pasta <code>Fotos/</code></p>
                </div>
              </div>

              {/* Lista das fotos com códigos únicos */}
              {syncResult.photos.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Códigos Únicos das Fotos Registradas:</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                    {syncResult.photos.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px] font-mono py-1 px-1.5 rounded bg-slate-50 border border-slate-100">
                        <span className="text-slate-800 font-semibold">{p.uniqueCode}</span>
                        {p.webViewLink && (
                          <a
                            href={p.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 ml-2"
                          >
                            <span>Ver</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyFolderLink}
                  className="py-2.5 px-3 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Link da Pasta Copiado!' : 'Copiar Link da Pasta'}</span>
                </button>

                <a
                  href={syncResult.tree.clientFolderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Abrir Pasta do Cliente</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 space-y-3">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-600">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>
                  Documento: <strong>{type} #{docCode}</strong> ({data.client_name || 'Cliente Geral'})
                </span>
              </div>
              <button
                type="button"
                onClick={handleSyncToDrive}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Organizando e Salvando no Google Drive...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    <span>Criar Árvore e Salvar no Google Drive</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end flex-none">
          <button
            type="button"
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

