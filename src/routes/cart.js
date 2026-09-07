import express from 'express';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { asyncHandler } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

async function getCart(userId) {
  let cart = await Cart.findOne({ user: userId }).populate('items.product', 'name images price category group status');
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
    cart = await Cart.findById(cart._id).populate('items.product', 'name images price category group status');
  }
  return cart;
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const cart = await getCart(req.user._id);
    res.json(cart);
  }),
);

router.post(
  '/items',
  requireAuth,
  asyncHandler(async (req, res) => {
    const productId = req.body.productId;
    const quantity = Number(req.body.quantity || 1);
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id, 'items.product': product._id },
      { $inc: { 'items.$.quantity': quantity } },
      { new: true },
    );

    if (cart) {
      const populated = await Cart.findById(cart._id).populate('items.product', 'name images price category group status');
      return res.json(populated);
    }

    await Cart.findOneAndUpdate(
      { user: req.user._id },
      {
        $push: {
          items: {
            product: product._id,
            name: product.name,
            price: product.price,
            image: product.images?.[0]?.url || '',
            quantity,
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const nextCart = await getCart(req.user._id);
    res.status(201).json(nextCart);
  }),
);

router.patch(
  '/items/:productId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const quantity = Number(req.body.quantity || 1);
    if (quantity <= 0) {
      await Cart.updateOne({ user: req.user._id }, { $pull: { items: { product: req.params.productId } } });
      const nextCart = await getCart(req.user._id);
      return res.json(nextCart);
    }

    await Cart.updateOne(
      { user: req.user._id, 'items.product': req.params.productId },
      { $set: { 'items.$.quantity': quantity } },
    );
    const nextCart = await getCart(req.user._id);
    res.json(nextCart);
  }),
);

router.delete(
  '/items/:productId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await Cart.updateOne({ user: req.user._id }, { $pull: { items: { product: req.params.productId } } });
    const nextCart = await getCart(req.user._id);
    res.json(nextCart);
  }),
);

router.delete(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
    const nextCart = await getCart(req.user._id);
    res.json(nextCart);
  }),
);

export default router;
