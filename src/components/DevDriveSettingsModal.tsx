import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  FolderTree,
  Folder,
  ExternalLink,
  X,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  LogOut,
  Sliders,
  ShieldCheck,
  ChevronRight,
  Database,
  ArrowRightLeft
} from 'lucide-react';
import {
  googleSignIn,
  logout,
  getAccessToken,
  getCurrentUser,
  testDriveRootConnection,
  getStoredCentralDriveAccount,
  initAuth
} from '../services/googleDriveService';
import { api } from '../services/api';
import { User } from 'firebase/auth';

interface DevDriveSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DevDriveSettingsModal: React.FC<DevDriveSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Settings state
  const [user, setUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [rootFolderName, setRootFolderName] = useState('CAST_Quote');
  const [autoSync, setAutoSync] = useState(true);
  const [syncPhotos, setSyncPhotos] = useState(true);

  // Stored backend settings
  const [savedSettings, setSavedSettings] = useState<{
    account_email: string;
    account_name?: string;
    account_photo?: string;
    root_folder_name?: string;
    auto_sync?: number;
    sync_photos?: number;
    updated_at?: string;
  } | null>(null);

  // Test connection result
  const [testResult, setTestResult] = useState<{
    folderId: string;
    folderUrl: string;
    accountEmail: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setTestResult(null);

    // 1. Listen to Firebase auth
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setHasToken(!!token);
      },
      () => {
        setUser(null);
        setHasToken(false);
      }
    );

    // Initial check
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      getAccessToken().then((t) => setHasToken(!!t));
    }

    // 2. Fetch configured settings from database
    loadBackendSettings();

    return () => unsubscribe();
  }, [isOpen]);

  const loadBackendSettings = async () => {
    try {
      const data = await api.getDriveSettings();
      if (data) {
        setSavedSettings(data);
        if (data.root_folder_name) setRootFolderName(data.root_folder_name);
        if (data.auto_sync !== undefined) setAutoSync(data.auto_sync === 1);
        if (data.sync_photos !== undefined) setSyncPhotos(data.sync_photos === 1);
      } else {
        const local = getStoredCentralDriveAccount();
        if (local) {
          setSavedSettings({
            account_email: local.email,
            account_name: local.displayName,
            account_photo: local.photoURL,
            updated_at: local.lastConnected
          });
        }
      }
    } catch (err: any) {
      console.warn('Erro ao carregar configurações do Drive:', err);
    }
  };

  const handleConnectAccount = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Força a tela de seleção de conta com login e senha do Google
      const { user: authedUser } = await googleSignIn(true);
      setUser(authedUser);
      setHasToken(true);

      // Salva no backend como conta central do DEV
      await api.saveDriveSettings({
        account_email: authedUser.email || '',
        account_name: authedUser.displayName || '',
        account_photo: authedUser.photoURL || '',
        root_folder_name: rootFolderName,
        auto_sync: autoSync,
        sync_photos: syncPhotos
      });

      setSuccessMessage(
        `Conta "${authedUser.email}" conectada e definida como o Google Drive oficial do sistema!`
      );
      loadBackendSettings();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(
          err.message || 'Falha ao autenticar com a conta Google selecionada.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectAccount = async () => {
    if (!confirm('Deseja realmente desconectar a conta do Google Drive? O sistema deixará de ter uma conta central vinculada até uma nova conexão.')) {
      return;
    }

    setLoading(true);
    try {
      await logout();
      await api.deleteDriveSettings();
      setUser(null);
      setHasToken(false);
      setSavedSettings(null);
      setTestResult(null);
      setSuccessMessage('Conta do Google Drive desconectada com sucesso.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao desconectar conta do Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setErrorMessage(null);
    setTestResult(null);

    try {
      if (!hasToken) {
        // Se a sessão expirou, solicita login novamente
        const { user: u } = await googleSignIn(true);
        setUser(u);
        setHasToken(true);
      }

      const res = await testDriveRootConnection(rootFolderName);
      setTestResult(res);
      setSuccessMessage(
        `Conexão validada com sucesso! A pasta raiz "${rootFolderName}" está ativa na conta ${res.accountEmail}.`
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao testar conexão com o Google Drive.');
    } finally {
      setTesting(false);
    }
  };

  const handleSavePreferences = async () => {
    const targetEmail = user?.email || savedSettings?.account_email;
    if (!targetEmail) {
      setErrorMessage('Conecte uma conta Google antes de salvar as preferências.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.saveDriveSettings({
        account_email: targetEmail,
        account_name: user?.displayName || savedSettings?.account_name || '',
        account_photo: user?.photoURL || savedSettings?.account_photo || '',
        root_folder_name: rootFolderName,
        auto_sync: autoSync,
        sync_photos: syncPhotos
      });

      setSuccessMessage('Preferências de armazenamento do Google Drive salvas com sucesso!');
      loadBackendSettings();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar preferências.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyFolderUrl = () => {
    if (testResult?.folderUrl) {
      navigator.clipboard.writeText(testResult.folderUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  const activeEmail = user?.email || savedSettings?.account_email;
  const activeName = user?.displayName || savedSettings?.account_name;
  const activePhoto = user?.photoURL || savedSettings?.account_photo;
  const isConnected = !!activeEmail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl my-6 rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-900 via-slate-900 to-purple-950 text-white border-b border-purple-800 flex-none">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600/30 text-purple-300 border border-purple-400/30">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">Definir Conta Google Drive</h3>
                <span className="px-2 py-0.2 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30 text-[10px] font-extrabold uppercase">
                  Painel DEV
                </span>
              </div>
              <p className="text-xs text-purple-200/80">
                Escolha qual conta do Google será o repositório central de arquivos e fotos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1 max-h-[78vh] overflow-y-auto">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-none" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-none" />
              <span className="flex-1">{successMessage}</span>
            </div>
          )}

          {/* Current Account Status Card */}
          <div className={`p-4 rounded-2xl border transition ${
            isConnected
              ? 'bg-purple-50/50 border-purple-200 shadow-2xs'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Database className="w-4 h-4 text-purple-600" />
                <span>Conta Selecionada como Drive de Arquivos</span>
              </div>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Ativa & Conectada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Nenhuma Conta Definida
                </span>
              )}
            </div>

            {isConnected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-3">
                    {activePhoto ? (
                      <img
                        src={activePhoto}
                        alt="Conta"
                        className="w-10 h-10 rounded-full border border-purple-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm">
                        {activeName ? activeName.charAt(0).toUpperCase() : 'G'}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-900">{activeName || 'Conta Google'}</div>
                      <div className="text-xs text-purple-700 font-mono">{activeEmail}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Definida para armazenar os orçamentos, ordens de serviço e fotos com códigos únicos
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons for account */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConnectAccount}
                    disabled={loading}
                    className="flex-1 min-w-[170px] py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                    title="Abre a tela do Google para você digitar login e senha e escolher outra conta"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Trocar Conta (Login/Senha)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="py-2 px-3 rounded-xl bg-white border border-purple-200 hover:bg-purple-50 text-purple-900 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
                  >
                    {testing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    )}
                    <span>Testar Pasta Raiz</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnectAccount}
                    disabled={loading}
                    className="py-2 px-3 rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-600" />
                    <span>Desconectar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 px-2 space-y-3">
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Você ainda não definiu qual conta do Google Drive será utilizada. Clique abaixo para fazer login com o e-mail e senha da conta desejada.
                </p>
                <button
                  type="button"
                  onClick={handleConnectAccount}
                  disabled={loading}
                  className="py-3 px-5 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white text-xs font-bold transition shadow-md flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Escolher Conta Google Drive (Login e Senha)</span>
                </button>
              </div>
            )}
          </div>

          {/* Test connection result details */}
          {testResult && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs text-emerald-950 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Pasta Raiz & Permissões Validadas!
                </span>
                <a
                  href={testResult.folderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold"
                >
                  <span>Abrir no Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="font-mono text-[10px] bg-white p-2 rounded-lg border border-emerald-200 flex items-center justify-between">
                <span className="truncate">/{rootFolderName}/</span>
                <button
                  type="button"
                  onClick={handleCopyFolderUrl}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 ml-2 flex-none"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copiado' : 'Copiar URL'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Árvore de Pastas que será criada */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <FolderTree className="w-4 h-4 text-purple-600" />
                Árvore de Arquivos Gerada na Conta Escolhida
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">
                Multi-cliente automático
              </span>
            </div>

            <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 font-mono text-[11px] leading-relaxed border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                <Folder className="w-3.5 h-3.5" />
                <span>{rootFolderName}/</span>
                <span className="text-[10px] text-slate-400 font-normal">(Raiz oficial)</span>
              </div>
              <div className="pl-4 flex items-center gap-1.5 text-amber-300 font-semibold">
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <Folder className="w-3.5 h-3.5" />
                <span>[Empresa_Cliente_A]/</span>
                <span className="text-[10px] text-slate-400 font-normal">(Prestador / Empresa Contratante)</span>
              </div>
              <div className="pl-8 flex items-center gap-1.5 text-emerald-300 font-semibold">
                <ChevronRight className="w-3 h-3 text-slate-500" />
                <Folder className="w-3.5 h-3.5" />
                <span>[Cliente_Final]/</span>
                <span className="text-[10px] text-slate-400 font-normal">(Cada cliente atendido pelo prestador)</span>
              </div>
              <div className="pl-12 space-y-1 pt-1 text-slate-300 text-[10px]">
                <div className="flex items-center gap-1.5 text-blue-300">
                  <Folder className="w-3 h-3 text-blue-400" />
                  <span>Orcamentos/ ➔ Arquivos PDF dos orçamentos</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-300">
                  <Folder className="w-3 h-3 text-blue-400" />
                  <span>Ordens_de_Servico/ ➔ Arquivos PDF das OS concluídas</span>
                </div>
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <Folder className="w-3 h-3 text-cyan-400" />
                  <span>Fotos/ ➔ Fotos com código único [FOTO_OS-0001_01_ID.jpg]</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              O sistema utiliza a conta definida acima para criar toda a árvore de diretórios automaticamente em segundo plano.
            </p>
          </div>

          {/* Configurações Avançadas de Gravação */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-700" />
              <span>Opções de Arquivamento e Pastas</span>
            </h4>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Nome da Pasta Raiz no Google Drive
                </label>
                <input
                  type="text"
                  value={rootFolderName}
                  onChange={(e) => setRootFolderName(e.target.value)}
                  placeholder="CAST_Quote"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-slate-800">Sincronização Automática</div>
                  <div className="text-[11px] text-slate-500">
                    Sincronizar documentos automaticamente ao emitir orçamentos ou finalizar ordens de serviço.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncPhotos}
                  onChange={(e) => setSyncPhotos(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-slate-800">Salvar Fotos com Códigos Únicos</div>
                  <div className="text-[11px] text-slate-500">
                    Enviar cada foto separadamente para a pasta <code>Fotos/</code> com código exclusivo para posterior edição e consulta.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-none">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 transition"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={loading || !isConnected}
            className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Salvar Preferências</span>
          </button>
        </div>
      </div>
    </div>
  );
};
