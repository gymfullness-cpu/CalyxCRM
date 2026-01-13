?"use client";

import { useEffect, useMemo, useState } from "react";

type MarketItem = {
  id: number;
  portal: string;
  title?: string;
  price?: number;
  area?: number;
  pricePerM2?: number;
  city?: string;
  district?: string;

  // score może być‡ stary (0-100) albo nowy (1-10) — obsłużymy oba
  score?: number;

  // … NOWE: wyświetlenia (jeśli masz w danych)
  views?: number;

  url?: string;
  description?: string;
  pros?: string[];
  cons?: string[];
  recommendation?: string;
};

function fmtMoney(v?: number) {
  if (v === undefined || v === null) return "—";
  return `${v.toLocaleString("pl-PL")} zł`;
}

function fmtNum(v?: number) {
  if (v === undefined || v === null) return "—";
  return v.toLocaleString("pl-PL");
}

function safeArr(v?: string[]) {
  return Array.isArray(v) ? v.filter(Boolean) : [];
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// … score 1—10: jeśli w danych masz 0—100 -> przeliczamy na 1—10
function score10(raw?: number): number | null {
  if (typeof raw !== "number" || Number.isNaN(raw)) return null;

  // jeśli ktoś już zapisuje 1—10
  if (raw >= 1 && raw <= 10) return Math.round(raw);

  // jeśli stary format 0—100
  if (raw >= 0 && raw <= 100) {
    const s = Math.round((raw / 100) * 10);
    return clamp(s === 0 ? 1 : s, 1, 10);
  }

  // dziwne wartości — znormalizuj
  const s = Math.round(raw);
  return clamp(s, 1, 10);
}

function scoreLabel(s: number) {
  if (s >= 9) return "Wybitna";
  if (s >= 8) return "Bardzo dobra";
  if (s >= 7) return "Dobra";
  if (s >= 6) return "OK / średnia";
  if (s >= 4) return "Słaba";
  return "Ryzykowna";
}

function buildDetailedAnalysis(i: MarketItem) {
  const pros = safeArr(i.pros);
  const cons = safeArr(i.cons);

  const hasPrice = typeof i.price === "number" && i.price > 0;
  const hasArea = typeof i.area === "number" && i.area > 0;
  const hasPPM2 = typeof i.pricePerM2 === "number" && i.pricePerM2 > 0;
  const ppm2 = hasPPM2 ? i.pricePerM2! : hasPrice && hasArea ? i.price! / i.area! : null;

  const s10 = score10(i.score);

  // … Bardziej €śdokładne€ť sekcje oparte o to co już mamy
  const summary: string[] = [];
  if (i.title) summary.push(`Tytuł: ${i.title}`);
  if (i.portal) summary.push(`Portal: ${i.portal}`);
  if (i.city || i.district) summary.push(`Lokalizacja: ${[i.city, i.district].filter(Boolean).join(", ")}`);
  if (hasPrice) summary.push(`Cena: ${fmtMoney(i.price)}`);
  if (hasArea) summary.push(`Metraż: ${fmtNum(i.area)} m˛`);
  if (ppm2) summary.push(`Cena za m˛: ${fmtMoney(Math.round(ppm2))}/m˛`);
  if (typeof i.views === "number") summary.push(`Wyświetlenia: ${fmtNum(i.views)}`);

  const whatToVerify: string[] = [];
  // brak opisu = masa pytań
  if (!i.description) {
    whatToVerify.push("Brak opisu: dopytaj o standard, stan instalacji, rok remontu, wady i co zostaje w cenie.");
  }
  if (!hasPrice) whatToVerify.push("Brak ceny: bez ceny nie da się rzetelnie porównać‡ oferty.");
  if (!hasArea) whatToVerify.push("Brak metrażu: bez metrażu nie policzysz ceny za m˛.");
  if (!i.city) whatToVerify.push("Brak miasta: doprecyzuj lokalizacjć™.");
  if (!i.district) whatToVerify.push("Brak dzielnicy: dopytaj o dokładne położenie i otoczenie.");

  // Pros/cons w €śdokładniejszej€ť formie: wnioski
  const conclusions: string[] = [];

  if (pros.length >= 3) conclusions.push("Plusów jest sporo — oferta wyglć…da na dopracowanć… albo dobrze wycenionć….");
  if (cons.length >= 3) conclusions.push("Jest kilka ryzyk — negocjuj twardo i wymagaj konkretów na piśmie.");
  if (pros.length === 0) conclusions.push("Nie wpisano plusów — dodaj je, żeby szybciej ocenić‡ atrakcyjność‡.");
  if (cons.length === 0) conclusions.push("Nie wpisano minusów — warto je dopisać‡ (to najlepsze argumenty do negocjacji).");

  if (typeof i.views === "number") {
    if (i.views >= 5000) conclusions.push("Bardzo dużo wyświetleń: oferta jest popularna albo cena przycić…ga uwagć™.");
    else if (i.views >= 1500) conclusions.push("Dużo wyświetleń: warto sprawdzić‡, czy nie ma €žukrytego haczyka€ť.");
    else if (i.views <= 200) conclusions.push("Mało wyświetleń: możliwe, że oferta świeża albo słabo opisana/zdjć™cia słabe.");
  }

  if (ppm2) conclusions.push("Cena za m˛ jest policzona — porównaj jć… do podobnych ofert w okolicy.");

  // negocjacje: konkretne ruchy
  const negotiation: string[] = [];
  if (cons.length > 0) negotiation.push("Oprzyj negocjacje o minusy + kosztorys (remont, opłaty, naprawy).");
  if (!i.description) negotiation.push("Najpierw zbierz dane (opis/standard), potem składaj ofertć™ cenowć….");
  if (s10 !== null && s10 <= 5) negotiation.push("Niska ocena: zacznij od mocno niższej oferty i zostaw przestrzeń na kompromis.");
  if (s10 !== null && s10 >= 8) negotiation.push("Wysoka ocena: negocjuj warunki (termin wydania, wyposażenie, drobne rabaty).");
  if (negotiation.length === 0) negotiation.push("Negocjuj konkretem: termin wydania, wyposażenie, koszty stałe, stan techniczny.");

  // pytania do sprzedajć…cego (dokładne)
  const questions: string[] = [
    "Jaki jest stan prawny i czy jest KW?",
    "Jakie sć… miesięczne koszty stałe (czynsz/opłaty/media)?",
    "Kiedy możliwe jest wydanie nieruchomości?",
    "Co zostaje w cenie (meble/AGD)?",
    "Czy były remonty? Kiedy i co dokładnie było robione?",
    "Czy sć… wady/usterki (wilgoć‡, pć™knić™cia, instalacje)?",
  ];

  // dla kogo ta oferta (heurystyka)
  const forWho: string[] = [];
  if (ppm2 && hasPrice) {
    forWho.push("Dla kupujć…cego, który chce szybko porównać‡ oferty cenć…/m˛ i negocjować‡ na liczbach.");
  }
  if (cons.length >= 2) forWho.push("Dla kogoś, kto nie boi się negocjacji i dopinania formalności.");
  if (pros.length >= 2) forWho.push("Dla kupujć…cego, który szuka €žpewniaka€ť i chce ograniczyć‡ ryzyka.");
  if (forWho.length === 0) forWho.push("Dla kupujć…cego, który chce zebrać‡ wić™cej danych i dopiero podjć…ć‡ decyzjć™.");

  return {
    pros,
    cons,
    s10,
    ppm2: ppm2 ? Math.round(ppm2) : null,
    summary,
    conclusions,
    whatToVerify,
    negotiation,
    questions,
    forWho,
  };
}

export default function MarketPage() {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("market") || "[]");
    setItems(saved);
  }, []);

  const persist = (next: MarketItem[]) => {
    setItems(next);
    localStorage.setItem("market", JSON.stringify(next));
  };

  const deleteAnalysis = (id: number) => {
    if (!confirm("Usunć…ć‡ tć™ analizć™ z Market?")) return;
    const next = items.filter((x) => x.id !== id);
    persist(next);
    setOpenId((prev) => (prev === id ? null : prev));
  };

  const S = {
    card: {
      background: "rgba(255,255,255,0.96)",
      border: "1px solid rgba(15,23,42,0.10)",
      boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
      borderRadius: 18,
      padding: 18,
      color: "#0f172a",
    } as const,
    muted: { color: "rgba(15,23,42,0.72)" } as const,
    soft: { color: "rgba(15,23,42,0.86)" } as const,
    label: {
      fontSize: 11,
      fontWeight: 900,
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      color: "rgba(15,23,42,0.55)",
    } as const,
    hr: {
      height: 1,
      background: "rgba(15,23,42,0.10)",
      marginTop: 14,
      marginBottom: 14,
    } as const,
    btn: {
      borderRadius: 12,
      border: "1px solid rgba(15,23,42,0.16)",
      background: "rgba(15,23,42,0.06)",
      color: "#0f172a",
      padding: "10px 12px",
      fontWeight: 900,
      fontSize: 13,
      cursor: "pointer",
    } as const,
    btnLink: {
      borderRadius: 12,
      border: "1px solid rgba(29,78,216,0.28)",
      background: "rgba(29,78,216,0.10)",
      color: "#0f172a",
      padding: "10px 12px",
      fontWeight: 900,
      fontSize: 13,
      textDecoration: "none",
      display: "inline-flex",
      justifyContent: "center",
      alignItems: "center",
    } as const,
    btnDanger: {
      borderRadius: 12,
      border: "1px solid rgba(239,68,68,0.30)",
      background: "rgba(239,68,68,0.10)",
      color: "#0f172a",
      padding: "10px 12px",
      fontWeight: 900,
      fontSize: 13,
      cursor: "pointer",
    } as const,
    boxGood: {
      borderRadius: 14,
      padding: 12,
      border: "1px solid rgba(34,197,94,0.22)",
      background: "rgba(34,197,94,0.10)",
      color: "#0f172a",
    } as const,
    boxWarn: {
      borderRadius: 14,
      padding: 12,
      border: "1px solid rgba(245,158,11,0.24)",
      background: "rgba(245,158,11,0.12)",
      color: "#0f172a",
    } as const,
    boxAi: {
      borderRadius: 14,
      padding: 12,
      border: "1px solid rgba(45,212,191,0.35)",
      background: "rgba(45,212,191,0.14)",
      color: "#0f172a",
    } as const,
    pill: {
      borderRadius: 999,
      padding: "4px 10px",
      fontSize: 12,
      fontWeight: 900,
      border: "1px solid rgba(15,23,42,0.12)",
      background: "rgba(15,23,42,0.05)",
      color: "#0f172a",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      whiteSpace: "nowrap" as const,
    } as const,
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-main)" }}>
          “Š Market
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Analiza ofert rynkowych + wnioski AI
        </p>
      </div>

      {items.length === 0 && (
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--border-soft)",
            color: "var(--text-main)",
          }}
        >
          Brak danych rynkowych.
        </div>
      )}

      {/* GRID */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((i) => {
          const isOpen = openId === i.id;

          const analysis = buildDetailedAnalysis(i);
          const score = analysis.s10;

          return (
            <div key={i.id} style={S.card}>
              {/* TOP */}
              <div className="flex items-start justify-between gap-3">
                <div style={{ minWidth: 0 }}>
                  <div className="text-xs font-extrabold" style={{ color: "rgba(15,23,42,0.62)" }}>
                    {i.portal}
                  </div>
                  <div className="mt-1 text-lg font-black" style={{ color: "#0f172a" }}>
                    {i.title || "Oferta rynkowa"}
                  </div>
                </div>

                {score !== null && (
                  <div
                    className="rounded-full px-3 py-1 text-xs font-extrabold"
                    style={{
                      background:
                        score >= 8 ? "rgba(34,197,94,0.15)" : score >= 6 ? "rgba(245,158,11,0.18)" : "rgba(239,68,68,0.18)",
                      border: "1px solid rgba(15,23,42,0.15)",
                      color: "#0f172a",
                      whiteSpace: "nowrap",
                    }}
                    title={scoreLabel(score)}
                  >
                    ­ {score}/10
                  </div>
                )}
              </div>

              {/* META */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm" style={S.soft}>
                <div>’° {fmtMoney(i.price)}</div>
                <div>“ {i.area ? `${fmtNum(i.area)} m˛` : "—"}</div>
                <div>“Š {analysis.ppm2 ? `${fmtMoney(analysis.ppm2)}/m˛` : "—"}</div>
                <div>
                  “Ť {i.city || "—"}
                  {i.district ? `, ${i.district}` : ""}
                </div>
                <div>‘€ Wyświetlenia: {typeof i.views === "number" ? fmtNum(i.views) : "—"}</div>
                <div>{score !== null ? `🏠·ď¸🏠 ${scoreLabel(score)}` : "🏠·ď¸🏠 Brak oceny"}</div>
              </div>

              {/* SZYBKIE WNIOSKI */}
              <div style={S.hr} />
              <div style={S.label}>Szybkie wnioski</div>
              <ul className="mt-2 space-y-1 text-sm" style={S.muted}>
                {analysis.conclusions.length > 0 ? (
                  analysis.conclusions.slice(0, 4).map((t, idx) => <li key={idx}>€˘ {t}</li>)
                ) : (
                  <li>€˘ Brak wniosków — uzupełnij pros/cons/opis.</li>
                )}
              </ul>

              {/* ACTIONS */}
              <div className="mt-4 flex gap-2">
                {i.url && (
                  <a href={i.url} target="_blank" style={S.btnLink} className="flex-1">
                    ”— Oferta
                  </a>
                )}

                <button
                  onClick={() => setOpenId(isOpen ? null : i.id)}
                  className="flex-1"
                  style={S.btn}
                >
                  {isOpen ? "–˛ Szczegóły" : "–Ľ Szczegóły"}
                </button>
              </div>

              {/* DELETE */}
              <div className="mt-2">
                <button
                  onClick={() => deleteAnalysis(i.id)}
                  style={S.btnDanger}
                  className="w-full"
                  title="Usuwa wpis z Market (localStorage)."
                >
                  —‘ Usuń analizć™
                </button>
              </div>

              {/* DETAILS */}
              {isOpen && (
                <div className="mt-5 text-sm" style={{ color: "#0f172a" }}>
                  {/* Podsumowanie */}
                  <div style={S.label}>Podsumowanie danych</div>
                  <ul className="mt-2 space-y-1" style={S.muted}>
                    {analysis.summary.map((t, idx) => (
                      <li key={idx}>€˘ {t}</li>
                    ))}
                  </ul>

                  <div style={S.hr} />

                  {/* Opis */}
                  <div style={S.label}>Opis ogłoszenia</div>
                  {i.description ? (
                    <p className="mt-2" style={{ color: "rgba(15,23,42,0.82)", lineHeight: 1.55 }}>
                      {i.description}
                    </p>
                  ) : (
                    <p className="mt-2" style={S.muted}>
                      Brak opisu — bez tego analiza jest mniej dokładna.
                    </p>
                  )}

                  <div style={S.hr} />

                  {/* Plusy / minusy */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div style={S.boxGood}>
                      <div className="font-extrabold">… Plusy</div>
                      {analysis.pros.length === 0 ? (
                        <div className="mt-2" style={S.muted}>
                          Brak plusów.
                        </div>
                      ) : (
                        <ul className="mt-2 space-y-1" style={{ color: "rgba(15,23,42,0.86)" }}>
                          {analysis.pros.map((p, idx) => (
                            <li key={idx}>€˘ {p}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div style={S.boxWarn}>
                      <div className="font-extrabold">š ď¸🏠 Minusy / ryzyka</div>
                      {analysis.cons.length === 0 ? (
                        <div className="mt-2" style={S.muted}>
                          Brak minusów.
                        </div>
                      ) : (
                        <ul className="mt-2 space-y-1" style={{ color: "rgba(15,23,42,0.86)" }}>
                          {analysis.cons.map((c, idx) => (
                            <li key={idx}>€˘ {c}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Braki danych */}
                  {analysis.whatToVerify.length > 0 && (
                    <>
                      <div style={S.hr} />
                      <div style={S.label}>Braki / co trzeba zweryfikować‡</div>
                      <ul className="mt-2 space-y-1" style={S.muted}>
                        {analysis.whatToVerify.map((t, idx) => (
                          <li key={idx}>€˘ {t}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div style={S.hr} />

                  {/* Negocjacje */}
                  <div style={S.label}>Strategia negocjacji</div>
                  <ul className="mt-2 space-y-1" style={S.muted}>
                    {analysis.negotiation.map((t, idx) => (
                      <li key={idx}>€˘ {t}</li>
                    ))}
                  </ul>

                  <div style={S.hr} />

                  {/* Pytania */}
                  <div style={S.label}>Pytania do sprzedajć…cego (checklista)</div>
                  <ul className="mt-2 space-y-1" style={S.muted}>
                    {analysis.questions.map((t, idx) => (
                      <li key={idx}>€˘ {t}</li>
                    ))}
                  </ul>

                  <div style={S.hr} />

                  {/* Dla kogo */}
                  <div style={S.label}>Dla kogo ta oferta</div>
                  <ul className="mt-2 space-y-1" style={S.muted}>
                    {analysis.forWho.map((t, idx) => (
                      <li key={idx}>€˘ {t}</li>
                    ))}
                  </ul>

                  {/* Rekomendacja AI */}
                  {i.recommendation && (
                    <div className="mt-4" style={S.boxAi}>
                      🤖 <b>Rekomendacja AI:</b> {i.recommendation}
                    </div>
                  )}

                  <div className="mt-4" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {score !== null ? <span style={S.pill}>­ Score: {score}/10</span> : null}
                    {analysis.ppm2 ? <span style={S.pill}>“Š {fmtMoney(analysis.ppm2)}/m˛</span> : null}
                    {typeof i.views === "number" ? <span style={S.pill}>‘€ {fmtNum(i.views)} wyświetleń</span> : null}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
