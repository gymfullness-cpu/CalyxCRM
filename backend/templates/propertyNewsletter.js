function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPLN(value) {
  if (typeof value !== "number") return "";
  return value.toLocaleString("pl-PL") + " zł";
}

function buildPropertyEmail({ property, unsubscribeUrl }) {
  const subject = `Nowa nieruchomość: ${property.title || "oferta"}`;

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111; max-width: 640px;">
    <h2 style="margin: 0 0 8px 0;">${escapeHtml(property.title || "Nowa oferta")}</h2>

    <div style="margin: 0 0 14px 0; color:#333;">
      <b>Cena:</b> ${escapeHtml(formatPLN(property.price))}<br/>
      <b>Lokalizacja:</b> ${escapeHtml(property.city || "")}${property.district ? ", " + escapeHtml(property.district) : ""}<br/>
      <b>Metraż:</b> ${escapeHtml(property.area)} m²<br/>
      <b>Pokoje:</b> ${escapeHtml(property.rooms)}
    </div>

    ${
      property.imageUrl
        ? `<img src="${escapeHtml(property.imageUrl)}" alt="Nieruchomość" style="width:100%; border-radius: 12px; margin: 0 0 14px 0;" />`
        : ""
    }

    ${
      Array.isArray(property.features) && property.features.length
        ? `<div style="margin: 0 0 14px 0;">
            <b>Udogodnienia:</b> ${escapeHtml(property.features.join(", "))}
          </div>`
        : ""
    }

    <a href="${escapeHtml(property.url || "#")}"
       style="display:inline-block; padding: 12px 16px; background:#111; color:#fff; border-radius: 10px; text-decoration:none;">
      Zobacz ofertę
    </a>

    <div style="margin-top: 20px; font-size: 12px; color:#666;">
      Jeśli nie chcesz otrzymywać takich wiadomości:
      <a href="${escapeHtml(unsubscribeUrl || "#")}" style="color:#666;">wypisz się</a>
    </div>
  </div>
  `;

  return { subject, html };
}

module.exports = { buildPropertyEmail };
