/**
 * Master Application Layout
 * Quản lý Sidebar, Header, chuyển đổi Tab nội dung, Modal cấu hình và Route synchronization
 */
import React, { useState, useEffect } from 'react';
import { Sidebar, NavTabId } from './Sidebar';
import { Header } from './Header';
import { DashboardView } from '../dashboard/DashboardView';
import { TaskList } from '../tasks/TaskList';
import { MetricEntryView } from '../metrics/MetricEntryView';
import { AdminLayout } from '../admin/AdminLayout';
import { PlaceholderView } from '../common/PlaceholderView';
import { SupabaseConfigModal } from '../config/SupabaseConfigModal';
import { SecurityView } from '../account/SecurityView';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  // Sync tab with URL hash if present
  const getInitialTab = (): NavTabId => {
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    if (hash === 'metrics' || hash === 'metric') return 'metrics';
    if (hash === 'admin' || hash === 'admin/metrics') return 'admin';
    if (hash === 'tasks') return 'tasks';
    if (hash === 'kpis') return 'kpis';
    if (hash === 'reports') return 'reports';
    if (hash === 'account/security') return 'account/security';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<NavTabId>(getInitialTab);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
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
      else if (hash === 'account/security') setActiveTab('account/security');
      else if (hash === 'overview' || hash === '') setActiveTab('overview');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectTab = (tab: NavTabId) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
  };

  // Đảm bảo nếu user không phải admin mà tab hiện tại là admin thì tự chuyển về overview
  const safeTab: NavTabId = activeTab === 'admin' && !isAdmin ? 'overview' : activeTab;

  return (
    <div id="app-container" className="flex min-h-screen bg-slate-100/70">
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={safeTab}
        onSelectTab={handleSelectTab}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
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
