# Client Portal Creation & Notification Guide

## Overview

The Client Portal feature allows consultants to create secure access portals for their clients, where clients can view audit results, track progress, and access recommendations. The system automatically sends access links via email or SMS.

## Features

### 1. **Portal Creation**
- Create client portals from the Dashboard or after completing an audit
- Secure verification code system for client access
- Customizable tool access (audits, reports, progress tracking)

### 2. **Notifications**
- Email notifications via SendGrid (configurable)
- SMS notifications via Twilio (configurable)
- Automatic magic link generation with verification codes
- Development mode with simulated notifications

### 3. **Client Access**
- Clients receive a magic link: `/customer/{profileId}?code={verificationCode}`
- View selected package and features
- Track implementation progress
- Access audit results and recommendations

## Setup

### Environment Variables

Add these to your `.env` file:

```bash
# Email Notifications (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM=no-reply@yourdomain.com

# SMS Notifications (Twilio)
TWILIO_SID=your_twilio_account_sid
TWILIO_TOKEN=your_twilio_auth_token
TWILIO_FROM=+1234567890

# Application URL (for magic links)
APP_PUBLIC_URL=https://yourdomain.com
```

**Note**: If these are not configured, notifications will run in "simulated" mode and print the magic link to the console.

## Usage

### From the Dashboard

1. Navigate to the **Client Portal Management** section
2. Enter the business profile ID
3. Provide client email and/or phone number
4. Select notification channel (email or SMS)
5. Click "Create Portal & Send Notification"
6. The system will:
   - Create a secure customer profile
   - Generate a verification code
   - Send a magic link to the client
   - Display the portal link for reference

### From the Audit Flow

After completing an audit:

1. Look for the **"Next Step: Create Client Portal"** section
2. Click "Create Client Portal"
3. Enter client email (and optionally phone)
4. Click "Create & Send"
5. The client will receive access to view their audit results

### Programmatic Usage

```typescript
import { localAI } from './ai-service';

// Create a customer profile
const profile = await localAI.createCustomerProfile({
  businessProfileId: 'business-123',
  contact: {
    email: 'client@example.com',
    phone: '+1234567890' // optional
  },
  selectedTools: ['audit', 'reports', 'progress'],
  channel: 'email' // or 'sms'
});

// Send notification
const notification = await localAI.sendCustomerNotification(
  profile.profile.id,
  'email' // or 'sms'
);

console.log('Magic link:', notification.magicLink);
```

## API Endpoints

### POST `/api/customer/profile`
Create a new customer portal profile.

**Request Body:**
```json
{
  "businessProfileId": "business-123",
  "contact": {
    "email": "client@example.com",
    "phone": "+1234567890"
  },
  "selectedTools": ["audit", "reports", "progress"],
  "channel": "email"
}
```

**Response:**
```json
{
  "profile": {
    "id": "profile-abc123",
    "businessProfileId": "business-123",
    "contact": { "email": "client@example.com" },
    "verificationCode": "XYZ789",
    "selectedTools": ["audit", "reports", "progress"],
    "progress": {},
    "createdAt": "2025-10-21T07:00:00.000Z"
  }
}
```

### POST `/api/customer/profile/:id/notify`
Send notification with magic link to client.

**Request Body:**
```json
{
  "channel": "email"
}
```

**Response:**
```json
{
  "ok": true,
  "channel": "email",
  "magicLink": "https://yourdomain.com/customer/profile-abc123?code=XYZ789",
  "simulated": false
}
```

### GET `/api/customer/profile/:id`
Fetch customer profile (used by CustomerProfile.tsx component).

**Response:**
```json
{
  "profile": {
    "id": "profile-abc123",
    "businessProfileId": "business-123",
    "contact": { "email": "client@example.com" },
    "selectedTools": ["audit", "reports"],
    "progress": {
      "audit": {
        "status": "completed",
        "lastUpdated": "2025-10-21"
      }
    }
  }
}
```

### PATCH `/api/customer/profile/:id/progress`
Update customer progress (used by consultants to update implementation status).

**Request Body:**
```json
{
  "progress": {
    "audit": {
      "status": "completed",
      "lastUpdated": "2025-10-21"
    },
    "gbp-setup": {
      "status": "in-progress",
      "lastUpdated": "2025-10-21"
    }
  }
}
```

## Client View

When clients access their portal:

1. They're prompted to enter their verification code (if not in URL)
2. Upon verification, they see:
   - Welcome message
   - Selected package details
   - Available tools
   - Implementation progress
   - Next steps

## Security

- **Verification Codes**: 6-character alphanumeric codes
- **Access Control**: Clients can only access their own profile with correct code
- **Magic Links**: Combine profile ID + verification code for secure access
- **No Password Required**: Simplified access via magic links

## Best Practices

1. **Create portals immediately after audit completion** - Builds trust and momentum
2. **Use email for primary communication** - Better for detailed information
3. **SMS for urgent updates** - Quick notifications about portal access
4. **Update progress regularly** - Keep clients informed of implementation status
5. **Test notifications in development** - Use simulated mode before production

## Troubleshooting

### Notifications Not Sending

**Issue**: Simulated notifications in production

**Solution**: Ensure `SENDGRID_API_KEY` (for email) or `TWILIO_*` (for SMS) environment variables are set.

### Invalid Magic Links

**Issue**: Magic link redirects to home page

**Solution**: 
- Check that `APP_PUBLIC_URL` is set correctly
- Verify the profile ID and verification code in the URL

### Profile Not Found

**Issue**: "Profile not found" error when accessing portal

**Solution**:
- Verify the profile was created successfully
- Check Firestore to ensure the document exists in `customerProfiles` collection

## Future Enhancements

- [ ] Client dashboard with real-time progress updates
- [ ] In-portal messaging between consultant and client
- [ ] Package upgrade/downgrade options
- [ ] Automated progress emails at milestones
- [ ] Client satisfaction surveys
- [ ] Document sharing (proposals, contracts, reports)

## Related Files

- Frontend: `src/components/Dashboard.tsx`, `src/components/AuditView.tsx`, `CustomerProfile.tsx`
- Backend: `ai-server/routes/customer.js`
- API Service: `ai-service.ts`
- Tests: `src/__tests__/customer-portal.test.ts`
