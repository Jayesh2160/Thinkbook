import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  avatarUrl?: string;
  role: 'Admin' | 'Project Manager' | 'Member';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    role: { type: String, enum: ['Admin', 'Project Manager', 'Member'], default: 'Member' },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
