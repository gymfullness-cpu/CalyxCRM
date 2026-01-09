const express = require("express");
const router = express.Router();

const { buildPropertyEmail } = require("../templates/propertyNewsletter");
const { sendEmail } = require("../services/emailService");

// =========================
// A) PODMIEN TE 3 FUNKCJE NA SWOJE DANE Z GOTOWYCH ZAKŁADEK
// =========================

// 1) Kontakty: [{ id, email, name, marketingConsent, unsubscribedAt }]
async function dbGetContacts() {
  // TODO: PODMIEN na Twoją bazę Kontakty
  return [
    { id: "c1", email: "jan@example.com", name: "Jan", marketingConsent: true, unsubscribedAt: null },
    { id: "c2", email: "ania@example.com", name: "Ania", marketingConsent: true, unsubscribedAt: null },
  ];
}

// 2) Leady: [{ id, contactId?, email?, prefs: { city, district, type, priceMin, priceMax, areaMin, rooms, mustHave[] } }]
async function dbGetLeads() {
  // TODO: PODMIEN na Twoją bazę Leady
  return [
    {
      id: "l1",
      contactId: "c1",
      email: "jan@example.com",
      prefs: { city: "Warszawa", district: "Mokotów", type: "mieszkanie", priceMax: 1200000, areaMin: 50, rooms: 3, mustHave: ["balkon"] },
    },
  ];
}

// 3) Nieruchomość: { id, title, city, district, type, price, area, rooms, features[], imageUrl, url }
async function dbGetPropertyById(propertyId) {
  // TODO: PODMIEN na Twoją bazę Nieruchomości
  return {
    id: propertyId,
    title: "Nowa oferta: 3 pokoje, Mokotów",
    city: "Warszawa",
    district: "Mokotów",
    type: "mieszkanie",
    price: 1150000,
    area: 62,
    rooms: 3,
    features: ["balkon", "winda"],
    imageUrl: "https://via.placeholder.com/800x450.png?text=Nieruchomosc",
    url: "https://twoja-apka/oferta/" + propertyId,
  };
}

// =========================
// B) DOPASOWANIE (score)
// =========================
function scoreLeadToProperty(prefs, property) {
  let score = 0;
  if (!prefs || !property) return 0;

  if (prefs.city && property.city === prefs.city) score += 20;
  if (prefs.district && property.district === prefs.district) score += 10;

  if (prefs.type && property.type === prefs.type) score += 15;

  const min = prefs.priceMin ?? null;
  const max = prefs.priceMax ?? null;
  if (min !== null || max !== null) {
    const lo = min ?? 0;
    const hi = max ?? Number.MAX_SAFE_INTEGER;
    if (property.price >= lo && property.price <= hi) score += 25;
    else {
      const mid = (lo + hi) / 2;
      const dist = Math.abs(property.price - mid);
      const penalty = Math.min(25, Math.floor(dist / 1000));
      score += Math.max(0, 25 - penalty);
    }
  }

  if (prefs.areaMin && property.area >= prefs.areaMin) score += 10;
  if (prefs.rooms && property.rooms === prefs.rooms) score += 10;

  const must = Array.isArray(prefs.mustHave) ? prefs.mustHave : [];
  if (must.length > 0) {
    const hits = must.filter((m) => (property.features || []).includes(m)).length;
    score += Math.round((hits / must.length) * 10);
  }

  return Math.min(100, score);
}

async function buildRecipients({ mode, threshold, property }) {
  const contacts = await dbGetContacts();
  const safeContacts = contacts.filter(
    (c) => c.email && c.marketingConsent === true && !c.unsubscribedAt
  );

  if (mode === "all") {
    return safeContacts.map((c) => ({ ...c, matchScore: null }));
  }

  const leads = await dbGetLeads();
  const leadByContactId = new Map();
  const leadByEmail = new Map();

  for (const l of leads) {
    if (l.contactId) leadByContactId.set(l.contactId, l);
    if (l.email) leadByEmail.set(String(l.email).toLowerCase(), l);
  }

  const thr = typeof threshold === "number" ? threshold : 65;

  const matched = [];
  for (const c of safeContacts) {
    const lead = leadByContactId.get(c.id) || leadByEmail.get(String(c.email).toLowerCase());
    if (!lead?.prefs) continue;

    const s = scoreLeadToProperty(lead.prefs, property);
    if (s >= thr) matched.push({ ...c, matchScore: s });
  }

  matched.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  return matched;
}

// =========================
// C) ROUTES
// =========================

// POST /api/newsletter/preview
// body: { propertyId, mode: "all"|"matched", threshold? }
router.post("/preview", async (req, res) => {
  try {
    const { propertyId, mode, threshold } = req.body || {};
    if (!propertyId) return res.status(400).json({ error: "Brak propertyId" });

    const property = await dbGetPropertyById(propertyId);
    if (!property) return res.status(404).json({ error: "Nie znaleziono nieruchomości" });

    const recipients = await buildRecipients({
      mode: mode === "matched" ? "matched" : "all",
      threshold: typeof threshold === "number" ? threshold : 65,
      property,
    });

    const unsubscribeUrl = "https://twoja-domena/unsubscribe"; // TODO: podmień kiedy będziesz mieć wypisywanie
    const { subject, html } = buildPropertyEmail({ property, unsubscribeUrl });

    res.json({
      subject,
      html,
      recipientsCount: recipients.length,
      sampleRecipients: recipients.slice(0, 5).map((r) => ({
        email: r.email,
        name: r.name,
        matchScore: r.matchScore,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Błąd preview" });
  }
});

// POST /api/newsletter/send
// body: { propertyId, mode: "all"|"matched", threshold?, testEmail? }
router.post("/send", async (req, res) => {
  try {
    const { propertyId, mode, threshold, testEmail } = req.body || {};
    if (!propertyId) return res.status(400).json({ error: "Brak propertyId" });

    const property = await dbGetPropertyById(propertyId);
    if (!property) return res.status(404).json({ error: "Nie znaleziono nieruchomości" });

    const unsubscribeUrl = "https://twoja-domena/unsubscribe"; // TODO
    const { subject, html } = buildPropertyEmail({ property, unsubscribeUrl });

    // Jeśli testEmail jest podany -> wysyłamy TYLKO test
    if (testEmail) {
      await sendEmail({ to: testEmail, subject: "[TEST] " + subject, html });
      return res.json({ ok: true, sent: 1, test: true });
    }

    const recipients = await buildRecipients({
      mode: mode === "matched" ? "matched" : "all",
      threshold: typeof threshold === "number" ? threshold : 65,
      property,
    });

    if (recipients.length === 0) {
      return res.json({ ok: true, sent: 0, message: "Brak odbiorców (sprawdź consent/unsubscribe/threshold)" });
    }

    // Wysyłka prosta (po kolei). Na później damy kolejkę (BullMQ).
    let sent = 0;
    const failed = [];

    for (const r of recipients) {
      try {
        await sendEmail({ to: r.email, subject, html });
        sent++;
      } catch (err) {
        failed.push({ email: r.email, error: err.message || "send failed" });
      }
    }

    res.json({ ok: true, sent, failedCount: failed.length, failed });
  } catch (e) {
    res.status(500).json({ error: e.message || "Błąd send" });
  }
});

module.exports = router;
