const fs = require('fs');
let code = fs.readFileSync('src/services/taskService.ts', 'utf8');

code = code.replace(
  `        (supabase.from('task_assignees') as any).select('*').eq('task_id', taskId),`,
  `        (supabase.from('task_assignees') as any).select('*, profile:profiles(*)').eq('task_id', taskId),`
);

fs.writeFileSync('src/services/taskService.ts', code);
