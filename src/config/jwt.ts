export const jwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET || 'fallback-access-secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};
