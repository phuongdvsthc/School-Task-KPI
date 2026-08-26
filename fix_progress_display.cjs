const fs = require('fs');
let code = fs.readFileSync('src/components/tasks/TaskDetail.tsx', 'utf8');

code = code.replace(
  `            <span className="text-sm font-bold text-blue-700">{taskDetails.progress}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-500 rounded-full"
              style={{ width: \`\${taskDetails.progress}%\` }}
            />`,
  `            <span className="text-sm font-bold text-blue-700">{taskDetails.status === 'completed' ? 100 : taskDetails.progress}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-500 rounded-full"
              style={{ width: \`\${taskDetails.status === 'completed' ? 100 : taskDetails.progress}%\` }}
            />`
);

fs.writeFileSync('src/components/tasks/TaskDetail.tsx', code);
