import { getSupabaseClient } from './supabaseClient';
import { Profile, OrganizationUnit, OrganizationMember, SystemRole, MemberRole } from '../types/database';

export interface UserManagementData {
  id: string;
  full_name: string;
  email: string;
  employee_code: string | null;
  job_title: string | null;
  system_role: SystemRole;
  is_active: boolean;
  primary_unit: OrganizationUnit | null;
  member_role: MemberRole | null;
}

export interface CreateUserData {
  email: string;
  temporary_password?: string;
  full_name: string;
  employee_code?: string;
  job_title?: string;
  system_role: SystemRole;
  organization_unit_id?: string;
  member_role?: MemberRole;
  is_active?: boolean;
}

export interface UpdateUserData {
  full_name: string;
  employee_code?: string;
  job_title?: string;
  system_role: SystemRole;
  organization_unit_id?: string;
  member_role?: MemberRole;
  is_active: boolean;
}

export const userService = {
  /**
   * Get all users for the admin list
   */
  async getUsers(): Promise<UserManagementData[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not ready');

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) throw new Error('Không tìm thấy phiên đăng nhập.');

    const response = await fetch('/api/admin/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Lỗi tải danh sách người dùng.');
    }

    return result.users.map((u: any) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      employee_code: u.employee_code,
      job_title: u.job_title,
      system_role: u.system_role,
      is_active: u.is_active,
      primary_unit: u.organization_unit_id ? {
        id: u.organization_unit_id,
        name: u.organization_unit_name,
        // other fields are not provided but also not strictly needed by UI, we can mock them or just provide id/name
        description: null, parent_id: null, unit_type: 'department', is_active: true, sort_order: 0, created_at: '', updated_at: ''
      } : null,
      member_role: u.member_role
    }));
  },

  /**
   * Get a single user by ID
   */
  async getUserById(id: string): Promise<UserManagementData | null> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not ready');

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) throw new Error('Không tìm thấy phiên đăng nhập.');

    const response = await fetch(`/api/admin/users/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Lỗi tải hồ sơ người dùng.');
    }

    if (!result.user) return null;

    const u = result.user;
    return {
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      employee_code: u.employee_code,
      job_title: u.job_title,
      system_role: u.system_role,
      is_active: u.is_active,
      primary_unit: u.organization_unit_id ? {
        id: u.organization_unit_id,
        name: u.organization_unit_name,
        description: null, parent_id: null, unit_type: 'department', is_active: true, sort_order: 0, created_at: '', updated_at: ''
      } as OrganizationUnit : null,
      member_role: u.member_role
    };
  },

  /**
   * Create a new user (Calls our custom API endpoint)
   */
  async createUser(data: CreateUserData): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase client not ready' };
    
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      return { success: false, error: 'Không tìm thấy phiên đăng nhập.' };
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: result.error || 'Đã xảy ra lỗi khi tạo người dùng.' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi mạng khi kết nối máy chủ.' };
    }
  },

  /**
   * Update an existing user
   */
  async updateUser(id: string, data: UpdateUserData): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase client not ready' };
    
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      return { success: false, error: 'Không tìm thấy phiên đăng nhập.' };
    }

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: result.error || 'Đã xảy ra lỗi khi cập nhật người dùng.' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi mạng khi kết nối máy chủ.' };
    }
  },

  /**
   * Deactivate a user (soft delete)
   */
  async deactivateUser(id: string): Promise<{ success: boolean; error?: string }> {
    // To deactivate, we just update is_active to false
    // Since we don't have all data, we should fetch current user data first to retain it
    const currentUser = await this.getUserById(id);
    if (!currentUser) return { success: false, error: 'User not found' };

    return this.updateUser(id, {
      full_name: currentUser.full_name,
      employee_code: currentUser.employee_code || undefined,
      job_title: currentUser.job_title || undefined,
      system_role: currentUser.system_role,
      organization_unit_id: currentUser.primary_unit?.id,
      member_role: currentUser.member_role || undefined,
      is_active: false
    });
  },

  /**
   * Activate a user
   */
  async activateUser(id: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = await this.getUserById(id);
    if (!currentUser) return { success: false, error: 'User not found' };

    return this.updateUser(id, {
      full_name: currentUser.full_name,
      employee_code: currentUser.employee_code || undefined,
      job_title: currentUser.job_title || undefined,
      system_role: currentUser.system_role,
      organization_unit_id: currentUser.primary_unit?.id,
      member_role: currentUser.member_role || undefined,
      is_active: true
    });
  },

  /**
   * Delete a user permanently
   */
  async deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase client not ready' };
    
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      return { success: false, error: 'Không tìm thấy phiên đăng nhập.' };
    }

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
      });

      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: result.error || 'Đã xảy ra lỗi khi xóa người dùng.' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi mạng khi kết nối máy chủ.' };
    }
  },

  /**
   * Admin Reset User Password
   */
  async resetUserPassword(id: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase client not ready' };
    
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      return { success: false, error: 'Không tìm thấy phiên đăng nhập.' };
    }

    try {
      const response = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ new_password: newPassword })
      });

      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: result.error || 'Đã xảy ra lỗi khi đặt lại mật khẩu.' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi mạng khi kết nối máy chủ.' };
    }
  },

  /**
   * User change own password
   */
  async changeOwnPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, error: 'Supabase client not ready' };
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: `Lỗi đổi mật khẩu: ${error.message}` };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Đã có lỗi xảy ra.' };
    }
  }
};
