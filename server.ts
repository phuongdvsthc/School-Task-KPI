import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
