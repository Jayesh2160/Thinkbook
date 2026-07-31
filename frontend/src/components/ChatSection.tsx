import React, { useEffect, useRef, useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { Send, Hash, Users, Sparkles, MessageSquare, CornerDownLeft } from 'lucide-react';

export const ChatSection: React.FC = () => {
  const { activeWorkspace, projects, activeProject, socket } = useBoardStore();
  const { user: currentUser } = useAuthStore();
  const {
    messages,
    activeChatType,
    activeChatTargetId,
    unreadCounts,
    isLoading,
    error,
    setChatTarget,
    fetchDMs,
    fetchProjectMessages,
    sendMessage,
  } = useChatStore();

  const [inputMessage, setInputMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load chat on target change
  useEffect(() => {
    if (!activeWorkspace || !activeChatTargetId || !activeChatType) return;

    if (activeChatType === 'dm') {
      fetchDMs(activeWorkspace._id, activeChatTargetId);
    } else {
      fetchProjectMessages(activeWorkspace._id, activeChatTargetId);
    }
  }, [activeChatType, activeChatTargetId, activeWorkspace]);

  // Auto select default channel (active project or first project) on mount if none active
  useEffect(() => {
    if (!activeChatTargetId && activeWorkspace) {
      if (activeProject) {
        setChatTarget('project', activeProject._id);
      } else if (projects.length > 0) {
        setChatTarget('project', projects[0]._id);
      }
    }
  }, [activeWorkspace, activeProject, projects]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeWorkspace) return;

    const success = await sendMessage(activeWorkspace._id, inputMessage.trim(), socket);
    if (success) {
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0b0f19]/30 text-slate-400">
        <Sparkles className="w-12 h-12 text-indigo-500/80 mb-4 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-200">No Active Workspace</h3>
        <p className="text-xs text-slate-500 mt-1">Please select or create a workspace to view chats.</p>
      </div>
    );
  }

  // Get other workspace members (mates)
  const mates = activeWorkspace.members.filter(
    (member) => (member.id || (member as any)._id) !== currentUser?.id
  );

  const getTargetDetails = () => {
    if (!activeChatTargetId) return null;
    if (activeChatType === 'project') {
      const proj = projects.find((p) => p._id === activeChatTargetId);
      return {
        name: proj ? `# ${proj.name}` : '# General Project Chat',
        subtitle: 'Group Channel Chat',
        avatarUrl: null,
      };
    } else {
      const mate = activeWorkspace.members.find(
        (m) => (m.id || (m as any)._id) === activeChatTargetId
      );
      return {
        name: mate?.name || 'Workspace Mate',
        subtitle: mate?.email || 'Direct Message',
        avatarUrl: mate?.avatarUrl,
        role: (mate as any)?.role,
      };
    }
  };

  const activeTarget = getTargetDetails();

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return (
      date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' at ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  return (
    <div className="flex-1 flex h-[calc(100vh-64px)] overflow-hidden bg-[#0c101b] relative">
      {/* Gradient ambient backgrounds */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Left Chat Pane - Channels & Mates */}
      <div className="w-64 border-r border-slate-900 bg-slate-950/20 flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-slate-900">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            Workspace Chat
          </h2>
          <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
            {activeWorkspace.name}
          </span>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {/* Projects/Channels section */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Project Channels
              </span>
            </div>
            <div className="space-y-1">
              {projects.map((proj) => {
                const isActive = activeChatType === 'project' && activeChatTargetId === proj._id;
                const unread = unreadCounts[proj._id] || 0;
                return (
                  <button
                    key={proj._id}
                    onClick={() => setChatTarget('project', proj._id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/20'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Hash className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                      <span className="truncate">{proj.name}</span>
                    </div>
                    {unread > 0 && (
                      <span className="bg-indigo-500 text-slate-100 text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
              {projects.length === 0 && (
                <div className="text-[10px] text-slate-600 px-3 py-1">No channels found</div>
              )}
            </div>
          </div>

          {/* Members / Mates section */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Workspace Mates ({mates.length})
              </span>
            </div>
            <div className="space-y-1">
              {mates.map((mate) => {
                const mateId = mate.id || (mate as any)._id;
                const isActive = activeChatType === 'dm' && activeChatTargetId === mateId;
                const unread = unreadCounts[mateId] || 0;
                return (
                  <button
                    key={mateId}
                    onClick={() => setChatTarget('dm', mateId)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/20'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <img
                        src={mate.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${mate.name}`}
                        alt={mate.name}
                        className="w-5 h-5 rounded-full border border-slate-700 bg-slate-950 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${mate.name}`;
                        }}
                      />
                      <div className="truncate text-left">
                        <p className="truncate leading-none">{mate.name}</p>
                        <span className="text-[9px] text-slate-500 font-normal shrink-0">
                          {(mate as any).role || 'Member'}
                        </span>
                      </div>
                    </div>
                    {unread > 0 && (
                      <span className="bg-indigo-500 text-slate-100 text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
              {mates.length === 0 && (
                <div className="text-[10px] text-slate-600 px-3 py-1">No other members</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Chat Pane - Chat Messages Window */}
      <div className="flex-1 flex flex-col h-full bg-slate-950/10 relative">
        {activeChatTargetId && activeTarget ? (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-900/80 bg-slate-900/20 backdrop-blur-sm flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {activeChatType === 'dm' && activeTarget.avatarUrl ? (
                  <img
                    src={activeTarget.avatarUrl}
                    alt={activeTarget.name}
                    className="w-9 h-9 rounded-full border border-slate-800 bg-slate-950"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${activeTarget.name}`;
                    }}
                  />
                ) : activeChatType === 'dm' ? (
                  <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-slate-300">
                    {activeTarget.name.charAt(0)}
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Hash className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{activeTarget.name}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {activeTarget.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Error notifications */}
            {error && (
              <div className="bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs px-6 py-2">
                {error}
              </div>
            )}

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                    <span className="text-[10px] uppercase font-bold tracking-wider">Loading messages...</span>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const isSelf = (msg.sender._id || msg.sender) === currentUser?.id;
                    const senderName = msg.sender.name;
                    const senderAvatar = msg.sender.avatarUrl;

                    return (
                      <div
                        key={msg._id}
                        className={`flex gap-3 max-w-[80%] ${
                          isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto'
                        }`}
                      >
                        {/* Avatar */}
                        {!isSelf && (
                          <img
                            src={senderAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${senderName}`}
                            alt={senderName}
                            className="w-7 h-7 rounded-full border border-slate-800 bg-slate-950 mt-1 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${senderName}`;
                            }}
                          />
                        )}

                        <div className="flex flex-col">
                          {/* Name & Time */}
                          <div
                            className={`flex items-center gap-2 mb-1 px-1 ${
                              isSelf ? 'flex-row-reverse' : ''
                            }`}
                          >
                            <span className="text-[10px] font-bold text-slate-300">
                              {isSelf ? 'You' : senderName}
                            </span>
                            <span className="text-[8px] text-slate-500">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>

                          {/* Bubble */}
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-xs break-words leading-relaxed shadow-md transition-all select-text selection:bg-indigo-500 selection:text-white ${
                              isSelf
                                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-slate-100 rounded-tr-none border border-indigo-500/10'
                                : 'glass-panel bg-slate-900/60 text-slate-200 rounded-tl-none border border-slate-800/80'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-900/10 rounded-2xl border border-slate-900/50">
                      <MessageSquare className="w-10 h-10 text-slate-700 mb-3" />
                      <h4 className="text-xs font-bold text-slate-400">No Messages Yet</h4>
                      <p className="text-[10px] text-slate-600 mt-1 max-w-[200px]">
                        Send a message to start the conversation!
                      </p>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-900 bg-slate-950/20 shrink-0">
              <form onSubmit={handleSend} className="flex gap-2 items-end max-w-4xl mx-auto">
                <div className="flex-1 relative glass-input p-0 border border-slate-800/80 rounded-xl overflow-hidden focus-within:border-indigo-500/80 transition-all bg-slate-950/60 shadow-inner flex items-center">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={`Message ${activeTarget.name}...`}
                    rows={1}
                    className="w-full text-xs text-slate-100 py-3 pl-4 pr-12 focus:outline-none resize-none max-h-24 bg-transparent select-text"
                    style={{ height: 'auto' }}
                  />
                  <div className="absolute right-3 bottom-2 flex items-center gap-1.5 text-[9px] text-slate-600 select-none">
                    <span>Enter to send</span>
                    <CornerDownLeft className="w-2.5 h-2.5" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className={`p-3 rounded-xl shadow-lg flex items-center justify-center transition-all ${
                    inputMessage.trim()
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-slate-100 cursor-pointer active:scale-95'
                      : 'bg-slate-900 text-slate-600 border border-slate-800/50 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow-xl">
              <Users className="w-6 h-6 text-slate-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">Start a Conversation</h3>
            <p className="text-[11px] text-slate-500 mt-1.5 max-w-sm">
              Select a project channel to chat with the entire team, or select a workspace mate for a direct, private message.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default ChatSection;
