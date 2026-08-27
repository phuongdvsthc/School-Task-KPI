import { getSupabaseClient } from '../lib/supabase';
import { DailyReport, SaveDailyReportPayload } from '../types/daily-report';
import { MetricDefinition, MetricEntry } from '../types/metric';
import { Task } from '../types/task';

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

  async getMyDailyReports(userId: string, unitId?: string | null): Promise<DailyReport[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    let query = (supabase.from as any)('daily_reports').select('*').eq('user_id', userId).order('report_date', { ascending: false }).order('created_at', { ascending: false });
    if (unitId) {
       query = query.eq('organization_unit_id', unitId);
    }
    
    const { data, error } = await this.fetchWithRetry(async () => await query);
    if (error) throw new Error('Không thể tải báo cáo hằng ngày: ' + error.message);
    
    return data as DailyReport[];
  }

  async getDailyReportsByUnit(unitId: string): Promise<DailyReport[]> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');
    
    const { data, error } = await this.fetchWithRetry(async () => await (supabase.from as any)('daily_reports').select('*, user:profiles(full_name)').eq('organization_unit_id', unitId).order('report_date', { ascending: false }));
    if (error) throw new Error('Không thể tải báo cáo: ' + error.message);
    
    return data as DailyReport[];
  }

  async getDailyReportById(id: string): Promise<DailyReport> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');
    
    const { data, error } = await this.fetchWithRetry(async () => await (supabase.from as any)('daily_reports').select('*').eq('id', id).single());
    if (error) throw new Error('Không thể tải báo cáo: ' + error.message);
    return data as DailyReport;
  }

  async saveDailyReport(payload: SaveDailyReportPayload): Promise<DailyReport> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not initialized');

    // UPSERT based on user_id, organization_unit_id, report_date, source_channel
    // Wait, since we might not have a unique constraint on these 4 columns, we might need to query first.
    // Let's query if it exists.
    const { data: existing, error: findErr } = await this.fetchWithRetry(async () => await 
      (supabase.from as any)('daily_reports')
        .select('id')
        .eq('user_id', payload.user_id)
        .eq('organization_unit_id', payload.organization_unit_id)
        .eq('report_date', payload.report_date)
        .eq('source_channel', payload.source_channel)
        .maybeSingle()
    );

    if (findErr) throw new Error('Lỗi kiểm tra báo cáo: ' + findErr.message);

    if (existing) {
       const { data, error } = await this.fetchWithRetry(async () => await (supabase.from as any)('daily_reports').update(payload).eq('id', existing.id).select().single());
       if (error) throw new Error('Lỗi cập nhật báo cáo: ' + error.message);
       return data as DailyReport;
    } else {
       const { data, error } = await this.fetchWithRetry(async () => await (supabase.from as any)('daily_reports').insert([payload]).select().single());
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
       // Find existing
       const { data: existing } = await this.fetchWithRetry(async () => await (supabase.from as any)('metric_entries')
          .select('id')
          .eq('metric_definition_id', entry.metric_definition_id)
          .eq('user_id', entry.user_id)
          .eq('period_start', entry.period_start)
          .eq('source_reference_id', entry.source_reference_id)
          .maybeSingle()
       );

       if (existing) {
          const { error } = await this.fetchWithRetry(async () => await (supabase.from as any)('metric_entries').update(entry).eq('id', existing.id));
          if (error) throw new Error(`Lỗi cập nhật metric ${entry.metric_definition_id}: ` + error.message);
       } else {
          const { error } = await this.fetchWithRetry(async () => await (supabase.from as any)('metric_entries').insert([entry]));
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
