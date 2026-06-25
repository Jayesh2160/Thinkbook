import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { register, login, getMe } from '../controllers/authController';
import { createWorkspace, getMyWorkspaces, inviteMember } from '../controllers/workspaceController';
import { createProject, getWorkspaceProjects, getProjectDetails } from '../controllers/projectController';
import { createTask, getProjectTasks, updateTask, logTime, deleteTask } from '../controllers/taskController';
import { createComment, getTaskComments } from '../controllers/commentController';
import { createHelpRequest, updateHelpStatus, getMyHelpRequests, getProjectHelpRequests } from '../controllers/helpController';
import { getStatusDistribution, getTeamVelocity, getTimeTracking, getBurndownData } from '../controllers/analyticsController';

const router = Router();

// Auth routes
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authenticate, getMe);

// Workspace routes
router.post('/workspaces', authenticate, createWorkspace);
router.get('/workspaces', authenticate, getMyWorkspaces);
router.post('/workspaces/invite', authenticate, requireRole(['Admin', 'Project Manager']), inviteMember);

// Project routes
router.post('/projects', authenticate, requireRole(['Admin', 'Project Manager']), createProject);
router.get('/projects/workspace/:workspaceId', authenticate, getWorkspaceProjects);
router.get('/projects/:projectId', authenticate, getProjectDetails);

// Task routes
router.post('/tasks', authenticate, createTask);
router.get('/tasks/project/:projectId', authenticate, getProjectTasks);
router.patch('/tasks/:taskId', authenticate, updateTask);
router.post('/tasks/:taskId/log-time', authenticate, logTime);
router.delete('/tasks/:taskId', authenticate, requireRole(['Admin', 'Project Manager']), deleteTask);

// Comment routes
router.post('/comments', authenticate, createComment);
router.get('/comments/task/:taskId', authenticate, getTaskComments);

// Help Request routes
router.post('/help-requests', authenticate, createHelpRequest);
router.patch('/help-requests/:requestId', authenticate, updateHelpStatus);
router.get('/help-requests/my', authenticate, getMyHelpRequests);
router.get('/help-requests/project/:projectId', authenticate, getProjectHelpRequests);

// Analytics routes
router.get('/analytics/status/:projectId', authenticate, getStatusDistribution);
router.get('/analytics/velocity/:projectId', authenticate, getTeamVelocity);
router.get('/analytics/time/:projectId', authenticate, getTimeTracking);
router.get('/analytics/burndown/:projectId', authenticate, getBurndownData);

export default router;
