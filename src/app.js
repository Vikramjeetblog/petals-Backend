const express = require('express');
const cors = require('cors');
const path = require('path');

const securityHeaders = require('./models/middleware/securityHeaders.middleware');
const rateLimit = require('./models/middleware/rateLimit.middleware');
const errorHandler = require('./models/middleware/errorHandler.middleware');

const app = express();

/* ================= MIDDLEWARE ================= */

// CORS
app.use(cors());

// Security Headers (Helmet-like protection)
app.use(securityHeaders);

// Rate Limiting (Prevent API abuse / DDoS)
app.use(rateLimit({ windowMs: 60 * 1000, max: 180 }));

// Body Parsers
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf; // Needed for Stripe/Razorpay webhook signature validation
    },
  })
);
app.use(express.urlencoded({ extended: true }));

/* ================= ROUTES ================= */

const authRoutes = require(path.join(__dirname, 'models', 'auth', 'auth.routes.js'));
const userRoutes = require(path.join(__dirname, 'models', 'user', 'user.routes.js'));
const cartRoutes = require(path.join(__dirname, 'models', 'cart', 'cart.routes.js'));
const checkoutRoutes = require(path.join(__dirname, 'models', 'checkout', 'checkout.routes.js'));
const productRoutes = require(path.join(__dirname, 'models', 'product', 'product.routes.js'));
const vendorRoutes = require(path.join(__dirname, 'models', 'vendor', 'vendor.routes.js'));
const riderRoutes = require(path.join(__dirname, 'models', 'rider', 'rider.routes.js'));
const orderRoutes = require(path.join(__dirname, 'models', 'order', 'order.routes.js'));
const paymentRoutes = require(path.join(__dirname, 'models', 'payment', 'payment.routes.js'));
const subscriptionRoutes = require(path.join(__dirname, 'models', 'subscription', 'subscription.routes.js'));
const warehouseRoutes = require(path.join(__dirname, 'models', 'warehouse', 'warehouse.routes.js'));

/* ================= API VERSIONING ================= */

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/vendor', vendorRoutes);
app.use('/api/v1/rider', riderRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/warehouse', warehouseRoutes);

/* ================= WORKERS ================= */

require('./workers/vendorOffline.worker')();
require('./workers/sla.workers')();
require('./workers/subscription.worker')();

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
  res.send('PETALS Backend is running');
});

/* ================= 404 HANDLER ================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/* ================= GLOBAL ERROR HANDLER ================= */

app.use(errorHandler);

module.exports = app;
