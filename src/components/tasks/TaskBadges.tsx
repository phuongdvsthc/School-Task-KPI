import React from 'react';
import { TaskStatus, TaskPriority, TaskType } from '../../types/task';
import { CheckCircle2, Clock, PlayCircle, AlertCircle, XCircle, ShieldAlert, BookOpen, Briefcase, Calendar, Star, FileText } from 'lucide-react';

export const TaskStatusBadge: React.FC<{ status: TaskStatus; className?: string }> = ({ status, className = '' }) => {
  switch (status) {
    case 'completed':
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Hoàn thành
        </span>
      );
    case 'in_progress':
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 ${className}`}
        >
          <PlayCircle className="w-3.5 h-3.5" />
          Đang thực hiện
        </span>
      );
    case 'review':
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Chờ duyệt / Nghiệm thu
        </span>
      );
    case 'cancelled':
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 ${className}`}
        >
          <XCircle className="w-3.5 h-3.5" />
          Đã hủy
        </span>
      );
    case 'todo':
    default:
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        >
          <Clock className="w-3.5 h-3.5" />
          Chưa thực hiện
        </span>
      );
  }
};

export const TaskPriorityBadge: React.FC<{ priority: TaskPriority; className?: string }> = ({ priority, className = '' }) => {
  switch (priority) {
    case 'urgent':
      return (
        <span
          id={`priority-badge-${priority}`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200 ${className}`}
        >
          <ShieldAlert className="w-3 h-3 text-red-600" />
          Khẩn cấp
        </span>
      );
    case 'high':
      return (
        <span
          id={`priority-badge-${priority}`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 ${className}`}
        >
          Cao
        </span>
      );
    case 'medium':
      return (
        <span
          id={`priority-badge-${priority}`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        >
          Trung bình
        </span>
      );
    case 'low':
    default:
      return (
        <span
          id={`priority-badge-${priority}`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 ${className}`}
        >
          Thấp
        </span>
      );
  }
};

export const TaskTypeBadge: React.FC<{ type: TaskType; className?: string }> = ({ type, className = '' }) => {
  switch (type) {
    case 'teaching':
      return (
        <span className={`inline-flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded ${className}`}>
          <BookOpen className="w-3 h-3" />
          Giảng dạy & Đào tạo
        </span>
      );
    case 'administrative':
      return (
        <span className={`inline-flex items-center gap-1 text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded ${className}`}>
          <Briefcase className="w-3 h-3" />
          Hành chính
        </span>
      );
    case 'strategic':
      return (
        <span className={`inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded ${className}`}>
          <Star className="w-3 h-3" />
          Chiến lược / Đổi mới
        </span>
      );
    case 'event':
      return (
        <span className={`inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded ${className}`}>
          <Calendar className="w-3 h-3" />
          Sự kiện / Phong trào
        </span>
      );
    case 'urgent':
      return (
        <span className={`inline-flex items-center gap-1 text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded ${className}`}>
          <ShieldAlert className="w-3 h-3" />
          Đột xuất
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded ${className}`}>
          <FileText className="w-3 h-3" />
          Thường quy
        </span>
      );
  }
};
