/**
 * Canonical chrome model — the navigation, footer and press data
 * shared by every page. The runtime renderer (public/assets/js/ui.js)
 * and the SEO generators both derive from this model.
 */
export const NAV = [
  { key: 'nav_home', href: 'index.html', page: 'home' },
  { key: 'nav_shop', href: 'shop.html', page: 'shop' },
  { key: 'nav_track', href: 'track.html', page: 'track' },
  { key: 'nav_about', href: 'about.html', page: 'about' },
  { key: 'nav_contact', href: 'contact.html', page: 'contact' }
];

export const PRESS = ['The Style Journal', 'LUXE', 'ÉLÉGANCE', 'La Fleur', 'Maison Chic', 'VOGUE MAROC'];

export const FOOTER = {
  brandLine: { ar: 'صُنع بحب في طنجة، المغرب', fr: 'Fait avec amour à Tanger, Maroc', en: 'Made with love in Tangier, Morocco' },
  columns: [
    { title: 'shop', links: ['nav_shop', 'nav_track'] },
    { title: 'house', links: ['nav_about', 'nav_contact'] }
  ],
  admin: 'admin/index.html'
};

export const CONTACT = {
  whatsapp: '212612345678',
  city: 'Tangier, Morocco',
  geo: { lat: 35.7595, lng: -5.8340 },
  hours: 'Mo-Su 09:00-20:00',
  areaServed: 'Tangier'
};

export default { NAV, PRESS, FOOTER, CONTACT };
