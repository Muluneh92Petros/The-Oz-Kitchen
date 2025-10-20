# OZ Kitchen Backend Deployment Guide

This guide walks you through deploying the OZ Kitchen backend with Supabase integration and Student Super App referral system.

## Prerequisites

- Node.js 18+ and pnpm
- Supabase CLI installed (`npm install -g supabase`)
- Supabase account
- Telebirr and Chapa API credentials

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key
3. Set up your database password

## Step 2: Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Payment Gateway APIs
TELEBIRR_API_KEY=your-telebirr-api-key
TELEBIRR_API_SECRET=your-telebirr-api-secret
TELEBIRR_BASE_URL=https://api.telebirr.com

CHAPA_API_KEY=your-chapa-api-key
CHAPA_WEBHOOK_SECRET=your-chapa-webhook-secret
CHAPA_BASE_URL=https://api.chapa.co

# Partner Integration
REFERRAL_TOKEN_SECRET=your-super-secret-referral-key
SUPERAPP_API_KEY=your-superapp-api-key
SUPERAPP_WEBHOOK_URL=https://superapp.com/webhooks/oz-kitchen

# App Configuration
VITE_APP_URL=https://your-domain.com
```

## Step 3: Initialize Supabase

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Apply database migrations
supabase db push
```

## Step 4: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy capture-referral
supabase functions deploy partner-summary
supabase functions deploy process-payment
supabase functions deploy payment-webhook

# Set environment variables for functions
supabase secrets set TELEBIRR_API_KEY=your-key
supabase secrets set TELEBIRR_API_SECRET=your-secret
supabase secrets set CHAPA_API_KEY=your-key
supabase secrets set CHAPA_WEBHOOK_SECRET=your-secret
supabase secrets set REFERRAL_TOKEN_SECRET=your-secret
```

## Step 5: Configure Authentication

In your Supabase dashboard:

1. Go to Authentication > Settings
2. Set Site URL to your domain
3. Add redirect URLs for production
4. Configure email templates if needed

## Step 6: Set Up Storage Buckets

Run this SQL in your Supabase SQL editor:

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('meal-images', 'meal-images', true),
('delivery-proofs', 'delivery-proofs', false),
('profile-pictures', 'profile-pictures', true);

-- Set up storage policies
CREATE POLICY "Public meal images" ON storage.objects
FOR SELECT USING (bucket_id = 'meal-images');

CREATE POLICY "Users can upload profile pictures" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Step 7: Configure Partner Integration

1. Create partner records in your database:

```sql
INSERT INTO partners (name, partner_code, api_key, commission_rate, status, contact_email) VALUES
('Student Super App', 'SUPAPP', 'pk_live_superapp_' || encode(gen_random_bytes(16), 'hex'), 15.00, 'active', 'partnership@superapp.com');
```

2. Share the API key with your partner
3. Configure webhook URLs in partner systems

## Step 8: Set Up Payment Webhooks

Configure webhook URLs in your payment providers:

- **Telebirr**: `https://your-project-id.supabase.co/functions/v1/payment-webhook`
- **Chapa**: `https://your-project-id.supabase.co/functions/v1/payment-webhook`

## Step 9: Deploy Frontend

### Option 1: Netlify

1. Connect your GitHub repository to Netlify
2. Set build command: `pnpm build`
3. Set publish directory: `dist/spa`
4. Add environment variables in Netlify dashboard

### Option 2: Vercel

1. Import project from GitHub
2. Set framework preset to "Vite"
3. Add environment variables
4. Deploy

## Step 10: Configure Domain and SSL

1. Set up custom domain in your hosting provider
2. Configure SSL certificate
3. Update CORS settings in Supabase
4. Update site URL in authentication settings

## Step 11: Set Up Monitoring

### Database Monitoring

1. Enable database insights in Supabase dashboard
2. Set up alerts for high CPU/memory usage
3. Monitor slow queries

### Application Monitoring

Add error tracking and analytics:

```typescript
// Add to your main App.tsx
import { createClient } from '@supabase/supabase-js'

// Initialize error tracking
window.addEventListener('error', (event) => {
  console.error('Application error:', event.error)
  // Send to monitoring service
})
```

## Step 12: Testing

### Test Authentication Flow

1. Sign up with new account
2. Verify email confirmation (if enabled)
3. Test sign in/out functionality

### Test Referral System

1. Generate referral link: `https://your-domain.com/signup?ref=SUPAPP-token`
2. Sign up through referral link
3. Verify referral tracking in database
4. Test commission calculation

### Test Payment Flow

1. Create meal plan
2. Generate order
3. Process test payment
4. Verify webhook handling
5. Check commission calculation

### Test Partner API

```bash
# Test partner summary endpoint
curl -X GET "https://your-project-id.supabase.co/functions/v1/partner-summary" \
  -H "x-api-key: your-partner-api-key" \
  -H "Content-Type: application/json"
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Authentication configured
- [ ] Storage buckets created
- [ ] Payment webhooks configured
- [ ] Partner integrations tested
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Monitoring set up
- [ ] Error tracking enabled
- [ ] Backup strategy implemented

## Maintenance

### Daily Tasks

- Monitor error logs
- Check payment processing
- Review partner metrics

### Weekly Tasks

- Review database performance
- Check commission calculations
- Update meal inventory

### Monthly Tasks

- Generate partner settlements
- Review security logs
- Update dependencies

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check site URL in Supabase auth settings
2. **Payment Webhook Failures**: Verify webhook URLs and signatures
3. **Referral Not Tracking**: Check token format and expiration
4. **Database Connection Issues**: Verify connection strings and RLS policies

### Debug Commands

```bash
# Check Supabase status
supabase status

# View function logs
supabase functions logs capture-referral

# Test database connection
supabase db ping
```

## Support

For technical support:
- Check Supabase documentation
- Review error logs in dashboard
- Contact development team

For partner integration support:
- Review partner API documentation
- Test API endpoints
- Check webhook configurations
