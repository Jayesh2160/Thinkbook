import { Server, Socket } from 'socket.io';

// Map storing active viewers: taskId -> Map(socketId -> { userId, userName })
const taskViewers = new Map<string, Map<string, { userId: string; userName: string }>>();

export const setupSocketHandler = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    // 1. Join user direct room for target notifications
    socket.on('user:join', (userId: string) => {
      socket.data.userId = userId;
      socket.join(`user_${userId}`);
    });

    // 2. Join project room
    socket.on('project:join', (projectId: string) => {
      socket.data.projectId = projectId;
      socket.join(`project_${projectId}`);
    });

    socket.on('project:leave', (projectId: string) => {
      socket.leave(`project_${projectId}`);
    });

    // 3. Task drag-and-drop movement sync
    socket.on('task:move', ({ projectId, taskId, status }) => {
      socket.to(`project_${projectId}`).emit('task:moved', { taskId, status });
    });

    // 4. Task Viewing Indicators
    socket.on('task:view-start', ({ projectId, taskId, userId, userName }) => {
      socket.data.viewingTaskId = taskId;
      socket.data.viewingUserName = userName;

      if (!taskViewers.has(taskId)) {
        taskViewers.set(taskId, new Map());
      }
      
      taskViewers.get(taskId)!.set(socket.id, { userId, userName });

      // Broadcast updated viewers list to the project room
      const viewers = Array.from(taskViewers.get(taskId)!.values());
      io.to(`project_${projectId}`).emit('task:viewers-updated', { taskId, viewers });
    });

    socket.on('task:view-stop', ({ projectId, taskId }) => {
      handleStopViewing(socket, io, projectId, taskId);
    });

    // 5. Help Request Notifications
    socket.on('help:request-created', (helpRequest) => {
      const helperId = helpRequest.helper._id || helpRequest.helper;
      // Send real-time direct notification to the helper
      io.to(`user_${helperId}`).emit('help:requested', helpRequest);
      // Also broadcast update to the project room to trigger status badges on cards
      io.to(`project_${helpRequest.project}`).emit('help:updated', helpRequest);
    });

    socket.on('help:status-updated', (helpRequest) => {
      // Broadcast to project room to sync UI
      io.to(`project_${helpRequest.project}`).emit('help:updated', helpRequest);
      
      // Also notify requester of status update
      const requesterId = helpRequest.requester._id || helpRequest.requester;
      io.to(`user_${requesterId}`).emit('help:notification-updated', helpRequest);
    });

    // 6. Handle Disconnect
    socket.on('disconnect', () => {
      const { projectId, viewingTaskId } = socket.data;
      if (viewingTaskId && projectId) {
        handleStopViewing(socket, io, projectId, viewingTaskId);
      }
    });
  });
};

const handleStopViewing = (socket: Socket, io: Server, projectId: string, taskId: string) => {
  const viewersMap = taskViewers.get(taskId);
  if (viewersMap) {
    viewersMap.delete(socket.id);
    if (viewersMap.size === 0) {
      taskViewers.delete(taskId);
    }

    const viewers = viewersMap.size > 0 ? Array.from(viewersMap.values()) : [];
    io.to(`project_${projectId}`).emit('task:viewers-updated', { taskId, viewers });
  }
  socket.data.viewingTaskId = null;
};
