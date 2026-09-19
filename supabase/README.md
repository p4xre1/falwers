# Supabase (optional backend)

The store runs 100% client-side today (LocalStorage + IndexedDB). This folder prepares an
optional Supabase backend for multi-device order management. Nothing here is required to
run or deploy the site.

## Setup (when ready)
1. Create a project at supabase.com
2. `supabase link --project-ref YOUR_REF`
3. `supabase db push`  (applies migrations/0001_init.sql)
4. Set the anon key in Cloudflare Pages env vars (never expose the service key)

## Tables
- `products` / `categories` / `colors` / `addons` / `builder_tiers` — catalog (mirrors data.js defaults)
- `orders` + `order_items` — order log (mirrors the WhatsApp order fields)
- `reviews` — moderated ratings
- `pageviews` / `prod_views` — interest analytics counters
- `discounts` / `promo_codes` / `zones` — marketing
