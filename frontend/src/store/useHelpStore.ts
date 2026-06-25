import { create } from 'zustand';
import { Socket } from 'socket.io-client';

export interface HelpRequest {
  _id: string;
  task: {
    _id: string;
    title: string;
    status: string;
  };
  project: string;
  requester: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  helper: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

interface HelpState {
  requests: HelpRequest[];
  notifications: HelpRequest[];
  isLoading: boolean;
  error: string | null;

  fetchMyRequests: () => Promise<void>;
  fetchProjectRequests: (projectId: string) => Promise<void>;
  createRequest: (taskId: string, helperId: string, message: string, socket: Socket | null) => Promise<boolean>;
  updateStatus: (requestId: string, status: 'accepted' | 'declined' | 'resolved', socket: Socket | null) => Promise<boolean>;
  addNotification: (request: HelpRequest) => void;
  clearNotification: (requestId: string) => void;
}

const API_URL = 'http://localhost:5000/api';

export const useHelpStore = create<HelpState>((set) => ({
  requests: [],
  notifications: [],
  isLoading: false,
  error: null,

  addNotification: (request) => {
    set((state) => {
      // Avoid duplicate notifications
      if (state.notifications.some((n) => n._id === request._id)) return state;
      return { notifications: [request, ...state.notifications] };
    });
  },

  clearNotification: (requestId) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n._id !== requestId),
    }));
  },

  fetchMyRequests: async () => {
    const token = localStorage.getItem('thinkbook_token');
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/help-requests/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      set({ requests: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchProjectRequests: async (projectId) => {
    const token = localStorage.getItem('thinkbook_token');
    set({ isLoading: true });
    try {
      const res = await fetch(`${API_URL}/help-requests/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      set({ requests: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createRequest: async (taskId, helperId, message, socket) => {
    const token = localStorage.getItem('thinkbook_token');
    try {
      const res = await fetch(`${API_URL}/help-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId, helperId, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      set((state) => ({ requests: [data, ...state.requests] }));

      // Emit socket notification
      if (socket) {
        socket.emit('help:request-created', data);
      }

      return true;
    } catch (err) {
      return false;
    }
  },

  updateStatus: async (requestId, status, socket) => {
    const token = localStorage.getItem('thinkbook_token');
    try {
      const res = await fetch(`${API_URL}/help-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Update state
      set((state) => ({
        requests: state.requests.map((r) => (r._id === requestId ? data : r)),
        notifications: state.notifications.filter((n) => n._id !== requestId),
      }));

      // Emit socket update
      if (socket) {
        socket.emit('help:status-updated', data);
      }

      return true;
    } catch (err) {
      return false;
    }
  },
}));
