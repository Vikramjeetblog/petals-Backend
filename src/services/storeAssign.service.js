const Store = require('../models/store/store.model');

/**
 * Find nearest store and assign to user
 */
const assignNearestStore = async (user) => {
  console.log('🏪 STORE ASSIGN FUNCTION CALLED');

  const userLocation = user.lastLocation;

  // Safety check
  if (
    !userLocation ||
    !userLocation.coordinates ||
    userLocation.coordinates.length !== 2
  ) {
    console.log('❌ INVALID USER LOCATION');
    return null;
  }

  console.log('📍 USER LOCATION FOR STORE SEARCH:', userLocation);

  // ✅ FIXED HERE (Store, not store)
  const nearestStore = await Store.findOne({
    isActive: true,
    location: {
      $near: {
        $geometry: userLocation,
        $maxDistance: 5000
      }
    }
  });

  console.log('🏪 NEAREST STORE FOUND:', nearestStore);

  if (!nearestStore) {
    return null;
  }

  // Assign store to user
  user.assignedStore = nearestStore._id;
  await user.save();

  console.log('✅ STORE ASSIGNED:', {
    userId: user._id.toString(),
    storeId: nearestStore._id.toString(),
    storeName: nearestStore.name
  });

  return nearestStore;
};

module.exports = assignNearestStore;
