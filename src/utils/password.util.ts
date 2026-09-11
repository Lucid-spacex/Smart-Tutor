import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // Increased from 10 to 12 per OWASP recommendations

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
