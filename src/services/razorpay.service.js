const https = require('https');

function razorpayRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return reject(new Error('Razorpay credentials are missing'));
    }

    const payload = body ? JSON.stringify(body) : null;

    const req = https.request(
      {
        hostname: 'api.razorpay.com',
        path,
        method,
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            if (res.statusCode >= 200 && res.statusCode < 300) {
              return resolve(parsed);
            }
            return reject(new Error(parsed.error?.description || `Razorpay API failed (${res.statusCode})`));
          } catch (err) {
            return reject(err);
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

exports.createOrder = ({ amount, receipt, notes }) =>
  razorpayRequest('/v1/orders', 'POST', {
    amount,
    currency: 'INR',
    receipt,
    notes,
    payment_capture: 1,
  });
