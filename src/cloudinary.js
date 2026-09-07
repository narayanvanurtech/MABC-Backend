import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import { config } from './config.js';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export function assertCloudinaryConfig() {
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    const error = new Error('Cloudinary credentials are not configured');
    error.status = 500;
    throw error;
  }
}

async function compressImage(file) {
  const image = sharp(file.buffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  const shouldUsePng = file.mimetype === 'image/png' && metadata.hasAlpha;

  image.resize({
    width: 1400,
    height: 1400,
    fit: 'inside',
    withoutEnlargement: true,
  });

  const buffer = shouldUsePng
    ? await image.png({ compressionLevel: 9, quality: 82, palette: true }).toBuffer()
    : await image.jpeg({ quality: 82, mozjpeg: true }).toBuffer();

  return {
    buffer,
    mimetype: shouldUsePng ? 'image/png' : 'image/jpeg',
  };
}

export async function uploadBuffer(file, folder = 'synotec/products') {
  assertCloudinaryConfig();
  const compressedFile = await compressImage(file);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      },
    );

    Readable.from(compressedFile.buffer).pipe(stream);
  });
}

export async function destroyCloudinaryImage(publicId) {
  if (!publicId) return;
  assertCloudinaryConfig();
  await cloudinary.uploader.destroy(publicId);
}
