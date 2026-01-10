"use client";

import { useEffect, useMemo, useState } from "react";

type PropertyType = "mieszkanie" | "dom" | "dzialka" | "grunt" | "lokal_uslugowy";

type Property = {
  id: number;
  title: string;
  city: string;
  district: string;
  street: string;
  propertyType?: PropertyType;
  ownership?: string; // "peĹ‚na wĹ‚asnoĹ›Ä‡" / "spĂłĹ‚dzielcze..." itd.
};

type ItemGroup =
  | "Podstawowe"
  | "Finanse i opĹ‚aty"
  | "WspĂłlnota/SpĂłĹ‚dzielnia"
  | "UrzÄ…d i formalnoĹ›ci"
  | "Dokumenty techniczne"
  | "Grunty / DziaĹ‚ki"
  | "Lokal usĹ‚ugowy"
  | "Dom"
  | "Dodatkowe sytuacyjne";

type Item = {
  id: string;
  title: string;
  description: string;
  required: boolean;
  group: ItemGroup;
};

function checklistKey(propertyId: string) {
  return `calli_sale_docs_properties_${propertyId}`;
}

function typeLabel(t?: PropertyType) {
  if (t === "mieszkanie") return "Mieszkanie";
  if (t === "dom") return "Dom";
  if (t === "dzialka") return "DziaĹ‚ka";
  if (t === "grunt") return "Grunt";
  if (t === "lokal_uslugowy") return "Lokal usĹ‚ugowy";
  return "â€”";
}

function ownershipKind(ownership?: string): "pelna" | "spoldzielcze" | "inne" {
  const o = (ownership || "").toLowerCase();
  if (o.includes("spĂłĹ‚dziel")) return "spoldzielcze";
  if (o.includes("peĹ‚na")) return "pelna";
  return ownership ? "inne" : "pelna";
}

function safeReadChecked(propertyId: number): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(checklistKey(String(propertyId)));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** =======================
 *  DOKUMENTY â€“ BAZA
 *  ======================= */

const BASE_ITEMS: Item[] = [
  {
    id: "id_docs",
    group: "Podstawowe",
    required: true,
    title: "Dokument toĹĽsamoĹ›ci sprzedajÄ…cego",
    description: "DowĂłd osobisty/paszport â€“ potrzebne u notariusza.",
  },
  {
    id: "title_deed",
    group: "Podstawowe",
    required: true,
    title: "Podstawa nabycia (akt / postanowienie / umowa)",
    description:
      "Np. akt notarialny kupna/darowizny, postanowienie o nabyciu spadku, dziaĹ‚ spadku, podziaĹ‚ majÄ…tku.",
  },
  {
    id: "kw_number",
    group: "Podstawowe",
    required: false,
    title: "Numer ksiÄ™gi wieczystej (jeĹ›li jest)",
    description:
      "JeĹ›li jest KW â€“ numer do sprawdzenia dziaĹ‚Ăłw IIâ€“IV (wĹ‚asnoĹ›Ä‡, roszczenia, hipoteki).",
  },
  {
    id: "property_data",
    group: "Podstawowe",
    required: true,
    title: "Dane nieruchomoĹ›ci (adres, powierzchnia, pomieszczenia)",
    description: "Zwykle z aktu/zaĹ›wiadczeĹ„. Przydaje siÄ™ teĹĽ rzut/plan.",
  },

  {
    id: "loan_bank_docs",
    group: "Finanse i opĹ‚aty",
    required: false,
    title: "JeĹ›li jest kredyt/hipoteka: zaĹ›wiadczenie z banku + promesa",
    description:
      "Saldo zadĹ‚uĹĽenia + promesa/zgoda na wykreĹ›lenie hipoteki po spĹ‚acie (zaleĹĽy od banku).",
  },
  {
    id: "no_arrears",
    group: "Finanse i opĹ‚aty",
    required: false,
    title: "Potwierdzenie braku zalegĹ‚oĹ›ci w opĹ‚atach",
    description:
      "Czynsz/zaliczki/media â€“ czÄ™sto wymagane przez kupujÄ…cego/bank. Zwykle od zarzÄ…dcy/wspĂłlnoty/spĂłĹ‚dzielni.",
  },

  {
    id: "no_meldunek",
    group: "UrzÄ…d i formalnoĹ›ci",
    required: false,
    title: "ZaĹ›wiadczenie o braku osĂłb zameldowanych (jeĹ›li wymagane)",
    description:
      "CzÄ™sto wymagane przez kupujÄ…cego/bank. UrzÄ…d miasta/gminy. Czasem wystarczy oĹ›wiadczenie.",
  },
  {
    id: "energy_cert",
    group: "UrzÄ…d i formalnoĹ›ci",
    required: false,
    title: "Ĺšwiadectwo charakterystyki energetycznej (jeĹ›li wymagane)",
    description:
      "W wielu transakcjach wymagane. JeĹ›li brak â€“ moĹĽna zamĂłwiÄ‡ u uprawnionej osoby.",
  },

  {
    id: "power_of_attorney",
    group: "Dodatkowe sytuacyjne",
    required: false,
    title: "PeĹ‚nomocnictwo (jeĹ›li ktoĹ› podpisuje za sprzedajÄ…cego)",
    description: "Zwykle peĹ‚nomocnictwo notarialne (zaleĹĽnie od notariusza).",
  },
  {
    id: "marriage_regime",
    group: "Dodatkowe sytuacyjne",
    required: false,
    title: "JeĹ›li maĹ‚ĹĽeĹ„stwo: dokumenty dot. ustroju majÄ…tkowego",
    description:
      "Czasem wymagana zgoda maĹ‚ĹĽonka/rozdzielnoĹ›Ä‡ majÄ…tkowa â€“ zaleĹĽy od stanu prawnego i aktu nabycia.",
  },
  {
    id: "inheritance_docs",
    group: "Dodatkowe sytuacyjne",
    required: false,
    title: "JeĹ›li spadek: postanowienie/akt poĹ›wiadczenia + dziaĹ‚ spadku (jeĹ›li byĹ‚)",
    description:
      "Dokumenty potwierdzajÄ…ce nabycie w spadku i ewentualne zniesienie wspĂłĹ‚wĹ‚asnoĹ›ci / dziaĹ‚ spadku.",
  },
];

/** =======================
 *  MIESZKANIA
 *  ======================= */

const APARTMENT_COMMON: Item[] = [
  {
    id: "community_cert",
    group: "WspĂłlnota/SpĂłĹ‚dzielnia",
    required: false,
    title: "ZaĹ›wiadczenie ze wspĂłlnoty/spĂłĹ‚dzielni (opĹ‚aty, brak zalegĹ‚oĹ›ci)",
    description:
      "Dokument o opĹ‚atach i ewentualnych zalegĹ‚oĹ›ciach; czÄ™sto potrzebny do aktu lub dla kupujÄ…cego/banku.",
  },
];

const APARTMENT_OWNERSHIP: Record<"pelna" | "spoldzielcze" | "inne", Item[]> = {
  pelna: [
    {
      id: "ap_kw_recommended",
      group: "Podstawowe",
      required: false,
      title: "KsiÄ™ga wieczysta (jeĹ›li jest) â€“ wskazane",
      description:
        "Przy peĹ‚nej wĹ‚asnoĹ›ci KW zwykle istnieje; kupujÄ…cy/bank czÄ™sto bÄ™dzie tego oczekiwaĹ‚.",
    },
  ],
  spoldzielcze: [
    {
      id: "spoldzielcze_right",
      group: "WspĂłlnota/SpĂłĹ‚dzielnia",
      required: true,
      title: "ZaĹ›wiadczenie o przysĹ‚ugujÄ…cym prawie (spĂłĹ‚dzielcze wĹ‚asnoĹ›ciowe)",
      description:
        "Wydaje spĂłĹ‚dzielnia. Kluczowe szczegĂłlnie, gdy lokal nie ma ksiÄ™gi wieczystej.",
    },
  ],
  inne: [
    {
      id: "ap_other_right",
      group: "Podstawowe",
      required: false,
      title: "Dokument potwierdzajÄ…cy formÄ™ prawa (np. udziaĹ‚ / inne)",
      description:
        "JeĹ›li forma prawa jest nietypowa â€“ warto mieÄ‡ dokumenty wyjaĹ›niajÄ…ce stan prawny (najlepiej skonsultowaÄ‡ z notariuszem).",
    },
  ],
};

/** =======================
 *  DOM
 *  ======================= */

const HOUSE_EXTRA: Item[] = [
  {
    id: "house_docs",
    group: "Dom",
    required: false,
    title: "Dokumenty budynku (pozwolenie/odbiĂłr/projekt â€“ jeĹ›li dotyczy)",
    description:
      "SzczegĂłlnie waĹĽne przy nowszych domach lub rozbudowach. JeĹ›li nie masz â€“ ustal z notariuszem.",
  },
];

/** =======================
 *  GRUNT / DZIAĹKA
 *  ======================= */

const LAND_EXTRA: Item[] = [
  {
    id: "land_registry_extract",
    group: "Grunty / DziaĹ‚ki",
    required: false,
    title: "Wypis z rejestru gruntĂłw + wyrys z mapy ewidencyjnej",
    description:
      "Zwykle ze starostwa. Pomaga potwierdziÄ‡ dane dziaĹ‚ki, klasouĹĽytki, powierzchniÄ™.",
  },
  {
    id: "land_mpzp",
    group: "Grunty / DziaĹ‚ki",
    required: false,
    title: "MPZP / WZ (plan miejscowy lub warunki zabudowy) â€“ jeĹ›li istotne",
    description:
      "JeĹ›li kupujÄ…cy planuje budowÄ™, bÄ™dzie pytaĹ‚ o przeznaczenie terenu i ograniczenia.",
  },
  {
    id: "land_access_road",
    group: "Grunty / DziaĹ‚ki",
    required: false,
    title: "DostÄ™p do drogi (sĹ‚uĹĽebnoĹ›Ä‡/udziaĹ‚) â€“ jeĹ›li dotyczy",
    description:
      "WaĹĽne, jeĹ›li nie ma bezpoĹ›redniego dostÄ™pu do drogi publicznej.",
  },
];

/** =======================
 *  LOKAL USĹUGOWY
 *  ======================= */

const COMMERCIAL_EXTRA: Item[] = [
  {
    id: "commercial_lease",
    group: "Lokal usĹ‚ugowy",
    required: false,
    title: "Umowy najmu (jeĹ›li lokal jest wynajmowany)",
    description:
      "JeĹ›li sprzedajesz lokal z najemcÄ… â€“ przygotuj umowy, aneksy, terminy wypowiedzeĹ„, kaucje.",
  },
  {
    id: "commercial_company_docs",
    group: "Lokal usĹ‚ugowy",
    required: false,
    title: "JeĹ›li sprzedaje firma: dokumenty firmowe (KRS/CEIDG, peĹ‚nomocnictwa)",
    description:
      "Notariusz moĹĽe wymagaÄ‡ dokumentĂłw rejestrowych i umocowania.",
  },
];

function buildItems(p: Property | null): Item[] {
  if (!p?.propertyType) return BASE_ITEMS;

  if (p.propertyType === "mieszkanie") {
    const kind = ownershipKind(p.ownership);
    return [...BASE_ITEMS, ...APARTMENT_COMMON, ...APARTMENT_OWNERSHIP[kind]];
  }

  if (p.propertyType === "dom") return [...BASE_ITEMS, ...HOUSE_EXTRA];

  if (p.propertyType === "dzialka" || p.propertyType === "grunt")
    return [...BASE_ITEMS, ...LAND_EXTRA];

  if (p.propertyType === "lokal_uslugowy") return [...BASE_ITEMS, ...COMMERCIAL_EXTRA];

  return BASE_ITEMS;
}

export default function SaleDocumentsChecklist() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showOnlyMissing, setShowOnlyMissing] = useState(false);
  const [search, setSearch] = useState("");

  // âś… NOWE: historia â€” ktĂłry wpis rozwiniÄ™ty
  const [historyOpenId, setHistoryOpenId] = useState<number | null>(null);

  // âś… NOWE: ĹĽeby historia siÄ™ odĹ›wieĹĽaĹ‚a po klikaniu checkboxĂłw
  const [historyTick, setHistoryTick] = useState(0);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("properties");
        const arr: Property[] = raw ? JSON.parse(raw) : [];
        const safe = Array.isArray(arr) ? arr : [];
        setProperties(safe);
        setActiveId((prev) => {
          if (prev && safe.some((x) => x.id === prev)) return prev;
          return safe[0]?.id ?? null;
        });
      } catch {
        setProperties([]);
        setActiveId(null);
      }
    };

    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    try {
      const raw = localStorage.getItem(checklistKey(String(activeId)));
      setChecked(raw ? JSON.parse(raw) : {});
      setExpanded({});
    } catch {
      setChecked({});
      setExpanded({});
    }
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    try {
      localStorage.setItem(checklistKey(String(activeId)), JSON.stringify(checked));
    } catch {}
    // âś… odĹ›wieĹĽ historiÄ™ (skrĂłty)
    setHistoryTick((x) => x + 1);
  }, [checked, activeId]);

  const activeProperty = useMemo(
    () => properties.find((p) => p.id === activeId) || null,
    [properties, activeId]
  );

  const items = useMemo(() => buildItems(activeProperty), [activeProperty]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (showOnlyMissing && checked[it.id]) return false;
      if (!q) return true;
      return (
        it.title.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q) ||
        it.group.toLowerCase().includes(q)
      );
    });
  }, [items, checked, search, showOnlyMissing]);

  const grouped = useMemo(() => {
    const map = new Map<ItemGroup, Item[]>();
    for (const it of filtered) {
      const arr = map.get(it.group) || [];
      arr.push(it);
      map.set(it.group, arr);
    }
    return map;
  }, [filtered]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => checked[i.id]).length;
    return { total, done, left: total - done };
  }, [items, checked]);

  // âś… NOWE: dane â€śhistoria / skrĂłtâ€ť dla kaĹĽdej nieruchomoĹ›ci
  const history = useMemo(() => {
    return properties.map((p) => {
      const docItems = buildItems(p);
      const map = safeReadChecked(p.id);
      const done = docItems.filter((i) => map[i.id]).length;
      const requiredMissing = docItems.filter((i) => i.required && !map[i.id]);
      const have = docItems.filter((i) => map[i.id]);
      return {
        property: p,
        total: docItems.length,
        done,
        left: docItems.length - done,
        requiredMissing,
        have,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, historyTick]);

  const toggle = (id: string) => setChecked((p) => ({ ...p, [id]: !p[id] }));
  const toggleExpand = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const reset = () => {
    setChecked({});
    setExpanded({});
  };

  const S = {
    wrap: {
      padding: 18,
      borderRadius: 18,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(7, 13, 24, 0.55)",
      backdropFilter: "blur(10px)",
      color: "rgba(255,255,255,0.92)",
    } as const,
    h1: { fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" } as const,
    muted: { color: "rgba(255,255,255,0.65)" } as const,
    row: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" } as const,
    input: {
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.35)",
      color: "rgba(255,255,255,0.92)",
      padding: "10px 12px",
      outline: "none",
    } as const,
    button: {
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.92)",
      padding: "10px 12px",
      fontWeight: 900,
      cursor: "pointer",
    } as const,
    pill: {
      borderRadius: 999,
      padding: "6px 10px",
      border: "1px solid rgba(45,212,191,0.25)",
      background: "rgba(45,212,191,0.10)",
      color: "rgba(234,255,251,0.92)",
      fontWeight: 900,
      fontSize: 12,
    } as const,
    card: {
      marginTop: 12,
      padding: 12,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.04)",
    } as const,
    sectionTitle: {
      marginTop: 16,
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
      color: "rgba(255,255,255,0.70)",
    } as const,

    tile: (on: boolean) =>
      ({
        display: "flex",
        gap: 12,
        padding: "12px 12px",
        borderRadius: 14,
        border: on ? "1px solid rgba(45,212,191,0.40)" : "1px solid rgba(255,255,255,0.10)",
        background: on ? "rgba(45,212,191,0.10)" : "rgba(255,255,255,0.03)",
        cursor: "pointer",
        userSelect: "none",
        alignItems: "flex-start",
      }) as const,

    tick: (on: boolean) =>
      ({
        width: 18,
        height: 18,
        borderRadius: 6,
        border: on ? "1px solid rgba(45,212,191,0.65)" : "1px solid rgba(255,255,255,0.18)",
        background: on ? "rgba(45,212,191,0.35)" : "transparent",
        marginTop: 2,
        flex: "0 0 auto",
      }) as const,

    titleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 } as const,
    title: { fontWeight: 900, lineHeight: 1.2, fontSize: 14 } as const,
    desc: { marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.72)", lineHeight: 1.4 } as const,
    smallBtn: {
      border: "1px solid rgba(255,255,255,0.14)",
      background: "transparent",
      color: "rgba(255,255,255,0.70)",
      borderRadius: 10,
      padding: "6px 10px",
      fontWeight: 900,
      cursor: "pointer",
      fontSize: 12,
      whiteSpace: "nowrap",
    } as const,
    badge: {
      borderRadius: 999,
      padding: "4px 8px",
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(255,255,255,0.06)",
      fontWeight: 900,
      fontSize: 12,
      color: "rgba(255,255,255,0.85)",
    } as const,

    // âś… NOWE: kafelki historii
    histRow: (open: boolean) =>
      ({
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        padding: "12px 12px",
        borderRadius: 14,
        border: open ? "1px solid rgba(45,212,191,0.40)" : "1px solid rgba(255,255,255,0.10)",
        background: open ? "rgba(45,212,191,0.08)" : "rgba(255,255,255,0.03)",
        cursor: "pointer",
        userSelect: "none",
        alignItems: "center",
      }) as const,

    mini: {
      fontSize: 12,
      color: "rgba(255,255,255,0.70)",
      fontWeight: 800,
    } as const,

    listBox: {
      marginTop: 10,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.02)",
      padding: 12,
    } as const,

    dot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: "rgba(45,212,191,0.8)",
      display: "inline-block",
      marginRight: 8,
      marginTop: 5,
      flex: "0 0 auto",
    } as const,

    warnDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: "rgba(245,158,11,0.9)",
      display: "inline-block",
      marginRight: 8,
      marginTop: 5,
      flex: "0 0 auto",
    } as const,
  };

  const propertyLabel = (p: Property) => {
    const parts = [p.title?.trim() || "NieruchomoĹ›Ä‡", [p.city, p.street].filter(Boolean).join(", ")].filter(Boolean);
    return parts.join(" â€” ");
  };

  return (
    <div style={S.wrap}>
      <div style={S.row}>
        <div style={{ flex: "1 1 360px" }}>
          <div style={S.h1}>đź“„ Dokumenty do sprzedaĹĽy</div>
          <div style={{ ...S.muted, marginTop: 6, fontSize: 13 }}>
            Wybierz nieruchomoĹ›Ä‡ i odhacz dokumenty. Lista dopasowuje siÄ™ do rodzaju.
          </div>
        </div>

        <div style={S.pill}>
          {activeProperty ? `âś… ${stats.done}/${stats.total} â€˘ ZostaĹ‚o: ${stats.left}` : "Brak nieruchomoĹ›ci"}
        </div>
      </div>

      <div style={S.card}>
        <div style={{ ...S.row, justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900 }}>đźŹ  NieruchomoĹ›Ä‡</div>
          <button style={S.button} onClick={reset} disabled={!activeProperty}>
            Reset checklisty
          </button>
        </div>

        <div style={{ ...S.row, marginTop: 10 }}>
          <select
            value={activeId ?? ""}
            onChange={(e) => setActiveId(e.target.value ? Number(e.target.value) : null)}
            style={{ ...S.input, minWidth: 280, flex: "1 1 280px", appearance: "none" }}
          >
            {properties.length === 0 ? (
              <option value="">Brak nieruchomoĹ›ci</option>
            ) : (
              properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {propertyLabel(p)}
                </option>
              ))
            )}
          </select>

          {activeProperty ? (
            <>
              <div style={S.badge}>{typeLabel(activeProperty.propertyType)}</div>
              {activeProperty.propertyType === "mieszkanie" && activeProperty.ownership ? (
                <div style={{ ...S.muted, fontSize: 12 }}>WĹ‚asnoĹ›Ä‡: {activeProperty.ownership}</div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div style={S.card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          âś… Checklista {activeProperty ? `â€” ${propertyLabel(activeProperty)}` : ""}
        </div>

        {!activeProperty ? (
          <div style={{ ...S.muted, fontSize: 13 }}>Dodaj nieruchomoĹ›Ä‡ w module NieruchomoĹ›ci.</div>
        ) : (
          <>
            <div style={{ ...S.row, marginBottom: 10 }}>
              <input
                style={{ ...S.input, minWidth: 260, flex: "1 1 260px" }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukajâ€¦"
              />

              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input type="checkbox" checked={showOnlyMissing} onChange={(e) => setShowOnlyMissing(e.target.checked)} />
                <span style={{ fontWeight: 900 }}>Tylko braki</span>
              </label>
            </div>

            {Array.from(grouped.entries()).map(([group, groupItems]) => (
              <div key={group}>
                <div style={S.sectionTitle}>{group}</div>

                <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                  {groupItems.map((it) => {
                    const on = !!checked[it.id];
                    return (
                      <div key={it.id}>
                        <div
                          style={S.tile(on)}
                          onClick={() => toggle(it.id)}
                          role="checkbox"
                          aria-checked={on}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") toggle(it.id);
                          }}
                        >
                          <div style={S.tick(on)} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={S.titleRow}>
                              <div style={S.title}>
                                {it.title}
                                {it.required ? <span style={{ ...S.muted, marginLeft: 8 }}>â€˘ wymagane</span> : null}
                              </div>

                              <button
                                type="button"
                                style={S.smallBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(it.id);
                                }}
                              >
                                {expanded[it.id] ? "Ukryj" : "SzczegĂłĹ‚y"}
                              </button>
                            </div>

                            {expanded[it.id] ? <div style={S.desc}>{it.description}</div> : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* âś… NOWE: HISTORIA / SKRĂ“T */}
      <div style={S.card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>đź• Historia / skrĂłt dokumentĂłw</div>
        {history.length === 0 ? (
          <div style={{ ...S.muted, fontSize: 13 }}>Brak nieruchomoĹ›ci do pokazania.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {history.map((h) => {
              const open = historyOpenId === h.property.id;
              return (
                <div key={h.property.id}>
                  <div
                    style={S.histRow(open)}
                    onClick={() => setHistoryOpenId((prev) => (prev === h.property.id ? null : h.property.id))}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {propertyLabel(h.property)}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                        <span style={S.badge}>{typeLabel(h.property.propertyType)}</span>
                        {h.property.propertyType === "mieszkanie" && h.property.ownership ? (
                          <span style={S.badge}>{h.property.ownership}</span>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900 }}>{h.done}/{h.total}</div>
                      <div style={S.mini}>
                        {h.requiredMissing.length > 0 ? `âš  wymagane braki: ${h.requiredMissing.length}` : "âś… brak wymaganych brakĂłw"}
                      </div>
                    </div>
                  </div>

                  {open ? (
                    <div style={S.listBox}>
                      {/* Masz juĹĽ */}
                      <div style={{ fontWeight: 900, marginBottom: 8 }}>Masz juĹĽ:</div>
                      {h.have.length === 0 ? (
                        <div style={{ ...S.muted, fontSize: 13 }}>Nic jeszcze nie odhaczone.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 6 }}>
                          {h.have.map((it) => (
                            <div key={it.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <span style={S.dot} />
                              <div style={{ fontSize: 13, fontWeight: 800 }}>{it.title}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Braki wymagane */}
                      <div style={{ fontWeight: 900, marginTop: 14, marginBottom: 8 }}>Braki wymagane:</div>
                      {h.requiredMissing.length === 0 ? (
                        <div style={{ fontSize: 13, fontWeight: 900, color: "rgba(234,255,251,0.92)" }}>âś… Wszystkie wymagane masz.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 6 }}>
                          {h.requiredMissing.map((it) => (
                            <div key={it.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <span style={S.warnDot} />
                              <div style={{ fontSize: 13, fontWeight: 900 }}>{it.title}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* szybki przycisk */}
                      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          style={S.button}
                          onClick={() => setActiveId(h.property.id)}
                        >
                          PrzejdĹş do tej nieruchomoĹ›ci â†‘
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.60)" }}>
        To checklista pomocnicza. Notariusz/bank/kupujÄ…cy mogÄ… wymagaÄ‡ dodatkowych dokumentĂłw zaleĹĽnie od sytuacji.
      </div>
    </div>
  );
}

