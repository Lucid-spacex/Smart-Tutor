import { config } from './env.config';

export const jwtConfig = {
  accessSecret: config.JWT_ACCESS_SECRET,
  refreshSecret: config.JWT_REFRESH_SECRET,
  accessExpiry: config.JWT_ACCESS_EXPIRY, // Critical: Short-lived access tokens (15 min) to limit exposure window
  refreshExpiry: config.JWT_REFRESH_EXPIRY, // Refresh tokens live longer and are rotated on use
};
