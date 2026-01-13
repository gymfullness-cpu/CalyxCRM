?"use client";

import { useEffect, useMemo, useState } from "react";

type PropertyType = "mieszkanie" | "dom" | "dzialka" | "grunt" | "lokal_uslugowy";

type Property = {
  id: number;
  title: string;
  city: string;
  district: string;
  street: string;
  propertyType?: PropertyType;
  ownership?: string; // "peÄąâ€šna wÄąâ€šasnoÄąâ€şćâ€ˇ" / "spÄ‚łÄąâ€šdzielcze..." itd.
};

type ItemGroup =
  | "Podstawowe"
  | "Finanse i opÄąâ€šaty"
  | "WspÄ‚łlnota/SpÄ‚łÄąâ€šdzielnia"
  | "Urzć…d i formalnoÄąâ€şci"
  | "Dokumenty techniczne"
  | "Grunty / DziaÄąâ€ški"
  | "Lokal usÄąâ€šugowy"
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
  if (t === "dzialka") return "DziaÄąâ€ška";
  if (t === "grunt") return "Grunt";
  if (t === "lokal_uslugowy") return "Lokal usÄąâ€šugowy";
  return "â‚¬”";
}

function ownershipKind(ownership?: string): "pelna" | "spoldzielcze" | "inne" {
  const o = (ownership || "").toLowerCase();
  if (o.includes("spÄ‚łÄąâ€šdziel")) return "spoldzielcze";
  if (o.includes("peÄąâ€šna")) return "pelna";
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
 *  DOKUMENTY â‚¬📊  BAZA
 *  ======================= */

const BASE_ITEMS: Item[] = [
  {
    id: "id_docs",
    group: "Podstawowe",
    required: true,
    title: "Dokument toÄąÄ˝samoÄąâ€şci sprzedajć…cego",
    description: "DowÄ‚łd osobisty/paszport â‚¬📊  potrzebne u notariusza.",
  },
  {
    id: "title_deed",
    group: "Podstawowe",
    required: true,
    title: "Podstawa nabycia (akt / postanowienie / umowa)",
    description:
      "Np. akt notarialny kupna/darowizny, postanowienie o nabyciu spadku, dziaÄąâ€š spadku, podziaÄąâ€š majć…tku.",
  },
  {
    id: "kw_number",
    group: "Podstawowe",
    required: false,
    title: "Numer ksićâ„˘gi wieczystej (jeÄąâ€şli jest)",
    description:
      "JeÄąâ€şli jest KW â‚¬📊  numer do sprawdzenia dziaÄąâ€šÄ‚łw IIâ‚¬📊 IV (wÄąâ€šasnoÄąâ€şćâ€ˇ, roszczenia, hipoteki).",
  },
  {
    id: "property_data",
    group: "Podstawowe",
    required: true,
    title: "Dane nieruchomoÄąâ€şci (adres, powierzchnia, pomieszczenia)",
    description: "Zwykle z aktu/zaÄąâ€şwiadczeÄąâ€ž. Przydaje sićâ„˘ teÄąÄ˝ rzut/plan.",
  },

  {
    id: "loan_bank_docs",
    group: "Finanse i opÄąâ€šaty",
    required: false,
    title: "JeÄąâ€şli jest kredyt/hipoteka: zaÄąâ€şwiadczenie z banku + promesa",
    description:
      "Saldo zadÄąâ€šuÄąÄ˝enia + promesa/zgoda na wykreÄąâ€şlenie hipoteki po spÄąâ€šacie (zaleÄąÄ˝y od banku).",
  },
  {
    id: "no_arrears",
    group: "Finanse i opÄąâ€šaty",
    required: false,
    title: "Potwierdzenie braku zalegÄąâ€šoÄąâ€şci w opÄąâ€šatach",
    description:
      "Czynsz/zaliczki/media â‚¬📊  czćâ„˘sto wymagane przez kupujć…cego/bank. Zwykle od zarzć…dcy/wspÄ‚łlnoty/spÄ‚łÄąâ€šdzielni.",
  },

  {
    id: "no_meldunek",
    group: "Urzć…d i formalnoÄąâ€şci",
    required: false,
    title: "ZaÄąâ€şwiadczenie o braku osÄ‚łb zameldowanych (jeÄąâ€şli wymagane)",
    description:
      "Czćâ„˘sto wymagane przez kupujć…cego/bank. Urzć…d miasta/gminy. Czasem wystarczy oÄąâ€şwiadczenie.",
  },
  {
    id: "energy_cert",
    group: "Urzć…d i formalnoÄąâ€şci",
    required: false,
    title: "ÄąĹˇwiadectwo charakterystyki energetycznej (jeÄąâ€şli wymagane)",
    description:
      "W wielu transakcjach wymagane. JeÄąâ€şli brak â‚¬📊  moÄąÄ˝na zamÄ‚łwićâ€ˇ u uprawnionej osoby.",
  },

  {
    id: "power_of_attorney",
    group: "Dodatkowe sytuacyjne",
    required: false,
    title: "PeÄąâ€šnomocnictwo (jeÄąâ€şli ktoÄąâ€ş podpisuje za sprzedajć…cego)",
    description: "Zwykle peÄąâ€šnomocnictwo notarialne (zaleÄąÄ˝nie od notariusza).",
  },
  {
    id: "marriage_regime",
    group: "Dodatkowe sytuacyjne",
    required: false,
    title: "JeÄąâ€şli maÄąâ€šÄąÄ˝eÄąâ€žstwo: dokumenty dot. ustroju majć…tkowego",
    description:
      "Czasem wymagana zgoda maÄąâ€šÄąÄ˝onka/rozdzielnoÄąâ€şćâ€ˇ majć…tkowa â‚¬📊  zaleÄąÄ˝y od stanu prawnego i aktu nabycia.",
  },
  {
    id: "inheritance_docs",
    group: "Dodatkowe sytuacyjne",
    required: false,
    title: "JeÄąâ€şli spadek: postanowienie/akt poÄąâ€şwiadczenia + dziaÄąâ€š spadku (jeÄąâ€şli byÄąâ€š)",
    description:
      "Dokumenty potwierdzajć…ce nabycie w spadku i ewentualne zniesienie wspÄ‚łÄąâ€šwÄąâ€šasnoÄąâ€şci / dziaÄąâ€š spadku.",
  },
];

/** =======================
 *  MIESZKANIA
 *  ======================= */

const APARTMENT_COMMON: Item[] = [
  {
    id: "community_cert",
    group: "WspÄ‚łlnota/SpÄ‚łÄąâ€šdzielnia",
    required: false,
    title: "ZaÄąâ€şwiadczenie ze wspÄ‚łlnoty/spÄ‚łÄąâ€šdzielni (opÄąâ€šaty, brak zalegÄąâ€šoÄąâ€şci)",
    description:
      "Dokument o opÄąâ€šatach i ewentualnych zalegÄąâ€šoÄąâ€şciach; czćâ„˘sto potrzebny do aktu lub dla kupujć…cego/banku.",
  },
];

const APARTMENT_OWNERSHIP: Record<"pelna" | "spoldzielcze" | "inne", Item[]> = {
  pelna: [
    {
      id: "ap_kw_recommended",
      group: "Podstawowe",
      required: false,
      title: "Ksićâ„˘ga wieczysta (jeÄąâ€şli jest) â‚¬📊  wskazane",
      description:
        "Przy peÄąâ€šnej wÄąâ€šasnoÄąâ€şci KW zwykle istnieje; kupujć…cy/bank czćâ„˘sto bćâ„˘dzie tego oczekiwaÄąâ€š.",
    },
  ],
  spoldzielcze: [
    {
      id: "spoldzielcze_right",
      group: "WspÄ‚łlnota/SpÄ‚łÄąâ€šdzielnia",
      required: true,
      title: "ZaÄąâ€şwiadczenie o przysÄąâ€šugujć…cym prawie (spÄ‚łÄąâ€šdzielcze wÄąâ€šasnoÄąâ€şciowe)",
      description:
        "Wydaje spÄ‚łÄąâ€šdzielnia. Kluczowe szczegÄ‚łlnie, gdy lokal nie ma ksićâ„˘gi wieczystej.",
    },
  ],
  inne: [
    {
      id: "ap_other_right",
      group: "Podstawowe",
      required: false,
      title: "Dokument potwierdzajć…cy formćâ„˘ prawa (np. udziaÄąâ€š / inne)",
      description:
        "JeÄąâ€şli forma prawa jest nietypowa â‚¬📊  warto miećâ€ˇ dokumenty wyjaÄąâ€şniajć…ce stan prawny (najlepiej skonsultowaćâ€ˇ z notariuszem).",
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
    title: "Dokumenty budynku (pozwolenie/odbiÄ‚łr/projekt â‚¬📊  jeÄąâ€şli dotyczy)",
    description:
      "SzczegÄ‚łlnie waÄąÄ˝ne przy nowszych domach lub rozbudowach. JeÄąâ€şli nie masz â‚¬📊  ustal z notariuszem.",
  },
];

/** =======================
 *  GRUNT / DZIAÄąÂKA
 *  ======================= */

const LAND_EXTRA: Item[] = [
  {
    id: "land_registry_extract",
    group: "Grunty / DziaÄąâ€ški",
    required: false,
    title: "Wypis z rejestru gruntÄ‚łw + wyrys z mapy ewidencyjnej",
    description:
      "Zwykle ze starostwa. Pomaga potwierdzićâ€ˇ dane dziaÄąâ€ški, klasouÄąÄ˝ytki, powierzchnićâ„˘.",
  },
  {
    id: "land_mpzp",
    group: "Grunty / DziaÄąâ€ški",
    required: false,
    title: "MPZP / WZ (plan miejscowy lub warunki zabudowy) â‚¬📊  jeÄąâ€şli istotne",
    description:
      "JeÄąâ€şli kupujć…cy planuje budowćâ„˘, bćâ„˘dzie pytaÄąâ€š o przeznaczenie terenu i ograniczenia.",
  },
  {
    id: "land_access_road",
    group: "Grunty / DziaÄąâ€ški",
    required: false,
    title: "Dostćâ„˘p do drogi (sÄąâ€šuÄąÄ˝ebnoÄąâ€şćâ€ˇ/udziaÄąâ€š) â‚¬📊  jeÄąâ€şli dotyczy",
    description:
      "WaÄąÄ˝ne, jeÄąâ€şli nie ma bezpoÄąâ€şredniego dostćâ„˘pu do drogi publicznej.",
  },
];

/** =======================
 *  LOKAL USÄąÂUGOWY
 *  ======================= */

const COMMERCIAL_EXTRA: Item[] = [
  {
    id: "commercial_lease",
    group: "Lokal usÄąâ€šugowy",
    required: false,
    title: "Umowy najmu (jeÄąâ€şli lokal jest wynajmowany)",
    description:
      "JeÄąâ€şli sprzedajesz lokal z najemcć… â‚¬📊  przygotuj umowy, aneksy, terminy wypowiedzeÄąâ€ž, kaucje.",
  },
  {
    id: "commercial_company_docs",
    group: "Lokal usÄąâ€šugowy",
    required: false,
    title: "JeÄąâ€şli sprzedaje firma: dokumenty firmowe (KRS/CEIDG, peÄąâ€šnomocnictwa)",
    description:
      "Notariusz moÄąÄ˝e wymagaćâ€ˇ dokumentÄ‚łw rejestrowych i umocowania.",
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

  // … NOWE: historia â‚¬” ktÄ‚łry wpis rozwinićâ„˘ty
  const [historyOpenId, setHistoryOpenId] = useState<number | null>(null);

  // … NOWE: żeby historia sićâ„˘ odÄąâ€şwieÄąÄ˝aÄąâ€ša po klikaniu checkboxÄ‚łw
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
    // … odÄąâ€şwieÄąÄ˝ historićâ„˘ (skrÄ‚łty)
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

  // … NOWE: dane â‚¬śhistoria / skrÄ‚łtâ‚¬ĹĄ dla kaÄąÄ˝dej nieruchomoÄąâ€şci
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

    // … NOWE: kafelki historii
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
    const parts = [p.title?.trim() || "NieruchomoÄąâ€şćâ€ˇ", [p.city, p.street].filter(Boolean).join(", ")].filter(Boolean);
    return parts.join(" â‚¬” ");
  };

  return (
    <div style={S.wrap}>
      <div style={S.row}>
        <div style={{ flex: "1 1 360px" }}>
          <div style={S.h1}>📊 â€ž Dokumenty do sprzedaÄąÄ˝y</div>
          <div style={{ ...S.muted, marginTop: 6, fontSize: 13 }}>
            Wybierz nieruchomoÄąâ€şćâ€ˇ i odhacz dokumenty. Lista dopasowuje sićâ„˘ do rodzaju.
          </div>
        </div>

        <div style={S.pill}>
          {activeProperty ? `… ${stats.done}/${stats.total} â‚¬Ë ZostaÄąâ€šo: ${stats.left}` : "Brak nieruchomoÄąâ€şci"}
        </div>
      </div>

      <div style={S.card}>
        <div style={{ ...S.row, justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900 }}>ĹąÂ  NieruchomoÄąâ€şćâ€ˇ</div>
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
              <option value="">Brak nieruchomoÄąâ€şci</option>
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
                <div style={{ ...S.muted, fontSize: 12 }}>WÄąâ€šasnoÄąâ€şćâ€ˇ: {activeProperty.ownership}</div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div style={S.card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          … Checklista {activeProperty ? `â‚¬” ${propertyLabel(activeProperty)}` : ""}
        </div>

        {!activeProperty ? (
          <div style={{ ...S.muted, fontSize: 13 }}>Dodaj nieruchomoÄąâ€şćâ€ˇ w module NieruchomoÄąâ€şci.</div>
        ) : (
          <>
            <div style={{ ...S.row, marginBottom: 10 }}>
              <input
                style={{ ...S.input, minWidth: 260, flex: "1 1 260px" }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukajâ‚¬Â¦"
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
                                {it.required ? <span style={{ ...S.muted, marginLeft: 8 }}>â‚¬Ë wymagane</span> : null}
                              </div>

                              <button
                                type="button"
                                style={S.smallBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(it.id);
                                }}
                              >
                                {expanded[it.id] ? "Ukryj" : "SzczegÄ‚łÄąâ€šy"}
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

      {/* … NOWE: HISTORIA / SKRÄ‚📊 T */}
      <div style={S.card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>â€˘Â Historia / skrÄ‚łt dokumentÄ‚łw</div>
        {history.length === 0 ? (
          <div style={{ ...S.muted, fontSize: 13 }}>Brak nieruchomoÄąâ€şci do pokazania.</div>
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
                        {h.requiredMissing.length > 0 ? `ĹˇÂ  wymagane braki: ${h.requiredMissing.length}` : "… brak wymaganych brakÄ‚łw"}
                      </div>
                    </div>
                  </div>

                  {open ? (
                    <div style={S.listBox}>
                      {/* Masz juÄąÄ˝ */}
                      <div style={{ fontWeight: 900, marginBottom: 8 }}>Masz juÄąÄ˝:</div>
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
                        <div style={{ fontSize: 13, fontWeight: 900, color: "rgba(234,255,251,0.92)" }}>… Wszystkie wymagane masz.</div>
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
                          PrzejdÄąĹ🏠 do tej nieruchomoÄąâ€şci â€ â€
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
        To checklista pomocnicza. Notariusz/bank/kupujć…cy mogć… wymagaćâ€ˇ dodatkowych dokumentÄ‚łw zaleÄąÄ˝nie od sytuacji.
      </div>
    </div>
  );
}