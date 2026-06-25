import mongoose, { Schema, Document } from 'mongoose';
import { ITask } from './Task';
import { IProject } from './Project';
import { IUser } from './User';

export interface IActivity extends Document {
  task: mongoose.Types.ObjectId | ITask;
  project: mongoose.Types.ObjectId | IProject;
  user: mongoose.Types.ObjectId | IUser;
  type: 'create' | 'move' | 'points_change' | 'help_request' | 'resolve' | 'comment';
  details: Schema.Types.Mixed;
  storyPointsSnapshot: number;
  createdAt: Date;
}

const ActivitySchema: Schema = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['create', 'move', 'points_change', 'help_request', 'resolve', 'comment'],
      required: true,
    },
    details: { type: Schema.Types.Mixed, default: {} },
    storyPointsSnapshot: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivitySchema.index({ project: 1 });
ActivitySchema.index({ createdAt: 1 });

export default mongoose.model<IActivity>('Activity', ActivitySchema);
