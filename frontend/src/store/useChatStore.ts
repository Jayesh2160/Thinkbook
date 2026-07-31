import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';

export interface ChatUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface ChatMessage {
  _id: string;
  sender: ChatUser;
  receiver?: ChatUser;
  project?: string;
  workspace: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  messages: ChatMessage[];
  activeChatType: 'dm' | 'project' | null;
  activeChatTargetId: string | null; // mateId or projectId
  unreadCounts: Record<string, number>; // key: mateId or projectId
  isLoading: boolean;
  error: string | null;

  setChatTarget: (type: 'dm' | 'project' | null, id: string | null) => void;
  fetchDMs: (workspaceId: string, mateId: string) => Promise<void>;
  fetchProjectMessages: (workspaceId: string, projectId: string) => Promise<void>;
  sendMessage: (workspaceId: string, content: string, socket: any) => Promise<boolean>;
  receiveMessage: (message: ChatMessage) => void;
  clearUnread: (targetId: string) => void;
  clearError: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  activeChatType: null,
  activeChatTargetId: null,
  unreadCounts: {},
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  setChatTarget: (type, id) => {
    set({ activeChatType: type, activeChatTargetId: id, messages: [] });
    if (id) {
      get().clearUnread(id);
    }
  },

  clearUnread: (targetId) => {
    set((state) => {
      const newCounts = { ...state.unreadCounts };
      delete newCounts[targetId];
      return { unreadCounts: newCounts };
    });
  },

  fetchDMs: async (workspaceId, mateId) => {
    const token = localStorage.getItem('thinkbook_token');
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/chats/workspace/${workspaceId}/dm/${mateId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch messages');
      set({ messages: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchProjectMessages: async (workspaceId, projectId) => {
    const token = localStorage.getItem('thinkbook_token');
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/chats/workspace/${workspaceId}/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch messages');
      set({ messages: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  sendMessage: async (workspaceId, content, socket) => {
    const { activeChatType, activeChatTargetId } = get();
    if (!activeChatType || !activeChatTargetId) return false;

    const token = localStorage.getItem('thinkbook_token');
    const body: any = {
      workspaceId,
      content,
    };

    if (activeChatType === 'dm') {
      body.receiverId = activeChatTargetId;
    } else {
      body.projectId = activeChatTargetId;
    }

    try {
      const res = await fetch(`${API_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send message');

      // Append message to store
      set((state) => ({ messages: [...state.messages, data] }));

      // Emit over sockets
      if (socket) {
        socket.emit('chat:send', data);
      }

      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    }
  },

  receiveMessage: (message) => {
    set((state) => {
      const { activeChatType, activeChatTargetId, messages, unreadCounts } = state;
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) return {};

      const currentUserId = currentUser.id;

      // Check if it belongs to active chat
      let matchesActive = false;
      if (activeChatType === 'project' && message.project) {
        const msgProjId = typeof message.project === 'object' ? (message.project as any)._id : message.project;
        matchesActive = msgProjId === activeChatTargetId;
      } else if (activeChatType === 'dm' && message.receiver && !message.project) {
        const senderId = message.sender._id;
        const receiverId = message.receiver._id;
        matchesActive =
          (senderId === activeChatTargetId && receiverId === currentUserId) ||
          (senderId === currentUserId && receiverId === activeChatTargetId);
      }

      if (matchesActive) {
        // Prevent duplicates
        if (messages.some((m) => m._id === message._id)) return {};
        return { messages: [...messages, message] };
      } else {
        // Don't show unread counts for messages sent by the current user from another tab
        const msgSenderId = message.sender._id;
        if (msgSenderId === currentUserId) return {};

        let unreadKey = '';
        if (message.project) {
          unreadKey = typeof message.project === 'object' ? (message.project as any)._id : message.project;
        } else {
          unreadKey = msgSenderId;
        }

        const newCounts = { ...unreadCounts, [unreadKey]: (unreadCounts[unreadKey] || 0) + 1 };
        return { unreadCounts: newCounts };
      }
    });
  },
}));
