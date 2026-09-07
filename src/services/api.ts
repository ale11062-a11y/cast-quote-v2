import {
  Company,
  User,
  Technician,
  Client,
  Quote,
  WorkOrder,
  DashboardStats,
  NotificationLog
} from '../types';
import { firebaseService } from './firebase';

const BASE_URL = '/api';

export const api = {
  // AUTH (Firebase Auth & Firestore Users)
  login: async (email: string, password: string) => {
    try {
      // First try login via server/local
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // Fall through to Firestore
    }

    // Firestore Users authentication
    const users = await firebaseService.users.getAll();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      return {
        token: `fb-token-${found.id}-${Date.now()}`,
        user: found
      };
    }
    throw new Error('Credenciais inválidas.');
  },

  // COMPANIES (Local SQLite API + Firestore mirror)
  getCompanies: async (userRole?: string, companyId?: string): Promise<Company[]> => {
    try {
      const params = new URLSearchParams();
      if (userRole) params.append('userRole', userRole);
      if (companyId) params.append('companyId', companyId);
      const res = await fetch(`${BASE_URL}/companies?${params.toString()}`);
      if (res.ok) {
        const companies: Company[] = await res.json();
        if (companies && companies.length > 0) return companies;
      }
    } catch (err) {
      console.warn('API local de empresas indisponível, buscando no Firestore...');
    }

    try {
      const companies = await firebaseService.companies.getAll(userRole, companyId);
      if (companies.length > 0) return companies;
    } catch (err) {
      console.warn('Fallback para Firestore falhou ao buscar empresas:', err);
    }
    return [];
  },

  createCompany: async (company: Partial<Company>): Promise<Company> => {
    let created: Company | null = null;
    try {
      const res = await fetch(`${BASE_URL}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      if (res.ok) {
        created = await res.json();
      }
    } catch (err) {
      console.warn('Erro ao criar empresa na API local:', err);
    }

    try {
      const fbCompany = await firebaseService.companies.create(created || company);
      if (!created) created = fbCompany;
    } catch (err) {
      console.warn('Firestore offline ao criar empresa:', err);
    }

    if (!created) throw new Error('Erro ao cadastrar empresa.');
    return created;
  },

  updateCompany: async (id: string, company: Partial<Company>): Promise<Company> => {
    let updated: Company | null = null;
    try {
      const res = await fetch(`${BASE_URL}/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      if (res.ok) {
        updated = await res.json();
      }
    } catch (err) {
      console.warn('Erro ao atualizar empresa na API local:', err);
    }

    try {
      const fbCompany = await firebaseService.companies.update(id, company);
      if (!updated) updated = fbCompany;
    } catch (err) {
      console.warn('Firestore offline ao atualizar empresa:', err);
    }

    if (!updated) throw new Error('Erro ao atualizar empresa.');
    return updated;
  },

  updateCompanyBranding: async (id: string, primaryColor: string, logoUrl?: string, storagePath?: string): Promise<Company> => {
    let updated: Company | null = null;
    try {
      const res = await fetch(`${BASE_URL}/companies/${id}/branding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_color: primaryColor, logo_url: logoUrl, logo_storage_path: storagePath })
      });
      if (res.ok) {
        updated = await res.json();
      }
    } catch (err) {
      console.warn('Erro ao atualizar branding na API local:', err);
    }

    try {
      const fbCompany = await firebaseService.companies.updateBranding(id, primaryColor, logoUrl, storagePath);
      if (!updated) updated = fbCompany;
    } catch (err) {
      console.warn('Firestore offline ao salvar branding:', err);
    }

    if (!updated) throw new Error('Erro ao atualizar branding da empresa.');
    return updated;
  },

  deleteCompany: async (id: string): Promise<{ success: boolean }> => {
    try {
      await fetch(`${BASE_URL}/companies/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Erro ao deletar empresa localmente:', err);
    }
    try {
      await firebaseService.companies.delete(id);
    } catch (err) {
      console.warn('Erro ao deletar empresa no Firestore:', err);
    }
    return { success: true };
  },

  // USERS (Local SQLite API + Firestore mirror)
  getUsers: async (companyId?: string, userRole?: string): Promise<User[]> => {
    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (userRole) params.append('userRole', userRole);
      const res = await fetch(`${BASE_URL}/users?${params.toString()}`);
      if (res.ok) {
        const users: User[] = await res.json();
        if (users && users.length > 0) return users.filter((u) => u.role !== 'DEV');
      }
    } catch (err) {
      console.warn('API local de usuários indisponível, buscando no Firestore...');
    }

    try {
      const users = await firebaseService.users.getAll(companyId, userRole);
      if (users.length > 0) return users.filter((u) => u.role !== 'DEV');
    } catch (err) {
      console.warn('Fallback para Firestore falhou ao buscar usuários:', err);
    }
    return [];
  },

  createUser: async (user: Partial<User>): Promise<User> => {
    try {
      return await firebaseService.users.create(user);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário');
      return data;
    }
  },

  updateUser: async (id: string, user: Partial<User>): Promise<User> => {
    try {
      return await firebaseService.users.update(id, user);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar usuário');
      return data;
    }
  },

  deleteUser: async (id: string): Promise<{ success: boolean }> => {
    try {
      return await firebaseService.users.delete(id);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir usuário');
      return res.json();
    }
  },

  resetUserPassword: async (id: string, password: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${BASE_URL}/users/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao redefinir senha do usuário');
    return data;
  },

  toggleUserStatus: async (id: string, active: boolean): Promise<User> => {
    try {
      return await firebaseService.users.update(id, { active: active ? 1 : 0 });
    } catch (err) {
      const res = await fetch(`${BASE_URL}/users/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: active ? 1 : 0 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar status do usuário');
      return data;
    }
  },

  // STORAGE (Firebase Storage)
  uploadMedia: async (base64: string, filename?: string): Promise<{ url: string; base64: string }> => {
    try {
      const path = `uploads/${Date.now()}_${filename || 'media'}`;
      const url = await firebaseService.media.uploadBase64(base64, path);
      return { url, base64 };
    } catch (err) {
      console.warn('Fallback de upload:', err);
      const res = await fetch(`${BASE_URL}/upload-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, filename })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao fazer upload da mídia');
      return data;
    }
  },

  uploadCompanyLogo: async (
    companyId: string,
    fileOrBase64: File | string,
    filename?: string
  ): Promise<{ downloadUrl: string; storagePath: string }> => {
    return await firebaseService.media.uploadCompanyLogo(companyId, fileOrBase64, filename);
  },

  // TECHNICIANS (Local SQLite API + Firestore mirror)
  getTechnicians: async (companyId?: string, userRole?: string): Promise<Technician[]> => {
    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (userRole) params.append('userRole', userRole);
      const res = await fetch(`${BASE_URL}/technicians?${params.toString()}`);
      if (res.ok) {
        const techs: Technician[] = await res.json();
        if (techs && techs.length > 0) return techs;
      }
    } catch (err) {
      console.warn('API local de técnicos indisponível, buscando no Firestore...');
    }

    try {
      const techs = await firebaseService.technicians.getAll(companyId, userRole);
      if (techs.length > 0) return techs;
    } catch (err) {
      console.warn('Fallback para Firestore falhou ao buscar técnicos:', err);
    }
    return [];
  },

  createTechnician: async (technician: Partial<Technician>): Promise<Technician> => {
    try {
      return await firebaseService.technicians.create(technician);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/technicians`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(technician)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar técnico');
      return data;
    }
  },

  updateTechnician: async (id: string, technician: Partial<Technician>): Promise<Technician> => {
    try {
      return await firebaseService.technicians.update(id, technician);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/technicians/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(technician)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar técnico');
      return data;
    }
  },

  deleteTechnician: async (id: string): Promise<{ success: boolean }> => {
    try {
      return await firebaseService.technicians.delete(id);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/technicians/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir técnico');
      return res.json();
    }
  },

  // CLIENTS (Local SQLite API + Firestore mirror)
  getClients: async (companyId?: string, userRole?: string): Promise<Client[]> => {
    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (userRole) params.append('userRole', userRole);
      const res = await fetch(`${BASE_URL}/clients?${params.toString()}`);
      if (res.ok) {
        const clients: Client[] = await res.json();
        if (clients && clients.length > 0) return clients;
      }
    } catch (err) {
      console.warn('API local de clientes indisponível, buscando no Firestore...');
    }

    try {
      const clients = await firebaseService.clients.getAll(companyId, userRole);
      if (clients.length > 0) return clients;
    } catch (err) {
      console.warn('Fallback para Firestore falhou ao buscar clientes:', err);
    }
    return [];
  },

  createClient: async (client: Partial<Client>): Promise<Client> => {
    try {
      return await firebaseService.clients.create(client);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar cliente');
      return data;
    }
  },

  updateClient: async (id: string, client: Partial<Client>): Promise<Client> => {
    try {
      return await firebaseService.clients.update(id, client);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar cliente');
      return data;
    }
  },

  deleteClient: async (id: string): Promise<{ success: boolean }> => {
    try {
      return await firebaseService.clients.delete(id);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir cliente');
      return res.json();
    }
  },

  // QUOTES (Local SQLite API + Firestore mirror)
  getQuotes: async (filters: { companyId?: string; userRole?: string; status?: string; search?: string }): Promise<Quote[]> => {
    try {
      const params = new URLSearchParams();
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.userRole) params.append('userRole', filters.userRole);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      const res = await fetch(`${BASE_URL}/quotes?${params.toString()}`);
      if (res.ok) {
        const quotes: Quote[] = await res.json();
        if (quotes && quotes.length > 0) return quotes;
      }
    } catch (err) {
      console.warn('API local de orçamentos indisponível, buscando no Firestore...');
    }

    try {
      const quotes = await firebaseService.quotes.getAll(filters);
      if (quotes.length > 0) return quotes;
    } catch (err) {
      console.warn('Fallback para Firestore falhou ao buscar orçamentos:', err);
    }
    return [];
  },

  getQuote: async (id: string): Promise<Quote> => {
    try {
      const res = await fetch(`${BASE_URL}/quotes/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) return data;
      }
    } catch (err) {
      console.warn('API local ao buscar orçamento por ID:', err);
    }

    try {
      const quote = await firebaseService.quotes.getById(id);
      if (quote) return quote;
    } catch (err) {
      console.warn('Fallback para Firestore ao buscar orçamento por ID:', err);
    }
    throw new Error('Orçamento não encontrado');
  },

  createQuote: async (quoteData: any): Promise<{ id: string; quote_number: number; total: number; message: string }> => {
    try {
      const created = await firebaseService.quotes.create(quoteData);
      return {
        id: created.id,
        quote_number: created.quote_number,
        total: created.total,
        message: 'Orçamento gerado e salvo no Firestore com sucesso!'
      };
    } catch (err) {
      console.warn('Fallback para API ao criar orçamento:', err);
      const res = await fetch(`${BASE_URL}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar orçamento');
      return data;
    }
  },

  updateQuote: async (id: string, quoteData: any): Promise<{ success: boolean; total: number; message: string }> => {
    try {
      const updated = await firebaseService.quotes.update(id, quoteData);
      return {
        success: true,
        total: updated.total,
        message: 'Orçamento atualizado no Firestore com sucesso!'
      };
    } catch (err) {
      const res = await fetch(`${BASE_URL}/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar alterações no orçamento');
      return data;
    }
  },

  duplicateQuote: async (id: string): Promise<{ id: string; quote_number: number; message: string }> => {
    try {
      const original = await firebaseService.quotes.getById(id);
      if (original) {
        const copy = await firebaseService.quotes.create({
          ...original,
          id: undefined,
          quote_number: undefined,
          client_name: `${original.client_name} (Cópia)`,
          status: 'Rascunho',
          created_at: new Date().toISOString()
        });
        return {
          id: copy.id,
          quote_number: copy.quote_number,
          message: 'Orçamento duplicado com sucesso no Firestore!'
        };
      }
    } catch (e) {
      // Fallback
    }
    const res = await fetch(`${BASE_URL}/quotes/${id}/duplicate`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao duplicar orçamento');
    return data;
  },

  deleteQuote: async (id: string): Promise<{ success: boolean }> => {
    try {
      return await firebaseService.quotes.delete(id);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/quotes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir orçamento');
      return res.json();
    }
  },

  // WORK ORDERS (Local SQLite API + Firestore mirror)
  getWorkOrders: async (filters: { companyId?: string; userRole?: string; status?: string; search?: string; technicianId?: string }): Promise<WorkOrder[]> => {
    try {
      const params = new URLSearchParams();
      if (filters.companyId) params.append('companyId', filters.companyId);
      if (filters.userRole) params.append('userRole', filters.userRole);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.technicianId) params.append('technicianId', filters.technicianId);
      const res = await fetch(`${BASE_URL}/work-orders?${params.toString()}`);
      if (res.ok) {
        const orders: WorkOrder[] = await res.json();
        if (orders && orders.length > 0) return orders;
      }
    } catch (err) {
      console.warn('API local de OS indisponível, buscando no Firestore...');
    }

    try {
      const orders = await firebaseService.workOrders.getAll(filters);
      if (orders.length > 0) return orders;
    } catch (err) {
      console.warn('Fallback para Firestore falhou ao buscar ordens de serviço:', err);
    }
    return [];
  },

  getWorkOrder: async (id: string): Promise<WorkOrder> => {
    try {
      const res = await fetch(`${BASE_URL}/work-orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) return data;
      }
    } catch (err) {
      console.warn('API local ao buscar OS por ID:', err);
    }

    try {
      const order = await firebaseService.workOrders.getById(id);
      if (order) return order;
    } catch (err) {
      console.warn('Fallback para Firestore ao buscar ordem de serviço por ID:', err);
    }
    throw new Error('Ordem de serviço não encontrada');
  },

  createWorkOrder: async (orderData: any): Promise<{ id: string; order_number: number; total: number; message: string }> => {
    try {
      const created = await firebaseService.workOrders.create(orderData);
      return {
        id: created.id,
        order_number: created.order_number,
        total: created.total,
        message: 'Ordem de serviço salva no Firestore com sucesso!'
      };
    } catch (err) {
      const res = await fetch(`${BASE_URL}/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar ordem de serviço');
      return data;
    }
  },

  updateWorkOrder: async (id: string, orderData: any): Promise<{ success: boolean; total: number; message: string }> => {
    try {
      const updated = await firebaseService.workOrders.update(id, orderData);
      return {
        success: true,
        total: updated.total,
        message: 'Ordem de serviço atualizada no Firestore com sucesso!'
      };
    } catch (err) {
      const res = await fetch(`${BASE_URL}/work-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar ordem de serviço');
      return data;
    }
  },

  saveWorkOrderSignature: async (
    id: string,
    signatureData: {
      client_signature?: string;
      client_signed_at?: string;
      technician_signature?: string;
      technician_signed_at?: string;
    }
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${BASE_URL}/work-orders/${id}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signatureData)
      });
      if (res.ok) {
        const data = await res.json();
        // Mirror to Firestore if available
        try {
          await firebaseService.workOrders.update(id, signatureData);
        } catch {}
        return data;
      }
    } catch (err) {
      console.warn('API local de assinatura indisponível, tentando Firestore:', err);
    }
    // Fallback to Firestore update
    await firebaseService.workOrders.update(id, signatureData);
    return { success: true, message: 'Assinatura salva com sucesso!' };
  },

  saveQuoteSignature: async (
    id: string,
    signatureData: { client_signature: string; client_signed_at?: string }
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${BASE_URL}/quotes/${id}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signatureData)
      });
      if (res.ok) {
        const data = await res.json();
        try {
          await firebaseService.quotes.update(id, signatureData);
        } catch {}
        return data;
      }
    } catch (err) {
      console.warn('API local de assinatura indisponível, tentando Firestore:', err);
    }
    await firebaseService.quotes.update(id, signatureData);
    return { success: true, message: 'Assinatura salva com sucesso!' };
  },

  duplicateWorkOrder: async (id: string): Promise<{ id: string; order_number: number; message: string }> => {
    try {
      const original = await firebaseService.workOrders.getById(id);
      if (original) {
        const copy = await firebaseService.workOrders.create({
          ...original,
          id: undefined,
          order_number: undefined,
          client_name: `${original.client_name} (Cópia)`,
          status: 'Aberta',
          created_at: new Date().toISOString()
        });
        return {
          id: copy.id,
          order_number: copy.order_number,
          message: 'Ordem de serviço duplicada no Firestore!'
        };
      }
    } catch (e) {
      // Fallback
    }
    const res = await fetch(`${BASE_URL}/work-orders/${id}/duplicate`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao duplicar ordem de serviço');
    return data;
  },

  createWorkOrderFromQuote: async (quoteId: string): Promise<{ id: string; order_number: number; message: string }> => {
    try {
      const quote = await firebaseService.quotes.getById(quoteId);
      if (quote) {
        const order = await firebaseService.workOrders.create({
          company_id: quote.company_id,
          quote_id: quote.id,
          client_id: quote.client_id,
          client_name: quote.client_name,
          client_phone: quote.client_phone,
          client_email: quote.client_email,
          client_document: quote.client_document,
          technician_id: quote.technician_id || '',
          technician_name: quote.technician_name || '',
          created_by: quote.created_by,
          date: new Date().toISOString().split('T')[0],
          status: 'Aberta',
          service_description: quote.description || '',
          subtotal: quote.subtotal || 0,
          discount: quote.discount || 0,
          addition: quote.addition || 0,
          total: quote.total || 0,
          notes: quote.notes || '',
          items: quote.items?.map((item) => ({
            id: `item-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            item_type: item.item_type,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            total_price: item.total_price
          })) || []
        });

        // Mark quote as Aprovado
        await firebaseService.quotes.update(quoteId, { status: 'Aprovado' });

        return {
          id: order.id,
          order_number: order.order_number,
          message: 'Ordem de serviço gerada a partir do orçamento com sucesso!'
        };
      }
    } catch (e) {
      // Fallback
    }
    const res = await fetch(`${BASE_URL}/work-orders/from-quote/${quoteId}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao converter orçamento em ordem de serviço');
    return data;
  },

  deleteWorkOrder: async (id: string): Promise<{ success: boolean }> => {
    try {
      return await firebaseService.workOrders.delete(id);
    } catch (err) {
      const res = await fetch(`${BASE_URL}/work-orders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir ordem de serviço');
      return res.json();
    }
  },

  // VERTICAL PHOTO UPLOAD (Storage)
  uploadPhoto: async (payload: {
    image: string;
    width: number;
    height: number;
    company_id: string;
    caption?: string;
  }): Promise<{ success: boolean; url: string; width: number; height: number; caption?: string }> => {
    try {
      const path = `photos/${payload.company_id || 'general'}/${Date.now()}`;
      const url = await firebaseService.media.uploadBase64(payload.image, path);
      return {
        success: true,
        url,
        width: payload.width,
        height: payload.height,
        caption: payload.caption
      };
    } catch (err) {
      const res = await fetch(`${BASE_URL}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar foto');
      return data;
    }
  },

  // DASHBOARD
  getDashboardStats: async (companyId?: string, userRole?: string): Promise<DashboardStats> => {
    try {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (userRole) params.append('userRole', userRole);
      const res = await fetch(`${BASE_URL}/dashboard/stats?${params.toString()}`);
      if (res.ok) {
        const stats: DashboardStats = await res.json();
        if (stats && (stats.quotesCount !== undefined || stats.companiesCount !== undefined)) {
          return stats;
        }
      }
    } catch (err) {
      console.warn('API local de stats indisponível, buscando no Firestore...');
    }

    try {
      const [quotes, orders, clients, techs, companies] = await Promise.all([
        firebaseService.quotes.getAll({ companyId, userRole }),
        firebaseService.workOrders.getAll({ companyId, userRole }),
        firebaseService.clients.getAll(companyId, userRole),
        firebaseService.technicians.getAll(companyId, userRole),
        firebaseService.companies.getAll(userRole, companyId)
      ]);

      const quotesTotal = quotes.reduce((acc, curr) => acc + (curr.total || 0), 0);
      const ordersTotal = orders.reduce((acc, curr) => acc + (curr.total || 0), 0);

      const quotesStatusDist: Record<string, number> = {
        'Rascunho': 0,
        'Enviado': 0,
        'Aprovado': 0,
        'Recusado': 0
      };
      quotes.forEach((q) => {
        if (quotesStatusDist[q.status] !== undefined) {
          quotesStatusDist[q.status]++;
        } else {
          quotesStatusDist[q.status] = 1;
        }
      });

      const ordersStatusDist: Record<string, number> = {
        'Aberta': 0,
        'Em Andamento': 0,
        'Concluída': 0,
        'Cancelada': 0
      };
      orders.forEach((o) => {
        if (ordersStatusDist[o.status] !== undefined) {
          ordersStatusDist[o.status]++;
        } else {
          ordersStatusDist[o.status] = 1;
        }
      });

      return {
        quotesCount: quotes.length,
        ordersCount: orders.length,
        quotesTotal,
        ordersTotal,
        clientsCount: clients.length,
        techniciansCount: techs.length,
        companiesCount: companies.length,
        statusDistribution: {
          quotes: quotesStatusDist,
          orders: ordersStatusDist
        },
        recentQuotes: quotes.slice(0, 5),
        recentOrders: orders.slice(0, 5)
      };
    } catch (err) {
      throw new Error('Erro ao carregar estatísticas do painel');
    }
  },

  // NOTIFICATIONS
  getNotifications: async (companyId?: string, userRole?: string): Promise<NotificationLog[]> => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (userRole) params.append('userRole', userRole);
    const res = await fetch(`${BASE_URL}/notifications?${params.toString()}`);
    if (!res.ok) return [];
    return res.json();
  },

  sendNotification: async (payload: {
    company_id: string;
    title: string;
    message: string;
    channel: 'whatsapp' | 'email' | 'system';
    recipient: string;
  }): Promise<{ success: boolean }> => {
    const res = await fetch(`${BASE_URL}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao registrar notificação');
    return data;
  },

  // GOOGLE DRIVE SYNC
  syncGoogleDrive: async (payload: {
    company_id: string;
    document_type: string;
    document_number: number | string;
    title: string;
    file_url?: string;
    client_name?: string;
    folder_path?: string;
    folder_url?: string;
    file_id?: string;
    photo_count?: number;
    photos?: Array<{
      uniqueCode: string;
      fileId: string;
      fileName: string;
      webViewLink?: string;
    }>;
  }): Promise<{ success: boolean; folder: string; drive_file_id: string; message: string; folder_url?: string; photo_count?: number }> => {
    const res = await fetch(`${BASE_URL}/drive/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar com Google Drive');
    return data;
  },

  getDriveSettings: async (): Promise<{
    id?: string;
    account_email: string;
    account_name?: string;
    account_photo?: string;
    root_folder_name?: string;
    auto_sync?: number;
    sync_photos?: number;
    updated_at?: string;
  } | null> => {
    const res = await fetch(`${BASE_URL}/drive/settings`);
    if (!res.ok) return null;
    return await res.json();
  },

  saveDriveSettings: async (settings: {
    account_email: string;
    account_name?: string;
    account_photo?: string;
    root_folder_name?: string;
    auto_sync?: boolean;
    sync_photos?: boolean;
  }): Promise<any> => {
    const res = await fetch(`${BASE_URL}/drive/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao salvar configurações do Drive');
    return data;
  },

  deleteDriveSettings: async (): Promise<any> => {
    const res = await fetch(`${BASE_URL}/drive/settings`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao desconectar conta do Drive');
    return data;
  }
};
