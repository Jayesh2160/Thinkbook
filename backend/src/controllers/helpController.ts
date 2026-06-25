import { Response } from 'express';
import HelpRequest from '../models/HelpRequest';
import Task from '../models/Task';
import Activity from '../models/Activity';
import { AuthRequest } from '../middleware/auth';

export const createHelpRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, helperId, message } = req.body;
    if (!taskId || !helperId || !message) {
      return res.status(400).json({ message: 'Task ID, Helper ID, and message are required.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const newRequest = new HelpRequest({
      task: taskId,
      project: task.project,
      requester: req.user.id,
      helper: helperId,
      message,
      status: 'pending',
    });

    await newRequest.save();

    // Log Activity
    const newActivity = new Activity({
      task: taskId,
      project: task.project,
      user: req.user.id,
      type: 'help_request',
      storyPointsSnapshot: task.storyPoints,
      details: { helper: helperId, messageSnippet: message.substring(0, 30) },
    });
    await newActivity.save();

    const populatedRequest = await HelpRequest.findById(newRequest._id)
      .populate('requester helper', 'name email avatarUrl')
      .populate('task', 'title status');

    res.status(201).json(populatedRequest);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error creating help request.', error: error.message });
  }
};

export const updateHelpStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!['accepted', 'declined', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status update. Must be accepted, declined, or resolved.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const request = await HelpRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Help request not found.' });
    }

    // Verify roles
    // If setting to accepted/declined, current user must be helper
    if ((status === 'accepted' || status === 'declined') && request.helper.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the requested helper can accept or decline this request.' });
    }

    // If resolving, current user can be requester or helper
    if (status === 'resolved' && request.helper.toString() !== req.user.id && request.requester.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the requester or helper can mark this request as resolved.' });
    }

    request.status = status;
    await request.save();

    if (status === 'resolved') {
      const resolveActivity = new Activity({
        task: request.task,
        project: request.project,
        user: req.user.id,
        type: 'resolve',
        details: { helpRequestId: request._id },
      });
      await resolveActivity.save();
    }

    const updatedRequest = await HelpRequest.findById(request._id)
      .populate('requester helper', 'name email avatarUrl')
      .populate('task', 'title status');

    res.json(updatedRequest);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error updating help request.', error: error.message });
  }
};

export const getMyHelpRequests = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Return requests where user is requester OR helper
    const requests = await HelpRequest.find({
      $or: [{ requester: req.user.id }, { helper: req.user.id }],
    })
      .populate('requester helper', 'name email avatarUrl')
      .populate('task', 'title status')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error fetching help requests.', error: error.message });
  }
};

export const getProjectHelpRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required.' });
    }

    const requests = await HelpRequest.find({ project: projectId })
      .populate('requester helper', 'name email avatarUrl')
      .populate('task', 'title status')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error fetching project help requests.', error: error.message });
  }
};
