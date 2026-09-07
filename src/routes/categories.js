import express from 'express';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { asyncHandler, parseBoolean, slugify } from '../utils.js';
import { destroyCloudinaryImage, uploadBuffer } from '../cloudinary.js';
import { upload } from '../middleware/upload.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

function categoryPayload(body) {
  const name = body.name?.trim();
  return {
    name,
    slug: slugify(body.slug || name),
    group: body.group?.trim(),
    description: body.description || '',
    isActive: parseBoolean(body.isActive, true),
  };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  }),
);

router.get(
  '/preview/:id',
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    const productCount = await Product.countDocuments({ category: category.name });
    res.json({ ...category.toObject(), productCount });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  }),
);

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const image = req.file ? await uploadBuffer(req.file, 'synotec/categories') : undefined;
    const category = await Category.create({
      ...categoryPayload(req.body),
      image,
    });
    res.status(201).json(category);
  }),
);

router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const previousImage = category.image;
    Object.assign(category, categoryPayload(req.body));
    if (req.file) category.image = await uploadBuffer(req.file, 'synotec/categories');
    await category.save();
    if (req.file && previousImage?.publicId) await destroyCloudinaryImage(previousImage.publicId);

    res.json(category);
  }),
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    const productCount = await Product.countDocuments({ category: category.name });
    if (productCount > 0) {
      return res.status(409).json({ message: 'Move or delete products in this category first' });
    }

    await category.deleteOne();
    await destroyCloudinaryImage(category.image?.publicId);
    res.json({ message: 'Category deleted' });
  }),
);

export default router;
