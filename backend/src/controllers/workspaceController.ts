import { Response } from 'express';
import Workspace from '../models/Workspace';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

export const createWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Workspace name is required.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const newWorkspace = new Workspace({
      name,
      owner: req.user.id,
      members: [req.user.id],
    });

    await newWorkspace.save();

    res.status(201).json(newWorkspace);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error creating workspace.', error: error.message });
  }
};

export const getMyWorkspaces = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const workspaces = await Workspace.find({
      $or: [{ owner: req.user.id }, { members: req.user.id }],
    }).populate('owner members', 'name email avatarUrl');

    res.json(workspaces);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error retrieving workspaces.', error: error.message });
  }
};

export const inviteMember = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, email } = req.body;

    if (!workspaceId || !email) {
      return res.status(400).json({ message: 'Workspace ID and user email are required.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    // Check if requester is owner of workspace
    if (workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the workspace owner can invite members.' });
    }

    const userToInvite = await User.findOne({ email: email.toLowerCase() });
    if (!userToInvite) {
      return res.status(404).json({ message: 'User with this email does not exist.' });
    }

    // Check if already member
    if (workspace.members.includes(userToInvite._id as any)) {
      return res.status(400).json({ message: 'User is already a member of this workspace.' });
    }

    workspace.members.push(userToInvite._id as any);
    await workspace.save();

    const updatedWorkspace = await Workspace.findById(workspaceId).populate('owner members', 'name email avatarUrl');

    res.json({ message: 'Member invited successfully.', workspace: updatedWorkspace });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error inviting member.', error: error.message });
  }
};
