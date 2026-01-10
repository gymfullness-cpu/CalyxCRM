"use client";

import { useEffect, useMemo, useState } from "react";

type FollowUp = {
  id: number;
  relatedId: number;
  type: "pozysk" | "prezentacja";
  dueDate: string; // YYYY-MM-DD
  status: "pending" | "done";
};

const STORAGE_KEY = "followups";

function formatPL(dateStr: string) {
  if (!dateStr) return "—";
  const safe = dateStr.includes("T") ? new Date(dateStr) : new Date(`${dateStr}T12:00:00`);
  return safe.toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" });
}

function daysDiff(dateStr: string) {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(`${dateStr}T12:00:00`);
  const ms = target.getTime() - new Date(now.toDateString()).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function typeLabel(t: FollowUp["type"]) {
  return t === "pozysk" ? "Pozysk" : "Prezentacja";
}

function typeMeta(t: FollowUp["type"]) {
  if (t === "pozysk") {
    return {
      dot: "rgba(45,212,191,0.95)",
      bg: "rgba(45,212,191,0.10)",
      border: "rgba(45,212,191,0.28)",
      text: "#0f172a",
    };
  }
  return {
    dot: "rgba(29,78,216,0.95)",
    bg: "rgba(29,78,216,0.10)",
    border: "rgba(29,78,216,0.22)",
    text: "#0f172a",
  };
}

/** Bezpieczne wczytanie follow-upów z localStorage (JSON.parse zwraca unknown i psuje uniony) */
function readStoredFollowUps(): FollowUp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const out: FollowUp[] = [];
    for (const x of parsed) {
      if (!x || typeof x !== "object") continue;

      const obj = x as any;

      const id = typeof obj.id === "number" ? obj.id : Number(obj.id);
      const relatedId = typeof obj.relatedId === "number" ? obj.relatedId : Number(obj.relatedId);
      const type = obj.type === "pozysk" || obj.type === "prezentacja" ? obj.type : null;
      const dueDate = typeof obj.dueDate === "string" ? obj.dueDate : "";
      const status = obj.status === "pending" || obj.status === "done" ? obj.status : "pending";

      if (!Number.isFinite(id) || !Number.isFinite(relatedId) || !type) continue;

      out.push({
        id,
        relatedId,
        type,
        dueDate,
        status,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [sort, setSort] = useState<"dateAsc" | "dateDesc">("dateAsc");

  useEffect(() => {
    // ✅ Najważniejsze: wczytujemy jako FollowUp[], bez "status: string"
    setItems(readStoredFollowUps());
  }, []);

  const persist = (data: FollowUp[]) => {
    setItems(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const markDone = (id: number) => {
    const updated: FollowUp[] = items.map((f) => (f.id === id ? { ...f, status: "done" as const } : f));
    persist(updated);
  };

  const reopen = (id: number) => {
    const updated: FollowUp[] = items.map((f) => (f.id === id ? { ...f, status: "pending" as const } : f));
    persist(updated);
  };

  const remove = (id: number) => {
    if (!confirm("Usunąć follow-up?")) return;
    persist(items.filter((x) => x.id !== id));
  };

  const stats = useMemo(() => {
    const all = items.length;
    const pending = items.filter((x) => x.status === "pending").length;
    const done = items.filter((x) => x.status === "done").length;
    const overdue = items.filter((x) => x.status === "pending" && (daysDiff(x.dueDate) ?? 0) < 0).length;
    return { all, pending, done, overdue };
  }, [items]);

  const visible = useMemo(() => {
    let arr = [...items];

    if (filter !== "all") arr = arr.filter((x) => x.status === filter);

    arr.sort((a, b) => {
      const da = a.dueDate ? new Date(`${a.dueDate}T12:00:00`).getTime() : 0;
      const db = b.dueDate ? new Date(`${b.dueDate}T12:00:00`).getTime() : 0;
      return sort === "dateAsc" ? da - db : db - da;
    });

    return arr;
  }, [items, filter, sort]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-main)" }}>
            🔔 Follow-upy
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Lista zadań do oddzwonienia / dopięcia tematu.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Wszystkie" value={stats.all} tone="neutral" />
          <Kpi label="Do zrobienia" value={stats.pending} tone="mint" />
          <Kpi label="Zrobione" value={stats.done} tone="blue" />
          <Kpi label="Po terminie" value={stats.overdue} tone="amber" />
        </div>
      </div>

      {/* CONTROLS */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button style={filter === "pending" ? pillActive : pillIdle} onClick={() => setFilter("pending")}>
            Pending
          </button>
          <button style={filter === "done" ? pillActive : pillIdle} onClick={() => setFilter("done")}>
            Done
          </button>
          <button style={filter === "all" ? pillActive : pillIdle} onClick={() => setFilter("all")}>
            Wszystkie
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "dateAsc" | "dateDesc")}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--text-main)",
              borderRadius: 999,
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="dateAsc">Data ↑ (najbliższe)</option>
            <option value="dateDesc">Data ↓ (najdalsze)</option>
          </select>
        </div>
      </div>

      {/* LIST */}
      <section className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.length === 0 ? (
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "var(--text-main)",
            }}
          >
            Brak follow-upów w tym widoku.
          </div>
        ) : (
          visible.map((f) => {
            const meta = typeMeta(f.type);
            const dd = daysDiff(f.dueDate);
            const isOverdue = f.status === "pending" && (dd ?? 0) < 0;

            return (
              <div
                key={f.id}
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(255,255,255,0.96)",
                  border: isOverdue ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(15,23,42,0.10)",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.12)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold"
                        style={{
                          background: meta.bg,
                          border: `1px solid ${meta.border}`,
                          color: meta.text,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: meta.dot,
                            display: "inline-block",
                          }}
                        />
                        {typeLabel(f.type)}
                      </span>

                      <span
                        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold"
                        style={{
                          background: f.status === "done" ? "rgba(16,185,129,0.10)" : "rgba(15,23,42,0.06)",
                          border: "1px solid rgba(15,23,42,0.10)",
                          color: "rgba(15,23,42,0.72)",
                        }}
                      >
                        {f.status === "done" ? "Zrobione" : "Do zrobienia"}
                      </span>

                      {isOverdue ? (
                        <span
                          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold"
                          style={{
                            background: "rgba(239,68,68,0.10)",
                            border: "1px solid rgba(239,68,68,0.22)",
                            color: "rgba(185,28,28,0.95)",
                          }}
                        >
                          Po terminie
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 text-sm font-black" style={{ color: "#0f172a" }}>
                      📅 {formatPL(f.dueDate)}
                      {dd !== null ? (
                        <span style={{ marginLeft: 10, fontWeight: 900, color: "rgba(15,23,42,0.62)" }}>
                          {dd === 0 ? "(dzisiaj)" : dd > 0 ? `(za ${dd} dni)` : `(${Math.abs(dd)} dni po terminie)`}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 text-xs" style={{ color: "rgba(15,23,42,0.65)" }}>
                      Powiązanie ID: <span style={{ fontWeight: 900 }}>{f.relatedId}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {f.status === "pending" ? (
                      <button
                        onClick={() => markDone(f.id)}
                        className="rounded-xl px-3 py-2 text-xs font-extrabold"
                        style={{
                          background: "rgba(45,212,191,0.14)",
                          border: "1px solid rgba(45,212,191,0.35)",
                          color: "#0f172a",
                          cursor: "pointer",
                        }}
                        title="Oznacz jako zrobione"
                      >
                        ✅
                      </button>
                    ) : (
                      <button
                        onClick={() => reopen(f.id)}
                        className="rounded-xl px-3 py-2 text-xs font-extrabold"
                        style={{
                          background: "rgba(29,78,216,0.10)",
                          border: "1px solid rgba(29,78,216,0.22)",
                          color: "#0f172a",
                          cursor: "pointer",
                        }}
                        title="Przywróć do pending"
                      >
                        ↩️
                      </button>
                    )}

                    <button
                      onClick={() => remove(f.id)}
                      className="rounded-xl px-3 py-2 text-xs font-extrabold"
                      style={{
                        background: "rgba(239,68,68,0.10)",
                        border: "1px solid rgba(239,68,68,0.22)",
                        color: "rgba(185,28,28,0.95)",
                        cursor: "pointer",
                      }}
                      title="Usuń"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {f.status === "pending" ? (
                  <button
                    onClick={() => markDone(f.id)}
                    className="mt-4 w-full rounded-xl py-3 text-sm font-extrabold"
                    style={{
                      background: "rgba(45,212,191,0.14)",
                      border: "1px solid rgba(45,212,191,0.35)",
                      color: "#0f172a",
                      cursor: "pointer",
                    }}
                  >
                    ✅ Zrobione
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}

/* ====== UI bits ====== */

const pillActive: React.CSSProperties = {
  background: "rgba(45,212,191,0.14)",
  border: "1px solid rgba(45,212,191,0.35)",
  color: "rgba(234,255,251,0.95)",
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const pillIdle: React.CSSProperties = {
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
  value: number;
  tone: "neutral" | "mint" | "blue" | "amber";
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
    amber: {
      border: "1px solid rgba(245,158,11,0.28)",
      background: "rgba(245,158,11,0.10)",
      color: "rgba(255,236,200,0.95)",
    },
  };

  return (
    <div className="rounded-2xl px-4 py-3" style={toneStyle[tone]}>
      <div className="text-xs font-extrabold opacity-90">{label}</div>
      <div className="mt-1 text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
}
