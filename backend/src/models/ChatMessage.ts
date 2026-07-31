import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IProject } from './Project';
import { IWorkspace } from './Workspace';

export interface IChatMessage extends Document {
  sender: mongoose.Types.ObjectId | IUser;
  receiver?: mongoose.Types.ObjectId | IUser; // DM recipient
  project?: mongoose.Types.ObjectId | IProject;  // Project channel chat
  workspace: mongoose.Types.ObjectId | IWorkspace; // Workspace context
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema: Schema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User' },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    content: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

// Optimize indexes for retrieval
ChatMessageSchema.index({ workspace: 1, receiver: 1, sender: 1 });
ChatMessageSchema.index({ workspace: 1, project: 1 });

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
