const assignNearestStore = require('../../services/storeAssign.service');
console.log(' STORE ASSIGN SERVICE LOADED:', typeof assignNearestStore);
// get user
exports.getProfile = async (req, res) => {

  
  console.log(' GET PROFILE API HIT');
  console.log(' LOGGED IN USER:', {
    id: req.user._id.toString(),
    phone: req.user.phone,
    lastLocation: req.user.lastLocation
  });

  return res.status(200).json({
    message: 'User profile fetched successfully',
    user: req.user
  });
};

// update location 


exports.updateLocation = async (req, res) => {
  console.log(' UPDATE LOCATION API HIT');
  try {
    const { latitude, longitude } = req.body;

    // Validation
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: 'Latitude and longitude are required'
      });
    }

    // Update user location
    req.user.lastLocation = {
      type: 'Point',
      coordinates: [longitude, latitude] 
    };

    await req.user.save();

    console.log(' LOCATION UPDATED:', {
      userId: req.user._id.toString(),
      coordinates: req.user.lastLocation.coordinates
    });

    // Assign nearest store 
    const store = await assignNearestStore(req.user);

    //  response
    return res.status(200).json({
      message: 'Location updated & store assigned successfully',
      location: req.user.lastLocation,
      assignedStore: store
        ? {
            id: store._id,
            name: store.name
          }
        : null
    });

  } catch (error) {
    console.error(' LOCATION UPDATE ERROR:', error);
    return res.status(500).json({
      message: 'Something went wrong'
    });
  }
};


