import { getSupabaseClient } from '../lib/supabase';

export interface PublicSettings {
  organizationName: string;
  organizationShortName: string;
  appName: string;
  organizationAddress: string;
  organizationPhone: string;
  organizationEmail: string;
  organizationWebsite: string;
  timezone: string;
  dateFormat: string;
  locale: string;
  logoPath: string;
  logoSmallPath: string;
  faviconPath: string;
}

export interface AdminSettingsResponse {
  rootOrg: { id: string; name: string; code: string } | null;
  settings: Record<string, string>;
}

export const systemSettingsService = {
  async getPublicSettings(): Promise<PublicSettings> {
    const response = await fetch('/api/settings/public');
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Lỗi khi tải cấu hình công khai');
    }
    return response.json();
  },

  async getAdminSettings(): Promise<AdminSettingsResponse> {
    const token = await this._getAuthToken();
    const response = await fetch('/api/admin/settings', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Lỗi khi tải cấu hình quản trị');
    }
    return response.json();
  },

  async updateSystemSettings(rootOrgName: string, settings: Record<string, string>): Promise<void> {
    const token = await this._getAuthToken();
    const response = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rootOrgName, settings })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Lỗi khi cập nhật cấu hình');
    }
  },

  
  async uploadSystemAsset(type: 'logo' | 'logo-small' | 'favicon', file: File): Promise<{ path: string }> {
    const token = await this._getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/admin/settings/assets/${type}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Lỗi khi tải lên file');
    }

    return response.json();
  },

  async deleteSystemAsset(type: 'logo' | 'logo-small' | 'favicon'): Promise<void> {
    const token = await this._getAuthToken();
    const response = await fetch(`/api/admin/settings/assets/${type}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Lỗi khi xóa file');
    }
  },

  getSystemAssetPublicUrl(path: string): string {
    if (!path) return '';
    const supabase = getSupabaseClient();
    if (!supabase) return '';
    const { data } = supabase.storage.from('system-assets').getPublicUrl(path);
    return data.publicUrl;
  },

  async _getAuthToken(): Promise<string> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client chưa sẵn sàng');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Chưa đăng nhập');
    return session.access_token;
  }
};
