const crypto = require('node:crypto');

const PRODUCT = {
  id: 'breezepod-mini-fan',
  name: 'BreezePod Mini Rechargeable Fan',
  unitPrice: 399,
  colors: ['Pink', 'Green', 'Yellow', 'Orange', 'Mint / Navy', 'Burgundy / Cream', 'White / Navy']
};

const DELIVERY_CHARGES = {
  'Inside Kathmandu Valley': 100,
  'Outside Kathmandu Valley': 150
};

function response(res, status, body) {
  res.status(status).json(body);
}

function text(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function kathmanduNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true
  }).formatToParts(new Date()).reduce((out, part) => ({ ...out, [part.type]: part.value }), {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute} ${parts.dayPeriod}`
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return response(res, 405, { error: 'Method not allowed' });
  if (!process.env.GOOGLE_APPS_SCRIPT_URL || !process.env.ORDER_API_SECRET) {
    return response(res, 500, { error: 'Order service is not configured' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (JSON.stringify(body).length > 50000) return response(res, 413, { error: 'Order is too large' });

    const customerName = text(body.customerName, 100);
    const primaryPhone = text(body.primaryPhone, 30);
    const email = text(body.email, 160);
    const fullAddress = text(body.fullAddress, 500);
    const deliveryLocation = text(body.deliveryLocation, 60);
    const selectedColor = text(body.selectedColor, 40);
    const paymentMethod = text(body.paymentMethod, 40);
    const transactionCode = text(body.transactionCode, 100);
    const quantity = Number(body.quantity);

    if (customerName.length < 2 || primaryPhone.length < 7 || fullAddress.length < 8) {
      return response(res, 400, { error: 'Please provide valid customer and delivery details' });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response(res, 400, { error: 'Please provide a valid email address' });
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return response(res, 400, { error: 'Invalid quantity' });
    if (!PRODUCT.colors.includes(selectedColor)) return response(res, 400, { error: 'Invalid color selection' });
    if (!Object.prototype.hasOwnProperty.call(DELIVERY_CHARGES, deliveryLocation)) return response(res, 400, { error: 'Select a delivery location' });
    if (!['Cash on Delivery', 'QR Payment'].includes(paymentMethod)) return response(res, 400, { error: 'Select a payment method' });
    if (paymentMethod === 'QR Payment' && transactionCode.length < 3) return response(res, 400, { error: 'Transaction code is required for QR payment' });

    const deliveryCharge = DELIVERY_CHARGES[deliveryLocation];
    const subtotal = PRODUCT.unitPrice * quantity;
    const totalAmount = subtotal + deliveryCharge;
    const now = kathmanduNow();
    const orderId = `BPN-${now.date.replaceAll('-', '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const order = {
      orderId, orderDate: now.date, orderTime: now.time, customerName, primaryPhone, email,
      alternatePhone: '', province: '', district: deliveryLocation, municipality: '', area: '', wardNumber: '', fullAddress,
      landmark: '', productId: PRODUCT.id, productName: PRODUCT.name, selectedColor, quantity,
      unitPrice: PRODUCT.unitPrice, subtotal, deliveryCharge, totalAmount, paymentMethod, transactionCode,
      paymentScreenshotUrl: '', paymentStatus: paymentMethod === 'QR Payment' ? 'Verification Pending' : 'Pending',
      orderStatus: 'New', customerNote: '', orderSource: 'Website', confirmationStatus: 'Not Confirmed', adminNote: ''
    };

    const upstream = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.ORDER_API_SECRET, order })
    });
    const upstreamText = await upstream.text();
    let upstreamBody = {};
    try { upstreamBody = JSON.parse(upstreamText); } catch (_) { /* keep generic error */ }
    if (!upstream.ok || upstreamBody.success !== true) return response(res, 502, { error: 'Unable to save the order right now' });

    return response(res, 200, { success: true, order: { orderId, totalAmount, paymentStatus: order.paymentStatus } });
  } catch (_) {
    return response(res, 400, { error: 'Unable to process the order' });
  }
};
