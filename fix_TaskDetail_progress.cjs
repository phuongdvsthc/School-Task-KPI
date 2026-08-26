const fs = require('fs');
let code = fs.readFileSync('src/components/tasks/TaskDetail.tsx', 'utf8');

const oldCode = `                              {upd.progress !== undefined && upd.progress !== upd.old_progress && (
                                <span className="font-semibold text-slate-700">
                                  Tiến độ: {upd.old_progress ?? 0}% → {upd.progress}%
                                </span>
                              )}`;

const newCode = `                              {upd.new_progress !== undefined && upd.old_progress !== undefined && upd.new_progress !== upd.old_progress && (
                                <span className="font-semibold text-slate-700">
                                  Tiến độ: {upd.old_progress}% → {upd.new_progress}%
                                </span>
                              )}
                              {upd.new_progress === undefined && upd.progress !== undefined && upd.progress !== upd.old_progress && (
                                <span className="font-semibold text-slate-700">
                                  Tiến độ: {upd.old_progress ?? 0}% → {upd.progress}%
                                </span>
                              )}`;

code = code.replace(oldCode, newCode);

const mapStatus = `const statusMap: Record<string, string> = {
  todo: 'Chưa thực hiện',
  in_progress: 'Đang thực hiện',
  waiting: 'Đang chờ',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy'
};`;

if (!code.includes('statusMap')) {
  code = code.replace('export const TaskDetail: React.FC<TaskDetailProps> = ({ taskId, onBack }) => {', mapStatus + '\nexport const TaskDetail: React.FC<TaskDetailProps> = ({ taskId, onBack }) => {');
}

const mapCodeOld = `<span className="uppercase text-[10px]">{upd.old_status ?? 'Mới'}</span> → <span className="uppercase text-[10px]">{upd.new_status}</span>`;
const mapCodeNew = `<span className="uppercase text-[10px]">{statusMap[upd.old_status as string] || upd.old_status || 'Mới'}</span> → <span className="uppercase text-[10px]">{statusMap[upd.new_status as string] || upd.new_status}</span>`;

code = code.replace(mapCodeOld, mapCodeNew);
fs.writeFileSync('src/components/tasks/TaskDetail.tsx', code);
