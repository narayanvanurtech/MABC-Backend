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

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true },
    description: { type: String, trim: true, default: '' },
    category: { type: String, required: true, trim: true },
    group: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    sku: { type: String, trim: true, default: '' },
    brand: { type: String, trim: true, default: '' },
    images: [imageSchema],
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'active',
    },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

productSchema.virtual('img').get(function img() {
  return this.images?.[0]?.url || '';
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });
attachBackupSync(productSchema, 'Product');

export const Product = mongoose.model('Product', productSchema);
