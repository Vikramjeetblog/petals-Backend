const Cart = require('../cart/cart.model');
const Order = require('../order/order.model');
const crypto = require('crypto');


/**
 * Checkout cart → create orders
 */
exports.checkout = async (req, res) => {
  try {
    console.log(' CHECKOUT API HIT');

    const user = req.user;

    const cart = await Cart.findOne({ user: user._id, isActive: true });

    if (!cart) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const paymentGroupId = `PG_${crypto.randomUUID()}`;
    const orders = [];

    //  EXPRESS ORDER
    if (cart.expressItems.length > 0) {
      let total = 0;

      const items = cart.expressItems.map((i) => {
        total += i.price * i.quantity;
        return {
          product: i.product,
          quantity: i.quantity,
          price: i.price
        };
      });

      const expressOrder = await Order.create({
        user: user._id,
        type: 'EXPRESS',
        store: cart.assignedStore,
        items,
        totalAmount: total,
        paymentStatus: 'PAID', // assume pay-now for express
        paymentGroupId
      });

      console.log(' EXPRESS ORDER CREATED');
      orders.push(expressOrder);
    }

    //  MARKETPLACE ORDER
    if (cart.marketplaceItems.length > 0) {
      let total = 0;

      const items = cart.marketplaceItems.map((i) => {
        total += i.price * i.quantity;
        return {
          product: i.product,
          quantity: i.quantity,
          price: i.price
        };
      });

      const marketplaceOrder = await Order.create({
        user: user._id,
        type: 'MARKETPLACE',
        vendor: cart.marketplaceItems[0].vendor, // single vendor for now
        items,
        totalAmount: total,
        paymentStatus: 'COD', // scheduled / pay later
        paymentGroupId
      });

      console.log(' MARKETPLACE ORDER CREATED');
      orders.push(marketplaceOrder);
    }

    //  Deactivate cart (Blinkit behavior)
    cart.isActive = false;
    await cart.save();

    console.log(' CART CLEARED');

    return res.status(200).json({
      message: 'Checkout successful',
      paymentGroupId,
      orders
    });

  } catch (error) {
    console.error('CHECKOUT ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
