-- Rose by Marry — initial schema (optional backend, mirrors client-side data model)
create extension if not exists "pgcrypto";

create table if not exists categories (
  id text primary key,
  icon text default '',
  ar text not null, fr text, en text,
  sort int default 0
);

create table if not exists colors (
  id text primary key,
  ar text not null, fr text, en text,
  hex text not null check (hex ~ '^#[0-9a-fA-F]{6}$'),
  available boolean default true,
  sort int default 0
);

create table if not exists products (
  id text primary key,
  slug text unique not null,
  cat text references categories(id),
  type text check (type in ('bouquet','box','single','gift')) default 'bouquet',
  qty int not null check (qty between 1 and 999),
  ar text not null, fr text, en text,
  dar text, dfr text, den text,
  price numeric(10,2) not null check (price >= 0),
  old_price numeric(10,2) default 0,
  badge text check (badge in ('','new','best','promo')) default '',
  featured boolean default false,
  active boolean default true
);

create table if not exists addons (
  id text primary key,
  icon text default '',
  ar text not null, fr text, en text,
  price numeric(10,2) default 0,
  has_text boolean default false,
  enabled boolean default true
);

create table if not exists builder_tiers (
  id text primary key,
  qty int not null,
  price numeric(10,2) not null
);

create table if not exists zones (
  id text primary key,
  ar text not null, fr text, en text,
  fee numeric(10,2) default 0
);

create table if not exists promo_codes (
  id text primary key,
  code text unique not null,
  type text check (type in ('percent','fixed')) default 'percent',
  value numeric(10,2) not null,
  min_total numeric(10,2) default 0,
  enabled boolean default true,
  used int default 0
);

create table if not exists discounts (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('percent','fixed')) default 'percent',
  value numeric(10,2) not null,
  min_total numeric(10,2) default 0,
  enabled boolean default true
);

create table if not exists orders (
  id text primary key,                     -- RBM-XXXX (from WhatsApp checkout)
  ts timestamptz default now(),
  status text check (status in ('new','confirmed','delivered','cancelled')) default 'new',
  customer_name text, phone text, city text,
  zone_name text, zone_fee numeric(10,2) default 0,
  promo text, manual_discount numeric(10,2) default 0, discount numeric(10,2) default 0,
  delivery_date text, note text,
  total numeric(10,2) not null,
  currency text default 'DH'
);

create table if not exists order_items (
  id bigint generated always as identity primary key,
  order_id text references orders(id) on delete cascade,
  pid text, name text,
  qty int not null default 1,
  color text, addons text, note text,
  price numeric(10,2) not null
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  pid text references products(id) on delete cascade,
  name text not null,
  rating int not null check (rating between 1 and 5),
  text text,
  ts timestamptz default now(),
  approved boolean default true
);

create table if not exists pageviews (
  key text primary key,                    -- 'home' | 'shop' | 'product:<id>'
  n bigint default 0
);

create table if not exists prod_views (
  pid text primary key references products(id) on delete cascade,
  n bigint default 0
);

-- Tangier-only default zone
insert into zones (id, ar, fr, en, fee) values ('tanger', 'طنجة', 'Tanger', 'Tangier', 20)
on conflict (id) do nothing;

-- Row-level security: public reads catalog, writes only reviews counters
alter table products enable row level security;
alter table colors enable row level security;
alter table reviews enable row level security;
create policy "public read products" on products for select using (active);
create policy "public read colors" on colors for select using (available);
create policy "public read reviews" on reviews for select using (approved);
