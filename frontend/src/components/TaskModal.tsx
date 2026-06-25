import React, { useState, useEffect } from 'react';
import { type Task, useBoardStore } from '../store/useBoardStore';
import { useAuthStore } from '../store/useAuthStore';
import { useHelpStore } from '../store/useHelpStore';
import { X, Users, UserCheck, Send, Check } from 'lucide-react';

interface TaskModalProps {
  task: Task;
  onClose: () => void;
}

interface Comment {
  _id: string;
  author: {
    name: string;
    avatarUrl?: string;
  };
  text: string;
  createdAt: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({ task, onClose }) => {
  const { user } = useAuthStore();
  const {
    activeWorkspace,
    updateTaskDetails,
    logTimeOnTask,
    deleteTask,
    startViewingTask,
    stopViewingTask,
    activeViewers,
    socket,
  } = useBoardStore();

  const { requests, createRequest, updateStatus, fetchProjectRequests } = useHelpStore();

  const [activeTab, setActiveTab] = useState<'comments' | 'help'>('comments');

  // Input states
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [storyPoints, setStoryPoints] = useState(task.storyPoints);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '');
  const [estimatedHours] = useState(task.estimatedHours);
  const [timeToLog, setTimeToLog] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assignees.map((a) => a.id));

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Help requests state
  const [helpMessage, setHelpMessage] = useState('');
  const [selectedHelperId, setSelectedHelperId] = useState('');

  // Track viewing
  useEffect(() => {
    if (user) {
      startViewingTask(task._id, user.id, user.name);
    }
    fetchComments();
    fetchProjectRequests(task.project);

    return () => {
      stopViewingTask(task._id);
    };
  }, [task._id]);

  const fetchComments = async () => {
    setLoadingComments(true);
    const token = localStorage.getItem('thinkbook_token');
    try {
      const res = await fetch(`http://localhost:5000/api/comments/task/${task._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setComments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSaveDetails = async () => {
    // Determine assigned user objects to update locally
    const allMembers = activeWorkspace?.members || [];
    const updatedAssignees = allMembers.filter((m) => assigneeIds.includes(m.id));

    await updateTaskDetails(task._id, {
      title,
      description,
      status,
      priority,
      storyPoints,
      dueDate: new Date(dueDate).toISOString(),
      estimatedHours,
      assignees: updatedAssignees as any,
    });
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const hours = Number(timeToLog);
    if (isNaN(hours) || hours <= 0) return;
    const success = await logTimeOnTask(task._id, hours);
    if (success) {
      setTimeToLog('');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const token = localStorage.getItem('thinkbook_token');
    try {
      const res = await fetch('http://localhost:5000/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId: task._id, text: newComment }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((prev) => [...prev, data]);
        setNewComment('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendHelpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHelperId || !helpMessage.trim()) return;

    const success = await createRequest(task._id, selectedHelperId, helpMessage, socket);
    if (success) {
      setHelpMessage('');
      setSelectedHelperId('');
      fetchProjectRequests(task.project);
    }
  };

  const handleResolveHelp = async (requestId: string) => {
    await updateStatus(requestId, 'resolved', socket);
    fetchProjectRequests(task.project);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      const success = await deleteTask(task._id);
      if (success) {
        onClose();
      }
    }
  };

  const toggleAssignee = (memberId: string) => {
    if (assigneeIds.includes(memberId)) {
      setAssigneeIds(assigneeIds.filter((id) => id !== memberId));
    } else {
      setAssigneeIds([...assigneeIds, memberId]);
    }
  };

  // Get active viewers except current user
  const otherViewers = (activeViewers[task._id] || []).filter((v) => v.userId !== user?.id);

  // Get help requests for this specific task
  const taskHelpRequests = requests.filter((r) => {
    const tId = typeof r.task === 'object' ? r.task._id : r.task;
    return tId === task._id;
  });

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl glass-card rounded-2xl border border-white/10 p-8 max-h-[90vh] overflow-y-auto flex flex-col gap-6 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-200 transition-colors p-1.5 hover:bg-slate-800/40 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Live viewing alert */}
        {otherViewers.length > 0 && (
          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 p-2.5 rounded-lg text-[10px] font-semibold tracking-wide">
            <Users className="w-4 h-4 shrink-0" />
            <span>
              {otherViewers.map((v) => v.userName).join(', ')}{' '}
              {otherViewers.length === 1 ? 'is' : 'are'} viewing this task.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left panel: details, comments and help requests */}
          <div className="md:col-span-2 space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Task Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveDetails}
                className="w-full bg-transparent text-xl font-bold text-slate-100 focus:outline-none border-b border-transparent focus:border-slate-700/80 pb-1"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-0.5">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSaveDetails}
                rows={3}
                placeholder="Add a detailed description..."
                className="w-full glass-input text-xs leading-relaxed py-2 px-3 resize-none"
              />
            </div>

            {/* Tabs for Comments / Help requests */}
            <div className="border-b border-slate-800/80">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`pb-2.5 text-xs font-bold tracking-wider relative transition-colors ${
                    activeTab === 'comments' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  Comments
                  {activeTab === 'comments' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('help')}
                  className={`pb-2.5 text-xs font-bold tracking-wider relative transition-colors ${
                    activeTab === 'help' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  Collab Requests ({taskHelpRequests.length})
                  {activeTab === 'help' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></span>
                  )}
                </button>
              </div>
            </div>

            {activeTab === 'comments' ? (
              <div className="space-y-4">
                <form onSubmit={handlePostComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="glass-input flex-1 text-xs py-2 px-3"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {loadingComments ? (
                    <p className="text-[10px] text-slate-500">Loading comments...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">No comments yet. Start the conversation!</p>
                  ) : (
                    comments.map((comm) => (
                      <div key={comm._id} className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-indigo-300">{comm.author.name}</span>
                          </div>
                          <span className="text-[8px] text-slate-500">
                            {new Date(comm.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-normal">{comm.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Help Request Creator Form */}
                <form onSubmit={handleSendHelpRequest} className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Request Assistance</h4>
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] text-slate-500 font-bold">Select Helper</label>
                      <select
                        value={selectedHelperId}
                        onChange={(e) => setSelectedHelperId(e.target.value)}
                        className="glass-input text-[11px] py-1 px-2.5"
                      >
                        <option value="">Select teammate</option>
                        {activeWorkspace?.members
                          .filter((m) => m.id !== user?.id)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-500 font-bold">Message</label>
                    <input
                      type="text"
                      placeholder="What blocking issues do you have?"
                      value={helpMessage}
                      onChange={(e) => setHelpMessage(e.target.value)}
                      className="glass-input text-xs py-1.5 px-3"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs py-2 rounded-lg font-bold transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98]"
                  >
                    Send SOS Request
                  </button>
                </form>

                {/* List of help requests */}
                <div className="space-y-3.5 max-h-56 overflow-y-auto">
                  {taskHelpRequests.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">No help requests created on this task.</p>
                  ) : (
                    taskHelpRequests.map((req) => (
                      <div
                        key={req._id}
                        className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1 truncate">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-300">
                              {req.requester.name.split(' ')[0]} requested {req.helper.name.split(' ')[0]}
                            </span>
                            <span
                              className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider border ${
                                req.status === 'pending'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                                  : req.status === 'accepted'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : req.status === 'resolved'
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                              }`}
                            >
                              {req.status}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-400 italic font-medium truncate">
                            "{req.message}"
                          </p>
                        </div>

                        {/* Actions */}
                        {req.status === 'accepted' && (user?.id === req.requester._id || user?.id === req.helper._id) && (
                          <button
                            onClick={() => handleResolveHelp(req._id)}
                            className="flex items-center gap-1 text-[9px] font-bold bg-indigo-600 hover:bg-indigo-500 text-slate-100 px-2.5 py-1 rounded transition-colors shrink-0"
                          >
                            <Check className="w-3 h-3" />
                            Resolve
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right panel: settings, hours, assignees */}
          <div className="space-y-5 border-l border-slate-800/80 pl-6">
            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setTimeout(handleSaveDetails, 50);
                }}
                className="w-full glass-input text-xs py-2 bg-slate-950/80"
              >
                {activeWorkspace &&
                  activeWorkspace.members.length > 0 &&
                  ['To Do', 'In Progress', 'Review', 'Done'].map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Priority</label>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value as any);
                  setTimeout(handleSaveDetails, 50);
                }}
                className="w-full glass-input text-xs py-2 bg-slate-950/80"
              >
                {['low', 'medium', 'high', 'urgent'].map((pr) => (
                  <option key={pr} value={pr}>
                    {pr.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Story Points</label>
              <input
                type="number"
                value={storyPoints}
                onChange={(e) => setStoryPoints(Number(e.target.value))}
                onBlur={handleSaveDetails}
                className="w-full glass-input text-xs py-2 bg-slate-950/80"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={handleSaveDetails}
                className="w-full glass-input text-xs py-2 bg-slate-950/80 text-slate-100"
              />
            </div>

            {/* Time Logger */}
            <div className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Logged Hours</span>
                <span className="text-slate-200">
                  {task.loggedHours} / {estimatedHours}h
                </span>
              </div>
              <form onSubmit={handleLogTime} className="flex gap-2">
                <input
                  type="number"
                  placeholder="2.5"
                  step="0.5"
                  value={timeToLog}
                  onChange={(e) => setTimeToLog(e.target.value)}
                  className="glass-input flex-1 text-xs py-1.5 px-2.5"
                />
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 rounded-lg font-bold border border-slate-700/60 shrink-0"
                >
                  Log
                </button>
              </form>
            </div>

            {/* Assignees selector list */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Assignees</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {activeWorkspace?.members.map((member) => {
                  const isAssigned = assigneeIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      onClick={() => {
                        toggleAssignee(member.id);
                        setTimeout(handleSaveDetails, 50);
                      }}
                      className={`w-full text-left flex items-center justify-between p-2 rounded-lg text-xs font-semibold tracking-wide border transition-all ${
                        isAssigned
                          ? 'bg-indigo-600/10 text-indigo-200 border-indigo-500/20'
                          : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={member.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`}
                          className="w-5 h-5 rounded-full border border-slate-700"
                          alt={member.name}
                        />
                        <span>{member.name}</span>
                      </div>
                      {isAssigned && <UserCheck className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleDelete}
              className="w-full bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-400 hover:text-rose-300 text-[10px] font-bold py-2 rounded-lg transition-all active:scale-[0.98] mt-4 uppercase tracking-wider"
            >
              Delete Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
