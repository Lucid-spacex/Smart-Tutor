# Items 7-13 Required Changes

## Contract Verification Status
The check-contract.ts script shows a mismatch between documented endpoints and code routes. The script expects `/api/` prefix in documentation but routes are mounted under `/api` in app.ts. This needs to be fixed before regenerating the contract.

## Item 7: Notifications Shape
- Ensure notifications have `{ total, byCategory }` structure
- Verify `isRead` field is present
- Verify `body` field is present
- Add category filters

## Item 8: Grade Compile Payload
- Add `itemIds + weights per type`
- Add `computedScore/finalScore`
- Support item types: QUIZ/ASSIGNMENT/TEST/PARTICIPATION
- Add `sourceType` and `sourceId` for each item

## Item 9: Change-Request Routes
- Verify routes under `/enrollments/:id/change-requests`
- Verify routes under `/change-requests/:id/cancel`
- Ensure no route clash with `/enrollments/:id`

## Item 10: Class Schedule Shapes
- Add statuses: SCHEDULED/NEEDS_SESSION/UNSCHEDULED/MISSED
- Add `unscheduledWithin24hCount` field

## Item 11: Google Meet Events
- Ensure server creates Google Meet events
- Verify no client-supplied link or event id is accepted

## Item 12: Missing Endpoints
- Add forgot-password endpoint
- Add reset-password endpoint
- Add PATCH /auth/me endpoint
- Add messages/unread-count endpoint
- Add admin suspend/reactivate endpoints

## Item 13: Error Bodies
- Add TUTOR_NOT_APPROVED error body
- Add APPLICATION_REJECTED error body

## Additional Requirements
- Port 3001 (verify config)
- Current example dates (update contract)
- Real field names read from controllers (verify contract matches actual code)

## Test Requirements
- Add a test for each behavior change listed above

## Status
These items require significant contract regeneration and verification work. The check-contract.ts script needs to be fixed first to properly handle the `/api` prefix mounting.
