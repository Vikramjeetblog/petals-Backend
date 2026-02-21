const Order = require('../order/order.model');

exports.getPickList = async (req, res) => {
  try {
    const orders = await Order.find({ status: { $in: ['PLACED', 'ACCEPTED', 'PREPARING'] } })
      .populate('items.product', 'name rackLocation')
      .sort({ createdAt: 1 });

    const pickList = orders
      .map((order) => ({
        orderId: order._id,
        trackingId: order.trackingId,
        items: order.items
          .map((item) => ({
            productId: item.product?._id,
            productName: item.product?.name,
            rackLocation: item.product?.rackLocation || 'UNASSIGNED',
            quantity: item.quantity,
          }))
          .sort((a, b) => String(a.rackLocation).localeCompare(String(b.rackLocation))),
      }));

    return res.status(200).json({ success: true, pickList });
  } catch (error) {
    console.error('WAREHOUSE PICK LIST ERROR:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch pick list' });
  }
};
