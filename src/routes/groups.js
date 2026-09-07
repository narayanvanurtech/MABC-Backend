import express from 'express';
import { Group } from '../models/Group.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { asyncHandler, parseBoolean, slugify } from '../utils.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

function groupPayload(body) {
  const name = body.name?.trim();
  return {
    name,
    slug: slugify(body.slug || name),
    description: body.description || '',
    isActive: parseBoolean(body.isActive, true),
  };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const groups = await Group.find().sort({ createdAt: -1 });
    res.json(groups);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  }),
);

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  upload.none(),
  asyncHandler(async (req, res) => {
    const group = await Group.create(groupPayload(req.body));
    res.status(201).json(group);
  }),
);

router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  upload.none(),
  asyncHandler(async (req, res) => {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    Object.assign(group, groupPayload(req.body));
    await group.save();
    res.json(group);
  }),
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const [categoryCount, productCount] = await Promise.all([
      Category.countDocuments({ group: group.name }),
      Product.countDocuments({ group: group.name }),
    ]);

    if (categoryCount > 0 || productCount > 0) {
      return res.status(409).json({ message: 'Move or delete categories and products in this group first' });
    }

    await group.deleteOne();
    res.json({ message: 'Group deleted' });
  }),
);

export default router;
