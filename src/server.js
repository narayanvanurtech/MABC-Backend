import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import cartRoutes from './routes/cart.js';
import categoryRoutes from './routes/categories.js';
import groupRoutes from './routes/groups.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import productRoutes from './routes/products.js';
import { User } from './models/User.js';
import { Cart } from './models/Cart.js';
import { Category } from './models/Category.js';
import { Group } from './models/Group.js';
import { Order } from './models/Order.js';
import { Payment } from './models/Payment.js';
import { Product } from './models/Product.js';
import { connectBackupDatabase, syncExistingDataToBackup } from './backup.js';
import { hashPassword } from './utils.js';

const app = express();
const allowedOrigins = new Set([
  config.clientUrl,
  config.adminUrl,

  'https://www.mombabycare.co.in',
  'https://mombabycare.co.in',

  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
]);

app.use(
  cors({
    origin(origin, callback) {
      console.log('Incoming origin:', origin);

      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      console.error('CORS blocked:', origin);

      return callback(
        new Error(`Not allowed by CORS: ${origin}`)
      );
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'synotec-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Something went wrong',
  });
});

mongoose
  .connect(config.mongoUri)
  .then(async () => {
    await connectBackupDatabase();

    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    const adminName = process.env.ADMIN_NAME?.trim() || 'Admin';

    if (adminEmail && adminPassword) {
      const existing = await User.findOne({ email: adminEmail });
      if (!existing) {
        const { salt, hash } = hashPassword(adminPassword);
        const admin = await User.create({
          name: adminName,
          email: adminEmail,
          passwordSalt: salt,
          passwordHash: hash,
          role: 'admin',
        });
        await Cart.updateOne({ user: admin._id }, { $setOnInsert: { items: [] } }, { upsert: true });
        console.log(`Seeded admin account for ${adminEmail}`);
      }
    }

    await syncExistingDataToBackup([User, Cart, Group, Category, Product, Order, Payment]);

    app.listen(config.port, () => {
      console.log(`Synotec backend running on http://localhost:${config.port}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed', error);
    process.exit(1);
  });
