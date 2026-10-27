# Admin Service Changes - Pricing Visibility

## Summary
No changes were made to `src/modules/admin/admin.service.ts` for pricing visibility. The admin service already correctly handles yearlyPrice fields:

1. **`getPricingTiers()` (line 2038)**: Returns pricing tiers with yearlyPriceNGN and yearlyPriceUSD - this is correct as admins need to see pricing for management.

2. **`updatePricingTier()` (line 2084)**: Updates pricing tiers with yearlyPriceNGN and yearlyPriceUSD - this is correct as admins need to manage pricing.

3. **`updateEnrollmentPricingOverride()` (line 2112)**: Updates enrollment pricing overrides with yearlyPriceNGN and yearlyPriceUSD - this is correct as admins need to set custom pricing.

4. **`getEnrollmentPricingOverride()` (line 2175)**: Returns enrollment pricing with yearlyPriceNGN and yearlyPriceUSD - this is correct as admins need to view pricing.

## Changes Made to Other Files

### src/modules/enrollments/enrollments.service.ts
- **`getEnrollmentsByParent()` (line 193)**: Added comment to clarify that yearlyPriceNGN and yearlyPriceUSD are excluded from parent list view
- **`getEnrollmentsByTutor()` (line 243)**: Already excluded yearlyPrice fields (no change needed)
- **`getEnrollmentById()` (line 291)**: Already implements role-based pricing visibility (no change needed)

### src/modules/students/students.service.ts
- **`createStudent()` (line 176)**: Removed studentCode from response - PIN goes to parent by email

### src/modules/admin/admin.service.ts
- **`regenerateStudentPin()` (line 1731)**: Added comment clarifying that studentCode and PIN are never returned in response

## Conclusion
Admin pricing screens were not changed because they already correctly expose yearlyPrice fields to admins, which is the intended behavior. The changes were made to tutor and student endpoints to ensure they never receive yearlyPrice fields.
