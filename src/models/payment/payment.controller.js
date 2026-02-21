const crypto = require('crypto');
const Order = require('../order/order.model');
const { createOrder } = require('../../services/razorpay.service');

exports.createPaymentOrder = async (req, res) => {
  try {
    const { paymentGroupId } = req.body;
    if (!paymentGroupId) {
      return res.status(400).json({ message: 'paymentGroupId is required' });
    }

    const orders = await Order.find({ paymentGroupId, user: req.user._id });
    if (!orders.length) {
      return res.status(404).json({ message: 'Orders not found for paymentGroupId' });
    }

    const amountInPaise = Math.round(
      orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0) * 100
    );

    const razorpayOrder = await createOrder({
      amount: amountInPaise,
      receipt: paymentGroupId,
      notes: { paymentGroupId, userId: String(req.user._id) },
    });

    await Order.updateMany(
      { paymentGroupId, user: req.user._id },
      {
        $set: {
          paymentStatus: 'PENDING',
          razorpayOrderId: razorpayOrder.id,
        },
      }
    );

    return res.status(200).json({
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentGroupId,
      amount: amountInPaise,
      currency: 'INR',
      razorpayOrderId: razorpayOrder.id,
    });
  } catch (error) {
    console.error('PAYMENT CREATE ORDER ERROR:', error);
    return res.status(500).json({ message: error.message || 'Failed to create payment order' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { paymentGroupId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!paymentGroupId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: 'Missing verification payload' });
    }

    const generated = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generated !== razorpaySignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const result = await Order.updateMany(
      {
        paymentGroupId,
        user: req.user._id,
        razorpayOrderId,
      },
      {
        $set: {
          paymentStatus: 'PAID',
          razorpayPaymentId,
          razorpaySignature,
        },
      }
    );

    if (!result.matchedCount) {
      return res.status(404).json({ message: 'No matching orders found for verification' });
    }

    return res.status(200).json({ message: 'Payment verified successfully' });
  } catch (error) {
    console.error('PAYMENT VERIFY ERROR:', error);
    return res.status(500).json({ message: 'Failed to verify payment' });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const bodyBuffer = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const signature = req.headers['x-razorpay-signature'];

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(bodyBuffer)
      .digest('hex');

    if (!signature || signature !== expected) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const payload = JSON.parse(bodyBuffer.toString('utf-8'));
    const eventId = payload?.payload?.payment?.entity?.id || payload?.event;
    const razorpayOrderId = payload?.payload?.payment?.entity?.order_id;

    if (!razorpayOrderId) {
      return res.status(200).json({ message: 'ignored' });
    }

    const duplicate = await Order.findOne({
      razorpayOrderId,
      processedWebhookEvents: eventId,
    }).select('_id');

    if (duplicate) {
      return res.status(200).json({ message: 'already_processed' });
    }

    if (payload.event === 'payment.captured') {
      await Order.updateMany(
        { razorpayOrderId },
        {
          $set: {
            paymentStatus: 'PAID',
            razorpayPaymentId: payload.payload.payment.entity.id,
          },
          $addToSet: { processedWebhookEvents: eventId },
        }
      );
    } else {
      await Order.updateMany(
        { razorpayOrderId },
        { $addToSet: { processedWebhookEvents: eventId } }
      );
    }

    return res.status(200).json({ message: 'ok' });
  } catch (error) {
    console.error('PAYMENT WEBHOOK ERROR:', error);
    return res.status(500).json({ message: 'Webhook processing failed' });
  }
};
