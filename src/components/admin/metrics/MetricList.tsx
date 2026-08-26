/**
 * MetricList Component (/admin/metrics)
 * Quản trị Danh mục Chỉ số Đo lường (Metric Definitions)
 * Yêu cầu:
 * 1. Hiển thị danh sách metric_definitions với các cột: Tên chỉ số, Mã, Đơn vị, Nhóm, Loại dữ liệu, Tần suất, Trạng thái.
 * 2. Bộ lọc: Organization Unit, Category, Active / Inactive.
 * 3. Thao tác: Tạo mới, Sửa, Bật/tắt chỉ số (is_active).
 * 4. Không xóa vật lý.
 */
import React, { useState, useEffect } from 'react';
import { 
  MetricDefinition, 
  MetricFilterOptions,
  METRIC_CATEGORY_LABELS,
  METRIC_DATA_TYPE_LABELS,
  METRIC_FREQUENCY_LABELS
} from '../../../types/metric';
import { OrganizationUnit } from '../../../types/database';
import { metricService } from '../../../services/metricService';
import { organizationService } from '../../../services/organizationService';
import { 
  MetricCategoryBadge, 
  MetricDataTypeBadge, 
  MetricFrequencyBadge, 
  MetricStatusBadge,
  MetricTargetDirectionBadge 
} from './MetricBadges';
import { 
  Plus, 
  Search, 
  RotateCcw, 
  Building2, 
  Filter, 
  Power, 
  Edit3, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  BarChart3, 
  Layers, 
  Info,
  SlidersHorizontal,
  ChevronRight,
  Database
} from 'lucide-react';

interface MetricListProps {
  onNavigateNew: () => void;
  onNavigateEdit: (id: string) => void;
}

export const MetricList: React.FC<MetricListProps> = ({
  onNavigateNew,
  onNavigateEdit,
}) => {
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Preview Modal
  const [previewMetric, setPreviewMetric] = useState<MetricDefinition | null>(null);

  // Status message / toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const filterParams: MetricFilterOptions = {};

      if (selectedUnit !== 'all') {
        filterParams.organization_unit_id = selectedUnit;
      }
      if (selectedCategory !== 'all') {
        filterParams.category = selectedCategory;
      }
      if (selectedStatus === 'active') {
        filterParams.is_active = true;
      } else if (selectedStatus === 'inactive') {
        filterParams.is_active = false;
      }
      if (searchQuery.trim()) {
        filterParams.search_query = searchQuery.trim();
      }

      const [metricsData, unitsData] = await Promise.all([
        metricService.getMetricDefinitions(filterParams),
        organizationService.getUnits().catch(() => []),
      ]);

      setMetrics(metricsData);
      setUnits(unitsData);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách chỉ số:', err);
      showToast(err.message || 'Không thể tải danh sách chỉ số', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedUnit, selectedCategory, selectedStatus]);

  // Debounced search on enter or click
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedUnit('all');
    setSelectedCategory('all');
    setSelectedStatus('all');
  };

  // Toggle is_active handler
  const handleToggleStatus = async (metric: MetricDefinition) => {
    const nextStatus = !metric.is_active;
    const actionName = nextStatus ? 'kích hoạt lại' : 'tạm dừng';

    setActionLoadingId(metric.id);
    try {
      const updated = await metricService.toggleMetricDefinition(metric.id, nextStatus);
      
      // Update locally
      setMetrics((prev) =>
        prev.map((m) => (m.id === metric.id ? { ...m, is_active: updated.is_active } : m))
      );

      showToast(
        `Đã ${actionName} chỉ số "${metric.name}" (${updated.code}). Dữ liệu lịch sử vẫn được bảo toàn.`,
        'success'
      );
    } catch (err: any) {
      console.error('Lỗi khi thay đổi trạng thái chỉ số:', err);
      showToast(err.message || 'Lỗi khi cập nhật trạng thái chỉ số', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Stats calculation
  const totalCount = metrics.length;
  const activeCount = metrics.filter((m) => m.is_active).length;
  const inactiveCount = metrics.filter((m) => !m.is_active).length;

  return (
    <div id="metric-admin-view" className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="metric-toast-alert"
          className={`flex items-center justify-between rounded-lg p-4 shadow-md transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-red-50 border border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-3">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs font-semibold hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
            <span>Quản Trị Hệ Thống</span>
            <span>•</span>
            <span className="font-mono text-slate-500">/admin/metrics</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
            Quản Trị Danh Mục Chỉ Số Đo Lường (Metric Definitions)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Khung định nghĩa các chỉ số định lượng, định tính áp dụng cho toàn trường và các đơn vị phòng ban, khoa đào tạo.
          </p>
        </div>

        <button
          id="btn-create-metric"
          onClick={onNavigateNew}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-800 transition-colors focus:ring-2 focus:ring-indigo-600 focus:outline-hidden shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm Chỉ Số Mới</span>
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div>
            <p className="text-xs font-medium text-slate-500">Tổng Số Chỉ Số</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-800">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div>
            <p className="text-xs font-medium text-slate-500">Đang Áp Dụng (Active)</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{activeCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div>
            <p className="text-xs font-medium text-slate-500">Đã Tạm Dừng (Inactive)</p>
            <p className="mt-1 text-2xl font-bold text-slate-600">{inactiveCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Power className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="filter-metric-search"
              type="text"
              placeholder="Tìm theo tên chỉ số, mã (METRIC_...), hoặc mô tả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span>Tìm kiếm</span>
          </button>
        </form>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Filter 1: Organization Unit */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              Đơn vị áp dụng
            </label>
            <select
              id="filter-metric-unit"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
            >
              <option value="all">Tất cả đơn vị</option>
              <option value="general">Toàn trường (Chung)</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              Nhóm chỉ số (Category)
            </label>
            <select
              id="filter-metric-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
            >
              <option value="all">Tất cả các nhóm</option>
              {Object.entries(METRIC_CATEGORY_LABELS).map(([catKey, catMeta]) => (
                <option key={catKey} value={catKey}>
                  {catMeta.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Active / Inactive Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Power className="h-3.5 w-3.5 text-slate-500" />
              Trạng thái áp dụng
            </label>
            <select
              id="filter-metric-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang áp dụng (Active)</option>
              <option value="inactive">Đã tạm dừng (Inactive)</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              id="btn-reset-metric-filters"
              type="button"
              onClick={handleResetFilters}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="h-4 w-4 text-slate-500" />
              <span>Đặt lại bộ lọc</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Metric Definitions Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm font-medium">Đang tải danh mục chỉ số đo lường...</p>
          </div>
        ) : metrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 mb-3">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Không tìm thấy chỉ số phù hợp</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-md">
              Không có chỉ số nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại. Thử đặt lại bộ lọc hoặc tạo chỉ số mới.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleResetFilters}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Xóa bộ lọc
              </button>
              <button
                onClick={onNavigateNew}
                className="rounded-lg bg-indigo-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-800"
              >
                + Thêm chỉ số mới
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3.5">
                    Tên chỉ số & Mô tả
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Mã chỉ số
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Đơn vị tính
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Nhóm chỉ số
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Loại dữ liệu
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Tần suất
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.map((metric) => {
                  const isOperating = actionLoadingId === metric.id;

                  return (
                    <tr
                      key={metric.id}
                      id={`metric-row-${metric.id}`}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !metric.is_active ? 'bg-slate-50/40 opacity-75' : ''
                      }`}
                    >
                      {/* 1. Tên chỉ số */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => setPreviewMetric(metric)}
                            className="text-left font-semibold text-slate-900 hover:text-indigo-700 line-clamp-1 transition-colors"
                          >
                            {metric.name}
                          </button>
                          {metric.description ? (
                            <span className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                              {metric.description}
                            </span>
                          ) : (
                            <span className="mt-0.5 text-[11px] text-slate-400 italic">
                              Chưa có mô tả chi tiết
                            </span>
                          )}

                          {/* Unit badge / info */}
                          <div className="mt-1 flex items-center gap-2">
                            {metric.unit_info ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                <Building2 className="h-3 w-3 text-slate-500" />
                                {metric.unit_info.name}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">
                                Áp dụng toàn trường
                              </span>
                            )}
                            <MetricTargetDirectionBadge direction={metric.target_direction} />
                          </div>
                        </div>
                      </td>

                      {/* 2. Mã */}
                      <td className="px-3 py-3.5">
                        <span className="inline-block font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {metric.code}
                        </span>
                      </td>

                      {/* 3. Đơn vị */}
                      <td className="px-3 py-3.5 font-medium text-slate-800">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-indigo-50/50 text-indigo-900 border border-indigo-100/60 font-semibold">
                          {metric.unit}
                        </span>
                      </td>

                      {/* 4. Nhóm */}
                      <td className="px-3 py-3.5">
                        <MetricCategoryBadge category={metric.category} />
                      </td>

                      {/* 5. Loại dữ liệu */}
                      <td className="px-3 py-3.5">
                        <MetricDataTypeBadge dataType={metric.data_type} />
                      </td>

                      {/* 6. Tần suất */}
                      <td className="px-3 py-3.5">
                        <MetricFrequencyBadge frequency={metric.frequency} />
                      </td>

                      {/* 7. Trạng thái */}
                      <td className="px-3 py-3.5 text-center">
                        <MetricStatusBadge isActive={metric.is_active} />
                      </td>

                      {/* 8. Thao tác */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick view detail */}
                          <button
                            type="button"
                            onClick={() => setPreviewMetric(metric)}
                            title="Xem chi tiết"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            id={`btn-edit-metric-${metric.id}`}
                            onClick={() => onNavigateEdit(metric.id)}
                            title="Chỉnh sửa cấu hình chỉ số"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors shadow-2xs"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Sửa</span>
                          </button>

                          {/* Toggle Active / Inactive Button */}
                          <button
                            type="button"
                            id={`btn-toggle-metric-${metric.id}`}
                            onClick={() => handleToggleStatus(metric)}
                            disabled={isOperating}
                            title={
                              metric.is_active
                                ? 'Tạm dừng chỉ số (không xóa dữ liệu đã có)'
                                : 'Kích hoạt lại chỉ số'
                            }
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors shadow-2xs ${
                              metric.is_active
                                ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            } ${isOperating ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isOperating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Power className="h-3.5 w-3.5" />
                            )}
                            <span>{metric.is_active ? 'Tắt' : 'Bật'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preservation & Compliance Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <Info className="h-5 w-5 text-indigo-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">
            Chính sách Toàn vẹn Dữ liệu & Kiểm toán Chỉ số (Audit Safety):
          </p>
          <p>
            Hệ thống không xóa vật lý các chỉ số đã từng phát sinh dữ liệu đo lường. Khi một chỉ số không còn áp dụng trong năm học mới, vui lòng bấm nút <strong>Tắt</strong> để chuyển trạng thái sang <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">is_active = false</code>. Toàn bộ lịch sử số liệu <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">metric_entries</code> trước đó sẽ luôn được bảo tồn nguyên vẹn.
          </p>
        </div>
      </div>

      {/* Quick Preview Detail Modal */}
      {previewMetric && (
        <div
          id="metric-preview-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setPreviewMetric(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {previewMetric.code}
                  </span>
                  <MetricStatusBadge isActive={previewMetric.is_active} />
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  {previewMetric.name}
                </h3>
              </div>

              <button
                onClick={() => setPreviewMetric(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Nhóm chỉ số:</span>
                <div>
                  <MetricCategoryBadge category={previewMetric.category} />
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Đơn vị đo lường:</span>
                <p className="font-bold text-slate-900 text-sm">{previewMetric.unit}</p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Loại dữ liệu:</span>
                <div>
                  <MetricDataTypeBadge dataType={previewMetric.data_type} />
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Tần suất thu thập:</span>
                <div>
                  <MetricFrequencyBadge frequency={previewMetric.frequency} />
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Phương pháp tổng hợp:</span>
                <p className="font-semibold text-slate-800 uppercase">{previewMetric.aggregation_type}</p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 space-y-1">
                <span className="text-slate-500 font-medium">Chiều hướng mục tiêu:</span>
                <div>
                  <MetricTargetDirectionBadge direction={previewMetric.target_direction} />
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 space-y-1 sm:col-span-2">
                <span className="text-slate-500 font-medium">Đơn vị áp dụng / phụ trách:</span>
                <p className="font-semibold text-slate-800">
                  {previewMetric.unit_info ? `${previewMetric.unit_info.name} (${previewMetric.unit_info.code})` : 'Áp dụng chung toàn trường'}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 space-y-1 sm:col-span-2">
                <span className="text-slate-500 font-medium">Mô tả & Hướng dẫn thu thập:</span>
                <p className="text-slate-700 leading-relaxed">
                  {previewMetric.description || 'Chưa có mô tả chi tiết cho chỉ số này.'}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 space-y-1 sm:col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 font-medium">Nhập liệu thủ công:</span>
                  <p className="font-semibold text-slate-800">
                    {previewMetric.allow_manual_entry ? 'Cho phép nhập liệu qua giao diện' : 'Chỉ cập nhật qua hệ thống / API'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Thứ tự sắp xếp:</span>
                  <p className="font-semibold text-slate-800 text-right">{previewMetric.sort_order}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setPreviewMetric(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = previewMetric.id;
                  setPreviewMetric(null);
                  onNavigateEdit(id);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-900 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-800 shadow-xs"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Chỉnh sửa chỉ số</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
