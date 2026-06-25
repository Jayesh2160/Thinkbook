import { Response } from 'express';
import Project from '../models/Project';
import Workspace from '../models/Workspace';
import { AuthRequest } from '../middleware/auth';

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, workspaceId } = req.body;
    if (!name || !workspaceId) {
      return res.status(400).json({ message: 'Project name and Workspace ID are required.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify workspace exists and requester is a member of the workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    if (!workspace.members.includes(req.user.id as any) && workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You must be a member of the workspace to create projects.' });
    }

    const newProject = new Project({
      name,
      workspace: workspaceId,
      columns: ['To Do', 'In Progress', 'Review', 'Done'],
    });

    await newProject.save();

    res.status(201).json(newProject);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error creating project.', error: error.message });
  }
};

export const getWorkspaceProjects = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required.' });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify workspace membership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    if (!workspace.members.includes(req.user.id as any) && workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You must be a member of the workspace to view projects.' });
    }

    const projects = await Project.find({ workspace: workspaceId });
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error retrieving projects.', error: error.message });
  }
};

export const getProjectDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required.' });
    }

    const project = await Project.findById(projectId).populate({
      path: 'workspace',
      select: 'name owner members',
      populate: { path: 'members owner', select: 'name email avatarUrl' }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error retrieving project details.', error: error.message });
  }
};
