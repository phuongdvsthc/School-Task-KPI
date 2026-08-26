import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, Search, Plus, Filter, MoreVertical, 
  Edit, Shield, Building2, UserX, CheckCircle, XCircle,
  Lock, Unlock, Trash2, AlertTriangle
} from 'lucide-react';
import { userService, UserManagementData } from '../../../services/userService';
import { SystemRole, MemberRole } from '../../../types/database';
import { useAuth } from '../../../context/AuthContext';

const ROLE_LABELS: Record<SystemRole, string> = {
  admin: 'Quản trị hệ thống',
  executive: 'Ban giám hiệu',
  manager: 'Quản lý đơn vị',
  staff: 'Nhân viên',
  viewer: 'Chỉ xem',
};

const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  head: 'Trưởng đơn vị',
  deputy: 'Phó đơn vị',
  lead: 'Tổ trưởng',
  member: 'Thành viên',
  secretary: 'Thư ký',
  viewer: 'Chỉ xem',
};

export const UserManagementView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserManagementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');

  // Modal states
  const [userToDelete, setUserToDelete] = useState<UserManagementData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLock = async (targetUser: UserManagementData) => {
    if (currentUser?.id === targetUser.id) {
      setError('Bạn không thể khóa hoặc mở khóa tài khoản của chính mình.');
      return;
    }
    
    setActionLoading(targetUser.id);
    setError(null);
    setActionSuccess(null);
    try {
      let res;
      if (targetUser.is_active) {
        res = await userService.deactivateUser(targetUser.id);
      } else {
        res = await userService.activateUser(targetUser.id);
      }

      if (!res.success) {
        setError(res.error || 'Đã có lỗi xảy ra.');
      } else {
        setActionSuccess(targetUser.is_active ? `Đã khóa tài khoản của ${targetUser.full_name}.` : `Đã mở khóa tài khoản của ${targetUser.full_name}.`);
        await loadUsers();
      }
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    if (currentUser?.id === userToDelete.id) {
      setError('Bạn không thể tự xóa chính mình.');
      setUserToDelete(null);
      return;
    }

    setActionLoading('deleting');
    setError(null);
    setActionSuccess(null);

    try {
      const res = await userService.deleteUser(userToDelete.id);
      if (!res.success) {
        setError(res.error || 'Lỗi xóa tài khoản.');
      } else {
        setActionSuccess(`Đã xóa vĩnh viễn tài khoản của ${userToDelete.full_name}.`);
        await loadUsers();
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi xóa tài khoản.');
    } finally {
      setActionLoading(null);
      setUserToDelete(null);
    }
  };

  // Get unique organizations for the filter dropdown
  const uniqueOrgs = useMemo(() => {
    const orgs = new Map();
    users.forEach(u => {
      if (u.primary_unit) {
        orgs.set(u.primary_unit.id, u.primary_unit.name);
      }
    });
    return Array.from(orgs.entries()).map(([id, name]) => ({ id, name }));
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        u.full_name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower) ||
        (u.employee_code && u.employee_code.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      // Role filter
      if (roleFilter !== 'all' && u.system_role !== roleFilter) return false;

      // Active filter
      if (activeFilter === 'active' && !u.is_active) return false;
      if (activeFilter === 'inactive' && u.is_active) return false;

      // Org filter
      if (orgFilter !== 'all' && u.primary_unit?.id !== orgFilter) return false;

      return true;
    });
  }, [users, search, roleFilter, activeFilter, orgFilter]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="text-sm font-medium text-slate-500">Đang tải dữ liệu người dùng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Quản lý Người dùng
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý danh sách nhân sự, chức danh và phân quyền hệ thống.
          </p>
        </div>
        <button
          onClick={() => { window.location.hash = '/admin/users/new'; }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Thêm người dùng
        </button>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm theo tên, email, mã NV..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full rounded-lg border-0 py-2 pl-10 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  className="block w-full sm:w-48 rounded-lg border-0 py-2 pl-3 pr-8 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                >
                  <option value="all">Tất cả Đơn vị</option>
                  {uniqueOrgs.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="block w-full sm:w-40 rounded-lg border-0 py-2 pl-3 pr-8 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                >
                  <option value="all">Tất cả Quyền</option>
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="block w-full sm:w-40 rounded-lg border-0 py-2 pl-3 pr-8 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                >
                  <option value="all">Tất cả Trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Đã khóa</option>
                </select>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Nhân sự
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Đơn vị chính
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Phân quyền
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold">
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-slate-900">{user.full_name}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                          {user.employee_code && (
                            <div className="text-[11px] text-slate-400 mt-0.5">Mã NV: {user.employee_code}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.primary_unit ? (
                        <div>
                          <div className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                            {user.primary_unit.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {user.member_role ? MEMBER_ROLE_LABELS[user.member_role] || user.member_role : 'Chưa phân vai trò'}
                            {user.job_title ? ` • ${user.job_title}` : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Chưa phân công</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        <Shield className="h-3 w-3 text-slate-500" />
                        {ROLE_LABELS[user.system_role] || user.system_role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          <CheckCircle className="h-3 w-3" />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                          <XCircle className="h-3 w-3" />
                          Đã khóa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { window.location.hash = `/admin/users/${user.id}/edit`; }}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors"
                          title="Sửa thông tin"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleToggleLock(user)}
                          disabled={actionLoading === user.id || currentUser?.id === user.id}
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_active 
                              ? 'text-amber-600 hover:text-amber-900 bg-amber-50 hover:bg-amber-100' 
                              : 'text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100'
                          } disabled:opacity-50`}
                          title={user.is_active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                        >
                          {actionLoading === user.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : user.is_active ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Unlock className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          onClick={() => setUserToDelete(user)}
                          disabled={currentUser?.id === user.id}
                          className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Action Success Toast */}
      {actionSuccess && (
        <div className="fixed bottom-4 right-4 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg shadow-lg border border-emerald-200 flex items-center gap-3">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium text-sm">{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="ml-2">
            <XCircle className="h-4 w-4 opacity-50 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Xóa tài khoản vĩnh viễn</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của <strong>{userToDelete.full_name}</strong>? 
                  Hành động này không thể hoàn tác.
                </p>
                {error && actionLoading === 'deleting' && (
                   <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={actionLoading === 'deleting'}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={actionLoading === 'deleting'}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === 'deleting' ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang xóa...
                  </>
                ) : (
                  'Xác nhận xóa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
