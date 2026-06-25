import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useBoardStore, type Task } from './store/useBoardStore';
import { Login } from './pages/Login';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { KanbanBoard } from './components/KanbanBoard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { TaskModal } from './components/TaskModal';

export const App: React.FC = () => {
  const { isAuthenticated, user, fetchMe, isLoading } = useAuthStore();
  const { initSocket, disconnectSocket, fetchWorkspaces, error, clearError } = useBoardStore();

  const [activeTab, setActiveTab] = useState<'board' | 'analytics'>('board');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      initSocket(user.id);
      fetchWorkspaces();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleOpenTaskDetails = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCloseTaskDetails = () => {
    setSelectedTask(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
          <span className="text-xs font-semibold tracking-wider">Syncing workspace session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#0b0f19] text-slate-100 flex items-center justify-center">
        <Login />
      </main>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100 select-none">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <Navbar />

        {/* Dynamic Panels */}
        {activeTab === 'board' ? (
          <KanbanBoard onOpenDetails={handleOpenTaskDetails} />
        ) : (
          <AnalyticsDashboard />
        )}
      </div>

      {/* Task Details Popup Overlay */}
      {selectedTask && (
        <TaskModal task={selectedTask} onClose={handleCloseTaskDetails} />
      )}

      {/* Toast Error Alert */}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 glass-card bg-red-950/90 border border-red-500/30 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in max-w-sm">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"></div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Action Restricted</span>
            <span className="text-xs text-slate-300 font-medium leading-normal">{error}</span>
          </div>
          <button 
            onClick={clearError}
            className="text-slate-500 hover:text-slate-300 ml-auto text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
