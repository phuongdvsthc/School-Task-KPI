const fs = require('fs');
let code = fs.readFileSync('src/components/tasks/TaskList.tsx', 'utf8');

code = code.replace(
  `                      {/* Actions - Disabled for now as requested */}
                      <td className="px-4 py-4 text-right min-w-[130px]">
                        <span className="text-[10px] text-slate-400">Chưa mở</span>
                      </td>`,
  `                      {/* Actions */}
                      <td className="px-4 py-4 text-right min-w-[130px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setTaskForProgressUpdate(t)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Cập nhật tiến độ"
                          >
                            <TrendingUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTaskId(t.id);
                              setSubView('detail');
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Xem chi tiết"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </td>`
);

code = code.replace(
  `className="hover:bg-slate-50/70 transition-colors group"`,
  `className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedTaskId(t.id);
                        setSubView('detail');
                      }}`
);

fs.writeFileSync('src/components/tasks/TaskList.tsx', code);
