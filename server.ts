import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  
  const authenticateUser = async (req: Request, res: Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({ error: 'No authorization header' });
        return;
      }
      const token = authHeader.replace('Bearer ', '');
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseServiceKey) {
        res.status(500).json({ error: 'Server configuration error' });
        return;
      }
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('system_role')
        .eq('id', user.id)
        .single();
      if (profileError || !profile) {
        res.status(403).json({ error: 'Forbidden: Profile not found' });
        return;
      }

      res.locals.supabaseAdmin = supabaseAdmin;
      res.locals.user = user;
      (req as any).user = user;
      res.locals.profile = profile;
      next();
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };


  // Helper middleware for Supabase Admin Auth
  const authenticateAdmin = async (req: Request, res: Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({ error: 'No authorization header' });
        return;
      }
      const token = authHeader.replace('Bearer ', '');

      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        res.status(500).json({ error: 'Server configuration error' });
        return;
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('system_role')
        .eq('id', user.id)
        .single();

      if (profileError || profile?.system_role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
      }

      // Pass supabase admin client and user via locals
      res.locals.supabaseAdmin = supabaseAdmin;
      res.locals.adminUser = user;
      res.locals.user = user;
      (req as any).user = user;
      next();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  // API Routes
  
  // GET All Users
  app.get('/api/admin/users', authenticateAdmin, async (req: Request, res: Response) => {
    const supabaseAdmin = res.locals.supabaseAdmin;

    try {
      // Fetch profiles
      const { data: profiles, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileErr) {
        res.status(400).json({ error: profileErr.message });
        return;
      }

      // Fetch organization memberships with unit details where is_primary = true
      const { data: orgMembers, error: orgErr } = await supabaseAdmin
        .from('organization_members')
        .select(`
          *,
          organization_units (*)
        `)
        .eq('is_primary', true);

      if (orgErr) {
        res.status(400).json({ error: orgErr.message });
        return;
      }

      const memberMap = new Map();
      orgMembers?.forEach((m: any) => {
        memberMap.set(m.user_id, {
          unit: m.organization_units,
          role: m.member_role
        });
      });

      const result = (profiles || []).map((p: any) => {
        const orgInfo = memberMap.get(p.id);
        return {
          id: p.id,
          employee_code: p.employee_code,
          full_name: p.full_name,
          email: p.email,
          job_title: p.job_title,
          system_role: p.system_role,
          is_active: p.is_active,
          organization_unit_id: orgInfo?.unit?.id || null,
          organization_unit_name: orgInfo?.unit?.name || null,
          member_role: orgInfo?.role || null,
          is_primary: !!orgInfo
        };
      });

      res.json({ users: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET Single User
  app.get('/api/admin/users/:id', authenticateAdmin, async (req: Request, res: Response) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    const targetUserId = req.params.id;

    try {
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (profileErr) {
        res.status(400).json({ error: profileErr.message });
        return;
      }

      const { data: orgMember, error: orgErr } = await supabaseAdmin
        .from('organization_members')
        .select(`
          *,
          organization_units (*)
        `)
        .eq('user_id', targetUserId)
        .eq('is_primary', true)
        .maybeSingle();

      if (orgErr) {
        res.status(400).json({ error: orgErr.message });
        return;
      }

      const result = {
        id: profile.id,
        employee_code: profile.employee_code,
        full_name: profile.full_name,
        email: profile.email,
        job_title: profile.job_title,
        system_role: profile.system_role,
        is_active: profile.is_active,
        organization_unit_id: orgMember?.organization_units?.id || null,
        organization_unit_name: orgMember?.organization_units?.name || null,
        member_role: orgMember?.member_role || null,
        is_primary: !!orgMember
      };

      res.json({ user: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // CREATE User
  app.post('/api/admin/users', authenticateAdmin, async (req: Request, res: Response) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    const { 
      email, temporary_password, full_name, employee_code, job_title, 
      system_role, organization_unit_id, member_role, is_active 
    } = req.body;

    try {
      // 1. Create Supabase Auth user
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporary_password,
        email_confirm: true,
      });

      if (createError) {
        res.status(400).json({ error: createError.message });
        return;
      }

      const newUserId = authData.user.id;

      // 2. Insert public.profiles
      const { error: insertProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUserId,
          full_name,
          email,
          employee_code,
          job_title,
          system_role,
          is_active: is_active ?? true,
        });

      if (insertProfileError) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        res.status(400).json({ error: `Failed to create profile: ${insertProfileError.message}` });
        return;
      }

      // 3. Insert organization_members
      if (organization_unit_id && member_role) {
        const { error: insertMemberError } = await supabaseAdmin
          .from('organization_members')
          .insert({
            user_id: newUserId,
            organization_unit_id,
            member_role,
            is_primary: true
          });

        if (insertMemberError) {
          await supabaseAdmin.from('profiles').delete().eq('id', newUserId);
          await supabaseAdmin.auth.admin.deleteUser(newUserId);
          res.status(400).json({ error: `Failed to assign organization: ${insertMemberError.message}` });
          return;
        }
      }

      res.json({ success: true, user: { id: newUserId } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  
  // GET /api/task-members
  app.get('/api/task-members', authenticateUser, async (req: Request, res: Response) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    const user = res.locals.user;
    const profile = res.locals.profile;
    const orgId = req.query.organization_unit_id as string;

    if (!orgId) {
      res.status(400).json({ error: 'Missing organization_unit_id' });
      return;
    }

    try {
      // Check permissions
      if (profile.system_role !== 'admin') {
        if (profile.system_role === 'executive' || profile.system_role === 'viewer') {
          res.status(403).json({ error: 'Forbidden: Role not allowed to create tasks' });
          return;
        }
        
        // For manager and staff, check if they belong to this org
        const { data: userMember, error: checkErr } = await supabaseAdmin
          .from('organization_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('organization_unit_id', orgId)
          .maybeSingle();
          
        if (checkErr || !userMember) {
          res.status(403).json({ error: 'Forbidden: You do not have access to this organization' });
          return;
        }
      }

      // Fetch active members of the organization
      const { data: members, error: fetchErr } = await supabaseAdmin
        .from('organization_members')
        .select(`
          user_id,
          profiles!inner (
            id,
            full_name,
            employee_code,
            job_title,
            is_active
          )
        `)
        .eq('organization_unit_id', orgId)
        .eq('profiles.is_active', true);

      if (fetchErr) {
        res.status(500).json({ error: `Database error: ${fetchErr.message}` });
        return;
      }

      // Map to flat structure
      const formattedMembers = members.map((m: any) => ({
        id: m.profiles.id,
        full_name: m.profiles.full_name,
        employee_code: m.profiles.employee_code,
        job_title: m.profiles.job_title
      }));

      res.json(formattedMembers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // UPDATE User
  app.put('/api/admin/users/:id', authenticateAdmin, async (req: Request, res: Response) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    const targetUserId = req.params.id;
    const { 
      full_name, employee_code, job_title, 
      system_role, is_active, organization_unit_id, member_role 
    } = req.body;

    try {
      // 1. Update profiles
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          full_name,
          employee_code,
          job_title,
          system_role,
          is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUserId);

      if (updateProfileError) {
        res.status(400).json({ error: `Failed to update profile: ${updateProfileError.message}` });
        return;
      }

      // 2. Update organization
      // Find existing primary org
      const { data: existingPrimary, error: primaryErr } = await supabaseAdmin
        .from('organization_members')
        .select('id, organization_unit_id')
        .eq('user_id', targetUserId)
        .eq('is_primary', true)
        .maybeSingle();

      if (primaryErr) console.error("Error fetching primary org", primaryErr);

      if (organization_unit_id) {
        if (existingPrimary) {
          if (existingPrimary.organization_unit_id !== organization_unit_id) {
            await supabaseAdmin.from('organization_members').update({ is_primary: false }).eq('id', existingPrimary.id);
            
            const { data: checkExist } = await supabaseAdmin
              .from('organization_members')
              .select('id')
              .eq('user_id', targetUserId)
              .eq('organization_unit_id', organization_unit_id)
              .maybeSingle();
              
            if (checkExist) {
               await supabaseAdmin.from('organization_members').update({ is_primary: true, member_role: member_role || 'member' }).eq('id', checkExist.id);
            } else {
               await supabaseAdmin.from('organization_members').insert({
                 user_id: targetUserId,
                 organization_unit_id,
                 member_role: member_role || 'member',
                 is_primary: true
               });
            }
          } else if (member_role) {
             await supabaseAdmin.from('organization_members').update({ member_role }).eq('id', existingPrimary.id);
          }
        } else {
          await supabaseAdmin
            .from('organization_members')
            .insert({
              user_id: targetUserId,
              organization_unit_id,
              member_role: member_role || 'member',
              is_primary: true
            });
        }
      } else if (existingPrimary) {
        // If organization_unit_id is cleared, unset is_primary
        await supabaseAdmin.from('organization_members').update({ is_primary: false }).eq('id', existingPrimary.id);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE User
  app.delete('/api/admin/users/:id', authenticateAdmin, async (req: Request, res: Response) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    const targetUserId = req.params.id;
    const adminUserId = res.locals.adminUser.id;

    if (targetUserId === adminUserId) {
      res.status(400).json({ error: 'Không thể tự xóa chính mình.' });
      return;
    }

    try {
      // Supabase auth admin deleteUser will cascade delete profile IF configured.
      // However, if there are FK constraints on profile, it might fail.
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

      if (deleteError) {
        // Checking for common constraint errors
        if (deleteError.message.includes('violates foreign key constraint') || deleteError.message.includes('foreign key')) {
          res.status(400).json({ error: 'Không thể xóa tài khoản vì người dùng đã có dữ liệu phát sinh. Hãy khóa tài khoản thay thế.' });
        } else {
          res.status(400).json({ error: `Lỗi xóa tài khoản: ${deleteError.message}` });
        }
        return;
      }

      res.json({ success: true });
    } catch (err: any) {
      if (err.message?.includes('violates foreign key constraint') || err.message?.includes('foreign key')) {
        res.status(400).json({ error: 'Không thể xóa tài khoản vì người dùng đã có dữ liệu phát sinh. Hãy khóa tài khoản thay thế.' });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  // RESET PASSWORD (Admin)
  app.post('/api/admin/users/:id/reset-password', authenticateAdmin, async (req: Request, res: Response) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    const targetUserId = req.params.id;
    const adminUserId = res.locals.adminUser.id;
    const { new_password } = req.body;

    if (targetUserId === adminUserId) {
      res.status(400).json({ error: 'Không thể tự đặt lại mật khẩu bằng chức năng này. Vui lòng vào phần Bảo mật của tài khoản.' });
      return;
    }

    if (!new_password || new_password.length < 8) {
      res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
      return;
    }

    try {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password: new_password
      });

      if (updateError) {
        res.status(400).json({ error: `Lỗi đặt lại mật khẩu: ${updateError.message}` });
        return;
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // --------------------------------------------------------
  // ORGANIZATION UNITS (Admin only)
  // --------------------------------------------------------

  // GET All organization units
  app.get('/api/admin/organization-units', authenticateAdmin, async (req: Request, res: Response) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    try {
      const { data, error } = await supabaseAdmin
        .from('organization_units')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
        
      if (error) throw new Error(error.message);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET Single organization unit
  app.get('/api/admin/organization-units/:id', authenticateAdmin, async (req: Request, res: Response) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    try {
      const { data, error } = await supabaseAdmin
        .from('organization_units')
        .select('*')
        .eq('id', req.params.id)
        .single();
        
      if (error) throw new Error(error.message);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST Create organization unit
  app.post('/api/admin/organization-units', authenticateAdmin, async (req: Request, res: Response) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    const { name, code, unit_type, parent_id, description, sort_order, is_active } = req.body;
    
    try {
      if (!name) throw new Error('Tên đơn vị là bắt buộc');
      if (!code) throw new Error('Mã đơn vị là bắt buộc');
      
      const cleanCode = code.trim().toUpperCase();
      if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
        throw new Error('Mã đơn vị chỉ được chứa chữ cái, số, dấu gạch ngang và gạch dưới');
      }

      // Check code uniqueness
      const { data: existing } = await supabaseAdmin
        .from('organization_units')
        .select('id')
        .eq('code', cleanCode)
        .maybeSingle();
        
      if (existing) {
        throw new Error('Mã đơn vị đã tồn tại');
      }

      // Check parent constraint
      if (parent_id) {
         const { data: parent } = await supabaseAdmin.from('organization_units').select('is_active').eq('id', parent_id).single();
         if (!parent || !parent.is_active) throw new Error('Đơn vị cấp trên không tồn tại hoặc đã bị vô hiệu hóa');
      }

      const { data, error } = await supabaseAdmin
        .from('organization_units')
        .insert({
           name, 
           code: cleanCode, 
           unit_type, 
           parent_id: parent_id || null, 
           description, 
           sort_order: sort_order || 0, 
           is_active: is_active ?? true
        })
        .select()
        .single();
        
      if (error) throw new Error(error.message);
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // PUT Update organization unit
  app.put('/api/admin/organization-units/:id', authenticateAdmin, async (req: Request, res: Response) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    const id = req.params.id;
    const { name, code, unit_type, parent_id, description, sort_order, is_active } = req.body;
    
    try {
      if (!name) throw new Error('Tên đơn vị là bắt buộc');
      if (!code) throw new Error('Mã đơn vị là bắt buộc');

      // 1. Get current
      const { data: current, error: currentErr } = await supabaseAdmin.from('organization_units').select('*').eq('id', id).single();
      if (currentErr || !current) throw new Error('Không tìm thấy đơn vị');

      // 2. Prevent invalid operations on ROOT
      const isRoot = !current.parent_id && current.unit_type === 'school';
      if (isRoot) {
         if (parent_id) throw new Error('Không thể gán đơn vị cha cho root (Trường)');
         if (is_active === false) throw new Error('Không thể vô hiệu hóa đơn vị root');
         // We do allow name, code, description, sort_order
      }

      // 3. Validation code
      const cleanCode = code.trim().toUpperCase();
      if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
        throw new Error('Mã đơn vị chỉ được chứa chữ cái, số, dấu gạch ngang và gạch dưới');
      }

      if (cleanCode !== current.code) {
        const { data: existing } = await supabaseAdmin.from('organization_units').select('id').eq('code', cleanCode).maybeSingle();
        if (existing) throw new Error('Mã đơn vị đã tồn tại');
      }

      // 4. Validate Parent & Cycle
      if (parent_id && parent_id !== current.parent_id) {
         if (parent_id === id) throw new Error('Đơn vị cha không hợp lệ (không thể chọn chính mình)');
         
         const { data: parentInfo } = await supabaseAdmin.from('organization_units').select('is_active').eq('id', parent_id).single();
         if (!parentInfo || !parentInfo.is_active) throw new Error('Đơn vị cấp trên không tồn tại hoặc đã bị vô hiệu hóa');

         // Check cycle: find all ancestors of parent_id, if any is `id`, then cycle
         let checkId = parent_id;
         while (checkId) {
             const { data: ancestor } = await supabaseAdmin.from('organization_units').select('parent_id').eq('id', checkId).single();
             if (!ancestor) break;
             if (ancestor.parent_id === id) {
                 throw new Error('Tạo thành vòng lặp: Đơn vị cha không thể là đơn vị con của đơn vị hiện tại');
             }
             checkId = ancestor.parent_id;
         }
      }

      // 5. Check deactivate constraint
      if (is_active === false && current.is_active === true) {
         const { data: activeChildren } = await supabaseAdmin.from('organization_units').select('id').eq('parent_id', id).eq('is_active', true).limit(1);
         if (activeChildren && activeChildren.length > 0) {
             throw new Error('Đơn vị vẫn còn đơn vị trực thuộc đang hoạt động. Hãy ngừng các đơn vị con trước.');
         }
      }

      const { data, error } = await supabaseAdmin
        .from('organization_units')
        .update({
           name, 
           code: cleanCode, 
           unit_type: isRoot ? 'school' : unit_type, 
           parent_id: isRoot ? null : (parent_id || null), 
           description, 
           sort_order: sort_order || 0, 
           is_active: isRoot ? true : (is_active ?? true),
           updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw new Error(error.message);
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE organization unit
  app.delete('/api/admin/organization-units/:id', authenticateAdmin, async (req: Request, res: Response) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    const id = req.params.id;
    
    try {
      const { data: current, error: currentErr } = await supabaseAdmin.from('organization_units').select('*').eq('id', id).single();
      if (currentErr || !current) throw new Error('Không tìm thấy đơn vị');

      const isRoot = !current.parent_id && current.unit_type === 'school';
      if (isRoot) {
         throw new Error('Không thể xóa đơn vị root (Trường)');
      }

      // Check dependencies
      // 1. organization_units.parent_id
      const { count: c1 } = await supabaseAdmin.from('organization_units').select('*', { count: 'exact', head: true }).eq('parent_id', id);
      if (c1 > 0) throw new Error('Không thể xóa đơn vị vì đã có dữ liệu phát sinh. Hãy sử dụng Ngừng sử dụng.');

      // 2. organization_members.organization_unit_id
      const { count: c2 } = await supabaseAdmin.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_unit_id', id);
      if (c2 > 0) throw new Error('Không thể xóa đơn vị vì đã có dữ liệu phát sinh. Hãy sử dụng Ngừng sử dụng.');

      // 3. tasks.organization_unit_id
      const { count: c3 } = await supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('organization_unit_id', id);
      if (c3 > 0) throw new Error('Không thể xóa đơn vị vì đã có dữ liệu phát sinh. Hãy sử dụng Ngừng sử dụng.');

      // 4. daily_reports.organization_unit_id
      const { count: c4 } = await supabaseAdmin.from('daily_reports').select('*', { count: 'exact', head: true }).eq('organization_unit_id', id);
      if (c4 > 0) throw new Error('Không thể xóa đơn vị vì đã có dữ liệu phát sinh. Hãy sử dụng Ngừng sử dụng.');

      // 5. metric_definitions.organization_unit_id
      const { count: c5 } = await supabaseAdmin.from('metric_definitions').select('*', { count: 'exact', head: true }).eq('organization_unit_id', id);
      if (c5 > 0) throw new Error('Không thể xóa đơn vị vì đã có dữ liệu phát sinh. Hãy sử dụng Ngừng sử dụng.');

      // 6. metric_entries.organization_unit_id
      const { count: c6 } = await supabaseAdmin.from('metric_entries').select('*', { count: 'exact', head: true }).eq('organization_unit_id', id);
      if (c6 > 0) throw new Error('Không thể xóa đơn vị vì đã có dữ liệu phát sinh. Hãy sử dụng Ngừng sử dụng.');

      const { error: delError } = await supabaseAdmin.from('organization_units').delete().eq('id', id);
      if (delError) throw new Error(delError.message);

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });


  // --------------------------------------------------------
  // SYSTEM SETTINGS
  // --------------------------------------------------------

  const PUBLIC_SETTINGS_WHITELIST = [
    'app_name',
    'organization_short_name',
    'organization_address',
    'organization_phone',
    'organization_email',
    'organization_website',
    'timezone',
    'date_format',
    'locale',
    'logo_path',
    'logo_small_path',
    'favicon_path'
  ];

  // GET Public Settings
  app.get('/api/settings/public', async (req: Request, res: Response) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

      // Get root organization
      const { data: rootOrg } = await supabaseAdmin
        .from('organization_units')
        .select('name')
        .is('parent_id', null)
        .eq('unit_type', 'school')
        .maybeSingle();

      // Get whitelisted settings
      const { data: settings } = await supabaseAdmin
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', PUBLIC_SETTINGS_WHITELIST)
        .eq('is_public', true);

      const settingsMap = (settings || []).reduce((acc: any, cur: any) => {
        acc[cur.setting_key] = cur.setting_value;
        return acc;
      }, {});

      res.json({
        organizationName: rootOrg?.name || '',
        organizationShortName: settingsMap.organization_short_name || '',
        appName: settingsMap.app_name || '',
        organizationAddress: settingsMap.organization_address || '',
        organizationPhone: settingsMap.organization_phone || '',
        organizationEmail: settingsMap.organization_email || '',
        organizationWebsite: settingsMap.organization_website || '',
        timezone: settingsMap.timezone || 'Asia/Ho_Chi_Minh',
        dateFormat: settingsMap.date_format || 'dd/MM/yyyy',
        locale: settingsMap.locale || 'vi-VN',
        logoPath: settingsMap.logo_path || '',
        logoSmallPath: settingsMap.logo_small_path || '',
        faviconPath: settingsMap.favicon_path || ''
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET Admin Settings
  app.get('/api/admin/settings', authenticateAdmin, async (req: Request, res: Response) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    try {
      const { data: rootOrg } = await supabaseAdmin
        .from('organization_units')
        .select('id, name, code')
        .is('parent_id', null)
        .eq('unit_type', 'school')
        .maybeSingle();

      const { data: settings } = await supabaseAdmin
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', PUBLIC_SETTINGS_WHITELIST);

      const settingsMap = (settings || []).reduce((acc: any, cur: any) => {
        acc[cur.setting_key] = cur.setting_value;
        return acc;
      }, {});

      res.json({
        rootOrg: rootOrg || null,
        settings: settingsMap
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT Admin Settings
  app.put('/api/admin/settings', authenticateAdmin, async (req: Request, res: Response) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    const adminUserId = res.locals.adminUser.id;
    const { rootOrgName, settings } = req.body;

    try {
      if (!rootOrgName || !rootOrgName.trim()) throw new Error('Tên đơn vị là bắt buộc');
      if (!settings.app_name || !settings.app_name.trim()) throw new Error('Tên phần mềm là bắt buộc');
      if (!settings.organization_short_name || !settings.organization_short_name.trim()) throw new Error('Tên viết tắt là bắt buộc');

      if (settings.organization_email && !/^\S+@\S+\.\S+$/.test(settings.organization_email)) {
        throw new Error('Email không hợp lệ');
      }

      if (settings.organization_website) {
        try {
          new URL(settings.organization_website);
        } catch {
          throw new Error('Website không hợp lệ');
        }
      }

      // 1. Update Root Org
      const { data: currentRoot } = await supabaseAdmin
        .from('organization_units')
        .select('id')
        .is('parent_id', null)
        .eq('unit_type', 'school')
        .maybeSingle();

      if (currentRoot) {
        const { error: rootErr } = await supabaseAdmin
          .from('organization_units')
          .update({ name: rootOrgName.trim(), updated_at: new Date().toISOString() })
          .eq('id', currentRoot.id);
        if (rootErr) throw new Error(`Lỗi cập nhật tên đơn vị: ${rootErr.message}`);
      } else {
         // Create root org if not exists
         const { error: insertRootErr } = await supabaseAdmin.from('organization_units').insert({
            name: rootOrgName.trim(),
            code: 'ROOT',
            unit_type: 'school',
            is_active: true
         });
         if (insertRootErr) throw new Error(`Lỗi khởi tạo đơn vị root: ${insertRootErr.message}`);
      }

      // 2. Update System Settings
      const updatableKeys = [
        'app_name', 'organization_short_name', 'organization_address',
        'organization_phone', 'organization_email', 'organization_website',
        'timezone', 'date_format', 'locale'
      ];

      for (const key of updatableKeys) {
        const val = settings[key];
        const finalVal = val !== undefined ? (typeof val === 'string' ? val.trim() : val) : null;
        
        // Find existing
        const { data: existing } = await supabaseAdmin.from('system_settings').select('id').eq('setting_key', key).maybeSingle();
        if (existing) {
          await supabaseAdmin.from('system_settings').update({ setting_value: finalVal, updated_by: adminUserId, updated_at: new Date().toISOString() }).eq('id', existing.id);
        } else {
          await supabaseAdmin.from('system_settings').insert({
            setting_key: key,
            setting_value: finalVal,
            is_public: true,
            updated_by: adminUserId
          });
        }
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
  });

  const ALLOWED_MIMES = {
    'logo': ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    'logo-small': ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    'favicon': ['image/png', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
  };

  const TYPE_TO_KEY = {
    'logo': 'logo_path',
    'logo-small': 'logo_small_path',
    'favicon': 'favicon_path'
  };

  app.post('/api/admin/settings/assets/:type', authenticateAdmin, upload.single('file'), async (req, res) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    const adminUserId = res.locals.adminUser.id;
    const { type } = req.params;

    try {
      if (!['logo', 'logo-small', 'favicon'].includes(type)) {
        throw new Error('Loại asset không hợp lệ');
      }
      
      const file = req.file;
      if (!file) throw new Error('Không tìm thấy file tải lên');

      const allowedMimes = ALLOWED_MIMES[type as keyof typeof ALLOWED_MIMES];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new Error('Định dạng file không được hỗ trợ');
      }

      const ext = file.originalname.split('.').pop() || 'png';
      const uuid = uuidv4();
      const objectPath = `branding/${type}/${uuid}.${ext}`;
      const settingKey = TYPE_TO_KEY[type as keyof typeof TYPE_TO_KEY];

      // Read current path
      const { data: existing } = await supabaseAdmin
        .from('system_settings')
        .select('id, setting_value')
        .eq('setting_key', settingKey)
        .maybeSingle();

      const currentPath = existing?.setting_value;

      // Upload to Storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from('system-assets')
        .upload(objectPath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (uploadError) throw new Error(`Lỗi tải lên: ${uploadError.message}`);

      // Update Database
      let dbError;
      if (existing) {
        const { error } = await supabaseAdmin
          .from('system_settings')
          .update({ setting_value: objectPath, updated_by: adminUserId, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        dbError = error;
      } else {
        const { error } = await supabaseAdmin
          .from('system_settings')
          .insert({
            setting_key: settingKey,
            setting_value: objectPath,
            is_public: true,
            updated_by: adminUserId
          });
        dbError = error;
      }

      if (dbError) {
        // Cleanup newly uploaded file if DB update fails
        await supabaseAdmin.storage.from('system-assets').remove([objectPath]);
        throw new Error(`Lỗi cập nhật cấu hình: ${dbError.message}`);
      }

      // Cleanup old file if present
      if (currentPath && currentPath !== objectPath) {
        await supabaseAdmin.storage.from('system-assets').remove([currentPath]);
      }

      res.json({ success: true, path: objectPath });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/settings/assets/:type', authenticateAdmin, async (req, res) => {
    const supabaseAdmin = res.locals.supabaseAdmin;
    const adminUserId = res.locals.adminUser.id;
    const { type } = req.params;

    try {
      if (!['logo', 'logo-small', 'favicon'].includes(type)) {
        throw new Error('Loại asset không hợp lệ');
      }

      const settingKey = TYPE_TO_KEY[type as keyof typeof TYPE_TO_KEY];

      const { data: existing } = await supabaseAdmin
        .from('system_settings')
        .select('id, setting_value')
        .eq('setting_key', settingKey)
        .maybeSingle();

      if (!existing || !existing.setting_value) {
        return res.json({ success: true });
      }

      const currentPath = existing.setting_value;

      const { error: updateError } = await supabaseAdmin
        .from('system_settings')
        .update({ setting_value: '', updated_by: adminUserId, updated_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (updateError) throw new Error(`Lỗi xóa cấu hình: ${updateError.message}`);

      await supabaseAdmin.storage.from('system-assets').remove([currentPath]);

      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });


  // --- REPORT SOURCES API ---

  // Admin GET all report sources with assignments
  app.get('/api/admin/report-sources', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const { data, error } = await supabaseAdmin
        .from('report_sources')
        .select(`
          *,
          report_source_unit_assignments (
            id,
            organization_unit_id,
            is_active,
            sort_order
          )
        `)
        .order('sort_order');
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error('Error fetching report sources:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin GET single report source
  app.get('/api/admin/report-sources/:id', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const { data, error } = await supabaseAdmin
        .from('report_sources')
        .select(`
          *,
          report_source_unit_assignments (
            id,
            organization_unit_id,
            is_active,
            sort_order
          )
        `)
        .eq('id', req.params.id)
        .single();
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error('Error fetching report source:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin POST create report source
  app.post('/api/admin/report-sources', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const adminId = res.locals.adminUser?.id || res.locals.user?.id || (req as any).user?.id;
      const { code, name, category, description, is_active, sort_order, assignments } = req.body;
      
      const { data: source, error: sourceError } = await supabaseAdmin
        .from('report_sources')
        .insert({
          code, name, category, description, is_active, sort_order,
          created_by: adminId
        })
        .select()
        .single();
        
      if (sourceError) throw sourceError;
      
      if (assignments && Array.isArray(assignments)) {
        const assignmentData = assignments.map(a => ({
          report_source_id: source.id,
          organization_unit_id: a.organization_unit_id,
          is_active: a.is_active !== undefined ? a.is_active : true,
          sort_order: a.sort_order || 0,
          created_by: adminId
        }));
        
        if (assignmentData.length > 0) {
          const { error: assignError } = await supabaseAdmin
            .from('report_source_unit_assignments')
            .insert(assignmentData);
          if (assignError) throw assignError;
        }
      }
      
      res.json(source);
    } catch (error: any) {
      console.error('Error creating report source:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin PUT update report source
  app.put('/api/admin/report-sources/:id', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const adminId = res.locals.adminUser?.id || res.locals.user?.id || (req as any).user?.id;
      const id = req.params.id;
      const { code, name, category, description, is_active, sort_order, assignments } = req.body;
      
      const { data: source, error: sourceError } = await supabaseAdmin
        .from('report_sources')
        .update({
          code, name, category, description, is_active, sort_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
        
      if (sourceError) throw sourceError;
      
      if (assignments && Array.isArray(assignments)) {
        // Delete old assignments
        await supabaseAdmin
          .from('report_source_unit_assignments')
          .delete()
          .eq('report_source_id', id);
          
        const assignmentData = assignments.map(a => ({
          report_source_id: id,
          organization_unit_id: a.organization_unit_id,
          is_active: a.is_active !== undefined ? a.is_active : true,
          sort_order: a.sort_order || 0,
          created_by: adminId
        }));
        
        if (assignmentData.length > 0) {
          const { error: assignError } = await supabaseAdmin
            .from('report_source_unit_assignments')
            .insert(assignmentData);
          if (assignError) throw assignError;
        }
      }
      
      res.json(source);
    } catch (error: any) {
      console.error('Error updating report source:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET active report sources for a specific organization unit (used by staff)
  app.get('/api/report-sources', authenticateUser, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const { organization_unit_id } = req.query;
      if (!organization_unit_id) {
        return res.status(400).json({ error: 'organization_unit_id is required' });
      }

      // We need to fetch report sources that are assigned to this organization unit and active
      const { data, error } = await supabaseAdmin
        .from('report_source_unit_assignments')
        .select(`
          sort_order,
          report_sources (
            id,
            code,
            name,
            category,
            description,
            is_active,
            sort_order
          )
        `)
        .eq('organization_unit_id', organization_unit_id)
        .eq('is_active', true);
        
      if (error) throw error;
      
      // Filter out inactive sources and map to just the source object
      const sources = data
        .filter(item => item.report_sources && item.report_sources.is_active)
        .map(item => ({
          ...item.report_sources,
          assignment_sort_order: item.sort_order
        }))
        .sort((a, b) => {
          if (a.assignment_sort_order !== b.assignment_sort_order) {
            return a.assignment_sort_order - b.assignment_sort_order;
          }
          if (a.sort_order !== b.sort_order) {
            return a.sort_order - b.sort_order;
          }
          return a.name.localeCompare(b.name);
        });
        
      res.json(sources);
    } catch (error: any) {
      console.error('Error fetching active report sources:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- REPORT SOURCE METRIC ASSIGNMENTS & METRICS API ---

  // Admin GET assignments for a specific metric
  app.get('/api/admin/metrics/:id/source-assignments', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const metricId = req.params.id;

      const { data, error } = await supabaseAdmin
        .from('report_source_metric_assignments')
        .select(`
          id,
          report_source_id,
          metric_definition_id,
          is_active,
          is_required,
          sort_order,
          report_sources (
            id,
            code,
            name,
            category,
            is_active
          )
        `)
        .eq('metric_definition_id', metricId);

      if (error) throw error;
      const result = (data || []).map((item: any) => ({
        ...item,
        report_source: item.report_sources,
      }));
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching source metric assignments:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin POST/PUT save assignments for a specific metric (Service Role upsert/soft update)
  app.post('/api/admin/metrics/:id/source-assignments', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const adminId = res.locals.adminUser?.id || res.locals.user?.id || (req as any).user?.id;
      const metricId = req.params.id;
      const { assignments } = req.body;

      if (!Array.isArray(assignments)) {
        return res.status(400).json({ error: 'assignments must be an array' });
      }

      // 1. Fetch existing assignments for this metric
      const { data: existingRows, error: fetchErr } = await supabaseAdmin
        .from('report_source_metric_assignments')
        .select('id, report_source_id, is_active, is_required, sort_order')
        .eq('metric_definition_id', metricId);

      if (fetchErr) throw fetchErr;

      const existingMap = new Map<string, any>();
      (existingRows || []).forEach((row: any) => existingMap.set(row.report_source_id, row));

      const inputSourceIds = new Set<string>();

      // 2. Process inputs: Insert or Update
      for (const item of assignments) {
        inputSourceIds.add(item.report_source_id);
        const existing = existingMap.get(item.report_source_id);

        if (existing) {
          const { error: updateErr } = await supabaseAdmin
            .from('report_source_metric_assignments')
            .update({
              is_active: item.is_active !== undefined ? item.is_active : true,
              is_required: item.is_required ?? false,
              sort_order: item.sort_order ?? 0,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await supabaseAdmin
            .from('report_source_metric_assignments')
            .insert({
              metric_definition_id: metricId,
              report_source_id: item.report_source_id,
              is_active: item.is_active !== undefined ? item.is_active : true,
              is_required: item.is_required ?? false,
              sort_order: item.sort_order ?? 0,
              created_by: adminId || null,
            });

          if (insertErr) throw insertErr;
        }
      }

      // 3. For existing rows not in input: Soft deactivate
      for (const [sourceId, existing] of existingMap.entries()) {
        if (!inputSourceIds.has(sourceId) && existing.is_active) {
          const { error: deactivateErr } = await supabaseAdmin
            .from('report_source_metric_assignments')
            .update({
              is_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (deactivateErr) throw deactivateErr;
        }
      }

      res.json({ success: true, count: assignments.length });
    } catch (error: any) {
      console.error('Error saving source metric assignments:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET all active source metric assignments (for form dependency checking)
  app.get('/api/admin/metrics/all-assignments', authenticateUser, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const { data, error } = await supabaseAdmin
        .from('report_source_metric_assignments')
        .select('id, report_source_id, metric_definition_id, is_active, is_required, sort_order')
        .eq('is_active', true);

      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      console.error('Error fetching all metric assignments:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET active metrics for a specific report source (used by staff in daily reports)
  app.get('/api/report-sources/:sourceId/metrics', authenticateUser, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const sourceId = req.params.sourceId;

      // 1. Get assignments for this source
      const { data: assignments, error: assignError } = await supabaseAdmin
        .from('report_source_metric_assignments')
        .select('id, report_source_id, metric_definition_id, is_active, is_required, sort_order')
        .eq('report_source_id', sourceId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (assignError) throw assignError;
      if (!assignments || assignments.length === 0) {
        return res.json([]);
      }

      const metricIds = assignments.map((a: any) => a.metric_definition_id);

      // 2. Query metric definitions
      const { data: metrics, error: metricsError } = await supabaseAdmin
        .from('metric_definitions')
        .select('*')
        .in('id', metricIds)
        .eq('is_active', true);

      if (metricsError) throw metricsError;
      if (!metrics || metrics.length === 0) {
        return res.json([]);
      }

      const metricMap = new Map<string, any>();
      metrics.forEach((m: any) => metricMap.set(m.id, m));

      const assignMap = new Map<string, any>();
      assignments.forEach((a: any) => assignMap.set(a.metric_definition_id, a));

      const enriched = metrics.map((m: any) => {
        const assign = assignMap.get(m.id);
        return {
          ...m,
          assignment_is_required: assign?.is_required ?? false,
          assignment_sort_order: assign?.sort_order ?? 0,
          numerator_metric: m.numerator_metric_id ? metricMap.get(m.numerator_metric_id) : undefined,
          denominator_metric: m.denominator_metric_id ? metricMap.get(m.denominator_metric_id) : undefined,
        };
      });

      enriched.sort((a: any, b: any) => {
        if (a.assignment_sort_order !== b.assignment_sort_order) {
          return a.assignment_sort_order - b.assignment_sort_order;
        }
        if ((a.sort_order || 0) !== (b.sort_order || 0)) {
          return (a.sort_order || 0) - (b.sort_order || 0);
        }
        return (a.name || '').localeCompare(b.name || '');
      });

      res.json(enriched);
    } catch (error: any) {
      console.error('Error fetching metrics for source:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // DAILY REPORTS API (Service-Role proxy for RLS & consistency)
  // ==========================================

  // 1. Get Monthly Daily Reports for a user
  app.get('/api/daily-reports/month', authenticateUser, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const currentUser = res.locals.user;
      const profile = res.locals.profile;

      const targetUserId = (req.query.user_id as string) || currentUser.id;
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      // Access check: only allow own reports or admin/manager
      if (targetUserId !== currentUser.id && profile.system_role === 'staff') {
        return res.status(403).json({ error: 'Không có quyền truy cập báo cáo của người dùng khác.' });
      }

      let query = supabaseAdmin
        .from('daily_reports')
        .select('id, report_date, user_id, organization_unit_id, work_status, report_status, submitted_at, off_note, work_summary, issues, support_request, created_at, updated_at')
        .eq('user_id', targetUserId);

      if (startDate) query = query.gte('report_date', startDate);
      if (endDate) query = query.lte('report_date', endDate);

      const { data, error } = await query.order('report_date', { ascending: true });
      if (error) throw error;

      res.json(data || []);
    } catch (error: any) {
      console.error('[API] Error fetching monthly reports:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Get Full Daily Report by Date
  app.get('/api/daily-reports/by-date', authenticateUser, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const currentUser = res.locals.user;
      const profile = res.locals.profile;

      const targetUserId = (req.query.user_id as string) || currentUser.id;
      const date = req.query.date as string;

      if (!date) {
        return res.status(400).json({ error: 'Thiếu tham số ngày báo cáo (date).' });
      }

      if (targetUserId !== currentUser.id && profile.system_role === 'staff') {
        return res.status(403).json({ error: 'Không có quyền truy cập báo cáo của người dùng khác.' });
      }

      const { data: report, error: repErr } = await supabaseAdmin
        .from('daily_reports')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('report_date', date)
        .maybeSingle();

      if (repErr) throw repErr;
      if (!report) return res.json(null);

      // Load task links
      const { data: taskLinks } = await supabaseAdmin
        .from('daily_report_task_links')
        .select('id, daily_report_id, task_id, created_at')
        .eq('daily_report_id', report.id);

      // Load sources
      const { data: sources } = await supabaseAdmin
        .from('daily_report_sources')
        .select('id, daily_report_id, report_source_id, source_name_snapshot, sort_order, created_at, updated_at')
        .eq('daily_report_id', report.id)
        .order('sort_order', { ascending: true });

      res.json({
        ...report,
        daily_report_task_links: taskLinks || [],
        daily_report_sources: sources || []
      });
    } catch (error: any) {
      console.error('[API] Error fetching daily report by date:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Get Full Daily Report by ID
  app.get('/api/daily-reports/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const currentUser = res.locals.user;
      const profile = res.locals.profile;
      const { id } = req.params;

      const { data: report, error: repErr } = await supabaseAdmin
        .from('daily_reports')
        .select('*')
        .eq('id', id)
        .single();

      if (repErr) throw repErr;
      if (!report) return res.status(404).json({ error: 'Không tìm thấy báo cáo' });

      if (report.user_id !== currentUser.id && profile.system_role === 'staff') {
        return res.status(403).json({ error: 'Không có quyền xem báo cáo này.' });
      }

      const { data: taskLinks } = await supabaseAdmin
        .from('daily_report_task_links')
        .select('id, daily_report_id, task_id, created_at')
        .eq('daily_report_id', id);

      const { data: sources } = await supabaseAdmin
        .from('daily_report_sources')
        .select('id, daily_report_id, report_source_id, source_name_snapshot, sort_order, created_at, updated_at')
        .eq('daily_report_id', id)
        .order('sort_order', { ascending: true });

      res.json({
        ...report,
        daily_report_task_links: taskLinks || [],
        daily_report_sources: sources || []
      });
    } catch (error: any) {
      console.error('[API] Error fetching daily report by ID:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Save/Upsert Multi-Source Daily Report
  app.post('/api/daily-reports', authenticateUser, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const currentUser = res.locals.user;
      const profile = res.locals.profile;
      const payload = req.body;

      if (!payload || !payload.report_date || !payload.user_id || !payload.organization_unit_id) {
        return res.status(400).json({ error: 'Dữ liệu báo cáo không hợp lệ (thiếu report_date, user_id hoặc organization_unit_id).' });
      }

      // Check permission
      if (payload.user_id !== currentUser.id && profile.system_role === 'staff') {
        return res.status(403).json({ error: 'Không có quyền tạo hoặc chỉnh sửa báo cáo cho tài khoản khác.' });
      }

      const isOff = payload.work_status === 'off' || payload.work_status === 'Nghỉ phép';
      const normalizedWorkStatus = isOff ? 'off' : 'working';

      // Fallback for source_channel column (satisfying database NOT NULL constraint)
      let primarySourceChannel = 'Trực tiếp / Direct';
      if (isOff) {
        primarySourceChannel = 'Nghỉ phép / Off';
      } else if (payload.sources && payload.sources.length > 0 && payload.sources[0].source_name_snapshot) {
        primarySourceChannel = payload.sources[0].source_name_snapshot;
      } else if (payload.source_channel) {
        primarySourceChannel = payload.source_channel;
      }

      // 1. Check if report already exists for this (user_id, report_date)
      let reportId = payload.id;
      let existingReport: any = null;

      if (reportId) {
        const { data } = await supabaseAdmin
          .from('daily_reports')
          .select('id, user_id, organization_unit_id, report_date')
          .eq('id', reportId)
          .maybeSingle();
        existingReport = data;
      }

      if (!existingReport) {
        const { data } = await supabaseAdmin
          .from('daily_reports')
          .select('id, user_id, organization_unit_id, report_date')
          .eq('user_id', payload.user_id)
          .eq('report_date', payload.report_date)
          .maybeSingle();
        existingReport = data;
      }

      let savedReport: any = null;

      if (existingReport) {
        reportId = existingReport.id;
        const updateData: any = {
          work_status: normalizedWorkStatus,
          report_status: payload.report_status || 'draft',
          submitted_at: payload.submitted_at ?? (payload.report_status === 'submitted' ? new Date().toISOString() : null),
          off_note: isOff ? (payload.off_note ?? null) : null,
          work_summary: isOff ? null : (payload.work_summary ?? null),
          issues: isOff ? null : (payload.issues ?? null),
          support_request: isOff ? null : (payload.support_request ?? null),
          source_channel: primarySourceChannel,
          interest_group: payload.interest_group ?? null,
          related_task_id: payload.related_task_id ?? null,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabaseAdmin
          .from('daily_reports')
          .update(updateData)
          .eq('id', reportId)
          .select()
          .single();

        if (error) throw new Error('Lỗi cập nhật báo cáo: ' + error.message);
        savedReport = data;
      } else {
        const insertData: any = {
          id: reportId || uuidv4(),
          user_id: payload.user_id,
          organization_unit_id: payload.organization_unit_id,
          report_date: payload.report_date,
          work_status: normalizedWorkStatus,
          report_status: payload.report_status || 'draft',
          submitted_at: payload.submitted_at ?? (payload.report_status === 'submitted' ? new Date().toISOString() : null),
          off_note: isOff ? (payload.off_note ?? null) : null,
          work_summary: isOff ? null : (payload.work_summary ?? null),
          issues: isOff ? null : (payload.issues ?? null),
          support_request: isOff ? null : (payload.support_request ?? null),
          source_channel: primarySourceChannel,
          interest_group: payload.interest_group ?? null,
          related_task_id: payload.related_task_id ?? null,
        };

        const { data, error } = await supabaseAdmin
          .from('daily_reports')
          .insert([insertData])
          .select()
          .single();

        if (error) throw new Error('Lỗi tạo mới báo cáo: ' + error.message);
        savedReport = data;
        reportId = savedReport.id;
      }

      // 2. Sync Task Links
      await supabaseAdmin.from('daily_report_task_links').delete().eq('daily_report_id', reportId);
      if (!isOff && payload.task_ids && payload.task_ids.length > 0) {
        const taskLinkRows = payload.task_ids.map((taskId: string) => ({
          id: uuidv4(),
          daily_report_id: reportId,
          task_id: taskId,
          created_at: new Date().toISOString(),
        }));
        const { error: taskErr } = await supabaseAdmin.from('daily_report_task_links').insert(taskLinkRows);
        if (taskErr) console.warn('[API] Daily report task links warning:', taskErr.message);
      }

      // 3. Handle OFF vs WORKING
      if (isOff) {
        // Remove sources and metric entries for this report
        const { data: existingSources } = await supabaseAdmin
          .from('daily_report_sources')
          .select('id')
          .eq('daily_report_id', reportId);

        if (existingSources && existingSources.length > 0) {
          const sourceIds = existingSources.map((s: any) => s.id);
          await supabaseAdmin.from('metric_entries').delete().in('daily_report_source_id', sourceIds);
          await supabaseAdmin.from('daily_report_sources').delete().eq('daily_report_id', reportId);
        }
        await supabaseAdmin.from('metric_entries').delete().eq('source_reference_id', reportId);

        return res.json({
          ...savedReport,
          daily_report_task_links: [],
          daily_report_sources: []
        });
      }

      // 4. Handle Sources & Metric Entries for WORKING state
      const sourcesPayload = payload.sources || [];

      // Current saved sources in DB
      const { data: currentDbSources } = await supabaseAdmin
        .from('daily_report_sources')
        .select('id, report_source_id')
        .eq('daily_report_id', reportId);

      const currentDbSourceMap = new Map<string, any>();
      (currentDbSources || []).forEach((s: any) => {
        currentDbSourceMap.set(s.report_source_id, s);
      });

      // Remove unselected sources and their metric entries
      const keepSourceIds = new Set(sourcesPayload.map((s: any) => s.report_source_id));
      const toDeleteSources = (currentDbSources || []).filter(
        (s: any) => !keepSourceIds.has(s.report_source_id)
      );

      for (const delSrc of toDeleteSources) {
        await supabaseAdmin.from('metric_entries').delete().eq('daily_report_source_id', delSrc.id);
        await supabaseAdmin.from('daily_report_sources').delete().eq('id', delSrc.id);
      }

      const savedSourceList: any[] = [];

      // Upsert each source and sync its manual metric entries
      for (let i = 0; i < sourcesPayload.length; i++) {
        const srcItem = sourcesPayload[i];
        let dbSourceId: string;

        const existingSourceRow = currentDbSourceMap.get(srcItem.report_source_id);
        if (existingSourceRow) {
          dbSourceId = existingSourceRow.id;
          const { data: updatedSrc } = await supabaseAdmin
            .from('daily_report_sources')
            .update({
              source_name_snapshot: srcItem.source_name_snapshot,
              sort_order: i,
              updated_at: new Date().toISOString(),
            })
            .eq('id', dbSourceId)
            .select()
            .single();
          savedSourceList.push(updatedSrc || existingSourceRow);
        } else {
          dbSourceId = srcItem.id || uuidv4();
          const insertSrcRow = {
            id: dbSourceId,
            daily_report_id: reportId,
            report_source_id: srcItem.report_source_id,
            source_name_snapshot: srcItem.source_name_snapshot,
            sort_order: i,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { data: insertedSrc, error: insErr } = await supabaseAdmin
            .from('daily_report_sources')
            .insert([insertSrcRow])
            .select()
            .single();

          if (insErr) {
            throw new Error(`Lỗi lưu Kênh/Nguồn "${srcItem.source_name_snapshot}": ` + insErr.message);
          }
          savedSourceList.push(insertedSrc || insertSrcRow);
        }

        // Save manual metric entries for this specific source
        const manualEntries = (srcItem.metrics || []).map((m: any) => ({
          id: uuidv4(),
          metric_definition_id: m.metric_definition_id,
          organization_unit_id: payload.organization_unit_id,
          user_id: payload.user_id,
          period_start: payload.report_date,
          period_end: payload.report_date,
          value: Number(m.value) || 0,
          source_type: 'manual',
          source_reference_id: reportId,
          daily_report_source_id: dbSourceId,
          created_by: payload.user_id,
        }));

        for (const entry of manualEntries) {
          const { data: existingMetric } = await supabaseAdmin
            .from('metric_entries')
            .select('id')
            .eq('daily_report_source_id', entry.daily_report_source_id)
            .eq('metric_definition_id', entry.metric_definition_id)
            .maybeSingle();

          if (existingMetric && existingMetric.id) {
            await supabaseAdmin
              .from('metric_entries')
              .update({
                value: entry.value,
                period_start: entry.period_start,
                period_end: entry.period_end,
                organization_unit_id: entry.organization_unit_id,
                user_id: entry.user_id,
                source_reference_id: entry.source_reference_id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingMetric.id);
          } else {
            const { error: metricInsErr } = await supabaseAdmin
              .from('metric_entries')
              .insert([entry]);

            if (metricInsErr && metricInsErr.code === '23505') {
              await supabaseAdmin
                .from('metric_entries')
                .update({
                  value: entry.value,
                  daily_report_source_id: entry.daily_report_source_id,
                  source_reference_id: entry.source_reference_id,
                  updated_at: new Date().toISOString(),
                })
                .eq('metric_definition_id', entry.metric_definition_id)
                .eq('daily_report_source_id', entry.daily_report_source_id);
            }
          }
        }
      }

      // Return full updated report object
      const { data: taskLinksFinal } = await supabaseAdmin
        .from('daily_report_task_links')
        .select('id, daily_report_id, task_id, created_at')
        .eq('daily_report_id', reportId);

      res.json({
        ...savedReport,
        daily_report_task_links: taskLinksFinal || [],
        daily_report_sources: savedSourceList,
      });
    } catch (error: any) {
      console.error('[API] Error saving daily report:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 5. Delete Daily Report
  app.delete('/api/daily-reports/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const currentUser = res.locals.user;
      const profile = res.locals.profile;
      const { id } = req.params;

      const { data: report } = await supabaseAdmin
        .from('daily_reports')
        .select('id, user_id')
        .eq('id', id)
        .single();

      if (!report) return res.status(404).json({ error: 'Không tìm thấy báo cáo' });
      if (report.user_id !== currentUser.id && profile.system_role === 'staff') {
        return res.status(403).json({ error: 'Không có quyền xóa báo cáo này.' });
      }

      // Delete cascade relations
      await supabaseAdmin.from('daily_report_task_links').delete().eq('daily_report_id', id);
      await supabaseAdmin.from('metric_entries').delete().eq('source_reference_id', id);
      await supabaseAdmin.from('daily_report_sources').delete().eq('daily_report_id', id);
      await supabaseAdmin.from('daily_reports').delete().eq('id', id);

      res.json({ success: true, message: 'Đã xóa báo cáo thành công' });
    } catch (error: any) {
      console.error('[API] Error deleting daily report:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 6. Delete a specific source from a report
  app.delete('/api/daily-reports/:id/sources/:sourceId', authenticateUser, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = res.locals.supabaseAdmin;
      const currentUser = res.locals.user;
      const profile = res.locals.profile;
      const { id, sourceId } = req.params;

      const { data: report } = await supabaseAdmin
        .from('daily_reports')
        .select('id, user_id')
        .eq('id', id)
        .single();

      if (!report) return res.status(404).json({ error: 'Không tìm thấy báo cáo' });
      if (report.user_id !== currentUser.id && profile.system_role === 'staff') {
        return res.status(403).json({ error: 'Không có quyền chỉnh sửa báo cáo này.' });
      }

      await supabaseAdmin.from('metric_entries').delete().eq('daily_report_source_id', sourceId);
      await supabaseAdmin.from('daily_report_sources').delete().eq('id', sourceId).eq('daily_report_id', id);

      res.json({ success: true, message: 'Đã xóa kênh nguồn thành công' });
    } catch (error: any) {
      console.error('[API] Error deleting report source:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development


  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
