import mongoose, { Schema, Document } from 'mongoose';
import { ITask } from './Task';
import { IUser } from './User';

export interface IComment extends Document {
  task: mongoose.Types.ObjectId | ITask;
  author: mongoose.Types.ObjectId | IUser;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

CommentSchema.index({ task: 1 });

export default mongoose.model<IComment>('Comment', CommentSchema);
