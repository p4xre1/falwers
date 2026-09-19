-- Rose by Marry — 0002_media
-- Real photos for products (packs) and colors, stored in Supabase Storage.
--
-- WHAT THIS GIVES YOU
--   * a public Storage bucket `media` for the image files themselves
--   * `product_images` — a photo gallery per product (pack)
--   * `color_images`   — one real close-up photo per color (replaces the hex mockup dot)
--   * an optional `color_id` on `product_images` so a photo can belong to
--     "Amour Bouquet + Tangier Pink" instead of just "Amour Bouquet"
--   * `product_media` / `color_media` views that hand the site ready-to-use public URLs
--
-- Safe to re-run: every statement is idempotent.
-- Requires 0001_init.sql (products, colors) to have been applied first.

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. Storage bucket
-- ============================================================
-- Public bucket: images are served straight from the CDN, no signed URLs.
-- 5 MB per file, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- 2. Tables
-- ============================================================

-- Photo gallery for a product/pack.
-- `path` is the object path inside the `media` bucket, e.g.
--   products/amour/tangier-pink-01.webp
-- When `color_id` is null the photo is a general shot of the pack.
-- When `color_id` is set the photo shows that pack in that specific color,
-- and the storefront swaps to it when the shopper picks that color.
create table if not exists product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references products(id) on delete cascade,
  color_id    text references colors(id) on delete cascade,
  path        text not null,
  alt_ar      text default '',
  alt_fr      text default '',
  alt_en      text default '',
  width       int,
  height      int,
  sort        int  default 0,
  is_primary  boolean default false,
  created_at  timestamptz default now(),
  constraint product_images_path_not_blank check (length(trim(path)) > 0)
);

-- One real photo per color (the close-up used for the swatch dot).
-- `hex` stays on the colors table as the fallback/background tint while the
-- photo loads, so nothing breaks if a color has no photo yet.
create table if not exists color_images (
  color_id   text primary key references colors(id) on delete cascade,
  path       text not null,
  alt_ar     text default '',
  alt_fr     text default '',
  alt_en     text default '',
  width      int,
  height     int,
  updated_at timestamptz default now(),
  constraint color_images_path_not_blank check (length(trim(path)) > 0)
);

-- The same file must not be attached twice to the same product+color slot.
create unique index if not exists product_images_unique_path
  on product_images (product_id, coalesce(color_id, ''), path);

-- Lookup indexes for the storefront queries.
create index if not exists product_images_product_idx on product_images (product_id, sort);
create index if not exists product_images_color_idx   on product_images (product_id, color_id, sort);

-- ============================================================
-- 3. Exactly one primary image per product+color slot
-- ============================================================
-- A partial unique index enforces "at most one primary"; the trigger below
-- makes sure there is always at least one, so the site never has to guess.
create unique index if not exists product_images_one_primary
  on product_images (product_id, coalesce(color_id, ''))
  where is_primary;

create or replace function product_images_primary_guard()
returns trigger
language plpgsql
as $$
declare
  -- True when the row is new, or has just been moved to a different
  -- product/color slot. Critically FALSE during the cascade demotion below:
  -- without this guard a sibling being demoted would look around, see no
  -- other primary (the incoming row is not written yet), promote itself
  -- again, and collide with product_images_one_primary.
  slot_changed boolean := tg_op = 'INSERT'
    or new.product_id is distinct from old.product_id
    or coalesce(new.color_id, '') is distinct from coalesce(old.color_id, '');
begin
  if new.is_primary then
    -- Marking a row primary clears the flag on its siblings in the same slot.
    update product_images
       set is_primary = false
     where product_id = new.product_id
       and coalesce(color_id, '') = coalesce(new.color_id, '')
       and id <> new.id
       and is_primary;
  elsif slot_changed then
    -- First photo to land in a slot becomes its primary automatically.
    if not exists (
      select 1 from product_images
       where product_id = new.product_id
         and coalesce(color_id, '') = coalesce(new.color_id, '')
         and id <> new.id
         and is_primary
    ) then
      new.is_primary := true;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists product_images_primary_guard_trg on product_images;
create trigger product_images_primary_guard_trg
  before insert or update of is_primary, color_id, product_id on product_images
  for each row execute function product_images_primary_guard();

-- Deleting the primary promotes the next photo in the slot.
create or replace function product_images_primary_backfill()
returns trigger
language plpgsql
as $$
begin
  if old.is_primary then
    update product_images
       set is_primary = true
     where id = (
       select id from product_images
        where product_id = old.product_id
          and coalesce(color_id, '') = coalesce(old.color_id, '')
        order by sort, created_at
        limit 1
     );
  end if;
  return old;
end;
$$;

drop trigger if exists product_images_primary_backfill_trg on product_images;
create trigger product_images_primary_backfill_trg
  after delete on product_images
  for each row execute function product_images_primary_backfill();

create or replace function touch_color_images()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists color_images_touch on color_images;
create trigger color_images_touch
  before update on color_images
  for each row execute function touch_color_images();

-- ============================================================
-- 4. Views with ready-made public URLs
-- ============================================================
-- Public Storage URLs look like:
--   https://<project-ref>.supabase.co/storage/v1/object/public/media/<path>
-- SQL cannot discover the project ref on its own, so keep it in one tiny
-- config row. UPDATE THIS ONE LINE with your real project URL after pasting
-- (Supabase dashboard > Project Settings > Data API > Project URL).
create table if not exists app_config (
  id         boolean primary key default true,
  base_url   text not null default '',
  bucket     text not null default 'media',
  constraint app_config_single_row check (id)
);

insert into app_config (id, base_url, bucket)
values (true, 'https://YOUR-PROJECT-REF.supabase.co', 'media')
on conflict (id) do nothing;   -- keeps your value if you re-run this file

-- Returns the full public URL for an object path in the media bucket.
-- Falls back to the bare path if base_url has not been set yet, so the site
-- degrades to "no photo" instead of rendering a broken absolute URL.
create or replace function storage_public_url(object_path text)
returns text
language sql
stable
as $$
  select case
    when object_path is null or length(trim(object_path)) = 0 then null
    when cfg.base_url = '' or cfg.base_url like 'https://YOUR-PROJECT-REF%' then null
    else rtrim(cfg.base_url, '/') || '/storage/v1/object/public/'
         || cfg.bucket || '/' || ltrim(object_path, '/')
  end
  from app_config cfg
  where cfg.id
$$;

-- The site can select straight from these and use `url` in an <img src>.
create or replace view product_media
with (security_invoker = true) as
select
  pi.id,
  pi.product_id,
  pi.color_id,
  pi.path,
  pi.alt_ar, pi.alt_fr, pi.alt_en,
  pi.width, pi.height,
  pi.sort,
  pi.is_primary,
  storage_public_url(pi.path) as url
from product_images pi
order by pi.product_id, pi.sort, pi.created_at;

create or replace view color_media
with (security_invoker = true) as
select
  ci.color_id,
  c.ar, c.fr, c.en, c.hex,
  ci.path,
  ci.alt_ar, ci.alt_fr, ci.alt_en,
  ci.width, ci.height,
  storage_public_url(ci.path) as url
from color_images ci
join colors c on c.id = ci.color_id;

-- ============================================================
-- 5. Row-level security
-- ============================================================
-- Public (anon key) may READ images. Writes require an authenticated user,
-- so the anon key shipped in the browser can never delete your photos.
alter table product_images enable row level security;
alter table color_images  enable row level security;
alter table app_config    enable row level security;

drop policy if exists "public read config" on app_config;
create policy "public read config"
  on app_config for select
  using (true);

drop policy if exists "public read product images" on product_images;
create policy "public read product images"
  on product_images for select
  using (true);

drop policy if exists "auth write product images" on product_images;
create policy "auth write product images"
  on product_images for all
  to authenticated
  using (true) with check (true);

drop policy if exists "public read color images" on color_images;
create policy "public read color images"
  on color_images for select
  using (true);

drop policy if exists "auth write color images" on color_images;
create policy "auth write color images"
  on color_images for all
  to authenticated
  using (true) with check (true);

-- Storage policies: anyone can view files in `media`, only signed-in users
-- can upload/replace/delete them.
drop policy if exists "public read media" on storage.objects;
create policy "public read media"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "auth upload media" on storage.objects;
create policy "auth upload media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');

drop policy if exists "auth update media" on storage.objects;
create policy "auth update media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media') with check (bucket_id = 'media');

drop policy if exists "auth delete media" on storage.objects;
create policy "auth delete media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media');

-- ============================================================
-- 6. Grants
-- ============================================================
-- RLS decides row visibility, but the role still needs table privileges.
grant usage on schema public to anon, authenticated;
grant select on product_images, color_images, app_config to anon, authenticated;
grant select on product_media, color_media to anon, authenticated;
grant insert, update, delete on product_images, color_images to authenticated;
grant execute on function storage_public_url(text) to anon, authenticated;

-- ============================================================
-- 7. After pasting this file
-- ============================================================
--   1) Set your project URL so the views can build public links:
--        update app_config set base_url = 'https://xxxxxxxx.supabase.co';
--   2) Storage > create folders in the `media` bucket (optional, uploads
--      create them automatically): products/  colors/
--   3) Check it works:
--        select * from color_media;
--        select product_id, color_id, is_primary, url from product_media;
--
-- Photo rules the database now enforces for you:
--   * every product+color slot has exactly one primary photo
--   * deleting the primary promotes the next photo automatically
--   * the same file cannot be attached twice to the same slot
--   * deleting a product or color removes its photo rows (files in Storage
--     are NOT deleted — remove those from the Storage UI if you want)
