# Backend Fixes Required - Urgent

**Date:** 2026-10-16
**Priority Levels:** Critical > High > Medium > Low
**Frontend Work Document:** `FRONTEND_WORK_REQUIRED.md`

---

## Summary

This document outlines critical backend issues that need to be addressed to improve platform stability and functionality. Please implement these fixes in order of priority. Once completed, refer to `FRONTEND_WORK_REQUIRED.md` for the corresponding frontend implementation work.

---

## 1. Add Admin Sessions List API Endpoint

**Priority:** High
**Status:** ✅ **ALREADY IMPLEMENTED**
**Current Issue:** Admin has no way to view all sessions across the platform. Admin needs to see all sessions with tutor and student information for oversight and management.

### Implementation Status

✅ The endpoint is **already implemented** in the codebase:
- **Route:** `GET /api/admin/sessions` (defined in `src/modules/admin/admin.routes.ts` line 77)
- **Controller:** `AdminController.getSessions()` (defined in `src/modules/admin/admin.controller.ts` line 604)
- **Service:** `AdminService.getSessions()` (defined in `src/modules/admin/admin.service.ts` line 482)
- **Validation:** `getSessionsQuerySchema` (defined in `src/modules/admin/admin.validation.ts` line 117)

### Required Endpoint

```
GET /api/admin/sessions
```

### Query Parameters (all optional)

- `status` - Filter by session status (SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, MISSED)
- `tutorId` - Filter by specific tutor (UUID)
- `studentId` - Filter by specific student (UUID)
- `enrollmentId` - Filter by specific enrollment (UUID)
- `from` - Start date filter (ISO timestamp)
- `to` - End date filter (ISO timestamp)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)

### Response Format

```json
{
  "data": [
    {
      "id": "session-uuid",
      "enrollmentId": "enrollment-uuid",
      "scheduledAt": "2026-10-16T10:00:00Z",
      "durationMinutes": 60,
      "zoomLink": "https://zoom.us/j/...",
      "zoomMeetingId": "meeting-id",
      "status": "SCHEDULED",
      "recordingStatus": "NOT_AVAILABLE",
      "recordingLink": null,
      "tutorNotes": null,
      "homeworkAssigned": null,
      "createdBy": "TUTOR" | "ADMIN",
      "createdAt": "2026-10-16T08:00:00Z",
      "enrollment": {
        "id": "enrollment-uuid",
        "student": {
          "id": "student-uuid",
          "fullName": "Student Name"
        },
        "subject": {
          "id": "subject-uuid",
          "name": "Mathematics"
        }
      },
      "tutor": {
        "id": "tutor-uuid",
        "fullName": "Tutor Name",
        "email": "tutor@example.com"
      }
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

### Requirements (Already Met)

- ✅ **Authorization:** ADMIN role required (implemented via middleware)
- ✅ **Security:** Admin cannot see student codes or parent contact info (only fullName is exposed)
- ✅ **Performance:** Efficient database queries with proper joins and indexing
- ✅ **Filtering:** Support all query parameters with AND logic

### Frontend Action Required

The frontend team should:
1. Add the navigation link back to the admin sidebar (was removed temporarily)
2. Ensure the API function uses the correct endpoint `/api/admin/sessions`
3. Test the endpoint with various filters

See `FRONTEND_WORK_REQUIRED.md` for detailed frontend implementation steps.

---

## 2. Fix Rate Limiting - Too Many 429 Errors

**Priority:** Critical
**Current Issue:** Frontend is experiencing excessive 429 "Too Many Requests" errors, even with caching implemented. This is blocking normal usage and testing.

### Error Example

```
Status: 429 Too Many Requests
Error: Too many attempts. Please try again later.
```

### Requested Changes

#### Option A: Increase Rate Limits (Recommended)

- **Tier 1 (Auth endpoints):** Increase from 7/15min to 20/15min
- **Tier 2 (Write operations):** Increase from 60/min to 120/min
- **Tier 3 (Read operations):** Increase from 300/15min to 1000/15min

#### Option B: Remove Rate Limiting Temporarily

- Disable rate limiting during development/testing phase
- Re-enable before production deployment with adjusted limits

#### Option C: Role-Based Rate Limiting

- Apply stricter limits to unauthenticated requests
- Apply relaxed limits to authenticated users
- Apply very high limits to ADMIN role

### Additional Requirements

**Add Rate Limit Headers to All Responses:**

- `RateLimit-Limit` - Max requests allowed
- `RateLimit-Remaining` - Requests remaining
- `RateLimit-Reset` - Seconds until reset

**Example Response Headers:**

```
RateLimit-Limit: 1000
RateLimit-Remaining: 995
RateLimit-Reset: 300
```

---

## 3. Fix Paystack Payment Channel Error

**Priority:** Critical
**Status:** ✅ **ERROR HANDLING IMPROVED**
**Current Issue:** Payment initiation is failing with Paystack error "No active channel to process transaction. Please contact merchant"

### Error Logs

```
Error: No active channel to process transaction. Please contact merchant
Reference: pay_1792147878155_4oue3w2xt
Email: oshosamuel3003@gmail.com
Amount: 1
Currency: NGN

Stack Trace:
Error: Paystack API error: No active channel to process transaction. Please contact merchant
  at PaystackProvider.initiatePayment (/opt/render/project/src/dist/modules/payments/providers/paystack.provider.js:93:23)
  at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
  at async PaymentsService.initiatePayment (/opt/render/project/src/dist/modules/payments/payments.service.js:89:35)
  at async PaymentsController.initiatePayment (/opt/render/project/src/dist/modules/payments/payments.controller.js:15:32)
```

### Root Cause

This is a Paystack merchant account configuration issue. The Paystack account has no active payment channel configured.

### Backend Code Improvements ✅

**File:** `src/modules/payments/providers/paystack.provider.ts`

Enhanced error handling has been implemented to provide specific error messages:

- **Channel Error:** "No active payment channel configured. Please check your Paystack dashboard at https://dashboard.paystack.co under Settings → Payment Channels to ensure at least one payment channel is active."
- **Authentication Error:** "Invalid or expired secret key. Please verify PAYSTACK_SECRET_KEY in your environment variables."
- **Validation Error:** "Paystack validation error. Please check the payment parameters (email, amount, currency)."

This makes it easier to diagnose configuration issues from error logs.

### Required Actions (Paystack Dashboard Configuration)

#### 1. Check Paystack Dashboard

- Log into Paystack dashboard at https://dashboard.paystack.co
- Navigate to Settings → Payment Channels
- Verify at least one payment channel is active:
  - Card payments
  - Bank transfers
  - USSD
  - QR code
  - Etc.

#### 2. Verify API Keys

- Ensure the `PAYSTACK_SECRET_KEY` environment variable is correct
- Check if it's a test mode key or live mode key
- Test mode should use test keys, live mode should use live keys
- Update `.env` file with actual keys (currently set to placeholder values)

#### 3. Test Payment

- Try a test payment from Paystack dashboard to verify the account is working
- Check if there are any account verification issues or holds

### Documentation Created

A comprehensive configuration guide has been created: `PAYSTACK_CONFIGURATION_GUIDE.md`

This guide includes:
- Step-by-step Paystack dashboard configuration
- API key setup instructions
- Testing procedures
- Common issues and solutions
- Security best practices

### Temporary Workaround

If Paystack cannot be fixed immediately, consider:
- Switching to a different payment provider temporarily
- Using test mode with test cards during development

---

## 4. Fix Refresh Token Errors

**Priority:** High
**Current Issue:** Users are experiencing frequent 401 errors with refresh tokens:
- "Invalid or expired refresh token"
- "Refresh token revoked due to suspicious activity"
- "Invalid refresh token"

### Error Logs

```
Error: Invalid or expired refresh token
Status: 401
Path: /api/auth/refresh
Method: POST

Error: Refresh token revoked due to suspicious activity. Please login again.
Status: 401
Path: /api/auth/refresh
Method: POST
```

### Potential Causes

#### Token Rotation Issues

- Refresh tokens are being revoked when they shouldn't be
- Token rotation logic may be incorrectly detecting "replay attacks"
- Multiple concurrent requests may be triggering false positives

#### Token Storage Issues

- Cookies may not be persisting correctly
- Cookie settings (SameSite, Secure, HttpOnly) may be misconfigured
- Browser or network may be stripping cookies

#### Session Expiry Issues

- Refresh token expiry (7 days) may be too short for testing
- Access token expiry (1 day) may be causing too many refresh attempts

### Required Actions

#### 1. Review Token Rotation Logic

- Check if the "suspicious activity" detection is too aggressive
- Ensure token family tracking is working correctly
- Add debug logging to track why tokens are being revoked

#### 2. Improve Error Messages

Distinguish between:
- Token truly expired (show user-friendly message)
- Token revoked due to reuse (suspicious activity - security feature)
- Token invalid/malformed (cookie issue)

Return specific error codes to frontend:
```json
{
  "error": "TOKEN_EXPIRED",
  "message": "Your session has expired. Please login again."
}

{
  "error": "TOKEN_REVOKED",
  "message": "Your session was revoked due to suspicious activity. Please login again."
}

{
  "error": "TOKEN_INVALID",
  "message": "Invalid authentication token. Please login again."
}
```

#### 3. Cookie Configuration

Verify cookie settings:

```javascript
// Access token: 1 day
document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Strict; Secure`

// Refresh token: 7 days
document.cookie = `refreshToken=${token}; path=/; max-age=604800; SameSite=Strict; Secure`
```

**Important:**
- Ensure `Secure` flag is only set in production (HTTPS)
- Consider `SameSite=Lax` if `Strict` is too restrictive
- Verify cookies are being set with `HttpOnly` flag on the backend

#### 4. Add Token Refresh Retry Logic

- If refresh fails once, try once more before signing user out
- Only sign out after confirmed invalid/revoked token
- Implement exponential backoff for retry attempts

#### 5. Increase Token Expiry for Development

Consider environment-based token expiry:

```javascript
// Development
ACCESS_TOKEN_EXPIRY = '7d'
REFRESH_TOKEN_EXPIRY = '30d'

// Production
ACCESS_TOKEN_EXPIRY = '1d'
REFRESH_TOKEN_EXPIRY = '7d'
```

---

## Summary of Priority

1. **Paystack Payment Channel** - ⚠️ CRITICAL (blocking payments) - **Error handling improved, requires Paystack dashboard configuration**
2. **Rate Limiting** - ⚠️ CRITICAL (blocking normal usage) - **No action taken yet**
3. **Refresh Token Errors** - ⚠️ HIGH (users getting signed out) - **No action taken yet**
4. **Admin Sessions API** - ✅ HIGH (admin oversight feature) - **ALREADY IMPLEMENTED, ready for frontend integration**

### Implementation Status

- ✅ **Admin Sessions API:** Already implemented in backend, ready for frontend to use
- ✅ **Paystack Error Handling:** Enhanced error messages added, configuration guide created
- ⏳ **Rate Limiting:** Not yet addressed
- ⏳ **Refresh Token Errors:** Not yet addressed

---

## Additional Notes

- Please address these issues in order of priority
- Test each fix thoroughly before deployment
- Add appropriate logging for debugging
- Update API documentation for new endpoints
- Consider adding integration tests for these critical flows
- After implementing these fixes, refer to `FRONTEND_WORK_REQUIRED.md` for the corresponding frontend work

## Frontend Implementation

After completing these backend fixes, the frontend team will implement the corresponding changes. See `FRONTEND_WORK_REQUIRED.md` for:
- Admin sessions page implementation
- Rate limit handling improvements
- Payment error handling updates
- Refresh token retry logic
- Testing checklists

## Contact

If you need any clarification on the requirements, please reach out to the frontend team or consult `FRONTEND_WORK_REQUIRED.md`.

