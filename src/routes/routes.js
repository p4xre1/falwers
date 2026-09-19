/**
 * Rose by Marry — canonical route table.
 * Single source of truth for sitemaps, llms.txt, ai-sitemap and audits.
 * Runtime serving is static (public/), this table drives every generator in scripts/.
 */
export const SITE = {
  name: 'Rose by Marry',
  url: process.env.SITE_URL || 'https://rosebymarry.com',
  tagline: { ar: 'ورود ساتان مصنوعة يدوياً في طنجة', fr: 'Roses en satin faites main à Tanger', en: 'Handmade satin roses in Tangier' },
  locales: ['ar', 'fr', 'en'],
  defaultLocale: 'ar',
  geo: { region: 'MA-TNG', placename: 'Tangier', lat: 35.7595, lng: -5.8340 },
  currency: 'MAD'
};

/** Static storefront pages. admin/* is noindex and never listed. */
export const ROUTES = [
  { path: '/',               page: 'home',      file: 'index.html',    priority: 1.0, changefreq: 'weekly',  public: true },
  { path: '/shop',           page: 'shop',      file: 'shop.html',     priority: 0.9, changefreq: 'weekly',  public: true },
  { path: '/about',          page: 'about',     file: 'about.html',    priority: 0.6, changefreq: 'monthly', public: true },
  { path: '/contact',        page: 'contact',   file: 'contact.html',  priority: 0.6, changefreq: 'monthly', public: true },
  { path: '/track',          page: 'track',     file: 'track.html',    priority: 0.5, changefreq: 'monthly', public: false },
  { path: '/wishlist',       page: 'wishlist',  file: 'wishlist.html', priority: 0.3, changefreq: 'monthly', public: false },
  { path: '/blog',           page: 'blog',      file: 'blog.html',     priority: 0.7, changefreq: 'weekly',  public: true },
  { path: '/faq',            page: 'faq',       file: 'faq.html',      priority: 0.6, changefreq: 'monthly', public: true },
  { path: '/occasions',      page: 'occasions', file: 'occasions.html', priority: 0.7, changefreq: 'weekly',  public: true },
  { path: '/care',           page: 'care',      file: 'care.html',     priority: 0.5, changefreq: 'monthly', public: true },
  { path: '/size-guide',     page: 'sizeguide', file: 'size-guide.html', priority: 0.5, changefreq: 'monthly', public: true },
  { path: '/offers',         page: 'offers',    file: 'offers.html',   priority: 0.6, changefreq: 'weekly',  public: true },
  { path: '/search',         page: 'search',    file: 'search.html',   priority: 0.2, changefreq: 'monthly', public: false },
  { path: '/privacy',        page: 'privacy',   file: 'privacy.html',  priority: 0.3, changefreq: 'monthly', public: true },
  { path: '/terms',          page: 'terms',     file: 'terms.html',    priority: 0.3, changefreq: 'monthly', public: true },
  { path: '/product',        page: 'product',   file: 'product.html',  priority: 0.9, changefreq: 'weekly',  public: true, template: true },
  { path: '/cart',           page: 'cart',      file: 'cart.html',     priority: 0.2, changefreq: 'monthly', public: false },
  { path: '/checkout',       page: 'checkout',  file: 'checkout.html', priority: 0.2, changefreq: 'monthly', public: false }
];

/** Generate product routes from the live catalog (slugs are the canonical URLs). */
export function productRoutes(products) {
  return (products || []).filter(p => p.active !== false).map((p, i) => ({
    path: '/product?id=' + encodeURIComponent(p.slug || p.id),
    page: 'product',
    id: p.id,
    slug: p.slug || p.id,
    name: { ar: p.ar, fr: p.fr, en: p.en },
    price: p.price,
    roses: p.qty,
    priority: Math.max(0.5, 0.9 - i * 0.01),
    changefreq: 'weekly',
    public: true
  }));
}

export default ROUTES;
