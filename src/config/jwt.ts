import { config } from './env.config';

export const jwtConfig = {
  accessSecret: config.JWT_ACCESS_SECRET,
  refreshSecret: config.JWT_REFRESH_SECRET,
  accessExpiry: config.JWT_ACCESS_EXPIRY, // Env-driven (default 1d). Longer lifetime compensated by session-based revocation.
  refreshExpiry: config.JWT_REFRESH_EXPIRY, // Refresh tokens live longer (7d) and are rotated on use
};
