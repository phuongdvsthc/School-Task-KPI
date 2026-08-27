import React, { useState, useEffect, useCallback } from 'react';

import { useAuth } from '../../context/AuthContext';
import { dailyReportService } from '../../services/daily-report.service';
import { metricService } from '../../services/metric.service';
import { SaveDailyReportPayload } from '../../types/daily-report';
import { MetricDefinition, MetricEntry } from '../../types/metric';
import { Save, ArrowLeft, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';

const CHANNELS = [
  'EGOV',
  'Website - yêu cầu tư vấn',
  'Website - yêu cầu gọi lại',
  'Khách đến trực tiếp',
  'Fanpage Facebook',
  'Zalo OA',
  'TikTok',
  'Hotline/Khác'
];

const STATUSES = ['Đi làm', 'Nghỉ phép', 'Công tác', 'Trực sự kiện', 'Làm online'];

export const DailyReportFormView: React.FC<{ id?: string }> = ({ id }) => {
  const { user } = useAuth();
  const navigate = (path: string) => window.location.hash = `#${path}`;
  
  const isEdit = Boolean(id);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile data
  const [userUnitId, setUserUnitId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('viewer');

  // Form data
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [workStatus, setWorkStatus] = useState(STATUSES[0]);
  const [sourceChannel, setSourceChannel] = useState(CHANNELS[0]);
  const [customChannel, setCustomChannel] = useState('');
  const [interestGroup, setInterestGroup] = useState('');
  const [relatedTaskId, setRelatedTaskId] = useState('');
  const [workSummary, setWorkSummary] = useState('');
  const [issues, setIssues] = useState('');
  const [supportRequest, setSupportRequest] = useState('');

  // Metrics data
  const [metricDefs, setMetricDefs] = useState<MetricDefinition[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [valuesMap, setValuesMap] = useState<Record<string, number>>({});
  const [ratios, setRatios] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const supabase = getSupabaseClient();
        
        // 1. Get profile and role
        const { data: profile } = await dailyReportService.fetchWithRetry(async () => await supabase!.from('profiles').select('system_role').eq('id', user.id).single());
        const role = profile?.system_role || 'viewer';
        setUserRole(role);

        // Allow staff only (or maybe manager, but instruction says Manager KHÔNG nhập số liệu hoạt động)
        if (role !== 'staff') {
            setError('Chỉ có nhân sự (Staff) mới có quyền nhập báo cáo hằng ngày.');
            setIsLoading(false);
            return;
        }

        // 2. Get unit
        const { data: orgMembers } = await dailyReportService.fetchWithRetry(async () => await supabase!.from('organization_members')
          .select('organization_unit_id, is_primary')
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })
        );
        const unitId = orgMembers?.[0]?.organization_unit_id;
        if (!unitId) throw new Error('Không tìm thấy đơn vị công tác của bạn.');
        setUserUnitId(unitId);

        // 3. Load Active Metrics for Daily Report
        const tasks = await dailyReportService.getMyTasks(user.id);
        setMyTasks(tasks);

        const { data: defsData } = await dailyReportService.fetchWithRetry(async () => await supabase!.from('metric_definitions')
          .select('*')
          .eq('organization_unit_id', unitId)
          .eq('measurement_scope', 'individual')
          .eq('frequency', 'daily')
          .eq('source_type', 'manual')
          .eq('allow_manual_entry', true)
          .eq('is_active', true)
          .order('sort_order')
        );
        const defs = defsData || [];
        setMetricDefs(defs);

        // 4. Load edit data if isEdit
        if (isEdit) {
            const report = await dailyReportService.getDailyReportById(id!);
            setReportDate(report.report_date);
            setWorkStatus(report.work_status);
            
            if (CHANNELS.includes(report.source_channel)) {
                setSourceChannel(report.source_channel);
            } else {
                setSourceChannel('Khác');
                setCustomChannel(report.source_channel);
            }

            setInterestGroup(report.interest_group || '');
            setRelatedTaskId(report.related_task_id || '');
            setWorkSummary(report.work_summary || '');
            setIssues(report.issues || '');
            setSupportRequest(report.support_request || '');

            const entries = await dailyReportService.getDailyReportMetrics(id!);
            const vMap: Record<string, number> = {};
            entries.forEach(e => {
                vMap[e.metric_definition_id] = typeof e.value === 'number' ? e.value : parseFloat(e.value || '0');
            });
            setValuesMap(vMap);
            setRatios(dailyReportService.calculateDailyRatios(vMap, defs));
        } else {
            const initialMap: Record<string, number> = {};
            defs.forEach(d => initialMap[d.id] = 0);
            setValuesMap(initialMap);
            setRatios(dailyReportService.calculateDailyRatios(initialMap, defs));
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, id, isEdit]);

  const handleMetricChange = (defId: string, val: string) => {
    const num = val ? parseFloat(val) : 0;
    const newMap = { ...valuesMap, [defId]: num };
    setValuesMap(newMap);
    setRatios(dailyReportService.calculateDailyRatios(newMap, metricDefs));
  };

  const handleSave = async () => {
    if (!user || userRole !== 'staff') return;
    try {
        setIsSaving(true);
        setError(null);

        const channelToSave = sourceChannel === 'Khác' && customChannel ? customChannel : sourceChannel;

        const payload: SaveDailyReportPayload = {
            report_date: reportDate,
            user_id: user.id,
            organization_unit_id: userUnitId,
            work_status: workStatus,
            source_channel: channelToSave,
            interest_group: interestGroup || null,
            related_task_id: relatedTaskId || null,
            work_summary: workSummary || null,
            issues: issues || null,
            support_request: supportRequest || null
        };

        const report = await dailyReportService.saveDailyReport(payload);

        // Prepare metric entries
        const entries = metricDefs.map(def => ({
            metric_definition_id: def.id,
            organization_unit_id: userUnitId,
            user_id: user.id,
            period_date: reportDate,
            period_start: reportDate,
            period_end: reportDate,
            value: valuesMap[def.id] || 0,
            source_type: 'manual',
            source_reference_id: report.id,
            created_by: user.id
        }));

        await dailyReportService.saveDailyReportMetrics(entries);

        navigate('/daily-reports');
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Đang tải biểu mẫu...</div>;

  if (userRole !== 'staff') {
      return (
          <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-8 text-center shadow-xs">
              <div className="mb-4 inline-flex items-center justify-center rounded-full bg-red-100 p-3 text-red-600">
                  <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-red-800">Không có quyền truy cập</h3>
              <p className="text-red-600 mb-6">{error || 'Chỉ nhân sự (Staff) mới có quyền nhập báo cáo hằng ngày.'}</p>
              <button onClick={() => navigate('/')} className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">Quay lại trang chủ</button>
          </div>
      );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/daily-reports')} className="text-slate-500 hover:text-slate-800">
           <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? 'Sửa báo cáo' : 'Tạo báo cáo hằng ngày'}</h1>
      </div>

      {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200">
              {error}
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4">Thông tin chung</h2>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">Ngày báo cáo</label>
                          <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} disabled={isEdit} className="w-full rounded-lg border-slate-300 p-2 border focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-slate-100" />
                      </div>
                      
                      <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">Trạng thái làm việc</label>
                          <select value={workStatus} onChange={e => setWorkStatus(e.target.value)} className="w-full rounded-lg border-slate-300 p-2 border focus:border-indigo-500 focus:ring-indigo-500">
                              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                      </div>

                      <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">Kênh / Nguồn</label>
                          <select value={sourceChannel} onChange={e => setSourceChannel(e.target.value)} disabled={isEdit} className="w-full rounded-lg border-slate-300 p-2 border focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-slate-100">
                              {CHANNELS.map(s => <option key={s} value={s}>{s}</option>)}
                              <option value="Khác">Khác...</option>
                          </select>
                          {sourceChannel === 'Khác' && (
                              <input type="text" placeholder="Nhập nguồn khác" value={customChannel} onChange={e => setCustomChannel(e.target.value)} disabled={isEdit} className="mt-2 w-full rounded-lg border-slate-300 p-2 border focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-slate-100" />
                          )}
                      </div>
                  </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4">Chi tiết công việc</h2>
                  <div className="space-y-4">
                      <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">Công việc liên quan (Tùy chọn)</label>
                          <select value={relatedTaskId} onChange={e => setRelatedTaskId(e.target.value)} className="w-full rounded-lg border-slate-300 p-2 border focus:border-indigo-500 focus:ring-indigo-500">
                              <option value="">-- Không chọn --</option>
                              {myTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">Tóm tắt công việc (nếu có)</label>
                          <textarea value={workSummary} onChange={e => setWorkSummary(e.target.value)} rows={3} className="w-full rounded-lg border-slate-300 p-2 border focus:border-indigo-500 focus:ring-indigo-500" />
                      </div>
                      <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">Khó khăn / Vấn đề</label>
                          <textarea value={issues} onChange={e => setIssues(e.target.value)} rows={2} className="w-full rounded-lg border-slate-300 p-2 border focus:border-indigo-500 focus:ring-indigo-500" />
                      </div>
                      <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">Đề xuất hỗ trợ</label>
                          <textarea value={supportRequest} onChange={e => setSupportRequest(e.target.value)} rows={2} className="w-full rounded-lg border-slate-300 p-2 border focus:border-indigo-500 focus:ring-indigo-500" />
                      </div>
                  </div>
              </div>
          </div>

          <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4">Chỉ số Sales & Hoạt động</h2>
                  {metricDefs.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">Không có chỉ số đo lường cá nhân nào được cấu hình cho ngày hôm nay.</p>
                  ) : (
                      <div className="space-y-4">
                          {metricDefs.map(def => (
                              <div key={def.id} className="flex items-center justify-between">
                                  <label className="text-sm font-medium text-slate-700 w-1/2" title={def.code}>{def.name}</label>
                                  <input 
                                      type="number" 
                                      value={valuesMap[def.id] || ''} 
                                      onChange={e => handleMetricChange(def.id, e.target.value)}
                                      className="w-1/3 rounded-lg border-slate-300 p-2 border text-right focus:border-indigo-500 focus:ring-indigo-500"
                                      min="0"
                                  />
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-xs">
                  <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Tỷ lệ tự động tính</h2>
                  <div className="space-y-2">
                      {Object.entries(ratios).map(([key, val]) => (
                          <div key={key} className="flex justify-between text-sm">
                              <span className="text-slate-600">{key}</span>
                              <span className="font-semibold text-slate-900">{val}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      <div className="flex justify-end pt-4">
          <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
          >
              <Save className="h-4 w-4" />
              {isSaving ? 'Đang lưu...' : 'Lưu báo cáo'}
          </button>
      </div>
    </div>
  );
};
