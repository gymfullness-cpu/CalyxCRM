import React, { useMemo, useState } from "react";
import { newsletterPreview, newsletterSend } from "../api/newsletterApi";

export default function EmailNewsletterTab() {
  const [propertyId, setPropertyId] = useState("");
  const [mode, setMode] = useState("all"); // all | matched
  const [threshold, setThreshold] = useState(65);
  const [testEmail, setTestEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const canPreview = useMemo(() => propertyId.trim().length > 0, [propertyId]);

  async function onPreview() {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await newsletterPreview({
        propertyId: propertyId.trim(),
        mode,
        threshold: mode === "matched" ? Number(threshold) : undefined,
      });
      setPreview(data);
    } catch (e) {
      setError(e.message);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  async function onSend(isTest) {
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const data = await newsletterSend({
        propertyId: propertyId.trim(),
        mode,
        threshold: mode === "matched" ? Number(threshold) : undefined,
        testEmail: isTest ? testEmail.trim() : undefined,
      });
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Email Newsletter</h2>

      <div style={{ display: "grid", gap: 8, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, color: "#444" }}>ID nieruchomości (z zakładki Nieruchomości)</label>
          <input
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            placeholder="np. 123 albo uuid"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="radio"
              name="mode"
              checked={mode === "all"}
              onChange={() => setMode("all")}
            />
            Wyślij do wszystkich kontaktów
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="radio"
              name="mode"
              checked={mode === "matched"}
              onChange={() => setMode("matched")}
            />
            Wyślij dopasowanym (leady)
          </label>

          {mode === "matched" && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#444" }}>Próg dopasowania:</span>
              <input
                type="number"
                value={threshold}
                min={0}
                max={100}
                onChange={(e) => setThreshold(e.target.value)}
                style={{ width: 80, padding: 8, borderRadius: 10, border: "1px solid #ddd" }}
              />
              <span style={{ fontSize: 12, color: "#666" }}>(0–100)</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            disabled={!canPreview || loading}
            onClick={onPreview}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" }}
          >
            Podgląd
          </button>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@email.pl"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", minWidth: 220 }}
            />
            <button
              disabled={!canPreview || loading || !testEmail.trim()}
              onClick={() => onSend(true)}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #111", background: "#fff" }}
            >
              Wyślij TEST
            </button>
          </div>

          <button
            disabled={!canPreview || loading}
            onClick={() => onSend(false)}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #c00", background: "#c00", color: "#fff" }}
          >
            Wyślij do klientów
          </button>
        </div>

        {error && (
          <div style={{ background: "#ffecec", color: "#900", padding: 10, borderRadius: 10 }}>
            {error}
          </div>
        )}
      </div>

      {preview && (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>Temat</div>
              <div style={{ fontWeight: 600 }}>{preview.subject}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>Odbiorcy</div>
              <div style={{ fontWeight: 600 }}>{preview.recipientsCount}</div>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Przykładowi odbiorcy</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {(preview.sampleRecipients || []).map((r) => (
                <li key={r.email}>
                  {r.email} {r.matchScore != null ? `(score: ${r.matchScore})` : ""}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Podgląd HTML</div>
            <div
              style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, overflow: "auto" }}
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
          </div>
        </div>
      )}

      {result && (
        <div style={{ border: "1px solid #e6ffe6", background: "#f2fff2", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700 }}>Wynik</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
