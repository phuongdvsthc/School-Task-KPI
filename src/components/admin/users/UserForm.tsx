import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, AlertCircle, CheckCircle, Key } from 'lucide-react';
import { userService, UserManagementData, CreateUserData, UpdateUserData } from '../../../services/userService';
import { organizationService } from '../../../services/organizationService';
import { OrganizationUnit, SystemRole, MemberRole } from '../../../types/database';
import { useAuth } from '../../../context/AuthContext';

interface UserFormProps {
  userId: string | null;
  onBack: () => void;
}

const SYSTEM_ROLES: { value: SystemRole; label: string; desc: string }[] = [
  { value: 'admin', label: 'Quản trị hệ thống', desc: 'Toàn quyền cấu hình' },
  { value: 'executive', label: 'Ban giám hiệu', desc: 'Xem báo cáo toàn diện & Phê duyệt KPI' },
  { value: 'manager', label: 'Quản lý đơn vị', desc: 'Quản lý công việc & KPI đơn vị' },
  { value: 'staff', label: 'Nhân viên', desc: 'Báo cáo chỉ số & Thực hiện công việc' },
  { value: 'viewer', label: 'Chỉ xem', desc: 'Chỉ xem dữ liệu được phân quyền' },
];

const MEMBER_ROLES: { value: MemberRole; label: string }[] = [
  { value: 'head', label: 'Trưởng đơn vị' },
  { value: 'deputy', label: 'Phó đơn vị' },
  { value: 'lead', label: 'Tổ trưởng' },
  { value: 'member', label: 'Thành viên' },
  { value: 'secretary', label: 'Thư ký' },
  { value: 'viewer', label: 'Chỉ xem' },
];

export const UserForm: React.FC<UserFormProps> = ({ userId, onBack }) => {
  const { user: currentUser } = useAuth();
  const isEdit = Boolean(userId);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [units, setUnits] = useState<OrganizationUnit[]>([]);

  // Form State
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [systemRole, setSystemRole] = useState<SystemRole>('staff');
  const [isActive, setIsActive] = useState(true);
  const [orgUnitId, setOrgUnitId] = useState('');
  const [memberRole, setMemberRole] = useState<MemberRole>('member');

  // Reset password states
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const unitsRes = await organizationService.getUnits(true);
      setUnits(unitsRes);

      if (isEdit && userId) {
        const user = await userService.getUserById(userId);
        if (!user) throw new Error('Không tìm thấy thông tin người dùng');
        
        setEmail(user.email);
        setFullName(user.full_name);
        setEmployeeCode(user.employee_code || '');
        setJobTitle(user.job_title || '');
        setSystemRole(user.system_role);
        setIsActive(user.is_active);
        
        if (user.primary_unit) {
          setOrgUnitId(user.primary_unit.id);
          setMemberRole(user.member_role || 'member');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    if (newPassword.length < 8) {
      setResetError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setResetting(true);
    setResetError(null);

    try {
      const res = await userService.resetUserPassword(userId, newPassword);
      if (!res.success) {
        setResetError(res.error || 'Lỗi đặt lại mật khẩu.');
      } else {
        setShowResetModal(false);
        setSuccess('Đặt lại mật khẩu thành công.');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setResetError(err.message || 'Lỗi mạng khi kết nối máy chủ.');
    } finally {
      setResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (isEdit) {
        if (!userId) throw new Error('Thiếu ID người dùng');
        const updateData: UpdateUserData = {
          full_name: fullName,
          employee_code: employeeCode || undefined,
          job_title: jobTitle || undefined,
          system_role: systemRole,
          is_active: isActive,
          organization_unit_id: orgUnitId || undefined,
          member_role: orgUnitId ? memberRole : undefined,
        };
        const res = await userService.updateUser(userId, updateData);
        if (!res.success) throw new Error(res.error);
        setSuccess('Đã cập nhật thông tin người dùng thành công.');
      } else {
        if (!temporaryPassword) throw new Error('Vui lòng nhập mật khẩu tạm thời');
        const createData: CreateUserData = {
          email,
          temporary_password: temporaryPassword,
          full_name: fullName,
          employee_code: employeeCode || undefined,
          job_title: jobTitle || undefined,
          system_role: systemRole,
          is_active: isActive,
          organization_unit_id: orgUnitId || undefined,
          member_role: orgUnitId ? memberRole : undefined,
        };
        const res = await userService.createUser(createData);
        if (!res.success) throw new Error(res.error);
        setSuccess('Đã tạo người dùng mới thành công.');
        // Reset form for new creation or navigate back
        setTimeout(() => {
          onBack();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-200 transition-colors text-slate-500"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {isEdit ? 'Sửa thông tin Người dùng' : 'Thêm Người dùng mới'}
          </h2>
          <p className="text-xs text-slate-500">
            {isEdit ? `Chỉnh sửa hồ sơ và phân quyền của ${fullName}` : 'Tạo tài khoản và phân quyền truy cập hệ thống'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 border border-red-200 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 border border-emerald-200 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cột 1: Thông tin cá nhân */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Thông tin Cá nhân & Đăng nhập</h3>
            
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="block w-full rounded-lg border-0 py-2 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600"
                placeholder="Nhập họ tên đầy đủ"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email đăng nhập <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                disabled={isEdit} // Không cho sửa email nếu edit (Auth liên kết chặt chẽ)
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border-0 py-2 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600 disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="email@sthc.edu.vn"
              />
              {isEdit && <p className="text-[11px] text-slate-400 mt-1">Không thể thay đổi email sau khi tạo tài khoản.</p>}
            </div>

            {!isEdit && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mật khẩu tạm thời <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required={!isEdit}
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  className="block w-full rounded-lg border-0 py-2 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600"
                  placeholder="Mật khẩu ban đầu"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Mã NV / Cán bộ</label>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  className="block w-full rounded-lg border-0 py-2 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Chức danh / Chuyên môn</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="block w-full rounded-lg border-0 py-2 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                id="is_active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                Tài khoản đang hoạt động (Cho phép đăng nhập)
              </label>
            </div>
          </div>

          {/* Cột 2: Phân quyền */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Phân quyền Hệ thống & Đơn vị</h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Quyền hệ thống <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {SYSTEM_ROLES.map((role) => (
                  <label key={role.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${systemRole === role.value ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      name="system_role"
                      value={role.value}
                      checked={systemRole === role.value}
                      onChange={() => setSystemRole(role.value as SystemRole)}
                      className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-600 border-slate-300"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900">{role.label}</span>
                      <span className="text-[11px] text-slate-500">{role.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Đơn vị trực thuộc chính
              </label>
              <select
                value={orgUnitId}
                onChange={(e) => setOrgUnitId(e.target.value)}
                className="block w-full rounded-lg border-0 py-2 pl-3 pr-8 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
              >
                <option value="">-- Chọn đơn vị (Tùy chọn) --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {orgUnitId && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Vai trò tại đơn vị
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as MemberRole)}
                  className="block w-full rounded-lg border-0 py-2 pl-3 pr-8 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                >
                  {MEMBER_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            {isEdit && currentUser?.id !== userId && (
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
              >
                <Key className="h-4 w-4" />
                Đặt lại mật khẩu
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản'}
            </button>
          </div>
        </div>
      </form>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Đặt lại mật khẩu</h3>
            <p className="mt-1 text-sm text-slate-500 mb-6">
              Bạn đang đặt lại mật khẩu cho tài khoản <strong>{fullName}</strong>. Mật khẩu mới cần ít nhất 8 ký tự.
            </p>

            {resetError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 border border-red-200 text-sm text-red-600">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full rounded-lg border-0 py-2 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600"
                  placeholder="Nhập mật khẩu mới"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Xác nhận mật khẩu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-lg border-0 py-2 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-indigo-600"
                  placeholder="Nhập lại mật khẩu"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  disabled={resetting}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {resetting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Lưu mật khẩu'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
