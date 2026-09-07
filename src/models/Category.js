import mongoose from 'mongoose';
import { attachBackupSync } from '../backup.js';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    width: Number,
    height: Number,
  },
  { _id: false },
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true },
    group: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    image: imageSchema,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
attachBackupSync(categorySchema, 'Category');

export const Category = mongoose.model('Category', categorySchema);
