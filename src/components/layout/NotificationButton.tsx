/**
 * NotificationButton Component
 * Hiển thị nút chuông thông báo trên Header kèm Badge số lượng và Popup xem chi tiết
 * Thiết kế sẵn sàng mở rộng cho các luồng thông báo Task, KPI, Daily Report trong tương lai
 */
import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Inbox } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type?: 'task' | 'kpi' | 'report' | 'system';
  created_at?: string;
  is_read?: boolean;
}

export interface NotificationButtonProps {
  count?: number;
  notifications?: NotificationItem[];
  onMarkAllAsRead?: () => void;
  className?: string;
}

export const NotificationButton: React.FC<NotificationButtonProps> = ({
  count = 0,
  notifications = [],
  onMarkAllAsRead,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Format badge count
  const badgeLabel = count > 99 ? '99+' : count.toString();

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Trigger Button */}
      <button
        ref={buttonRef}
        id="notification-bell-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Xem thông báo"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
      >
        <Bell className="h-4 w-4" />

        {/* Unread Count Badge */}
        {count > 0 && (
          <span
            id="notification-unread-badge"
            className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-white"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {/* Notification Dropdown Popup */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="notification-dropdown-panel"
          role="dialog"
          aria-label="Danh sách thông báo"
          className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-xl origin-top-right transition-all overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Thông báo</h3>
              {count > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                  {count} mới
                </span>
              )}
            </div>

            {notifications.length > 0 && onMarkAllAsRead && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Body Content */}
          <div className="max-h-[380px] overflow-y-auto">
            {notifications.length === 0 ? (
              // Empty State
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 mb-3 border border-indigo-100/60">
                  <Inbox className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Chưa có thông báo mới.
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-[240px]">
                  Thông báo về công việc, KPI và nhắc nhở sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              // Future Ready: List of notifications
              <div className="divide-y divide-slate-100">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 hover:bg-slate-50 transition-colors ${
                      !item.is_read ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{item.message}</p>
                    {item.created_at && (
                      <span className="mt-1 block text-[10px] text-slate-400">
                        {item.created_at}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2.5 text-center">
            <p className="text-[11px] text-slate-400">
              Hệ thống quản trị công việc & KPI học đường
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
