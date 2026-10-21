const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load .env.test
const envPath = path.join(__dirname, '..', '.env.test');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse and set environment variables
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').replace(/^"|"$/g, '');
    process.env[key] = value;
  }
});

// Validate required variables
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env.test');
  process.exit(1);
}
if (!process.env.DIRECT_URL) {
  console.error('DIRECT_URL is not set in .env.test');
  process.exit(1);
}

console.log('Using DATABASE_URL from .env.test (hostname will be logged by Prisma)');

// Run migration
try {
  execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', {
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}
