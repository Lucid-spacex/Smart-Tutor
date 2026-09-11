# Migration Plan: Schema Restructuring

## Overview
This migration plan addresses two major schema changes required by the new specification:
1. **User/Student Split**: Students now have their own User accounts for login capability
2. **Session/SessionParticipant Restructuring**: Sessions now support multiple students via a join table

## Pre-Migration Assessment

### Current State
- User model only supports PARENT, TUTOR, ADMIN roles
- Student model exists but is not linked to a User account
- Session model has direct enrollmentId FK (one session per enrollment)
- No Message, Assignment, Grade, Notification, or Complaint models exist

### Target State
- User model supports STUDENT role with studentCode/parentId fields
- Student model has userId FK to User (each student has a login-capable account)
- Session model has tutorId FK and supports multiple students via SessionParticipant
- New models: Message, Assignment, Grade, Notification, Complaint
- Enrollment splits frequency into sessionFrequency/billingFrequency with yearlyPrice

## Migration Strategy

### Phase 1: Prerequisites
1. **Backup Database**: Full database backup before any changes
2. **Check for Existing Data**: Verify if there are any existing Student/Session records
3. **Generate Prisma Client**: Run `npx prisma generate` to ensure schema is valid

### Phase 2: Schema Migration Steps

#### Step 1: Add New Enums and Fields (Non-Breaking)
- Add `STUDENT` to UserRole enum
- Add new enums: SessionFrequency, BillingFrequency, AssignmentType, AssignmentStatus, GradeStatus, NotificationType, ComplaintAboutType, ComplaintStatus
- Add nullable fields to User: studentCode, parentId, timezone
- Add soft delete fields: Student.deletedAt, Enrollment.deletedAt, Payment.deletedAt

#### Step 2: Add New Models (Independent)
- Create Message model
- Create Assignment model
- Create Grade model
- Create Notification model
- Create Complaint model
- Create SessionParticipant model

#### Step 3: Modify Enrollment (Breaking Change)
- Rename `frequency` to `sessionFrequency`
- Add `billingFrequency` (default YEARLY)
- Add `yearlyPrice` (required field - need migration strategy)
- **Data Migration**: For existing enrollments, set reasonable default values for billingFrequency and yearlyPrice

#### Step 4: Restructure Session (Major Breaking Change)
- Remove enrollmentId FK from Session
- Add tutorId FK to Session
- **Data Migration**: 
  - For each existing session, find the associated enrollment
  - Get the tutorId from that enrollment
  - Create SessionParticipant record linking session to enrollment
  - Update session.tutorId
  - Remove session.enrollmentId

#### Step 5: User/Student Split (Major Breaking Change)
- Add userId FK to Student model
- **Data Migration**:
  - For each existing Student record:
    - Generate a unique studentCode (8+ alphanumeric chars)
    - Generate a strong random password
    - Hash the password
    - Create a new User record with role=STUDENT, studentCode, passwordHash, parentId
    - Update Student.userId to point to the new User
    - Email the parent the credentials (studentCode + password)

### Phase 3: Post-Migration Validation
1. **Data Integrity Checks**:
   - Verify all Student records have valid userId
   - Verify all Session records have valid tutorId
   - Verify all old sessions have corresponding SessionParticipant records
   - Verify email uniqueness still holds

2. **Application Testing**:
   - Test parent login (should still work)
   - Test tutor login (should still work)
   - Test student login with new three-factor auth
   - Test session creation with multiple participants

## Rollback Plan
If migration fails:
1. Restore from pre-migration backup
2. Revert schema changes
3. Investigate failure point
4. Fix issue and retry migration

## Migration Execution Order

### Using Prisma Migrate
```bash
# 1. Create initial migration
npx prisma migrate dev --name add_student_role_and_new_models

# 2. Apply migration
npx prisma migrate deploy

# 3. Run data migration script (custom TypeScript script)
npx ts-node prisma/migrations/data-migration.ts

# 4. Validate
npx prisma studio
```

### Custom Data Migration Script
The data migration script will handle:
1. Setting default values for enrollment billingFrequency and yearlyPrice
2. Migrating session data to new structure
3. Creating User accounts for existing students
4. Generating and emailing student credentials

## Risk Assessment

### High Risk
- **Session restructuring**: Complex data migration, could break existing session functionality
- **User/Student split**: Requires credential generation and email delivery

### Medium Risk
- **Enrollment frequency split**: Need to set reasonable defaults for yearlyPrice
- **Adding new models**: Low risk but need to ensure proper indexes

### Low Risk
- **Adding new enums**: Non-breaking
- **Adding nullable fields**: Non-breaking

## Mitigation Strategies
1. **Test in Development**: Run full migration in dev environment first
2. **Gradual Rollout**: Consider feature flags for new functionality
3. **Monitoring**: Add logging during data migration to track progress
4. **Communication**: Notify users of credential changes for students

## Timeline Estimate
- Schema migration: 30 minutes
- Data migration script development: 2-3 hours
- Testing: 2-3 hours
- Production deployment: 1 hour (including backup)
- **Total**: 6-8 hours

## Post-Migration Tasks
1. Update seed data to match new schema
2. Update all API endpoints to use new structure
3. Update tests to cover new models and relationships
4. Update documentation
5. Monitor for issues in production
