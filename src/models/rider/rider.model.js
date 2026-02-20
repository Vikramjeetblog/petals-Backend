const mongoose = require('mongoose');
const crypto = require('crypto');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const getEncryptionKey = () => {
  const keySeed = process.env.RIDER_DATA_KEY || process.env.JWT_SECRET;

  if (!keySeed) {
    throw new Error('RIDER_DATA_KEY or JWT_SECRET is required for rider data encryption');
  }

  return crypto.createHash('sha256').update(keySeed).digest();
};

const encryptValue = (plainTextValue) => {
  if (!plainTextValue) return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(String(plainTextValue), 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptValue = (cipherText) => {
  if (!cipherText) return null;

  const [ivHex, authTagHex, encryptedHex] = String(cipherText).split(':');
  if (!ivHex || !authTagHex || !encryptedHex) return null;

  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
};

const maskValue = (rawValue, visibleDigits = 4) => {
  if (!rawValue) return null;
  const value = String(rawValue);
  if (value.length <= visibleDigits) return value;

  return `${'*'.repeat(value.length - visibleDigits)}${value.slice(-visibleDigits)}`;
};

const SensitiveInfoSchema = new mongoose.Schema(
  {
    bankAccountNumber: {
      type: String,
      select: false,
      default: null,
    },
    drivingLicenseNumber: {
      type: String,
      select: false,
      default: null,
    },
    bankIfscCode: {
      type: String,
      select: false,
      default: null,
    },
  },
  { _id: false }
);

const RiderSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: 'New Rider',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    lastLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    sensitiveInfo: {
      type: SensitiveInfoSchema,
      default: () => ({}),
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        delete ret.sensitiveInfo;
        return ret;
      },
    },
  }
);

RiderSchema.index({ lastLocation: '2dsphere' });

RiderSchema.methods.setSensitiveInfo = function setSensitiveInfo(data = {}) {
  if (!this.sensitiveInfo) {
    this.sensitiveInfo = {};
  }

  const fieldMappings = {
    bankAccountNumber: 'bankAccountNumber',
    drivingLicenseNumber: 'drivingLicenseNumber',
    bankIfscCode: 'bankIfscCode',
  };

  Object.entries(fieldMappings).forEach(([inputField, storageField]) => {
    if (typeof data[inputField] === 'string' && data[inputField].trim()) {
      this.sensitiveInfo[storageField] = encryptValue(data[inputField].trim());
    }
  });
};

RiderSchema.methods.getSensitiveInfo = function getSensitiveInfo() {
  const info = this.sensitiveInfo || {};

  return {
    bankAccountNumber: decryptValue(info.bankAccountNumber),
    drivingLicenseNumber: decryptValue(info.drivingLicenseNumber),
    bankIfscCode: decryptValue(info.bankIfscCode),
  };
};

RiderSchema.methods.getMaskedSensitiveInfo = function getMaskedSensitiveInfo() {
  const info = this.getSensitiveInfo();

  return {
    bankAccountNumber: maskValue(info.bankAccountNumber),
    drivingLicenseNumber: maskValue(info.drivingLicenseNumber),
    bankIfscCode: info.bankIfscCode ? `${info.bankIfscCode.slice(0, 2)}******` : null,
  };
};

module.exports = mongoose.model('Rider', RiderSchema);
