const https = require('https');

exports.getOptimizedRoute = ({ pickup, drop }) => {
  return new Promise((resolve) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey || !pickup || !drop) {
      return resolve({ estimatedDistance: null, estimatedDuration: null, polyline: null });
    }

    const url = `/maps/api/directions/json?origin=${pickup.lat},${pickup.lng}&destination=${drop.lat},${drop.lng}&key=${apiKey}`;
    const req = https.request({ hostname: 'maps.googleapis.com', path: url, method: 'GET' }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const leg = json.routes?.[0]?.legs?.[0];
          resolve({
            estimatedDistance: leg?.distance?.value || null,
            estimatedDuration: leg?.duration?.value || null,
            polyline: json.routes?.[0]?.overview_polyline?.points || null,
          });
        } catch (_e) {
          resolve({ estimatedDistance: null, estimatedDuration: null, polyline: null });
        }
      });
    });
    req.on('error', () => resolve({ estimatedDistance: null, estimatedDuration: null, polyline: null }));
    req.end();
  });
};
