import { config } from './env.config';

// Use extended token expiry in development for better testing experience
const isDevelopment = config.NODE_ENV === 'development';

export const jwtConfig = {
  accessSecret: config.JWT_ACCESS_SECRET,
  refreshSecret: config.JWT_REFRESH_SECRET,
  accessExpiry: isDevelopment ? config.JWT_ACCESS_EXPIRY_DEV : config.JWT_ACCESS_EXPIRY, // Env-driven (default 1d, 7d in dev). Longer lifetime compensated by session-based revocation.
  refreshExpiry: isDevelopment ? config.JWT_REFRESH_EXPIRY_DEV : config.JWT_REFRESH_EXPIRY, // Refresh tokens live longer (7d, 30d in dev) and are rotated on use
};
