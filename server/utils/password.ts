import bcrypt from 'bcryptjs';

const DEFAULT_ROUNDS = (() => {
  const raw = Number(process.env['BCRYPT_ROUNDS']);
  if (Number.isFinite(raw) && raw >= 10) {
    return raw;
  }
  return 12;
})();

export const isBcryptHash = (value: string) => {
  return typeof value === 'string' && /^\$2[aby]\$/.test(value);
};

export const hashPassword = async (plain: string) => {
  return bcrypt.hash(plain, DEFAULT_ROUNDS);
};

export const ensureHashedPassword = async (password: string) => {
  if (!password) {
    return password;
  }
  return isBcryptHash(password) ? password : hashPassword(password);
};

export const verifyPassword = async (plain: string, stored: string) => {
  if (!stored) {
    return { valid: false, needsUpgrade: false as const };
  }
  if (isBcryptHash(stored)) {
    const valid = await bcrypt.compare(plain, stored);
    return { valid, needsUpgrade: false as const };
  }
  const valid = stored === plain;
  if (!valid) {
    return { valid: false, needsUpgrade: false as const };
  }
  const hashed = await hashPassword(plain);
  return { valid: true, needsUpgrade: true as const, hashed };
};
