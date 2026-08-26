import React, { useState, useEffect } from 'react';
import { MetricAdminView } from './metrics/MetricAdminView';
import { UserManagementView } from './users/UserManagementView';
import { UserForm } from './users/UserForm';

export const AdminLayout: React.FC = () => {
  // Routes:
  // admin/metrics
  // admin/metrics/new
  // admin/metrics/:id/edit
  // admin/users
  // admin/users/new
  // admin/users/:id/edit
  const [currentRoute, setCurrentRoute] = useState<'metrics' | 'users' | 'users/new' | 'users/edit'>('users');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash.startsWith('admin/metrics')) {
        setCurrentRoute('metrics'); // MetricAdminView handles its own sub-routing
      } else if (hash === 'admin/users/new') {
        setCurrentRoute('users/new');
        setSelectedUserId(null);
      } else if (hash.startsWith('admin/users/') && hash.endsWith('/edit')) {
        const parts = hash.split('/');
        if (parts.length >= 3) {
          setSelectedUserId(parts[2]);
          setCurrentRoute('users/edit');
        }
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
        <div className="flex border-b border-slate-200 mb-6">
          <a href="#/admin/users" className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent transition-colors">
            Quản lý Người dùng
          </a>
          <a href="#/admin/metrics" className="px-4 py-2 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600">
            Quản lý Chỉ số
          </a>
        </div>
        <MetricAdminView />
      </div>
    );
  }

  if (currentRoute === 'users/new' || currentRoute === 'users/edit') {
    return <UserForm userId={selectedUserId} onBack={() => { window.location.hash = '/admin/users'; }} />;
  }

  return (
    <div className="space-y-4">
      {/* Admin Tab Navigation */}
      <div className="flex border-b border-slate-200 mb-6">
        <a href="#/admin/users" className="px-4 py-2 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600">
          Quản lý Người dùng
        </a>
        <a href="#/admin/metrics" className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent transition-colors">
          Quản lý Chỉ số
        </a>
      </div>
      <UserManagementView />
    </div>
  );
};
