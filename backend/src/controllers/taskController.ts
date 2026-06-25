import { Response } from 'express';
import Task from '../models/Task';
import Activity from '../models/Activity';
import Project from '../models/Project';
import { AuthRequest } from '../middleware/auth';

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, status, priority, storyPoints, dueDate, assignees, projectId, workspaceId, estimatedHours } = req.body;

    if (!title || !status || !dueDate || !projectId || !workspaceId) {
      return res.status(400).json({ message: 'Title, status, dueDate, projectId, and workspaceId are required.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const newTask = new Task({
      title,
      description: description || '',
      status,
      priority: priority || 'medium',
      storyPoints: storyPoints || 0,
      estimatedHours: estimatedHours || 0,
      loggedHours: 0,
      dueDate,
      assignees: assignees || [],
      project: projectId,
      workspace: workspaceId,
    });

    await newTask.save();

    // Create Activity
    const newActivity = new Activity({
      task: newTask._id,
      project: projectId,
      user: req.user.id,
      type: 'create',
      storyPointsSnapshot: newTask.storyPoints,
      details: { title: newTask.title, status: newTask.status },
    });
    await newActivity.save();

    const populatedTask = await Task.findById(newTask._id).populate('assignees', 'name email avatarUrl');

    res.status(201).json(populatedTask);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error creating task.', error: error.message });
  }
};

export const getProjectTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required.' });
    }

    const tasks = await Task.find({ project: projectId }).populate('assignees', 'name email avatarUrl');
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error retrieving tasks.', error: error.message });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const oldTask = await Task.findById(taskId);
    if (!oldTask) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: updateData },
      { new: true }
    ).populate('assignees', 'name email avatarUrl');

    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Check what changed and log Activity
    if (updateData.status && updateData.status !== oldTask.status) {
      const moveActivity = new Activity({
        task: updatedTask._id,
        project: updatedTask.project,
        user: req.user.id,
        type: 'move',
        storyPointsSnapshot: updatedTask.storyPoints,
        details: { fromStatus: oldTask.status, toStatus: updatedTask.status },
      });
      await moveActivity.save();
    }

    if (updateData.storyPoints !== undefined && updateData.storyPoints !== oldTask.storyPoints) {
      const pointsActivity = new Activity({
        task: updatedTask._id,
        project: updatedTask.project,
        user: req.user.id,
        type: 'points_change',
        storyPointsSnapshot: updatedTask.storyPoints,
        details: { oldPoints: oldTask.storyPoints, newPoints: updatedTask.storyPoints },
      });
      await pointsActivity.save();
    }

    res.json(updatedTask);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error updating task.', error: error.message });
  }
};

export const logTime = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { hours } = req.body;

    if (!hours || isNaN(Number(hours)) || Number(hours) <= 0) {
      return res.status(400).json({ message: 'Valid hours value is required.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    task.loggedHours = (task.loggedHours || 0) + Number(hours);
    await task.save();

    const populatedTask = await Task.findById(task._id).populate('assignees', 'name email avatarUrl');

    res.json(populatedTask);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error logging time.', error: error.message });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;

    const taskToDelete = await Task.findById(taskId);
    if (!taskToDelete) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    await Task.findByIdAndDelete(taskId);

    // Delete associated activities and comments
    await Activity.deleteMany({ task: taskId });

    res.json({ message: 'Task and related activities deleted successfully.', taskId });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error deleting task.', error: error.message });
  }
};
