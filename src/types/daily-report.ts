export type LegacyWorkStatus = 'Đi làm' | 'Nghỉ phép' | 'Công tác' | 'Trực sự kiện' | 'Làm online';
export type WorkStatusType = 'working' | 'off' | LegacyWorkStatus | string;
export type ReportStatusType = 'draft' | 'submitted';

export type CalendarDayStatus = 'submitted' | 'draft' | 'off' | 'missing' | 'future';

export interface DailyReportSourceItem {
  id?: string;
  daily_report_id?: string;
  report_source_id: string;
  source_name_snapshot: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  // Local UI helper
  source_code?: string;
}

export interface DailyReportTaskLinkItem {
  id?: string;
  daily_report_id?: string;
  task_id: string;
  created_at?: string;
  // Joined or helper fields
  task_title?: string;
  task_code?: string;
  task_status?: string;
}

export interface DailyReport {
  id: string;
  report_date: string;
  user_id: string;
  organization_unit_id: string;
  work_status: WorkStatusType;
  report_status?: ReportStatusType | string;
  submitted_at?: string | null;
  off_note?: string | null;
  work_summary: string | null;
  issues: string | null;
  support_request: string | null;
  interest_group?: string | null;
  related_task_id?: string | null;
  source_channel?: string | null;
  report_source_id?: string | null;
  report_sources?: {
    id: string;
    code: string;
    name: string;
  } | null;
  report_source?: {
    id?: string;
    code?: string;
    name: string;
  } | null;
  user?: {
    full_name?: string;
  } | null;
  daily_report_sources?: DailyReportSourceItem[];
  daily_report_task_links?: DailyReportTaskLinkItem[];
  created_at?: string;
  updated_at?: string;
}

export interface MonthSummaryStats {
  workingDays: number;
  submittedCount: number;
  draftCount: number;
  offCount: number;
  missingCount: number;
}

export interface SaveDailyReportMultiSourcePayload {
  id?: string;
  report_date: string;
  user_id: string;
  organization_unit_id: string;
  work_status: 'working' | 'off' | string;
  report_status: 'draft' | 'submitted';
  submitted_at?: string | null;
  off_note?: string | null;
  work_summary?: string | null;
  issues?: string | null;
  support_request?: string | null;
  interest_group?: string | null;
  related_task_id?: string | null;
  task_ids?: string[];
  sources?: Array<{
    id?: string;
    report_source_id: string;
    source_name_snapshot: string;
    sort_order: number;
    metrics: Array<{
      metric_definition_id: string;
      value: number;
    }>;
  }>;
}

export interface SaveDailyReportPayload {
  id?: string;
  report_date: string;
  user_id: string;
  organization_unit_id: string;
  work_status: string;
  report_status?: string;
  submitted_at?: string | null;
  off_note?: string | null;
  source_channel?: string | null;
  report_source_id?: string | null;
  interest_group?: string | null;
  related_task_id?: string | null;
  work_summary?: string | null;
  issues?: string | null;
  support_request?: string | null;
}

