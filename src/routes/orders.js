import express from 'express';
import { Order } from '../models/Order.js';
import { asyncHandler, makeOrderNumber } from '../utils.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('items.product', 'name images price');
    res.json(orders);
  }),
);

router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const email = req.user.email?.trim().toLowerCase();
    const orders = await Order.find({
      $or: [{ user: req.user._id }, { 'customer.email': email }],
    })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name images price');
    res.json(orders);
  }),
);

router.post(
  '/track',
  asyncHandler(async (req, res) => {
    const orderNumber = req.body.orderNumber?.trim().toUpperCase();
    const email = req.body.email?.trim().toLowerCase();

    if (!orderNumber || !email) {
      return res.status(400).json({ message: 'Order ID and billing email are required' });
    }

    const order = await Order.findOne({
      orderNumber,
      'customer.email': email,
    }).populate('items.product', 'name images price');

    if (!order) return res.status(404).json({ message: 'No order found for these details' });

    res.json(order);
  }),
);

router.get(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate('items.product', 'name images price');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  }),
);

router.post(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const customer = {
      ...req.body.customer,
      email: req.body.customer?.email?.trim().toLowerCase(),
    };
    const subtotal = req.body.items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    const shipping = Number(req.body.shipping || 0);
    const order = await Order.create({
      orderNumber: makeOrderNumber(),
      user: req.user?._id,
      customer,
      items: req.body.items,
      subtotal,
      shipping,
      total: subtotal + shipping,
    });
    res.status(201).json(order);
  }),
);

router.patch(
  '/:id/status',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: req.body.status,
        paymentStatus: req.body.paymentStatus,
      },
      { new: true, runValidators: true },
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  }),
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted' });
  }),
);

export default router;
