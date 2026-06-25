import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User';
import Workspace from '../models/Workspace';
import Project from '../models/Project';
import Task from '../models/Task';
import Comment from '../models/Comment';
import HelpRequest from '../models/HelpRequest';
import Activity from '../models/Activity';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/thinkbook';

const seedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected. Clearing database collections...');

    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    await HelpRequest.deleteMany({});
    await Activity.deleteMany({});

    console.log('Database cleared. Seeding users...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = await User.insertMany([
      {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password: hashedPassword,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
        role: 'Admin',
      },
      {
        name: 'Bob Smith',
        email: 'bob@example.com',
        password: hashedPassword,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
        role: 'Project Manager',
      },
      {
        name: 'Charlie Davis',
        email: 'charlie@example.com',
        password: hashedPassword,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
        role: 'Member',
      },
    ]);

    const [alice, bob, charlie] = users;
    console.log('Users seeded. Seeding workspaces and projects...');

    const workspace = new Workspace({
      name: 'Development Hub',
      owner: alice._id,
      members: [alice._id, bob._id, charlie._id],
    });
    await workspace.save();

    const project = new Project({
      name: 'Thinkbook Launch',
      workspace: workspace._id,
      columns: ['To Do', 'In Progress', 'Review', 'Done'],
    });
    await project.save();

    console.log('Seeding tasks...');
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    const taskData = [
      {
        title: 'Draft System Architecture Design',
        description: 'Document backend structure, Socket.io events and DB diagrams.',
        status: 'Done',
        priority: 'high',
        storyPoints: 5,
        estimatedHours: 12,
        loggedHours: 12,
        dueDate: new Date(now.getTime() - 2 * oneDay),
        assignees: [alice._id],
        project: project._id,
        workspace: workspace._id,
      },
      {
        title: 'Implement JWT Auth & RBAC',
        description: 'Set up token authentication, login endpoints and route guards.',
        status: 'Done',
        priority: 'high',
        storyPoints: 3,
        estimatedHours: 6,
        loggedHours: 7,
        dueDate: new Date(now.getTime() - 1 * oneDay),
        assignees: [alice._id, bob._id],
        project: project._id,
        workspace: workspace._id,
      },
      {
        title: 'Design Database Schemas',
        description: 'Write Mongoose schemas for User, Workspace, Project, Task, and HelpRequest.',
        status: 'Done',
        priority: 'medium',
        storyPoints: 3,
        estimatedHours: 4,
        loggedHours: 4,
        dueDate: new Date(now.getTime() - 3 * oneDay),
        assignees: [bob._id],
        project: project._id,
        workspace: workspace._id,
      },
      {
        title: 'Configure Socket.io Channels',
        description: 'Implement real-time sync for board movements and task views.',
        status: 'In Progress',
        priority: 'urgent',
        storyPoints: 8,
        estimatedHours: 16,
        loggedHours: 10,
        dueDate: new Date(now.getTime() + 2 * oneDay),
        assignees: [bob._id, charlie._id],
        project: project._id,
        workspace: workspace._id,
      },
      {
        title: 'Create Zustand Board Stores',
        description: 'Implement frontend global state stores with optimistic update and rollback logic.',
        status: 'In Progress',
        priority: 'high',
        storyPoints: 5,
        estimatedHours: 10,
        loggedHours: 4,
        dueDate: new Date(now.getTime() + 3 * oneDay),
        assignees: [alice._id],
        project: project._id,
        workspace: workspace._id,
      },
      {
        title: 'Implement Kanban Board Drag-and-Drop',
        description: 'Integrate @hello-pangea/dnd for fluid task card movements.',
        status: 'To Do',
        priority: 'high',
        storyPoints: 5,
        estimatedHours: 8,
        loggedHours: 0,
        dueDate: new Date(now.getTime() + 4 * oneDay),
        assignees: [charlie._id],
        project: project._id,
        workspace: workspace._id,
      },
      {
        title: 'Build Analytics Charts & Velocity Reports',
        description: 'Design burndown line, velocity bar, and task allocation pie charts.',
        status: 'To Do',
        priority: 'medium',
        storyPoints: 5,
        estimatedHours: 12,
        loggedHours: 0,
        dueDate: new Date(now.getTime() + 5 * oneDay),
        assignees: [alice._id],
        project: project._id,
        workspace: workspace._id,
      },
      {
        title: 'Set up Tailwind CSS & shadcn/ui theme',
        description: 'Integrate tailwind configuration and build customizable base widgets.',
        status: 'Review',
        priority: 'low',
        storyPoints: 2,
        estimatedHours: 4,
        loggedHours: 5,
        dueDate: new Date(now.getTime() + 1 * oneDay),
        assignees: [charlie._id],
        project: project._id,
        workspace: workspace._id,
      },
    ];

    const seededTasks = await Task.insertMany(taskData);
    console.log('Tasks seeded. Seeding comments & help requests...');

    // Seed Comments
    const comment1 = new Comment({
      task: seededTasks[3]._id,
      author: alice._id,
      text: 'I ran into issues with cross-origin headers, make sure CORS is allowed in Socket server configs.',
    });
    await comment1.save();

    const comment2 = new Comment({
      task: seededTasks[3]._id,
      author: bob._id,
      text: 'Thanks! Fixed it by adding origin configuration explicitly.',
    });
    await comment2.save();

    // Seed Help Requests
    // 1. Pending help request: Bob needs Alice's help
    const help1 = new HelpRequest({
      task: seededTasks[3]._id,
      project: project._id,
      requester: bob._id,
      helper: alice._id,
      message: 'Need help resolving socket namespace rooms matching.',
      status: 'pending',
    });
    await help1.save();

    // 2. Accepted help request: Charlie needs Bob's help
    const help2 = new HelpRequest({
      task: seededTasks[5]._id,
      project: project._id,
      requester: charlie._id,
      helper: bob._id,
      message: 'Need help setting up drag scroll container height matching.',
      status: 'accepted',
    });
    await help2.save();

    console.log('Seeding Activity logs for Burn-down history...');
    
    // We want to simulate activities over the past 6 days to build a nice burndown curve
    // Day -6: Alice creates all 8 tasks
    // Day -5: Tasks are assigned, Alice completes "Draft System Architecture Design"
    // Day -4: Bob completes "Design Database Schemas"
    // Day -2: Alice completes "Implement JWT Auth & RBAC"
    // Day -1: Bob requests Alice's help on socket rooms
    
    const dayMs = 24 * 60 * 60 * 1000;
    const activities = [
      // Day -6
      ...seededTasks.map((t, idx) => ({
        task: t._id,
        project: project._id,
        user: alice._id,
        type: 'create' as const,
        storyPointsSnapshot: t.storyPoints,
        details: { title: t.title, status: 'To Do' },
        createdAt: new Date(now.getTime() - 6 * dayMs + idx * 1000),
      })),

      // Day -5: Points changes or moves
      {
        task: seededTasks[0]._id,
        project: project._id,
        user: alice._id,
        type: 'move' as const,
        storyPointsSnapshot: seededTasks[0].storyPoints,
        details: { fromStatus: 'To Do', toStatus: 'In Progress' },
        createdAt: new Date(now.getTime() - 5 * dayMs),
      },
      {
        task: seededTasks[0]._id,
        project: project._id,
        user: alice._id,
        type: 'move' as const,
        storyPointsSnapshot: seededTasks[0].storyPoints,
        details: { fromStatus: 'In Progress', toStatus: 'Done' },
        createdAt: new Date(now.getTime() - 5 * dayMs + 2 * 60 * 60 * 1000),
      },

      // Day -4: Bob completes database design
      {
        task: seededTasks[2]._id,
        project: project._id,
        user: bob._id,
        type: 'move' as const,
        storyPointsSnapshot: seededTasks[2].storyPoints,
        details: { fromStatus: 'To Do', toStatus: 'In Progress' },
        createdAt: new Date(now.getTime() - 4 * dayMs),
      },
      {
        task: seededTasks[2]._id,
        project: project._id,
        user: bob._id,
        type: 'move' as const,
        storyPointsSnapshot: seededTasks[2].storyPoints,
        details: { fromStatus: 'In Progress', toStatus: 'Done' },
        createdAt: new Date(now.getTime() - 4 * dayMs + 4 * 60 * 60 * 1000),
      },

      // Day -2: Alice completes Auth
      {
        task: seededTasks[1]._id,
        project: project._id,
        user: alice._id,
        type: 'move' as const,
        storyPointsSnapshot: seededTasks[1].storyPoints,
        details: { fromStatus: 'To Do', toStatus: 'In Progress' },
        createdAt: new Date(now.getTime() - 2 * dayMs),
      },
      {
        task: seededTasks[1]._id,
        project: project._id,
        user: alice._id,
        type: 'move' as const,
        storyPointsSnapshot: seededTasks[1].storyPoints,
        details: { fromStatus: 'In Progress', toStatus: 'Done' },
        createdAt: new Date(now.getTime() - 2 * dayMs + 3 * 60 * 60 * 1000),
      },

      // Day -1: Help request activity
      {
        task: seededTasks[3]._id,
        project: project._id,
        user: bob._id,
        type: 'help_request' as const,
        storyPointsSnapshot: seededTasks[3].storyPoints,
        details: { helper: alice._id, message: 'Need help resolving socket namespace rooms matching.' },
        createdAt: new Date(now.getTime() - 1 * dayMs),
      },
    ];

    await Activity.insertMany(activities);

    console.log('Database seeded successfully!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Database seeding failed:', error);
    mongoose.connection.close();
  }
};

seedDatabase();
