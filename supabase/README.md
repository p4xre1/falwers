# Supabase (optional backend)

The store runs 100% client-side today (LocalStorage + IndexedDB). This folder prepares an
optional Supabase backend. Nothing here is required to run or deploy the site — but
`0002_media.sql` is what turns the SVG mockups into **real photos**.

## Setup (when ready)
1. Create a project at supabase.com
2. `supabase link --project-ref YOUR_REF`
3. `supabase db push`  (applies the migrations in order)
4. Set the anon key in Cloudflare Pages env vars (never expose the service key)

If you are not using the CLI, just open the **SQL Editor** in the dashboard and paste each
migration file in order (`0001_init.sql`, then `0002_media.sql`). Both are safe to re-run.

## Tables
- `products` / `categories` / `colors` / `addons` / `builder_tiers` — catalog (mirrors data.js defaults)
- `orders` + `order_items` — order log (mirrors the WhatsApp order fields)
- `reviews` — moderated ratings
- `pageviews` / `prod_views` — interest analytics counters
- `discounts` / `promo_codes` / `zones` — marketing
- `product_images` / `color_images` — real photos (see below)
- `app_config` — one row holding your project URL, used to build public image links

---

## Photos — `0002_media.sql`

### What it creates
| Object | Purpose |
|---|---|
| Storage bucket `media` | public, 5 MB/file, images only |
| `product_images` | gallery per pack; optional `color_id` ties a shot to one colour |
| `color_images` | one close-up photo per colour, replaces the flat swatch dot |
| `product_media` / `color_media` | views returning ready-to-use public `url`s |

### After pasting the SQL — do this one thing
The views need your project URL to build image links:

```sql
update app_config set base_url = 'https://YOUR-REF.supabase.co';
```

Until you do, `url` comes back `NULL` and the site simply keeps showing mockups.

### How photos resolve on the storefront
For "show me this pack in this colour", the site tries, in order:

1. the **primary** photo tagged with that colour
2. any photo tagged with that colour
3. the pack's **general** primary photo
4. any general photo
5. the hand-drawn **SVG mockup** (nothing uploaded yet)

So a half-photographed catalogue never shows a hole — you can add photos one pack at a
time. Same idea for colours: a colour with no photo keeps its hex dot.

### Rules the database enforces for you
- exactly **one primary photo per pack+colour slot** (partial unique index + trigger)
- deleting the primary **promotes the next photo** automatically
- the same file cannot be attached twice to the same slot
- deleting a product or colour removes its photo rows
  (the files stay in Storage — delete those from the Storage UI if you want)

### Security
`anon` can **read** photos; only an **authenticated** user can insert, update or delete
them, in both the tables and the Storage bucket. The anon key in the browser is public by
design — RLS is the actual protection. Never put the service key in the site.

---

## Using it from the admin

**Admin → Settings → Supabase**: paste the project URL + anon key, save, then sign in with
a Supabase user (Authentication → Users → Add user). The status chip shows
`Not configured` → `Connected · Read-only` → `Connected · Signed in`.

- **Admin → Colours**: each colour row gets an *Add photo* button (the close-up used for
  the swatch).
- **Admin → Products**: each pack gets a photo box with a colour selector — pick
  *General pack photos* or a specific colour, then upload. `★` sets the main photo.
- **Pull photos** re-reads every photo row from Supabase into the local catalogue.

### Before you connect Supabase
Uploads still work — the image is stored as a `data:` URL inside local state, so you can
try the feature immediately. That inflates the JSON backup file, so it is meant for
testing; connect Supabase for real use. The admin shows which mode is active under every
upload button.
