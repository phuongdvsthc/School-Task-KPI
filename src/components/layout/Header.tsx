/**
 * Header Component
 * Bao gồm:
 * - Breadcrumbs / Tiêu đề trang
 * - Nút mở menu mobile
 * - Hiển thị vai trò (Role Badge)
 * - Nút hồ sơ người dùng (User Profile)
 * - Nút kiểm tra / cấu hình Supabase
 */
import React, { useState, useMemo } from 'react';
import { 
  Menu, 
  User, 
  Shield, 
  Database,
  ChevronDown,
  LogOut,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSystemSettings } from '../../context/SystemSettingsContext';
import { NavTabId } from '../layout/Sidebar';
import { UserProfileModal } from '../profile/UserProfileModal';

interface HeaderProps {
  activeTab: NavTabId;
  onOpenMobileMenu: () => void;
  onOpenConfigModal: () => void;
}

const ROLE_BADGES: Record<string, { label: string; style: string }> = {
  admin: { label: 'Admin', style: 'bg-red-100 text-red-800 border-red-200' },
  executive: { label: 'Ban Giám Hiệu', style: 'bg-purple-100 text-purple-800 border-purple-200' },
  manager: { label: 'Trưởng Đơn Vị', style: 'bg-blue-100 text-blue-800 border-blue-200' },
  staff: { label: 'Cán Bộ / Giảng Viên', style: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  viewer: { label: 'Người Xem', style: 'bg-slate-100 text-slate-700 border-slate-200' },
  none: { label: 'Chưa phân quyền', style: 'bg-amber-100 text-amber-800 border-amber-200' },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  onOpenConfigModal,
}) => {
  const { profile, user, systemRole, signOut, isConfigured } = useAuth();
  const { settings } = useSystemSettings();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const TAB_TITLES = useMemo<Record<NavTabId, { title: string; subtitle: string }>>(() => ({
    'daily-reports': {
      title: 'Báo cáo hằng ngày',
      subtitle: 'Nhập và quản lý báo cáo công việc hằng ngày',
    },
    overview: {
      title: 'Tổng quan hệ thống',
      subtitle: `${settings?.appName || 'Nền tảng quản lý'} - ${settings?.organizationName || 'Trường học'}`,
    },
    tasks: {
      title: 'Quản lý công việc',
      subtitle: 'Giao việc, theo dõi tiến độ và phân công phòng ban',
    },
    metrics: {
      title: 'Chỉ số đo lường',
      subtitle: 'Hệ thống chỉ số vận hành và chất lượng đào tạo',
    },
    kpis: {
      title: 'Đánh giá KPI',
      subtitle: 'Theo dõi mục tiêu và kết quả thực hiện theo chu kỳ',
    },
    reports: {
      title: 'Báo cáo & Thống kê',
      subtitle: 'Báo cáo tổng hợp tiến độ và hiệu suất trường học',
    },
    admin: {
      title: 'Quản trị hệ thống',
      subtitle: 'Cấu hình đơn vị, phân quyền cán bộ và bảo mật',
    },
    'account/security': {
      title: 'Bảo mật tài khoản',
      subtitle: 'Quản lý thông tin đăng nhập và mật khẩu cá nhân',
    },
  }), [settings]);

  const currentTabInfo = TAB_TITLES[activeTab] || TAB_TITLES.overview;
  const roleBadge = systemRole ? (ROLE_BADGES[systemRole] || ROLE_BADGES.staff) : ROLE_BADGES.none;

  return (
    <>
      <header
        id="app-header"
        className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6"
      >
        {/* Left Side: Mobile Menu Button & Tab Title */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-menu-toggle-btn"
            onClick={onOpenMobileMenu}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Mở menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-col">
            <h1 className="text-base font-semibold text-slate-900 sm:text-lg">
              {currentTabInfo.title}
            </h1>
            <span className="hidden text-xs text-slate-500 sm:inline-block">
              {currentTabInfo.subtitle}
            </span>
          </div>
        </div>

        {/* Right Side: Database Connection Indicator & Profile Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Supabase Status Indicator */}
          <button
            id="supabase-status-btn"
            onClick={onOpenConfigModal}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isConfigured
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
            title="Cấu hình kết nối Supabase PostgreSQL"
          >
            <Database className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isConfigured ? 'Supabase: Đã kết nối' : 'Cấu hình Supabase'}
            </span>
          </button>

          {/* User Role Badge */}
          <div
            id="user-role-badge"
            className={`hidden items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold sm:flex ${roleBadge.style}`}
          >
            <Shield className="h-3 w-3" />
            <span>{roleBadge.label}</span>
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              id="user-dropdown-toggle-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-900 text-xs font-semibold text-white">
                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden max-w-[120px] truncate text-xs font-medium md:inline-block">
                {profile?.full_name || user?.email?.split('@')[0] || 'Tài khoản'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div
                  id="user-dropdown-menu"
                  className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
                >
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {profile?.full_name || 'Cán bộ'}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {profile?.email || user?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      id="view-profile-btn"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <User className="h-4 w-4 text-slate-500" />
                      <span>Xem hồ sơ chi tiết</span>
                    </button>
                    
                    <button
                      id="change-password-btn"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        window.location.hash = '#/account/security';
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Shield className="h-4 w-4 text-slate-500" />
                      <span>Đổi mật khẩu</span>
                    </button>

                    <button
                      id="open-config-btn"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenConfigModal();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-slate-500" />
                      <span>Cài đặt kết nối Database</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      id="header-logout-btn"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
