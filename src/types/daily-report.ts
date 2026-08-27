export type WorkStatus = 'Đi làm' | 'Nghỉ phép' | 'Công tác' | 'Trực sự kiện' | 'Làm online';

export interface DailyReport {
  id: string;
  report_date: string;
  user_id: string;
  organization_unit_id: string;
  work_status: WorkStatus | string;
  source_channel: string;
  interest_group: string | null;
  related_task_id: string | null;
  work_summary: string | null;
  issues: string | null;
  support_request: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SaveDailyReportPayload {
  report_date: string;
  user_id?: string;
  organization_unit_id?: string;
  work_status: string;
  source_channel: string;
  interest_group: string | null;
  related_task_id: string | null;
  work_summary: string | null;
  issues: string | null;
  support_request: string | null;
}
