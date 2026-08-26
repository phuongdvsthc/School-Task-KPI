/**
 * MetricForm Component
 * Xử lý biểu mẫu Tạo mới (/admin/metrics/new) và Chỉnh sửa (/admin/metrics/[id]/edit)
 * Các trường:
 * - name
 * - code
 * - organization_unit_id
 * - description
 * - category
 * - data_type
 * - unit
 * - aggregation_type
 * - frequency
 * - target_direction
 * - allow_manual_entry
 * - sort_order
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
  METRIC_DATA_TYPE_LABELS,
  METRIC_AGGREGATION_LABELS,
  METRIC_FREQUENCY_LABELS,
  METRIC_TARGET_DIRECTION_LABELS
} from '../../../types/metric';
import { OrganizationUnit } from '../../../types/database';
import { metricService } from '../../../services/metricService';
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
  Hash
} from 'lucide-react';

interface MetricFormProps {
  mode: 'create' | 'edit';
  metricId?: string | null;
  onBack: () => void;
  onSuccess: (metricId?: string) => void;
}

const COMMON_UNIT_SUGGESTIONS: Record<string, string[]> = {
  percentage: ['%', 'tỷ lệ %', '% hoàn thành'],
  number: ['giờ chuẩn', 'tiết', 'điểm', 'tín chỉ', 'đề tài', 'chỉ số'],
  currency: ['VNĐ', 'triệu VNĐ', 'nghìn VNĐ'],
  count: ['bài báo', 'người', 'sinh viên', 'giảng viên', 'hồ sơ', 'vụ việc', 'lượt', 'sự kiện'],
  boolean: ['Đạt/Không đạt', 'Có/Không'],
  ratio: ['tỷ số', 'sinh viên / giảng viên'],
  time_hours: ['giờ', 'ngày công', 'phút'],
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

  // Form Fields State
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [organizationUnitId, setOrganizationUnitId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<MetricCategory>('teaching');
  const [dataType, setDataType] = useState<MetricDataType>('number');
  const [unit, setUnit] = useState<string>('giờ chuẩn');
  const [aggregationType, setAggregationType] = useState<MetricAggregationType>('sum');
  const [frequency, setFrequency] = useState<MetricFrequency>('semester');
  const [targetDirection, setTargetDirection] = useState<MetricTargetDirection>('higher_is_better');
  const [allowManualEntry, setAllowManualEntry] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);

  // Auto-suggest code generator based on category & name
  const handleAutoGenerateCode = () => {
    if (!name.trim()) return;
    const catPrefix = {
      teaching: 'METRIC_TEACH',
      scientific_research: 'METRIC_RES',
      administration: 'METRIC_ADM',
      finance: 'METRIC_FIN',
      student_affairs: 'METRIC_STU',
      facilities: 'METRIC_FAC',
      quality_assurance: 'METRIC_QA',
      other: 'METRIC_GEN',
    }[category] || 'METRIC';

    // Normalize Vietnamese diacritics
    const normalizedName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 20);

    const generatedCode = `${catPrefix}_${normalizedName}_${Math.floor(Math.random() * 900 + 100)}`;
    setCode(generatedCode);
  };

  // When data type changes, suggest relevant unit if user hasn't typed custom
  const handleDataTypeChange = (newType: MetricDataType) => {
    setDataType(newType);
    const suggestions = COMMON_UNIT_SUGGESTIONS[newType];
    if (suggestions && suggestions.length > 0) {
      setUnit(suggestions[0]);
    }
  };

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const unitsData = await organizationService.getUnits().catch(() => []);
        setUnits(unitsData);

        if (mode === 'edit' && metricId) {
          const metricData = await metricService.getMetricDefinitionById(metricId);
          setName(metricData.name || '');
          setCode(metricData.code || '');
          setOrganizationUnitId(metricData.organization_unit_id || '');
          setDescription(metricData.description || '');
          setCategory((metricData.category as MetricCategory) || 'teaching');
          setDataType((metricData.data_type as MetricDataType) || 'number');
          setUnit(metricData.unit || '');
          setAggregationType((metricData.aggregation_type as MetricAggregationType) || 'sum');
          setFrequency((metricData.frequency as MetricFrequency) || 'semester');
          setTargetDirection((metricData.target_direction as MetricTargetDirection) || 'higher_is_better');
          setAllowManualEntry(metricData.allow_manual_entry ?? true);
          setSortOrder(metricData.sort_order ?? 0);
          setIsActive(metricData.is_active ?? true);
        }
      } catch (err: any) {
        console.error('Lỗi khi tải dữ liệu biểu mẫu:', err);
        setErrorMessage(err.message || 'Không thể tải thông tin chỉ số');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [mode, metricId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic Validation
    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên chỉ số đo lường.');
      return;
    }
    if (!code.trim()) {
      setErrorMessage('Vui lòng nhập mã chỉ số.');
      return;
    }
    if (!unit.trim()) {
      setErrorMessage('Vui lòng nhập đơn vị tính.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        const payload: CreateMetricDefinitionPayload = {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          organization_unit_id: organizationUnitId || null,
          description: description.trim() || null,
          category,
          data_type: dataType,
          unit: unit.trim(),
          aggregation_type: aggregationType,
          frequency,
          target_direction: targetDirection,
          allow_manual_entry: allowManualEntry,
          sort_order: Number(sortOrder) || 0,
          is_active: isActive,
        };

        const created = await metricService.createMetricDefinition(payload, user?.id);
        onSuccess(created.id);
      } else if (mode === 'edit' && metricId) {
        const updates: UpdateMetricDefinitionPayload = {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          organization_unit_id: organizationUnitId || null,
          description: description.trim() || null,
          category,
          data_type: dataType,
          unit: unit.trim(),
          aggregation_type: aggregationType,
          frequency,
          target_direction: targetDirection,
          allow_manual_entry: allowManualEntry,
          sort_order: Number(sortOrder) || 0,
          is_active: isActive,
        };

        await metricService.updateMetricDefinition(metricId, updates);
        onSuccess(metricId);
      }
    } catch (err: any) {
      console.error('Lỗi khi lưu chỉ số:', err);
      setErrorMessage(err.message || 'Đã xảy ra lỗi khi lưu thông tin chỉ số.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Đang tải dữ liệu chỉ số đo lường...</p>
      </div>
    );
  }

  const currentRoute = mode === 'create' ? '/admin/metrics/new' : `/admin/metrics/${metricId || ':id'}/edit`;

  return (
    <div id="metric-form-container" className="mx-auto max-w-4xl space-y-6">
      {/* Navigation Breadcrumb & Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại danh sách chỉ số (/admin/metrics)</span>
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {mode === 'create' ? 'Tạo Chỉ Số Đo Lường Mới' : 'Chỉnh Sửa Cấu Hình Chỉ Số'}
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {currentRoute}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {mode === 'create'
              ? 'Thiết lập chỉ số đo lường mới vào danh mục hệ thống trường học.'
              : 'Cập nhật định nghĩa, công thức tính toán và phạm vi đơn vị áp dụng.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs self-start"
        >
          Hủy bỏ
        </button>
      </div>

      {/* Error Alert Box */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 shadow-xs">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Đã xảy ra lỗi:</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Thông tin cơ bản */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layers className="h-5 w-5 text-indigo-700" />
            <h2 className="text-base font-bold text-slate-900">
              1. Thông Tin Nhận Diện Chỉ Số
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Tên chỉ số (name) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Tên chỉ số đo lường <span className="text-red-500">*</span>
              </label>
              <input
                id="input-metric-name"
                type="text"
                required
                placeholder="Ví dụ: Tỷ lệ giảng viên đạt chuẩn giờ giảng nghiên cứu khoa học"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              />
              <p className="mt-1 text-xs text-slate-500">
                Tên rõ ràng, mô tả mục tiêu hoặc đại lượng cần đo lường.
              </p>
            </div>

            {/* Mã chỉ số (code) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Mã chỉ số (Code) <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateCode}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Tự sinh mã</span>
                </button>
              </div>
              <input
                id="input-metric-code"
                type="text"
                required
                placeholder="METRIC_TEACH_01"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full font-mono uppercase rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              />
              <p className="mt-1 text-xs text-slate-500">
                Mã duy nhất viết hoa không dấu (ví dụ: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">METRIC_ADM_01</code>).
              </p>
            </div>

            {/* Đơn vị áp dụng (organization_unit_id) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                Đơn vị áp dụng / Phụ trách
              </label>
              <select
                id="select-metric-unit"
                value={organizationUnitId}
                onChange={(e) => setOrganizationUnitId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              >
                <option value="">Áp dụng chung toàn trường</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Để trống nếu chỉ số được dùng chung cho tất cả các đơn vị trong trường.
              </p>
            </div>

            {/* Mô tả chi tiết (description) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Mô tả & Hướng dẫn thu thập (Description)
              </label>
              <textarea
                id="textarea-metric-desc"
                rows={3}
                placeholder="Nêu rõ phương pháp đếm, công thức tính toán và nguồn dữ liệu kiểm chứng..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Cấu hình Đo lường & Loại Dữ liệu */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="h-5 w-5 text-indigo-700" />
            <h2 className="text-base font-bold text-slate-900">
              2. Phương Thức Đo Lường & Dữ Liệu
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Nhóm chỉ số (category) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Nhóm chỉ số (Category) <span className="text-red-500">*</span>
              </label>
              <select
                id="select-metric-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as MetricCategory)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              >
                {Object.entries(METRIC_CATEGORY_LABELS).map(([catKey, catMeta]) => (
                  <option key={catKey} value={catKey}>
                    {catMeta.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Loại dữ liệu (data_type) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Loại dữ liệu (Data Type) <span className="text-red-500">*</span>
              </label>
              <select
                id="select-metric-data-type"
                value={dataType}
                onChange={(e) => handleDataTypeChange(e.target.value as MetricDataType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              >
                {Object.entries(METRIC_DATA_TYPE_LABELS).map(([dtKey, dtLabel]) => (
                  <option key={dtKey} value={dtKey}>
                    {dtLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* Đơn vị tính (unit) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Đơn vị tính (Unit) <span className="text-red-500">*</span>
              </label>
              <input
                id="input-metric-unit"
                type="text"
                required
                placeholder="Ví dụ: %, giờ, bài, người, VNĐ"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              />
              {COMMON_UNIT_SUGGESTIONS[dataType] && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="text-[11px] text-slate-400">Gợi ý:</span>
                  {COMMON_UNIT_SUGGESTIONS[dataType].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setUnit(s)}
                      className="text-[11px] font-medium text-indigo-600 hover:underline bg-indigo-50/60 px-1.5 py-0.2 rounded"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phương thức tổng hợp (aggregation_type) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Tổng hợp số liệu (Aggregation) <span className="text-red-500">*</span>
              </label>
              <select
                id="select-metric-aggregation"
                value={aggregationType}
                onChange={(e) => setAggregationType(e.target.value as MetricAggregationType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              >
                {Object.entries(METRIC_AGGREGATION_LABELS).map(([aggKey, aggLabel]) => (
                  <option key={aggKey} value={aggKey}>
                    {aggLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* Tần suất thu thập (frequency) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                Tần suất đo lường (Frequency) <span className="text-red-500">*</span>
              </label>
              <select
                id="select-metric-frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as MetricFrequency)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              >
                {Object.entries(METRIC_FREQUENCY_LABELS).map(([freqKey, freqLabel]) => (
                  <option key={freqKey} value={freqKey}>
                    {freqLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* Chiều hướng mục tiêu (target_direction) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                <Compass className="h-3.5 w-3.5 text-slate-500" />
                Chiều hướng mục tiêu <span className="text-red-500">*</span>
              </label>
              <select
                id="select-metric-direction"
                value={targetDirection}
                onChange={(e) => setTargetDirection(e.target.value as MetricTargetDirection)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              >
                {Object.entries(METRIC_TARGET_DIRECTION_LABELS).map(([dirKey, dirMeta]) => (
                  <option key={dirKey} value={dirKey}>
                    {dirMeta.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Cấu hình vận hành & Trạng thái */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Hash className="h-5 w-5 text-indigo-700" />
            <h2 className="text-base font-bold text-slate-900">
              3. Vận Hành & Thứ Tự Hiển Thị
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* allow_manual_entry */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  id="checkbox-manual-entry"
                  type="checkbox"
                  checked={allowManualEntry}
                  onChange={(e) => setAllowManualEntry(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-slate-900">
                    Cho phép nhập liệu thủ công (allow_manual_entry)
                  </span>
                  <p className="text-xs text-slate-500">
                    Bật tùy chọn này để cán bộ, nhân sự phụ trách có thể cập nhật số liệu trực tiếp qua giao diện thu thập.
                  </p>
                </div>
              </label>
            </div>

            {/* is_active */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  id="checkbox-is-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-slate-900">
                    Kích hoạt áp dụng (is_active)
                  </span>
                  <p className="text-xs text-slate-500">
                    Khi tắt, chỉ số sẽ tạm ẩn khỏi các biểu mẫu nhập liệu nhưng vẫn giữ nguyên toàn bộ lịch sử dữ liệu đã có.
                  </p>
                </div>
              </label>
            </div>

            {/* Thứ tự sắp xếp (sort_order) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Thứ tự sắp xếp hiển thị (Sort Order)
              </label>
              <input
                id="input-metric-sort-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              />
              <p className="mt-1 text-xs text-slate-500">
                Số nhỏ hơn sẽ hiển thị trước trong danh mục và báo cáo.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Hủy / Quay lại
          </button>

          <button
            type="submit"
            id="btn-save-metric"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-900 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-800 focus:ring-2 focus:ring-indigo-600 focus:outline-hidden transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang lưu chỉ số...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{mode === 'create' ? 'Tạo Chỉ Số Mới' : 'Lưu Thay Đổi'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
