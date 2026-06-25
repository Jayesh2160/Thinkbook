import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { type Task, useBoardStore } from '../store/useBoardStore';
import { useHelpStore } from '../store/useHelpStore';
import { Calendar, CheckSquare, AlertTriangle, Users } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  index: number;
  onOpenDetails: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, index, onOpenDetails }) => {
  const activeViewers = useBoardStore((state) => state.activeViewers[task._id]) || [];
  const requests = useHelpStore((state) => state.requests);
  const helpRequests = requests.filter((r) => {
    const tId = typeof r.task === 'object' ? r.task._id : r.task;
    return tId === task._id;
  });

  const pendingHelp = helpRequests.find((r) => r.status === 'pending');
  const acceptedHelp = helpRequests.find((r) => r.status === 'accepted');

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'high':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'medium':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const formattedDate = new Date(task.dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpenDetails(task)}
          className={`p-4 mb-3 rounded-xl border glass-panel transition-all duration-200 cursor-grab active:cursor-grabbing hover:border-slate-700 select-none relative group ${
            snapshot.isDragging
              ? 'border-indigo-500 bg-slate-900/90 shadow-2xl scale-[1.02] rotate-1'
              : 'border-white/5'
          }`}
        >
          {/* Active Viewers indicators */}
          {activeViewers.length > 0 && (
            <div className="absolute -top-1.5 right-4 flex items-center gap-1 bg-indigo-600/95 text-[9px] text-slate-100 font-bold px-2 py-0.5 rounded-full shadow-md shadow-indigo-600/20 border border-indigo-400/20">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
              <span>{activeViewers.length} viewing</span>
            </div>
          )}

          {/* Help requests alerts */}
          {pendingHelp && (
            <div className="mb-2.5 flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-lg text-[10px] font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SOS: Help Requested</span>
            </div>
          )}

          {acceptedHelp && (
            <div className="mb-2.5 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>Collab: {acceptedHelp.helper.name.split(' ')[0]} Helping</span>
            </div>
          )}

          <h4 className="text-xs font-bold text-slate-100 tracking-wide line-clamp-2 leading-relaxed group-hover:text-indigo-400 transition-colors">
            {task.title}
          </h4>

          {task.description && (
            <p className="text-[10px] text-slate-400 line-clamp-2 mt-1.5 leading-normal">
              {task.description}
            </p>
          )}

          {/* Meta Details */}
          <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-wider ${getPriorityStyle(task.priority)}`}>
                {task.priority}
              </span>
              {task.storyPoints > 0 && (
                <span className="text-[9px] font-bold text-indigo-300 bg-indigo-950/40 border border-indigo-800/30 px-2 py-0.5 rounded-full">
                  {task.storyPoints} SP
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[9px] text-slate-500 font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Assignees List */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{task.loggedHours}/{task.estimatedHours}h</span>
            </div>

            <div className="flex -space-x-1.5 overflow-hidden">
              {task.assignees.map((assignee) => (
                <img
                  key={assignee.id}
                  className="inline-block h-5 w-5 rounded-full ring-2 ring-slate-900 border border-slate-800"
                  src={assignee.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${assignee.name}`}
                  alt={assignee.name}
                  title={assignee.name}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};
