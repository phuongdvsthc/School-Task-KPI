/**
 * Master Application Layout
 * Quản lý Sidebar, Header, chuyển đổi Tab nội dung, Modal cấu hình và Route synchronization
 * Quản lý trạng thái responsive và collapse của thanh điều hướng (Sidebar)
 */
import React, { useState, useEffect } from 'react';
import { Sidebar, NavTabId } from './Sidebar';
import { Header } from './Header';
import { DashboardView } from '../dashboard/DashboardView';
import { TaskList } from '../tasks/TaskList';
import { MetricEntryView } from '../metrics/MetricEntryView';
import { AdminLayout } from '../admin/AdminLayout';
import { PlaceholderView } from '../common/PlaceholderView';
import { DailyReportManager } from '../daily-reports/DailyReportManager';
import { SupabaseConfigModal } from '../config/SupabaseConfigModal';
import { SecurityView } from '../account/SecurityView';
import { useAuth } from '../../context/AuthContext';

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

export const AppLayout: React.FC = () => {
  // Sync tab with URL hash if present
  const getInitialTab = (): NavTabId => {
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    if (hash === 'metrics' || hash === 'metric') return 'metrics';
    if (hash === 'admin' || hash === 'admin/metrics') return 'admin';
    if (hash === 'tasks') return 'tasks';
    if (hash === 'kpis') return 'kpis';
    if (hash === 'reports') return 'reports';
    if (hash.startsWith('daily-reports')) return 'daily-reports';
    if (hash === 'account/security') return 'account/security';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<NavTabId>(getInitialTab);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Initialize Desktop Sidebar collapsed state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
    // Tablet default: collapsed (768 - 1023px)
    if (window.innerWidth >= 768 && window.innerWidth < 1024) {
      return true;
    }
    // Desktop default: expanded (>= 1024px)
    return false;
  });

  const { isAdmin, refreshProfile } = useAuth();

  // Listen to window hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      if (hash === 'metrics' || hash === 'metric') setActiveTab('metrics');
      else if (hash === 'admin' || hash === 'admin/metrics' || hash.startsWith('admin/')) setActiveTab('admin');
      else if (hash === 'tasks') setActiveTab('tasks');
      else if (hash === 'kpis') setActiveTab('kpis');
      else if (hash === 'reports') setActiveTab('reports');
      else if (hash.startsWith('daily-reports')) setActiveTab('daily-reports');
      else if (hash === 'account/security') setActiveTab('account/security');
      else if (hash === 'overview' || hash === '') setActiveTab('overview');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Handle window resize for adaptive collapse
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      // Close mobile drawer if resized to desktop
      if (width >= 768) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Safe fallback for restricted storage environments
      }
      return next;
    });
  };

  const handleSelectTab = (tab: NavTabId) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
  };

  // Đảm bảo nếu user không phải admin mà tab hiện tại là admin thì tự chuyển về overview
  const safeTab: NavTabId = activeTab === 'admin' && !isAdmin ? 'overview' : activeTab;

  return (
    <div id="app-container" className="flex min-h-screen bg-slate-100/70 antialiased overflow-x-hidden">
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={safeTab}
        onSelectTab={handleSelectTab}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content Viewport */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header
          activeTab={safeTab}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenConfigModal={() => setIsConfigModalOpen(true)}
        />

        <main id="main-content-viewport" className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {safeTab === 'overview' ? (
              <DashboardView onNavigateTab={handleSelectTab} />
            ) : safeTab === 'tasks' ? (
              <TaskList />
            ) : safeTab === 'metrics' ? (
              <MetricEntryView />
            ) : safeTab === 'daily-reports' ? (
              <DailyReportManager />
            ) : safeTab === 'account/security' ? (
              <SecurityView />
            ) : safeTab === 'admin' ? (
              <AdminLayout />
            ) : (
              <PlaceholderView tab={safeTab} onNavigateTab={handleSelectTab} />
            )}
          </div>
        </main>
      </div>

      {/* Supabase Connection Configuration Modal */}
      <SupabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onConfigSaved={() => {
          refreshProfile();
        }}
      />
    </div>
  );
};
