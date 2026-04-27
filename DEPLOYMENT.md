# Jotek Deployment Split

Jotek should be deployed as two separate experiences:

- Public storefront: `apps/storefront`
  - Customer-facing ecommerce site.
  - Visitors can browse products, categories, deals, policies, cart, checkout, and order tracking without being forced to log in.
  - Only account pages require authentication.
  - Recommended domain: `https://jotek.ng` or `https://www.jotek.ng`.

- Admin dashboard: `apps/admin`
  - Staff-only operations dashboard for products, inventory, orders, payments, reports, reviews, and settings.
  - All dashboard pages require authentication.
  - Recommended domain: `https://admin.jotek.ng` or `https://jotek-admin.vercel.app`.

## Vercel Setup

Create two Vercel projects from the same repository:

1. Jotek Storefront
   - Root directory: `apps/storefront`
   - Framework preset: Next.js
   - Public domain: `jotek.ng`
   - Key environment variables:
     - `NEXT_PUBLIC_API_URL`
     - `NEXT_PUBLIC_SITE_URL=https://jotek.ng`
     - `NEXT_PUBLIC_WHATSAPP_NUMBER`

2. Jotek Admin
   - Root directory: `apps/admin`
   - Framework preset: Next.js
   - Admin domain: `admin.jotek.ng`
   - Key environment variables:
     - `NEXT_PUBLIC_API_URL`
     - `NEXT_PUBLIC_STOREFRONT_URL=https://jotek.ng`

The admin app stays private. Unauthenticated visits to the admin root (`/`) should redirect to the public storefront, while direct admin routes such as `/orders` and `/products` should redirect to `/login`.
