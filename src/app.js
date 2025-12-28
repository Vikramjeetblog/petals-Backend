const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('APP DIR:', __dirname);

const authRoutes = require(
  path.join(__dirname, 'models', 'auth', 'auth.routes.js')
);
const userRoutes = require(
path.join(__dirname,'models','user','user.routes.js')
  )
const cartRoutes = require(path.join(__dirname,'models','cart','cart.routes.js'));
const checkoutRoutes = require(path.join(__dirname,'models','cart','cart.routes.js'));
const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/cart',cartRoutes);
app.use('/checkout',checkoutRoutes);
app.get('/', (req, res) => {
  res.send('PETALS Backend is running');
});

module.exports = app;
