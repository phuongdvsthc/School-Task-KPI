const fs = require('fs');
let code = fs.readFileSync('src/components/tasks/TaskDetail.tsx', 'utf8');

code = code.replace(
  '<span className="text-sm font-bold text-blue-700">{taskDetails.progress}%</span>',
  '<span className="text-sm font-bold text-blue-700">{taskDetails.status === "completed" ? 100 : taskDetails.progress}%</span>'
);

code = code.replace(
  'taskDetails.progress === 100',
  'taskDetails.status === "completed" || taskDetails.progress === 100'
);

code = code.replace(
  'style={{ width: `${taskDetails.progress}%` }}',
  'style={{ width: `${taskDetails.status === "completed" ? 100 : taskDetails.progress}%` }}'
);

fs.writeFileSync('src/components/tasks/TaskDetail.tsx', code);
