'use strict';
/* ============================================================
   Rose by Marry v2 — data layer (shared by all pages)
   LocalStorage + IndexedDB mirror + memory fallback. No backend.
   ============================================================ */

/* ---------- generic helpers ---------- */
function debounce(fn, ms) { let t; return function () { clearTimeout(t); const a = arguments, c = this; t = setTimeout(() => fn.apply(c, a), ms); }; }
function uid() { return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function clampNum(n, a, b) { n = Number(n); if (!isFinite(n)) n = a; return Math.min(b, Math.max(a, n)); }
function isHexColor(h) { return typeof h === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h.trim()); }
function sanitize(str, max) {
  max = max || 300;
  return String(str == null ? '' : str)
    .replace(/<[^>]*>/g, '')
    .replace(/[&<>"'`]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s{3,}/g, '  ')
    .trim()
    .slice(0, max);
}
function sanitizeDigits(str, max) { return String(str == null ? '' : str).replace(/[^\d]/g, '').slice(0, max || 16); }
function hex2rgb(h) { h = h.trim().replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgb2hex(r, g, b) { return '#' + [r, g, b].map(v => Math.round(clampNum(v, 0, 255)).toString(16).padStart(2, '0')).join(''); }
function mix(h, h2, tt) { const a = hex2rgb(h), b = hex2rgb(h2); return rgb2hex(a[0] + (b[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * tt, a[2] + (b[2] - a[2]) * tt); }
function lighten(h, tt) { return mix(h, '#ffffff', tt); }
function darken(h, tt) { return mix(h, '#000000', tt); }
async function hashPass(pw) {
  const salted = 'rbm::' + String(pw);
  try {
    if (window.crypto && crypto.subtle && typeof crypto.subtle.digest === 'function') {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salted));
      return 's2:' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {}
  let h = 5381;
  for (let i = 0; i < salted.length; i++) { h = ((h << 5) + h + salted.charCodeAt(i)) | 0; }
  return 'fb:' + (h >>> 0).toString(16) + ':' + salted.length;
}

/* ---------- safe storage ---------- */
const MEM = {};
let canLS = false;
try { localStorage.setItem('__rbm_t', '1'); localStorage.removeItem('__rbm_t'); canLS = true; } catch (e) { canLS = false; }
const store = {
  get(k) { if (canLS) { try { return localStorage.getItem(k); } catch (e) {} } return Object.prototype.hasOwnProperty.call(MEM, k) ? MEM[k] : null; },
  set(k, v) { if (canLS) { try { localStorage.setItem(k, v); return; } catch (e) {} } MEM[k] = v; },
  del(k) { if (canLS) { try { localStorage.removeItem(k); } catch (e) {} } delete MEM[k]; }
};
function idbSave(data) {
  try {
    if (!('indexedDB' in window)) return;
    const open = indexedDB.open('rbm_db2', 1);
    open.onupgradeneeded = () => { try { open.result.createObjectStore('kv'); } catch (e) {} };
    open.onsuccess = () => {
      try { const tx = open.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(data, 'state'); tx.oncomplete = () => { try { open.result.close(); } catch (e) {} }; }
      catch (e) { try { open.result.close(); } catch (e2) {} }
    };
    open.onerror = () => {};
  } catch (e) {}
}
function idbLoad() {
  return new Promise((res) => {
    let done = false;
    const finish = v => { if (!done) { done = true; res(v); } };
    try {
      if (!('indexedDB' in window)) return finish(null);
      const open = indexedDB.open('rbm_db2', 1);
      open.onupgradeneeded = () => { try { open.result.createObjectStore('kv'); } catch (e) {} };
      open.onsuccess = () => {
        try { const g = open.result.transaction('kv', 'readonly').objectStore('kv').get('state'); g.onsuccess = () => { finish(g.result || null); try { open.result.close(); } catch (e) {} }; g.onerror = () => finish(null); }
        catch (e) { finish(null); }
      };
      open.onerror = () => finish(null);
      setTimeout(() => finish(null), 1500);
    } catch (e) { finish(null); }
  });
}

/* ---------- default catalog ---------- */
const STATE_KEY = 'rbm_v2_state';
function defaultState() {
  return {
    version: 2,
    settings: { whatsapp: '212772966980', currency: 'DH', siteUrl: '', passHash: null, freeShip: 500, builderUnit: 9, instagram: '', tiktok: '', gaId: '', adminUser: 'marry', plugins: { welcome: true, proof: true, petals: true, waFloat: true, blog: true } },
    categories: [
      { id: 'bouq', icon: '', ar: 'باقات الورد', fr: 'Bouquets', en: 'Bouquets' },
      { id: 'box', icon: '', ar: 'علب الورد', fr: 'Boîtes de roses', en: 'Rose Boxes' },
      { id: 'occ', icon: '', ar: 'المناسبات', fr: 'Occasions', en: 'Occasions' },
      { id: 'gift', icon: '', ar: 'هدايا مفردة', fr: 'Cadeaux', en: 'Gifts' }
    ],
    products: [
      { id: 'amour', cat: 'bouq', type: 'bouquet', qty: 10, ar: 'باقة أمور', fr: 'Bouquet Amour', en: 'Amour Bouquet', dar: 'عشر ورود ساتان بلون تختارينه وتغليف يُفتح كهدية فاخرة — الباقة التي تبدأ بها القصص.', dfr: 'Dix roses en satin dans la couleur de votre choix, un emballage qui s’ouvre comme un écrin — le bouquet qui commence les histoires.', den: 'Ten satin roses in the color you choose, wrapped like a jewel box — the bouquet that starts the stories.', price: 90, old: 110, badge: 'best', featured: true, active: true, occ: ['birth', 'thanks'] },
      { id: 'royal', cat: 'bouq', type: 'bouquet', qty: 20, ar: 'القلب الملكي', fr: 'Cœur Royal', en: 'Royal Heart', dar: 'عشرون وردة بحجم يملأ الغرفة — حين تكون المناسبة أكبر من «مجرد ورد».', dfr: 'Vingt roses qui remplissent la pièce — quand l’occasion mérite plus que « juste des fleurs ».', den: 'Twenty roses that fill the room — for moments bigger than “just flowers”.', price: 180, old: 0, badge: '', featured: true, active: true, occ: ['anniv', 'wed'] },
      { id: 'etoile', cat: 'bouq', type: 'bouquet', qty: 15, ar: 'نجمة الدار البيضاء', fr: 'Étoile de Casa', en: 'Casa Star', dar: 'خمس عشرة وردة بلمسة عصرية وتنسيق النجمة الأنيق.', dfr: 'Quinze roses au style moderne, arrangement en étoile.', den: 'Fifteen roses with a modern star-shaped arrangement.', price: 150, old: 0, badge: 'new', featured: false, active: true, occ: ['wed', 'grad'] },
      { id: 'mini', cat: 'bouq', type: 'bouquet', qty: 5, ar: 'ميني روز', fr: 'Mini Rosé', en: 'Mini Rosé', dar: 'خمس ورود ناعمة لبداية حلوة أو اهتمام صغير بلا مناسبة.', dfr: 'Cinq roses tendres pour une douce attention.', den: 'Five tender roses for a sweet little gesture.', price: 45, old: 60, badge: 'promo', featured: false, active: true, occ: ['baby'] },
      { id: 'carre', cat: 'box', type: 'box', qty: 9, ar: 'العلبة المربعة', fr: 'Boîte Carrée', en: 'Square Box', dar: 'تسع ورود ساتان في علبة مربعة أنيقة بقماش المخمل.', dfr: 'Neuf roses satin dans une boîte carrée en velours.', den: 'Nine satin roses in an elegant velvet square box.', price: 160, old: 0, badge: 'best', featured: true, active: true, occ: ['anniv'] },
      { id: 'coeur', cat: 'box', type: 'box', qty: 12, ar: 'علبة القلب', fr: 'Boîte Cœur', en: 'Heart Box', dar: 'اثنتا عشرة وردة على شكل قلب — لقول «أحبك» دون كلمة واحدة.', dfr: 'Douze roses en forme de cœur — pour dire « je t’aime » sans un seul mot.', den: 'Twelve heart-shaped roses — to say “I love you” without a single word.', price: 220, old: 260, badge: 'promo', featured: false, active: true, occ: ['anniv', 'birth'] },
      { id: 'luxe', cat: 'box', type: 'box', qty: 25, ar: 'صندوق الفخامة', fr: 'Coffret Luxe', en: 'Luxe Coffret', dar: 'خمس وعشرون وردة في صندوق فخم — تحفة فنية متكاملة.', dfr: 'Vingt-cinq roses dans un coffret grand luxe.', den: 'Twenty-five roses in a grand luxe coffret.', price: 350, old: 0, badge: 'new', featured: false, active: true, occ: ['wed', 'grad'] },
      { id: 'valentin', cat: 'occ', type: 'bouquet', qty: 30, ar: 'باكة عيد الحب', fr: 'Pack Saint-Valentin', en: 'Valentine Pack', dar: 'ثلاثون وردة حمراء بفراشات وتاج — إعلان حب لا يُنسى.', dfr: 'Trente roses rouges, papillons et couronne — déclaration inoubliable.', den: 'Thirty red roses with butterflies and crown — an unforgettable declaration.', price: 300, old: 350, badge: 'best', featured: true, active: true, occ: ['anniv'] },
      { id: 'mariage', cat: 'occ', type: 'bouquet', qty: 50, ar: 'طقم العروسين', fr: 'Ensemble Mariés', en: 'Wedding Set', dar: 'خمسون وردة بيضاء وعنابية ليوم لا يتكرر.', dfr: 'Cinquante roses blanches et bordeaux pour le grand jour.', den: 'Fifty white and burgundy roses for the big day.', price: 550, old: 0, badge: '', featured: false, active: true, occ: ['wed'] },
      { id: 'anniv', cat: 'occ', type: 'bouquet', qty: 12, ar: 'هدية عيد الميلاد', fr: 'Cadeau Anniversaire', en: 'Birthday Gift', dar: 'اثنتا عشرة وردة ملونة مع فراشات لجعل أعياد الميلاد أجمل.', dfr: 'Douze roses colorées avec papillons pour fêter comme il se doit.', den: 'Twelve colorful roses with butterflies to celebrate right.', price: 140, old: 0, badge: '', featured: false, active: true, occ: ['birth'] },
      { id: 'single', cat: 'gift', type: 'single', qty: 1, ar: 'وردة مفردة', fr: 'Rose Unique', en: 'Single Rose', dar: 'وردة واحدة بعنق مزخرف تحمل ما تعجز الرسائل الطويلة: «أفكر فيك».', dfr: 'Une rose à tige ornée qui porte ce que les longs messages ne peuvent pas dire : « je pense à toi ».', den: 'One rose on an ornate stem, carrying what long messages can’t: “thinking of you”.', price: 15, old: 0, badge: '', featured: true, active: true, occ: ['thanks'] },
      { id: 'papillon', cat: 'gift', type: 'gift', qty: 6, ar: 'فراشات ساتان ×6', fr: 'Papillons Satin ×6', en: 'Satin Butterflies ×6', dar: 'ست فراشات ساتان لتزيين الهدايا والحلويات.', dfr: 'Six papillons en satin pour décorer cadeaux et douceurs.', den: 'Six satin butterflies to adorn gifts and treats.', price: 30, old: 0, badge: '', featured: false, active: true, occ: ['birth', 'baby'] },
      { id: 'cadre', cat: 'gift', type: 'gift', qty: 1, ar: 'إطار الإهداء', fr: 'Cadre Cadeau', en: 'Gift Frame', dar: 'إطار مزخرف، وردة ساتان، وبطاقة بخط اليد — هدية تُعلَّق ولا تُنسى.', dfr: 'Un cadre orné, une rose en satin, une carte écrite à la main — un cadeau qu’on accroche et qu’on n’oublie pas.', den: 'An ornate frame, a satin rose, a handwritten card — a gift they hang, and never forget.', price: 65, old: 80, badge: 'promo', featured: false, active: true, occ: ['thanks', 'grad'] }
    ],
    colors: [
      { id: 'blue', ar: 'أزرق', fr: 'Bleu', en: 'Blue', hex: '#3A5FA8', available: true },
      { id: 'red', ar: 'أحمر', fr: 'Rouge', en: 'Red', hex: '#C8102E', available: true },
      { id: 'darkred', ar: 'أحمر داكن', fr: 'Rouge foncé', en: 'Dark Red', hex: '#6E1423', available: true },
      { id: 'tblue', ar: 'أزرق طنجة', fr: 'Bleu Tanger', en: 'Tangier Blue', hex: '#1E6FA8', available: true },
      { id: 'tpink', ar: 'وردي طنجة', fr: 'Rose Tanger', en: 'Tangier Pink', hex: '#E5699B', available: true }
    ],
    addons: [
      { id: 'butterfly', icon: '', ar: 'فراشات (فراشات)', fr: 'Papillons (Fraschat)', en: 'Butterflies (Fraschat)', price: 5, hasText: false, enabled: true },
      { id: 'crown', icon: '', ar: 'تاج', fr: 'Couronne (Taj)', en: 'Crown (Taj)', price: 20, hasText: false, enabled: true },
      { id: 'lace', icon: '', ar: 'دانتيل', fr: 'Dentelle', en: 'Lace', price: 25, hasText: false, enabled: true },
      { id: 'card', icon: '', ar: 'شريط / بطاقة إهداء', fr: 'Ruban / Carte-message', en: 'Ribbon / Gift Card', price: 0, hasText: true, enabled: true }
    ],
    builderTiers: [
      { id: 'b1', qty: 1, price: 10 }, { id: 'b5', qty: 5, price: 45 }, { id: 'b10', qty: 10, price: 90 },
      { id: 'b15', qty: 15, price: 135 }, { id: 'b20', qty: 20, price: 180 }, { id: 'b30', qty: 30, price: 270 }
    ],
    zones: [
      { id: 'tanger', ar: 'طنجة', fr: 'Tanger', en: 'Tangier', fee: 20 }
    ],
    promoCodes: [
      { id: 'p1', code: 'ROSE10', type: 'percent', value: 10, minTotal: 0, enabled: true, used: 0 },
      { id: 'p2', code: 'WELCOME50', type: 'fixed', value: 50, minTotal: 300, enabled: true, used: 0 }
    ],
    reviews: [
      { id: 'r1', pid: 'amour', name: 'Salma B.', rating: 5, text: 'الباقة كانت أجمل من الصور! التغليف راقٍ جداً والتوصيل سريع.', ts: Date.now() - 86400000 * 3 },
      { id: 'r2', pid: 'amour', name: 'Yasmine', rating: 5, text: 'Des roses magnifiques, ma mère les a adorées. Merci !', ts: Date.now() - 86400000 * 6 },
      { id: 'r3', pid: 'carre', name: 'Khadija R.', rating: 4, text: 'العلبة أنيقة جداً، الورد ناعم كالحرير فعلاً.', ts: Date.now() - 86400000 * 9 },
      { id: 'r4', pid: 'valentin', name: 'Mehdi', rating: 5, text: 'Commandé pour la Saint-Valentin, livraison à l\'heure et effet garanti', ts: Date.now() - 86400000 * 12 },
      { id: 'r5', pid: 'single', name: 'Aya', rating: 5, text: 'وردة واحدة كانت كافية لإسعاد صديقتي. فكرة رائعة!', ts: Date.now() - 86400000 * 15 },
      { id: 'r6', pid: 'coeur', name: 'Nadia', rating: 4, text: 'La boîte cœur est superbe, très bon rapport qualité-prix.', ts: Date.now() - 86400000 * 20 },
      { id: 'r7', pid: 'royal', name: 'Omar T.', rating: 5, text: 'طلبتها لعرس أختي — الجميع سأل عن المتجر. شكراً Rose by Marry.', ts: Date.now() - 86400000 * 26 },
      { id: 'r8', pid: 'papillon', name: 'Lina', rating: 5, text: 'Les papillons sont adorables, parfaits sur les gâteaux.', ts: Date.now() - 86400000 * 32 }
    ],
    articles: [
      { id: 'a1', slug: 'satin-roses-what-why', keyword: 'ورد الساتان', tags: ['ورد الساتان', 'دليل'],
        title: { ar: 'ورد الساتان: ما هو ولماذا لا يذبول؟', fr: 'Roses en satin : quoi, pourquoi et comment elles ne fanent pas', en: 'Satin roses: what they are and why they never wilt' },
        desc: { ar: 'كل ما تحتاجين معرفته عن ورد الساتان: كيف يُصنع يدوياً، لماذا تبقى سنة كاملة، وكيف تعتني به ليصل معك سنوات.', fr: 'Tout savoir sur les roses en satin : fabrication artisanale, durée de vie et entretien.', en: 'Everything about satin roses: how they are handmade, why they last a year, and how to care for them.' },
        body: { ar: 'ورد الساتان هو ورد صناعي مصنوع يدوياً من قماش الساتان الفاخر، تُلف كل وردة حول ساق مزخرفة بإيقاع حرفي دقيق. على عكس الورد الطبيعي، لا يحتاج ماءً ولا ضوءاً، ويحتفظ بلونه وملمس الحرير سنة كاملة وأكثر.\n\nتُصنع كل وردة في ورشتنا بطنجة على يد صانعة توقّع عملها — لذلك ستجدين فروقاً طفيفة وبحوراً في التفاصيل تمنح كل باقة شخصيتها الخاصة. اخترنا أقمشة عالية الجودة لا بهتان لها، ونربط الباقات بشرائط عنابية تليق بالمناسبة.\n\nللعناية بالباقة: ابتعديها عن الشمس المباشرة والرطوبة، ونفخة هواء خفيفة كل فترة تعيدها كجديدة. بهذا البسيط، تبقى هديتك كما وصلت في يومها الأول — ذكرى لا تذبول.', fr: 'La rose en satin est une fleur artisanale façonnée à la main dans un satin de luxe, chaque tête étant roulée autour d’une tige décorée. Contrairement à la rose naturelle, elle ne demande ni eau ni lumière et garde sa couleur et son toucher de soie un an et plus.\n\nChaque rose est réalisée dans notre atelier de Tanger par une artisane qui signe son travail — de légères variations font le charme et le caractère de chaque bouquet. Nous sélectionnons des tissus haut de gamme qui ne décolorent pas et nouons le tout avec un ruban bordeaux digne de l’occasion.\n\nPour l’entretenir : à l’abri du soleil direct et de l’humidité, un souffle d’air léger de temps en temps et elle redevient comme neuve. Votre cadeau reste comme au premier jour — un souvenir qui ne fane pas.', en: 'A satin rose is a handmade fabric flower crafted from luxury satin, each head rolled by hand around a decorated stem. Unlike fresh roses, it needs no water or light and keeps its color and silky touch for a full year and more.\n\nEvery rose is made in our Tangier workshop by an artisan who signs her work — slight variations give each bouquet its own character. We select high-grade fabrics that never fade and tie the bouquets with a burgundy ribbon worthy of the occasion.\n\nTo care for it: keep it away from direct sunlight and humidity, and a gentle puff of air now and then makes it look new again. Your gift stays exactly as it arrived — a memory that never wilts.' },
        ts: 1758000000000, published: true, views: 0,
        faq: [ { q: 'كم تبقى ورود الساتان؟', a: 'سنة كاملة وأكثر مع عناية بسيطة — بلا ماء ولا ضوء.' }, { q: 'هل يمكن غسل الباقة؟', a: 'لا — يكفي نفخة هواء خفيفة لإزالة الغبار.' } ],
        image: { url: 'img/editorial-blush.jpg', alt: 'ورود ساتان وردية بتغليف فاخر من ورشة Rose by Marry في طنجة' } },
      { id: 'a2', slug: 'gift-ideas-tangier', keyword: 'هدايا طنجة', tags: ['هدايا طنجة', 'عيد ميلاد', 'ذكرى'],
        title: { ar: 'أفكار هدايا مميزة في طنجة لعيد ميلاد أو ذكرى', fr: 'Idées cadeaux originales à Tanger pour un anniversaire ou un souvenir', en: 'Special gift ideas in Tangier for a birthday or anniversary' },
        desc: { ar: 'محتارة في هدية تفرح قلبك في طنجة؟ خمس أفكار مجرّبة تناسب كل الميزانيات — من الوردة الواحدة إلى الطقم الملكي.', fr: 'Une hésitation pour faire plaisir à Tanger ? Cinq idées testées pour tous les budgets — de la rose unique au coffret royal.', en: 'Unsure how to make someone happy in Tangier? Five tried ideas for every budget — from a single rose to the royal set.' },
        body: { ar: 'أجمل الهدايا ليست الأغلى، بل الأكثر تفصيلاً. في طنجة، الهدية الناجحة تجمع ثلاثة عناصر: لمسة شخصية، تغليف يليق بالمناسبة، ووصول في الوقت المحدد.\n\nللبدايات الصغيرة: الوردة المفردة بعنق مزخرف تكفي لتقول «أفكر فيك». للمواليد والتهاني الخفيفة: فراشات الساتان أو خمس ورود ناعمة. وللمناسبات الكبيرة — ذكرى، خطوبة، أو عيد ميلاد لا يُنسى: علبة القلب بست عشرة وردة أو القلب الملكي بعشرين وردة يتركان أثراً لا يُنسى.\n\nوالسر الأخير: أضيفي بطاقة إهداء بخط اليد بكلمة من قلبك — كلمة واحدة أحياناً تساوي أكثر من عشر ورود. اطلبي قبل الساعة الرابعة عصراً ويصلك اليوم نفسه داخل طنجة، والدفع عند الاستلام.', fr: 'Les plus beaux cadeaux ne sont pas les plus chers, mais les plus personnalisés. À Tanger, un cadeau réussi réunit trois éléments : une touche personnelle, un emballage digne de l’occasion et une livraison à l’heure.\n\nPour les petites attentions : la rose unique à tige ornée dit « je pense à toi ». Pour les félicitations : les papillons en satin ou cinq roses tendres. Pour les grands moments — souvenir, fiançailles ou anniversaire inoubliable : la boîte cœur de seize roses ou le Cœur Royal de vingt roses laissent une trace.\n\nEt le dernier secret : ajoutez une carte écrite à la main, un seul mot vaut parfois dix roses. Commandez avant 16h, livraison le jour même à Tanger, paiement à la réception.', en: 'The best gifts are not the most expensive — they are the most personal. In Tangier, a successful gift brings three things together: a personal touch, wrapping worthy of the occasion, and delivery exactly on time.\n\nFor small gestures: a single ornate-stem rose says “thinking of you”. For congratulations: satin butterflies or five tender roses. For the big moments — anniversaries, engagements, unforgettable birthdays: the sixteen-rose heart box or the twenty-rose Royal Heart leave a lasting mark.\n\nThe final secret: add a handwritten card — one word is sometimes worth ten roses. Order before 4 PM and it arrives the same day in Tangier, cash on delivery.' },
        ts: 1758100000000, published: true, views: 0 },
      { id: 'a3', slug: 'choose-bouquet-color', keyword: 'لون الباقة', tags: ['ألوان', 'دليل', 'مناسبات'],
        title: { ar: 'كيف تختارين لون باقة الورد المناسبة للمناسبة؟', fr: 'Comment choisir la couleur du bouquet selon l’occasion', en: 'How to choose the right bouquet color for every occasion' },
        desc: { ar: 'أحمر للعشق، وردي للتهنئة، أبيض للأعراس، أزرق طنجة للتفرد — دليل سريع لألوان باقات الساتان ومعانيها.', fr: 'Rouge pour la passion, rose pour la félicitation, blanc pour le mariage — le guide rapide des couleurs.', en: 'Red for love, pink for congratulations, white for weddings — the quick guide to bouquet colors.' },
        body: { ar: 'اللون أول ما تلاحظينه في الباقة قبل عدد الورود — وكل لون يحمل رسالة. الأحمر كلاسيكية لا تخطئ: عشق وشغف. الأحمر الداكن أرقى وأكثر عمقاً، مناسب للذكرى والحوافز الكبيرة.\n\nالوردي — وخصوصاً «وردي طنجة» المستوحى من بيغانفيليا المدينة — خيار التهاني اللطيفة: مولود، نجاح، أو عيد ميلاد صديقة. الأبيض لغة الأعراس والصفاء، و«أزرق طنجة» مثل أبواب القصبة يمنح باقة هادئة ومختلفة لمن تحب التفرد.\n\nنصيحة أخيرة: إذا كانت الباقة هدية لمنزل بلون غالب، اختاري لوناً يكمله. ويمكنك تجربة كل الألوان مباشرة على صفحة المنتج — انقر الدوائر وشاهدي الباقة تتلون أمامك قبل أن تطلبيها.', fr: 'La couleur est la première chose que l’on remarque, avant même le nombre de roses — et chaque couleur porte un message. Le rouge est l’incontournable de la passion ; le rouge foncé, plus profond, convient aux grands souvenirs.\n\nLe rose — surtout le « rose Tanger » inspiré des bougainvilliers de la ville — est le choix des douces félicitations : naissance, réussite, anniversaire d’amie. Le blanc parle de mariage et de pureté, et le « bleu Tanger », comme les portes de la Casbah, offre un bouquet calme et singulier.\n\nDernier conseil : si le bouquet rejoint un intérieur coloré, choisissez une teinte qui le complète. Et vous pouvez tester chaque couleur sur la fiche produit — touchez les pastilles et voyez le bouquet se colorer avant de commander.', en: 'Color is the first thing anyone notices — before the number of roses — and every color carries a message. Red is the classic of passion; deep red is richer and suits big anniversaries.\n\nPink — especially “Tangier Pink”, inspired by the city’s bougainvillea — is the gentle congratulations choice: a newborn, a success, a friend’s birthday. White speaks of weddings and purity, and “Tangier Blue”, like the Kasbah doors, gives a calm, one-of-a-kind bouquet.\n\nFinal tip: if the gift is going into a colorful home, pick a shade that complements it. And you can try every color right on the product page — tap the dots and watch the bouquet recolor before you order.' },
        ts: 1758200000000, published: true, views: 0 }
    ],
    orders: [],
    faq: []
  };
}
function slugify(t) {
  return sanitize(String(t || ''), 60).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0153/g, 'oe')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/^-+|-+$/g, '');
}
function migrate(p) {
  const d = defaultState();
  if (!p || typeof p !== 'object') return d;
  const s = Object.assign({}, d, p);
  s.settings = Object.assign({}, d.settings, p.settings || {});
  s.settings.whatsapp = sanitizeDigits(s.settings.whatsapp, 16) || d.settings.whatsapp;
  s.settings.currency = sanitize(s.settings.currency, 8) || 'DH';
  s.settings.siteUrl = sanitize(s.settings.siteUrl, 200);
  s.settings.freeShip = clampNum(Number(s.settings.freeShip) || 500, 0, 100000);
  s.settings.builderUnit = clampNum(Number(s.settings.builderUnit) || 9, 0.5, 1000);
  s.settings.instagram = sanitize(s.settings.instagram, 200);
  s.settings.tiktok = sanitize(s.settings.tiktok, 200);
  s.settings.gaId = sanitize(s.settings.gaId, 40);
  s.settings.adminUser = sanitize(s.settings.adminUser, 30) || 'marry';
  s.settings.lastLogin = clampNum(Math.round(Number(s.settings.lastLogin)) || 0, 0, 4102444800000);
  s.settings.failCount = clampNum(Math.round(Number(s.settings.failCount)) || 0, 0, 9999);
  s.settings.plugins = Object.assign({ welcome: true, proof: true, petals: true, waFloat: true, blog: true }, (s.settings.plugins && typeof s.settings.plugins === 'object') ? s.settings.plugins : {});
  if (typeof s.settings.mcpToken !== 'string' || s.settings.mcpToken.length < 8) s.settings.mcpToken = 'rbm_' + Math.random().toString(36).slice(2, 12);
  if (typeof s.settings.passHash !== 'string') s.settings.passHash = null;
  s.categories = (Array.isArray(p.categories) && p.categories.length ? p.categories : d.categories).map(c => ({
    id: String(c && c.id || uid()), icon: sanitize(c && c.icon, 8) || '',
    ar: sanitize(c && c.ar, 40) || 'فئة', fr: sanitize(c && c.fr, 40), en: sanitize(c && c.en, 40)
  }));
  s.products = (Array.isArray(p.products) && p.products.length ? p.products : d.products).map(x => ({
    id: String(x && x.id || uid()), cat: String(x && x.cat || 'bouq'), type: ['bouquet', 'box', 'single', 'gift'].indexOf(x && x.type) >= 0 ? x.type : 'bouquet',
    qty: clampNum(Math.round(Number(x && x.qty)), 1, 999),
    ar: sanitize(x && x.ar, 60) || 'منتج', fr: sanitize(x && x.fr, 60), en: sanitize(x && x.en, 60),
    dar: sanitize(x && x.dar, 400), dfr: sanitize(x && x.dfr, 400), den: sanitize(x && x.den, 400),
    price: clampNum(Number(x && x.price), 0, 100000), old: clampNum(Number(x && x.old), 0, 100000),
    badge: ['', 'new', 'best', 'promo'].indexOf(x && x.badge) >= 0 ? x.badge : '',
    slug: slugify((x && x.fr) || (x && x.en) || (x && x.ar) || (x && x.id)),
    featured: !!(x && x.featured), active: x ? !!x.active : true,
    occ: (Array.isArray(x && x.occ) ? x.occ : []).map(v => String(v || '')).filter(v => ['birth', 'anniv', 'wed', 'grad', 'baby', 'thanks'].indexOf(v) >= 0).slice(0, 6)
  }));
  s.colors = (Array.isArray(p.colors) && p.colors.length ? p.colors : d.colors).map(c => ({
    id: String(c && c.id || uid()), ar: sanitize(c && c.ar, 40) || 'لون', fr: sanitize(c && c.fr, 40), en: sanitize(c && c.en, 40),
    hex: isHexColor(c && c.hex) ? c.hex : '#C8102E', available: !!(c && c.available)
  }));
  s.addons = (Array.isArray(p.addons) && p.addons.length ? p.addons : d.addons).map(a => ({
    id: String(a && a.id || uid()), icon: sanitize(a && a.icon, 8) || '',
    ar: sanitize(a && a.ar, 50) || 'إضافة', fr: sanitize(a && a.fr, 50), en: sanitize(a && a.en, 50),
    price: clampNum(Number(a && a.price), 0, 10000), hasText: !!(a && a.hasText), enabled: !!(a && a.enabled)
  }));
  s.builderTiers = (Array.isArray(p.builderTiers) && p.builderTiers.length ? p.builderTiers : d.builderTiers).map(x => ({
    id: String(x && x.id || uid()), qty: clampNum(Math.round(Number(x && x.qty)), 1, 999), price: clampNum(Number(x && x.price), 0, 100000)
  }));
  s.zones = (Array.isArray(p.zones) && p.zones.length ? p.zones : d.zones).map(z => ({
    id: String(z && z.id || uid()), ar: sanitize(z && z.ar, 40) || 'منطقة', fr: sanitize(z && z.fr, 40), en: sanitize(z && z.en, 40),
    fee: clampNum(Number(z && z.fee), 0, 10000)
  })).filter(z => z.id === 'tanger');
  if (!s.zones.length) s.zones = d.zones.slice();
  s.faq = (Array.isArray(p.faq) ? p.faq : (d.faq || [])).slice(0, 10).map(f => ({
    q: { ar: sanitize(f && f.q && f.q.ar, 200), fr: sanitize(f && f.q && f.q.fr, 200), en: sanitize(f && f.q && f.q.en, 200) },
    a: { ar: sanitize(f && f.a && f.a.ar, 800), fr: sanitize(f && f.a && f.a.fr, 800), en: sanitize(f && f.a && f.a.en, 800) }
  })).filter(x => x.q.ar);
  s.promoCodes = (Array.isArray(p.promoCodes) ? p.promoCodes : d.promoCodes).map(c => ({
    id: String(c && c.id || uid()), code: sanitize(c && c.code, 20).toUpperCase() || 'CODE',
    type: c && c.type === 'fixed' ? 'fixed' : 'percent', value: clampNum(Number(c && c.value), 0, 100000),
    minTotal: clampNum(Number(c && c.minTotal), 0, 100000), enabled: !!(c && c.enabled), used: clampNum(Math.round(Number(c && c.used)), 0, 1000000)
  }));
  s.discounts = (Array.isArray(p.discounts) ? p.discounts : []).slice(0, 50).map(c => ({
    id: String(c && c.id || uid()), type: c && c.type === 'fixed' ? 'fixed' : 'percent',
    value: clampNum(Number(c && c.value), 0, 100000), minTotal: clampNum(Number(c && c.minTotal), 0, 100000),
    enabled: !!(c && c.enabled)
  }));
  const normCounts = v => {
    const o = {};
    if (v && typeof v === 'object') for (const k of Object.keys(v)) {
      const key = sanitize(k, 80), n = clampNum(Math.round(Number(v[k])), 0, 100000000);
      if (key && n > 0) o[key] = n;
    }
    return o;
  };
  s.pageviews = normCounts(p.pageviews);
  s.prodViews = normCounts(p.prodViews);
  s.reviews = (Array.isArray(p.reviews) ? p.reviews : []).slice(0, 1000).map(r => ({
    id: String(r && r.id || uid()), pid: String(r && r.pid || ''), name: sanitize(r && r.name, 40) || '—',
    rating: clampNum(Math.round(Number(r && r.rating)), 1, 5), text: sanitize(r && r.text, 400), ts: Number(r && r.ts) || Date.now()
  }));
  s.articles = (Array.isArray(p.articles) && p.articles.length ? p.articles : d.articles).slice(0, 300).map(a => {
    const tA = sanitize(a && a.title && a.title.ar, 140), tF = sanitize(a && a.title && a.title.fr, 140), tE = sanitize(a && a.title && a.title.en, 140);
    return {
      id: String(a && a.id || uid()),
      slug: sanitize(a && a.slug, 90) || slugify(tF || tE || tA || uid()),
      title: { ar: tA || 'مقال', fr: tF, en: tE },
      desc: { ar: sanitize(a && a.desc && a.desc.ar, 220), fr: sanitize(a && a.desc && a.desc.fr, 220), en: sanitize(a && a.desc && a.desc.en, 220) },
      body: { ar: sanitize(a && a.body && a.body.ar, 30000), fr: sanitize(a && a.body && a.body.fr, 30000), en: sanitize(a && a.body && a.body.en, 30000) },
      tags: (Array.isArray(a && a.tags) ? a.tags : []).map(x => sanitize(x, 30)).filter(Boolean).slice(0, 6),
      keyword: sanitize(a && a.keyword, 60),
      ts: clampNum(Math.round(Number(a && a.ts)) || Date.now(), 0, 4102444800000),
      published: a ? a.published !== false : true,
      views: clampNum(Math.round(Number(a && a.views)) || 0, 0, 10000000),
      faq: (Array.isArray(a && a.faq) ? a.faq : []).slice(0, 6).map(f => ({ q: sanitize(f && f.q, 200), a: sanitize(f && f.a, 600) })).filter(x => x.q && x.a),
      image: { url: sanitize(a && a.image && a.image.url, 300), alt: sanitize(a && a.image && a.image.alt, 140) }
    };
  });
  s.orders = (Array.isArray(p.orders) ? p.orders : []).slice(0, 1000).map(o => ({
    id: String(o && o.id || uid()), ts: Number(o && o.ts) || Date.now(),
    status: ['new', 'confirmed', 'delivered', 'cancelled'].indexOf(o && o.status) >= 0 ? o.status : 'new',
    name: sanitize(o && o.name, 60), phone: sanitize(o && o.phone, 20), city: sanitize(o && o.city, 160),
    zoneName: sanitize(o && o.zoneName, 40), zoneFee: clampNum(Number(o && o.zoneFee), 0, 10000),
    items: Array.isArray(o && o.items) ? o.items.slice(0, 50).map(it => ({
      pid: String((it && it.pid) || ''), name: sanitize(it && it.name, 80), qty: clampNum(Math.round(Number(it && it.qty)), 1, 999),
      color: sanitize(it && it.color, 40), addons: sanitize(it && it.addons, 200), note: sanitize(it && it.note, 120),
      price: clampNum(Number(it && it.price), 0, 100000)
    })) : [],
    promo: sanitize(o && o.promo, 20), discount: clampNum(Number(o && o.discount), 0, 100000),
    date: sanitize(o && o.date, 20), note: sanitize(o && o.note, 240),
    total: clampNum(Number(o && o.total), 0, 1000000), currency: sanitize(o && o.currency, 8) || 'DH'
  }));
  return s;
}
function loadState() {
  const raw = store.get(STATE_KEY);
  if (raw) { try { return migrate(JSON.parse(raw)); } catch (e) {} }
  /* one-time upgrade from v1 single-file store: keep merchant settings */
  try {
    const v1 = store.get('rbm_state_v1');
    if (v1) {
      const o = JSON.parse(v1);
      if (o && o.settings) {
        const s = defaultState();
        s.settings.whatsapp = sanitizeDigits(o.settings.whatsapp, 16) || s.settings.whatsapp;
        s.settings.currency = sanitize(o.settings.currency, 8) || s.settings.currency;
        s.settings.passHash = typeof o.settings.passHash === 'string' ? o.settings.passHash : null;
        saveStateTo(s);
        return s;
      }
    }
  } catch (e) {}
  return defaultState();
}
function saveStateTo(state) { store.set(STATE_KEY, JSON.stringify(state)); idbSave(state); }
function saveState() { saveStateTo(S); }

var S = loadState();
var lang = store.get('rbm_lang') || 'ar';

/* ---------- cart & wishlist (per-browser, outside merchant data) ---------- */
function loadArr(key) { try { const v = JSON.parse(store.get(key) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
var CART = {
  items: loadArr('rbm_cart_v2'),
  save() { store.set('rbm_cart_v2', JSON.stringify(this.items)); },
  count() { return this.items.reduce((n, it) => n + it.qty, 0); },
  find(pid) { return this.items.filter(it => it.pid === pid); },
  add(item) {
    /* merge identical lines (same product/color/addons/note) */
    const sig = it => [it.pid, it.colorId, (it.addons || []).slice().sort().join(','), it.note || ''].join('|');
    const same = this.items.find(it => sig(it) === sig(item));
    if (same) same.qty = clampNum(same.qty + item.qty, 1, 999);
    else this.items.push(item);
    this.save();
  },
  setQty(key, n) { const it = this.items.find(x => x.key === key); if (it) { it.qty = clampNum(n, 1, 999); this.save(); } },
  remove(key) { this.items = this.items.filter(x => x.key !== key); this.save(); },
  clear() { this.items = []; this.save(); }
};
var WISH = {
  ids: loadArr('rbm_wishlist_v2'),
  save() { store.set('rbm_wishlist_v2', JSON.stringify(this.ids)); },
  has(pid) { return this.ids.indexOf(pid) >= 0; },
  toggle(pid) { this.ids = this.has(pid) ? this.ids.filter(x => x !== pid) : this.ids.concat([pid]); this.save(); return this.has(pid); }
};

/* ---------- shared pricing & lookups ---------- */
function prodById(pid) { return S.products.find(p => p.id === pid) || null; }
function colorById(cid) { return S.colors.find(c => c.id === cid) || null; }
function addonById(aid) { return S.addons.find(a => a.id === aid) || null; }
function zoneById(zid) { return S.zones.find(z => z.id === zid) || null; }
function prodName(p) { return (lang === 'fr' && p.fr) ? p.fr : (lang === 'en' && p.en) ? p.en : p.ar; }
function prodDesc(p) { return (lang === 'fr' && p.dfr) ? p.dfr : (lang === 'en' && p.den) ? p.den : p.dar; }
function catName(c) { return (lang === 'fr' && c.fr) ? c.fr : (lang === 'en' && c.en) ? c.en : c.ar; }
function colorName(c) { return (lang === 'fr' && c.fr) ? c.fr : (lang === 'en' && c.en) ? c.en : c.ar; }
function addonName(a) { return (lang === 'fr' && a.fr) ? a.fr : (lang === 'en' && a.en) ? a.en : a.ar; }
function zoneName(z) { return (lang === 'fr' && z.fr) ? z.fr : (lang === 'en' && z.en) ? z.en : z.ar; }
function money(n) { return (Number(n) % 1 === 0 ? Number(n) : Number(n).toFixed(2)) + ' ' + S.settings.currency; }
function prodRating(pid) {
  const rs = S.reviews.filter(r => r.pid === pid);
  if (!rs.length) return { avg: 0, n: 0 };
  return { avg: rs.reduce((s, r) => s + r.rating, 0) / rs.length, n: rs.length };
}
function itemUnitPrice(it) {
  let base = 0;
  if (it.custom) base = Number(it.custom.price) || 0;
  else { const p = prodById(it.pid); base = p ? Number(p.price) : 0; }
  if (Array.isArray(it.addons)) for (const aid of it.addons) { const a = addonById(aid); if (a) base += Number(a.price) || 0; }
  return base;
}
function cartSubtotal() { return CART.items.reduce((s, it) => s + itemUnitPrice(it) * it.qty, 0); }
