import { Response } from 'express';
import Comment from '../models/Comment';
import Task from '../models/Task';
import Activity from '../models/Activity';
import { AuthRequest } from '../middleware/auth';

export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, text } = req.body;
    if (!taskId || !text) {
      return res.status(400).json({ message: 'Task ID and text are required.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const newComment = new Comment({
      task: taskId,
      author: req.user.id,
      text,
    });

    await newComment.save();

    // Log Activity
    const newActivity = new Activity({
      task: taskId,
      project: task.project,
      user: req.user.id,
      type: 'comment',
      storyPointsSnapshot: task.storyPoints,
      details: { textSnippet: text.substring(0, 30) },
    });
    await newActivity.save();

    const populatedComment = await Comment.findById(newComment._id).populate('author', 'name email avatarUrl');

    res.status(201).json(populatedComment);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error creating comment.', error: error.message });
  }
};

export const getTaskComments = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    if (!taskId) {
      return res.status(400).json({ message: 'Task ID is required.' });
    }

    const comments = await Comment.find({ task: taskId })
      .populate('author', 'name email avatarUrl')
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error retrieving comments.', error: error.message });
  }
};
