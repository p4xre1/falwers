/**
 * Product card component contract (matches the runtime renderer).
 * Used by generators to build AI-readable product summaries.
 */
export function productCard(p, colorHex) {
  return {
    id: p.id,
    slug: p.slug || p.id,
    url: '/product?id=' + encodeURIComponent(p.slug || p.id),
    name: { ar: p.ar, fr: p.fr, en: p.en },
    description: { ar: p.dar, fr: p.dfr, en: p.den },
    roses: p.qty,
    price: { amount: p.price, currency: 'MAD' },
    oldPrice: p.old || null,
    color: colorHex || '#C8102E',
    badge: p.badge || null,
    featured: !!p.featured
  };
}
export default productCard;
