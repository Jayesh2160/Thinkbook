import { Response } from 'express';
import ChatMessage from '../models/ChatMessage';
import Workspace from '../models/Workspace';
import Project from '../models/Project';
import { AuthRequest } from '../middleware/auth';

export const getWorkspaceDMs = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, mateId } = req.params;
    if (!workspaceId || !mateId) {
      return res.status(400).json({ message: 'Workspace ID and Mate ID are required.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify workspace membership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const currentUserId = req.user.id;
    const isMember = workspace.members.some(m => m.toString() === currentUserId) || workspace.owner.toString() === currentUserId;
    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden. You are not a member of this workspace.' });
    }

    // Fetch messages where workspace matches and (sender=self & receiver=mate OR sender=mate & receiver=self)
    const messages = await ChatMessage.find({
      workspace: workspaceId,
      $or: [
        { sender: currentUserId, receiver: mateId },
        { sender: mateId, receiver: currentUserId }
      ]
    })
      .populate('sender', 'name email avatarUrl')
      .populate('receiver', 'name email avatarUrl')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error retrieving direct messages.', error: error.message });
  }
};

export const getProjectMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, projectId } = req.params;
    if (!workspaceId || !projectId) {
      return res.status(400).json({ message: 'Workspace ID and Project ID are required.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify workspace membership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const currentUserId = req.user.id;
    const isMember = workspace.members.some(m => m.toString() === currentUserId) || workspace.owner.toString() === currentUserId;
    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden. You are not a member of this workspace.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const messages = await ChatMessage.find({
      workspace: workspaceId,
      project: projectId
    })
      .populate('sender', 'name email avatarUrl')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error retrieving project messages.', error: error.message });
  }
};

export const sendChatMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, receiverId, projectId, content } = req.body;

    if (!workspaceId || !content) {
      return res.status(400).json({ message: 'Workspace ID and message content are required.' });
    }

    if (!receiverId && !projectId) {
      return res.status(400).json({ message: 'Recipient (receiverId or projectId) is required.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const currentUserId = req.user.id;
    const isMember = workspace.members.some(m => m.toString() === currentUserId) || workspace.owner.toString() === currentUserId;
    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden. You are not a member of this workspace.' });
    }

    const newMessage = new ChatMessage({
      sender: currentUserId,
      workspace: workspaceId,
      content,
      ...(receiverId && { receiver: receiverId }),
      ...(projectId && { project: projectId })
    });

    await newMessage.save();

    const populated = await ChatMessage.findById(newMessage._id)
      .populate('sender', 'name email avatarUrl')
      .populate('receiver', 'name email avatarUrl');

    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error sending message.', error: error.message });
  }
};
export default { getWorkspaceDMs, getProjectMessages, sendChatMessage };
