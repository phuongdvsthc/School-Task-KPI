/**
 * Metric Service (metric.service.ts)
 * Tầng nghiệp vụ xử lý toàn bộ logic cho phân hệ:
 * 1. metric_definitions (Danh mục chỉ số đo lường)
 * 2. metric_entries (Nhập liệu & thu thập kết quả chỉ số theo ngày)
 * 
 * Tương tác trực tiếp với Supabase PostgreSQL, không dùng dữ liệu giả lập/mock.
 * Tuân thủ quy tắc:
 * - Không gọi Supabase trực tiếp từ component
 * - Không xóa vật lý dữ liệu đã từng tồn tại
 * - Đổi trạng thái qua is_active
 * - Upsert không tạo bản ghi trùng lặp (metric_definition_id + organization_unit_id + user_id + period_date)
 * - source_type = 'manual'
 * - created_by = current user
 */
import { getSupabaseClient } from './supabaseClient';
import { 
  MetricDefinition, 
  MetricEntry, 
  CreateMetricDefinitionPayload, 
  UpdateMetricDefinitionPayload, 
  MetricFilterOptions,
  SaveMetricEntryPayload,
  MetricEntriesFilterOptions
} from '../types/metric';
import { OrganizationUnit, Profile } from '../types/database';
import { organizationService } from './organizationService';
import { profileService } from './profileService';

export const metricService = {
  // =========================================================================
  // METRIC DEFINITIONS (Danh mục chỉ số)
  // =========================================================================

  /**
   * 1. Lấy danh sách metric_definitions kèm bộ lọc và thông tin đơn vị/người tạo
   */
  async getMetricDefinitions(filters?: MetricFilterOptions): Promise<MetricDefinition[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return [];
    }

    try {
      let query = (supabase.from('metric_definitions') as any)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (filters?.organization_unit_id && filters.organization_unit_id !== 'all') {
        if (filters.organization_unit_id === 'general') {
          query = query.is('organization_unit_id', null);
        } else {
          query = query.eq('organization_unit_id', filters.organization_unit_id);
        }
      }

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search_query?.trim()) {
        const term = filters.search_query.trim();
        query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%,description.ilike.%${term}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[Metric Service] Error querying Supabase metric_definitions:', error.message);
        return [];
      }

      const definitions: MetricDefinition[] = data || [];

      // Join units and profiles
      const [units, profiles] = await Promise.all([
        organizationService.getUnits(false).catch(() => []),
        profileService.getAllProfiles().catch(() => []),
      ]);

      const unitMap = new Map<string, OrganizationUnit>();
      units.forEach((u) => unitMap.set(u.id, u));

      const profileMap = new Map<string, Profile>();
      profiles.forEach((p) => profileMap.set(p.id, p));

      return definitions.map((item) => ({
        ...item,
        unit_info: item.organization_unit_id ? unitMap.get(item.organization_unit_id) : undefined,
        creator_profile: item.created_by ? profileMap.get(item.created_by) : undefined,
      }));
    } catch (err) {
      console.warn('[Metric Service] Exception querying metric_definitions:', err);
      return [];
    }
  },

  /**
   * 2. Lấy chi tiết một metric_definition theo ID
   */
  async getMetricDefinitionById(id: string): Promise<MetricDefinition> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client chưa sẵn sàng');
    }

    try {
      const { data, error } = await (supabase.from('metric_definitions') as any)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new Error(error?.message || `Không tìm thấy chỉ số có mã ID: ${id}`);
      }

      return this._enrichMetricWithDetails(data);
    } catch (err: any) {
      throw new Error(err?.message || `Lỗi lấy chi tiết chỉ số: ${id}`);
    }
  },

  /**
   * 3. Lấy danh sách metric definitions đang hoạt động và cho phép nhập thủ công cho User
   * Yêu cầu:
   * - is_active = true
   * - allow_manual_entry = true
   * - Thuộc organization_unit của người dùng (hoặc dùng chung toàn trường: organization_unit_id is null)
   */
  async getActiveMetricsForEntry(userId: string, unitId?: string | null): Promise<MetricDefinition[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const fetchWithRetry = async (queryFn: () => Promise<any>, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        const res = await queryFn();
        if (res.error && res.error.message && res.error.message.includes('JWT issued at future')) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        return res;
      }
      return queryFn();
    };

    // 2. Fetch user role
    const { data: profile, error: profileErr } = await fetchWithRetry(() => (supabase.from('profiles') as any).select('system_role').eq('id', userId).single());
    if (profileErr) {
      throw new Error('Không thể tải danh sách chỉ số: ' + profileErr.message);
    }
    const role = profile?.system_role || 'viewer';

    // 3. Đọc organization_members để lấy organization_unit_id thật
    const { data: orgMembers, error: memberErr } = await fetchWithRetry(() => (supabase.from('organization_members') as any)
      .select('organization_unit_id, is_primary')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false }));
      
    if (memberErr) {
      throw new Error('Không thể tải danh sách chỉ số: ' + memberErr.message);
    }

    const primaryOrgMember = orgMembers && orgMembers.length > 0 ? orgMembers[0] : null;
    const userUnitId = primaryOrgMember?.organization_unit_id;

    // 10. Trong development hãy log
    if (process.env.NODE_ENV === 'development') {
      console.log('Current user ID:', userId);
      console.log('System role:', role);
      console.log('Primary organization ID:', userUnitId);
    }

    if (role === 'viewer' || role === 'executive') return [];

    let query = (supabase.from('metric_definitions') as any)
      .select('*')
      .eq('is_active', true)
      .eq('allow_manual_entry', true)
      .eq('source_type', 'manual')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (role === 'staff') {
      query = query.eq('measurement_scope', 'individual');
      if (userUnitId) {
        query = query.eq('organization_unit_id', userUnitId);
      } else {
        query = query.eq('organization_unit_id', '00000000-0000-0000-0000-000000000000'); // No unit, return none
      }
    } else if (role === 'manager') {
      query = query.eq('measurement_scope', 'unit');
      if (userUnitId) {
        query = query.eq('organization_unit_id', userUnitId);
      }
    } else {
      // Admin can see both individual and unit
      if (unitId && unitId !== 'all') {
        query = query.eq('organization_unit_id', unitId);
      }
    }

    const { data, error } = await fetchWithRetry(() => query);

    // 9. Không dùng fallback trả mảng [] khi query lỗi
    if (error) {
      throw new Error('Không thể tải danh sách chỉ số: ' + error.message);
    }

    const list: MetricDefinition[] = data || [];
    
    if (process.env.NODE_ENV === 'development') {
       console.log('Metric query result count:', list.length);
    }

    // 11. Nếu role = staff và query trả 0 Metric, hiển thị debug message
    if (role === 'staff' && list.length === 0 && process.env.NODE_ENV === 'development') {
      console.log('Không tìm thấy Metric cá nhân phù hợp cho đơn vị hiện tại.');
    }

    const units = await organizationService.getUnits(false).catch(() => []);
    const unitMap = new Map<string, OrganizationUnit>();
    units.forEach((u) => unitMap.set(u.id, u));

    return list.map((item) => ({
      ...item,
      unit_info: item.organization_unit_id ? unitMap.get(item.organization_unit_id) : undefined,
    }));
  },

  async getMetricEntries(filters?: MetricEntriesFilterOptions): Promise<MetricEntry[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return [];
    }

    const fetchWithRetry = async (queryFn: () => Promise<any>, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        const res = await queryFn();
        if (res.error && res.error.message && res.error.message.includes('JWT issued at future')) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        return res;
      }
      return queryFn();
    };

    try {
      let query = (supabase.from('metric_entries') as any)
        .select('*')
        .order('period_start', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.organization_unit_id && filters.organization_unit_id !== 'all') {
        query = query.eq('organization_unit_id', filters.organization_unit_id);
      }
      if (filters?.user_id && filters.user_id !== 'all') {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters?.period_start) {
        query = query.eq('period_start', filters.period_start);
      }
      if (filters?.period_end) {
        query = query.eq('period_end', filters.period_end);
      }

      const { data, error } = await fetchWithRetry(() => query);

      if (error) {
        console.warn('[Metric Service] Error in getMetricEntries:', error.message);
        return [];
      }

      const entries: MetricEntry[] = data || [];
      return Promise.all(entries.map((entry) => this._enrichMetricEntryWithDetails(entry)));
    } catch (err) {
      console.warn('[Metric Service] Exception in getMetricEntries:', err);
      return [];
    }
  },

  /**
   * 8. Lấy danh sách kết quả theo ngày cụ thể (getMetricEntriesForPeriod)
   */
  async getMetricEntriesForPeriod(params: {
    organization_unit_id?: string | null;
    user_id?: string | null;
    period_start: string;
  period_end: string;
  }): Promise<MetricEntry[]> {
    return this.getMetricEntries({
      organization_unit_id: params.organization_unit_id || undefined,
      user_id: params.user_id || undefined,
      period_start: params.period_start, period_end: params.period_end,
    });
  },

  /**
   * 9. Lưu 1 bản ghi Metric Entry (Upsert: Nếu đã có metric_def_id + unit_id + user_id + date thì UPDATE, nếu chưa có thì INSERT)
   * source_type = 'manual'
   * created_by = current user
   */
  async saveMetricEntry(
    payload: SaveMetricEntryPayload,
    currentUserId: string
  ): Promise<MetricEntry> {
    if (!payload.metric_definition_id) {
      throw new Error('Vui lòng chọn chỉ số cần nhập kết quả.');
    }
    if (!payload.period_start || !payload.period_end) {
      throw new Error('Kỳ báo cáo không được để trống.');
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client chưa sẵn sàng');
    }

    const cleanUnitId = payload.organization_unit_id || null;
    const cleanUserId = payload.user_id || null;
    const cleanNote = payload.note !== undefined ? (payload.note ? payload.note.trim() : null) : null;
    const numValue = Number(payload.value) || 0;
    const now = new Date().toISOString();

    try {
      // Check existing entry in Supabase
      let checkQuery = (supabase.from('metric_entries') as any)
        .select('id')
        .eq('metric_definition_id', payload.metric_definition_id)
        .eq('period_start', payload.period_start).eq('period_end', payload.period_end);

      if (cleanUnitId) {
        checkQuery = checkQuery.eq('organization_unit_id', cleanUnitId);
      } else {
        checkQuery = checkQuery.is('organization_unit_id', null);
      }

      if (cleanUserId) {
        checkQuery = checkQuery.eq('user_id', cleanUserId);
      } else {
        checkQuery = checkQuery.is('user_id', null);
      }

      const { data: existingData } = await checkQuery.maybeSingle();

      if (existingData && existingData.id) {
        // UPDATE
        const { data, error } = await (supabase.from('metric_entries') as any)
          .update({
            value: numValue,
            note: cleanNote,
            source_type: 'manual',
            source_reference_id: payload.source_reference_id || null,
            updated_at: now,
          })
          .eq('id', existingData.id)
          .select()
          .single();

        
        if (error) {
          if (error.code === '23505') {
            // unique violation, retry recursively or fetch and update
            return this.saveMetricEntry(payload, currentUserId);
          }
          throw error;
        }
        return this._enrichMetricEntryWithDetails(data);
      } else {
        // INSERT
        const { data, error } = await (supabase.from('metric_entries') as any)
          .insert({
            metric_definition_id: payload.metric_definition_id,
            organization_unit_id: cleanUnitId,
            user_id: cleanUserId,
            period_start: payload.period_start, period_end: payload.period_end,
            value: numValue,
            note: cleanNote,
            source_type: 'manual',
            source_reference_id: payload.source_reference_id || null,
            created_by: currentUserId,
          })
          .select()
          .single();

        
        if (error) {
          if (error.code === '23505') {
            // unique violation, retry recursively or fetch and update
            return this.saveMetricEntry(payload, currentUserId);
          }
          throw error;
        }
        return this._enrichMetricEntryWithDetails(data);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Lỗi khi lưu kết quả chỉ số');
    }
  },

  /**
   * 10. Lưu đồng loạt danh sách Metric Entries (Batch Upsert)
   */
  async saveMetricEntries(
    entries: SaveMetricEntryPayload[],
    currentUserId: string
  ): Promise<MetricEntry[]> {
    if (!entries || entries.length === 0) return [];

    const results: MetricEntry[] = [];
    for (const item of entries) {
      const saved = await this.saveMetricEntry(item, currentUserId);
      results.push(saved);
    }

    return results;
  },

  /**
   * Helper: Kiểm tra xem chỉ số đã có dữ liệu nhập liệu (metric_entries) hay chưa
   */
  
  /**
   * Helper: Kiểm tra metric đã có dữ liệu nhập chưa
   */
  
  calculateMetricPeriod(frequency: string, selectedDate: Date) {
    let start = new Date(selectedDate);
    let end = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (frequency === 'weekly') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      start.setDate(diff);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (frequency === 'monthly') {
      start.setDate(1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (frequency === 'quarterly') {
      const q = Math.floor(start.getMonth() / 3);
      start = new Date(start.getFullYear(), q * 3, 1);
      end = new Date(start.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
    } else if (frequency === 'yearly') {
      start = new Date(start.getFullYear(), 0, 1);
      end = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      period_start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      period_end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
    };
  },

  async metricHasEntries(metricId: string): Promise<boolean> {
    const count = await this.
getMetricEntriesCount(metricId);
    return count > 0;
  },

  /**
   * Helper: Lấy danh sách organizations (nếu cần filter)
   * Ở đây có thể tái sử dụng organizationService
   */
  async getMetricOrganizations(): Promise<OrganizationUnit[]> {
    return organizationService.getUnits();
  },

  async getMetricEntriesCount(metricDefinitionId: string): Promise<number> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return 0;
    }

    try {
      const { count, error } = await (supabase.from('metric_entries') as any)
        .select('*', { count: 'exact', head: true })
        .eq('metric_definition_id', metricDefinitionId);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch {
      return 0;
    }
  },

  // =========================================================================
  // INTERNAL ENRICHMENT & HELPER METHODS
  // =========================================================================

  async _enrichMetricWithDetails(metric: MetricDefinition): Promise<MetricDefinition> {
    let unit_info = metric.unit_info;
    let creator_profile = metric.creator_profile;

    if (metric.organization_unit_id && !unit_info) {
      try {
        unit_info = await organizationService.getUnitById(metric.organization_unit_id) || undefined;
      } catch {
        // Ignored
      }
    }

    if (metric.created_by && !creator_profile) {
      try {
        creator_profile = await profileService.getProfileById(metric.created_by) || undefined;
      } catch {
        // Ignored
      }
    }

    const entries_count = await this.
getMetricEntriesCount(metric.id).catch(() => 0);

    return {
      ...metric,
      unit_info,
      creator_profile,
      entries_count,
    };
  },

  
  async createMetricDefinition(
    payload: any,
    userId?: string
  ): Promise<MetricDefinition> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await (supabase.from('metric_definitions') as any)
      .insert([{
        ...payload,
        created_by: userId,
      }])
      .select()
      .single();

    if (error) {
        if (error.code === '23505') throw new Error('Mã chỉ số đã tồn tại. Vui lòng chọn mã khác.');
        throw error;
    }
    return data as MetricDefinition;
  },

  async updateMetricDefinition(
    id: string,
    updates: any
  ): Promise<MetricDefinition> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    const { data, error } = await (supabase.from('metric_definitions') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
        if (error.code === '23505') throw new Error('Mã chỉ số đã tồn tại. Vui lòng chọn mã khác.');
        throw error;
    }
    return data as MetricDefinition;
  },

  async toggleMetricDefinition(id: string, is_active?: boolean): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');
    
    if (is_active === undefined) {
      const { data } = await (supabase.from('metric_definitions') as any).select('is_active').eq('id', id).single();
      is_active = !data?.is_active;
    }

    const { error } = await (supabase.from('metric_definitions') as any)
      .update({ is_active })
      .eq('id', id);

    if (error) throw error;
  },

  async _enrichMetricEntryWithDetails(entry: MetricEntry): Promise<MetricEntry> {
    let metric_definition = entry.metric_definition;
    let unit_info = entry.unit_info;
    let creator_profile = entry.creator_profile;

    if (entry.metric_definition_id && !metric_definition) {
      try {
        metric_definition = await this.getMetricDefinitionById(entry.metric_definition_id);
      } catch {
        // Ignored
      }
    }

    if (entry.organization_unit_id && !unit_info) {
      try {
        unit_info = await organizationService.getUnitById(entry.organization_unit_id) || undefined;
      } catch {
        // Ignored
      }
    }

    if (entry.created_by && !creator_profile) {
      try {
        creator_profile = await profileService.getProfileById(entry.created_by) || undefined;
      } catch {
        // Ignored
      }
    }

    return {
      ...entry,
      metric_definition,
      unit_info,
      creator_profile,
    };
  },
};

// Convenience named exports matching requirements
export const getMetricDefinitions = (filters?: MetricFilterOptions) =>
  metricService.getMetricDefinitions(filters);

export const getMetricDefinitionById = (id: string) =>
  metricService.getMetricDefinitionById(id);

export const getActiveMetricsForEntry = (userId: string, unitId?: string | null) =>
  metricService.getActiveMetricsForEntry(userId, unitId);

export const getMetricEntries = (filters?: MetricEntriesFilterOptions) =>
  metricService.getMetricEntries(filters);

export const getMetricEntriesForPeriod = (params: {
  organization_unit_id?: string | null;
  user_id?: string | null;
  period_start: string;
  period_end: string;
}) => metricService.getMetricEntriesForPeriod(params);

export const saveMetricEntry = (payload: SaveMetricEntryPayload, currentUserId: string) =>
  metricService.saveMetricEntry(payload, currentUserId);

export const saveMetricEntries = (entries: SaveMetricEntryPayload[], currentUserId: string) =>
  metricService.saveMetricEntries(entries, currentUserId);

export const createMetricDefinition = (payload: CreateMetricDefinitionPayload, userId?: string) =>
  metricService.createMetricDefinition(payload, userId);

export const updateMetricDefinition = (id: string, updates: UpdateMetricDefinitionPayload) =>
  metricService.updateMetricDefinition(id, updates);

export const metricHasEntries = (id: string) => metricService.metricHasEntries(id);
export const calculateMetricPeriod = (f: string, d: Date) => metricService.calculateMetricPeriod(f, d);
export const getMetricOrganizations = () => metricService.getMetricOrganizations();
export const toggleMetricDefinition = (id: string, is_active?: boolean) =>
  metricService.toggleMetricDefinition(id, is_active);

export default metricService;
