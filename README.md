# Synotec Backend

Express API for Synotec product, category, order, and Razorpay payment management.

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Set MongoDB, Cloudinary, and Razorpay credentials in `.env`.

## Main Endpoints

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/products/preview/:id`
- `POST /api/products` with multipart field `images`
- `PUT /api/products/:id` with multipart field `images`
- `DELETE /api/products/:id`
- `GET /api/categories`
- `GET /api/categories/:id`
- `GET /api/categories/preview/:id`
- `POST /api/categories` with multipart field `image`
- `PUT /api/categories/:id` with multipart field `image`
- `DELETE /api/categories/:id`
- `GET /api/orders`
- `POST /api/orders`
- `PATCH /api/orders/:id/status`
- `DELETE /api/orders/:id`
- `GET /api/payments`
- `POST /api/payments/create-order`
- `POST /api/payments/verify`

Product and category images are uploaded to Cloudinary by the backend. Razorpay orders are created server-side, and payment verification uses HMAC SHA-256 signature validation before marking the order and payment as paid.
