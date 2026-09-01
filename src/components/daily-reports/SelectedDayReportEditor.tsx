import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  Coffee,
  AlertTriangle,
  Plus,
  Save,
  Send,
  Loader2,
  CheckSquare,
  Square,
  AlertCircle,
  HelpCircle,
  Sparkles,
  X,
  Layers,
  Calendar,
} from 'lucide-react';
import {
  DailyReport,
  DailyReportSourceItem,
  DailyReportTaskLinkItem,
  SaveDailyReportMultiSourcePayload,
} from '../../types/daily-report';
import { Task } from '../../types/task';
import { dailyReportService } from '../../services/daily-report.service';
import { metricService } from '../../services/metricService';
import { SourceCard } from './SourceCard';

interface SelectedDayReportEditorProps {
  selectedDate: string; // YYYY-MM-DD
  currentUserId: string;
  primaryOrgUnitId: string;
  primaryOrgName?: string;
  initialReport?: DailyReport | null;
  onReportSaved: (savedReport: DailyReport) => void;
}

export const SelectedDayReportEditor: React.FC<SelectedDayReportEditorProps> = ({
  selectedDate,
  currentUserId,
  primaryOrgUnitId,
  primaryOrgName,
  initialReport,
  onReportSaved,
}) => {
  // 1. Form state
  const [workStatus, setWorkStatus] = useState<'working' | 'off'>('working');
  const [reportStatus, setReportStatus] = useState<'draft' | 'submitted'>('draft');
  const [offNote, setOffNote] = useState<string>('');
  const [workSummary, setWorkSummary] = useState<string>('');
  const [issues, setIssues] = useState<string>('');
  const [supportRequest, setSupportRequest] = useState<string>('');

  // Selected Tasks
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState<boolean>(false);
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState<boolean>(false);

  // Sources and metric values
  // sources: list of added sources for this report
  interface SelectedSourceItem {
    tempKey: string;
    id?: string;
    report_source_id: string;
    source_name_snapshot: string;
    source_code?: string;
    sort_order: number;
  }
  const [selectedSources, setSelectedSources] = useState<SelectedSourceItem[]>([]);
  // sourceValues: Record<tempKey, Record<metricId, number | string>>
  const [sourceValues, setSourceValues] = useState<Record<string, Record<string, number | string>>>({});

  // Unit available sources to add
  const [unitSources, setUnitSources] = useState<any[]>([]);
  const [isLoadingUnitSources, setIsLoadingUnitSources] = useState<boolean>(false);
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState<boolean>(false);

  // Delete source confirmation modal state
  const [sourceToDelete, setSourceToDelete] = useState<{ tempKey: string; name: string } | null>(null);

  // UI state
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  // Load available tasks for Staff
  useEffect(() => {
    let isMounted = true;
    async function loadTasks() {
      if (!currentUserId) return;
      setIsLoadingTasks(true);
      try {
        const tasks = await dailyReportService.getMyTasks(currentUserId);
        if (isMounted) setAvailableTasks(tasks || []);
      } catch (err) {
        console.warn('[SelectedDayReportEditor] Failed to load my tasks:', err);
      } finally {
        if (isMounted) setIsLoadingTasks(false);
      }
    }
    loadTasks();
    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  // Load available report sources for staff's primary unit
  useEffect(() => {
    let isMounted = true;
    async function loadUnitSources() {
      if (!primaryOrgUnitId) return;
      setIsLoadingUnitSources(true);
      try {
        const sources = await dailyReportService.getReportSourcesForUnit(primaryOrgUnitId);
        if (isMounted) setUnitSources(sources || []);
      } catch (err) {
        console.warn('[SelectedDayReportEditor] Failed to load unit sources:', err);
      } finally {
        if (isMounted) setIsLoadingUnitSources(false);
      }
    }
    loadUnitSources();
    return () => {
      isMounted = false;
    };
  }, [primaryOrgUnitId]);

  // Initialize or reset form when selectedDate or initialReport changes
  useEffect(() => {
    let isMounted = true;
    async function populateForm() {
      setIsLoadingData(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        if (!initialReport) {
          // Empty new form for this date
          setWorkStatus('working');
          setReportStatus('draft');
          setOffNote('');
          setWorkSummary('');
          setIssues('');
          setSupportRequest('');
          setSelectedTaskIds([]);
          setSelectedSources([]);
          setSourceValues({});
        } else {
          // Populate from existing report
          const normWorkStatus = dailyReportService.normalizeWorkStatus(initialReport.work_status);
          setWorkStatus(normWorkStatus);
          setReportStatus((initialReport.report_status as any) || 'draft');
          setOffNote(initialReport.off_note || '');
          setWorkSummary(initialReport.work_summary || '');
          setIssues(initialReport.issues || '');
          setSupportRequest(initialReport.support_request || '');

          // Populate task links
          const taskIds = (initialReport.daily_report_task_links || []).map((tl) => tl.task_id);
          setSelectedTaskIds(taskIds);

          // Populate sources
          const initialSources: SelectedSourceItem[] = (initialReport.daily_report_sources || []).map((src, idx) => ({
            tempKey: src.id || `src-${src.report_source_id}-${idx}`,
            id: src.id,
            report_source_id: src.report_source_id,
            source_name_snapshot: src.source_name_snapshot,
            sort_order: src.sort_order ?? idx,
          }));
          setSelectedSources(initialSources);

          // Load metric entries for this report to populate sourceValues
          if (initialReport.id) {
            const metricEntries = await dailyReportService.getDailyReportMetrics(initialReport.id);
            const valMap: Record<string, Record<string, number | string>> = {};

            // Map entries by daily_report_source_id or fallback
            metricEntries.forEach((entry) => {
              if (entry.source_type === 'calculated') return; // strictly skip calculated
              const matchedSrc = initialSources.find(
                (s) => s.id === entry.daily_report_source_id || s.report_source_id === (entry as any).report_source_id
              );
              const key = matchedSrc ? matchedSrc.tempKey : initialSources[0]?.tempKey || 'default';
              if (!valMap[key]) valMap[key] = {};
              valMap[key][entry.metric_definition_id] = entry.value;
            });

            setSourceValues(valMap);
          } else {
            setSourceValues({});
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[SelectedDayReportEditor] Error populating form:', err);
          setErrorMessage(err.message || 'Lỗi khi tải thông tin báo cáo ngày.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    }

    populateForm();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, initialReport]);

  // Formatted date string for Vietnamese UI (e.g. Thứ Ba, 01/09/2026)
  const formattedDateTitle = React.useMemo(() => {
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        const dayName = dayNames[d.getDay()];
        return `${dayName}, ${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch (e) {
      // fallback
    }
    return selectedDate;
  }, [selectedDate]);

  // Unselected sources available to add
  const availableSourcesToAdd = React.useMemo(() => {
    const selectedSourceIds = new Set(selectedSources.map((s) => s.report_source_id));
    return unitSources.filter((s) => !selectedSourceIds.has(s.id));
  }, [unitSources, selectedSources]);

  // Add Source handler
  const handleAddSource = (src: any) => {
    const tempKey = `src-temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newSourceItem: SelectedSourceItem = {
      tempKey,
      report_source_id: src.id,
      source_name_snapshot: src.name,
      source_code: src.code,
      sort_order: selectedSources.length,
    };

    setSelectedSources((prev) => [...prev, newSourceItem]);
    setIsAddSourceModalOpen(false);
  };

  // Metric value change handler
  const handleMetricValueChange = (sourceKey: string, metricId: string, value: number | string) => {
    setSourceValues((prev) => ({
      ...prev,
      [sourceKey]: {
        ...(prev[sourceKey] || {}),
        [metricId]: value,
      },
    }));
  };

  // Remove Source trigger
  const handleRemoveSourceTrigger = (sourceKey: string, hasValues: boolean) => {
    const src = selectedSources.find((s) => s.tempKey === sourceKey);
    if (!src) return;

    if (hasValues) {
      setSourceToDelete({ tempKey: sourceKey, name: src.source_name_snapshot });
    } else {
      performRemoveSource(sourceKey);
    }
  };

  const performRemoveSource = (sourceKey: string) => {
    setSelectedSources((prev) => prev.filter((s) => s.tempKey !== sourceKey));
    setSourceValues((prev) => {
      const next = { ...prev };
      delete next[sourceKey];
      return next;
    });
    setSourceToDelete(null);
  };

  // Toggle task link
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  // Save handler: action = 'draft' | 'submitted'
  const handleSave = async (targetStatus: 'draft' | 'submitted') => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation for authenticated context
    if (!currentUserId || !primaryOrgUnitId) {
      setErrorMessage('Không xác định được đơn vị công tác chính của tài khoản.');
      return;
    }

    // Validation for SUBMITTED
    if (targetStatus === 'submitted') {
      if (workStatus === 'working') {
        if (!workSummary.trim()) {
          setErrorMessage('Vui lòng nhập nội dung công việc hôm nay trước khi hoàn tất báo cáo.');
          return;
        }

        // Validate required metrics across all sources
        for (const src of selectedSources) {
          try {
            const metrics = await metricService.getMetricsForReportSource(src.report_source_id);
            const vals = sourceValues[src.tempKey] || {};
            for (const m of metrics) {
              if (m.entry_mode !== 'calculated' && (m as any).assignment_is_required) {
                const v = vals[m.id];
                if (v === undefined || v === null || v === '') {
                  setErrorMessage(
                    `Kênh "${src.source_name_snapshot}": Chỉ số bắt buộc "${m.name}" chưa được nhập số liệu.`
                  );
                  return;
                }
              }
            }
          } catch (e) {
            // ignore validation if metric loading fails
          }
        }
      }
    }

    setIsSaving(true);

    try {
      // Build multi-source payload
      const sourcesPayload =
        workStatus === 'working'
          ? selectedSources.map((s, idx) => {
              const vals = sourceValues[s.tempKey] || {};
              const metricsArray = Object.entries(vals)
                .filter(([_, val]) => val !== '' && val !== null && val !== undefined)
                .map(([metricId, val]) => ({
                  metric_definition_id: metricId,
                  value: Number(val) || 0,
                }));

              return {
                id: s.id,
                report_source_id: s.report_source_id,
                source_name_snapshot: s.source_name_snapshot,
                sort_order: idx,
                metrics: metricsArray,
              };
            })
          : [];

      const payload: SaveDailyReportMultiSourcePayload = {
        id: initialReport?.id,
        report_date: selectedDate,
        user_id: currentUserId,
        organization_unit_id: primaryOrgUnitId,
        work_status: workStatus,
        report_status: targetStatus,
        submitted_at: targetStatus === 'submitted' ? new Date().toISOString() : null,
        off_note: workStatus === 'off' ? offNote : null,
        work_summary: workStatus === 'working' ? workSummary : null,
        issues: workStatus === 'working' ? issues : null,
        support_request: workStatus === 'working' ? supportRequest : null,
        task_ids: workStatus === 'working' ? selectedTaskIds : [],
        sources: sourcesPayload,
      };

      const saved = await dailyReportService.saveDailyReportMultiSource(payload);

      setSuccessMessage(
        targetStatus === 'submitted'
          ? 'Báo cáo ngày đã được hoàn tất thành công!'
          : 'Đã lưu bản nháp báo cáo thành công.'
      );

      setReportStatus(targetStatus);
      onReportSaved(saved);
    } catch (err: any) {
      console.error('[SelectedDayReportEditor] Save error:', err);
      setErrorMessage(err.message || 'Có lỗi xảy ra khi lưu báo cáo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div ref={editorRef} className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Báo Cáo Ngày: {formattedDateTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Đơn vị công tác chính: <span className="font-semibold text-slate-700">{primaryOrgName || 'Đơn vị chính'}</span>
          </p>
        </div>

        {/* Current status badge */}
        <div className="flex items-center gap-2">
          {initialReport ? (
            workStatus === 'off' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                <Coffee className="h-3.5 w-3.5" />
                Nghỉ / Off
              </span>
            ) : reportStatus === 'submitted' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Đã nộp báo cáo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                <Clock className="h-3.5 w-3.5" />
                Bản nháp
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 border border-slate-200">
              Chưa tạo báo cáo
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="m-4 flex items-start gap-2.5 rounded-lg bg-rose-50 p-3.5 text-xs text-rose-800 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="m-4 flex items-start gap-2.5 rounded-lg bg-emerald-50 p-3.5 text-xs text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isLoadingData ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="text-xs">Đang tải dữ liệu báo cáo...</span>
        </div>
      ) : (
        <div className="p-4 sm:p-6 space-y-6">
          {/* 1. Work Status Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Trạng thái làm việc <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setWorkStatus('working')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold border transition-all ${
                  workStatus === 'working'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`h-3 w-3 rounded-full border-2 ${
                    workStatus === 'working' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                  }`}
                />
                <span>Đi làm</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkStatus('off')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold border transition-all ${
                  workStatus === 'off'
                    ? 'border-slate-700 bg-slate-100 text-slate-900 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`h-3 w-3 rounded-full border-2 ${
                    workStatus === 'off' ? 'border-slate-800 bg-slate-800' : 'border-slate-300'
                  }`}
                />
                <Coffee className="h-4 w-4 text-slate-500" />
                <span>Nghỉ / Off</span>
              </button>
            </div>
          </div>

          {/* 2. OFF VIEW */}
          {workStatus === 'off' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Coffee className="h-5 w-5 text-slate-500" />
                <h3 className="text-sm font-bold">Ghi nhận nghỉ làm việc</h3>
              </div>
              <p className="text-xs text-slate-500">
                Khi chọn nghỉ, các mục công việc, nhiệm vụ và chỉ số sẽ được ẩn.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Lý do / Ghi chú nghỉ
                </label>
                <textarea
                  rows={3}
                  value={offNote}
                  onChange={(e) => setOffNote(e.target.value)}
                  placeholder="Ví dụ: Nghỉ phép cá nhân, nghỉ ốm, nghỉ bù..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* 3. WORKING VIEW */}
          {workStatus === 'working' && (
            <div className="space-y-6">
              {/* Work Summary */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Nội dung công việc hôm nay <span className="text-rose-500">*</span>
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={workSummary}
                  onChange={(e) => setWorkSummary(e.target.value)}
                  placeholder="Mô tả tóm tắt các công việc chính đã thực hiện trong ngày..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Related Tasks Link */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Liên kết Công việc / Nhiệm vụ
                  </label>
                  <span className="text-2xs text-slate-400">
                    {selectedTaskIds.length} nhiệm vụ được liên kết
                  </span>
                </div>

                {/* Selected Tasks Tags */}
                {selectedTaskIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedTaskIds.map((tId) => {
                      const task = availableTasks.find((t) => t.id === tId);
                      return (
                        <div
                          key={tId}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-xs text-indigo-900"
                        >
                          <span className="font-mono text-2xs font-semibold text-indigo-600">
                            {task?.task_code || 'TASK'}
                          </span>
                          <span className="max-w-[200px] truncate">{task?.title || tId}</span>
                          <button
                            type="button"
                            onClick={() => toggleTaskSelection(tId)}
                            className="text-indigo-400 hover:text-indigo-700 ml-0.5"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Task Selector Dropdown Toggle */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5 text-slate-500" />
                    <span>Chọn công việc liên kết</span>
                  </button>

                  {isTaskDropdownOpen && (
                    <div className="absolute left-0 top-full z-20 mt-1 max-h-60 w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 px-2 mb-1">
                        <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
                          Nhiệm vụ của bạn
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsTaskDropdownOpen(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {availableTasks.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          Không có nhiệm vụ nào được giao.
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {availableTasks.map((t) => {
                            const isSelected = selectedTaskIds.includes(t.id);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => toggleTaskSelection(t.id)}
                                className={`flex items-center justify-between w-full rounded-lg p-2 text-left text-xs transition-colors ${
                                  isSelected ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate pr-2">
                                  {isSelected ? (
                                    <CheckSquare className="h-4 w-4 text-indigo-600 shrink-0" />
                                  ) : (
                                    <Square className="h-4 w-4 text-slate-300 shrink-0" />
                                  )}
                                  <div className="truncate">
                                    <span className="font-mono text-2xs font-semibold text-slate-500 mr-1.5">
                                      {t.task_code}
                                    </span>
                                    <span className="font-medium">{t.title}</span>
                                  </div>
                                </div>
                                <span className="text-2xs font-medium text-slate-400 shrink-0 capitalize">
                                  {t.status}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Source Section */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Kết quả theo Kênh / Nguồn
                    </h3>
                    <p className="text-xs text-slate-500">
                      Nhập số liệu phát sinh cho từng Kênh/Nguồn được phân công trong ngày
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddSourceModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 text-xs font-semibold transition-colors self-start sm:self-auto shadow-2xs"
                  >
                    <Plus className="h-4 w-4 text-indigo-600" />
                    <span>Thêm Kênh / Nguồn</span>
                  </button>
                </div>

                {/* List of Source Cards */}
                {selectedSources.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center">
                    <Layers className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs font-medium text-slate-600">
                      Chưa thêm Kênh / Nguồn nào cho báo cáo hôm nay.
                    </p>
                    <p className="text-2xs text-slate-400 mt-0.5">
                      Bấm &quot;Thêm Kênh / Nguồn&quot; để chọn kênh làm việc của bạn (Facebook, Zalo, Trực tiếp...)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedSources.map((src, idx) => (
                      <SourceCard
                        key={src.tempKey}
                        sourceKey={src.tempKey}
                        reportSourceId={src.report_source_id}
                        sourceName={src.source_name_snapshot}
                        sourceCode={src.source_code}
                        sortOrder={idx}
                        metricValues={sourceValues[src.tempKey] || {}}
                        onChangeMetricValue={handleMetricValueChange}
                        onRemoveSource={handleRemoveSourceTrigger}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Issues & Support Requests */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Khó khăn / Vướng mắc
                  </label>
                  <textarea
                    rows={2}
                    value={issues}
                    onChange={(e) => setIssues(e.target.value)}
                    placeholder="Các vấn đề phát sinh cần tháo gỡ (nếu có)..."
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Đề xuất hỗ trợ
                  </label>
                  <textarea
                    rows={2}
                    value={supportRequest}
                    onChange={(e) => setSupportRequest(e.target.value)}
                    placeholder="Đề xuất cần đơn vị hoặc quản lý hỗ trợ (nếu có)..."
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons Footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-slate-200">
            {workStatus === 'off' ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave('submitted')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-slate-900 active:bg-slate-950 transition-colors shadow-2xs disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Lưu báo cáo nghỉ</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave('draft')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-2xs disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Lưu nháp</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave('submitted')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-2xs disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span>Hoàn tất báo cáo</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Source Modal */}
      {isAddSourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Chọn Kênh / Nguồn làm việc</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSourceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Danh sách Kênh/Nguồn đang hoạt động được phân công cho đơn vị của bạn:
            </p>

            {isLoadingUnitSources ? (
              <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                <span className="text-xs">Đang tải danh sách nguồn...</span>
              </div>
            ) : availableSourcesToAdd.length === 0 ? (
              <div className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500">
                {unitSources.length === 0
                  ? 'Chưa có Kênh/Nguồn nào được gán cho đơn vị của bạn.'
                  : 'Tất cả Kênh/Nguồn khả dụng đã được thêm vào báo cáo này.'}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1.5 divide-y divide-slate-50">
                {availableSourcesToAdd.map((src) => (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => handleAddSource(src)}
                    className="flex items-center justify-between w-full rounded-xl p-3 text-left hover:bg-indigo-50/60 transition-colors group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600">
                          {src.name}
                        </span>
                        {src.code && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-2xs text-slate-600">
                            {src.code}
                          </span>
                        )}
                      </div>
                      {src.category && (
                        <span className="text-2xs text-slate-400 capitalize">{src.category}</span>
                      )}
                    </div>
                    <Plus className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddSourceModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Source Confirmation Dialog */}
      {sourceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa Kênh/Nguồn</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc muốn xóa Kênh/Nguồn <strong className="text-slate-800">&quot;{sourceToDelete.name}&quot;</strong> này? Các số liệu đã nhập của nguồn sẽ bị xóa.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSourceToDelete(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => performRemoveSource(sourceToDelete.tempKey)}
                className="rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-2xs"
              >
                Xóa nguồn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
