import mongoose from 'mongoose';
import { attachBackupSync } from '../backup.js';

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
attachBackupSync(groupSchema, 'Group');

export const Group = mongoose.model('Group', groupSchema);
