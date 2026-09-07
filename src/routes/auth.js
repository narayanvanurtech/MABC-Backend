import express from 'express';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { Cart } from '../models/Cart.js';
import { asyncHandler, hashPassword, signToken, verifyPassword } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function mapAddress(address) {
  return {
    id: address._id,
    label: address.label,
    name: address.name,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country,
    isDefault: Boolean(address.isDefault),
  };
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    addresses: (user.addresses || []).map(mapAddress),
  };
}

function normalizeAddress(body = {}) {
  return {
    label: body.label?.trim() || 'Home',
    name: body.name?.trim() || '',
    phone: body.phone?.trim() || '',
    line1: body.line1?.trim() || '',
    line2: body.line2?.trim() || '',
    city: body.city?.trim() || '',
    state: body.state?.trim() || '',
    pincode: body.pincode?.trim() || '',
    country: body.country?.trim() || 'India',
    isDefault: Boolean(body.isDefault),
  };
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password || '';

    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const { salt, hash } = hashPassword(password);
    const user = await User.create({
      name,
      email,
      passwordSalt: salt,
      passwordHash: hash,
      role: 'user',
    });

    await Cart.create({ user: user._id, items: [] });
    const token = signToken({ userId: String(user._id), role: user.role }, config.auth.secret);
    res.status(201).json({ token, user: publicUser(user) });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password || '';

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });
    if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken({ userId: String(user._id), role: user.role }, config.auth.secret);
    res.json({ token, user: publicUser(user) });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  }),
);

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const name = req.body.name?.trim();
    if (name) req.user.name = name;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  }),
);

router.post(
  '/me/addresses',
  requireAuth,
  asyncHandler(async (req, res) => {
    const address = normalizeAddress(req.body);
    if (!address.line1) return res.status(400).json({ message: 'Address line 1 is required' });

    const hasDefault = req.user.addresses.some((item) => item.isDefault);
    if (address.isDefault || !req.user.addresses.length || !hasDefault) {
      req.user.addresses.forEach((item) => {
        item.isDefault = false;
      });
      address.isDefault = true;
    }

    req.user.addresses.push(address);
    await req.user.save();
    res.status(201).json({ user: publicUser(req.user) });
  }),
);

router.patch(
  '/me/addresses/:addressId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const address = req.user.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ message: 'Address not found' });

    const next = normalizeAddress(req.body);
    if (!next.line1) return res.status(400).json({ message: 'Address line 1 is required' });

    Object.assign(address, next);
    if (next.isDefault) {
      req.user.addresses.forEach((item) => {
        item.isDefault = item._id.toString() === address._id.toString();
      });
    } else if (!req.user.addresses.some((item) => item.isDefault)) {
      address.isDefault = true;
    }

    await req.user.save();
    res.json({ user: publicUser(req.user) });
  }),
);

router.delete(
  '/me/addresses/:addressId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const address = req.user.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ message: 'Address not found' });

    const wasDefault = Boolean(address.isDefault);
    address.deleteOne();

    if (wasDefault && req.user.addresses.length) {
      req.user.addresses[0].isDefault = true;
    }

    await req.user.save();
    res.json({ user: publicUser(req.user) });
  }),
);

export default router;
