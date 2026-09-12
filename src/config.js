import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || 'mongodb+srv://mombabycare21_db_user:fHxuoQWbhPn4PpgE@cluster0.muk5veg.mongodb.net/MABC',
  mongoBackupUri: process.env.MONGODB_BACKUP || 'mongodb+srv://rajeshbsahoo_db_user:evtJDQypmnQvzjJ1@cluster0.8b9riqv.mongodb.net/MABC_BACKUP_DATA',
  clientUrl: process.env.CLIENT_URL || 'https://www.mombabycare.co.in' || 'https://mombabycare.co.in',
  adminUrl: process.env.ADMIN_URL || 'https://admin.mombabycare.co.in',
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
