import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getStorage,
  FirebaseStorage,
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL
} from 'firebase/storage';

import firebaseConfig from '../../firebase-applet-config.json';
import {
  Company,
  User,
  Quote,
  WorkOrder,
  Client,
  Technician,
  DashboardStats
} from '../types';

// ============================================================================
// 1. INICIALIZAÇÃO CENTRALIZADA DO FIREBASE (App, Firestore, Auth, Storage)
// ============================================================================
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);

// Helper: execute promise with timeout to prevent blocking when Firestore is unreachable or offline
export function withTimeout<T>(promise: Promise<T>, ms: number = 1500, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

// Test connection to Firestore on initialization
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const probe = getDocFromServer(doc(db, '__health__', 'check'));
    await withTimeout(probe, 1000, null);
    return true;
  } catch (err: any) {
    return false;
  }
}

// Seed initial baseline company and users if Firestore is completely empty
export async function initializeFirestoreDefaults(): Promise<void> {
  try {
    const seedTask = (async () => {
      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      if (companiesSnapshot.empty) {
        console.log('Inicializando dados padrão no Cloud Firestore...');

        // 1. Empresa Master CAST
        const defaultCompany: Company = {
          id: 'comp-master-cast',
          name: 'CAST Quote Engenharia & Serviços',
          cnpj: '12.345.678/0001-90',
          email: 'contato@castquote.com.br',
          phone: '(11) 98765-4321',
          address: 'Av. Paulista, 1000 - Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          logo_url: '',
          primary_color: '#2563eb',
          active: 1,
          created_at: new Date().toISOString()
        };
        await setDoc(doc(db, 'companies', defaultCompany.id), defaultCompany);

        // 2. Usuário Desenvolvedor Independente (Master DEV)
        const devUser: User = {
          id: 'user-dev-master',
          company_id: '',
          name: 'Dev Master (Administrador Global)',
          email: 'dev@castquote.com',
          role: 'DEV',
          active: 1,
          created_at: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', devUser.id), {
          ...devUser,
          password_hash: 'dev123'
        });

        // 3. Usuário Administrador da Empresa
        const adminUser: User = {
          id: 'user-admin-empresa',
          company_id: defaultCompany.id,
          name: 'Carlos Gerente de Operações',
          email: 'adm@castengenharia.com.br',
          role: 'ADM',
          active: 1,
          created_at: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', adminUser.id), {
          ...adminUser,
          password_hash: 'adm123'
        });
      }
    })();

    await withTimeout(seedTask, 1500, undefined);
  } catch (err) {
    console.warn('Verificação de inicialização do Firestore:', err);
  }
}

// ============================================================================
// 2. OPERAÇÕES CRUD DE EMPRESAS (Cloud Firestore)
// ============================================================================
export const firebaseCompanies = {
  async getAll(userRole?: string, companyId?: string): Promise<Company[]> {
    try {
      const fetchPromise = (async () => {
        const coll = collection(db, 'companies');
        let q = query(coll);

        if (userRole && userRole !== 'DEV' && companyId) {
          q = query(coll, where('id', '==', companyId));
        }

        const snap = await getDocs(q);
        const companies: Company[] = [];
        snap.forEach((docSnap) => {
          companies.push(docSnap.data() as Company);
        });

        // Fallback: se estiver vazio, tenta inicializar padrão
        if (companies.length === 0) {
          await initializeFirestoreDefaults();
          const retrySnap = await getDocs(collection(db, 'companies'));
          retrySnap.forEach((docSnap) => {
            companies.push(docSnap.data() as Company);
          });
        }

        return companies.filter((c) => c.active !== 0);
      })();

      return await withTimeout(fetchPromise, 1500, []);
    } catch (err) {
      console.warn('Firestore offline ou inacessível ao buscar empresas');
      return [];
    }
  },

  async getById(id: string): Promise<Company | null> {
    const snap = await getDoc(doc(db, 'companies', id));
    if (!snap.exists()) return null;
    return snap.data() as Company;
  },

  async create(company: Partial<Company>): Promise<Company> {
    const id = company.id || `comp-${Date.now()}`;
    const newCompany: Company = {
      id,
      name: company.name || 'Nova Empresa',
      cnpj: company.cnpj || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      logo_url: company.logo_url || '',
      primary_color: company.primary_color || '#2563eb',
      active: company.active ?? 1,
      created_at: company.created_at || new Date().toISOString()
    };
    await setDoc(doc(db, 'companies', id), newCompany);
    return newCompany;
  },

  async update(id: string, updates: Partial<Company>): Promise<Company> {
    const refDoc = doc(db, 'companies', id);
    const existingSnap = await getDoc(refDoc);
    const existing = existingSnap.exists() ? (existingSnap.data() as Company) : ({} as Company);

    const merged: Company = {
      ...existing,
      ...updates,
      id
    };
    await setDoc(refDoc, merged, { merge: true });
    return merged;
  },

  async updateBranding(id: string, primaryColor: string, logoUrl?: string, storagePath?: string): Promise<Company> {
    const refDoc = doc(db, 'companies', id);
    const updates: Partial<Company> = {
      primary_color: primaryColor
    };
    if (logoUrl !== undefined) {
      updates.logo_url = logoUrl;
    }
    if (storagePath !== undefined) {
      updates.logo_storage_path = storagePath;
    }
    updates.logo_updated_at = new Date().toISOString();
    await updateDoc(refDoc, updates);
    const updatedSnap = await getDoc(refDoc);
    return updatedSnap.data() as Company;
  },

  async updateCompanyLogo(id: string, logoUrl: string, storagePath?: string): Promise<Company> {
    const refDoc = doc(db, 'companies', id);
    const updates: Partial<Company> = {
      logo_url: logoUrl,
      logo_storage_path: storagePath || '',
      logo_updated_at: new Date().toISOString()
    };
    await updateDoc(refDoc, updates);
    const updatedSnap = await getDoc(refDoc);
    return updatedSnap.data() as Company;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const refDoc = doc(db, 'companies', id);
    await updateDoc(refDoc, { active: 0 });
    return { success: true };
  }
};

// ============================================================================
// 3. OPERAÇÕES CRUD DE ORÇAMENTOS (Cloud Firestore)
// ============================================================================
export const firebaseQuotes = {
  async getAll(filters?: { companyId?: string; userRole?: string; status?: string; search?: string }): Promise<Quote[]> {
    try {
      const coll = collection(db, 'quotes');
      let q = query(coll);

      if (filters?.companyId && filters.userRole !== 'DEV') {
        q = query(coll, where('company_id', '==', filters.companyId));
      }

      const snap = await getDocs(q);
      let quotes: Quote[] = [];
      snap.forEach((docSnap) => {
        quotes.push(docSnap.data() as Quote);
      });

      // Ordenar por data decrescente
      quotes.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());

      if (filters?.status && filters.status !== 'all') {
        quotes = quotes.filter((qItem) => qItem.status.toLowerCase() === filters.status?.toLowerCase());
      }

      if (filters?.search) {
        const s = filters.search.toLowerCase();
        quotes = quotes.filter(
          (qItem) =>
            qItem.client_name?.toLowerCase().includes(s) ||
            qItem.quote_number?.toString().includes(s) ||
            qItem.description?.toLowerCase().includes(s)
        );
      }

      return quotes;
    } catch (err) {
      console.error('Erro ao buscar orçamentos no Firestore:', err);
      return [];
    }
  },

  async getById(id: string): Promise<Quote | null> {
    const snap = await getDoc(doc(db, 'quotes', id));
    if (!snap.exists()) return null;
    return snap.data() as Quote;
  },

  async create(quote: Partial<Quote>): Promise<Quote> {
    const id = quote.id || `quote-${Date.now()}`;
    const allQuotes = await getDocs(collection(db, 'quotes'));
    const nextNumber = (quote.quote_number && quote.quote_number > 0) ? quote.quote_number : allQuotes.size + 1001;

    const newQuote: Quote = {
      id,
      company_id: quote.company_id || '',
      quote_number: nextNumber,
      client_id: quote.client_id || '',
      client_name: quote.client_name || '',
      client_phone: quote.client_phone || '',
      client_email: quote.client_email || '',
      client_document: quote.client_document || '',
      technician_id: quote.technician_id || '',
      technician_name: quote.technician_name || '',
      created_by: quote.created_by || '',
      date: quote.date || new Date().toISOString().split('T')[0],
      validity_date: quote.validity_date || '',
      status: quote.status || 'Rascunho',
      description: quote.description || '',
      address: quote.address || '',
      subtotal: Number(quote.subtotal) || 0,
      discount: Number(quote.discount) || 0,
      addition: Number(quote.addition) || 0,
      total: Number(quote.total) || 0,
      notes: quote.notes || '',
      items: quote.items || [],
      photos: quote.photos || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'quotes', id), newQuote);
    return newQuote;
  },

  async update(id: string, updates: Partial<Quote>): Promise<Quote> {
    const refDoc = doc(db, 'quotes', id);
    const existingSnap = await getDoc(refDoc);
    const existing = existingSnap.exists() ? (existingSnap.data() as Quote) : ({} as Quote);

    const merged: Quote = {
      ...existing,
      ...updates,
      id,
      updated_at: new Date().toISOString()
    };
    await setDoc(refDoc, merged, { merge: true });
    return merged;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    await deleteDoc(doc(db, 'quotes', id));
    return { success: true };
  }
};

// ============================================================================
// 4. OPERAÇÕES CRUD DE ORDENS DE SERVIÇO (Cloud Firestore)
// ============================================================================
export const firebaseWorkOrders = {
  async getAll(filters?: { companyId?: string; userRole?: string; status?: string; search?: string }): Promise<WorkOrder[]> {
    try {
      const coll = collection(db, 'work_orders');
      let q = query(coll);

      if (filters?.companyId && filters.userRole !== 'DEV') {
        q = query(coll, where('company_id', '==', filters.companyId));
      }

      const snap = await getDocs(q);
      let orders: WorkOrder[] = [];
      snap.forEach((docSnap) => {
        orders.push(docSnap.data() as WorkOrder);
      });

      orders.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());

      if (filters?.status && filters.status !== 'all') {
        orders = orders.filter((o) => o.status.toLowerCase() === filters.status?.toLowerCase());
      }

      if (filters?.search) {
        const s = filters.search.toLowerCase();
        orders = orders.filter(
          (o) =>
            o.client_name?.toLowerCase().includes(s) ||
            o.order_number?.toString().includes(s) ||
            o.service_description?.toLowerCase().includes(s)
        );
      }

      return orders;
    } catch (err) {
      console.error('Erro ao buscar ordens de serviço no Firestore:', err);
      return [];
    }
  },

  async getById(id: string): Promise<WorkOrder | null> {
    const snap = await getDoc(doc(db, 'work_orders', id));
    if (!snap.exists()) return null;
    return snap.data() as WorkOrder;
  },

  async create(order: Partial<WorkOrder>): Promise<WorkOrder> {
    const id = order.id || `order-${Date.now()}`;
    const allOrders = await getDocs(collection(db, 'work_orders'));
    const nextNumber = (order.order_number && order.order_number > 0) ? order.order_number : allOrders.size + 1001;

    const newOrder: WorkOrder = {
      id,
      company_id: order.company_id || '',
      order_number: nextNumber,
      quote_id: order.quote_id || '',
      client_id: order.client_id || '',
      client_name: order.client_name || '',
      client_phone: order.client_phone || '',
      client_email: order.client_email || '',
      client_document: order.client_document || '',
      technician_id: order.technician_id || '',
      technician_name: order.technician_name || '',
      created_by: order.created_by || '',
      date: order.date || new Date().toISOString().split('T')[0],
      status: order.status || 'Aberta',
      service_description: order.service_description || (order as any).description || '',
      address: order.address || '',
      subtotal: Number(order.subtotal) || Number((order as any).labor_cost) || 0,
      discount: Number(order.discount) || 0,
      addition: Number(order.addition) || 0,
      total: Number(order.total) || 0,
      notes: order.notes || '',
      items: order.items || [],
      photos: order.photos || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await setDoc(doc(db, 'work_orders', id), newOrder);
    return newOrder;
  },

  async update(id: string, updates: Partial<WorkOrder>): Promise<WorkOrder> {
    const refDoc = doc(db, 'work_orders', id);
    const existingSnap = await getDoc(refDoc);
    const existing = existingSnap.exists() ? (existingSnap.data() as WorkOrder) : ({} as WorkOrder);

    const merged: WorkOrder = {
      ...existing,
      ...updates,
      id,
      updated_at: new Date().toISOString()
    };
    await setDoc(refDoc, merged, { merge: true });
    return merged;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    await deleteDoc(doc(db, 'work_orders', id));
    return { success: true };
  }
};

// ============================================================================
// 5. OPERAÇÕES CRUD DE CLIENTES (Cloud Firestore)
// ============================================================================
export const firebaseClients = {
  async getAll(companyId?: string, userRole?: string): Promise<Client[]> {
    try {
      const coll = collection(db, 'clients');
      let q = query(coll);
      if (companyId && userRole !== 'DEV') {
        q = query(coll, where('company_id', '==', companyId));
      }
      const snap = await getDocs(q);
      const clients: Client[] = [];
      snap.forEach((docSnap) => clients.push(docSnap.data() as Client));
      return clients;
    } catch (err) {
      console.error('Erro ao buscar clientes no Firestore:', err);
      return [];
    }
  },

  async create(client: Partial<Client>): Promise<Client> {
    const id = client.id || `client-${Date.now()}`;
    const newClient: Client = {
      id,
      company_id: client.company_id || '',
      name: client.name || '',
      document: client.document || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      notes: client.notes || '',
      created_at: new Date().toISOString()
    };
    await setDoc(doc(db, 'clients', id), newClient);
    return newClient;
  },

  async update(id: string, updates: Partial<Client>): Promise<Client> {
    const refDoc = doc(db, 'clients', id);
    await setDoc(refDoc, { ...updates, id }, { merge: true });
    const snap = await getDoc(refDoc);
    return snap.data() as Client;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    await deleteDoc(doc(db, 'clients', id));
    return { success: true };
  }
};

// ============================================================================
// 6. OPERAÇÕES CRUD DE TÉCNICOS (Cloud Firestore)
// ============================================================================
export const firebaseTechnicians = {
  async getAll(companyId?: string, userRole?: string): Promise<Technician[]> {
    try {
      const coll = collection(db, 'technicians');
      let q = query(coll);
      if (companyId && userRole !== 'DEV') {
        q = query(coll, where('company_id', '==', companyId));
      }
      const snap = await getDocs(q);
      const techs: Technician[] = [];
      snap.forEach((docSnap) => techs.push(docSnap.data() as Technician));
      return techs;
    } catch (err) {
      console.error('Erro ao buscar técnicos no Firestore:', err);
      return [];
    }
  },

  async create(tech: Partial<Technician>): Promise<Technician> {
    const id = tech.id || `tech-${Date.now()}`;
    const newTech: Technician = {
      id,
      company_id: tech.company_id || '',
      name: tech.name || '',
      phone: tech.phone || '',
      email: tech.email || '',
      role_title: tech.role_title || 'Técnico Especialista',
      active: tech.active ?? 1,
      created_at: new Date().toISOString()
    };
    await setDoc(doc(db, 'technicians', id), newTech);
    return newTech;
  },

  async update(id: string, updates: Partial<Technician>): Promise<Technician> {
    const refDoc = doc(db, 'technicians', id);
    await setDoc(refDoc, { ...updates, id }, { merge: true });
    const snap = await getDoc(refDoc);
    return snap.data() as Technician;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    await deleteDoc(doc(db, 'technicians', id));
    return { success: true };
  }
};

// ============================================================================
// 7. OPERAÇÕES CRUD DE USUÁRIOS E AUTENTICAÇÃO
// ============================================================================
export const firebaseUsers = {
  async getAll(companyId?: string, userRole?: string): Promise<User[]> {
    try {
      const coll = collection(db, 'users');
      let q = query(coll);
      if (companyId && userRole !== 'DEV') {
        q = query(coll, where('company_id', '==', companyId));
      }
      const snap = await getDocs(q);
      const users: User[] = [];
      snap.forEach((docSnap) => {
        const u = docSnap.data() as User;
        if (u && u.role !== 'DEV') {
          users.push(u);
        }
      });
      return users;
    } catch (err) {
      console.error('Erro ao buscar usuários no Firestore:', err);
      return [];
    }
  },

  async create(user: Partial<User>): Promise<User> {
    const id = user.id || `user-${Date.now()}`;
    const newUser: User = {
      id,
      company_id: user.company_id || '',
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'TÉCNICO',
      active: user.active ?? 1,
      created_at: new Date().toISOString()
    };
    await setDoc(doc(db, 'users', id), {
      ...newUser,
      password_hash: (user as any).password || '123456'
    });
    return newUser;
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    const refDoc = doc(db, 'users', id);
    await setDoc(refDoc, { ...updates, id }, { merge: true });
    const snap = await getDoc(refDoc);
    return snap.data() as User;
  },

  async delete(id: string): Promise<{ success: boolean }> {
    await deleteDoc(doc(db, 'users', id));
    return { success: true };
  }
};

// ============================================================================
// 8. STORAGE PARA FOTOS, MÍDIAS E LOGOS DE EMPRESAS
// ============================================================================
export const firebaseMedia = {
  async uploadFile(file: File, path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type || 'image/png'
      });
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.warn('Fallback de Storage para upload:', err);
      return URL.createObjectURL(file);
    }
  },

  async uploadBase64(base64Data: string, path: string, contentType?: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadString(storageRef, base64Data, 'data_url', {
        contentType: contentType || 'image/png'
      });
      return await getDownloadURL(snapshot.ref);
    } catch (err) {
      console.warn('Fallback de Storage para base64:', err);
      return base64Data;
    }
  },

  async uploadCompanyLogo(
    companyId: string,
    base64OrFile: string | File,
    preferredName?: string
  ): Promise<{ downloadUrl: string; storagePath: string }> {
    const isFile = typeof base64OrFile !== 'string';
    let ext = 'png';
    let mimeType = 'image/png';

    if (isFile) {
      mimeType = base64OrFile.type || 'image/png';
      if (base64OrFile.name && base64OrFile.name.includes('.')) {
        ext = base64OrFile.name.split('.').pop()?.toLowerCase() || 'png';
      }
    } else if (typeof base64OrFile === 'string' && base64OrFile.startsWith('data:')) {
      const match = base64OrFile.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      if (match) {
        mimeType = match[1];
        ext = mimeType.replace('image/', '').replace('svg+xml', 'svg');
      }
    }

    const safeName = preferredName
      ? preferredName.replace(/[^a-zA-Z0-9_-]/g, '_')
      : `logo_${Date.now()}`;
    const storagePath = `companies/${companyId}/logos/${safeName}.${ext}`;

    try {
      const storageRef = ref(storage, storagePath);
      let downloadUrl = '';

      if (isFile) {
        const snapshot = await uploadBytes(storageRef, base64OrFile, {
          contentType: mimeType,
          customMetadata: {
            companyId,
            uploadedAt: new Date().toISOString()
          }
        });
        downloadUrl = await getDownloadURL(snapshot.ref);
      } else {
        const snapshot = await uploadString(storageRef, base64OrFile, 'data_url', {
          contentType: mimeType,
          customMetadata: {
            companyId,
            uploadedAt: new Date().toISOString()
          }
        });
        downloadUrl = await getDownloadURL(snapshot.ref);
      }

      return { downloadUrl, storagePath };
    } catch (storageErr) {
      console.warn('Firebase Storage upload error, using local fallback:', storageErr);
      let fallbackUrl = '';
      if (isFile) {
        fallbackUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(base64OrFile);
        });
      } else {
        fallbackUrl = base64OrFile;
      }
      return { downloadUrl: fallbackUrl, storagePath };
    }
  }
};

// Export consolidated Firebase service
export const firebaseService = {
  app,
  db,
  auth,
  storage,
  testConnection: testFirestoreConnection,
  initDefaults: initializeFirestoreDefaults,
  companies: firebaseCompanies,
  quotes: firebaseQuotes,
  workOrders: firebaseWorkOrders,
  clients: firebaseClients,
  technicians: firebaseTechnicians,
  users: firebaseUsers,
  media: firebaseMedia
};
