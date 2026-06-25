import React, { useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { useAuthStore } from '../store/useAuthStore';
import { Folder, Users, Plus, LogOut, ChevronRight, LayoutGrid, CheckCircle } from 'lucide-react';

interface SidebarProps {
  onTabChange: (tab: 'board' | 'analytics') => void;
  activeTab: 'board' | 'analytics';
}

export const Sidebar: React.FC<SidebarProps> = ({ onTabChange, activeTab }) => {
  const {
    workspaces,
    activeWorkspace,
    projects,
    activeProject,
    createWorkspace,
    inviteMemberToWorkspace,
    createProject,
    selectWorkspace,
    selectProject,
  } = useBoardStore();

  const { logout, user } = useAuthStore();

  const [showAddWorkspace, setShowAddWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const handleAddWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    const ws = await createWorkspace(newWorkspaceName);
    if (ws) {
      setNewWorkspaceName('');
      setShowAddWorkspace(false);
      selectWorkspace(ws._id);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !activeWorkspace) return;
    const proj = await createProject(newProjectName, activeWorkspace._id);
    if (proj) {
      setNewProjectName('');
      setShowAddProject(false);
      selectProject(proj);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeWorkspace) return;
    const success = await inviteMemberToWorkspace(activeWorkspace._id, inviteEmail);
    if (success) {
      setInviteEmail('');
      setInviteSuccess(true);
      setTimeout(() => {
        setInviteSuccess(false);
        setShowInvite(false);
      }, 2000);
    }
  };

  return (
    <aside className="w-64 shrink-0 glass-panel border-r border-slate-800/80 p-6 flex flex-col h-screen overflow-y-auto">
      {/* Workspace Selector */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Workspaces</label>
          <button
            onClick={() => setShowAddWorkspace(!showAddWorkspace)}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showAddWorkspace && (
          <form onSubmit={handleAddWorkspace} className="mb-3 space-y-2">
            <input
              type="text"
              placeholder="Workspace name"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              className="glass-input w-full text-xs py-1.5 px-3"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddWorkspace(false)}
                className="text-[10px] text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-[10px] py-1 px-2.5 rounded font-bold"
              >
                Create
              </button>
            </div>
          </form>
        )}

        <select
          value={activeWorkspace?._id || ''}
          onChange={(e) => selectWorkspace(e.target.value)}
          className="w-full glass-input text-xs py-2 px-3 border border-slate-800/80 bg-slate-950/80"
        >
          <option value="" disabled>Select Workspace</option>
          {workspaces.map((ws) => (
            <option key={ws._id} value={ws._id}>
              {ws.name}
            </option>
          ))}
        </select>
      </div>

      {activeWorkspace && (
        <>
          {/* Members & Invite */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Members ({activeWorkspace.members.length})</span>
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="text-indigo-400 hover:text-indigo-300 text-[10px] font-semibold"
              >
                Invite
              </button>
            </div>

            {showInvite && (
              <form onSubmit={handleInvite} className="mb-3 space-y-2">
                <input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="glass-input w-full text-xs py-1.5 px-3"
                />
                {inviteSuccess && (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Invite Sent!</span>
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowInvite(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-[10px] py-1 px-2.5 rounded font-bold"
                  >
                    Send
                  </button>
                </div>
              </form>
            )}

            <div className="flex -space-x-1.5 overflow-hidden py-1">
              {activeWorkspace.members.map((member) => (
                <img
                  key={member.id}
                  className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900"
                  src={member.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`}
                  alt={member.name}
                  title={member.name}
                />
              ))}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6 space-y-1">
            <button
              onClick={() => onTabChange('board')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'board'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Kanban Board
            </button>
            <button
              onClick={() => onTabChange('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Users className="w-4 h-4" />
              Analytics Dashboard
            </button>
          </div>

          {/* Projects */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Projects</label>
              <button
                onClick={() => setShowAddProject(!showAddProject)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {showAddProject && (
              <form onSubmit={handleAddProject} className="mb-3 space-y-2">
                <input
                  type="text"
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="glass-input w-full text-xs py-1.5 px-3"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddProject(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-[10px] py-1 px-2.5 rounded font-bold"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-1.5">
              {projects.map((proj) => (
                <button
                  key={proj._id}
                  onClick={() => selectProject(proj)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeProject?._id === proj._id
                      ? 'bg-indigo-600/10 text-indigo-200 border border-indigo-500/10'
                      : 'text-slate-400 hover:bg-slate-800/20 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                    <span className="truncate">{proj.name}</span>
                  </div>
                  {activeProject?._id === proj._id && <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Footer Profile & Logout */}
      <div className="mt-auto pt-6 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5 truncate">
          <img
            className="h-8 w-8 rounded-full border border-slate-700 bg-slate-900"
            src={user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
            alt={user?.name || ''}
          />
          <div className="truncate">
            <p className="text-xs font-bold text-slate-200 truncate">{user?.name}</p>
            <span className={`inline-block mt-0.5 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
              user?.role === 'Admin' 
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/20' 
                : user?.role === 'Project Manager'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
            }`}>
              {user?.role || 'Member'}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 p-1.5 rounded-lg transition-all"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
