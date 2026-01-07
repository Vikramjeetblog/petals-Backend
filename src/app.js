const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('APP DIR:', __dirname);

/* ✅ FIX IS HERE */
const app = express(); // ⬅️ () WAS MISSING

/* 🔴 CORS — ANDROID + RENDER SAFE */
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());
app.use(express.json());

/* ROUTES */
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
app.use('/order', productRoutes);


app.get('/', (req, res) => {
  res.send('PETALS Backend is running');
});

module.exports = app;
