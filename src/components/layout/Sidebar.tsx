/**
 * Sidebar Component
 * Cung cấp hệ thống Menu chính:
 * - Tổng quan (Dashboard)
 * - Công việc (Tasks)
 * - KPI (KPI)
 * - Báo cáo hằng ngày (Daily Reports)
 * - Tổng hợp (Reports)
 * - Quản trị (Admin - Chỉ hiển thị cho admin)
 *
 * Hỗ trợ 2 trạng thái Desktop:
 * - Expanded (~280px): Đầy đủ icon + text + thông tin đơn vị
 * - Collapsed (~80px): Tối ưu diện tích, hiển thị icon + floating tooltip khi hover
 *
 * Hỗ trợ Mobile Drawer:
 * - Dưới 768px: Drawer trượt từ bên trái, có backdrop, nút X và tự động đóng khi chọn menu
 */
import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Target, 
  FileText, 
  BarChart3,
  ShieldCheck, 
  GraduationCap, 
  ChevronRight,
  LogOut,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  X
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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface MenuItem {
  id: NavTabId;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  badge?: string;
}

// Danh mục Menu chính - Đã ẩn menu "Chỉ số" cho toàn bộ các vai trò
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
    adminOnly: true, // Menu Quản trị chỉ hiển thị cho admin
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { systemRole, isAdmin, primaryUnit, signOut } = useAuth();
  const { settings } = useSystemSettings();

  // Lọc menu theo phân quyền (Chỉ hiển thị Quản trị khi là admin)
  const visibleMenuItems = MENU_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const logoSrc = settings?.logoSmallPath 
    ? systemSettingsService.getSystemAssetPublicUrl(settings.logoSmallPath)
    : settings?.logoPath 
    ? systemSettingsService.getSystemAssetPublicUrl(settings.logoPath) 
    : null;

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          id="sidebar-backdrop"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/90 bg-white shadow-[1px_0_4px_rgba(0,0,0,0.02)] transition-all duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 w-72 sm:w-80 shadow-2xl' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-72'}`}
      >
        {/* Top Header: Branding & Toggle Button */}
        <div className={`flex h-16 items-center border-b border-slate-200/80 px-4 ${
          isCollapsed ? 'md:justify-center md:px-2' : 'justify-between'
        }`}>
          {/* Logo & App Name */}
          <div className={`flex items-center gap-3 overflow-hidden ${
            isCollapsed ? 'md:hidden' : 'flex'
          }`}>
            {logoSrc ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-xs p-1 border border-slate-200 overflow-hidden">
                <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-900 text-white shadow-xs">
                <GraduationCap className="h-6 w-6 text-indigo-200" />
              </div>
            )}
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="truncate text-sm font-bold tracking-tight text-slate-900">
                {settings?.appName || 'School Task & KPI'}
              </span>
              <span className="truncate text-[11px] text-slate-500 font-medium">
                {settings?.organizationShortName || settings?.organizationName || 'Quản lý hệ thống'}
              </span>
            </div>
          </div>

          {/* Collapsed Mode Logo (Desktop Only) */}
          {isCollapsed && (
            <div className="hidden md:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 border border-slate-200 overflow-hidden shadow-xs" title={settings?.appName || 'School Task & KPI'}>
              {logoSrc ? (
                <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-lg bg-indigo-900 text-white font-bold text-sm">
                  {settings?.organizationShortName?.charAt(0) || 'S'}
                </div>
              )}
            </div>
          )}

          {/* Desktop Toggle Button (Visible on expanded desktop or top hover) */}
          <button
            id="desktop-sidebar-toggle-btn"
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            title={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            className={`hidden md:flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors ${
              isCollapsed ? 'mt-2' : ''
            }`}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            id="mobile-sidebar-close-btn"
            type="button"
            onClick={onCloseMobile}
            aria-label="Đóng thanh điều hướng"
            className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Unit Info Box */}
        {primaryUnit && !isCollapsed && (
          <div className="mx-4 mt-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100/70 text-indigo-800">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800" title={primaryUnit.name}>
                  {primaryUnit.name}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  Mã: {primaryUnit.code}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed Unit Icon indicator */}
        {primaryUnit && isCollapsed && (
          <div className="hidden md:flex justify-center mt-3">
            <div 
              className="group relative flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Building2 className="h-4 w-4" />
              {/* Tooltip */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap pointer-events-none">
                <span className="font-semibold">{primaryUnit.name}</span>
                <span className="text-[10px] text-slate-400">Mã: {primaryUnit.code}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <div className={`flex-1 overflow-y-auto py-3 ${isCollapsed ? 'md:px-2 px-4' : 'px-4'}`}>
          {!isCollapsed && (
            <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Menu Chức Năng
            </div>
          )}

          <nav className="space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <div key={item.id} className="relative group">
                  <button
                    id={`nav-item-${item.id}`}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group/btn flex w-full items-center rounded-xl text-sm font-medium transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      isCollapsed 
                        ? 'md:justify-center md:px-0 md:h-11 justify-between px-3 py-2.5' 
                        : 'justify-between px-3 py-2.5'
                    } ${
                      isActive
                        ? 'bg-indigo-900 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className={`flex items-center gap-3 ${isCollapsed ? 'md:justify-center' : ''}`}>
                      <Icon
                        className={`h-5 w-5 shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-500 group-hover/btn:text-slate-800'
                        }`}
                      />
                      <span className={isCollapsed ? 'md:hidden inline' : 'inline'}>
                        {item.label}
                      </span>
                    </div>

                    {/* Admin Badge & Chevron (expanded mode) */}
                    <div className={`flex items-center gap-1.5 ${isCollapsed ? 'md:hidden' : 'flex'}`}>
                      {item.adminOnly && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isActive ? 'bg-indigo-800 text-indigo-200' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          Admin
                        </span>
                      )}
                      {isActive && !item.adminOnly && (
                        <ChevronRight className="h-4 w-4 text-indigo-300" />
                      )}
                    </div>
                  </button>

                  {/* Floating Hover Tooltip (Collapsed Desktop Mode) */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden md:group-hover:flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none">
                      <span>{item.label}</span>
                      {item.adminOnly && (
                        <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[10px] font-semibold text-amber-300">
                          Admin
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Role Info & Logout */}
        <div className={`border-t border-slate-200/80 p-3 ${isCollapsed ? 'md:p-2' : 'p-4'}`}>
          {!isCollapsed && (
            <div className="mb-2.5 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs border border-slate-100">
              <span className="text-slate-500 font-medium">Vai trò:</span>
              <span className="font-semibold capitalize text-indigo-900">
                {systemRole || 'staff'}
              </span>
            </div>
          )}

          {/* Logout Button */}
          <div className="relative group">
            <button
              id="sidebar-logout-btn"
              type="button"
              onClick={signOut}
              aria-label={`Đăng xuất (${systemRole || 'Cán bộ'})`}
              className={`flex w-full items-center rounded-xl border border-slate-200 font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 transition-colors ${
                isCollapsed 
                  ? 'md:justify-center md:h-10 md:p-0 justify-center gap-2 px-3 py-2 text-sm' 
                  : 'justify-center gap-2 px-3 py-2 text-sm'
              }`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className={isCollapsed ? 'md:hidden inline' : 'inline'}>Đăng xuất</span>
            </button>

            {/* Logout Tooltip for Collapsed Desktop */}
            {isCollapsed && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden md:group-hover:flex items-center px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none">
                <span>Đăng xuất ({systemRole || 'staff'})</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
