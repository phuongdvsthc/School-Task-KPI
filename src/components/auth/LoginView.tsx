/**
 * Login View
 * Đăng nhập an toàn bằng email/password qua Supabase Auth
 */
import React, { useState } from 'react';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Database,
  ShieldCheck,
  Building2,
  SlidersHorizontal,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SupabaseConfigModal } from '../config/SupabaseConfigModal';

export const LoginView: React.FC = () => {
  const { signIn, isConfigured, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setFormError('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(cleanEmail, password);
    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.error || 'Đăng nhập không thành công.');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Left Column: School Platform Branding & Architecture Note */}
      <div className="hidden flex-1 flex-col justify-between border-r border-slate-800 bg-slate-950/80 p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Hệ Thống Quản Trị Học Đường
            </h1>
            <p className="text-xs text-slate-400">
              Công việc • KPI • Báo cáo tổng hợp
            </p>
          </div>
        </div>

        <div className="space-y-6 max-w-lg">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
              <Database className="h-3.5 w-3.5" /> Supabase PostgreSQL Database
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Nền tảng Quản lý Hiệu suất & Nhiệm vụ Trường học
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Tích hợp trực tiếp với cơ sở dữ liệu Supabase PostgreSQL: bảng <code className="text-indigo-300 font-mono text-xs">profiles</code>, <code className="text-indigo-300 font-mono text-xs">organization_units</code>, <code className="text-indigo-300 font-mono text-xs">organization_members</code>, <code className="text-indigo-300 font-mono text-xs">metric_definitions</code>, <code className="text-indigo-300 font-mono text-xs">metric_entries</code>.
            </p>
          </div>

          {/* Security & Roles Note */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              Kiểm soát phân quyền theo bảng profiles (system_role):
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-red-950 text-red-300 border border-red-800/50 px-2.5 py-1 font-mono font-medium">admin</span>
              <span className="rounded-md bg-purple-950 text-purple-300 border border-purple-800/50 px-2.5 py-1 font-mono font-medium">executive</span>
              <span className="rounded-md bg-blue-950 text-blue-300 border border-blue-800/50 px-2.5 py-1 font-mono font-medium">manager</span>
              <span className="rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/50 px-2.5 py-1 font-mono font-medium">staff</span>
              <span className="rounded-md bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 font-mono font-medium">viewer</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800 pt-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span>Phần mềm quản trị nội bộ nhà trường</span>
          </div>
          <span>Bảo mật Supabase Auth & RLS</span>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2.5 sm:hidden mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span className="text-base font-bold text-white">Quản Trị Học Đường</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Đăng nhập hệ thống
            </h2>
            <p className="text-xs text-slate-400">
              Nhập tài khoản email và mật khẩu được cấp trên Supabase Auth
            </p>
          </div>

          {/* Supabase Status Banner */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isConfigured
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                }`}
              />
              <span className="text-slate-300 font-medium">
                {isConfigured ? 'Supabase: Đã thiết lập cấu hình' : 'Supabase: Chưa thiết lập cấu hình'}
              </span>
            </div>
            <button
              type="button"
              id="open-config-btn-login"
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Cài đặt kết nối</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div
                id="login-error-banner"
                className="flex items-start gap-2.5 rounded-xl border border-red-900/50 bg-red-950/50 p-3.5 text-xs text-red-200"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                <div className="flex-1">
                  <p className="font-semibold text-red-200">Đăng nhập thất bại</p>
                  <p className="mt-0.5 text-red-300 leading-relaxed">{formError}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email tài khoản Supabase
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  id="input-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@truonghoc.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  id="input-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              id="submit-login-btn"
              type="submit"
              disabled={isSubmitting || isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang kết nối Supabase Auth...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>Đăng nhập hệ thống</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Supabase Config Modal */}
      <SupabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
};
