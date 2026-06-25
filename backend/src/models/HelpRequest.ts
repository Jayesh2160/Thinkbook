import mongoose, { Schema, Document } from 'mongoose';
import { ITask } from './Task';
import { IProject } from './Project';
import { IUser } from './User';

export interface IHelpRequest extends Document {
  task: mongoose.Types.ObjectId | ITask;
  project: mongoose.Types.ObjectId | IProject;
  requester: mongoose.Types.ObjectId | IUser;
  helper: mongoose.Types.ObjectId | IUser;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

const HelpRequestSchema: Schema = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    helper: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'resolved'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

HelpRequestSchema.index({ helper: 1 });
HelpRequestSchema.index({ project: 1 });

export default mongoose.model<IHelpRequest>('HelpRequest', HelpRequestSchema);
