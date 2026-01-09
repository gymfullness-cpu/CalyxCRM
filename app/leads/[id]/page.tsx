"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import Notes from "./Notes";
import CallButton from "./CallButton";
import StatusSwitcher from "./StatusSwitcher";

type LeadRole = "właściciel" | "kupujący";

type Lead = {
  id: number;
  name: string;
  phone: string;
  status: string;
  role?: LeadRole;
  propertyIds?: number[];
};

type Property = {
  id: number;
  street: string;
};

export default function LeadPage() {
  const params = useParams();
  const id = Number(params.id);

  const [lead, setLead] = useState<Lead | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);

  // 🔹 LEAD Z LOCALSTORAGE
  useEffect(() => {
    const saved = localStorage.getItem("leads");
    if (!saved) return;

    const list: Lead[] = JSON.parse(saved);
    const found = list.find((l) => l.id === id) || null;
    setLead(found);
  }, [id]);

  // 🔹 NIERUCHOMOŚCI
  useEffect(() => {
    const saved = localStorage.getItem("properties");
    if (saved) {
      setProperties(JSON.parse(saved));
    }
  }, []);

  if (!lead) {
    return <p style={{ padding: 40 }}>Nie znaleziono leada</p>;
  }

  const saveLead = (updated: Lead) => {
    setLead(updated);

    const saved = localStorage.getItem("leads");
    if (!saved) return;

    const list: Lead[] = JSON.parse(saved);
    const newList = list.map((l) =>
      l.id === updated.id ? updated : l
    );

    localStorage.setItem("leads", JSON.stringify(newList));
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>{lead.name}</h1>

      <hr />

      <h3>🏠 Powiązane nieruchomości</h3>

      {properties.length === 0 && <p>Brak nieruchomości</p>}

      <ul>
        {properties.map((p) => {
          const assigned = lead.propertyIds?.includes(p.id) ?? false;

          return (
            <li key={p.id}>
              <label>
                <input
                  type="checkbox"
                  checked={assigned}
                  onChange={() => {
                    const updatedIds = assigned
                      ? lead.propertyIds?.filter((pid) => pid !== p.id)
                      : [...(lead.propertyIds ?? []), p.id];

                    saveLead({
                      ...lead,
                      propertyIds: updatedIds,
                    });
                  }}
                />
                {p.street}
              </label>
            </li>
          );
        })}
      </ul>

      <hr />

      <p>
        <strong>Rola leada:</strong>{" "}
        <select
          value={lead.role ?? ""}
          onChange={(e) =>
            saveLead({
              ...lead,
              role: e.target.value as LeadRole,
            })
          }
        >
          <option value="">— wybierz —</option>
          <option value="właściciel">🏠 Właściciel</option>
          <option value="kupujący">🧍 Kupujący</option>
        </select>
      </p>

      <StatusSwitcher leadId={lead.id} initialStatus={lead.status} />

      <p>
        <strong>Telefon:</strong>{" "}
        <a href={`tel:${lead.phone}`}>{lead.phone}</a>
      </p>
<hr />

<h3>📅 Spotkania</h3>

{(() => {
  const saved = localStorage.getItem("meetings");
  if (!saved) return <p>Brak spotkań</p>;

  const meetings = JSON.parse(saved).filter(
    (m: any) => m.leadId === lead.id
  );

  if (meetings.length === 0) {
    return <p>Brak spotkań</p>;
  }

  return (
    <ul>
      {meetings.map((m: any) => (
        <li key={m.id}>
          {m.date} {m.time} —{" "}
          {m.type === "pozyskowe"
            ? "✍️ Pozyskowe"
            : "🏠 Prezentacja"}
        </li>
      ))}
    </ul>
  );
})()}

      <CallButton phone={lead.phone} />
      <Notes leadId={lead.id} />
    </main>
  );
}
