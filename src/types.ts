export type UserRole = 'DEV' | 'GERENTE' | 'SUPERVISOR' | 'TÉCNICO' | 'ADM';

export interface User {
  id: string;
  company_id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  active: number;
  avatar_url?: string;
  created_at: string;
  company_name?: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  logo_url: string;
  logo_storage_path?: string;
  logo_updated_at?: string;
  primary_color?: string;
  active: number;
  created_at: string;
  quotes_count?: number;
  orders_count?: number;
  users_count?: number;
}

export interface Technician {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  email: string;
  role_title: string;
  active: number;
  created_at: string;
  company_name?: string;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  notes?: string;
  created_at: string;
}

export type QuoteStatus = 'Rascunho' | 'Enviado' | 'Aprovado' | 'Recusado';

export interface QuoteItem {
  id: string;
  quote_id?: string;
  item_type: 'servico' | 'material';
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

export interface QuotePhoto {
  id: string;
  quote_id?: string;
  company_id: string;
  url: string;
  caption?: string;
  width: number;
  height: number;
  created_at: string;
}

export interface Quote {
  id: string;
  company_id: string;
  quote_number: number;
  client_id: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  client_document?: string;
  technician_id?: string;
  technician_name?: string;
  created_by: string;
  date: string;
  validity_date?: string;
  status: QuoteStatus;
  description: string;
  address?: string;
  subtotal: number;
  discount: number;
  addition: number;
  total: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  client_signature?: string;
  client_signed_at?: string;
  items?: QuoteItem[];
  photos?: QuotePhoto[];
  company?: Company;
}

export type WorkOrderStatus = 'Aberta' | 'Em Andamento' | 'Concluída' | 'Cancelada';

export interface WorkOrderItem {
  id: string;
  work_order_id?: string;
  item_type: 'servico' | 'material';
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

export interface WorkOrderPhoto {
  id: string;
  work_order_id?: string;
  company_id: string;
  url: string;
  caption?: string;
  width: number;
  height: number;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  company_id: string;
  order_number: number;
  quote_id?: string;
  client_id: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  client_document?: string;
  technician_id: string;
  technician_name?: string;
  created_by: string;
  date: string;
  status: WorkOrderStatus;
  service_description: string;
  address?: string;
  notes?: string;
  subtotal: number;
  discount: number;
  addition: number;
  total: number;
  created_at: string;
  updated_at: string;
  client_signature?: string;
  client_signed_at?: string;
  technician_signature?: string;
  technician_signed_at?: string;
  items?: WorkOrderItem[];
  photos?: WorkOrderPhoto[];
  company?: Company;
}

export interface NotificationLog {
  id: string;
  company_id: string;
  title: string;
  message: string;
  channel: 'whatsapp' | 'email' | 'system';
  recipient: string;
  status: string;
  created_at: string;
}

export interface DashboardStats {
  quotesCount: number;
  ordersCount: number;
  quotesTotal: number;
  ordersTotal: number;
  clientsCount: number;
  techniciansCount: number;
  companiesCount?: number;
  statusDistribution: {
    quotes: Record<string, number>;
    orders: Record<string, number>;
  };
  recentQuotes: Quote[];
  recentOrders: WorkOrder[];
}

export interface ItemRow {
  id?: string;
  item_type: 'servico' | 'material';
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

export interface PhotoRecord {
  id?: string;
  url: string;
  caption?: string;
  width?: number;
  height?: number;
  created_at?: string;
}
