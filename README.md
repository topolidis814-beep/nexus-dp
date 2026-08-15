# Nexus B2B V1

Functional MVP for B2B stock, surplus and full-lot liquidation.

## Start
```bash
npm start
```
Open `http://localhost:3000`.

## Demo accounts
- Seller: `vivaio@nexus.local` / `demo123!`
- Buyer: `buyer@nexus.local` / `demo123!`
- Admin API: `admin@nexus.local` / `admin123!`

## What works now
- seller/buyer registration and login
- searchable public marketplace
- mobile photo capture/upload as local demo data URL
- listing creation
- unit price, minimum quantity, full-lot price, fast-liquidation flag
- offers, acceptance/rejection/counter API
- inventory decrement after accepted offer
- dashboard and funnel-relevant analytics events
- account deletion
- channel matching layer with external connectors safely inactive
- admin stats API

## Important demo limitation
`data/db.json` is a local demo persistence layer. Do not use it for production or personal data. For production, migrate to Supabase using `db/schema.sql`, enable RLS, use Supabase Storage for images, and rotate all secrets.

## Environment
- `PORT` optional, defaults to 3000
- `SESSION_SECRET` required in any deployed environment

## Production migration
1. Create Supabase project.
2. Apply `db/schema.sql` and add strict RLS policies.
3. Replace local `store.js` access with Supabase server client calls.
4. Store images in Supabase Storage, never as data URLs.
5. Add Stripe Billing Checkout for Nexus Pro; keep price IDs configurable from admin/database.
6. Deploy app to Vercel.
7. Add verified external channel connectors one by one, using official APIs/feeds only.
8. Before marketplace payments, get Italian/EU legal, accounting and payment-services review.

## Definition of Done covered
This demo can publish inventory, discover it, view full-lot economics, make offers, accept/reject them, reduce stock and expose seller metrics. It is designed to validate the first real buyer/seller loop before adding expensive integrations.
