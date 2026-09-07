import mongoose from 'mongoose';
import { attachBackupSync } from '../backup.js';

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    razorpayOrderId: { type: String, required: true, index: true },
    razorpayPaymentId: String,
    razorpaySignature: String,
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'refunded'],
      default: 'created',
    },
    receipt: String,
    notes: Object,
  },
  { timestamps: true },
);
attachBackupSync(paymentSchema, 'Payment');

export const Payment = mongoose.model('Payment', paymentSchema);
