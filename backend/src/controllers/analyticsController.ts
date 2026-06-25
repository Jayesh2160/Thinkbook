import { Response } from 'express';
import Task from '../models/Task';
import Activity from '../models/Activity';
import Project from '../models/Project';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';

export const getStatusDistribution = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required.' });
    }

    const distribution = await Task.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(projectId) } },
      { $group: { _id: '$status', count: { $sum: 1 }, points: { $sum: '$storyPoints' } } },
    ]);

    // Format for easier use on frontend
    const result = distribution.map((item) => ({
      status: item._id,
      count: item.count,
      points: item.points,
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving status distribution.', error: error.message });
  }
};

export const getTeamVelocity = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required.' });
    }

    // Velocity is the sum of completed task story points grouped by assignee.
    // Task status for completed is 'Done'.
    const velocity = await Task.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          status: 'Done',
        },
      },
      { $unwind: '$assignees' },
      {
        $group: {
          _id: '$assignees',
          completedPoints: { $sum: '$storyPoints' },
          completedTasks: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          _id: 1,
          name: '$userDetails.name',
          email: '$userDetails.email',
          completedPoints: 1,
          completedTasks: 1,
        },
      },
    ]);

    res.json(velocity);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving team velocity.', error: error.message });
  }
};

export const getTimeTracking = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required.' });
    }

    const tracking = await Task.aggregate([
      { $match: { project: new mongoose.Types.ObjectId(projectId) } },
      { $unwind: { path: '$assignees', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$assignees',
          totalEstimatedHours: { $sum: '$estimatedHours' },
          totalLoggedHours: { $sum: '$loggedHours' },
          taskCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          userId: '$_id',
          name: { $ifNull: ['$userDetails.name', 'Unassigned'] },
          totalEstimatedHours: 1,
          totalLoggedHours: 1,
          taskCount: 1,
        },
      },
    ]);

    res.json(tracking);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving time tracking data.', error: error.message });
  }
};

export const getBurndownData = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Retrieve all tasks and their creation/due dates
    const tasks = await Task.find({ project: projectId });
    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    // Retrieve all activities related to moving tasks or point changes
    const activities = await Activity.find({
      project: projectId,
      type: { $in: ['create', 'move', 'points_change'] },
    }).sort({ createdAt: 1 });

    // Determine start date (project creation or first activity)
    const startDate = project.createdAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = tasks.reduce((latest, t) => (t.dueDate > latest ? t.dueDate : latest), new Date(startDate));

    // Ensure we have a reasonable duration
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const totalDays = Math.max(1, Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)));

    // Generate array of date strings for the sprint
    const dates: string[] = [];
    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(startMs + i * 24 * 60 * 60 * 1000);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Calculate story points remaining at each date
    // We will start from total points and move forward in time.
    // Better yet: we reconstruct history. Let's trace points changes.
    // At start, points remaining = 0.
    // For each activity:
    // - create: add points
    // - points_change: add (newPoints - oldPoints)
    // - move to Done: subtract points
    // - move from Done to something else: add points
    const burndownHistory: { [dateStr: string]: number } = {};
    let currentPoints = 0;

    // Fill history day-by-day
    const sortedActivities = [...activities].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Group activities by date string
    const activitiesByDate: { [dateStr: string]: any[] } = {};
    sortedActivities.forEach((act) => {
      const dateStr = act.createdAt.toISOString().split('T')[0];
      if (!activitiesByDate[dateStr]) {
        activitiesByDate[dateStr] = [];
      }
      activitiesByDate[dateStr].push(act);
    });

    // We can also calculate the current final state and go backwards,
    // or calculate from 0 going forwards. Let's go forwards.
    // Wait, if we go forwards:
    // Initially, there are 0 points.
    // When a task is created, we add points.
    // When a task moves to Done, we subtract its points.
    // When a task moves away from Done, we add its points back.
    // Let's implement this logic:
    let runningPoints = 0;
    
    // First, let's look at all tasks. If a task was created before the first activity, we make sure it's counted.
    // But since EVERY task creation creates a 'create' activity, we can just rely on the activities!
    
    const pointsMap: { [taskId: string]: number } = {};

    dates.forEach((dateStr) => {
      const dayActs = activitiesByDate[dateStr] || [];
      dayActs.forEach((act) => {
        const taskIdStr = act.task.toString();
        const ptsSnapshot = act.storyPointsSnapshot || 0;

        if (act.type === 'create') {
          pointsMap[taskIdStr] = ptsSnapshot;
          runningPoints += ptsSnapshot;
        } else if (act.type === 'points_change') {
          const oldPts = pointsMap[taskIdStr] || 0;
          const newPts = act.details?.newPoints ?? ptsSnapshot;
          pointsMap[taskIdStr] = newPts;
          
          // If the task was already completed (Done), changing its points changes the burned total.
          // Wait, if it's NOT Done, it adds to the remaining runningPoints.
          // Let's check current status of task in this activity.
          // A simpler way:
          runningPoints += (newPts - oldPts);
        } else if (act.type === 'move') {
          const fromStatus = act.details?.fromStatus;
          const toStatus = act.details?.toStatus;
          const taskPts = pointsMap[taskIdStr] || ptsSnapshot;

          if (toStatus === 'Done' && fromStatus !== 'Done') {
            runningPoints -= taskPts;
          } else if (fromStatus === 'Done' && toStatus !== 'Done') {
            runningPoints += taskPts;
          }
        }
      });

      burndownHistory[dateStr] = Math.max(0, runningPoints);
    });

    // Construct final result list
    const chartData = dates.map((dateStr, index) => {
      // Ideal burndown line
      const idealPoints = Math.max(0, totalPoints - (index * (totalPoints / totalDays)));
      // If we don't have a record for this date yet (future), set remaining points to null or keep last
      const remainingPoints = burndownHistory[dateStr];

      return {
        date: dateStr,
        remainingPoints,
        idealPoints: Math.round(idealPoints * 10) / 10,
      };
    });

    res.json(chartData);
  } catch (error: any) {
    res.status(500).json({ message: 'Error retrieving burndown data.', error: error.message });
  }
};
