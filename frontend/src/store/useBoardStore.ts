import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface UserShort {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  storyPoints: number;
  estimatedHours: number;
  loggedHours: number;
  dueDate: string;
  assignees: UserShort[];
  project: string;
  workspace: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  name: string;
  workspace: string;
  columns: string[];
  createdAt: string;
}

export interface Workspace {
  _id: string;
  name: string;
  owner: UserShort;
  members: UserShort[];
}

interface Viewer {
  userId: string;
  userName: string;
}

interface BoardState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  projects: Project[];
  activeProject: Project | null;
  tasks: Task[];
  activeViewers: Record<string, Viewer[]>;
  socket: Socket | null;
  isLoading: boolean;
  error: string | null;

  initSocket: (userId: string) => void;
  disconnectSocket: () => void;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace | null>;
  inviteMemberToWorkspace: (workspaceId: string, email: string) => Promise<boolean>;
  selectWorkspace: (workspaceId: string) => Promise<void>;
  
  fetchProjects: (workspaceId: string) => Promise<void>;
  createProject: (name: string, workspaceId: string) => Promise<Project | null>;
  selectProject: (project: Project) => Promise<void>;

  fetchTasks: (projectId: string) => Promise<void>;
  createTask: (taskData: Partial<Task>) => Promise<boolean>;
  updateTaskDetails: (taskId: string, patch: Partial<Task>) => Promise<boolean>;
  logTimeOnTask: (taskId: string, hours: number) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;

  moveTaskOptimistically: (taskId: string, targetStatus: string) => Promise<boolean>;
  
  startViewingTask: (taskId: string, userId: string, userName: string) => void;
  stopViewingTask: (taskId: string) => void;
  clearError: () => void;
}

const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

export const useBoardStore = create<BoardState>((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  projects: [],
  activeProject: null,
  tasks: [],
  activeViewers: {},
  socket: null,
  isLoading: false,
  error: null,
  clearError: () => set({ error: null }),

  initSocket: (userId: string) => {
    const existingSocket = get().socket;
    if (existingSocket) return;

    const socket = io(SOCKET_URL);
    socket.emit('user:join', userId);

    socket.on('task:moved', ({ taskId, status }) => {
      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === taskId ? { ...t, status } : t)),
      }));
    });

    socket.on('task:viewers-updated', ({ taskId, viewers }) => {
      set((state) => ({
        activeViewers: {
          ...state.activeViewers,
          [taskId]: viewers,
        },
      }));
    });

    socket.on('help:updated', () => {
      // Trigger project refresh
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  fetchWorkspaces: async () => {
    const token = localStorage.getItem('thinkbook_token');
    try {
      const res = await fetch(`${API_URL}/workspaces`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      set({ workspaces: data });
      
      if (data.length > 0 && !get().activeWorkspace) {
        get().selectWorkspace(data[0]._id);
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  createWorkspace: async (name) => {
    const token = localStorage.getItem('thinkbook_token');
    try {
      const res = await fetch(`${API_URL}/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      set((state) => ({ workspaces: [...state.workspaces, data] }));
      return data;
    } catch (err) {
      return null;
    }
  },

  inviteMemberToWorkspace: async (workspaceId, email) => {
    const token = localStorage.getItem('thinkbook_token');
    try {
      const res = await fetch(`${API_URL}/workspaces/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ workspaceId, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      await get().fetchWorkspaces();
      return true;
    } catch (err) {
      return false;
    }
  },

  selectWorkspace: async (workspaceId) => {
    const ws = get().workspaces.find((w) => w._id === workspaceId) || null;
    set({ activeWorkspace: ws, projects: [], activeProject: null, tasks: [] });
    if (ws) {
      await get().fetchProjects(workspaceId);
    }
  },

  fetchProjects: async (workspaceId) => {
    const token = localStorage.getItem('thinkbook_token');
    try {
      const res = await fetch(`${API_URL}/projects/workspace/${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      set({ projects: data });
      
      if (data.length > 0 && !get().activeProject) {
        get().selectProject(data[0]);
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  createProject: async (name, workspaceId) => {
    const token = localStorage.getItem('thinkbook_token');
    try {
      const res = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      set((state) => ({ projects: [...state.projects, data] }));
      return data;
    } catch (err) {
      return null;
    }
  },

  selectProject: async (project) => {
    const socket = get().socket;
    const previousProject = get().activeProject;
    
    if (socket) {
      if (previousProject) {
        socket.emit('project:leave', previousProject._id);
      }
      socket.emit('project:join', project._id);
    }

    set({ activeProject: project, tasks: [] });
    await get().fetchTasks(project._id);
  },

  fetchTasks: async (projectId) => {
    const token = localStorage.getItem('thinkbook_token');
    try {
      const res = await fetch(`${API_URL}/tasks/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      set({ tasks: data });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  createTask: async (taskData) => {
    const token = localStorage.getItem('thinkbook_token');
    const project = get().activeProject;
    const workspace = get().activeWorkspace;

    if (!project || !workspace) return false;

    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...taskData,
          projectId: project._id,
          workspaceId: workspace._id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create task');

      set((state) => ({ tasks: [...state.tasks, data] }));
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  updateTaskDetails: async (taskId, patch) => {
    const token = localStorage.getItem('thinkbook_token');
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update task');

      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === taskId ? data : t)),
      }));

      const socket = get().socket;
      const project = get().activeProject;
      if (socket && project && patch.status) {
        socket.emit('task:move', { projectId: project._id, taskId, status: patch.status });
      }

      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  logTimeOnTask: async (taskId, hours) => {
    const token = localStorage.getItem('thinkbook_token');
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/log-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hours }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to log time');

      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === taskId ? data : t)),
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  deleteTask: async (taskId) => {
    const token = localStorage.getItem('thinkbook_token');
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Delete failed');
      }

      set((state) => ({
        tasks: state.tasks.filter((t) => t._id !== taskId),
      }));
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  moveTaskOptimistically: async (taskId, targetStatus) => {
    const originalTasks = get().tasks;
    const socket = get().socket;
    const project = get().activeProject;

    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === taskId ? { ...t, status: targetStatus } : t)),
    }));

    if (socket && project) {
      socket.emit('task:move', { projectId: project._id, taskId, status: targetStatus });
    }

    const token = localStorage.getItem('thinkbook_token');
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Server error');
      
      set((state) => ({
        tasks: state.tasks.map((t) => (t._id === taskId ? data : t)),
      }));
      return true;
    } catch (err: any) {
      console.error('Optimistic UI update failed, rolling back task move:', err);
      set({ tasks: originalTasks, error: err.message });

      if (socket && project) {
        const originalStatus = originalTasks.find((t) => t._id === taskId)?.status || targetStatus;
        socket.emit('task:move', { projectId: project._id, taskId, status: originalStatus });
      }
      return false;
    }
  },

  startViewingTask: (taskId, userId, userName) => {
    const socket = get().socket;
    const project = get().activeProject;
    if (socket && project) {
      socket.emit('task:view-start', { projectId: project._id, taskId, userId, userName });
    }
  },

  stopViewingTask: (taskId) => {
    const socket = get().socket;
    const project = get().activeProject;
    if (socket && project) {
      socket.emit('task:view-stop', { projectId: project._id, taskId });
    }
  },
}));
