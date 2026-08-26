const fs = require('fs');
let code = fs.readFileSync('src/components/tasks/TaskDetail.tsx', 'utf8');

if (!code.includes('successMessage')) {
  code = code.replace(
    '  const [newComment, setNewComment] = useState<string>(\'\');',
    '  const [newComment, setNewComment] = useState<string>(\'\');\n  const [successMessage, setSuccessMessage] = useState<string | null>(null);'
  );

  code = code.replace(
    'onSuccess={fetchTaskDetails}',
    'onSuccess={() => { fetchTaskDetails(); setSuccessMessage(\'Cập nhật tiến độ thành công.\'); }}'
  );

  const alertCode = `      {successMessage && (
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in slide-in-from-top-4 relative">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="absolute top-1/2 -translate-y-1/2 right-4 text-emerald-500 hover:text-emerald-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Top Bar Navigation */}`;

  code = code.replace('{/* Top Bar Navigation */}', alertCode);

  fs.writeFileSync('src/components/tasks/TaskDetail.tsx', code);
}
