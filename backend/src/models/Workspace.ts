import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IWorkspace extends Document {
  name: string;
  owner: mongoose.Types.ObjectId | IUser;
  members: (mongoose.Types.ObjectId | IUser)[];
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
