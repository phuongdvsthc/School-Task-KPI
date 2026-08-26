/**
 * TypeScript Types for TASK Engine v0.2
 * Đại diện cho 5 bảng Task trong Supabase PostgreSQL:
 * 1. tasks
 * 2. task_assignees
 * 3. task_updates
 * 4. task_evidence
 * 5. task_comments
 */
import { OrganizationUnit, Profile, SystemRole } from './database';

export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskType = 'regular' | 'strategic' | 'urgent' | 'teaching' | 'administrative' | 'event' | 'other';
export type AssignmentRole = 'responsible' | 'participant' | 'reviewer' | 'supporter';
export type EvidenceType = 'link' | 'document' | 'image' | 'report' | 'other';
export type UpdateType = 'progress_update' | 'status_change' | 'comment' | 'evidence_added' | 'general';

/**
 * 1. Bảng tasks
 */
export interface Task {
  id: string;
  organization_unit_id: string;
  parent_task_id: string | null;
  task_code: string;
  title: string;
  description: string | null;
  task_type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  old_progress?: number;
  new_progress?: number;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by: string;
  owner_id: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 2. Bảng task_assignees
 */
export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assignment_role: AssignmentRole | string;
  assigned_by: string;
  assigned_at: string;
  // Join fields
  profile?: Profile;
}

/**
 * 3. Bảng task_updates (Lịch sử cập nhật tiến độ)
 */
export interface TaskUpdate {
  id: string;
  task_id: string;
  user_id: string;
  update_type: UpdateType | string;
  progress: number;
  old_status: TaskStatus | null;
  new_status: TaskStatus | null;
  content: string | null;
  created_at: string;
  // Join fields
  user_profile?: Profile;
}

/**
 * 4. Bảng task_evidence (Minh chứng hoàn thành)
 */
export interface TaskEvidence {
  id: string;
  task_id: string;
  uploaded_by: string;
  evidence_type: EvidenceType | string;
  title: string;
  description: string | null;
  file_url: string | null;
  external_url: string | null;
  created_at: string;
  // Join fields
  uploader_profile?: Profile;
}

/**
 * 5. Bảng task_comments (Trao đổi & thảo luận)
 */
export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  // Join fields
  user_profile?: Profile;
}

/**
 * Chi tiết toàn diện của một Task bao gồm các bảng con
 */
export interface FullTaskDetails extends Task {
  unit?: OrganizationUnit;
  owner_profile?: Profile;
  creator_profile?: Profile;
  assignees: TaskAssignee[];
  updates: TaskUpdate[];
  evidence: TaskEvidence[];
  comments: TaskComment[];
}

/**
 * Filter options for Task List
 */
export interface TaskFilterOptions {
  unit_id?: string;
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  owner_id?: string;
  assignee_id?: string;
  search_query?: string;
  date_range?: {
    from?: string;
    to?: string;
  };
  is_archived?: boolean;
}

/**
 * Dữ liệu khởi tạo Task mới
 */
export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  organization_unit_id: string;
  owner_id: string;
  task_type?: TaskType;
  priority?: TaskPriority;
  start_date?: string | null;
  due_date?: string | null;
  parent_task_id?: string | null;
  participant_ids?: string[]; // IDs của những người tham gia
}

/**
 * Dữ liệu cập nhật tiến độ
 */
export interface UpdateProgressPayload {
  taskId: string;
  userId: string;
  progress: number;
  newStatus: TaskStatus;
  content: string;
}

/**
 * Dữ liệu thêm minh chứng
 */
export interface AddEvidencePayload {
  taskId: string;
  uploadedBy: string;
  title: string;
  description?: string;
  evidenceType?: EvidenceType;
  fileUrl?: string;
  externalUrl?: string;
}

/**
 * Dữ liệu thêm bình luận
 */
export interface AddCommentPayload {
  taskId: string;
  userId: string;
  content: string;
  parentCommentId?: string | null;
}

/**
 * Helper kiểm tra quyền thao tác trên Task
 */
export interface TaskPermissionCheck {
  canView: boolean;
  canEdit: boolean;
  canUpdateProgress: boolean;
  canDelete: boolean;
}

export function checkTaskPermissions(
  systemRole: SystemRole | null,
  userId: string | null,
  userUnitIds: string[],
  task: Task | null,
  isAssignee: boolean = false
): TaskPermissionCheck {
  if (!systemRole || !userId) {
    return { canView: false, canEdit: false, canUpdateProgress: false, canDelete: false };
  }

  // 1. admin: xem và sửa tất cả
  if (systemRole === 'admin') {
    return { canView: true, canEdit: true, canUpdateProgress: true, canDelete: true };
  }

  // 2. executive: xem tất cả; không cần sửa công việc
  if (systemRole === 'executive') {
    return { canView: true, canEdit: false, canUpdateProgress: false, canDelete: false };
  }

  if (!task) {
    // Cho các trang tạo mới
    if (systemRole === 'manager' || systemRole === 'staff') {
      return { canView: true, canEdit: true, canUpdateProgress: true, canDelete: false };
    }
    return { canView: false, canEdit: false, canUpdateProgress: false, canDelete: false };
  }

  // 3. manager: xem công việc thuộc đơn vị mình; tạo công việc; sửa công việc thuộc đơn vị mình
  if (systemRole === 'manager') {
    const isSameUnit = userUnitIds.includes(task.organization_unit_id);
    const isOwnerOrCreator = task.owner_id === userId || task.created_by === userId;
    const canAccess = isSameUnit || isOwnerOrCreator;

    return {
      canView: canAccess,
      canEdit: canAccess,
      canUpdateProgress: canAccess,
      canDelete: isSameUnit && task.created_by === userId,
    };
  }

  // 4. staff: xem công việc được giao hoặc mình tạo; cập nhật tiến độ công việc mình tham gia
  if (systemRole === 'staff') {
    const isOwner = task.owner_id === userId;
    const isCreator = task.created_by === userId;
    const canAccess = isOwner || isCreator || isAssignee;

    return {
      canView: canAccess,
      canEdit: isCreator || isOwner,
      canUpdateProgress: canAccess, // Cán bộ được tham gia có quyền cập nhật tiến độ
      canDelete: false,
    };
  }

  // 5. viewer: chỉ xem những dữ liệu được cấp quyền
  return {
    canView: userUnitIds.includes(task.organization_unit_id) || task.owner_id === userId,
    canEdit: false,
    canUpdateProgress: false,
    canDelete: false,
  };
}
