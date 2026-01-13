"use client";

import { useMemo, useState } from "react";

export default function AnalyzedImagesPage() {
  const [images, setImages] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanedImages = useMemo(
    () => images.map((x) => x.trim()).filter(Boolean),
    [images]
  );

  const canAnalyze = cleanedImages.length > 0 && !loading;

  const addField = () => setImages((prev) => [...prev, ""]);

  const removeField = (idx: number) => {
    setImages((prev) => {
      const copy = [...prev];
      copy.splice(idx, 1);
      return copy.length ? copy : [""];
    });
  };

  const setField = (idx: number, value: string) => {
    setImages((prev) => {
      const copy = [...prev];
      copy[idx] = value;
      return copy;
    });
  };

  const analyze = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      if (cleanedImages.length === 0) {
        throw new Error("Dodaj przynajmniej 1 link do zdjęcia.");
      }

      const res = await fetch("/api/analyzed-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: cleanedImages }),
      });

      const text = await res.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.error ?? data?.detail ?? "Błąd analizy AI");
      }

      if (!data?.result) {
        throw new Error("Brak analizy AI (puste result).");
      }

      setResult(String(data.result));
    } catch (err: any) {
      setError(err?.message || "Błąd analizy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--text-main)" }}
          >
            🤖 Analiza zdjęć nieruchomości (AI)
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Wklej linki do zdjęć. AI opisze standard, mocne/słabe strony i sugestie do ogłoszenia.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Kpi label="Wszystkie pola" value={images.length} tone="neutral" />
          <Kpi label="Gotowe linki" value={cleanedImages.length} tone="mint" />
          <Kpi label="Status" value={loading ? "Analiza€¦" : "Gotowe"} tone="blue" />
        </div>
      </div>

      {/* FORM CARD */}
      <section
        className="mt-7 rounded-2xl p-6 md:p-7"
        style={{
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(15,23,42,0.10)",
          boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
        }}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: "rgba(15,23,42,0.60)" }}>
              Zdjć™cia
            </div>
            <div className="mt-1 text-lg font-black" style={{ color: "#0f172a" }}>
              Linki do fotografii
            </div>
            <div className="mt-1 text-sm" style={{ color: "rgba(15,23,42,0.66)" }}>
              Możesz dodać kilka zdjęć (np. salon, kuchnia, łazienka, elewacja).
            </div>
          </div>

          <button onClick={addField} style={pillBtn} disabled={loading} title="Dodaj kolejne pole">
             Dodaj
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3">
          {images.map((img, i) => {
            const val = img ?? "";
            const isValidUrl = /^https?:\/\/\S+/i.test(val.trim());

            return (
              <div
                key={i}
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(15,23,42,0.03)",
                  border: "1px solid rgba(15,23,42,0.10)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-extrabold" style={{ color: "rgba(15,23,42,0.65)" }}>
                    Zdjć™cie {i + 1}
                  </div>

                  <button
                    onClick={() => removeField(i)}
                    disabled={loading}
                    className="rounded-xl px-3 py-2 text-xs font-extrabold"
                    style={{
                      background: "rgba(239,68,68,0.10)",
                      border: "1px solid rgba(239,68,68,0.22)",
                      color: "rgba(185,28,28,0.95)",
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.6 : 1,
                    }}
                    title="Usuń„ to pole"
                  >
                   
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px] md:items-center">
                  <input
                    value={val}
                    onChange={(e) => setField(i, e.target.value)}
                    placeholder={`Wklej link do zdjęcia (https://...)`}
                    className="w-full"
                    style={inputLight}
                    disabled={loading}
                  />

                  <div
                    className="rounded-xl overflow-hidden"
                    style={{
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "rgba(255,255,255,0.70)",
                      height: 86,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "rgba(15,23,42,0.55)",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                    title={isValidUrl ? "Podgląd" : "Wklej poprawny link"}
                  >
                    {isValidUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={val.trim()}
                        alt={`preview-${i}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          // jeśli obraz się nie ładuje, pokaż fallback
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      "Podgląd"
                    )}
                  </div>
                </div>

                {!val.trim() ? null : (
                  <div className="mt-2 text-xs" style={{ color: isValidUrl ? "rgba(15,23,42,0.65)" : "rgba(185,28,28,0.95)" }}>
                    {isValidUrl ? "… Link wygląda ok" : " To nie wygląda na poprawny URL (powinno zaczynać się od http/https)"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={analyze}
          disabled={!canAnalyze}
          className="mt-5 w-full rounded-2xl py-4 text-sm font-extrabold"
          style={{
            background: canAnalyze ? "rgba(45,212,191,0.18)" : "rgba(15,23,42,0.06)",
            border: canAnalyze ? "1px solid rgba(45,212,191,0.40)" : "1px solid rgba(15,23,42,0.12)",
            color: "#0f172a",
            cursor: canAnalyze ? "pointer" : "not-allowed",
          }}
        >
          {loading ? " Analiza w toku¦" : " Analizuj AI"}
        </button>

        {error ? (
          <div
            className="mt-4 rounded-2xl p-4 text-sm font-semibold"
            style={{
              background: "rgba(239,68,68,0.10)",
              border: "1px solid rgba(239,68,68,0.22)",
              color: "rgba(185,28,28,0.95)",
              whiteSpace: "pre-wrap",
            }}
          >
           {error}
          </div>
        ) : null}
      </section>

      {/* RESULT */}
      {result ? (
        <section
          className="mt-6 rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.96)",
            border: "1px solid rgba(15,23,42,0.10)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
          }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: "rgba(15,23,42,0.60)" }}>
                Wynik
              </div>
              <div className="mt-1 text-lg font-black" style={{ color: "#0f172a" }}>
             
              </div>
            </div>

            <button
              onClick={() => navigator.clipboard.writeText(result)}
              style={pillBtn}
              title="Skopiuj wynik do schowka"
            >
              Kopiuj
            </button>
          </div>

          <div
            className="mt-4 rounded-2xl p-5"
            style={{
              background: "rgba(15,23,42,0.03)",
              border: "1px solid rgba(15,23,42,0.10)",
              maxHeight: 520,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowWrap: "break-word",
                color: "#0f172a",
              }}
            >
              {result}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

/* ===== UI bits ===== */

const inputLight: React.CSSProperties = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 14,
  border: "1px solid rgba(15,23,42,0.12)",
  background: "rgba(255,255,255,0.70)",
  color: "#0f172a",
  outline: "none",
};

const pillBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "var(--text-main)",
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "neutral" | "mint" | "blue";
}) {
  const toneStyle: Record<string, React.CSSProperties> = {
    neutral: {
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.05)",
      color: "var(--text-main)",
    },
    mint: {
      border: "1px solid rgba(45,212,191,0.30)",
      background: "rgba(45,212,191,0.10)",
      color: "rgba(234,255,251,0.95)",
    },
    blue: {
      border: "1px solid rgba(29,78,216,0.30)",
      background: "rgba(29,78,216,0.10)",
      color: "rgba(224,232,255,0.95)",
    },
  };

  return (
    <div className="rounded-2xl px-4 py-3" style={toneStyle[tone]}>
      <div className="text-xs font-extrabold opacity-90">{label}</div>
      <div className="mt-1 text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
}
