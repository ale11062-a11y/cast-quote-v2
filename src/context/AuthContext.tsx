import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Company, UserRole } from '../types';
import { api } from '../services/api';
import { applyBrandTheme, getStoredBrandColor } from '../utils/brandTheme';

interface AuthContextType {
  user: User | null;
  activeCompany: Company | null;
  companies: Company[];
  token: string | null;
  brandColor: string;
  updateBrandColor: (color: string) => Promise<void>;
  updateCompanyBranding: (color: string, logoUrl?: string, storagePath?: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchCompany: (companyId: string | null) => Promise<void>;
  refreshCompanies: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isDev: boolean;
  isDevIndependent: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSupervisor: boolean;
  isTech: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cast_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeCompany, setActiveCompany] = useState<Company | null>(() => {
    const savedUser = localStorage.getItem('cast_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.role === 'DEV') {
          // Dev is independent by default, only use saved company if explicitly set
          const savedComp = localStorage.getItem('cast_company');
          return savedComp ? JSON.parse(savedComp) : null;
        }
      } catch {
        // ignore parse error
      }
    }
    const saved = localStorage.getItem('cast_company');
    return saved ? JSON.parse(saved) : null;
  });

  const isDev = user?.role === 'DEV';
  const isDevIndependent = isDev && !activeCompany;

  const [brandColor, setBrandColor] = useState<string>(() => {
    if (activeCompany?.primary_color) return activeCompany.primary_color;
    return getStoredBrandColor();
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('cast_token');
  });

  const [companies, setCompanies] = useState<Company[]>([]);

  // Apply brand theme to CSS variables on boot and whenever activeCompany changes
  useEffect(() => {
    const targetColor = activeCompany?.primary_color || (isDevIndependent ? '#7c3aed' : getStoredBrandColor());
    setBrandColor(targetColor);
    applyBrandTheme(targetColor);
  }, [activeCompany?.id, activeCompany?.primary_color, isDevIndependent]);

  const updateCompanyBranding = async (newColor: string, newLogoUrl?: string, storagePath?: string) => {
    const color = newColor ? (newColor.startsWith('#') ? newColor : `#${newColor}`) : brandColor;
    setBrandColor(color);
    applyBrandTheme(color);

    if (activeCompany) {
      const updatedCompany: Company = {
        ...activeCompany,
        primary_color: color,
        logo_url: newLogoUrl !== undefined ? newLogoUrl : activeCompany.logo_url,
        logo_storage_path: storagePath !== undefined ? storagePath : activeCompany.logo_storage_path,
        logo_updated_at: new Date().toISOString()
      };
      setActiveCompany(updatedCompany);
      localStorage.setItem('cast_company', JSON.stringify(updatedCompany));
      setCompanies(prev => prev.map(c => (c.id === activeCompany.id ? updatedCompany : c)));

      try {
        await api.updateCompanyBranding(activeCompany.id, color, newLogoUrl, storagePath);
      } catch (err) {
        console.error('Erro ao persistir branding da empresa no banco de dados:', err);
      }
    }
  };

  const updateBrandColor = async (newColor: string) => {
    return updateCompanyBranding(newColor, activeCompany?.logo_url);
  };

  const refreshCompanies = async () => {
    try {
      if (!user) return;
      const comps = await api.getCompanies(user.role, user.company_id);
      setCompanies(comps);

      // Non-DEV users must be bound to their respective company.
      // DEV users are completely independent: activeCompany remains null unless explicitly chosen.
      if (user.role !== 'DEV' && comps.length > 0) {
        if (!activeCompany || !comps.find(c => c.id === activeCompany.id)) {
          const target = comps[0];
          setActiveCompany(target);
          localStorage.setItem('cast_company', JSON.stringify(target));
        }
      } else if (user.role === 'DEV' && activeCompany) {
        // If DEV had chosen a company that no longer exists, reset back to independent
        if (!comps.find(c => c.id === activeCompany.id)) {
          setActiveCompany(null);
          localStorage.removeItem('cast_company');
        }
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  };

  useEffect(() => {
    if (user) {
      refreshCompanies();
    }
  }, [user?.id, user?.company_id]);

  const login = async (email: string, pass: string) => {
    const data = await api.login(email, pass);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('cast_user', JSON.stringify(data.user));
    localStorage.setItem('cast_token', data.token);

    if (data.user.role === 'DEV') {
      // DEV is independent of any company
      setActiveCompany(null);
      localStorage.removeItem('cast_company');
    } else {
      setActiveCompany(data.company);
      if (data.company) {
        localStorage.setItem('cast_company', JSON.stringify(data.company));
      }
    }

    // Fetch company list for user
    const comps = await api.getCompanies(data.user.role, data.user.company_id);
    setCompanies(comps);
  };

  const logout = () => {
    setUser(null);
    setActiveCompany(null);
    setToken(null);
    localStorage.removeItem('cast_user');
    localStorage.removeItem('cast_company');
    localStorage.removeItem('cast_token');
  };

  const switchCompany = async (companyId: string | null) => {
    if (user?.role !== 'DEV') return;
    if (!companyId || companyId === 'ALL') {
      // Switch back to independent global mode
      setActiveCompany(null);
      localStorage.removeItem('cast_company');
      return;
    }
    const found = companies.find(c => c.id === companyId);
    if (found) {
      setActiveCompany(found);
      localStorage.setItem('cast_company', JSON.stringify(found));
    }
  };

  const isAdmin = user?.role === 'ADM' || isDev;
  const isManager = user?.role === 'GERENTE' || isAdmin;
  const isSupervisor = user?.role === 'SUPERVISOR' || isManager;
  const isTech = user?.role === 'TÉCNICO';

  const hasPermission = (perm: string): boolean => {
    if (isDev) return true;
    switch (perm) {
      case 'manage_companies':
        return isDev;
      case 'manage_users':
        return isManager;
      case 'manage_technicians':
        return isManager;
      case 'manage_clients':
        return isSupervisor;
      case 'create_quotes':
        return isSupervisor;
      case 'edit_quotes':
        return isSupervisor;
      case 'delete_quotes':
        return isAdmin;
      case 'create_orders':
        return true; // Techs can also create OS in the field
      case 'edit_orders':
        return true;
      case 'delete_orders':
        return isAdmin;
      case 'view_financial_dashboard':
        return isManager;
      default:
        return true;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeCompany,
        companies,
        token,
        brandColor,
        updateBrandColor,
        updateCompanyBranding,
        login,
        logout,
        switchCompany,
        refreshCompanies,
        hasPermission,
        isDev,
        isDevIndependent,
        isAdmin,
        isManager,
        isSupervisor,
        isTech,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
