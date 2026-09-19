# 🌸 Buyer Journey Audits — Salma (best friend) & Youssef (wife)

*Persona walkthrough performed on the real code — every tap traced, the final WhatsApp message captured byte-for-byte.*
**Result: 3 critical bugs found & FIXED today (one was silently killing orders with extras). 169/169 tests green.**

---

## 💔 The 3 bugs Salma's journey exposed (all fixed)

### 🚨 Bug 1 — Orders with extras died in silence (THE money bug)
Any cart containing **تاج / دانتيل / بطاقة إهداء** crashed at the exact moment of pressing
«إرسال الطلب عبر واتساب»: no success page, no WhatsApp opened, no error shown.
Salma fills her whole address, presses send… **nothing**. She never comes back.
*Cause: the order message builder converted `addons` to text, then re-read it as an array.*
**Fix:** order items keep `pid`/`colorId`/`price`; message builder accepts both shapes. Regression-locked in `test-persona.mjs` (10 checks).

### 🚨 Bug 2 — The shop owner never received the COLOR
The WhatsApp message skipped «اللون: وردي» completely. For a made-to-order rose shop, the owner had to ask every customer "which color?" — friction on every single order.
**Fix:** color now travels into the message (and `pid` into admin charts).

### 🚨 Bug 3 — Line prices showed «2 × 0 DH»
Item lines in the WhatsApp message showed 0 DH (price field was dropped).
**Fix:** lines now show real math: `2 × 110 DH = 220 DH`, total `240 DH` — consistent.

---

## 🗺️ The normal path (as it works now, on her phone)

| Step | What Salma does | What she feels |
|------|-----------------|----------------|
| 1. Enter | Lands on home — dark-luxe, gold rose, «وردٌ لا يذبول… وذكرى تبقى», +500 bouquets proof, 10%-off ROSE10 popup after ~7s | "وينو الحلو؟" 😍 |
| 2. Orient | Occasions chips (عيد ميلاد) or الأكثر مبيعاً grid — color dots under every flower, tap pink → flower recolors | playful ✨ |
| 3. Product | باقة أمور — picks color (circles), adds تاج +20, writes card text, qty stepper, sees «اطلبي قبل 16:00» + COD + exchange line, **أضيفي إلى السلة** | safe to buy |
| 4. Cart | Reviews line (art + color + extras), free-shipping bar «أضيفي 260 DH…», applies ROSE10 → −10%, cross-sell chips «أكملي هديتك», **إتمام الطلب** | smart shopper 🧠 |
| 5. Checkout | One-screen form: name / phone / city+address / delivery zone (طنجة — 20 DH) / optional date / notes — order summary beside her, COD note under the button | low effort |
| 6. Send | Presses «إرسال الطلب عبر واتساب» → success panel with **order ID (RBM-XXXX)** + WhatsApp opens **pre-filled** (below) + copy fallback + track link | done in ~60s |
| 7. Pay | Pays **cash when the bouquet arrives** — zero risk | 💐 |

### 📱 The exact WhatsApp message she now sends
```
----------------------------------------
🌹 *طلب جديد من المتجر - Rose by Marry*
🆔 RBM-MU7S6QLH
----------------------------------------
🛍 *العناصر:*
1) باقة أمور
   • اللون: وردي
   • الإضافات: تاج (+20)، بطاقة
   • 💌: عيد ميلاد سعيد يا غالية
   • 2 × 110 DH = 220 DH
----------------------------------------
🚚 *التوصيل:* طنجة (20 DH)
• *الاسم الكامل:* سلمى العلوي
• *الهاتف:* 0612345678
• *المدينة / العنوان:* طنجة - المغازنة، عمارة 12
• *ملاحظات:* يفضل التوصيل بعد الخامسة مساءً
• *طريقة الدفع:* الدفع عند الاستلام (COD)
💰 *المبلغ الإجمالي:* 240 DH
----------------------------------------
```

---

## 💅 What's still missing — Salma's honest wishlist (recommendations, not yet built)

| # | Missing | Her words | Where |
|---|---------|-----------|-------|
| **1** | **وردي / أبيض / ليلكي colors** 🌸 | "3 colors? Where is PINK? It's roses!" | Admin → Colors → add hex (`#E5699B` وردي, `#F6F1EB` أبيض, `#B9A7D9` ليلكي) — 1 minute, no code needed |
| **2** | **Bouquet size/dimensions** | "10 roses — how big? Will it fit on a desk?" | add one line to product descriptions (e.g. height ~35cm) |
| **3** | **Share button** (WhatsApp) | "I need my sister's opinion before paying!" | product page: `wa.me/?text=<link>` |
| **4** | **Reply-time promise** | "Did they see my order??" | after-submit text: «بنردو عادة في أقل من 15 دقيقة» |
| **5** | **Real photos** | "SVG is pretty, but show me the REAL bouquet" | 1–2 real photos per hero product (Instagram exports) |
| **6** | FAQ link near the buy button | "Can I change the address later?" | already have faq.html — just surface it on product page |

*Everything else she tried — search, wishlist, reviews, urgency pill, 404 → shop recovery, track order, theme switch, 3 languages — just worked.*

---

# 💍 Part 2 — "Youssef, 34, Tangier" buys an anniversary surprise for his wife

## His journey, step by step
1. **Enter** — home. Skips the popup, ignores browsing: he searches the occasions strip → **ذكرى**
2. **shop?occ=anniv** → exactly 4 choices: القلب الملكي · المربع المخملي · علبة القلب · باقة الحب ✓
3. **القلب الملكي 180 DH** — picks **أحمر داكن** (her favorite), adds gift card: «كل سنة وانتي حياتي يا نادية»
4. **Checkout** — fills his address, notes «مفاجأة الذكرى — اتصلوا قبلي»
5. **🎁 NEW: gift checkbox** — «طلب هدية — تغليف مفاجأة بدون فاتورة داخل العلبة»
6. **WhatsApp message** now tells the owner everything, including the surprise instruction:

```
🌹 *طلب جديد من المتجر - Rose by Marry*
🆔 RBM-XXXXX
----------------------------------------
🎁 *طلب هدية!* من فضلكم تغليف فاخر بدون فاتورة أو بطاقة أسعار داخل التغليف.
🛍 *العناصر:*
1) القلب الملكي
   • اللون: أحمر داكن
   • الإضافات: بطاقة
   • 💌: كل سنة وانتي حياتي يا نادية
   • 1 × 180 DH = 180 DH
...
💰 *المبلغ الإجمالي:* 200 DH
```

## What HIS journey exposed → built today
| Gap | Fix |
|-----|-----|
| **No way to say "it's a surprise"** — owner might put the invoice in the box 💀 | ✅ Gift checkbox at checkout → gold dashed box, emoji-free label (v5 rule), 🎁 line in the WA template, `gift:true` saved, **«هدية» chip in admin orders** |
| Anniversary entry point | ✓ already worked (occ strip + filter, 4 products) |

**Result: 178/178 tests green** (9 new husband checks).
Still on the wishlist for him: same-day cutoff reminder on the anniversary date field, and a "call me before delivery" checkbox (now he types it in notes).
