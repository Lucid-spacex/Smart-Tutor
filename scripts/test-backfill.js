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

// Test backfill by checking if Grade table has new columns with default values
const testSQL = `
-- Check if Grade table has new columns populated
SELECT
    COUNT(*) as total_grades,
    COUNT(CASE WHEN "periodStart" IS NOT NULL THEN 1 END) as grades_with_periodStart,
    COUNT(CASE WHEN "periodEnd" IS NOT NULL THEN 1 END) as grades_with_periodEnd,
    COUNT(CASE WHEN "computedScore" IS NOT NULL THEN 1 END) as grades_with_computedScore,
    COUNT(CASE WHEN "finalScore" IS NOT NULL THEN 1 END) as grades_with_finalScore
FROM "Grade";

-- Check if Notification table has new schema
SELECT
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN "category" IS NOT NULL THEN 1 END) as notifications_with_category,
    COUNT(CASE WHEN "entityId" IS NOT NULL THEN 1 END) as notifications_with_entityId
FROM "Notification";

-- Check if new tables exist
SELECT
    (SELECT COUNT(*) FROM "ScoredItem") as scored_items_count,
    (SELECT COUNT(*) FROM "GradeComponent") as grade_components_count,
    (SELECT COUNT(*) FROM "GradeEvent") as grade_events_count,
    (SELECT COUNT(*) FROM "EnrollmentChangeRequest") as change_requests_count;
`;

try {
  console.log('Testing migration backfill...');
  execSync(`npx prisma db execute --stdin`, {
    input: testSQL,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL }
  });
  console.log('Backfill test completed');
} catch (error) {
  console.error('Backfill test failed:', error.message);
  process.exit(1);
}
