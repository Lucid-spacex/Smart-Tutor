# Subject Duplicate Name Fix

**Date:** 2026-10-16
**Issue:** Prisma unique constraint error when creating subjects with duplicate names

---

## Problem

When attempting to create a subject with a name that already exists in the database, the system was throwing a generic Prisma error:

```
PrismaClientKnownRequestError:
Invalid `prisma.subject.create()` invocation:
Unique constraint failed on the fields: (`name`)
```

This error was not user-friendly and didn't provide clear guidance on how to resolve the issue.

---

## Root Cause

The `createSubject` and `updateSubject` methods in `SubjectsService` did not check for duplicate subject names before attempting to create/update the record. This caused Prisma to throw a generic unique constraint violation error when a duplicate name was used.

---

## Solution Implemented

### 1. Pre-creation Duplicate Check

**File:** `src/modules/subjects/subjects.service.ts`

Added a case-insensitive check before creating a subject:

```typescript
// Check if subject with same name already exists (case-insensitive)
const existingSubject = await prisma.subject.findFirst({
  where: {
    name: {
      equals: data.name,
      mode: 'insensitive',
    },
  },
});

if (existingSubject) {
  throw new Error(`Subject with name "${data.name}" already exists. Please use a different name or update the existing subject.`);
}
```

### 2. Pre-update Duplicate Check

Added a similar check when updating a subject name, excluding the current subject being updated:

```typescript
// If updating name, check for duplicates (excluding current subject)
if (data.name) {
  const existingSubject = await prisma.subject.findFirst({
    where: {
      name: {
        equals: data.name,
        mode: 'insensitive',
      },
      id: {
        not: subjectId, // Exclude current subject
      },
    },
  });

  if (existingSubject) {
    throw new Error(`Subject with name "${data.name}" already exists. Please use a different name.`);
  }
}
```

### 3. Enhanced Error Handling in Controller

**File:** `src/modules/admin/admin-subjects.controller.ts`

Added specific error handling for Prisma unique constraint errors (P2002):

```typescript
catch (error: any) {
  // Handle Prisma unique constraint error
  if (error.code === 'P2002') {
    res.status(409).json({
      error: 'DUPLICATE_SUBJECT',
      message: 'A subject with this name already exists. Please use a different name or update the existing subject.',
    });
    return;
  }

  next(error);
}
```

This ensures that even if the pre-check is bypassed, the user still gets a clear error message.

### 4. Input Validation Improvement

**File:** `src/modules/admin/admin.validation.ts`

Added `.trim()` to subject name validation to prevent whitespace-only duplicates:

```typescript
name: z.string().min(1, 'Subject name is required').trim(),
```

---

## Benefits

1. **Clear Error Messages:** Users now receive specific, actionable error messages instead of generic Prisma errors
2. **Case-Insensitive Checking:** Prevents duplicates like "Mathematics" and "mathematics"
3. **Early Validation:** Errors are caught before database operations, improving performance
4. **HTTP Status Code:** Returns 409 Conflict for duplicate names, which is semantically correct
5. **Better UX:** Frontend can display user-friendly messages to guide users

---

## Error Response Format

### Before (Generic Error)
```json
{
  "error": "Unique constraint failed on the fields: (`name`)"
}
```

### After (Clear, Actionable Error)
```json
{
  "error": "DUPLICATE_SUBJECT",
  "message": "A subject with this name already exists. Please use a different name or update the existing subject."
}
```

---

## Testing

### Test Cases

1. **Create Duplicate Subject:**
   - Create subject "Mathematics"
   - Attempt to create another subject "Mathematics"
   - Expected: 409 Conflict with clear error message

2. **Create Case-Insensitive Duplicate:**
   - Create subject "Mathematics"
   - Attempt to create subject "mathematics"
   - Expected: 409 Conflict with clear error message

3. **Update to Duplicate Name:**
   - Create subject "Mathematics"
   - Create subject "Physics"
   - Attempt to update "Physics" to "Mathematics"
   - Expected: 409 Conflict with clear error message

4. **Update Same Subject Name:**
   - Create subject "Mathematics"
   - Update "Mathematics" to "Mathematics" (no change)
   - Expected: Success (no error)

5. **Create with Whitespace:**
   - Attempt to create subject "  Mathematics  "
   - Expected: Trimmed to "Mathematics" before validation

---

## Files Modified

1. **src/modules/subjects/subjects.service.ts**
   - Added duplicate check in `createSubject()` method
   - Added duplicate check in `updateSubject()` method

2. **src/modules/admin/admin-subjects.controller.ts**
   - Added error handling for P2002 in `createSubject()` controller
   - Added error handling for P2002 in `updateSubject()` controller

3. **src/modules/admin/admin.validation.ts**
   - Added `.trim()` to subject name validation in `createSubjectSchema`
   - Added `.trim()` to subject name validation in `updateSubjectSchema`

---

## Deployment Notes

- No database migrations required
- No breaking changes to API
- Backward compatible with existing code
- Can be deployed immediately

---

## Related Issues

This fix addresses the immediate duplicate name issue. For future improvements, consider:

1. **Slug-based Names:** Use slugs (URL-friendly names) instead of display names for uniqueness
2. **Name Suggestions:** When a duplicate is detected, suggest similar available names
3. **Merge Functionality:** Allow merging duplicate subjects instead of just rejecting them
4. **Soft Delete:** When a subject is soft-deleted, allow reusing the name after a grace period

---

## Frontend Integration

The frontend should handle the new error response format:

```typescript
try {
  await createSubject(data);
} catch (error) {
  if (error.error === 'DUPLICATE_SUBJECT') {
    toast.error(error.message);
    // Show suggestion: "Try using a different name or update the existing subject"
  }
}
```
