import React, { useState, useEffect } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { useHelpStore, type HelpRequest } from '../store/useHelpStore';
import { Bell, HelpCircle, Check, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { activeProject, socket } = useBoardStore();
  const { notifications, addNotification, clearNotification, updateStatus, fetchMyRequests } = useHelpStore();
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Listen to real-time incoming help requests
    socket.on('help:requested', (helpRequest: HelpRequest) => {
      addNotification(helpRequest);
    });

    // Listen to update statuses (if requester got feedback)
    socket.on('help:notification-updated', () => {
      // Refresh user requests
      fetchMyRequests();
    });

    return () => {
      socket.off('help:requested');
      socket.off('help:notification-updated');
    };
  }, [socket]);

  useEffect(() => {
    // Initial fetch of my requests to populate dashboard notifications
    fetchMyRequests();
  }, []);

  const handleAccept = async (requestId: string) => {
    await updateStatus(requestId, 'accepted', socket);
    clearNotification(requestId);
  };

  const handleDecline = async (requestId: string) => {
    await updateStatus(requestId, 'declined', socket);
    clearNotification(requestId);
  };

  return (
    <header className="h-16 shrink-0 glass-panel border-b border-slate-800/80 px-8 flex items-center justify-between relative z-40">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-bold text-slate-400">Project /</h2>
        <span className="text-base font-bold text-slate-100 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
          {activeProject ? activeProject.name : 'No Active Project'}
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Help Request Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 p-2 rounded-full transition-all relative"
            title="Help Requests Notifications"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse ring-2 ring-rose-500/30"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 glass-card rounded-xl p-4 shadow-2xl z-50 border border-slate-800/80">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <h3 className="text-xs font-bold text-slate-200 tracking-wider">HELP REQUESTS</h3>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold">
                  {notifications.length} New
                </span>
              </div>

              {notifications.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                  <Check className="w-8 h-8 text-slate-700" />
                  <span>No pending help requests.</span>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-64 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif._id}
                      className="p-3 bg-slate-950/60 border border-slate-900 rounded-lg hover:border-slate-800 transition-colors flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={notif.requester.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${notif.requester.name}`}
                          className="w-5 h-5 rounded-full"
                          alt={notif.requester.name}
                        />
                        <span className="text-[11px] font-bold text-slate-300 truncate">
                          {notif.requester.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed italic">
                        "{notif.message}"
                      </p>
                      <div className="text-[9px] text-indigo-400 font-semibold truncate">
                        Task: {notif.task.title}
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          onClick={() => handleDecline(notif._id)}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          Decline
                        </button>
                        <button
                          onClick={() => handleAccept(notif._id)}
                          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-bold transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Icon */}
        <div className="text-slate-500 hover:text-slate-400 transition-colors cursor-pointer" title="Workspace Info">
          <HelpCircle className="w-5 h-5" />
        </div>
      </div>
    </header>
  );
};
