/**
 * MetricForm Component
 * Xử lý biểu mẫu Tạo mới (/admin/metrics/new) và Chỉnh sửa (/admin/metrics/[id]/edit)
 */
import React, { useState, useEffect } from 'react';
import { 
  CreateMetricDefinitionPayload, 
  UpdateMetricDefinitionPayload,
  MetricCategory,
  MetricDataType,
  MetricAggregationType,
  MetricFrequency,
  MetricTargetDirection,
  METRIC_CATEGORY_LABELS,
  MeasurementScope,
  MetricSourceType
} from '../../../types/metric';
import { OrganizationUnit } from '../../../types/database';
import { metricService, metricHasEntries } from '../../../services/metricService';
import { organizationService } from '../../../services/organizationService';
import { useAuth } from '../../../context/AuthContext';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Building2, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Sliders, 
  Compass, 
  Calendar,
  Hash,
  Database
} from 'lucide-react';

interface MetricFormProps {
  mode: 'create' | 'edit';
  metricId?: string | null;
  onBack: () => void;
  onSuccess: (metricId?: string) => void;
}

const MEASUREMENT_SCOPE_LABELS: Record<string, string> = {
  individual: 'Cá nhân',
  unit: 'Đơn vị',
  organization: 'Toàn trường'
};

const DATA_TYPE_LABELS: Record<string, string> = {
  number: 'Số',
  percentage: 'Tỷ lệ %',
  currency: 'Tiền tệ',
  time_hours: 'Thời lượng'
};

const AGGREGATION_LABELS: Record<string, string> = {
  sum: 'Tổng',
  avg: 'Trung bình',
  max: 'Cao nhất',
  min: 'Thấp nhất',
  latest: 'Giá trị mới nhất'
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  quarterly: 'Hàng quý',
  yearly: 'Hàng năm',
  manual: 'Không theo chu kỳ cố định'
};

const TARGET_DIRECTION_LABELS: Record<string, string> = {
  higher_better: 'Càng cao càng tốt',
  lower_better: 'Càng thấp càng tốt',
  neutral: 'Chỉ theo dõi'
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual: 'Nhập thủ công',
  task: 'Lấy từ công việc',
  import: 'Import dữ liệu',
  api: 'API',
  system: 'Hệ thống tự tính'
};

export const MetricForm: React.FC<MetricFormProps> = ({
  mode,
  metricId,
  onBack,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(mode === 'edit');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasEntries, setHasEntries] = useState<boolean>(false);

  // Form Fields State
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [organizationUnitId, setOrganizationUnitId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<MetricCategory>('teaching');
  
  const [measurementScope, setMeasurementScope] = useState<MeasurementScope>('individual');
  const [dataType, setDataType] = useState<MetricDataType>('number');
  const [unit, setUnit] = useState<string>('');
  const [aggregationType, setAggregationType] = useState<MetricAggregationType>('sum');
  const [frequency, setFrequency] = useState<MetricFrequency | 'manual'>('monthly');
  const [targetDirection, setTargetDirection] = useState<MetricTargetDirection | 'higher_better' | 'lower_better' | 'neutral'>('higher_better');
  const [sourceType, setSourceType] = useState<MetricSourceType>('manual');
  
  const [allowManualEntry, setAllowManualEntry] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Auto-suggest code generator based on name
  const handleAutoGenerateCode = () => {
    if (!name.trim()) return;
    const cleanStr = name.trim().toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/Đ/g, "D")
      .replace(/[^A-Z0-9 ]/g, "")
      .replace(/\s+/g, "_");
    setCode(cleanStr);
  };

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const orgs = await organizationService.getUnits();
        setUnits(orgs);
        
        if (mode === 'edit' && metricId) {
          const metric = await metricService.getMetricDefinitionById(metricId);
          if (metric) {
            setName(metric.name);
            setCode(metric.code);
            setOrganizationUnitId(metric.organization_unit_id || '');
            setDescription(metric.description || '');
            setCategory(metric.category as MetricCategory);
            
            // Map legacy or existing values to new fields
            setMeasurementScope((metric as any).measurement_scope || 'individual');
            setSourceType((metric as any).source_type || 'manual');
            
            setDataType(metric.data_type as MetricDataType);
            setUnit(metric.unit || '');
            setAggregationType(metric.aggregation_type as MetricAggregationType);
            setFrequency(metric.frequency as any);
            setTargetDirection(metric.target_direction as any);
            setAllowManualEntry(metric.allow_manual_entry ?? true);
            setSortOrder(metric.sort_order || 0);
            setIsActive(metric.is_active ?? true);
            
            // Check if metric has entries
            const entriesExist = await metricHasEntries(metricId);
            setHasEntries(entriesExist);
          } else {
            setErrorMessage('Không tìm thấy thông tin chỉ số.');
          }
        } else {
          // Pre-select first unit if available
          if (orgs.length > 0) {
            setOrganizationUnitId(orgs[0].id);
          }
        }
      } catch (err: any) {
        setErrorMessage('Lỗi khi tải dữ liệu: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDependencies();
  }, [mode, metricId]);

  // Handle source type change side effect
  useEffect(() => {
    if (sourceType !== 'manual') {
      setAllowManualEntry(false);
    }
  }, [sourceType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!name.trim()) return setErrorMessage('Vui lòng nhập tên chỉ số.');
    if (!code.trim()) return setErrorMessage('Vui lòng nhập mã chỉ số.');
    if (!organizationUnitId) return setErrorMessage('Vui lòng chọn Đơn vị quản lý.');
    if (!measurementScope) return setErrorMessage('Vui lòng chọn Phạm vi đo lường.');
    if (!dataType) return setErrorMessage('Vui lòng chọn Loại dữ liệu.');
    if (!aggregationType) return setErrorMessage('Vui lòng chọn Phương pháp tổng hợp.');
    if (!frequency) return setErrorMessage('Vui lòng chọn Tần suất đo lường.');
    if (!targetDirection) return setErrorMessage('Vui lòng chọn Chiều hướng mục tiêu.');
    if (!unit.trim()) return setErrorMessage('Vui lòng nhập Đơn vị tính.');

    if (measurementScope === 'organization') {
      const selectedOrg = units.find(u => u.id === organizationUnitId);
      if (selectedOrg && selectedOrg.unit_type !== 'school') {
        return setErrorMessage('Phạm vi đo lường Toàn trường yêu cầu Đơn vị quản lý phải là cấp Trường (School).');
      }
    }

    // Clean code format: A-Z 0-9 _
    const cleanedCode = code.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        code: cleanedCode,
        organization_unit_id: organizationUnitId,
        description: description.trim() || null,
        category,
        measurement_scope: measurementScope,
        data_type: dataType,
        unit: unit.trim(),
        aggregation_type: aggregationType,
        frequency,
        target_direction: targetDirection,
        source_type: sourceType,
        allow_manual_entry: allowManualEntry,
        sort_order: sortOrder,
        is_active: isActive
      };

      if (mode === 'create') {
        const res = await metricService.createMetricDefinition(payload, user?.id);
        onSuccess(res.id);
      } else if (metricId) {
        await metricService.updateMetricDefinition(metricId, payload);
        onSuccess(metricId);
      }
    } catch (err: any) {
      if (err.message?.includes('duplicate key') || err.message?.includes('metric_definitions_code_organization_key')) {
        setErrorMessage('Mã chỉ số này đã tồn tại trong Đơn vị quản lý. Vui lòng chọn mã khác.');
      } else {
        setErrorMessage(err.message || 'Có lỗi xảy ra khi lưu chỉ số.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-600">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-3 font-medium">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {mode === 'create' ? 'Tạo mới Chỉ số đo lường' : 'Cập nhật Chỉ số đo lường'}
            </h1>
            <p className="text-sm text-slate-500">
              Cấu hình các tham số đo lường hiệu suất
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 animate-in fade-in">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
            <div className="text-sm leading-relaxed">{errorMessage}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái: Thông tin cơ bản */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Thông tin cơ bản</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên chỉ số <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleAutoGenerateCode}
                    placeholder="Nhập tên chỉ số đo lường..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã chỉ số <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''))}
                      placeholder="VD: SO_CUOC_GOI"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={handleAutoGenerateCode}
                      className="absolute right-2 top-1.5 p-1 text-slate-400 hover:text-indigo-600 rounded"
                      title="Tạo mã tự động từ tên"
                    >
                      <Sparkles className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Chỉ chứa A-Z, 0-9 và dấu gạch dưới (_)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Đơn vị quản lý <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={organizationUnitId}
                    onChange={(e) => setOrganizationUnitId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">-- Chọn đơn vị --</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nhóm danh mục <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MetricCategory)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    {Object.entries(METRIC_CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mô tả / Hướng dẫn
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả ý nghĩa của chỉ số và cách thức đo lường..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Cột trái: Nguồn dữ liệu */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                  <Database className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Nguồn dữ liệu & Cập nhật</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nguồn thu thập <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value as MetricSourceType)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowManualEntry}
                      onChange={(e) => setAllowManualEntry(e.target.checked)}
                      disabled={sourceType !== 'manual'}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 disabled:opacity-50"
                    />
                    <span className={`text-sm font-medium ${sourceType !== 'manual' ? 'text-slate-400' : 'text-slate-700'}`}>
                      Cho phép nhập thủ công
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: Thuộc tính tính toán */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Sliders className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Thông số đo lường</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex justify-between">
                    <span>Phạm vi đo lường <span className="text-rose-500">*</span></span>
                    {hasEntries && (
                      <span className="text-[10px] text-amber-600 font-medium">Không thể sửa</span>
                    )}
                  </label>
                  <select
                    value={measurementScope}
                    onChange={(e) => setMeasurementScope(e.target.value as MeasurementScope)}
                    disabled={hasEntries}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {Object.entries(MEASUREMENT_SCOPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  {hasEntries && (
                    <p className="text-[11px] text-amber-600 mt-1">Chỉ số đã có dữ liệu phát sinh nên không thể thay đổi phạm vi đo.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loại dữ liệu <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={dataType}
                    onChange={(e) => setDataType(e.target.value as MetricDataType)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    {Object.entries(DATA_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Đơn vị tính (Hiển thị) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="VD: người, giờ, %"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phương pháp tổng hợp <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={aggregationType}
                    onChange={(e) => setAggregationType(e.target.value as MetricAggregationType)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    {Object.entries(AGGREGATION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tần suất đánh giá <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chiều hướng mục tiêu <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetDirection}
                    onChange={(e) => setTargetDirection(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    {Object.entries(TARGET_DIRECTION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
               <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thứ tự sắp xếp (ưu tiên hiển thị)
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Lưu cấu hình
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
