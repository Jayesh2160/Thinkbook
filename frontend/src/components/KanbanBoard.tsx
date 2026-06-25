import React, { useState } from 'react';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import { useBoardStore, type Task } from '../store/useBoardStore';
import { TaskCard } from './TaskCard';
import { Plus, Search, FolderClosed, Users } from 'lucide-react';

interface KanbanBoardProps {
  onOpenDetails: (task: Task) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ onOpenDetails }) => {
  const { activeProject, activeWorkspace, tasks, moveTaskOptimistically, createTask } = useBoardStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Inline task creation state per column
  const [addingTaskCol, setAddingTaskCol] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPoints, setNewTaskPoints] = useState(3);
  const [newTaskHours, setNewTaskHours] = useState(6);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    moveTaskOptimistically(draggableId, destination.droppableId);
  };

  const handleCreateTask = async (columnStatus: string) => {
    if (!newTaskTitle.trim()) return;

    // Set default due date to 5 days in the future
    const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    const success = await createTask({
      title: newTaskTitle,
      status: columnStatus,
      priority: 'medium',
      storyPoints: newTaskPoints,
      estimatedHours: newTaskHours,
      dueDate,
      assignees: [], // Initially unassigned
    });

    if (success) {
      setNewTaskTitle('');
      setNewTaskPoints(3);
      setNewTaskHours(6);
      setAddingTaskCol(null);
    }
  };

  // If no workspace or project selected, show empty state
  if (!activeWorkspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="glass-card max-w-md p-8 rounded-2xl border border-white/5 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-100">Welcome to Thinkbook</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Create a workspace or select an existing workspace from the sidebar to begin syncing your tasks.
          </p>
        </div>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="glass-card max-w-md p-8 rounded-2xl border border-white/5 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <FolderClosed className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-100">Select or Create a Project</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            This workspace has no active projects selected. Click the plus button in the sidebar next to "Projects" to create one.
          </p>
        </div>
      </div>
    );
  }

  // Filter tasks based on search
  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-8 py-6">
      {/* Search Header */}
      <div className="flex items-center justify-between mb-6 shrink-0 gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input pl-10 pr-4 py-2 w-full text-xs"
          />
        </div>
        <div className="flex gap-2">
          <div className="text-xs text-slate-400 font-medium bg-slate-900/60 border border-white/5 py-2 px-3 rounded-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Real-time Sync Active</span>
          </div>
        </div>
      </div>

      {/* Kanban Board columns wrapper */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4 select-none items-start">
          {activeProject.columns.map((column) => {
            const columnTasks = filteredTasks.filter((t) => t.status === column);

            return (
              <div
                key={column}
                className="w-72 shrink-0 glass-card bg-slate-900/30 rounded-2xl p-4 flex flex-col max-h-full border border-white/5 shadow-md"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-slate-200 tracking-wider">
                      {column}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setAddingTaskCol(addingTaskCol === column ? null : column)}
                    className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 p-1.5 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Inline task adder form */}
                {addingTaskCol === column && (
                  <div className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl mb-3 shrink-0 space-y-3">
                    <input
                      type="text"
                      placeholder="What needs to be done?"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="glass-input w-full text-xs py-1.5 px-2.5"
                      autoFocus
                    />
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[9px] text-slate-500 font-bold uppercase">Points</label>
                        <input
                          type="number"
                          min="0"
                          value={newTaskPoints}
                          onChange={(e) => setNewTaskPoints(Number(e.target.value))}
                          className="glass-input w-full text-xs py-1 px-2.5"
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <label className="text-[9px] text-slate-500 font-bold uppercase">Est. Hrs</label>
                        <input
                          type="number"
                          min="0"
                          value={newTaskHours}
                          onChange={(e) => setNewTaskHours(Number(e.target.value))}
                          className="glass-input w-full text-xs py-1 px-2.5"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => setAddingTaskCol(null)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 font-bold px-2 py-1 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleCreateTask(column)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-[10px] font-bold px-2.5 py-1 rounded shadow-lg shadow-indigo-600/20"
                      >
                        Add Task
                      </button>
                    </div>
                  </div>
                )}

                {/* Tasks List Container */}
                <Droppable droppableId={column}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto min-h-[150px] transition-colors rounded-xl p-1 ${
                        snapshot.isDraggingOver ? 'bg-slate-900/10' : ''
                      }`}
                    >
                      {columnTasks.map((task, index) => (
                        <TaskCard
                          key={task._id}
                          task={task}
                          index={index}
                          onOpenDetails={onOpenDetails}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};
