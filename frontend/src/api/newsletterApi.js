export async function newsletterPreview({ propertyId, mode, threshold }) {
  const res = await fetch("/api/newsletter/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyId, mode, threshold }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Preview error");
  return data;
}

export async function newsletterSend({ propertyId, mode, threshold, testEmail }) {
  const res = await fetch("/api/newsletter/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyId, mode, threshold, testEmail }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Send error");
  return data;
}
