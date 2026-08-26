/**
 * Database TypeScript Types for Supabase PostgreSQL
 * Represents the 3 core tables:
 * 1. organization_units
 * 2. profiles
 * 3. organization_members
 */

export type SystemRole = 'admin' | 'executive' | 'manager' | 'staff' | 'viewer';

export type UnitType = 
  | 'board'          // Ban giám hiệu / Hội đồng trường
  | 'faculty'        // Khoa đào tạo
  | 'department'     // Phòng / Ban chức năng
  | 'division'       // Tổ bộ môn
  | 'center'         // Trung tâm
  | 'other';         // Khác

export type MemberRole =
  | 'head'           // Trưởng đơn vị / Trưởng khoa / Trưởng phòng
  | 'deputy'         // Phó đơn vị / Phó khoa / Phó phòng
  | 'lead'           // Tổ trưởng / Trưởng nhóm
  | 'member'         // Thành viên / Giảng viên / Chuyên viên
  | 'viewer'         // Chỉ xem
  | 'secretary';     // Thư ký

/**
 * 1. organization_units
 * Đại diện cho các phòng ban, khoa, tổ bộ môn trong trường học
 */
export interface OrganizationUnit {
  id: string;
  parent_id: string | null;
  code: string;
  name: string;
  unit_type: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 2. profiles
 * Hồ sơ thông tin cá nhân và phân quyền hệ thống của nhân sự trường học
 */
export interface Profile {
  id: string; // Khóa ngoại liên kết tới auth.users.id của Supabase
  employee_code: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  system_role: SystemRole;
  job_title: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 3. organization_members
 * Liên kết giữa nhân sự (profiles) và đơn vị phòng ban (organization_units)
 */
export interface OrganizationMember {
  id: string;
  organization_unit_id: string;
  user_id: string;
  member_role: string;
  is_primary: boolean;
  joined_at: string | null;
  left_at: string | null;
  created_at: string;
}

/**
 * Extended View Types for UI presentation
 */
export interface MemberWithDetails extends OrganizationMember {
  profile?: Profile;
  unit?: OrganizationUnit;
}

export interface UnitWithMembers extends OrganizationUnit {
  members?: MemberWithDetails[];
  parent_unit?: OrganizationUnit | null;
  child_units?: OrganizationUnit[];
}

/**
 * Supabase Database Schema Definition for Type Safety
 */
export interface Database {
  public: {
    Tables: {
      organization_units: {
        Row: OrganizationUnit;
        Insert: Omit<OrganizationUnit, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<OrganizationUnit, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string;
        };
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string;
        };
      };
      organization_members: {
        Row: OrganizationMember;
        Insert: Omit<OrganizationMember, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<OrganizationMember, 'id' | 'created_at'>>;
      };
      tasks: {
        Row: any;
        Insert: any;
        Update: any;
      };
      task_assignees: {
        Row: any;
        Insert: any;
        Update: any;
      };
      task_updates: {
        Row: any;
        Insert: any;
        Update: any;
      };
      task_evidence: {
        Row: any;
        Insert: any;
        Update: any;
      };
      task_comments: {
        Row: any;
        Insert: any;
        Update: any;
      };
      metric_definitions: {
        Row: any;
        Insert: any;
        Update: any;
      };
      metric_entries: {
        Row: any;
        Insert: any;
        Update: any;
      };
    };
  };
}
