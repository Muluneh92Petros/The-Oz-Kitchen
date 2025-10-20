## OZ Kitchen – Frontend App# 🍱 OZ Kitchen - Food Delivery Platform

A comprehensive food delivery platform with meal subscription service, built with React, Supabase, and integrated partner referral system.

## 🚀 Features

- **Meal Subscription Service**: Weekly meal plans with Ethiopian cuisine
- **Partner Referral System**: 15% commission system for Student Super App integration
- **Payment Integration**: Telebirr and Chapa payment gateways
- **Real-time Notifications**: Order tracking and updates
- **Admin Dashboard**: Meal management and analytics
- **Mobile-First Design**: Responsive UI with modern components

## 🛠 Tech Stack

### Frontend
- **React 18** + TypeScript + Vite
- **TailwindCSS 3** + Radix UI components
- **React Router 6** (SPA mode)
- **React Query** for state management
- **Lucide React** icons

### Backend
- **Supabase** (PostgreSQL + Auth + Storage + Edge Functions)
- **Row Level Security** for data protection
- **Real-time subscriptions** for live updates
- **Edge Functions** for business logic

### Integrations
- **Telebirr** payment gateway
- **Chapa** payment gateway
- **Student Super App** referral system
- **SMS/Email** notifications

## 📁 Project Structure

```text
client/                   # React frontend
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   └── auth/           # Authentication components
├── contexts/           # React contexts (Auth, etc.)
├── hooks/              # Custom React hooks
├── lib/                # Utilities and API clients
├── pages/              # Route components
└── App.tsx             # Main app with routing

supabase/               # Supabase configuration
├── functions/          # Edge Functions
│   ├── capture-referral/
│   ├── partner-summary/
│   ├── process-payment/
│   └── payment-webhook/
└── migrations/         # Database migrations

shared/                 # Shared types and utilities
└── database.types.ts   # Generated Supabase types
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm
- Supabase CLI
- Supabase account

### 1. Clone and Install
```bash
git clone <repository-url>
cd OZ_kitchen
pnpm install
```

### 2. Set Up Supabase
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Create new project or link existing
supabase init
supabase link --project-ref your-project-id
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Supabase credentials and API keys
```

### 4. Apply Database Migrations
```bash
supabase db push
```

### 5. Deploy Edge Functions
```bash
supabase functions deploy capture-referral
supabase functions deploy partner-summary
supabase functions deploy process-payment
supabase functions deploy payment-webhook
```

### 6. Start Development Server
```bash
pnpm dev
```

## 🔧 Development Commands

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm preview          # Preview production build
pnpm typecheck        # TypeScript type checking
pnpm test             # Run tests
```

## 🗄️ Database Schema

### Core Tables
- `profiles` - User profiles and preferences
- `meals` - Available meals with categories
- `meal_plans` - Weekly meal selections
- `orders` - Order management and tracking
- `payments` - Payment processing records

### Partner Integration
- `partners` - Partner organizations (Student Super App)
- `referrals` - Anonymous referral tracking
- `partner_commissions` - Commission calculations
- `commission_settlements` - Monthly payouts

## 🔐 Authentication & Security

- **Supabase Auth** with email/password
- **Row Level Security** policies
- **JWT tokens** for API access
- **Partner API keys** for referral system
- **Webhook signature verification**

## 💳 Payment Integration

### Supported Gateways
- **Telebirr**: Ethiopian mobile payment
- **Chapa**: Multi-channel payment processor

### Payment Flow
1. User creates meal plan
2. Order generated with delivery details
3. Payment processed via chosen gateway
4. Webhook confirms payment status
5. Commission calculated for referrals

## 🤝 Partner Referral System

### How It Works
1. Partner generates referral link with token
2. User clicks link and signs up
3. Referral captured anonymously
4. Commission calculated on successful payments
5. Monthly settlements generated

### API Endpoints
- `POST /functions/v1/capture-referral` - Capture referral
- `GET /functions/v1/partner-summary` - Get partner metrics
- `GET /functions/v1/partner-ledger` - Commission details

## 📱 Mobile Integration

### Telegram Mini App Support
- Telegram Web App SDK integration
- Native UI components
- Seamless authentication flow

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Options
- **Netlify**: Connect GitHub repo, set build command `pnpm build`
- **Vercel**: Import project, configure environment variables
- **Self-hosted**: Build and serve `dist/spa` directory

## 🔍 Monitoring & Analytics

- **Supabase Dashboard**: Database insights and logs
- **Edge Function Logs**: Real-time function monitoring
- **Partner Metrics**: Commission tracking and reporting
- **Payment Analytics**: Transaction success rates

## 🧪 Testing

### Test Referral Flow
```bash
# Generate test referral URL
https://your-domain.com/signup?ref=SUPAPP-eyJwYXJ0bmVyX2lkIjoiU1VQQVBQIn0

# Test partner API
curl -X GET "https://your-project.supabase.co/functions/v1/partner-summary" \
  -H "x-api-key: your-partner-api-key"
```

### Test Payment Flow
1. Create meal plan in development
2. Use test payment credentials
3. Verify webhook processing
4. Check commission calculation

## 📄 API Documentation

### Authentication
All API requests require authentication via Supabase JWT tokens or partner API keys.

### Rate Limiting
- Partner APIs: 1000 requests/hour
- User APIs: Standard Supabase limits

### Error Handling
All APIs return consistent error formats:
```json
{
  "subscriptionType": "weekly" | "monthly",
  "meals": [{ "optionId": "string", "dateISO": "YYYY-MM-DD", "quantity": 1 }],
  "budget": 1000
}
```
Use `VITE_API_URL` to point the frontend at your deployed API.

### Testing & Quality
```bash
pnpm typecheck
pnpm test
```
Add component/page tests under `client/` using Vitest if needed.

### Troubleshooting
**Windows: pnpm/Corepack error**
- Symptom: "Failed to switch pnpm to v10.x" or ENOENT
- Workarounds:
  - Use npm: `npm install && npm run dev`
  - Or install pnpm globally: `npm i -g pnpm` (then `pnpm -v`)

**esbuild EFTYPE / Node version issues**
- Use Node 20 LTS if possible
- Remove cached binaries and reinstall: delete `node_modules` then reinstall

**Blank page in production**
- Ensure SPA fallback to `index.html`
- Check `VITE_API_URL` is set at build time
