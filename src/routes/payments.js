import crypto from 'node:crypto';
import express from 'express';
import Razorpay from 'razorpay';
import { config } from '../config.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { asyncHandler } from '../utils.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

function getRazorpay() {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    const error = new Error('Razorpay credentials are not configured');
    error.status = 500;
    throw error;
  }
  return new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
}

router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (_req, res) => {
    const payments = await Payment.find().sort({ createdAt: -1 }).populate('order', 'orderNumber customer total status');
    res.json(payments);
  }),
);

router.post(
  '/create-order',
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.body.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const receipt = order.orderNumber;
    const razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(order.total * 100),
      currency: config.razorpay.currency,
      receipt,
      notes: {
        mongoOrderId: String(order._id),
        orderNumber: order.orderNumber,
      },
    });

    order.razorpayOrderId = razorpayOrder.id;
    order.paymentStatus = 'created';
    await order.save();

    const payment = await Payment.create({
      order: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: order.total,
      currency: config.razorpay.currency,
      status: 'created',
      receipt,
      notes: razorpayOrder.notes,
    });

    res.status(201).json({
      key: config.razorpay.keyId,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt,
      payment,
    });
  }),
);

router.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid Razorpay signature' });
    }

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'paid',
      },
      { new: true },
    );

    const order = await Order.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        paymentStatus: 'paid',
        status: 'paid',
      },
      { new: true },
    );

    res.json({ message: 'Payment verified', order, payment });
  }),
);

export default router;
