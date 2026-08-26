const fs = require('fs');
let code = fs.readFileSync('src/components/tasks/TaskProgressModal.tsx', 'utf8');

code = code.replace(
  `{task.progress}%</span> ({task.status})`,
  `{task.status === 'completed' ? 100 : task.progress}%</span> ({task.status})`
);

fs.writeFileSync('src/components/tasks/TaskProgressModal.tsx', code);
