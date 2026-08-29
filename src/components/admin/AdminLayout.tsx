import React, { useState, useEffect } from 'react';
import { MetricAdminView } from './metrics/MetricAdminView';
import { UserManagementView } from './users/UserManagementView';
import { UserForm } from './users/UserForm';
import { OrganizationListView } from './organizations/OrganizationListView';
import { OrganizationFormView } from './organizations/OrganizationFormView';
import { SystemSettingsView } from './settings/SystemSettingsView';
import { ReportSourceAdminView } from './ReportSourceAdminView';

export const AdminLayout: React.FC = () => {
  // Routes:
  // admin/metrics
  // admin/metrics/new
  // admin/metrics/:id/edit
  // admin/users
  // admin/users/new
  // admin/users/:id/edit
  const [currentRoute, setCurrentRoute] = useState<'metrics' | 'users' | 'users/new' | 'users/edit' | 'orgs' | 'orgs/new' | 'orgs/edit' | 'settings'>('users');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash === 'admin/report-sources/new') {
        setCurrentRoute('report-sources/new');
      } else if (hash.startsWith('admin/report-sources/') && hash.endsWith('/edit')) {
        setCurrentRoute('report-sources/edit');
      } else if (hash === 'admin/report-sources') {
        setCurrentRoute('report-sources');
      } else if (hash.startsWith('admin/metrics')) {
        setCurrentRoute('metrics');
      } else if (hash === 'admin/users/new') {
        setCurrentRoute('users/new');
        setSelectedUserId(null);
      } else if (hash.startsWith('admin/users/') && hash.endsWith('/edit')) {
        const parts = hash.split('/');
        if (parts.length >= 3) {
          setSelectedUserId(parts[2]);
          setCurrentRoute('users/edit');
        }
      } else if (hash === 'admin/organization-units/new') {
        setCurrentRoute('orgs/new');
        setSelectedOrgId(null);
      } else if (hash.startsWith('admin/organization-units/') && hash.endsWith('/edit')) {
        const parts = hash.split('/');
        if (parts.length >= 3) {
          setSelectedOrgId(parts[2]);
          setCurrentRoute('orgs/edit');
        }
      } else if (hash === 'admin/organization-units') {
        setCurrentRoute('orgs');
      } else if (hash === 'admin/settings') {
        setCurrentRoute('settings');
      } else if (hash === 'admin/users' || hash === 'admin') {
        setCurrentRoute('users');
        setSelectedUserId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (currentRoute === 'metrics') {
    return (
      <div className="space-y-4">
        {/* Admin Tab Navigation */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        <a href="#/admin/users" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('users') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Quản lý Người dùng
        </a>
        <a href="#/admin/organization-units" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('orgs') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Cơ cấu tổ chức
        </a>
        <a href="#/admin/metrics" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute === 'metrics' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Quản lý Chỉ số
        </a>
        
        <a href="#/admin/report-sources" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('report-sources') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Kênh / Nguồn báo cáo
        </a>
<a href="#/admin/settings" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Cấu hình hệ thống
        </a>
      </div>
        <MetricAdminView />
      </div>
    );
  }

  
  if (currentRoute === 'orgs/new' || currentRoute === 'orgs/edit') {
    return <OrganizationFormView id={selectedOrgId || undefined} />;
  }

  if (currentRoute === 'orgs') {
    return (
      <div className="space-y-4">
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        <a href="#/admin/users" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('users') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Quản lý Người dùng
        </a>
        <a href="#/admin/organization-units" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('orgs') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Cơ cấu tổ chức
        </a>
        <a href="#/admin/metrics" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute === 'metrics' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Quản lý Chỉ số
        </a>
        
        <a href="#/admin/report-sources" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('report-sources') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Kênh / Nguồn báo cáo
        </a>
<a href="#/admin/settings" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Cấu hình hệ thống
        </a>
      </div>
        <OrganizationListView />
      </div>
    );
  }

  
  if (currentRoute === 'report-sources') {
    return (
      <div className="space-y-4">
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        <a href="#/admin/users" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('users') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Quản lý Người dùng
        </a>
        <a href="#/admin/organization-units" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('orgs') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Cơ cấu tổ chức
        </a>
        <a href="#/admin/metrics" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute === 'metrics' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Quản lý Chỉ số
        </a>
        <a href="#/admin/report-sources" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('report-sources') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Kênh / Nguồn báo cáo
        </a>
        <a href="#/admin/settings" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Cấu hình hệ thống
        </a>
      </div>
        <ReportSourceAdminView />
      </div>
    );
  }

  if (currentRoute === 'settings') {
    return (
      <div className="space-y-4">
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        <a href="#/admin/users" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('users') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Quản lý Người dùng
        </a>
        <a href="#/admin/organization-units" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('orgs') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Cơ cấu tổ chức
        </a>
        <a href="#/admin/metrics" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute === 'metrics' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Quản lý Chỉ số
        </a>
        
        <a href="#/admin/report-sources" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('report-sources') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Kênh / Nguồn báo cáo
        </a>
<a href="#/admin/settings" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Cấu hình hệ thống
        </a>
      </div>
        <SystemSettingsView />
      </div>
    );
  }

  if (currentRoute === 'users/new' || currentRoute === 'users/edit') {
    return <UserForm userId={selectedUserId} onBack={() => { window.location.hash = '/admin/users'; }} />;
  }

  return (
    <div className="space-y-4">
      {/* Admin Tab Navigation */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        <a href="#/admin/users" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('users') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Quản lý Người dùng
        </a>
        <a href="#/admin/organization-units" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('orgs') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Cơ cấu tổ chức
        </a>
        <a href="#/admin/metrics" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute === 'metrics' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Quản lý Chỉ số
        </a>
        
        <a href="#/admin/report-sources" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute.startsWith('report-sources') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Kênh / Nguồn báo cáo
        </a>
<a href="#/admin/settings" className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${currentRoute === 'settings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}>
          Cấu hình hệ thống
        </a>
      </div>
      <UserManagementView />
    </div>
  );
};
