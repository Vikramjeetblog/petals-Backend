const Subscription = require('./subscription.model');
const Product = require('../product/product.model');
const Order = require('../order/order.model');
const crypto = require('crypto');

const addNextDate = (date, frequency) => {
  const next = new Date(date);
  if (frequency === 'YEARLY') next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
};

exports.createSubscription = async (req, res) => {
  try {
    const { productId, frequency, nextDeliveryDate, razorpaySubscriptionId } = req.body;
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const subscription = await Subscription.create({
      user: req.user._id,
      product: product._id,
      frequency,
      nextDeliveryDate: nextDeliveryDate ? new Date(nextDeliveryDate) : new Date(),
      razorpaySubscriptionId: razorpaySubscriptionId || null,
      status: 'ACTIVE',
    });

    return res.status(201).json({ message: 'Subscription created', subscription });
  } catch (error) {
    console.error('CREATE SUBSCRIPTION ERROR:', error);
    return res.status(500).json({ message: 'Failed to create subscription' });
  }
};

exports.getMySubscriptions = async (req, res) => {
  const subscriptions = await Subscription.find({ user: req.user._id }).populate('product', 'name price image');
  return res.json({ subscriptions });
};

exports.updateSubscriptionStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const subscription = await Subscription.findOneAndUpdate(
    { _id: id, user: req.user._id },
    { $set: { status } },
    { new: true }
  );

  if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
  return res.json({ message: 'Subscription updated', subscription });
};

exports.runRecurringOrders = async () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const dueSubscriptions = await Subscription.find({
    status: 'ACTIVE',
    nextDeliveryDate: { $lte: today },
  }).populate('product');

  for (const sub of dueSubscriptions) {
    if (!sub.product || !sub.product.isActive) continue;

    const paymentGroupId = `PG_${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const parentOrderId = `PO_${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    await Order.create({
      orderNumber: `ORD_SUB_${Date.now()}_${String(sub._id).slice(-4)}`,
      paymentGroupId,
      parentOrderId,
      trackingId: `TRK_SUB_${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      user: sub.user,
      type: sub.product.fulfillmentModel,
      fulfillmentSource: sub.product.fulfillmentModel === 'EXPRESS' ? 'STORE' : 'VENDOR',
      vendor: sub.product.vendor || null,
      items: [
        {
          product: sub.product._id,
          quantity: 1,
          price: sub.product.price,
          logisticsFlags: {
            perishable: Boolean(sub.product.flags?.perishable),
            fragile: Boolean(sub.product.flags?.fragile),
            liveAnimal: Boolean(sub.product.flags?.liveAnimal),
            handleWithCare: Boolean(sub.product.flags?.handleWithCare),
            logisticsFlag: sub.product.logisticsFlag || null,
          },
        },
      ],
      totalAmount: sub.product.price,
      paymentStatus: 'PENDING',
      status:
        sub.product.fulfillmentModel === 'MARKETPLACE'
          ? 'PENDING_VENDOR_ACCEPTANCE'
          : 'PLACED',
    });

    sub.nextDeliveryDate = addNextDate(sub.nextDeliveryDate, sub.frequency);
    await sub.save();
  }

  return dueSubscriptions.length;
};
