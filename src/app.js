const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('APP DIR:', __dirname);

const app = express();

/* ================= CORS ================= */
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());
app.use(express.json());

/* ======================================================
   🔥 REGISTER ALL MODELS (VERY IMPORTANT)
   👉 This fixes: Schema hasn't been registered for model "Vendor"
====================================================== */

// USER
require(path.join(__dirname, 'models', 'user', 'user.model.js'));

// VENDOR  ✅ MUST BE BEFORE PRODUCT
require(path.join(__dirname, 'models', 'vendor', 'vendor.model.js'));

// PRODUCT (depends on Vendor)
require(path.join(__dirname, 'models', 'product', 'product.model.js'));

// CART
require(path.join(__dirname, 'models', 'cart', 'cart.model.js'));

// ORDER
require(path.join(__dirname, 'models', 'order', 'order.model.js'));



/* ======================================================
   ROUTES
====================================================== */
const authRoutes = require(path.join(__dirname, 'models', 'auth', 'auth.routes.js'));
const userRoutes = require(path.join(__dirname, 'models', 'user', 'user.routes.js'));
const cartRoutes = require(path.join(__dirname, 'models', 'cart', 'cart.routes.js'));
const checkoutRoutes = require(path.join(__dirname, 'models', 'checkout', 'checkout.routes.js'));
const productRoutes = require(path.join(__dirname, 'models', 'product', 'product.routes.js'));
const orderRoutes = require(path.join(__dirname, 'models', 'order', 'order.routes.js'));

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/cart', cartRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/products', productRoutes);
app.use('/order', orderRoutes);


/* ======================================================
   ROOT
====================================================== */
app.get('/', (req, res) => {
  res.send('PETALS Backend is running');
});

module.exports = app;
