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

// Create GradeStatus enum with DRAFT if it doesn't exist
const createEnumSQL = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GradeStatus') THEN
    CREATE TYPE "GradeStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
  ELSE
    -- Add DRAFT if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DRAFT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'GradeStatus')) THEN
      ALTER TYPE "GradeStatus" ADD VALUE 'DRAFT' BEFORE 'PENDING_APPROVAL';
    END IF;
  END IF;
END $$;
`;

try {
  console.log('Creating/Updating GradeStatus enum...');
  execSync(`npx prisma db execute --stdin`, {
    input: createEnumSQL,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL }
  });
  console.log('GradeStatus enum created or updated');
} catch (error) {
  console.error('Failed to create/update enum:', error.message);
  process.exit(1);
}
