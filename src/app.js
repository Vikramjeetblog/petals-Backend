const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('APP DIR:', __dirname);

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= ROUTES ================= */
const authRoutes = require(
  path.join(__dirname, 'models', 'auth', 'auth.routes.js')
);

const userRoutes = require(
  path.join(__dirname, 'models', 'user', 'user.routes.js')
);

const cartRoutes = require(
  path.join(__dirname, 'models', 'cart', 'cart.routes.js')
);

const checkoutRoutes = require(
  path.join(__dirname, 'models', 'checkout', 'checkout.routes.js')
);

const productRoutes = require(
  path.join(__dirname, 'models', 'product', 'product.routes.js')
);

const vendorRoutes = require(
  path.join(__dirname, 'models', 'vendor', 'vendor.routes.js')
);

/* ================= API VERSIONING ================= */
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/vendor', vendorRoutes);

/* ================= WORKERS ================= */
require('./workers/vendorOffline.worker')(); 

/* ================= HEALTH ================= */
app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'OK',
    service: 'PETALS Backend',
    timestamp: new Date().toISOString(),
  });
});

/* ================= ROOT ================= */
app.get('/', (req, res) => {
  res.send(' PETALS Backend is running');
});

/* ================= 404 HANDLER ================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

module.exports = app;
