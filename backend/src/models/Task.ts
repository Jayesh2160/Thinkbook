import mongoose, { Schema, Document } from 'mongoose';
import { IProject } from './Project';
import { IWorkspace } from './Workspace';
import { IUser } from './User';

export interface ITask extends Document {
  title: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  storyPoints: number;
  estimatedHours: number;
  loggedHours: number;
  dueDate: Date;
  assignees: (mongoose.Types.ObjectId | IUser)[];
  project: mongoose.Types.ObjectId | IProject;
  workspace: mongoose.Types.ObjectId | IWorkspace;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, required: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    storyPoints: { type: Number, default: 0 },
    estimatedHours: { type: Number, default: 0 },
    loggedHours: { type: Number, default: 0 },
    dueDate: { type: Date, required: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  },
  { timestamps: true }
);

// Add index on project to load tasks quickly
TaskSchema.index({ project: 1 });

export default mongoose.model<ITask>('Task', TaskSchema);
