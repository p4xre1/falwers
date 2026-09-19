/**
 * Head partial builders used by scripts/optimize-ai-seo.mjs.
 * Every block is wrapped in a marker comment so injection stays idempotent.
 *
 * Facts (telephone, price range, opening hours) are passed in from the live
 * catalog by the caller — never hardcoded here, so generated JSON-LD can't drift
 * from the storefront the way it did when the phone number changed.
 */
export const MARK = {
  geo: '<!-- RBM-SEO:GEO -->',
  jsonld: '<!-- RBM-SEO:JSONLD -->',
  canonical: '<!-- RBM-SEO:CANONICAL -->'
};

/** Detects an equivalent tag already hand-written into a page (marker-less). */
export const HAS = {
  geo: h => /name="geo\.region"/i.test(h),
  jsonld: h => /"@type":\s*"Store"/.test(h),
  canonical: h => /rel="canonical"/i.test(h)
};

export function geoBlock(site) {
  return `${MARK.geo}
<meta name="geo.region" content="${site.geo.region}">
<meta name="geo.placename" content="${site.geo.placename}">
<meta name="ICBM" content="${site.geo.lat}, ${site.geo.lng}">
<meta property="og:locale" content="ar_MA">
<meta property="og:locale:alternate" content="fr_MA">
<meta property="og:locale:alternate" content="en_MA">`;
}

export function jsonLdBlock(site, opts) {
  const o = opts || {};
  const store = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': site.url + '/#store',
    name: site.name,
    description: site.tagline.en,
    url: site.url + '/',
    image: site.url + '/og-image.jpg',
    telephone: o.telephone || '',
    priceRange: o.priceRange || '',
    currenciesAccepted: site.currency || 'MAD',
    paymentAccepted: 'Cash on delivery',
    address: { '@type': 'PostalAddress', addressLocality: 'Tangier', addressRegion: 'Tanger-Tetouan-Al Hoceima', addressCountry: 'MA' },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
    areaServed: { '@type': 'City', name: 'Tangier' },
    openingHours: o.hours || 'Mo-Su 09:00-21:00'
  };
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': site.url + '/#website',
    url: site.url + '/',
    name: site.name,
    inLanguage: ['ar', 'fr', 'en'],
    publisher: { '@id': site.url + '/#store' }
  };
  return `${MARK.jsonld}
<script type="application/ld+json">${JSON.stringify(store)}</script>
<script type="application/ld+json">${JSON.stringify(website)}</script>`;
}

export function canonicalBlock(url) {
  return `${MARK.canonical}\n<link rel="canonical" href="${url}">`;
}
export default { MARK, HAS, geoBlock, jsonLdBlock, canonicalBlock };
