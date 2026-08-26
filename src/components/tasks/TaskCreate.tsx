import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { taskService } from '../../services/taskService';
import { organizationService } from '../../services/organizationService';
import { profileService } from '../../services/profileService';
import { OrganizationUnit, Profile } from '../../types/database';
import { TaskType, TaskPriority } from '../../types/task';
import { 
  ArrowLeft, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Building2, 
  UserCheck, 
  Users, 
  Calendar, 
  Flag, 
  Briefcase 
} from 'lucide-react';

interface TaskCreateProps {
  onBack: () => void;
  onTaskCreated: (taskId: string) => void;
}

export const TaskCreate: React.FC<TaskCreateProps> = ({ onBack, onTaskCreated }) => {
  const { user, profile, primaryUnit, systemRole, allUnits } = useAuth();

  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [loadingProfiles, setLoadingProfiles] = useState<boolean>(false);

  // Form states
  const [title, setTitle] = useState<string>('');
  const [unitId, setUnitId] = useState<string>('');
  const [ownerId, setOwnerId] = useState<string>('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [taskType, setTaskType] = useState<TaskType>('regular');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnits = async () => {
      setLoadingData(true);
      try {
        const userUnitIds = allUnits.map(u => u.id);
        const availableUnits = await taskService.getAvailableOrganizations(systemRole as any, user?.id || '', allUnits, userUnitIds);
        setUnits(availableUnits);

        // Default initial selections
        if (primaryUnit && availableUnits.some(u => u.id === primaryUnit.id)) {
          setUnitId(primaryUnit.id);
        } else if (availableUnits.length > 0) {
          setUnitId(availableUnits[0].id);
        }
      } catch (err) {
        console.error('Error loading metadata for task creation:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchUnits();
  }, [primaryUnit, user, systemRole, allUnits]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!unitId) {
        setProfiles([]);
        return;
      }
      setLoadingProfiles(true);
      try {
        const members = await taskService.getTaskMembers(unitId);
        setProfiles(members);
        
        // Reset owner if not in the new unit
        if (user && members.some(m => m.id === user.id)) {
          setOwnerId(user.id);
        } else if (members.length > 0) {
          setOwnerId(members[0].id);
        } else {
          setOwnerId('');
        }
        setParticipantIds([]);
      } catch (err) {
        console.error('Error loading members for unit:', err);
      } finally {
        setLoadingProfiles(false);
      }
    };
    fetchMembers();
  }, [unitId, user]);

  const toggleParticipant = (pId: string) => {
    if (participantIds.includes(pId)) {
      setParticipantIds(participantIds.filter((id) => id !== pId));
    } else {
      setParticipantIds([...participantIds, pId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Vui lòng đăng nhập để tạo công việc');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên công việc');
      return;
    }

    if (!unitId) {
      setErrorMsg('Vui lòng chọn đơn vị phụ trách');
      return;
    }

    if (!ownerId) {
      setErrorMsg('Vui lòng chọn người chịu trách nhiệm chính');
      return;
    }

    if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
      setErrorMsg('Hạn hoàn thành không được nhỏ hơn ngày bắt đầu');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await taskService.createTask(
        {
          title: title.trim(),
          description: description.trim() || null,
          organization_unit_id: unitId,
          owner_id: ownerId,
          task_type: taskType,
          priority: priority,
          start_date: startDate || null,
          due_date: dueDate || null,
          participant_ids: participantIds,
        },
        user.id
      );

      if (res.success && res.data) {
        onTaskCreated(res.data.id);
      } else {
        setErrorMsg(res.error || 'Tạo công việc thất bại');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi tạo công việc');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm">Đang tải biểu mẫu tạo công việc...</p>
      </div>
    );
  }

  return (
    <div id="task-create-page" className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-to-task-list"
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại danh sách</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">Mã sinh tự động:</span>
          <span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-semibold text-slate-800">
            TASK-2026-AUTO
          </span>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <PlusCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Tạo công việc mới</h2>
              <p className="text-xs text-slate-500">
                Khởi tạo nhiệm vụ, phân công trách nhiệm cho các đơn vị và cán bộ trong trường
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs font-medium text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Tên công việc */}
          <div>
            <label htmlFor="task-title-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên công việc / Nhiệm vụ <span className="text-rose-500">*</span>
            </label>
            <input
              id="task-title-input"
              type="text"
              required
              placeholder="VD: Rà soát và thẩm định đề cương chi tiết học phần Học kỳ I năm học 2026-2027"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 font-medium placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* 2. Đơn vị & Người chịu trách nhiệm */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Đơn vị */}
            <div>
              <label htmlFor="task-unit-select" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                <span>Đơn vị phụ trách</span> <span className="text-rose-500">*</span>
              </label>
              <select
                id="task-unit-select"
                required
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code} - {unit.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Người chịu trách nhiệm chính */}
            <div>
              <label htmlFor="task-owner-select" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                <span>Người chịu trách nhiệm chính</span> <span className="text-rose-500">*</span>
              </label>
              <select
                id="task-owner-select"
                required
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                disabled={loadingProfiles}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:opacity-50"
              >
                {loadingProfiles ? (
                  <option value="">Đang tải danh sách cán bộ...</option>
                ) : profiles.length === 0 ? (
                  <option value="">Không có cán bộ nào trong đơn vị</option>
                ) : (
                  profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} {p.job_title ? `(${p.job_title})` : ''} {p.employee_code ? `- ${p.employee_code}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* 3. Người tham gia phối hợp */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              <span>Người tham gia phối hợp</span>
              <span className="text-xs font-normal text-slate-400 normal-case">
                (Đã chọn {participantIds.length} người)
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 rounded-xl border border-slate-200 bg-slate-50/50">
              {loadingProfiles ? (
                <div className="col-span-full py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Đang tải danh sách...
                </div>
              ) : profiles.length === 0 ? (
                <div className="col-span-full py-4 text-center text-xs text-slate-500">
                  Không có cán bộ nào trong đơn vị
                </div>
              ) : (
                profiles.map((p) => {
                  const isSelected = participantIds.includes(p.id);
                  const isOwner = p.id === ownerId;
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer border transition-all ${
                        isOwner
                          ? 'bg-blue-50/80 border-blue-200 text-blue-800 opacity-80 cursor-not-allowed'
                          : isSelected
                          ? 'bg-white border-blue-500 text-blue-900 shadow-2xs font-semibold'
                          : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={isOwner}
                        checked={isSelected || isOwner}
                        onChange={() => toggleParticipant(p.id)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{p.full_name}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {isOwner ? 'Chịu trách nhiệm chính' : (p.job_title || 'Thành viên')}
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* 4. Loại công việc, Mức độ ưu tiên, Ngày bắt đầu & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Loại công việc */}
            <div>
              <label htmlFor="task-type-select" className="flex items-center gap-1 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                <span>Loại công việc</span>
              </label>
              <select
                id="task-type-select"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as TaskType)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="regular">Thường quy</option>
                <option value="teaching">Giảng dạy & Đào tạo</option>
                <option value="administrative">Hành chính</option>
                <option value="strategic">Chiến lược / Đổi mới</option>
                <option value="event">Sự kiện / Phong trào</option>
                <option value="urgent">Đột xuất</option>
                <option value="other">Khác</option>
              </select>
            </div>

            {/* Mức độ ưu tiên */}
            <div>
              <label htmlFor="task-priority-select" className="flex items-center gap-1 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                <Flag className="h-3.5 w-3.5 text-blue-600" />
                <span>Mức ưu tiên</span>
              </label>
              <select
                id="task-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
                <option value="urgent">Khẩn cấp</option>
              </select>
            </div>

            {/* Ngày bắt đầu */}
            <div>
              <label htmlFor="task-start-date" className="flex items-center gap-1 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                <span>Ngày bắt đầu</span>
              </label>
              <input
                id="task-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Hạn hoàn thành */}
            <div>
              <label htmlFor="task-due-date" className="flex items-center gap-1 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-rose-600" />
                <span>Hạn hoàn thành (Deadline)</span>
              </label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 5. Mô tả chi tiết */}
          <div>
            <label htmlFor="task-desc-textarea" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mô tả chi tiết & Yêu cầu kết quả đầu ra
            </label>
            <textarea
              id="task-desc-textarea"
              rows={4}
              placeholder="Ghi chú chi tiết mục tiêu, tiêu chí đánh giá, các bước thực hiện..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Notice info */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Quy tắc khởi tạo:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              <li>Tiến độ ban đầu mặc định là <strong>0%</strong>.</li>
              <li>Trạng thái mặc định là <strong>Chưa thực hiện (todo)</strong>.</li>
              <li>Người tạo: <strong>{profile?.full_name || user?.email}</strong>.</li>
            </ul>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              id="btn-cancel-create-task"
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              id="btn-submit-create-task"
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang khởi tạo...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Tạo công việc
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
