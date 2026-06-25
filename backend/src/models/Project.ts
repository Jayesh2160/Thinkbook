import mongoose, { Schema, Document } from 'mongoose';
import { IWorkspace } from './Workspace';

export interface IProject extends Document {
  name: string;
  workspace: mongoose.Types.ObjectId | IWorkspace;
  columns: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    columns: {
      type: [String],
      default: ['To Do', 'In Progress', 'Review', 'Done'],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IProject>('Project', ProjectSchema);
