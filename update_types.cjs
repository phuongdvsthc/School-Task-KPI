const fs = require('fs');
let code = fs.readFileSync('src/types/task.ts', 'utf8');

code = code.replace(
  '  progress: number;',
  '  progress: number;\n  old_progress?: number;\n  new_progress?: number;'
);

fs.writeFileSync('src/types/task.ts', code);
