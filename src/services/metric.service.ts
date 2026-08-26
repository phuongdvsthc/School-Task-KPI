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
  async getActiveMetricsForUser(userId: string, unitId?: string | null): Promise<MetricDefinition[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return [];
    }

    try {
      let query = (supabase.from('metric_definitions') as any)
        .select('*')
        .eq('is_active', true)
        .eq('allow_manual_entry', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (unitId && unitId !== 'all') {
        query = query.or(`organization_unit_id.eq.${unitId},organization_unit_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[Metric Service] Error in getActiveMetricsForUser:', error.message);
        return [];
      }

      const list: MetricDefinition[] = data || [];
      const units = await organizationService.getUnits(false).catch(() => []);
      const unitMap = new Map<string, OrganizationUnit>();
      units.forEach((u) => unitMap.set(u.id, u));

      return list.map((item) => ({
        ...item,
        unit_info: item.organization_unit_id ? unitMap.get(item.organization_unit_id) : undefined,
      }));
    } catch (err) {
      console.warn('[Metric Service] Exception in getActiveMetricsForUser:', err);
      return [];
    }
  },

  /**
   * 4. Tạo mới một metric_definition (Admin only)
   */
  async createMetricDefinition(
    payload: CreateMetricDefinitionPayload,
    userId?: string
  ): Promise<MetricDefinition> {
    if (!payload.name?.trim()) {
      throw new Error('Tên chỉ số không được để trống.');
    }
    if (!payload.code?.trim()) {
      throw new Error('Mã chỉ số không được để trống.');
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client chưa sẵn sàng');
    }

    const cleanCode = payload.code.trim().toUpperCase();

    const newMetricData = {
      organization_unit_id: payload.organization_unit_id || null,
      code: cleanCode,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      category: payload.category || 'teaching',
      data_type: payload.data_type || 'number',
      unit: payload.unit?.trim() || 'đơn vị',
      aggregation_type: payload.aggregation_type || 'sum',
      frequency: payload.frequency || 'monthly',
      target_direction: payload.target_direction || 'higher_is_better',
      allow_manual_entry: payload.allow_manual_entry ?? true,
      is_active: payload.is_active ?? true,
      sort_order: Number(payload.sort_order) || 0,
      created_by: userId || null,
    };

    try {
      const { data, error } = await (supabase.from('metric_definitions') as any)
        .insert(newMetricData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Lỗi khi tạo chỉ số mới');
      }

      return this._enrichMetricWithDetails(data);
    } catch (err: any) {
      throw new Error(err.message || 'Lỗi kết nối Supabase khi tạo chỉ số');
    }
  },

  /**
   * 5. Cập nhật metric_definition (Admin only)
   */
  async updateMetricDefinition(
    id: string,
    updates: UpdateMetricDefinitionPayload
  ): Promise<MetricDefinition> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client chưa sẵn sàng');
    }

    const now = new Date().toISOString();
    const cleanUpdates: any = {
      updated_at: now,
    };

    if (updates.name !== undefined) cleanUpdates.name = updates.name.trim();
    if (updates.code !== undefined) cleanUpdates.code = updates.code.trim().toUpperCase();
    if (updates.organization_unit_id !== undefined) cleanUpdates.organization_unit_id = updates.organization_unit_id || null;
    if (updates.description !== undefined) cleanUpdates.description = updates.description ? updates.description.trim() : null;
    if (updates.category !== undefined) cleanUpdates.category = updates.category;
    if (updates.data_type !== undefined) cleanUpdates.data_type = updates.data_type;
    if (updates.unit !== undefined) cleanUpdates.unit = updates.unit.trim();
    if (updates.aggregation_type !== undefined) cleanUpdates.aggregation_type = updates.aggregation_type;
    if (updates.frequency !== undefined) cleanUpdates.frequency = updates.frequency;
    if (updates.target_direction !== undefined) cleanUpdates.target_direction = updates.target_direction;
    if (updates.allow_manual_entry !== undefined) cleanUpdates.allow_manual_entry = updates.allow_manual_entry;
    if (updates.sort_order !== undefined) cleanUpdates.sort_order = Number(updates.sort_order) || 0;
    if (updates.is_active !== undefined) cleanUpdates.is_active = updates.is_active;

    try {
      const { data, error } = await (supabase.from('metric_definitions') as any)
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Lỗi cập nhật chỉ số');
      }

      return this._enrichMetricWithDetails(data);
    } catch (err: any) {
      throw new Error(err.message || 'Lỗi cập nhật chỉ số');
    }
  },

  /**
   * 6. Bật / Tắt trạng thái chỉ số (is_active)
   * Không xóa vật lý dữ liệu đã từng có
   */
  async toggleMetricDefinition(id: string, targetActive?: boolean): Promise<MetricDefinition> {
    const current = await this.getMetricDefinitionById(id);
    const newStatus = targetActive !== undefined ? targetActive : !current.is_active;

    return this.updateMetricDefinition(id, {
      is_active: newStatus,
    });
  },

  // =========================================================================
  // METRIC ENTRIES (Dữ liệu Nhập liệu / Thu thập kết quả)
  // =========================================================================

  /**
   * 7. Lấy danh sách kết quả nhập liệu metric_entries kèm bộ lọc
   */
  async getMetricEntries(filters?: MetricEntriesFilterOptions): Promise<MetricEntry[]> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return [];
    }

    try {
      let query = (supabase.from('metric_entries') as any)
        .select('*')
        .order('period_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.organization_unit_id && filters.organization_unit_id !== 'all') {
        query = query.eq('organization_unit_id', filters.organization_unit_id);
      }

      if (filters?.user_id && filters.user_id !== 'all') {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters?.period_date) {
        query = query.eq('period_date', filters.period_date);
      }

      if (filters?.startDate) {
        query = query.gte('period_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('period_date', filters.endDate);
      }

      if (filters?.metric_definition_id) {
        query = query.eq('metric_definition_id', filters.metric_definition_id);
      }

      const { data, error } = await query;

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
   * 8. Lấy danh sách kết quả theo ngày cụ thể (getMetricEntriesByDate)
   */
  async getMetricEntriesByDate(params: {
    organization_unit_id?: string | null;
    user_id?: string | null;
    period_date: string;
  }): Promise<MetricEntry[]> {
    return this.getMetricEntries({
      organization_unit_id: params.organization_unit_id || undefined,
      user_id: params.user_id || undefined,
      period_date: params.period_date,
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
    if (!payload.period_date) {
      throw new Error('Ngày ghi nhận (period_date) không được để trống.');
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
        .eq('period_date', payload.period_date);

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

        if (error) throw error;
        return this._enrichMetricEntryWithDetails(data);
      } else {
        // INSERT
        const { data, error } = await (supabase.from('metric_entries') as any)
          .insert({
            metric_definition_id: payload.metric_definition_id,
            organization_unit_id: cleanUnitId,
            user_id: cleanUserId,
            period_date: payload.period_date,
            value: numValue,
            note: cleanNote,
            source_type: 'manual',
            source_reference_id: payload.source_reference_id || null,
            created_by: currentUserId,
          })
          .select()
          .single();

        if (error) throw error;
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
  async metricHasEntries(metricId: string): Promise<boolean> {
    const count = await this.getMetricEntriesCount(metricId);
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

    const entries_count = await this.getMetricEntriesCount(metric.id).catch(() => 0);

    return {
      ...metric,
      unit_info,
      creator_profile,
      entries_count,
    };
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

export const getActiveMetricsForUser = (userId: string, unitId?: string | null) =>
  metricService.getActiveMetricsForUser(userId, unitId);

export const getMetricEntries = (filters?: MetricEntriesFilterOptions) =>
  metricService.getMetricEntries(filters);

export const getMetricEntriesByDate = (params: {
  organization_unit_id?: string | null;
  user_id?: string | null;
  period_date: string;
}) => metricService.getMetricEntriesByDate(params);

export const saveMetricEntry = (payload: SaveMetricEntryPayload, currentUserId: string) =>
  metricService.saveMetricEntry(payload, currentUserId);

export const saveMetricEntries = (entries: SaveMetricEntryPayload[], currentUserId: string) =>
  metricService.saveMetricEntries(entries, currentUserId);

export const createMetricDefinition = (payload: CreateMetricDefinitionPayload, userId?: string) =>
  metricService.createMetricDefinition(payload, userId);

export const updateMetricDefinition = (id: string, updates: UpdateMetricDefinitionPayload) =>
  metricService.updateMetricDefinition(id, updates);

export const metricHasEntries = (id: string) => metricService.metricHasEntries(id);
export const getMetricOrganizations = () => metricService.getMetricOrganizations();
export const toggleMetricDefinition = (id: string, is_active?: boolean) =>
  metricService.toggleMetricDefinition(id, is_active);

export default metricService;
