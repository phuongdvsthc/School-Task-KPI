import { getSupabaseClient } from '../lib/supabase';
import { DailyReport, SaveDailyReportPayload } from '../types/daily-report';
import { MetricDefinition, MetricEntry } from '../types/metric';
import { Task } from '../types/task';

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

class DailyReportService {
  async fetchWithRetry(queryFn: () => Promise<any>, retries = 3) {
    for (let i = 0; i < retries; i++) {
      const res = await queryFn();
      if (res.error && res.error.message && res.error.message.includes('JWT issued at future')) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      return res;
    }
    return queryFn();
  }

  async getMyDailyReports(userId: string): Promise<DailyReport[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client chưa được khởi tạo.');

    try {
      // Query with left join to report_sources
      const { data, error } = await this.fetchWithRetry(async () =>
        await (supabase.from as any)('daily_reports')
          .select(`
            id,
            report_date,
            user_id,
            organization_unit_id,
            report_source_id,
            source_channel,
            work_status,
            work_summary,
            created_at,
            report_sources (
              id,
              code,
              name
            )
          `)
          .eq('user_id', userId)
          .order('report_date', { ascending: false })
          .order('created_at', { ascending: false })
      );

      if (error) {
        // Fallback without relation if PostgREST relation is not cached or differs
        console.warn('[DailyReportService] Relation query failed, fallback to plain select:', error.message);
        const { data: fallbackData, error: fallbackErr } = await this.fetchWithRetry(async () =>
          await (supabase.from as any)('daily_reports')
            .select(`
              id,
              report_date,
              user_id,
              organization_unit_id,
              report_source_id,
              source_channel,
              work_status,
              work_summary,
              created_at
            `)
            .eq('user_id', userId)
            .order('report_date', { ascending: false })
            .order('created_at', { ascending: false })
        );

        if (fallbackErr) {
          throw new Error('Không thể tải danh sách báo cáo hằng ngày: ' + fallbackErr.message);
        }

        return (fallbackData || []) as DailyReport[];
      }

      return (data || []) as DailyReport[];
    } catch (err: any) {
      console.error('[DailyReportService] Error fetching user daily reports:', err);
      throw err;
    }
  }

  async getDailyReportsByUnit(unitId: string): Promise<DailyReport[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client chưa được khởi tạo.');
    
    try {
      const { data, error } = await this.fetchWithRetry(async () =>
        await (supabase.from as any)('daily_reports')
          .select(`
            id,
            report_date,
            user_id,
            organization_unit_id,
            report_source_id,
            source_channel,
            work_status,
            work_summary,
            created_at,
            user:profiles(full_name),
            report_sources (
              id,
              code,
              name
            )
          `)
          .eq('organization_unit_id', unitId)
          .order('report_date', { ascending: false })
          .order('created_at', { ascending: false })
      );

      if (error) {
        console.warn('[DailyReportService] getDailyReportsByUnit relation failed, fallback:', error.message);
        const { data: fallbackData, error: fallbackErr } = await this.fetchWithRetry(async () =>
          await (supabase.from as any)('daily_reports')
            .select('*, user:profiles(full_name)')
            .eq('organization_unit_id', unitId)
            .order('report_date', { ascending: false })
            .order('created_at', { ascending: false })
        );
        if (fallbackErr) throw new Error('Không thể tải báo cáo theo đơn vị: ' + fallbackErr.message);
        return (fallbackData || []) as DailyReport[];
      }

      return (data || []) as DailyReport[];
    } catch (err: any) {
      console.error('[DailyReportService] getDailyReportsByUnit error:', err);
      throw err;
    }
  }

  async getDailyReportById(id: string, userId?: string): Promise<DailyReport> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client chưa được khởi tạo.');
    
    try {
      let query = (supabase.from as any)('daily_reports')
        .select(`
          id,
          report_date,
          user_id,
          organization_unit_id,
          report_source_id,
          source_channel,
          interest_group,
          related_task_id,
          work_status,
          work_summary,
          issues,
          support_request,
          created_at,
          updated_at,
          report_sources (
            id,
            code,
            name
          )
        `)
        .eq('id', id);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await this.fetchWithRetry(async () => await query.single());
      
      if (error) {
        console.warn('[DailyReportService] getDailyReportById relation failed, fallback:', error.message);
        let fallbackQuery = (supabase.from as any)('daily_reports').select('*').eq('id', id);
        if (userId) {
          fallbackQuery = fallbackQuery.eq('user_id', userId);
        }
        const { data: fallbackData, error: fallbackErr } = await this.fetchWithRetry(async () => await fallbackQuery.single());
        if (fallbackErr) throw new Error('Không thể tải chi tiết báo cáo: ' + fallbackErr.message);
        return fallbackData as DailyReport;
      }

      return data as DailyReport;
    } catch (err: any) {
      console.error('[DailyReportService] getDailyReportById error:', err);
      throw err;
    }
  }

  async saveDailyReport(payload: SaveDailyReportPayload): Promise<DailyReport> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    let existing: any = null;
    if (payload.id) {
       const { data, error } = await this.fetchWithRetry(async () => await (supabase.from as any)('daily_reports').select('id').eq('id', payload.id).maybeSingle());
       if (error) throw new Error('Lỗi kiểm tra báo cáo: ' + error.message);
       existing = data;
    } else {
       const { data, error } = await this.fetchWithRetry(async () => await 
         (supabase.from as any)('daily_reports')
           .select('id')
           .eq('user_id', payload.user_id)
           .eq('organization_unit_id', payload.organization_unit_id)
           .eq('report_date', payload.report_date)
           .eq('source_channel', payload.source_channel)
           .maybeSingle()
       );
       if (error) throw new Error('Lỗi kiểm tra báo cáo: ' + error.message);
       existing = data;
    }

    if (existing) {
       const { data, error } = await this.fetchWithRetry(async () => await (supabase.from as any)('daily_reports').update(payload).eq('id', existing.id).select().single());
       if (error) throw new Error('Lỗi cập nhật báo cáo: ' + error.message);
       return data as DailyReport;
    } else {
       const insertPayload = {
         ...payload,
         id: payload.id || generateUUID(),
       };
       const { data, error } = await this.fetchWithRetry(async () => await (supabase.from as any)('daily_reports').insert([insertPayload]).select().single());
       if (error) throw new Error('Lỗi tạo báo cáo: ' + error.message);
       return data as DailyReport;
    }
  }

  async getDailyReportMetrics(reportId: string): Promise<MetricEntry[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');
    
    const { data, error } = await this.fetchWithRetry(async () => await (supabase.from as any)('metric_entries').select('*').eq('source_reference_id', reportId));
    if (error) throw new Error('Không thể tải metrics của báo cáo: ' + error.message);
    
    return data as MetricEntry[];
  }

  async saveDailyReportMetrics(entries: any[]): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    for (const entry of entries) {
       // Find existing metric entry by metric_definition_id + source_reference_id (dailyReport.id)
       const { data: existing } = await this.fetchWithRetry(async () => await (supabase.from as any)('metric_entries')
          .select('id')
          .eq('metric_definition_id', entry.metric_definition_id)
          .eq('source_reference_id', entry.source_reference_id)
          .maybeSingle()
       );

       if (existing) {
          const { error } = await this.fetchWithRetry(async () => await (supabase.from as any)('metric_entries')
            .update({
              value: entry.value,
              period_start: entry.period_start,
              period_end: entry.period_end,
              organization_unit_id: entry.organization_unit_id,
              user_id: entry.user_id,
              source_type: 'manual',
              source_reference_id: entry.source_reference_id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
          );
          if (error) throw new Error(`Lỗi cập nhật metric ${entry.metric_definition_id}: ` + error.message);
       } else {
          const insertEntry = {
            id: entry.id || generateUUID(),
            metric_definition_id: entry.metric_definition_id,
            organization_unit_id: entry.organization_unit_id,
            user_id: entry.user_id,
            period_start: entry.period_start,
            period_end: entry.period_end,
            value: entry.value,
            source_type: 'manual',
            source_reference_id: entry.source_reference_id,
            created_by: entry.created_by,
          };
          const { error } = await this.fetchWithRetry(async () => await (supabase.from as any)('metric_entries').insert([insertEntry]));
          if (error) throw new Error(`Lỗi tạo metric ${entry.metric_definition_id}: ` + error.message);
       }
    }
  }

  calculateDailyRatios(valuesMap: Record<string, number>, defs: MetricDefinition[]): Record<string, string> {
     // We need to map code -> value
     const codeValueMap: Record<string, number> = {};
     defs.forEach(def => {
        codeValueMap[def.code] = valuesMap[def.id] || 0;
     });

     const safeDiv = (num: number, den: number) => den === 0 ? 0 : (num / den);
     const toPercent = (val: number) => (val * 100).toFixed(1) + '%';

     return {
        'Tỷ lệ nghe máy': toPercent(safeDiv(codeValueMap['CUOC_GOI_NGHE_MAY'] || 0, codeValueMap['SO_CUOC_GOI'] || 0)),
        'Tỷ lệ đến trường': toPercent(safeDiv(codeValueMap['KHACH_DA_DEN'] || 0, codeValueMap['KHACH_HEN'] || 0)),
        'Tỷ lệ hồ sơ/lead': toPercent(safeDiv(codeValueMap['HO_SO_DANG_KY'] || 0, codeValueMap['TONG_LEAD'] || 0)),
        'Tỷ lệ đóng HP/hồ sơ': toPercent(safeDiv(codeValueMap['DONG_HOC_PHI'] || 0, codeValueMap['HO_SO_DANG_KY'] || 0)),
        'Tỷ lệ chuyển đổi cuối': toPercent(safeDiv(codeValueMap['DONG_HOC_PHI'] || 0, codeValueMap['TONG_LEAD'] || 0)),
     };
  }

  async getReportSourcesForUnit(unitId: string): Promise<any[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    // 1. Direct Supabase query (assignments -> report_sources where assignment.is_active = true and report_sources.is_active = true)
    try {
      const { data, error } = await this.fetchWithRetry(async () => await (supabase.from as any)('report_source_unit_assignments')
        .select(`
          sort_order,
          is_active,
          organization_unit_id,
          report_sources (
            id,
            code,
            name,
            category,
            description,
            is_active,
            sort_order
          )
        `)
        .eq('organization_unit_id', unitId)
        .eq('is_active', true)
      );

      if (!error && data) {
        const sources = data
          .filter((item: any) => item.report_sources && item.report_sources.is_active)
          .map((item: any) => ({
            ...item.report_sources,
            assignment_sort_order: item.sort_order
          }))
          .sort((a: any, b: any) => {
            if (a.assignment_sort_order !== b.assignment_sort_order) {
              return a.assignment_sort_order - b.assignment_sort_order;
            }
            if (a.sort_order !== b.sort_order) {
              return a.sort_order - b.sort_order;
            }
            return (a.name || '').localeCompare(b.name || '');
          });
        return sources;
      }
    } catch (err) {
      console.warn('Direct query for report sources failed, attempting API fallback:', err);
    }

    // 2. API fallback
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`/api/report-sources?organization_unit_id=${encodeURIComponent(unitId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error('API fallback for report sources failed:', err);
    }

    return [];
  }

  async getMyTasks(userId: string): Promise<Task[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');
    
    // Simplification for getting tasks related to user
    const { data, error } = await this.fetchWithRetry(async () => await (supabase.from as any)('tasks').select('*').eq('owner_id', userId).order('created_at', { ascending: false }));
    if (error) return [];
    return data as Task[];
  }
}

export const dailyReportService = new DailyReportService();
export default dailyReportService;
