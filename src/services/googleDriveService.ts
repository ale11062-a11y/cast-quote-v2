import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

// Workspace OAuth Scopes
export const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory token caching (NOT stored in localStorage / sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not available in memory, requires interactive sign-in
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export interface CentralDriveAccount {
  email: string;
  displayName?: string;
  photoURL?: string;
  uid?: string;
  lastConnected: string;
}

export const getStoredCentralDriveAccount = (): CentralDriveAccount | null => {
  try {
    const raw = localStorage.getItem('cast_central_drive_account');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const googleSignIn = async (
  forceAccountSelection = true
): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const authProvider = new GoogleAuthProvider();
    SCOPES.forEach((scope) => authProvider.addScope(scope));

    if (forceAccountSelection) {
      // Força a tela de seleção de conta com login e senha do Google
      authProvider.setCustomParameters({ prompt: 'select_account' });
    }

    const result = await signInWithPopup(auth, authProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso da autenticação Google.');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;

    // Salva a conta escolhida pelo DEV como conta de arquivamento oficial
    const accountInfo: CentralDriveAccount = {
      email: result.user.email || '',
      displayName: result.user.displayName || '',
      photoURL: result.user.photoURL || '',
      uid: result.user.uid,
      lastConnected: new Date().toISOString()
    };
    try {
      localStorage.setItem('cast_central_drive_account', JSON.stringify(accountInfo));
    } catch {}

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erro no Sign In do Google Drive:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return cachedUser;
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Erro ao deslogar do Firebase Auth:', e);
  }
  cachedAccessToken = null;
  cachedUser = null;
  try {
    localStorage.removeItem('cast_central_drive_account');
  } catch {}
};

/**
 * Testa a conexão com a conta de Drive selecionada e valida/cria a pasta raiz
 */
export async function testDriveRootConnection(rootFolderName = 'CAST_Quote'): Promise<{
  folderId: string;
  folderUrl: string;
  accountEmail: string;
}> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Nenhuma conta Google autenticada no momento.');
  }

  const folderId = await getOrCreateFolder(rootFolderName);
  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
  const user = getCurrentUser();

  return {
    folderId,
    folderUrl,
    accountEmail: user?.email || 'conta@google.com'
  };
}

/**
 * Procura ou cria uma pasta no Google Drive pelo nome e pasta pai opcional
 */
export async function getOrCreateFolder(
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Usuário não autenticado no Google Drive.');
  }

  let query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!searchRes.ok) {
    const err = await searchRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao buscar pasta no Google Drive');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Criar a pasta se não existir
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao criar pasta no Google Drive');
  }

  const createData = await createRes.json();
  return createData.id;
}

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink?: string;
  folderId?: string;
}

export interface DriveUploadedPhoto {
  uniqueCode: string;
  fileId: string;
  fileName: string;
  webViewLink?: string;
  caption?: string;
  photoId?: string;
}

export interface DriveClientTreeResult {
  rootFolderId: string;
  companyFolderId: string;
  clientFolderId: string;
  categoryFolderId: string;
  fotosFolderId: string;
  clientFolderPath: string;
  clientFolderUrl: string;
}

export interface DocumentSyncProgress {
  stage: 'AUTH' | 'FOLDERS' | 'PDF' | 'PHOTOS' | 'COMPLETED';
  message: string;
  current: number;
  total: number;
}

/**
 * Sanitiza nomes de arquivos e pastas para o Google Drive
 */
export function sanitizeDriveName(name: string): string {
  if (!name) return 'Geral';
  return name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converte URLs Data, Blob ou base64 para Blob binário com mimeType apropriado
 */
export async function convertImageToBlob(imageUrl: string): Promise<Blob> {
  if (!imageUrl) {
    throw new Error('URL da imagem não fornecida.');
  }

  // Se já for data URL ou blob URL
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:') || imageUrl.startsWith('http')) {
    const res = await fetch(imageUrl);
    return await res.blob();
  }

  // Se for base64 puro
  try {
    const cleanBase64 = imageUrl.replace(/^data:image\/\w+;base64,/, '');
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'image/jpeg' });
  } catch {
    throw new Error('Falha ao converter imagem para envio.');
  }
}

/**
 * Garante e cria toda a árvore hierárquica no Google Drive:
 * CAST_Quote / [Empresa (Cliente A)] / [Cliente Final] / [Orcamentos | Ordens_de_Servico | Fotos]
 */
export async function ensureClientFolderTree(options: {
  companyName: string;
  clientName: string;
  category: 'Orcamentos' | 'Ordens_de_Servico';
}): Promise<DriveClientTreeResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Usuário não autenticado no Google Drive.');
  }

  // 1. Raiz do Sistema
  const rootFolderId = await getOrCreateFolder('CAST_Quote');

  // 2. Pasta do Cliente Principal (Empresa/Prestador "Cliente A")
  const safeCompName = sanitizeDriveName(options.companyName || 'Empresa_Principal');
  const companyFolderId = await getOrCreateFolder(safeCompName, rootFolderId);

  // 3. Subpasta do Cliente do Cliente A (Cliente final atendido)
  const safeClientName = sanitizeDriveName(options.clientName || 'Cliente_Geral');
  const clientFolderId = await getOrCreateFolder(safeClientName, companyFolderId);

  // 4. Pastas separadoras por tipo de arquivo gerado
  const categoryFolderId = await getOrCreateFolder(options.category, clientFolderId);
  const fotosFolderId = await getOrCreateFolder('Fotos', clientFolderId);

  // Garante também a outra categoria para deixar a árvore organizada
  const otherCategory = options.category === 'Orcamentos' ? 'Ordens_de_Servico' : 'Orcamentos';
  await getOrCreateFolder(otherCategory, clientFolderId).catch(() => null);

  const clientFolderPath = `/CAST_Quote/${safeCompName}/${safeClientName}/`;
  const clientFolderUrl = `https://drive.google.com/drive/folders/${clientFolderId}`;

  return {
    rootFolderId,
    companyFolderId,
    clientFolderId,
    categoryFolderId,
    fotosFolderId,
    clientFolderPath,
    clientFolderUrl
  };
}

/**
 * Faz upload de uma foto com código único vinculado ao documento
 */
export async function uploadPhotoToDrive(options: {
  token: string;
  photoBlob: Blob;
  filename: string;
  targetFolderId: string;
  description: string;
}): Promise<DriveUploadResult> {
  const metadata = {
    name: options.filename,
    parents: [options.targetFolderId],
    mimeType: options.photoBlob.type || 'image/jpeg',
    description: options.description
  };

  const boundary = '-------CAST_PHOTO_BOUNDARY_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody = new Blob(
    [
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${metadata.mimeType}\r\n\r\n`,
      options.photoBlob,
      closeDelimiter
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao fazer upload da foto no Google Drive');
  }

  const uploadData = await uploadRes.json();
  return {
    fileId: uploadData.id,
    fileName: uploadData.name,
    webViewLink: uploadData.webViewLink,
    folderId: options.targetFolderId
  };
}

/**
 * Faz o upload de um arquivo PDF gerado para o Google Drive
 */
export async function uploadPdfToDrive(options: {
  filename: string;
  pdfBlob: Blob;
  targetFolderId: string;
  description?: string;
}): Promise<DriveUploadResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sessão expirada ou usuário não conectado ao Google Drive.');
  }

  const metadata = {
    name: options.filename,
    parents: [options.targetFolderId],
    mimeType: 'application/pdf',
    description: options.description || `Documento gerado pelo sistema CAST Quote em ${new Date().toLocaleDateString('pt-BR')}`
  };

  const boundary = '-------CAST_QUOTE_BOUNDARY_' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody = new Blob(
    [
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify(metadata),
      delimiter,
      'Content-Type: application/pdf\r\n\r\n',
      options.pdfBlob,
      closeDelimiter
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao fazer upload do PDF para o Google Drive');
  }

  const uploadData = await uploadRes.json();
  return {
    fileId: uploadData.id,
    fileName: uploadData.name,
    webViewLink: uploadData.webViewLink,
    folderId: options.targetFolderId
  };
}

/**
 * SINCRONIZAÇÃO COMPLETA: Cria a árvore no Google Drive (Empresa -> Cliente -> Categorias),
 * envia o PDF na pasta correta e salva todas as fotos individuais com código único vinculado.
 */
export async function uploadDocumentAndAssetsToDrive(options: {
  type: 'ORÇAMENTO' | 'ORDEM DE SERVIÇO';
  data: any;
  companyName: string;
  pdfBlob: Blob;
  onProgress?: (progress: DocumentSyncProgress) => void;
}): Promise<{
  tree: DriveClientTreeResult;
  pdf: DriveUploadResult;
  photos: DriveUploadedPhoto[];
}> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sessão expirada ou usuário não conectado ao Google Drive.');
  }

  const isQuote = options.type === 'ORÇAMENTO';
  const category = isQuote ? 'Orcamentos' : 'Ordens_de_Servico';
  const docNumber = isQuote ? options.data.quote_number : options.data.order_number;
  const docCode = isQuote
    ? `ORC-${String(docNumber).padStart(4, '0')}`
    : `OS-${String(docNumber).padStart(4, '0')}`;
  const clientName = options.data.client_name?.trim() || 'Cliente_Geral';

  // 1. Cria a árvore de pastas no Drive
  options.onProgress?.({
    stage: 'FOLDERS',
    message: `Organizando árvore de pastas: CAST_Quote / ${options.companyName} / ${clientName}...`,
    current: 1,
    total: 3
  });

  const tree = await ensureClientFolderTree({
    companyName: options.companyName,
    clientName,
    category
  });

  // 2. Faz o upload do PDF na pasta do documento
  options.onProgress?.({
    stage: 'PDF',
    message: `Enviando PDF do documento ${docCode} para a pasta ${category}...`,
    current: 2,
    total: 3
  });

  const safeClientSlug = sanitizeDriveName(clientName).replace(/\s+/g, '_');
  const pdfFilename = `${isQuote ? 'Orcamento' : 'OS'}_${docCode}_${safeClientSlug}.pdf`;
  const pdfDescription = `${options.type} #${docCode} | Cliente: ${clientName} | Valor: R$ ${options.data.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Emissão: ${new Date().toLocaleDateString('pt-BR')}`;

  const pdfResult = await uploadPdfToDrive({
    filename: pdfFilename,
    pdfBlob: options.pdfBlob,
    targetFolderId: tree.categoryFolderId,
    description: pdfDescription
  });

  // 3. Faz o upload de todas as fotos com código único na pasta Fotos do cliente
  const photosList: any[] = options.data.photos || [];
  const uploadedPhotos: DriveUploadedPhoto[] = [];

  if (photosList.length > 0) {
    const totalSteps = photosList.length;

    for (let i = 0; i < photosList.length; i++) {
      const p = photosList[i];
      const photoIndex = String(i + 1).padStart(2, '0');
      // Gerar código único e amigável: FOTO_OS-0001_01_A1B2
      const uniqueSuffix = (p.id || Math.random().toString(36).substring(2, 6)).toUpperCase();
      const uniqueCode = `FOTO_${docCode}_${photoIndex}_${uniqueSuffix}`;
      const photoFilename = `${uniqueCode}.jpg`;

      options.onProgress?.({
        stage: 'PHOTOS',
        message: `Enviando foto ${i + 1} de ${totalSteps} com código ${uniqueCode}...`,
        current: i + 1,
        total: totalSteps
      });

      try {
        if (p.url) {
          const photoBlob = await convertImageToBlob(p.url);
          const photoDesc = `Código Único: ${uniqueCode}\nDocumento: ${options.type} #${docCode}\nCliente: ${clientName}\nLegenda: ${p.caption || 'Sem legenda'}\nData de Registro: ${p.created_at || new Date().toISOString()}`;

          const uploaded = await uploadPhotoToDrive({
            token,
            photoBlob,
            filename: photoFilename,
            targetFolderId: tree.fotosFolderId,
            description: photoDesc
          });

          uploadedPhotos.push({
            uniqueCode,
            fileId: uploaded.fileId,
            fileName: photoFilename,
            webViewLink: uploaded.webViewLink,
            caption: p.caption,
            photoId: p.id
          });
        }
      } catch (photoErr) {
        console.warn(`Aviso: Falha ao enviar foto individual ${uniqueCode}:`, photoErr);
      }
    }
  }

  options.onProgress?.({
    stage: 'COMPLETED',
    message: 'Arquivos e fotos organizados com sucesso no Google Drive!',
    current: 100,
    total: 100
  });

  return {
    tree,
    pdf: pdfResult,
    photos: uploadedPhotos
  };
}
