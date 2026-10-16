# Frontend Work Required - Backend Fixes Response

**Date:** 2026-10-16
**Related Backend Doc:** `BACKEND_FIXES_REQUEST.md`

---

## Overview

This document outlines the frontend work required after the backend team implements the fixes described in `BACKEND_FIXES_REQUEST.md`. It also includes frontend-side improvements that should be implemented regardless of backend changes.

---

## 1. Admin Sessions Page - Implementation After Backend Fix

**Status:** Waiting for backend endpoint

### Backend Change Required
- **New Endpoint:** `GET /api/admin/sessions`
- **Authorization:** ADMIN role required
- **Response:** Includes enrollment, tutor, and student details

### Frontend Implementation Steps

#### Step 1: Add API Function (when backend is ready)

**File:** `src/lib/api.ts`

Add the following function:

```typescript
/**
 * Get all sessions for admin oversight
 * @param params - Optional filters and pagination
 */
export async function getAdminSessions(params?: {
  status?: SessionStatus;
  tutorId?: string;
  studentId?: string;
  enrollmentId?: string;
  from?: string; // ISO timestamp
  to?: string; // ISO timestamp
  page?: number;
  limit?: number;
}): Promise<AdminSessionsResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.status) queryParams.append('status', params.status);
  if (params?.tutorId) queryParams.append('tutorId', params.tutorId);
  if (params?.studentId) queryParams.append('studentId', params.studentId);
  if (params?.enrollmentId) queryParams.append('enrollmentId', params.enrollmentId);
  if (params?.from) queryParams.append('from', params.from);
  if (params?.to) queryParams.append('to', params.to);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const response = await fetch(
    `/api/admin/sessions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
    {
      headers: getAuthHeaders(),
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch admin sessions');
  }
  
  return response.json();
}
```

#### Step 2: Update TypeScript Types

**File:** `src/types/index.ts`

Add or update the following types:

```typescript
export interface AdminSession {
  id: string;
  enrollmentId: string;
  scheduledAt: string;
  durationMinutes: number;
  zoomLink: string | null;
  zoomMeetingId: string | null;
  status: SessionStatus;
  recordingStatus: string;
  recordingLink: string | null;
  tutorNotes: string | null;
  homeworkAssigned: string | null;
  createdBy: 'TUTOR' | 'ADMIN';
  createdAt: string;
  enrollment: {
    id: string;
    student: {
      id: string;
      fullName: string;
    };
    subject: {
      id: string;
      name: string;
    };
  };
  tutor: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface AdminSessionsResponse {
  data: AdminSession[];
  total: number;
  page: number;
  limit: number;
}
```

#### Step 3: Re-enable Navigation Link

**File:** `components/shared/Sidebar.tsx`

Uncomment or add the sessions link around line 132:

```typescript
{ label: 'Sessions', href: '/admin/sessions', icon: Calendar },
```

#### Step 4: Update Page Component (if needed)

**File:** `app/admin/sessions/page.tsx`

The page component already exists but needs to use the new API function. Update it to use `getAdminSessions()` instead of the placeholder API.

---

## 2. Rate Limiting - Frontend Improvements

**Status:** Frontend can implement improvements now (independent of backend)

### Backend Change Required
- Increased rate limits or role-based rate limiting
- Rate limit headers in responses

### Frontend Implementation Steps

#### Step 1: Add Rate Limit Handler

**File:** `src/lib/api.ts` or create `src/lib/rate-limit-handler.ts`

```typescript
/**
 * Handle rate limit errors with retry logic
 */
export async function handleRateLimitError(
  response: Response,
  retryCount: number = 0
): Promise<Response> {
  const limit = response.headers.get('RateLimit-Limit');
  const remaining = response.headers.get('RateLimit-Remaining');
  const reset = response.headers.get('RateLimit-Reset');
  
  if (response.status === 429) {
    const resetSeconds = reset ? parseInt(reset) : 60;
    
    // Log rate limit info
    console.warn(`Rate limited. Limit: ${limit}, Remaining: ${remaining}, Reset in: ${resetSeconds}s`);
    
    // Show user-friendly message
    if (typeof window !== 'undefined') {
      // You can use your toast/notification system here
      // Example: toast.error(`Rate limited. Please wait ${resetSeconds} seconds.`);
    }
    
    // For critical operations, implement exponential backoff retry
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the request with incremented retry count
      // You'll need to implement retry logic at the call site
    }
  }
  
  return response;
}
```

#### Step 2: Update API Fetch Wrapper

**File:** `src/lib/api.ts`

Update your fetch wrapper to use the rate limit handler:

```typescript
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });
  
  // Handle rate limiting
  await handleRateLimitError(response, retryCount);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}
```

#### Step 3: Add Rate Limit Display (Optional)

Consider adding a rate limit indicator to your UI, especially for admin users. This could be:
- A small badge showing remaining requests
- A progress bar for the current rate limit window
- A warning when approaching the limit

---

## 3. Paystack Payment Error Handling

**Status:** Frontend can implement improved error handling now

### Backend Change Required
- Fix Paystack merchant account configuration
- Return specific error codes for different failure scenarios

### Frontend Implementation Steps

#### Step 1: Update Payment Error Handling

**File:** `src/lib/api.ts` or payment service file

```typescript
export interface PaymentError {
  error: string;
  message: string;
  reference?: string;
}

export async function initiatePayment(params: PaymentParams): Promise<PaymentResponse> {
  try {
    const response = await fetch('/api/payments/initiate', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific Paystack errors
      if (data.error === 'PAYSTACK_CHANNEL_ERROR') {
        throw new Error(
          'Payment system is currently unavailable. Please contact support or try again later.'
        );
      }
      
      throw new Error(data.message || 'Payment initiation failed');
    }
    
    return data;
  } catch (error) {
    console.error('Payment initiation error:', error);
    throw error;
  }
}
```

#### Step 2: Update Payment Component

**File:** Payment initiation component

Add better error messaging:

```typescript
const handlePaymentError = (error: Error) => {
  if (error.message.includes('channel')) {
    // Merchant account issue
    toast.error('Payment system is currently unavailable. Please contact support.');
  } else if (error.message.includes('network')) {
    // Network issue
    toast.error('Network error. Please check your connection and try again.');
  } else {
    // Generic error
    toast.error('Payment failed. Please try again.');
  }
};
```

---

## 4. Refresh Token Error Handling

**Status:** Frontend should implement improvements now

### Backend Change Required
- Improved error messages with specific error codes
- More lenient token rotation logic
- Environment-based token expiry

### Frontend Implementation Steps

#### Step 1: Implement Token Refresh with Retry Logic

**File:** `src/lib/auth.ts` or similar

```typescript
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Add a callback to be executed when token refresh completes
 */
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

/**
 * Notify all subscribers that token refresh completed
 */
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

/**
 * Refresh access token with retry logic
 */
export async function refreshAccessToken(retryCount: number = 0): Promise<string> {
  if (isRefreshing) {
    // Wait for the current refresh to complete
    return new Promise((resolve) => {
      subscribeTokenRefresh(resolve);
    });
  }
  
  isRefreshing = true;
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Include cookies
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific error codes
      if (data.error === 'TOKEN_EXPIRED') {
        // Token expired - user needs to login again
        if (retryCount < 1) {
          // Retry once before giving up
          await new Promise(resolve => setTimeout(resolve, 1000));
          return refreshAccessToken(retryCount + 1);
        }
        throw new Error('SESSION_EXPIRED');
      }
      
      if (data.error === 'TOKEN_REVOKED') {
        // Token revoked due to suspicious activity
        throw new Error('SESSION_REVOKED');
      }
      
      if (data.error === 'TOKEN_INVALID') {
        // Invalid token - cookie issue
        throw new Error('SESSION_INVALID');
      }
      
      throw new Error('TOKEN_REFRESH_FAILED');
    }
    
    // Update stored token
    const newToken = data.accessToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', newToken);
    }
    
    onTokenRefreshed(newToken);
    return newToken;
    
  } catch (error) {
    // Refresh failed - clear tokens and redirect to login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw error;
  } finally {
    isRefreshing = false;
  }
}
```

#### Step 2: Update API Fetch Wrapper to Handle Token Refresh

**File:** `src/lib/api.ts`

```typescript
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getAccessToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  
  // If unauthorized, try to refresh token
  if (response.status === 401) {
    try {
      token = await refreshAccessToken();
      
      // Retry the request with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });
      
      if (!retryResponse.ok) {
        throw new Error(`API request failed: ${retryResponse.statusText}`);
      }
      
      return retryResponse.json();
    } catch (error) {
      // Token refresh failed - already handled in refreshAccessToken
      throw error;
    }
  }
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}
```

#### Step 3: Add User-Friendly Error Messages

**File:** Auth context or error handler

```typescript
export function getAuthErrorMessage(error: Error): string {
  if (error.message === 'SESSION_EXPIRED') {
    return 'Your session has expired. Please login again.';
  }
  
  if (error.message === 'SESSION_REVOKED') {
    return 'Your session was revoked for security reasons. Please login again.';
  }
  
  if (error.message === 'SESSION_INVALID') {
    return 'Invalid session. Please login again.';
  }
  
  return 'An authentication error occurred. Please login again.';
}
```

#### Step 4: Cookie Configuration Verification

**File:** Check cookie settings in your auth setup

Ensure cookies are being set correctly:

```typescript
// In your login/register API calls, verify the backend is setting cookies
// with the following attributes:
// - HttpOnly: true (prevents JavaScript access)
// - Secure: true (only in production with HTTPS)
// - SameSite: Lax or Strict
// - Path: /
// - Proper max-age or expires
```

---

## 5. Parent Pricing Page - Frontend Fix Applied

**Status:** ✅ Already fixed

### Changes Made
- Fixed API response handling from `subject.prices` to `subject.subjectPrices`
- Added `parseFloat()` to convert string prices to numbers
- Updated TypeScript types to match API response

### Verification
Test the pricing page at `/parent/pricing` to ensure:
- All subjects with configured pricing display correctly
- Prices are formatted in both NGN and USD
- Grade bands are color-coded properly
- Empty states display correctly for subjects without pricing

---

## Implementation Priority

### High Priority (Can Start Now)
1. **Refresh Token Error Handling** - Implement retry logic and better error messages
2. **Paystack Error Handling** - Improve error messages for payment failures
3. **Rate Limit Handler** - Add rate limit detection and user feedback

### Medium Priority (After Backend Fix)
1. **Admin Sessions Page** - Implement after backend adds the endpoint
2. **Rate Limit Headers** - Utilize rate limit headers when backend adds them

### Low Priority (Optional)
1. **Rate Limit UI Indicator** - Add visual feedback for rate limiting
2. **Advanced Token Refresh** - Add more sophisticated retry strategies

---

## Testing Checklist

### Refresh Token Handling
- [ ] Test token refresh on 401 response
- [ ] Verify retry logic works (should retry once)
- [ ] Test concurrent requests (should not trigger multiple refreshes)
- [ ] Verify proper logout on refresh failure
- [ ] Test user-friendly error messages

### Payment Error Handling
- [ ] Test payment initiation with Paystack errors
- [ ] Verify user-friendly error messages
- [ ] Test network error handling
- [ ] Verify error logging

### Rate Limiting
- [ ] Test 429 error detection
- [ ] Verify rate limit headers are read correctly
- [ ] Test user notification on rate limit
- [ ] Verify retry logic for critical operations

### Admin Sessions (After Backend Fix)
- [ ] Test sessions list loads correctly
- [ ] Verify filters work (status, tutor, student, date range)
- [ ] Test pagination
- [ ] Verify tutor and student information displays
- [ ] Test search functionality

---

## Backend API Endpoints to Monitor

Watch for these endpoints to be added/updated by the backend team:

1. **GET /api/admin/sessions** - Admin sessions list (NEW)
2. **POST /api/auth/refresh** - May return new error codes
3. **POST /api/payments/initiate** - May return new error codes
4. **All endpoints** - Should include rate limit headers

---

## Additional Resources

- Backend Fixes Request: `BACKEND_FIXES_REQUEST.md`
- API Documentation: (update with your API docs location)
- Type Definitions: `src/types/index.ts`
- API Client: `src/lib/api.ts`

---

## Contact

If you need clarification on any of these frontend requirements, reach out to the backend team or consult the backend fixes document.
