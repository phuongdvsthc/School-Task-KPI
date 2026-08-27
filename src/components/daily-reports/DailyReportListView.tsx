import { getSupabaseClient } from '../../lib/supabase';
import React, { useState, useEffect } from 'react';

import { Plus, Edit2, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dailyReportService } from '../../services/daily-report.service';
import { DailyReport } from '../../types/daily-report';

export const DailyReportListView: React.FC = () => {
  const { user, systemRole } = useAuth();
  const navigate = (path: string) => window.location.hash = `#${path}`;
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReports = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        // Usually we fetch based on role, but instruction says:
        // Staff sees their own history, Manager sees unit's history.
        // Assuming we just fetch user's history here if they are staff.
        // Actually, let's fetch for current user for now if we want "Staff history".
        const { data: profile } = await dailyReportService.fetchWithRetry(async () => await getSupabaseClient()!.from('profiles').select('system_role, organization_unit_id').eq('id', user.id).single());
        
        let data: DailyReport[] = [];
        if (profile?.system_role === 'staff') {
            data = await dailyReportService.getMyDailyReports(user.id);
        } else if (profile?.system_role === 'manager' && profile.organization_unit_id) {
            data = await dailyReportService.getDailyReportsByUnit(profile.organization_unit_id);
        } else if (profile?.system_role === 'admin' || profile?.system_role === 'executive') {
            // Might need unit filter, let's just get some or none
            data = await dailyReportService.getDailyReportsByUnit(profile.organization_unit_id || '');
        }
        
        setReports(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadReports();
  }, [user]);

  if (isLoading) return <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Lỗi: {error}</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
           <FileText className="h-6 w-6 text-indigo-600" />
           Báo cáo hằng ngày
        </h1>
        {systemRole === 'staff' && (
        <button
          onClick={() => navigate('/daily-reports/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700"
        >

          <Plus className="h-4 w-4" />
          Tạo báo cáo
        </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Ngày</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Kênh</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Công việc</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{report.report_date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{report.source_channel}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                     {report.work_status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-xs">{report.work_summary || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {systemRole === 'staff' && (
                  <button
                    onClick={() => navigate(`/daily-reports/${report.id}/edit`)}
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit2 className="h-4 w-4" />
                    Sửa
                  </button>
                  )}
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                  Chưa có báo cáo nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
