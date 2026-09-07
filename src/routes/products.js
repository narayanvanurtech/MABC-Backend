import express from 'express';
import { Product } from '../models/Product.js';
import { asyncHandler, parseBoolean, slugify } from '../utils.js';
import { destroyCloudinaryImage, uploadBuffer } from '../cloudinary.js';
import { upload } from '../middleware/upload.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

function productPayload(body) {
  const name = body.name?.trim();
  const slug = slugify(body.slug || name);

  return {
    name,
    slug,
    description: body.description || '',
    category: body.category?.trim(),
    group: body.group?.trim(),
    price: Number(body.price),
    compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : undefined,
    stock: body.stock ? Number(body.stock) : 0,
    sku: body.sku || '',
    brand: body.brand || '',
    status: body.status || 'active',
    featured: parseBoolean(body.featured),
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.group) filter.group = req.query.group;
    if (req.query.status) filter.status = req.query.status;

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  }),
);

router.get(
  '/preview/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  }),
);

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  upload.array('images', 6),
  asyncHandler(async (req, res) => {
    const uploadedImages = await Promise.all((req.files || []).map((file) => uploadBuffer(file)));
    const manualImages = req.body.imageUrl ? [{ url: req.body.imageUrl }] : [];
    const product = await Product.create({
      ...productPayload(req.body),
      images: [...uploadedImages, ...manualImages],
    });
    res.status(201).json(product);
  }),
);

router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  upload.array('images', 6),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const uploadedImages = await Promise.all((req.files || []).map((file) => uploadBuffer(file)));
    const replaceImages = String(req.body.replaceImages || '').toLowerCase() === 'true';
    const keepImages = replaceImages ? [] : req.body.keepImages ? JSON.parse(req.body.keepImages) : product.images;
    const manualImages = req.body.imageUrl ? [{ url: req.body.imageUrl }] : [];
    const nextImages = [...keepImages, ...uploadedImages, ...manualImages];
    const removed = product.images.filter((image) => !nextImages.some((next) => next.publicId === image.publicId));

    Object.assign(product, productPayload(req.body), { images: nextImages });
    await product.save();
    await Promise.all(removed.map((image) => destroyCloudinaryImage(image.publicId)));

    res.json(product);
  }),
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    await Promise.all(product.images.map((image) => destroyCloudinaryImage(image.publicId)));
    res.json({ message: 'Product deleted' });
  }),
);

export default router;
