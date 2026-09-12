import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 5000),

  mongoUri: process.env.MONGO_URI,

  mongoBackupUri: process.env.MONGODB_BACKUP,

  clientUrl:
    process.env.CLIENT_URL || 'https://www.mombabycare.co.in',

  adminUrl:
    process.env.ADMIN_URL || 'https://admin.mombabycare.co.in',

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  auth: {
    secret: process.env.AUTH_SECRET || 'synotec-dev-secret',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    currency: process.env.RAZORPAY_CURRENCY || 'INR',
  },
};