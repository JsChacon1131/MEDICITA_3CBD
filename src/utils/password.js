const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { ApiError } = require('./errors');

const scrypt = promisify(scryptCallback);
const SALT_BYTES = 16;
const HASH_BYTES = 64;
const SCRYPT_OPTIONS = Object.freeze({ N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });
const HASH_PREFIX = 'scrypt';

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 10 || Buffer.byteLength(password) > 1024) {
    throw new ApiError(400, 'La contraseña debe tener entre 10 y 1024 bytes');
  }
  return password;
}

async function hashPassword(password, { allowLegacy = false } = {}) {
  if (allowLegacy) {
    if (typeof password !== 'string' || !password.length || Buffer.byteLength(password) > 1024) {
      throw new Error('Las contraseñas heredadas deben contener entre 1 y 1024 bytes');
    }
  } else {
    validatePassword(password);
  }
  const salt = randomBytes(SALT_BYTES);
  const derivedKey = await scrypt(password, salt, HASH_BYTES, SCRYPT_OPTIONS);
  return `${HASH_PREFIX}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== HASH_PREFIX ||
      !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
  const expected = Buffer.from(parts[2], 'hex');
  const actual = await scrypt(password, Buffer.from(parts[1], 'hex'), HASH_BYTES, SCRYPT_OPTIONS);
  return timingSafeEqual(actual, expected);
}

function isPasswordHash(value) {
  return typeof value === 'string' && /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(value);
}

module.exports = { hashPassword, verifyPassword, validatePassword, isPasswordHash };
