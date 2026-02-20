const Rider = require('./rider.model');

exports.getProfile = async (req, res) => {
  return res.status(200).json({
    message: 'Rider profile fetched successfully',
    rider: req.user,
  });
};

exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: 'Latitude and longitude are required',
      });
    }

    if (Number.isNaN(Number(latitude)) || Number.isNaN(Number(longitude))) {
      return res.status(400).json({
        message: 'Latitude and longitude must be valid numbers',
      });
    }

    req.user.lastLocation = {
      type: 'Point',
      coordinates: [Number(longitude), Number(latitude)],
    };

    await req.user.save();

    return res.status(200).json({
      message: 'Rider location updated successfully',
      location: req.user.lastLocation,
    });
  } catch (error) {
    console.error('RIDER LOCATION UPDATE ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { isOnline, isAvailable } = req.body;

    if (typeof isOnline !== 'boolean' && typeof isAvailable !== 'boolean') {
      return res.status(400).json({
        message: 'Provide isOnline or isAvailable as boolean',
      });
    }

    if (typeof isOnline === 'boolean') {
      req.user.isOnline = isOnline;
    }

    if (typeof isAvailable === 'boolean') {
      req.user.isAvailable = isAvailable;
    }

    await req.user.save();

    return res.status(200).json({
      message: 'Rider availability updated successfully',
      rider: req.user,
    });
  } catch (error) {
    console.error('RIDER AVAILABILITY UPDATE ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

exports.updateSensitiveInfo = async (req, res) => {
  try {
    const { bankAccountNumber, drivingLicenseNumber, bankIfscCode } = req.body;

    if (
      typeof bankAccountNumber !== 'string' &&
      typeof drivingLicenseNumber !== 'string' &&
      typeof bankIfscCode !== 'string'
    ) {
      return res.status(400).json({
        message: 'Provide at least one sensitive field as string',
      });
    }

    req.user.setSensitiveInfo({
      bankAccountNumber,
      drivingLicenseNumber,
      bankIfscCode,
    });

    await req.user.save();

    return res.status(200).json({
      message: 'Sensitive rider information updated securely',
      sensitiveInfo: req.user.getMaskedSensitiveInfo(),
    });
  } catch (error) {
    console.error('RIDER SENSITIVE INFO UPDATE ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

exports.getSensitiveInfo = async (req, res) => {
  try {
    const rider = await Rider.findById(req.user._id).select('+sensitiveInfo');

    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    return res.status(200).json({
      message: 'Sensitive rider information fetched securely',
      sensitiveInfo: rider.getMaskedSensitiveInfo(),
    });
  } catch (error) {
    console.error('RIDER SENSITIVE INFO FETCH ERROR:', error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};
