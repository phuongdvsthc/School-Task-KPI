/**
 * Sidebar Component
 * Cung cấp hệ thống Menu chính:
 * - Tổng quan (Dashboard)
 * - Công việc (Tasks)
 * - Chỉ số (Metrics)
 * - KPI (KPI)
 * - Báo cáo (Reports)
 * - Quản trị (Admin - Chỉ hiển thị cho admin)
 */
import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  BarChart3, 
  Target, 
  FileText, 
  ShieldCheck, 
  GraduationCap, 
  ChevronRight,
  LogOut,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSystemSettings } from '../../context/SystemSettingsContext';
import { systemSettingsService } from '../../services/system-settings.service';

export type NavTabId = 'overview' | 'tasks' | 'metrics' | 'kpis' | 'reports' | 'daily-reports' | 'admin' | 'account/security';

interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface MenuItem {
  id: NavTabId;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  hiddenForStaff?: boolean;
  badge?: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'overview',
    label: 'Tổng quan',
    icon: LayoutDashboard,
  },
  {
    id: 'tasks',
    label: 'Công việc',
    icon: CheckSquare,
  },
  {
    id: 'metrics',
    label: 'Chỉ số',
    icon: BarChart3,
    hiddenForStaff: true,
  },
  {
    id: 'kpis',
    label: 'KPI',
    icon: Target,
  },
  {
    id: 'daily-reports',
    label: 'Báo cáo hằng ngày',
    icon: FileText,
  },
  {
    id: 'reports',
    label: 'Tổng hợp',
    icon: BarChart3,
  },
  {
    id: 'admin',
    label: 'Quản trị',
    icon: ShieldCheck,
    adminOnly: true, // Yêu cầu: Menu Quản trị chỉ hiển thị cho admin
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { systemRole, isAdmin, primaryUnit, signOut } = useAuth();
  const { settings } = useSystemSettings();

  // Lọc menu theo phân quyền (Chỉ hiển thị Quản trị khi là admin)
  const visibleMenuItems = MENU_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.hiddenForStaff && systemRole === 'staff') return false;
    return true;
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          id="sidebar-backdrop"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* School / System Branding */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
          {settings?.logoPath ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-xs p-1 border border-slate-200 overflow-hidden">
              <img src={systemSettingsService.getSystemAssetPublicUrl(settings.logoSmallPath || settings.logoPath)} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-900 text-white shadow-xs">
              <GraduationCap className="h-6 w-6 text-indigo-200" />
            </div>
          )}
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-base font-semibold tracking-tight text-slate-900">
              {settings?.appName || 'School Task & KPI'}
            </span>
            <span className="truncate text-xs text-slate-500 font-medium">
              {settings?.organizationShortName || 'Quản lý hệ thống'}
            </span>
          </div>
        </div>

        {/* Unit Info Box */}
        {primaryUnit && (
          <div className="mx-4 mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-700 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {primaryUnit.name}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  Mã: {primaryUnit.code}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Menu Chức Năng
          </div>
          <nav className="space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-900 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-5 w-5 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.adminOnly && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        isActive ? 'bg-indigo-800 text-indigo-200' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Admin
                    </span>
                  )}
                  {isActive && !item.adminOnly && (
                    <ChevronRight className="h-4 w-4 text-indigo-300" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Role Info & Logout */}
        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
            <span className="text-slate-500">Vai trò:</span>
            <span className="font-semibold capitalize text-indigo-900">
              {systemRole || 'staff'}
            </span>
          </div>

          <button
            id="sidebar-logout-btn"
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
    </>
  );
};
