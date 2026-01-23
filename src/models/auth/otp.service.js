/**
 * TEMP OTP SERVICE
 
 */

exports.saveOtp = async (phone, otp, role) => {
  // ❌ No DB save needed for now
  console.log(` TEMP OTP saved for ${role} ${phone}: ${otp}`);
  return true;
};

exports.verifyOtp = async (phone, otp, role) => {
  console.log(` Verifying OTP for ${role} ${phone}`);

  //  TEMP OTP LOGIC
  if (otp === '1234') {
    return true;
  }

  return false;
};
