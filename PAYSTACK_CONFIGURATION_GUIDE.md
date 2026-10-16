# Paystack Payment Configuration Guide

**Date:** 2026-10-16
**Issue:** Payment initiation failing with "No active channel to process transaction"

---

## Problem Summary

Payment initiation is failing with the following error:

```
Error: No active channel to process transaction. Please contact merchant
Reference: pay_1792151989332_enscu8kt8
Email: oshosamuel3003@gmail.com
Amount: 1 NGN
```

This error indicates that the Paystack merchant account has no active payment channels configured.

---

## Root Cause

The Paystack merchant account is not properly configured to accept payments. This could be due to:

1. **No payment channels enabled** in the Paystack dashboard
2. **Account not verified** or still in test mode without proper setup
3. **Wrong API keys** (using test keys in production or vice versa)
4. **Account suspended** or under review by Paystack
5. **Missing business verification** documents

---

## Solution Steps

### Step 1: Log into Paystack Dashboard

1. Go to https://dashboard.paystack.co
2. Login with your merchant account credentials
3. Verify your account status at the top of the dashboard

### Step 2: Check Account Status

Look for any of these indicators:
- ⚠️ "Account under review"
- ⚠️ "Account suspended"
- ⚠️ "Incomplete setup"
- ✅ "Account active" (this is what you want)

If your account is under review or suspended, you'll need to contact Paystack support.

### Step 3: Enable Payment Channels

1. Navigate to **Settings** → **Payment Channels**
2. Verify at least one payment channel is active:
   - ✅ Card payments
   - ✅ Bank transfers
   - ✅ USSD
   - ✅ QR code
   - ✅ Apple Pay / Google Pay (if applicable)

3. If no channels are enabled:
   - Click on each channel
   - Follow the setup instructions
   - Enable the channel for your account

### Step 4: Verify API Keys

1. Navigate to **Settings** → **API Keys**
2. Check that you have both:
   - **Public Key** (starts with `pk_`)
   - **Secret Key** (starts with `sk_`)

3. Verify the environment:
   - **Test Mode**: Keys start with `pk_test_` and `sk_test_`
   - **Live Mode**: Keys start with `pk_live_` and `sk_live_`

4. Update your environment variables:

**Current .env (Development):**
```env
PAYSTACK_SECRET_KEY="your-paystack-secret-key"
PAYSTACK_PUBLIC_KEY="your-paystack-public-key"
```

**Update with actual keys:**
```env
# For Test Mode
PAYSTACK_SECRET_KEY="sk_test_your_actual_test_secret_key"
PAYSTACK_PUBLIC_KEY="pk_test_your_actual_test_public_key"

# OR for Live Mode (production only)
PAYSTACK_SECRET_KEY="sk_live_your_actual_live_secret_key"
PAYSTACK_PUBLIC_KEY="pk_live_your_actual_live_public_key"
```

⚠️ **Important:** Never commit real API keys to version control. Use environment variables only.

### Step 5: Test Payment Configuration

After updating the keys:

1. **Test Mode** (recommended for development):
   - Use test mode keys
   - Test with Paystack's test card: `4084084084084081`
   - CVV: `408`
   - Expiry: Any future date
   - PIN: `0000`

2. **Live Mode** (production only):
   - Use live mode keys
   - Test with a real card (small amount like 100 NGN)
   - Verify the payment goes through

### Step 6: Verify Business Details

If your account is new or unverified:

1. Navigate to **Settings** → **Business**
2. Ensure all required fields are filled:
   - Business name
   - Business description
   - Business address
   - Contact information
   - Bank account details (for settlements)

3. Upload required documents:
   - Business registration certificate
   - Government ID
   - Proof of address

### Step 7: Check for Account Holds

Paystack may place holds on accounts for:
- Suspicious activity
- Missing documentation
- High-risk transactions
- Compliance issues

If you suspect a hold:
1. Check your email for notifications from Paystack
2. Contact Paystack support at help@paystack.co
3. Provide any requested documentation promptly

---

## Backend Code Improvements

The following improvements have been made to the Paystack provider to provide better error messages:

### Enhanced Error Handling

**File:** `src/modules/payments/providers/paystack.provider.ts`

The code now provides specific error messages for common issues:

- **Channel Error:** "No active payment channel configured. Please check your Paystack dashboard..."
- **Authentication Error:** "Invalid or expired secret key. Please verify PAYSTACK_SECRET_KEY..."
- **Validation Error:** "Paystack validation error. Please check the payment parameters..."

This makes it easier to diagnose configuration issues.

---

## Testing Checklist

After completing the configuration steps:

- [ ] Paystack dashboard shows account as "Active"
- [ ] At least one payment channel is enabled
- [ ] API keys are correctly set in environment variables
- [ ] Test payment with test card succeeds in test mode
- [ ] Test payment with real card succeeds in live mode (if applicable)
- [ ] Webhook is configured and receiving events
- [ ] Payment verification endpoint works correctly

---

## Common Issues and Solutions

### Issue: "No active channel to process transaction"

**Solution:** Enable at least one payment channel in Paystack dashboard under Settings → Payment Channels

### Issue: "Invalid API key"

**Solution:** Verify PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY in .env file match your Paystack dashboard

### Issue: "Account under review"

**Solution:** Contact Paystack support and provide any requested documentation

### Issue: Test payment works but live payment fails

**Solution:** Ensure you're using live mode keys (`sk_live_`, `pk_live_`) in production, not test keys

### Issue: "Transaction could not be completed"

**Solution:** Check if the card has sufficient funds, is not blocked, and supports online transactions

---

## Paystack Support Resources

- **Dashboard:** https://dashboard.paystack.co
- **Documentation:** https://paystack.com/docs
- **Support Email:** help@paystack.co
- **Support Phone:** +234 1 343 0523 (Nigeria)
- **Twitter:** @paystack

---

## Security Best Practices

1. **Never commit API keys to version control**
2. **Use different keys for test and production environments**
3. **Rotate API keys periodically**
4. **Monitor API key usage in Paystack dashboard**
5. **Restrict API key access to specific IP addresses if possible**
6. **Use webhook signatures to verify payment notifications**

---

## Next Steps

1. Complete the configuration steps above
2. Update your .env file with correct API keys
3. Restart your backend server
4. Test payment initiation with a small amount
5. Verify payment flow works end-to-end
6. Monitor webhook events in Paystack dashboard

---

## Related Documentation

- Backend Fixes Request: `BACKEND_FIXES_REQUEST.md`
- Frontend Work Required: `FRONTEND_WORK_REQUIRED.md`
- API Documentation: `API_DOCUMENTATION.md`
