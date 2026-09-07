import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, Database, ShieldCheck } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (fillEmail: string, fillPass: string) => {
    setEmail(fillEmail);
    setPassword(fillPass);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Brand Banner */}
        <div className="bg-slate-950 px-8 pt-8 pb-7 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/10 rounded-full blur-2xl" />
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg mb-4">
            <FileText className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            CAST <span className="text-blue-500">QUOTE</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Plataforma Multiempresa de Gestão de Orçamentos e Ordens de Serviço
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Database className="w-3 h-3" />
            <span>Banco de Dados SQLite Ativo</span>
          </div>
        </div>

        {/* Form */}
        <div className="p-8">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-none" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@empresa.com.br"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 shadow-md transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <span>{loading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Access Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Acesso Rápido para Demonstração:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('ale11062@gmail.com', 'cast.2468')}
                className="text-left p-2 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 transition text-[11px]"
              >
                <div className="font-bold text-purple-900 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-700" />
                  <span>DEV Master</span>
                </div>
                <div className="text-purple-600 truncate text-[10px]">ale11062@...</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('adm@castengenharia.com.br', 'adm123')}
                className="text-left p-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 transition text-[11px]"
              >
                <div className="font-bold text-blue-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-700" />
                  <span>ADM Empresa</span>
                </div>
                <div className="text-blue-600 truncate text-[10px]">adm@cast...</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('gerente@castengenharia.com.br', 'gerente123')}
                className="text-left p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition text-[11px]"
              >
                <div className="font-bold text-slate-800">Gerente</div>
                <div className="text-slate-500 truncate text-[10px]">gerente@cast...</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('tecnico@castengenharia.com.br', 'tec123')}
                className="text-left p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition text-[11px]"
              >
                <div className="font-bold text-emerald-900">Técnico</div>
                <div className="text-emerald-600 truncate text-[10px]">tecnico@cast...</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
