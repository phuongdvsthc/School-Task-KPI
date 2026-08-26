import React, { useState } from 'react';
import { EvidenceType } from '../../types/task';
import { taskService } from '../../services/taskService';
import { useAuth } from '../../context/AuthContext';
import { X, Paperclip, Link as LinkIcon, FileText, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface TaskEvidenceModalProps {
  taskId: string;
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TaskEvidenceModal: React.FC<TaskEvidenceModalProps> = ({
  taskId,
  taskTitle,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState<string>('');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('link');
  const [url, setUrl] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Vui lòng đăng nhập để thực hiện');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên minh chứng / tài liệu');
      return;
    }

    if (!url.trim()) {
      setErrorMsg('Vui lòng nhập đường link hoặc địa chỉ tài liệu');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await taskService.addTaskEvidence({
        taskId,
        uploadedBy: user.id,
        title: title.trim(),
        evidenceType,
        externalUrl: url.trim(),
        description: description.trim() || undefined,
      });

      if (res.success) {
        setTitle('');
        setUrl('');
        setDescription('');
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || 'Thêm minh chứng thất bại');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi lưu minh chứng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="task-evidence-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="task-evidence-modal"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Paperclip className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Đính kèm minh chứng / Tài liệu</h3>
              <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">{taskTitle}</p>
            </div>
          </div>
          <button
            id="btn-close-evidence-modal"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Evidence Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Loại minh chứng
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { val: 'link', label: 'Liên kết web', icon: LinkIcon },
                { val: 'document', label: 'Văn bản / Doc', icon: FileText },
                { val: 'report', label: 'Báo cáo', icon: FileText },
                { val: 'image', label: 'Hình ảnh', icon: ImageIcon },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setEvidenceType(item.val as EvidenceType)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                      evidenceType === item.val
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="evidence-title-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tiêu đề minh chứng <span className="text-rose-500">*</span>
            </label>
            <input
              id="evidence-title-input"
              type="text"
              required
              placeholder="VD: Biên bản họp nghiệm thu chương trình..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* URL */}
          <div>
            <label htmlFor="evidence-url-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Đường dẫn liên kết / File URL <span className="text-rose-500">*</span>
            </label>
            <input
              id="evidence-url-input"
              type="url"
              required
              placeholder="https://drive.google.com/... hoặc https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Hỗ trợ liên kết Google Drive, OneDrive, cổng lưu trữ tài liệu trường hoặc văn bản trực tuyến.
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="evidence-desc-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Mô tả thêm (Tùy chọn)
            </label>
            <textarea
              id="evidence-desc-input"
              rows={2}
              placeholder="Ghi chú thêm về tiêu chuẩn, phiên bản hoặc người ký..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              id="btn-cancel-evidence"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              id="btn-submit-evidence"
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Thêm minh chứng
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
